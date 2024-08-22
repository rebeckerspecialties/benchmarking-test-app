import { useCallback, useEffect, useState } from "react";
import { Button, Text } from "react-native";

export interface BenchmarkProps {
  name: string;
  run: () => Promise<void>;
}

export const Benchmark: React.FC<BenchmarkProps> = ({ name, run }) => {
  const [isBenchmarkCompleted, setBenchmarkCompleted] = useState(false);

  const [running, setRunning] = useState(false);

  const onBeginBenchmark = useCallback(async () => {
    setRunning(true);
    await run();
    setRunning(false);
    setBenchmarkCompleted(true);
  }, [run]);

  const completedLabel = `${name}Completed`;

  if (running) {
    return <Text>Running benchmark, please wait</Text>;
  }

  if (isBenchmarkCompleted) {
    return <Text accessibilityLabel={completedLabel}>{completedLabel}</Text>;
  }

  return (
    <Button title={name} accessibilityLabel={name} onPress={onBeginBenchmark} />
  );
};
