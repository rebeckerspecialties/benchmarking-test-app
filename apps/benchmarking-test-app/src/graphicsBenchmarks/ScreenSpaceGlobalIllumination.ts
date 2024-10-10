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
  modelFragWGSL,
  poissonDenoiseFragWGSL,
  ssgiComposeFragWGSL,
  ssgiFragWGSL,
  modelVertWGSL,
} from "./shaders/ssgiShader";
import { mesh } from "./meshes/stanfordDragon";

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

const runScreenSpaceShader = async (
  ssgiMode: 0 | 1,
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

  const modelPipeline = device.createRenderPipeline({
    layout: "auto",
    label: "model",
    vertex: {
      module: device.createShaderModule({
        code: modelVertWGSL,
      }),
      buffers: modelBuffer,
    },
    fragment: {
      module: device.createShaderModule({
        code: modelFragWGSL,
      }),
      targets: [
        {
          // diffuse
          format: "rgba16float",
        },
        {
          // normal
          format: "rgba16float",
        },
        {
          // material
          format: "rgba16float",
        },
      ],
    },
    primitive,
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: "less",
      format: "depth24plus",
    },
  });

  const pipeline = createFullscreenPipeline(
    device,
    presentationFormat,
    ssgiFragWGSL,
    "ssgi"
  );

  const denoisePipeline = createFullscreenPipeline(
    device,
    presentationFormat,
    poissonDenoiseFragWGSL,
    "denoise"
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
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
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
    format: "rgba16float",
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
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
    format: "rgba16float",
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const uniformBindGroup0 = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: accumulatedTexture.createView() },
      { binding: 1, resource: depthTexture.createView() },
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
  const diffuseTexture = device.createTexture({
    size: [canvas.width, canvas.height, 1],
    format: "rgba16float",
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.COPY_SRC |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const normalTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: "rgba16float",
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
  });

  const materialTexture = device.createTexture({
    size: [canvas.width, canvas.height, 1],
    format: "rgba16float",
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const materialSampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
  });

  const uniformBindGroup2 = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(2),
    entries: [
      { binding: 0, resource: normalTexture.createView() },
      { binding: 1, resource: diffuseTexture.createView() },
      { binding: 2, resource: materialTexture.createView() },
      { binding: 3, resource: materialSampler },
    ],
  });

  // model rendering bind group
  const sceneBindGroupForModel = device.createBindGroup({
    layout: modelPipeline.getBindGroupLayout(0),
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

  // denoise bind groups
  const denoiseInputTexture = device.createTexture({
    size: [canvas.width, canvas.height, 1],
    format: presentationFormat,
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const denoiseBindGroup0 = device.createBindGroup({
    layout: denoisePipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: denoiseInputTexture.createView(),
      },
      {
        binding: 1,
        resource: depthTexture.createView(),
      },
      {
        binding: 2,
        resource: sampler,
      },
    ],
  });

  const radiusBuffer = device.createBuffer({
    size: floatSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const phiBuffer = device.createBuffer({
    size: floatSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const lumaPhiBuffer = device.createBuffer({
    size: floatSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const depthPhiBuffer = device.createBuffer({
    size: floatSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const normalPhiBuffer = device.createBuffer({
    size: floatSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const roughnessPhiBuffer = device.createBuffer({
    size: floatSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const specularPhiBuffer = device.createBuffer({
    size: floatSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const denoiseBindGroup1 = device.createBindGroup({
    layout: denoisePipeline.getBindGroupLayout(1),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: radiusBuffer,
          offset: 0,
          size: floatSize,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: phiBuffer,
          offset: 0,
          size: floatSize,
        },
      },
      {
        binding: 2,
        resource: {
          buffer: lumaPhiBuffer,
          offset: 0,
          size: floatSize,
        },
      },
      {
        binding: 3,
        resource: {
          buffer: depthPhiBuffer,
          offset: 0,
          size: floatSize,
        },
      },
      {
        binding: 4,
        resource: {
          buffer: normalPhiBuffer,
          offset: 0,
          size: floatSize,
        },
      },
      {
        binding: 5,
        resource: {
          buffer: roughnessPhiBuffer,
          offset: 0,
          size: floatSize,
        },
      },
      {
        binding: 6,
        resource: {
          buffer: specularPhiBuffer,
          offset: 0,
          size: floatSize,
        },
      },
      {
        binding: 7,
        resource: {
          buffer: resolutionBuffer,
          offset: 0,
          size: vec2Size,
        },
      },
    ],
  });
  const denoiseBindGroup2 = device.createBindGroup({
    layout: denoisePipeline.getBindGroupLayout(2),
    entries: [
      { binding: 0, resource: normalTexture.createView() },
      { binding: 1, resource: diffuseTexture.createView() },
      { binding: 2, resource: materialTexture.createView() },
      { binding: 3, resource: materialSampler },
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
    format: "rgba16float",
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
        resource: depthTexture.createView(),
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
  const projectionMatrix = mat4.perspective(fov, aspect, 20, 250.0);
  const projectionMatrixInverse = mat4.inverse(projectionMatrix);
  const resolution = vec2.fromValues(canvas.width, canvas.height);
  const cameraNear = 20;
  const cameraFar = 250.0;
  const nearMulFar = cameraNear * cameraFar;
  const farMinusNear = cameraFar - cameraNear;

  // Animation loop

  return new Promise<void>((resolve) => {
    let frame = 0;
    const animate = () => {
      const textureView = context.getCurrentTexture().createView();
      const depthTextureView = depthTexture.createView();

      // Render Pass Descriptors
      const renderPassDescriptor = createDefaultRenderPass(textureView);

      const denoisePassRenderDescriptor = createDefaultRenderPass(textureView);

      const composeRenderPassDescriptor = createDefaultRenderPass(textureView);

      const modelPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
          {
            view: diffuseTexture.createView(),
            clearValue: [0, 0, 0, 1],
            loadOp: "clear",
            storeOp: "store",
          },
          {
            view: normalTexture.createView(),
            clearValue: [0, 0, 1, 1],
            loadOp: "clear",
            storeOp: "store",
          },
          {
            view: materialTexture.createView(),
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

      // Fill buffers
      const xPosition = Math.cos(Math.PI * (frame / 250));
      const zPostion = Math.sin(Math.PI * (frame / 250));
      frame++;

      const cameraPos = vec3.fromValues(100 * xPosition, 50, 100 * zPostion);
      const targetPos = vec3.fromValues(0, 50, 0);
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
      rayDistanceArray.fill(20, 0);
      device.queue.writeBuffer(
        rayDistanceBuffer,
        0,
        rayDistanceArray.buffer,
        rayDistanceArray.byteOffset,
        rayDistanceArray.byteLength
      );

      const thicknessArray = new Float32Array(1);
      thicknessArray.fill(3, 0);
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
      modeArr.fill(ssgiMode, 0);
      device.queue.writeBuffer(
        modeBuffer,
        0,
        modeArr.buffer,
        modeArr.byteOffset,
        modeArr.byteLength
      );

      const radiusArray = new Float32Array(1);
      radiusArray.fill(3, 0);
      device.queue.writeBuffer(
        radiusBuffer,
        0,
        radiusArray.buffer,
        radiusArray.byteOffset,
        radiusArray.byteLength
      );

      const phiArray = new Float32Array(1);
      phiArray.fill(0.5, 0);
      device.queue.writeBuffer(
        phiBuffer,
        0,
        phiArray.buffer,
        phiArray.byteOffset,
        phiArray.byteLength
      );

      const lumaPhiArray = new Float32Array(1);
      lumaPhiArray.fill(5, 0);
      device.queue.writeBuffer(
        lumaPhiBuffer,
        0,
        lumaPhiArray.buffer,
        lumaPhiArray.byteOffset,
        lumaPhiArray.byteLength
      );

      const depthPhiArray = new Float32Array(1);
      depthPhiArray.fill(2, 0);
      device.queue.writeBuffer(
        depthPhiBuffer,
        0,
        depthPhiArray.buffer,
        depthPhiArray.byteOffset,
        depthPhiArray.byteLength
      );

      const normalPhiArray = new Float32Array(1);
      normalPhiArray.fill(3.25, 0);
      device.queue.writeBuffer(
        normalPhiBuffer,
        0,
        normalPhiArray.buffer,
        normalPhiArray.byteOffset,
        normalPhiArray.byteLength
      );

      const roughnessPhiArray = new Float32Array(1);
      roughnessPhiArray.fill(0.25, 0);
      device.queue.writeBuffer(
        roughnessPhiBuffer,
        0,
        roughnessPhiArray.buffer,
        roughnessPhiArray.byteOffset,
        roughnessPhiArray.byteLength
      );

      const specularPhiArray = new Float32Array(1);
      specularPhiArray.fill(1, 0);
      device.queue.writeBuffer(
        specularPhiBuffer,
        0,
        specularPhiArray.buffer,
        specularPhiArray.byteOffset,
        specularPhiArray.byteLength
      );

      // Render pass
      const commandEncoder = device.createCommandEncoder();

      const modelPass = commandEncoder.beginRenderPass(modelPassDescriptor);
      modelPass.setPipeline(modelPipeline);
      modelPass.setBindGroup(0, sceneBindGroupForModel);
      modelPass.setVertexBuffer(0, verticesBuffer);
      modelPass.setIndexBuffer(indexBuffer, "uint16");
      modelPass.drawIndexed(indexCount);

      modelPass.end();

      commandEncoder.copyTextureToTexture(
        { texture: diffuseTexture },
        { texture: sceneTexture },
        [canvas.width, canvas.height]
      );
      commandEncoder.copyTextureToTexture(
        { texture: diffuseTexture },
        { texture: accumulatedTexture },
        [canvas.width, canvas.height]
      );
      commandEncoder.copyTextureToTexture(
        { texture: diffuseTexture },
        { texture: directLightTexture },
        [canvas.width, canvas.height]
      );

      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.setPipeline(pipeline);
      passEncoder.setVertexBuffer(0, screenBuffer);
      passEncoder.setBindGroup(0, uniformBindGroup0);
      passEncoder.setBindGroup(1, uniformBindGroup1);
      passEncoder.setBindGroup(2, uniformBindGroup2);
      passEncoder.draw(screenVertexCount);
      passEncoder.end();

      commandEncoder.copyTextureToTexture(
        { texture: context.getCurrentTexture() },
        { texture: denoiseInputTexture },
        [canvas.width, canvas.height]
      );
      const denoisePass = commandEncoder.beginRenderPass(
        denoisePassRenderDescriptor
      );
      denoisePass.setPipeline(denoisePipeline);
      denoisePass.setVertexBuffer(0, screenBuffer);
      denoisePass.setBindGroup(0, denoiseBindGroup0);
      denoisePass.setBindGroup(1, denoiseBindGroup1);
      denoisePass.setBindGroup(2, denoiseBindGroup2);
      denoisePass.draw(screenVertexCount);
      denoisePass.end();

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
  textureView: GPUTextureView
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
  });
};

export const runScreenSpaceGlobalIllumination = runScreenSpaceShader.bind(
  null,
  0
);

export const runScreenSpaceReflection = runScreenSpaceShader.bind(null, 1);
