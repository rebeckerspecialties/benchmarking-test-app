const { runTest } = require("./runTest");

const runBenchmarkSuite = async () => {
  await runTest("simpleBenchmark").catch();
  await runTest("bitEcsBenchmark").catch();
  await runTest("threeJsBenchmark").catch();
};

runBenchmarkSuite();
