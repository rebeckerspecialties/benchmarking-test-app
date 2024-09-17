import { useCallback, useState } from "react";
import { Button, Text } from "react-native";

enum BenchmarkState {
  NOT_STARTED,
  RUNNING,
  COMPLETE,
}

export const ComponentBenchmark: React.FC<{
  Component: React.FC<{ onComplete: (startTime: number) => void }>;
  name: string;
}> = ({ Component, name }) => {
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

  return <Component onComplete={onComplete} />;
};
