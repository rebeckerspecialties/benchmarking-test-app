import { useCallback, useEffect, useState } from "react";
import { Button, Text } from "react-native";

export interface BenchmarkProps {
  name: string;
  run: () => Promise<void>;
}

export const Benchmark: React.FC<BenchmarkProps> = ({ name, run }) => {
  const [isBenchmarkCompleted, setBenchmarkCompleted] = useState(false);

  const [loading, setLoading] = useState(false);

  const onBeginBenchmark = useCallback(async () => {
    setLoading(true);
    await run();
    setLoading(false);
    setBenchmarkCompleted(true);
  }, [run]);

  const completedLabel = `${name}Completed`;

  if (loading) {
    return <Text>Loading</Text>;
  }

  if (isBenchmarkCompleted) {
    return <Text accessibilityLabel={completedLabel}>{completedLabel}</Text>;
  }

  return (
    <Button title={name} accessibilityLabel={name} onPress={onBeginBenchmark} />
  );
};
