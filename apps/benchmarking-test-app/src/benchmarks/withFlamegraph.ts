import { startProfiling, stopProfiling } from "react-native-release-profiler";

export const withFlamegraph = (benchmark: () => Promise<void>) => {
  return async () => {
    startProfiling();
    await benchmark();
    await stopProfiling(true);
  };
};
