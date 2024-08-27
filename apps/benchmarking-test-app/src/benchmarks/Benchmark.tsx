import { useCallback, useState } from "react";
import { Button, Text } from "react-native";
import { startProfiling, stopProfiling } from "react-native-release-profiler";

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
  const [profileLocation, setProfileLocation] = useState("");

  const onBeginBenchmark = useCallback(async () => {
    setRunning(true);
    if (flamegraphEnabled) startProfiling();
    const startTime = Date.now();
    await run();
    const timeDelta = Date.now() - startTime;

    if (flamegraphEnabled) {
      const profileLocation = await stopProfiling();
      setProfileLocation(profileLocation);
    }
    setRunning(false);
    setBenchmarkRunTime(timeDelta);
  }, [run]);

  if (running) {
    return <Text>Running benchmark, please wait</Text>;
  }

  if (benchmarkRunTime) {
    const completedLabel = `${name}Completed`;
    return (
      <>
        <Text testID={completedLabel}>{benchmarkRunTime}</Text>
        <Text>{profileLocation}</Text>
      </>
    );
  }

  return <Button title={name} testID={name} onPress={onBeginBenchmark} />;
};
