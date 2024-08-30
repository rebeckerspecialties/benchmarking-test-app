import { benchmarkWithWallClockTime } from "./runTest";

const capabilities = {
  platformName: "Android",
  "appium:automationName": "UIAutomator2",
};

const runBenchmarkSuite = async () => {
  console.log("Running benchmarks with wall clock time");
  await benchmarkWithWallClockTime("simpleBenchmark", capabilities);
  await benchmarkWithWallClockTime("bitEcsBenchmark", capabilities);
  await benchmarkWithWallClockTime("threeJsBenchmark", capabilities);
};

runBenchmarkSuite();
