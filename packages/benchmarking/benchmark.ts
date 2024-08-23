import { benchmarkWithProfiler, benchmarkWithWallClockTime } from "./runTest";

const runBenchmarkSuite = async () => {
  console.log("Running benchmarks with profiler");
  await benchmarkWithProfiler("simpleBenchmark");
  await benchmarkWithProfiler("bitEcsBenchmark");
  await benchmarkWithProfiler("threeJsBenchmark");

  console.log("Running benchmarks with wall clock time");
  await benchmarkWithWallClockTime("simpleBenchmark");
  await benchmarkWithWallClockTime("bitEcsBenchmark");
  await benchmarkWithWallClockTime("threeJsBenchmark");
};

runBenchmarkSuite();