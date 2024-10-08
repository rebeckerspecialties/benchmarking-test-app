import { redFragWGSL, vertexShadowWGSL } from "./shaders/SDFShader";
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
import {
  basicVertWGSL,
  ssgiComposeFragWGSL,
  ssgiFragWGSL,
} from "./shaders/ssgiShader";

const shadowDepthTextureSize = 1024;

export const runScreenSpaceGlobalIllumination = async (
  context: CanvasContext,
  device: GPUDevice,
  canvas: HTMLCanvasElement,
  requestAnimationFrame: (callback: (time: number) => void) => number
) => {
  // Pipeline init
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

  const depthPipeline = device.createRenderPipeline({
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
        code: basicVertWGSL,
      }),
      entryPoint: "main",
      buffers: vertexBuffers,
    },
    fragment: {
      module: device.createShaderModule({
        code: ssgiFragWGSL,
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

  const composePipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: device.createShaderModule({
        code: basicVertWGSL,
      }),
      entryPoint: "main",
      buffers: vertexBuffers,
    },
    fragment: {
      module: device.createShaderModule({
        code: ssgiComposeFragWGSL,
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

  // Bind group 0 (textures and samplers)
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
  const accumulatedTexture = device.createTexture({
    size: [canvas.width, canvas.height, 1],
    format: presentationFormat,
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const shadowDepthTexture = device.createTexture({
    size: [shadowDepthTextureSize, shadowDepthTextureSize, 1],
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    format: "depth32float",
  });

  const velocityTexture = device.createTexture({
    size: [canvas.width, canvas.height, 1],
    format: presentationFormat,
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const directLightTexture = device.createTexture({
    size: [canvas.width, canvas.height, 1],
    format: presentationFormat,
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const uniformBindGroup0 = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(1),
    entries: [
      { binding: 0, resource: accumulatedTexture.createView() },
      { binding: 1, resource: shadowDepthTexture.createView() },
      { binding: 2, resource: velocityTexture.createView() },
      { binding: 3, resource: directLightTexture.createView() },
      { binding: 4, resource: sampler },
    ],
  });

  // Bind group 1
  const intSize = 4;
  const floatSize = 4;
  const vec2Size = 4 * 2;
  const vec3Size = 4 * 3;
  const matrixSize = 4 * 16;

  // Buffers
  const backgroundColorBuffer = device.createBuffer({
    size: vec3Size,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const viewMatrixBuffer = device.createBuffer({
    size: matrixSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const projectionMatrixBuffer = device.createBuffer({
    size: matrixSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const projectionMatrixInverseBuffer = device.createBuffer({
    size: matrixSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const cameraMatrixWorldBuffer = device.createBuffer({
    size: matrixSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const maxEnvMapMipLevelBuffer = device.createBuffer({
    size: floatSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const rayDistanceBuffer = device.createBuffer({
    size: floatSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const thicknessBuffer = device.createBuffer({
    size: floatSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const envBlurBuffer = device.createBuffer({
    size: floatSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const resolutionBuffer = device.createBuffer({
    size: vec2Size,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const cameraNearBuffer = device.createBuffer({
    size: floatSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const cameraFarBuffer = device.createBuffer({
    size: floatSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const nearMinusFarBuffer = device.createBuffer({
    size: floatSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const nearMulFarBuffer = device.createBuffer({
    size: floatSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const farMinusNearBuffer = device.createBuffer({
    size: floatSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const modeBuffer = device.createBuffer({
    size: intSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const uniformBindGroup1 = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: backgroundColorBuffer,
          offset: 0,
          size: vec3Size,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: viewMatrixBuffer,
          offset: 0,
          size: matrixSize,
        },
      },
      {
        binding: 2,
        resource: {
          buffer: projectionMatrixBuffer,
          offset: 0,
          size: matrixSize,
        },
      },
      {
        binding: 3,
        resource: {
          buffer: projectionMatrixInverseBuffer,
          offset: 0,
          size: matrixSize,
        },
      },
      {
        binding: 4,
        resource: {
          buffer: cameraMatrixWorldBuffer,
          offset: 0,
          size: matrixSize,
        },
      },
      {
        binding: 5,
        resource: {
          buffer: maxEnvMapMipLevelBuffer,
          offset: 0,
          size: floatSize,
        },
      },
      {
        binding: 6,
        resource: {
          buffer: rayDistanceBuffer,
          offset: 0,
          size: floatSize,
        },
      },
      {
        binding: 7,
        resource: {
          buffer: thicknessBuffer,
          offset: 0,
          size: floatSize,
        },
      },
      {
        binding: 8,
        resource: {
          buffer: envBlurBuffer,
          offset: 0,
          size: floatSize,
        },
      },
      {
        binding: 9,
        resource: {
          buffer: resolutionBuffer,
          offset: 0,
          size: vec2Size,
        },
      },
      {
        binding: 10,
        resource: {
          buffer: cameraNearBuffer,
          offset: 0,
          size: floatSize,
        },
      },
      {
        binding: 11,
        resource: {
          buffer: cameraFarBuffer,
          offset: 0,
          size: floatSize,
        },
      },
      {
        binding: 12,
        resource: {
          buffer: nearMinusFarBuffer,
          offset: 0,
          size: floatSize,
        },
      },
      {
        binding: 13,
        resource: {
          buffer: nearMulFarBuffer,
          offset: 0,
          size: floatSize,
        },
      },
      {
        binding: 14,
        resource: {
          buffer: farMinusNearBuffer,
          offset: 0,
          size: floatSize,
        },
      },
      {
        binding: 15,
        resource: {
          buffer: modeBuffer,
          offset: 0,
          size: intSize,
        },
      },
    ],
  });

  // Shadow bind group
  const shadowModelViewMatrixBuffer = device.createBuffer({
    size: matrixSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const sceneBindGroupForShadow = device.createBindGroup({
    layout: depthPipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: projectionMatrixBuffer,
          offset: 0,
          size: matrixSize,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: shadowModelViewMatrixBuffer,
          offset: 0,
          size: matrixSize,
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
          size: matrixSize,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: shadowModelViewMatrixBuffer,
          offset: 0,
          size: matrixSize,
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

      const depthPassDescriptor: GPURenderPassDescriptor = {
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
        shadowModelViewMatrixBuffer,
        0,
        shadowModelViewMatrix.buffer,
        shadowModelViewMatrix.byteOffset,
        shadowModelViewMatrix.byteLength
      );

      const modeArr = new Uint32Array(1);
      modeArr.fill(0, 0);
      device.queue.writeBuffer(
        modeBuffer,
        0,
        modeArr.buffer,
        modeArr.byteOffset,
        modeArr.byteLength
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

      const depthPass = commandEncoder.beginRenderPass(depthPassDescriptor);
      depthPass.setPipeline(depthPipeline);
      depthPass.setBindGroup(0, sceneBindGroupForShadow);
      depthPass.setVertexBuffer(0, verticesBuffer);
      depthPass.draw(cubeVertexCount);

      depthPass.end();

      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.setPipeline(pipeline);
      passEncoder.setVertexBuffer(0, screenBuffer);
      passEncoder.setBindGroup(0, uniformBindGroup0);
      passEncoder.setBindGroup(1, uniformBindGroup1);
      passEncoder.draw(screenVertexCount);
      passEncoder.end();

      // TODO: copy outputBuffer to inputBuffer

      const composePassEncoder =
        commandEncoder.beginRenderPass(renderPassDescriptor);
      composePassEncoder.setPipeline(composePipeline);
      composePassEncoder.setVertexBuffer(0, screenBuffer);
      // TODO: bind groups
      // composePassEncoder.setBindGroup(0, uniformBindGroup0);
      // composePassEncoder.setBindGroup(1, uniformBindGroup1);
      composePassEncoder.draw(screenVertexCount);
      composePassEncoder.end();

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
