import {
  redFragWGSL,
  sdfShaderFragWGSL,
  sdfShaderVertWGSL,
  vertexShadowWGSL,
} from "./shaders/SDFShader";
import { CanvasContext } from "./types";
import {
  cubePositionOffset,
  cubeUVOffset,
  cubeVertexArray,
  cubeVertexCount,
  cubeVertexSize,
} from "./meshes/cube";
import { screenVertexArray, screenVertexCount } from "./meshes/screen";
import { mat4, vec3 } from "wgpu-matrix";
import { generateNoiseData } from "./textures/perlin";

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

  const screenBuffer = device.createBuffer({
    size: screenVertexArray.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });

  new Float32Array(screenBuffer.getMappedRange()).set(screenVertexArray);
  screenBuffer.unmap();

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

  const cubePipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: device.createShaderModule({
        code: vertexShadowWGSL,
      }),
      buffers: vertexBuffers,
    },
    fragment: {
      module: device.createShaderModule({
        code: redFragWGSL,
      }),
      targets: [{ format: presentationFormat }],
    },
    primitive,
  });

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

  const uColorBuffer = device.createBuffer({
    size: vec3Size,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const scaleBuffer = device.createBuffer({
    size: vec3Size,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const int32size = 4;
  const modeBuffer = device.createBuffer({
    size: int32size,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

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
          size: int32size,
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
    size: [canvas.width, canvas.height, 1],
    format: presentationFormat,
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
  device.queue.writeTexture(
    { texture: noiseTexture },
    perlinNoise,
    {
      bytesPerRow: noiseTextureWidth * 4,
      rowsPerImage: noiseTextureWidth * noiseTextureWidth,
    },
    {
      width: noiseTextureWidth,
      height: noiseTextureWidth * noiseTextureWidth,
    }
  );

  const sampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
    addressModeU: "repeat",
    addressModeV: "repeat",
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
  const shadowModelViewMatrixBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

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
          buffer: shadowModelViewMatrixBuffer,
          offset: 0,
          size: uniformBufferSize,
        },
      },
    ],
  });

  // Cube rendering bind group
  const sceneBindGroupForCube = device.createBindGroup({
    layout: cubePipeline.getBindGroupLayout(0),
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
          buffer: shadowModelViewMatrixBuffer,
          offset: 0,
          size: uniformBufferSize,
        },
      },
    ],
  });

  // Calculate constants
  const aspect = canvas.width / canvas.height;
  const fov = Math.PI / 2;
  const projectionMatrix = mat4.perspective(fov, aspect, 1, 100.0);
  const color = vec3.fromValues(1, 1, 0);
  const scale = vec3.fromValues(0.25, 0.005, 0.25);
  const sdfMatrix = mat4.identity();
  const sdfMatrixInv = mat4.inverse(sdfMatrix);
  const lightDirection = vec3.fromValues(1.0, 1.0, 1.0);
  const modelViewMatrix = mat4.translation(vec3.fromValues(0, 0, -1));

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

      const shadowPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [],
        depthStencilAttachment: {
          view: shadowDepthTexture.createView(),
          depthClearValue: 1.0,
          depthLoadOp: "clear",
          depthStoreOp: "store",
        },
      };

      const cubePassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
          {
            view: textureView,
            clearValue: [0, 0, 0, 1],
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      };

      const positionOffset = 2 * Math.sin(Math.PI * (frame / 250));
      frame++;

      const cameraPos = vec3.fromValues(positionOffset, 0, -4 + positionOffset);
      const targetPos = vec3.fromValues(0, 0, 0);
      const axis = vec3.fromValues(0, 1, 0);

      const shadowModelViewMatrix = mat4.lookAt(cameraPos, targetPos, axis);
      const cameraMatrix = mat4.cameraAim(cameraPos, targetPos, axis);

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
      device.queue.writeBuffer(
        shadowModelViewMatrixBuffer,
        0,
        shadowModelViewMatrix.buffer,
        shadowModelViewMatrix.byteOffset,
        shadowModelViewMatrix.byteLength
      );
      device.queue.writeBuffer(
        cameraBuffer,
        0,
        cameraPos.buffer,
        cameraPos.byteOffset,
        cameraPos.byteLength
      );
      device.queue.writeBuffer(
        cameraMatrixBuffer,
        0,
        cameraMatrix.buffer,
        cameraMatrix.byteOffset,
        cameraMatrix.byteLength
      );
      const timeBuffer = new Float32Array(1);
      timeBuffer.fill(Date.now() / 1000, 0);
      device.queue.writeBuffer(
        uTimeBuffer,
        0,
        timeBuffer.buffer,
        timeBuffer.byteOffset,
        timeBuffer.byteLength
      );
      const fovArray = new Float32Array(1);
      fovArray.fill(fov * (180 / Math.PI), 0);
      device.queue.writeBuffer(
        fovBuffer,
        0,
        fovArray.buffer,
        fovArray.byteOffset,
        fovArray.byteLength
      );
      const aspectRatio = new Float32Array(1);
      aspectRatio.fill(aspect, 0);
      device.queue.writeBuffer(
        aspectRatioBuffer,
        0,
        aspectRatio.buffer,
        aspectRatio.byteOffset,
        aspectRatio.byteLength
      );
      device.queue.writeBuffer(
        uColorBuffer,
        0,
        color.buffer,
        color.byteOffset,
        color.byteLength
      );
      device.queue.writeBuffer(
        scaleBuffer,
        0,
        scale.buffer,
        scale.byteOffset,
        scale.byteLength
      );
      const modeArr = new Uint32Array(1);
      modeArr.fill(3, 0);
      device.queue.writeBuffer(
        modeBuffer,
        0,
        modeArr.buffer,
        modeArr.byteOffset,
        modeArr.byteLength
      );
      device.queue.writeBuffer(
        sfdMatrixInvBuffer,
        0,
        sdfMatrixInv.buffer,
        sdfMatrixInv.byteOffset,
        sdfMatrixInv.byteLength
      );
      device.queue.writeBuffer(
        lightDirectionBuffer,
        0,
        lightDirection.buffer,
        lightDirection.byteOffset,
        lightDirection.byteLength
      );
      const logDepthBufFC = new Float32Array(1);
      logDepthBufFC.fill(0.05, 0);
      device.queue.writeBuffer(
        logDepthBufFCBuffer,
        0,
        logDepthBufFC.buffer,
        logDepthBufFC.byteOffset,
        logDepthBufFC.byteLength
      );

      const commandEncoder = device.createCommandEncoder();

      const cubePass = commandEncoder.beginRenderPass(cubePassDescriptor);
      cubePass.setPipeline(cubePipeline);
      cubePass.setBindGroup(0, sceneBindGroupForCube);
      cubePass.setVertexBuffer(0, verticesBuffer);
      cubePass.draw(cubeVertexCount);

      cubePass.end();

      const renderView = context.getCurrentTexture();
      commandEncoder.copyTextureToTexture(
        { texture: renderView },
        { texture: inputBufferTexture },
        [canvas.width, canvas.height]
      );

      const shadowPass = commandEncoder.beginRenderPass(shadowPassDescriptor);
      shadowPass.setPipeline(shadowPipeline);
      shadowPass.setBindGroup(0, sceneBindGroupForShadow);
      shadowPass.setVertexBuffer(0, verticesBuffer);
      shadowPass.draw(cubeVertexCount);

      shadowPass.end();

      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.setPipeline(pipeline);
      passEncoder.setVertexBuffer(0, screenBuffer);
      passEncoder.setBindGroup(0, uniformBindGroup0);
      passEncoder.setBindGroup(1, uniformBindGroup1);
      passEncoder.draw(screenVertexCount);
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
