import {
  benchmarkWithFlamegraph,
  benchmarkWithMemoryProfiler,
  benchmarkWithProfiler,
  benchmarkWithWallClockTime,
} from "./runTest";

const runBenchmarkSuite = async () => {
  console.log("Running benchmarks with wall clock time");
  await benchmarkWithWallClockTime("simpleBenchmark");
  await benchmarkWithWallClockTime("bitEcsBenchmark");
  await benchmarkWithWallClockTime("threeJsBenchmark");
  await benchmarkWithWallClockTime("hyperfluxBenchmark");
  await benchmarkWithWallClockTime("irEcsBenchmark");

  console.log("Running graphics benchmarks");
  await benchmarkWithWallClockTime("triangleWebGpuBenchmark");
  await benchmarkWithWallClockTime("sdfWebGpuBenchmark", true);
  await benchmarkWithWallClockTime("dragonFxaaBenchmark", true);
  await benchmarkWithWallClockTime("ssgiBenchmark", true);
  await benchmarkWithWallClockTime("ssrBenchmark", true);
  await benchmarkWithWallClockTime("rayTracerBenchmark", true);

  await benchmarkWithMemoryProfiler("sdfWebGpuBenchmark", true);

  console.log("Running benchmarks with flamegraph");
  await benchmarkWithFlamegraph("simpleBenchmark");
  await benchmarkWithFlamegraph("bitEcsBenchmark");
  await benchmarkWithFlamegraph("threeJsBenchmark");
  await benchmarkWithFlamegraph("hyperfluxBenchmark");
  await benchmarkWithFlamegraph("irEcsBenchmark");

  console.log("Running benchmarks with profiler");
  await benchmarkWithProfiler("simpleBenchmark");
  await benchmarkWithProfiler("bitEcsBenchmark");
  await benchmarkWithProfiler("threeJsBenchmark");
  await benchmarkWithProfiler("hyperfluxBenchmark");
  await benchmarkWithProfiler("irEcsBenchmark");
};

runBenchmarkSuite();
