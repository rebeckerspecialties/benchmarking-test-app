import { StyleSheet, View, PixelRatio } from "react-native";
import { Canvas, useCanvasEffect } from "react-native-wgpu";
import { CanvasContext } from "./types";

export const WebGpuBenchmark: React.FC<{
  onComplete: (startTime: number) => void;
  run: (
    context: CanvasContext,
    device: GPUDevice,
    canvas: HTMLCanvasElement,
    requestAnimationFrame: (callback: (time: number) => void) => number
  ) => Promise<void>;
}> = ({ onComplete, run }) => {
  const ref = useCanvasEffect(async () => {
    const startTime = Date.now();
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error("No adapter");
    }
    const device = await adapter.requestDevice();
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    const context = ref.current!.getContext("webgpu")!;
    const canvas = context.canvas as HTMLCanvasElement;
    canvas.width = canvas.clientWidth * PixelRatio.get();
    canvas.height = canvas.clientHeight * PixelRatio.get();

    if (!context) {
      throw new Error("No context");
    }

    context.configure({
      device,
      format: presentationFormat,
      alphaMode: "opaque",
    });

    await run(context, device, canvas, requestAnimationFrame);
    onComplete(startTime);
  });

  return (
    <View style={style.container}>
      <Canvas ref={ref} style={style.webgpu} />
    </View>
  );
};

const style = StyleSheet.create({
  container: {
    flex: 1,
  },
  webgpu: {
    flex: 1,
  },
});
