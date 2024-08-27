import { readdir, readFile, writeFile } from "fs/promises";

interface BenchmarkEntry {
  name: string;
  unit: string;
  value: number;
  range?: string;
  extra?: string;
}

export async function parseBenchmarks() {
  try {
    const benchmarkEntries: BenchmarkEntry[] = [];

    const files = await readdir("benchmarks", {
      recursive: true,
    });

    for (const file of files) {
      const benchmarkType = parseBenchmarkType(file);

      if (!benchmarkType) {
        continue;
      }

      const result = await readFile(file, "utf-8");
      benchmarkEntries.push(createBenchmarkEntry(file, result, benchmarkType));
    }

    await writeFile("benchmark.json", JSON.stringify(benchmarkEntries));
    console.log("Successfully wrote results to benchmark.json");
  } catch (err) {
    console.error(err);
  }
}

export function createBenchmarkEntry(
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

export function parseBenchmarkType(fileName: string): string | undefined {
  const matches = [...fileName.matchAll(/-(\w+)\.txt/g)];
  const match = matches.at(0);
  if (!match) {
    return undefined;
  }
  // Return first match group
  return match.at(1);
}
