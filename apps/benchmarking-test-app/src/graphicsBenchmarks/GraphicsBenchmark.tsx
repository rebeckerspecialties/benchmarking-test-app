import { useCallback, useState } from "react";
import { Button, Text } from "react-native";
import { CanvasContext } from "./types";
import { WebGpuBenchmark } from "./WebGpuBenchmark";

enum BenchmarkState {
  NOT_STARTED,
  RUNNING,
  COMPLETE,
}

export const GraphicsBenchmark: React.FC<{
  name: string;
  run: (
    context: CanvasContext,
    device: GPUDevice,
    requestAnimationFrame: (callback: (time: number) => void) => number
  ) => Promise<void>;
}> = ({ run, name }) => {
  const [benchmarkState, setBenchmarkState] = useState(
    BenchmarkState.NOT_STARTED
  );
  const [benchmarkRunTime, setRunTime] = useState<number>();
  const onComplete = useCallback((startTime: number) => {
    const runTime = Date.now() - startTime;
    setRunTime(runTime);
    setBenchmarkState(BenchmarkState.COMPLETE);
  }, []);

  if (benchmarkState === BenchmarkState.COMPLETE && benchmarkRunTime) {
    const completedLabel = `${name}Completed`;
    return (
      <>
        <Text testID={completedLabel}>{benchmarkRunTime}</Text>
      </>
    );
  }

  if (benchmarkState === BenchmarkState.NOT_STARTED) {
    return (
      <Button
        title={name}
        onPress={() => {
          setBenchmarkState(BenchmarkState.RUNNING);
        }}
      />
    );
  }

  return <WebGpuBenchmark run={run} onComplete={onComplete} />;
};
