import { readdir, readFile, writeFile } from "fs/promises";

interface BenchmarkEntry {
  name: string;
  unit: string;
  value: number;
  range?: string;
  extra?: string;
}

export async function parseBenchmarks(
  pathToBenchmarks: string,
  outputPath: string
) {
  const files = await readdir(pathToBenchmarks, {
    recursive: true,
  });

  const benchmarkEntries = await processBenchmarkFiles(pathToBenchmarks, files);

  await writeFile(outputPath, JSON.stringify(benchmarkEntries));
}

async function processBenchmarkFiles(parentPath: string, files: string[]) {
  const benchmarkEntries: BenchmarkEntry[] = [];
  for (const file of files) {
    const benchmarkType = parseBenchmarkType(file);

    if (!benchmarkType) {
      continue;
    }

    const benchmarkPath = `${parentPath}/${file}`;
    const result = await readFile(benchmarkPath, "utf-8");
    benchmarkEntries.push(createBenchmarkEntry(file, result, benchmarkType));
  }

  return benchmarkEntries;
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

export function parseBenchmarkType(fileName: string): string | undefined {
  const matches = [...fileName.matchAll(/-(\w+)\.txt/g)];
  const match = matches.at(0);
  if (!match) {
    return undefined;
  }
  // Return first match group
  return match.at(1);
}
