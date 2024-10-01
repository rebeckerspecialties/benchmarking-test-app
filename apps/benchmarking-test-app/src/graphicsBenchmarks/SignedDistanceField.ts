import { sdfShaderFragWGSL, sdfShaderVertWGSL } from "./SDFShader";
import { CanvasContext } from "./types";
import {
  cubePositionOffset,
  cubeUVOffset,
  cubeVertexArray,
  cubeVertexCount,
  cubeVertexSize,
} from "./cube";
import { mat4, vec3 } from "wgpu-matrix";
import Noise from "noisejs";

export const runSignedDistanceField = async (
  context: CanvasContext,
  device: GPUDevice,
  canvas: HTMLCanvasElement,
  requestAnimationFrame: (callback: (time: number) => void) => number
) => {
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  const verticesBuffer = device.createBuffer({
    size: cubeVertexArray.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });

  new Float32Array(verticesBuffer.getMappedRange()).set(cubeVertexArray);
  verticesBuffer.unmap();

  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: device.createShaderModule({
        code: sdfShaderVertWGSL,
      }),
      entryPoint: "main",
      buffers: [
        {
          arrayStride: cubeVertexSize,
          attributes: [
            {
              // position
              shaderLocation: 0,
              offset: cubePositionOffset,
              format: "float32x4",
            },
            {
              // uv
              shaderLocation: 1,
              offset: cubeUVOffset,
              format: "float32x2",
            },
          ],
        },
      ],
    },
    fragment: {
      module: device.createShaderModule({
        code: sdfShaderFragWGSL,
      }),
      entryPoint: "main",
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: "triangle-list",

      // Backface culling since the cube is solid piece of geometry.
      // Faces pointing away from the camera will be occluded by faces
      // pointing toward the camera.
      cullMode: "back",
    },

    // Enable depth testing so that the fragment closest to the camera
    // is rendered in front.
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: "less",
      format: "depth24plus",
    },
  });

  const depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: "depth24plus",
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  // Bind group 0
  const uniformBufferSize = 4 * 16;
  const projectionMatrixBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const modelViewMatrixBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const uniformBindGroup0 = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: projectionMatrixBuffer,
          offset: 0,
          size: uniformBufferSize,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: modelViewMatrixBuffer,
          offset: 0,
          size: uniformBufferSize,
        },
      },
    ],
  });

  // Bind group 1 (textures and samplers)

  const inputBufferTexture = device.createTexture({
    size: [512, 512, 1],
    format: "rgba8unorm",
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const noiseTexture = device.createTexture({
    size: [512, 512, 512],
    format: "rgba8unorm",
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const perlinNoise = generateNoiseData(512);
  const perlinSize = 512 * 8;
  device.queue.writeTexture(
    { texture: noiseTexture },
    perlinNoise,
    {},
    { width: perlinSize, height: perlinSize, depthOrArrayLayers: perlinSize }
  );

  const sampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
  });

  const uniformBindGroup1 = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(1),
    entries: [
      { binding: 0, resource: inputBufferTexture.createView() },
      { binding: 1, resource: noiseTexture.createView() },
      { binding: 2, resource: depthTexture.createView() },
      { binding: 3, resource: sampler },
    ],
  });

  // Animation loop

  const aspect = canvas.width / canvas.height;
  const projectionMatrix = mat4.perspective(
    (2 * Math.PI) / 5,
    aspect,
    1,
    100.0
  );

  return new Promise<void>((resolve) => {
    let frame = 0;
    const animate = () => {
      const textureView = context.getCurrentTexture().createView();

      const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
          {
            view: textureView,
            clearValue: [0, 0, 0, 1],
            loadOp: "clear",
            storeOp: "store",
          },
        ],
        depthStencilAttachment: {
          view: depthTexture.createView(),

          depthClearValue: 1.0,
          depthLoadOp: "clear",
          depthStoreOp: "store",
        },
      };

      frame++;

      const modelViewMatrix = getViewMatrix();

      device.queue.writeBuffer(
        projectionMatrixBuffer,
        0,
        projectionMatrix.buffer,
        projectionMatrix.byteOffset,
        projectionMatrix.byteLength
      );
      device.queue.writeBuffer(
        modelViewMatrixBuffer,
        0,
        modelViewMatrix.buffer,
        modelViewMatrix.byteOffset,
        modelViewMatrix.byteLength
      );

      const commandEncoder = device.createCommandEncoder();

      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.setPipeline(pipeline);
      passEncoder.setVertexBuffer(0, verticesBuffer);
      passEncoder.setBindGroup(0, uniformBindGroup0);
      passEncoder.setBindGroup(1, uniformBindGroup1);
      passEncoder.draw(cubeVertexCount);
      passEncoder.end();

      device.queue.submit([commandEncoder.finish()]);
      context.present();

      if (frame >= 500) {
        resolve();
      } else {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  });
};

function getViewMatrix() {
  // TODO: calc rotation from frame value
  const viewMatrix = mat4.identity();
  mat4.translate(viewMatrix, vec3.fromValues(0, 0, -4), viewMatrix);
  const now = Date.now() / 1000;
  mat4.rotate(
    viewMatrix,
    vec3.fromValues(Math.sin(now), Math.cos(now), 0),
    1,
    viewMatrix
  );

  return viewMatrix;
}

function generateNoiseData(textureSize: number) {
  const noise = new Noise(Math.random());

  // Create a data array to store the noise values
  const size = textureSize * textureSize * textureSize;
  const data = new Uint8Array(4 * size);
  const scale = 5;
  // Fill the data array with noise values
  for (let k = 0; k < textureSize; k++) {
    for (let j = 0; j < textureSize; j++) {
      for (let i = 0; i < textureSize; i++) {
        let value = noise.perlin3(i / scale, j / scale, k / scale);
        value = ((value + 1) / 2) * 255; // remap from -1,1 to 0,255

        const index = i + j * textureSize + k * textureSize * textureSize;
        data[index] = value; // Only set the red channel
      }
    }
  }

  return data;
}
