import { useCallback, useEffect, useState } from "react";
import { Button, Text } from "react-native";
import { withFlamegraph } from "./withFlamegraph";

export interface BenchmarkProps {
  name: string;
  run: () => Promise<void>;
  flamegraphEnabled: boolean;
}

export const Benchmark: React.FC<BenchmarkProps> = ({
  name,
  run,
  flamegraphEnabled,
}) => {
  const [benchmarkRunTime, setBenchmarkRunTime] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const runBenchmark = flamegraphEnabled ? withFlamegraph(run) : run;

  const onBeginBenchmark = useCallback(async () => {
    setRunning(true);
    const startTime = Date.now();
    await runBenchmark();
    const timeDelta = Date.now() - startTime;
    setRunning(false);
    setBenchmarkRunTime(timeDelta);
  }, [runBenchmark]);

  if (running) {
    return <Text>Running benchmark, please wait</Text>;
  }

  if (benchmarkRunTime) {
    const completedLabel = `${name}Completed`;
    return <Text testID={completedLabel}>{benchmarkRunTime}</Text>;
  }

  return <Button title={name} testID={name} onPress={onBeginBenchmark} />;
};
