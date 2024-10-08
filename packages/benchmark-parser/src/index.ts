import { parseBenchmarks } from "./parseBenchmarks";
import path from "path";

const pathToBenchmarks = path.resolve(process.cwd(), "benchmarks");
const outputPath = path.resolve(process.cwd(), "benchmark.json");
const bundlePath = path.resolve(process.cwd(), "bundleDist/main.ios.jsbundle");
const executablePath = path.resolve(process.cwd(), "jscBenchmarking.ipa");

parseBenchmarks({
  pathToBenchmarks,
  bundlePath,
  executablePath,
  outputPath,
});
