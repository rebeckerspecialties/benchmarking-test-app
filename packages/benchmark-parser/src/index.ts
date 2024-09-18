import { parseBenchmarks } from "./parseBenchmarks";
import path from "path";

const benchmarkPath = path.resolve(process.cwd(), "benchmarks");
const outputPath = path.resolve(process.cwd(), "benchmark.json");
const bundlePath = path.resolve(process.cwd(), "bundleDist/main.ios.jsbundle");

parseBenchmarks(benchmarkPath, bundlePath, outputPath);
