import { useCallback, useState } from "react";
import { Button, Text, View } from "react-native";
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
  const [error, setError] = useState<Error>();
  const [running, setRunning] = useState(false);
  const [profileLocation, setProfileLocation] = useState("");

  const onBeginBenchmark = useCallback(async () => {
    setRunning(true);
    if (flamegraphEnabled) startProfiling();
    const startTime = Date.now();
    await run().catch((err) => {
      setError(err);
    });
    const timeDelta = Date.now() - startTime;

    if (flamegraphEnabled) {
      const profileLocation = await stopProfiling().catch((err) => {
        return `${err}`;
      });
      setProfileLocation(profileLocation);
      console.log(profileLocation);
    }
    setRunning(false);
    setBenchmarkRunTime(timeDelta);
  }, [run, flamegraphEnabled]);

  if (error) {
    return <Text>{`${error}`}</Text>;
  }

  if (running) {
    return (
      <View style={{ justifyContent: "center", alignItems: "center" }}>
        <Text>Running benchmark, please wait</Text>
      </View>
    );
  }

  if (benchmarkRunTime) {
    const completedLabel = `${name}Completed`;
    return (
      <View style={{justifyContent: 'center', alignItems: 'center'}}>
        <Text style={{fontWeight: 'bold'}} testID={completedLabel} accessibilityValue={{text: `${benchmarkRunTime}`}}>Benchmark took: {benchmarkRunTime}ms</Text>
        <Text testID="profileLocation">{profileLocation}</Text>
      </View>
    );
  }

  return <Button title={name} testID={name} onPress={onBeginBenchmark} />;
};
