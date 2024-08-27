import mock from "mock-fs";
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { parseBenchmarks, parseBenchmarkType } from "./parseBenchmarks";
import { readFile } from "fs/promises";

describe("parseBenchmark", () => {
  afterEach(() => {
    mock.restore();
  });

  it("should parse a single benchmark file", async () => {
    mock({
      benchmarks: {
        "benchmark-ms.txt": "1234567",
      },
    });
    await parseBenchmarks("benchmarks", "benchmark.json");

    const benchmarkResult = await readFile("benchmark.json", "utf-8");

    expect(JSON.parse(benchmarkResult)).toEqual([
      { name: "benchmark-ms.txt", value: 1234567, unit: "ms" },
    ]);
  });

  it("should parse multiple benchmark files", async () => {
    mock({
      benchmarks: {
        "benchmark-ms.txt": "1234567",
        "benchmark2-ms.txt": "2345678",
        "bad-benchmark.md": "2345678",
      },
    });

    await parseBenchmarks("benchmarks", "benchmark.json");

    const benchmarkResult = await readFile("benchmark.json", "utf-8");

    expect(JSON.parse(benchmarkResult)).toEqual([
      { name: "benchmark-ms.txt", value: 1234567, unit: "ms" },
      { name: "benchmark2-ms.txt", value: 2345678, unit: "ms" },
    ]);
  });
});

describe("parseBenchmarkType", () => {
  it("should return undefined if the benchmark is not a text file", () => {
    expect(parseBenchmarkType("benchmark-ms.md")).toBeUndefined();
  });

  it("should return undefined if the benchmark does not conclude with the metric", () => {
    expect(parseBenchmarkType("benchmark.txt")).toBeUndefined();
  });

  it("should return the metric enclosed at the end of the file name", () => {
    expect(parseBenchmarkType("benchmark-ms.txt")).toEqual("ms");
  });
});
