# React Native Benchmarking Library

Utilities for benchmarking JavaScript libraries in React Native applications

## Quick Start

For the simplest benchmark setup, use the `BenchmarkHarness` component:

```tsx
const BENCHMARK_MATRIX = [
  {
    title: "simpleBenchmark",
    benchmarkType: "headless",
    benchmarkFn: simpleBenchmark,
  },
  {
    title: "fxaaBenchmark",
    benchmarkType: "graphics",
    benchmarkFn: fxaaBenchmark,
  },
];

const App = () => {
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "white" }}
        accessibilityLabel="benchmarkSafeArea"
      >
        <BenchmarkHarness items={BENCHMARK_MATRIX} />
      </SafeAreaView>
    </>
  );
};
```

## Writing a headless benchmark function

A headless benchmark simply needs to resolve a Promise when execution completes. A good benchmark function should have sufficient iterations to reduce variability. For example:

```ts
const simpleBenchmark = async () => {
  for (let i = 0; i < 100; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, i);
    });
  }
};
```

## Writing a graphics benchmark function

A graphics benchmark function takes in the GPU context and Canvas and resolves when execution completes. For example:

```ts
// https://webgpu.github.io/webgpu-samples/?sample=helloTriangle
import { redFragWGSL, triangleVertWGSL } from "./shaders/triangleShader";
import { CanvasContext } from "./types";

export const runHelloTriangle = async (
  context: CanvasContext,
  device: GPUDevice,
  _canvas: HTMLCanvasElement,
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

      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, uniformBindGroup);
      passEncoder.draw(3);
      passEncoder.end();

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
```

## Customized Setup

By default, the `BenchmarkHarness` will include a toggle for generating flamegraphs, and will log the JavaScript Engine being used (Hermes or JavaScriptCore). If these options are not needed, or more configuration options are desired, the `Benchmark`, `GraphicsBenchmark`, and `JavaScriptEngineVersion` components can be used independently.

```tsx
const App = () => {
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "white" }}
        accessibilityLabel="benchmarkSafeArea"
      >
        <Benchmark
          flamegraphEnabled={true}
          name={"simpleBenchmark"}
          run={simpleBenchmark}
          key={"simpleBenchmark"}
        />
      </SafeAreaView>
    </>
  );
};
```
