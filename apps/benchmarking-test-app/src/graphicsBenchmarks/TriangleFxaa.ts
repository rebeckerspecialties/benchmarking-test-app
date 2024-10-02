import { redFragWGSL, triangleVertWGSL } from "./triangle";
import { CanvasContext } from "./types";
import { fxaaFragWGSL, fxaaVertWGSL } from "./fxaa";
import {
  screenPositionOffset,
  screenUVOffset,
  screenVertexArray,
  screenVertexCount,
  screenVertexSize,
} from "./screen";

export const runTriangleFxaa = async (
  context: CanvasContext,
  device: GPUDevice,
  canvas: HTMLCanvasElement,
  requestAnimationFrame: (callback: (time: number) => void) => number
) => {
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: device.createShaderModule({
        code: triangleVertWGSL,
      }),
      entryPoint: "main",
    },
    fragment: {
      module: device.createShaderModule({
        code: redFragWGSL,
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

  const uniformBufferSize = 4;
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

      const floatBuffer = new Float32Array(1);
      floatBuffer.fill(frame, 0);
      frame++;

      device.queue.writeBuffer(
        uniformBuffer,
        0,
        floatBuffer.buffer,
        floatBuffer.byteOffset,
        floatBuffer.byteLength
      );

      const texelArray = new Float32Array(2);
      texelArray.fill(0.005, 0, 2);

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
      passEncoder.draw(3);
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
