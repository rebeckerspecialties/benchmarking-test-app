import mock from "mock-fs";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { parseBenchmarks, parseBenchmarkType } from "./parseBenchmarks";
import { readFile } from "fs/promises";
import * as child_process from "child_process";
import { exampleProfile } from "./exampleProfileXml";

const mockError = jest.spyOn(console, "error").mockImplementation(() => null);

jest.mock("child_process");

const mockExec = jest.spyOn(child_process, "exec");
const paths = {
  pathToBenchmarks: "benchmarks",
  bundlePath: "file.ios.bundle",
  executablePath: "benchmark.ipa",
  outputPath: "benchmark.json",
  xmlPath: "profile.xml",
};

describe("parseBenchmark", () => {
  beforeEach(() => {
    mockExec.mockImplementation((_, _opts, callback) => {
      callback?.(null, "10000 file.ios.bundle", "");
      return {} as child_process.ChildProcess;
    });
  });

  afterEach(() => {
    mock.restore();
  });

  it("should parse a single benchmark file", async () => {
    mock({
      benchmarks: {
        "benchmark-ms.txt": "1234567",
        "profile.xml": exampleProfile,
      },
    });
    await parseBenchmarks(paths);

    const benchmarkResult = await readFile("benchmark.json", "utf-8");

    expect(JSON.parse(benchmarkResult)).toEqual([
      { name: "benchmark-ms.txt", value: 1234567, unit: "ms" },
      { name: "Bundle Size", value: 10000, unit: "kiB" },
      { name: "Executable Size", value: 10000, unit: "kiB" },
      { name: "Memory Usage", value: 21102453, unit: "bytes" },
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

    await parseBenchmarks(paths);

    const benchmarkResult = await readFile("benchmark.json", "utf-8");

    expect(JSON.parse(benchmarkResult)).toEqual([
      { name: "benchmark-ms.txt", value: 1234567, unit: "ms" },
      { name: "benchmark2-ms.txt", value: 2345678, unit: "ms" },
      { name: "Bundle Size", value: 10000, unit: "kiB" },
      { name: "Executable Size", value: 10000, unit: "kiB" },
    ]);
  });

  it("should omit bundle size if exec throws", async () => {
    const err = new Error("Failed to find file");
    mockExec.mockImplementation((_, _opts, callback) => {
      callback?.(err, "", "");
      return {} as child_process.ChildProcess;
    });
    mock({
      benchmarks: {
        "benchmark-ms.txt": "1234567",
        "benchmark2-ms.txt": "2345678",
        "bad-benchmark.md": "2345678",
      },
    });

    await parseBenchmarks(paths);

    const benchmarkResult = await readFile("benchmark.json", "utf-8");

    expect(JSON.parse(benchmarkResult)).toEqual([
      { name: "benchmark-ms.txt", value: 1234567, unit: "ms" },
      { name: "benchmark2-ms.txt", value: 2345678, unit: "ms" },
    ]);

    expect(mockError).toHaveBeenCalledWith(err);
  });

  it("should omit bundle size if result cannot be parsed", async () => {
    mockExec.mockImplementation((_, _opts, callback) => {
      callback?.(null, "bad input", "");
      return {} as child_process.ChildProcess;
    });
    mock({
      benchmarks: {
        "benchmark-ms.txt": "1234567",
        "benchmark2-ms.txt": "2345678",
        "bad-benchmark.md": "2345678",
      },
    });

    await parseBenchmarks(paths);

    const benchmarkResult = await readFile("benchmark.json", "utf-8");

    expect(JSON.parse(benchmarkResult)).toEqual([
      { name: "benchmark-ms.txt", value: 1234567, unit: "ms" },
      { name: "benchmark2-ms.txt", value: 2345678, unit: "ms" },
    ]);

    expect(mockError).toHaveBeenCalledWith(
      new Error("Failed to parse file size from du result: bad input")
    );
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
