import { readdir, readFile, writeFile } from "fs/promises";

interface BenchmarkEntry {
  name: string;
  unit: string;
  value: number;
  range?: string;
  extra?: string;
}

function createBenchmarkEntry(
  file: string,
  result: string,
  unit: string
): BenchmarkEntry {
  return {
    name: file,
    unit,
    value: parseInt(result),
  };
}

async function parseBenchmarks() {
  try {
    const benchmarkEntries: BenchmarkEntry[] = [];

    const files = await readdir("benchmarks", {
      recursive: true,
    });

    for (const file of files) {
      const result = await readFile(file, "utf-8");
      benchmarkEntries.push(createBenchmarkEntry(file, result, "ms"));
    }

    await writeFile("benchmark.json", JSON.stringify(benchmarkEntries));
    console.log("Successfully wrote results to benchmark.json");
  } catch (err) {
    console.error(err);
  }
}

parseBenchmarks();
