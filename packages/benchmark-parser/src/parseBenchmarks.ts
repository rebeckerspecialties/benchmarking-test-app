import { readdir, readFile, writeFile } from "fs/promises";
import { exec } from "child_process";

interface BenchmarkEntry {
  name: string;
  unit: string;
  value: number;
  range?: string;
  extra?: string;
}

export async function parseBenchmarks(
  pathToBenchmarks: string,
  bundlePath: string,
  outputPath: string
) {
  const files = await readdir(pathToBenchmarks, {
    recursive: true,
  });

  const benchmarkEntries = await processBenchmarkFiles(pathToBenchmarks, files);
  const bundleSizeEntry = await processBundleSize(bundlePath).catch((err) => {
    console.error(err);
    return null;
  });
  if (bundleSizeEntry) {
    benchmarkEntries.push(bundleSizeEntry);
  }

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

async function processBundleSize(bundlePath: string) {
  const output = await new Promise<string>((resolve, reject) => {
    exec(`du -k ${bundlePath}`, { encoding: "utf8" }, (err, stdout, stderr) => {
      if (stderr.length > 0) {
        console.error(stderr);
      }
      if (err) {
        reject(err);
      } else {
        resolve(stdout);
      }
    });
  });

  const bundleSizeKib = output.match(/^\d+/)?.at(0);
  if (!bundleSizeKib) {
    throw new Error(`Failed to parse file size from du result: ${output}`);
  }

  return createBenchmarkEntry("Bundle Size", bundleSizeKib, "kiB");
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
