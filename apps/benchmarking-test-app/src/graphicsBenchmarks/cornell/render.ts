import {
  screenPositionOffset,
  screenUVOffset,
  screenVertexArray,
  screenVertexCount,
  screenVertexSize,
} from "../meshes/screen";
import { CanvasContext } from "../types";
import { basicFragWGSL, basicVertWGSL } from "./cornellShader";

/**
 * Raytracer renders the scene using a software ray-tracing compute pipeline.
 */
export default class TextureRenderer {
  private readonly pipeline: GPURenderPipeline;
  private readonly bindGroup: GPUBindGroup;
  private readonly canvasContext: CanvasContext;
  private readonly screenBuffer;

  constructor(
    device: GPUDevice,
    presentationFormat: GPUTextureFormat,
    inputBuffer: GPUTexture,
    canvasContext: CanvasContext
  ) {
    this.canvasContext = canvasContext;
    const screenBuffer = device.createBuffer({
      size: screenVertexArray.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });

    new Float32Array(screenBuffer.getMappedRange()).set(screenVertexArray);
    screenBuffer.unmap();
    this.screenBuffer = screenBuffer;

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

    this.pipeline = device.createRenderPipeline({
      label: "textureRendererPipeline",
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
          code: basicFragWGSL,
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

    this.bindGroup = device.createBindGroup({
      label: "textureRendererBindGroup",
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: inputBuffer.createView(),
        },
        {
          binding: 1,
          resource: device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
          }),
        },
      ],
    });
  }

  run(commandEncoder: GPUCommandEncoder) {
    const effectRenderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: this.canvasContext.getCurrentTexture().createView(),
          clearValue: [0.2, 0.2, 0.2, 1],
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    };

    const passEncoder = commandEncoder.beginRenderPass(
      effectRenderPassDescriptor
    );
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.setVertexBuffer(0, this.screenBuffer);
    passEncoder.draw(screenVertexCount);

    passEncoder.end();
  }
}
