import { CanvasContext } from "./types";
import { fxaaFragWGSL, fxaaVertWGSL, meshFragWGSL, meshVertWGSL } from "./fxaa";
import {
  screenPositionOffset,
  screenUVOffset,
  screenVertexArray,
  screenVertexCount,
  screenVertexSize,
} from "./screen";
import { mesh } from "./meshes/stanfordDragon";
import { mat4, vec3 } from "wgpu-matrix";

export const runDragonFxaa = async (
  context: CanvasContext,
  device: GPUDevice,
  canvas: HTMLCanvasElement,
  requestAnimationFrame: (callback: (time: number) => void) => number
) => {
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  // Create the model vertex buffer.
  const vertexBuffer = device.createBuffer({
    size: mesh.positions.length * 3 * 2 * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  {
    const mapping = new Float32Array(vertexBuffer.getMappedRange());
    for (let i = 0; i < mesh.positions.length; ++i) {
      mapping.set(mesh.positions[i], 6 * i);
      mapping.set(mesh.normals[i], 6 * i + 3);
    }
    vertexBuffer.unmap();
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

  const meshVertexBuffers: Iterable<GPUVertexBufferLayout> = [
    {
      arrayStride: Float32Array.BYTES_PER_ELEMENT * 6,
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
      ],
    },
  ];

  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: device.createShaderModule({
        code: meshVertWGSL,
      }),
      entryPoint: "main",
      buffers: meshVertexBuffers,
    },
    fragment: {
      module: device.createShaderModule({
        code: meshFragWGSL,
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
      cullMode: "back",
    },
  });

  const vertexBuffers: GPUVertexBufferLayout[] = [
    {
      arrayStride: screenVertexSize,
      attributes: [
        {
          // position
          shaderLocation: 0,
          offset: screenPositionOffset,
          format: "float32x4",
        },
        {
          // uv
          shaderLocation: 1,
          offset: screenUVOffset,
          format: "float32x2",
        },
      ],
    },
  ];

  const effectPipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: device.createShaderModule({
        code: fxaaVertWGSL,
      }),
      buffers: vertexBuffers,
    },
    fragment: {
      module: device.createShaderModule({
        code: fxaaFragWGSL,
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
    },
  });

  const screenBuffer = device.createBuffer({
    size: screenVertexArray.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });

  new Float32Array(screenBuffer.getMappedRange()).set(screenVertexArray);
  screenBuffer.unmap();

  const uniformBufferSize = 4 * 16;
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const uniformBindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
        },
      },
    ],
  });

  const texelSize = 4 * 2;
  const texelBuffer = device.createBuffer({
    size: texelSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const inputBufferTexture = device.createTexture({
    size: [canvas.width, canvas.height, 1],
    format: presentationFormat,
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const sampler = device.createSampler({
    magFilter: "nearest",
    minFilter: "nearest",
  });

  const effectBindingGroup = device.createBindGroup({
    layout: effectPipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: texelBuffer,
        },
      },
      {
        binding: 1,
        resource: inputBufferTexture.createView(),
      },
      {
        binding: 2,
        resource: sampler,
      },
    ],
  });

  return new Promise<void>((resolve) => {
    let frame = 0;
    const animate = () => {
      const textureView = context.getCurrentTexture().createView();

      const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
          {
            view: textureView,
            clearValue: [0.2, 0.2, 0.2, 1],
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      };

      const effectRenderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
          {
            view: textureView,
            clearValue: [0.2, 0.2, 0.2, 1],
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      };

      const commandEncoder = device.createCommandEncoder();

      frame++;

      const aspect = canvas.width / canvas.height;
      const eyePosition = vec3.fromValues(0, 50, -100);
      const upVector = vec3.fromValues(0, 1, 0);
      const origin = vec3.fromValues(0, 0, 0);

      const projectionMatrix = mat4.perspective(
        (2 * Math.PI) / 5,
        aspect,
        1,
        2000.0
      );

      const viewMatrix = mat4.lookAt(eyePosition, origin, upVector);

      const viewProjMatrix = mat4.multiply(projectionMatrix, viewMatrix);

      // Move the model so it's centered.
      const modelMatrix = mat4.translation([0, -45, 0]);

      const modelViewProjection = mat4.multiply(viewProjMatrix, modelMatrix);
      device.queue.writeBuffer(
        uniformBuffer,
        0,
        modelViewProjection.buffer,
        modelViewProjection.byteOffset,
        modelViewProjection.byteLength
      );

      const texelArray = new Float32Array(2);
      texelArray.fill(frame * 0.00005, 0, 2);

      device.queue.writeBuffer(
        texelBuffer,
        0,
        texelArray.buffer,
        texelArray.byteOffset,
        texelArray.byteLength
      );

      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, uniformBindGroup);
      passEncoder.setVertexBuffer(0, vertexBuffer);
      passEncoder.setIndexBuffer(indexBuffer, "uint16");
      passEncoder.drawIndexed(indexCount);
      passEncoder.end();

      const renderView = context.getCurrentTexture();
      commandEncoder.copyTextureToTexture(
        { texture: renderView },
        { texture: inputBufferTexture },
        [canvas.width, canvas.height]
      );

      const effectPassEncoder = commandEncoder.beginRenderPass(
        effectRenderPassDescriptor
      );

      effectPassEncoder.setPipeline(effectPipeline);
      effectPassEncoder.setBindGroup(0, effectBindingGroup);
      effectPassEncoder.setVertexBuffer(0, screenBuffer);
      effectPassEncoder.draw(screenVertexCount);
      effectPassEncoder.end();

      device.queue.submit([commandEncoder.finish()]);
      context.present();

      if (frame >= 500) {
        resolve();
      } else {
        requestAnimationFrame(() => animate());
      }
    };

    requestAnimationFrame(animate);
  });
};
