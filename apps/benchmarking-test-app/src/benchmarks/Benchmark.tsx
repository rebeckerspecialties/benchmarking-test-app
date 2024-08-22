import { useCallback, useEffect, useState } from "react";
import { Button, Text } from "react-native";

export interface BenchmarkProps {
  name: string;
  run: () => Promise<void>;
}

export const Benchmark: React.FC<BenchmarkProps> = ({ name, run }) => {
  const [isBenchmarkCompleted, setBenchmarkCompleted] = useState(false);

  const onBeginBenchmark = useCallback(async () => {
    await run();
    setBenchmarkCompleted(true);
  }, [run]);

  if (isBenchmarkCompleted) {
    return <Text>{`${name}-completed`}</Text>;
  }

  return <Button title={name} onPress={onBeginBenchmark} />;
};
