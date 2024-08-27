import { describe, expect, it } from "@jest/globals";
import mock from "mock-fs";
import { parseBenchmarkType } from "./parseBenchmarks";

describe("parseBenchmark", () => {
  it("should parse a benchmark file", () => {
    mock();

    mock.restore();
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
