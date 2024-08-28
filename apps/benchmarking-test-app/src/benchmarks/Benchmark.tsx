import { useCallback, useState } from "react";
import { Button, Text } from "react-native";
import { isClient } from "@ir-engine/common/src/utils/getEnvironment";

export interface BenchmarkProps {
  name: string;
  run: () => Promise<void>;
}

export const Benchmark: React.FC<BenchmarkProps> = ({ name, run }) => {
  const [benchmarkRunTime, setBenchmarkRunTime] = useState<number | null>(null);
  const [error, setError] = useState<Error>();
  const [running, setRunning] = useState(false);

  const onBeginBenchmark = useCallback(async () => {
    setRunning(true);
    console.log(isClient);
    const startTime = Date.now();
    await run().catch((err) => {
      setError(err);
    });
    const timeDelta = Date.now() - startTime;
    setRunning(false);
    setBenchmarkRunTime(timeDelta);
  }, [run]);

  if (error) {
    return <Text>{`${error}`}</Text>;
  }

  if (running) {
    return <Text>Running benchmark, please wait</Text>;
  }

  if (benchmarkRunTime) {
    const completedLabel = `${name}Completed`;
    return <Text testID={completedLabel}>{benchmarkRunTime}</Text>;
  }

  return <Button title={name} testID={name} onPress={onBeginBenchmark} />;
};
