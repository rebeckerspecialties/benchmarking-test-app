import { parseBenchmarks } from "./parseBenchmarks";
import path from "path";

const benchmarkPath = path.resolve(process.cwd(), "benchmarks");
const outputPath = path.resolve(process.cwd(), "benchmark.json");

parseBenchmarks(benchmarkPath, outputPath);