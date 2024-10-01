import {
  sdfShaderFragWGSL,
  sdfShaderVertWGSL,
  vertexShadowWGSL,
} from "./SDFShader";
import { CanvasContext } from "./types";
import {
  cubePositionOffset,
  cubeUVOffset,
  cubeVertexArray,
  cubeVertexCount,
  cubeVertexSize,
} from "./cube";
import { mat4, vec3 } from "wgpu-matrix";
import Noise from "./perlin";

const shadowDepthTextureSize = 1024;

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

  const vertexBuffers: GPUVertexBufferLayout[] = [
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
  ];

  const primitive: GPUPrimitiveState = {
    topology: "triangle-list",
    cullMode: "back",
  };

  const shadowPipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: device.createShaderModule({
        code: vertexShadowWGSL,
      }),
      buffers: vertexBuffers,
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: "less",
      format: "depth32float",
    },
    primitive,
  });

  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: device.createShaderModule({
        code: sdfShaderVertWGSL,
      }),
      entryPoint: "main",
      buffers: vertexBuffers,
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
    primitive,

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

  const vec3Size = 4 * 3;
  const cameraBuffer = device.createBuffer({
    size: vec3Size,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const cameraMatrixBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const floatSize = 4;
  const uTimeBuffer = device.createBuffer({
    size: floatSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const fovBuffer = device.createBuffer({
    size: floatSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const aspectRatioBuffer = device.createBuffer({
    size: floatSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // const nearBuffer = device.createBuffer({
  //   size: floatSize,
  //   usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  // });

  const uColorBuffer = device.createBuffer({
    size: vec3Size,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const scaleBuffer = device.createBuffer({
    size: vec3Size,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const int16Size = 4;
  const modeBuffer = device.createBuffer({
    size: int16Size,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // const sfdMatrixBuffer = device.createBuffer({
  //   size: uniformBufferSize,
  //   usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  // });

  const sfdMatrixInvBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const lightDirectionBuffer = device.createBuffer({
    size: vec3Size,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const logDepthBufFCBuffer = device.createBuffer({
    size: floatSize,
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
      {
        binding: 2,
        resource: {
          buffer: cameraBuffer,
          offset: 0,
          size: vec3Size,
        },
      },
      {
        binding: 3,
        resource: {
          buffer: cameraMatrixBuffer,
          offset: 0,
          size: uniformBufferSize,
        },
      },
      {
        binding: 4,
        resource: {
          buffer: uTimeBuffer,
          offset: 0,
          size: floatSize,
        },
      },
      {
        binding: 5,
        resource: {
          buffer: fovBuffer,
          offset: 0,
          size: floatSize,
        },
      },
      {
        binding: 6,
        resource: {
          buffer: aspectRatioBuffer,
          offset: 0,
          size: floatSize,
        },
      },
      {
        binding: 8,
        resource: {
          buffer: uColorBuffer,
          offset: 0,
          size: vec3Size,
        },
      },
      {
        binding: 9,
        resource: {
          buffer: scaleBuffer,
          offset: 0,
          size: vec3Size,
        },
      },
      {
        binding: 10,
        resource: {
          buffer: modeBuffer,
          offset: 0,
          size: int16Size,
        },
      },
      {
        binding: 12,
        resource: {
          buffer: sfdMatrixInvBuffer,
          offset: 0,
          size: uniformBufferSize,
        },
      },
      {
        binding: 13,
        resource: {
          buffer: lightDirectionBuffer,
          offset: 0,
          size: vec3Size,
        },
      },
      {
        binding: 14,
        resource: {
          buffer: logDepthBufFCBuffer,
          offset: 0,
          size: floatSize,
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

  const noiseTextureWidth = 64;
  const noiseTexture = device.createTexture({
    size: [noiseTextureWidth, noiseTextureWidth * noiseTextureWidth, 1],
    format: "rgba8unorm",
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const perlinNoise = generateNoiseData(noiseTextureWidth);
  const perlinSize = noiseTextureWidth;
  device.queue.writeTexture(
    { texture: noiseTexture },
    perlinNoise,
    {
      bytesPerRow: perlinSize * 4,
      rowsPerImage: perlinSize * perlinSize,
    },
    { width: perlinSize, height: perlinSize * perlinSize }
  );

  const sampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
  });

  // Create the depth texture for rendering/sampling the shadow map.
  const shadowDepthTexture = device.createTexture({
    size: [shadowDepthTextureSize, shadowDepthTextureSize, 1],
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    format: "depth32float",
  });
  const shadowDepthTextureView = shadowDepthTexture.createView();

  const uniformBindGroup1 = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(1),
    entries: [
      { binding: 0, resource: inputBufferTexture.createView() },
      { binding: 1, resource: noiseTexture.createView() },
      { binding: 2, resource: shadowDepthTextureView },
      { binding: 3, resource: sampler },
    ],
  });

  // Shadow bind group
  const sceneBindGroupForShadow = device.createBindGroup({
    layout: shadowPipeline.getBindGroupLayout(0),
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

  const shadowPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [],
    depthStencilAttachment: {
      view: shadowDepthTextureView,
      depthClearValue: 1.0,
      depthLoadOp: "clear",
      depthStoreOp: "store",
    },
  };

  // Calculate constants
  const aspect = canvas.width / canvas.height;
  const projectionMatrix = mat4.perspective(
    (2 * Math.PI) / 5,
    aspect,
    1,
    100.0
  );

  // Animation loop

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

      const shadowPass = commandEncoder.beginRenderPass(shadowPassDescriptor);
      shadowPass.setPipeline(shadowPipeline);
      shadowPass.setBindGroup(0, sceneBindGroupForShadow);
      shadowPass.setVertexBuffer(0, verticesBuffer);
      shadowPass.draw(cubeVertexCount);

      shadowPass.end();

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
  const noise = new Noise(7);

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
