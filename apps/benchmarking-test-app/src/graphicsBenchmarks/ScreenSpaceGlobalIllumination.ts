import { redFragWGSL, vertexShadowWGSL } from "./shaders/SDFShader";
import { CanvasContext } from "./types";
import {
  cubePositionOffset,
  cubeUVOffset,
  cubeVertexSize,
} from "./meshes/cube";
import { screenVertexArray, screenVertexCount } from "./meshes/screen";
import { mat4, vec2, vec3 } from "wgpu-matrix";
import { generateNoiseData } from "./textures/perlin";
import {
  basicVertWGSL,
  ssgiComposeFragWGSL,
  ssgiFragWGSL,
} from "./shaders/ssgiShader";
import { mesh } from "./meshes/stanfordDragon";

const depthTextureSize = 1024;

const arrayStride = 3 + 3 + 2 + 3 + 1 + 1 + 3;

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

const modelBuffer: GPUVertexBufferLayout[] = [
  {
    arrayStride: Float32Array.BYTES_PER_ELEMENT * arrayStride,
    attributes: [
      {
        // position
        shaderLocation: 0,
        offset: 0,
        format: "float32x3",
      },
      {
        // normal
        shaderLocation: 1,
        offset: Float32Array.BYTES_PER_ELEMENT * 3,
        format: "float32x3",
      },
      {
        // uv
        shaderLocation: 2,
        offset: Float32Array.BYTES_PER_ELEMENT * (3 + 3),
        format: "float32x2",
      },
      {
        // color
        shaderLocation: 3,
        offset: Float32Array.BYTES_PER_ELEMENT * (3 + 3 + 2),
        format: "float32x3",
      },
      {
        // roughness
        shaderLocation: 4,
        offset: Float32Array.BYTES_PER_ELEMENT * (3 + 3 + 2 + 3),
        format: "float32",
      },
      {
        // metallic
        shaderLocation: 5,
        offset: Float32Array.BYTES_PER_ELEMENT * (3 + 3 + 2 + 3 + 1),
        format: "float32",
      },
      {
        // emissive
        shaderLocation: 6,
        offset: Float32Array.BYTES_PER_ELEMENT * (3 + 3 + 2 + 3 + 1 + 1),
        format: "float32x3",
      },
    ],
  },
];

const primitive: GPUPrimitiveState = {
  topology: "triangle-list",
  cullMode: "back",
};

