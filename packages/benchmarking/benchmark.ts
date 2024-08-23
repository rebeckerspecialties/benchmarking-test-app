const {
  runBenchmarkWithProfiler,
  runBenchmarkWithWallClockTime,
} = require("./runTest");

const runBenchmarkSuite = async () => {
  console.log("Running benchmarks with profiler");
  await runBenchmarkWithProfiler("simpleBenchmark");
  await runBenchmarkWithProfiler("bitEcsBenchmark");
  await runBenchmarkWithProfiler("threeJsBenchmark");

  console.log("Running benchmarks with wall clock time");
  await runBenchmarkWithWallClockTime("simpleBenchmark");
  await runBenchmarkWithWallClockTime("bitEcsBenchmark");
  await runBenchmarkWithWallClockTime("threeJsBenchmark");
};

runBenchmarkSuite();
