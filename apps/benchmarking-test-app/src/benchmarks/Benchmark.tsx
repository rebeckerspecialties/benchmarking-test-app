import { useCallback, useEffect, useState } from "react";
import { Button, Text } from "react-native";

export interface BenchmarkProps {
  name: string;
  run: () => Promise<void>;
}

export const Benchmark: React.FC<BenchmarkProps> = ({ name, run }) => {
  const [benchmarkRunTime, setBenchmarkRunTime] = useState<number | null>(null);

  const [running, setRunning] = useState(false);

  const onBeginBenchmark = useCallback(async () => {
    setRunning(true);
    const startTime = Date.now();
    await run();
    const timeDelta = Date.now() - startTime;
    setRunning(false);
    setBenchmarkRunTime(timeDelta);
  }, [run]);

  if (running) {
    return <Text>Running benchmark, please wait</Text>;
  }

  if (benchmarkRunTime) {
    const completedLabel = `${name}Completed`;
    return <Text testID={completedLabel}>{benchmarkRunTime}</Text>;
  }

  return <Button title={name} testID={name} onPress={onBeginBenchmark} />;
};