export const runScreenSpaceGlobalIllumination = async (
  context: CanvasContext,
  device: GPUDevice,
  canvas: HTMLCanvasElement,
  requestAnimationFrame: (callback: (time: number) => void) => number
) => {
  // Pipeline init
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  const verticesBuffer = device.createBuffer({
    size: mesh.positions.length * arrayStride * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  {
    const mapping = new Float32Array(verticesBuffer.getMappedRange());
    for (let i = 0; i < mesh.positions.length; ++i) {
      mapping.set(mesh.positions[i], arrayStride * i);
      mapping.set(mesh.normals[i], arrayStride * i + 3);
      mapping.set(mesh.uvs[i], arrayStride * i + (3 + 3));
      mapping.set(mesh.colors[i], arrayStride * i + (3 + 3 + 2));
      mapping.set(mesh.roughness[i], arrayStride * i + (3 + 3 + 2 + 3));
      mapping.set(mesh.metalness[i], arrayStride * i + (3 + 3 + 2 + 3 + 1));
      mapping.set(mesh.emissives[i], arrayStride * i + (3 + 3 + 2 + 3 + 1 + 1));
    }
    verticesBuffer.unmap();
  }

  // Create the model index buffer.
  const indexCount = mesh.triangles.length * 3;
  const indexBuffer = device.createBuffer({
    size: indexCount * Uint16Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.INDEX,
    mappedAtCreation: true,
  });
  {
    const mapping = new Uint16Array(indexBuffer.getMappedRange());
    for (let i = 0; i < mesh.triangles.length; ++i) {
      mapping.set(mesh.triangles[i], 3 * i);
    }
    indexBuffer.unmap();
  }
  const screenBuffer = device.createBuffer({
    size: screenVertexArray.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });

  new Float32Array(screenBuffer.getMappedRange()).set(screenVertexArray);
  screenBuffer.unmap();

  const cubePipeline = device.createRenderPipeline({
    layout: "auto",
    label: "cube",
    vertex: {
      module: device.createShaderModule({
        code: vertexShadowWGSL,
      }),
      buffers: modelBuffer,
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
    label: "depth",
    vertex: {
      module: device.createShaderModule({
        code: vertexShadowWGSL,
      }),
      buffers: modelBuffer,
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: "less",
      format: "depth32float",
    },
    primitive,
  });

  const pipeline = createFullscreenPipeline(
    device,
    presentationFormat,
    ssgiFragWGSL,
    "ssgi"
  );

  const composePipeline = createFullscreenPipeline(
    device,
    presentationFormat,
    ssgiComposeFragWGSL,
    "compose"
  );

  const depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: "depth24plus",
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  // Bind group 0 (textures and samplers)

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

  // Create the depth texture for rendering/sampling the depth pass.
  const accumulatedTexture = device.createTexture({
    size: [canvas.width, canvas.height, 1],
    format: presentationFormat,
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const depthPassTexture = device.createTexture({
    size: [depthTextureSize, depthTextureSize, 1],
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
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: accumulatedTexture.createView() },
      { binding: 1, resource: depthPassTexture.createView() },
      { binding: 2, resource: velocityTexture.createView() },
      { binding: 3, resource: directLightTexture.createView() },
      { binding: 4, resource: sampler },
    ],
  });

  // Bind group 1
  const intSize = 4;
  const floatSize = 4;
  const vec2Size = 4 * 2;
  const matrixSize = 4 * 16;

  // Buffers
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

  const rayDistanceBuffer = device.createBuffer({
    size: floatSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const thicknessBuffer = device.createBuffer({
    size: floatSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const resolutionBuffer = device.createBuffer({
    size: vec2Size,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const cameraFarBuffer = device.createBuffer({
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
    layout: pipeline.getBindGroupLayout(1),
    entries: [
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
        binding: 9,
        resource: {
          buffer: resolutionBuffer,
          offset: 0,
          size: vec2Size,
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

  // Bind group 2
  const gBufferTexture = device.createTexture({
    size: [canvas.width, canvas.height, 1],
    format: presentationFormat,
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const gBufferSampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
  });

  const uniformBindGroup2 = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(2),
    entries: [
      { binding: 0, resource: gBufferTexture.createView() },
      { binding: 1, resource: gBufferSampler },
    ],
  });

  // Depth pass bind group
  const depthPassBindGroup = device.createBindGroup({
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
          buffer: viewMatrixBuffer,
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
          buffer: viewMatrixBuffer,
          offset: 0,
          size: matrixSize,
        },
      },
    ],
  });

  // Compose bind group
  const inputTexture = device.createTexture({
    size: [canvas.width, canvas.height, 1],
    format: presentationFormat,
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const sceneTexture = device.createTexture({
    size: [canvas.width, canvas.height, 1],
    format: presentationFormat,
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const composeSampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
  });

  const composeBindGroup = device.createBindGroup({
    layout: composePipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: inputTexture.createView(),
      },
      {
        binding: 1,
        resource: sceneTexture.createView(),
      },
      {
        binding: 2,
        resource: depthPassTexture.createView(),
      },
      {
        binding: 3,
        resource: composeSampler,
      },
    ],
  });

  // Calculate constants
  const aspect = canvas.width / canvas.height;
  const fov = Math.PI / 2;
  const projectionMatrix = mat4.perspective(fov, aspect, 1, 1000.0);
  const projectionMatrixInverse = mat4.inverse(projectionMatrix);
  const resolution = vec2.fromValues(canvas.width, canvas.height);
  const cameraNear = 1.0;
  const cameraFar = 1000.0;
  const nearMulFar = cameraNear * cameraFar;
  const farMinusNear = cameraFar - cameraNear;

  // Animation loop

  return new Promise<void>((resolve) => {
    let frame = 0;
    const animate = () => {
      const textureView = context.getCurrentTexture().createView();
      const depthTextureview = depthTexture.createView();

      // Render Pass Descriptors
      const renderPassDescriptor = createDefaultRenderPass(
        textureView,
        depthTextureview
      );

      const composeRenderPassDescriptor = createDefaultRenderPass(
        textureView,
        depthTextureview
      );

      const depthPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [],
        depthStencilAttachment: {
          view: depthPassTexture.createView(),
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

      // Fill buffers
      const positionOffset = 20 * Math.sin(Math.PI * (frame / 250));
      frame++;

      const cameraPos = vec3.fromValues(
        positionOffset,
        100,
        -100 + positionOffset
      );
      const targetPos = vec3.fromValues(0, 25, 0);
      const axis = vec3.fromValues(0, 1, 0);

      const viewMatrix = mat4.lookAt(cameraPos, targetPos, axis);
      const cameraMatrix = mat4.cameraAim(cameraPos, targetPos, axis);

      device.queue.writeBuffer(
        viewMatrixBuffer,
        0,
        viewMatrix.buffer,
        viewMatrix.byteOffset,
        viewMatrix.byteLength
      );

      device.queue.writeBuffer(
        projectionMatrixBuffer,
        0,
        projectionMatrix.buffer,
        projectionMatrix.byteOffset,
        projectionMatrix.byteLength
      );

      device.queue.writeBuffer(
        projectionMatrixInverseBuffer,
        0,
        projectionMatrixInverse.buffer,
        projectionMatrixInverse.byteOffset,
        projectionMatrixInverse.byteLength
      );

      device.queue.writeBuffer(
        cameraMatrixWorldBuffer,
        0,
        cameraMatrix.buffer,
        cameraMatrix.byteOffset,
        cameraMatrix.byteLength
      );

      const rayDistanceArray = new Float32Array(1);
      rayDistanceArray.fill(100.0, 0);
      device.queue.writeBuffer(
        rayDistanceBuffer,
        0,
        rayDistanceArray.buffer,
        rayDistanceArray.byteOffset,
        rayDistanceArray.byteLength
      );

      const thicknessArray = new Float32Array(1);
      thicknessArray.fill(1, 0);
      device.queue.writeBuffer(
        thicknessBuffer,
        0,
        thicknessArray.buffer,
        thicknessArray.byteOffset,
        thicknessArray.byteLength
      );

      device.queue.writeBuffer(
        resolutionBuffer,
        0,
        resolution.buffer,
        resolution.byteOffset,
        resolution.byteLength
      );

      const cameraFarArray = new Float32Array(1);
      cameraFarArray.fill(cameraFar, 0);
      device.queue.writeBuffer(
        cameraFarBuffer,
        0,
        cameraFarArray.buffer,
        cameraFarArray.byteOffset,
        cameraFarArray.byteLength
      );

      const nearMulFarArray = new Float32Array(1);
      nearMulFarArray.fill(nearMulFar, 0);
      device.queue.writeBuffer(
        nearMulFarBuffer,
        0,
        nearMulFarArray.buffer,
        nearMulFarArray.byteOffset,
        nearMulFarArray.byteLength
      );

      const farMinusNearArray = new Float32Array(1);
      farMinusNearArray.fill(farMinusNear, 0);
      device.queue.writeBuffer(
        farMinusNearBuffer,
        0,
        farMinusNearArray.buffer,
        farMinusNearArray.byteOffset,
        farMinusNearArray.byteLength
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

      // Render pass
      const commandEncoder = device.createCommandEncoder();

      const cubePass = commandEncoder.beginRenderPass(cubePassDescriptor);
      cubePass.setPipeline(cubePipeline);
      cubePass.setBindGroup(0, sceneBindGroupForCube);
      cubePass.setVertexBuffer(0, verticesBuffer);
      cubePass.setIndexBuffer(indexBuffer, "uint16");
      cubePass.drawIndexed(indexCount);

      cubePass.end();

      const sceneRenderView = context.getCurrentTexture();
      commandEncoder.copyTextureToTexture(
        { texture: sceneRenderView },
        { texture: sceneTexture },
        [canvas.width, canvas.height]
      );
      commandEncoder.copyTextureToTexture(
        { texture: sceneRenderView },
        { texture: accumulatedTexture },
        [canvas.width, canvas.height]
      );
      commandEncoder.copyTextureToTexture(
        { texture: sceneRenderView },
        { texture: directLightTexture },
        [canvas.width, canvas.height]
      );

      const depthPass = commandEncoder.beginRenderPass(depthPassDescriptor);
      depthPass.setPipeline(depthPipeline);
      depthPass.setBindGroup(0, depthPassBindGroup);
      depthPass.setVertexBuffer(0, verticesBuffer);
      depthPass.setIndexBuffer(indexBuffer, "uint16");
      depthPass.drawIndexed(indexCount);
      depthPass.end();

      // TODO: gbuffer pass

      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.setPipeline(pipeline);
      passEncoder.setVertexBuffer(0, screenBuffer);
      passEncoder.setBindGroup(0, uniformBindGroup0);
      passEncoder.setBindGroup(1, uniformBindGroup1);
      passEncoder.setBindGroup(2, uniformBindGroup2);
      passEncoder.draw(screenVertexCount);
      passEncoder.end();

      // TODO: poisson denoise pass

      // TODO: denoiser compose pass

      const ssgiRenderView = context.getCurrentTexture();
      commandEncoder.copyTextureToTexture(
        { texture: ssgiRenderView },
        { texture: inputTexture },
        [canvas.width, canvas.height]
      );

      const composePassEncoder = commandEncoder.beginRenderPass(
        composeRenderPassDescriptor
      );
      composePassEncoder.setPipeline(composePipeline);
      composePassEncoder.setVertexBuffer(0, screenBuffer);
      composePassEncoder.setBindGroup(0, composeBindGroup);
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

const createDefaultRenderPass = (
  textureView: GPUTextureView,
  depthTextureView: GPUTextureView
): GPURenderPassDescriptor => {
  return {
    colorAttachments: [
      {
        view: textureView,
        clearValue: [0, 0, 0, 1],
        loadOp: "clear",
        storeOp: "store",
      },
    ],
    depthStencilAttachment: {
      view: depthTextureView,

      depthClearValue: 1.0,
      depthLoadOp: "clear",
      depthStoreOp: "store",
    },
  };
};

const createFullscreenPipeline = (
  device: GPUDevice,
  presentationFormat: GPUTextureFormat,
  fragmentShader: string,
  key: string
) => {
  return device.createRenderPipeline({
    layout: "auto",
    label: key,
    vertex: {
      module: device.createShaderModule({
        code: basicVertWGSL,
      }),
      entryPoint: "main",
      buffers: vertexBuffers,
    },
    fragment: {
      module: device.createShaderModule({
        code: fragmentShader,
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
};
