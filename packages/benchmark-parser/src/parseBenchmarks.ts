import { readdir, readFile, writeFile } from "fs/promises";
import { exec } from "child_process";
import { parseString, parseStringPromise } from "xml2js";

interface BenchmarkEntry {
  name: string;
  unit: string;
  value: number;
  range?: string;
  extra?: string;
}

interface paths {
  pathToBenchmarks: string;
  bundlePath: string;
  executablePath: string;
  outputPath: string;
}

interface XmlProfile {
  "trace-query-result": {
    node: XmlNode[];
  };
}

interface XmlNode {
  $: string;
  row: XmlRow[];
}

interface XmlRow {
  $: {
    category: string;
    "total-bytes": string;
  };
}

export async function parseBenchmarks(paths: paths) {
  const { pathToBenchmarks, bundlePath, executablePath, outputPath } = paths;
  const files = await readdir(pathToBenchmarks, {
    recursive: true,
  });

  const benchmarkEntries = await processBenchmarkFiles(pathToBenchmarks, files);
  const bundleSizeEntry = await processBundleSize(
    bundlePath,
    "Bundle Size"
  ).catch((err) => {
    console.error(err);
    return null;
  });
  if (bundleSizeEntry) {
    benchmarkEntries.push(bundleSizeEntry);
  }

  const executableSizeEntry = await processBundleSize(
    executablePath,
    "Executable Size"
  ).catch((err) => {
    console.error(err);
    return null;
  });
  if (executableSizeEntry) {
    benchmarkEntries.push(executableSizeEntry);
  }

  const xmlFiles = files.filter((file) => file.split(".").at(-1) === "xml");

  for (const file of xmlFiles) {
    const benchmarkPath = `${pathToBenchmarks}/${file}`;
    const benchmarkEntry = await processXmlProfile(
      benchmarkPath,
      "Memory Usage"
    ).catch((err) => {
      console.error(err);
      return null;
    });

    if (benchmarkEntry) {
      benchmarkEntries.push(benchmarkEntry);
    }
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

async function processBundleSize(bundlePath: string, name: string) {
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

  return createBenchmarkEntry(name, bundleSizeKib, "kiB");
}

async function processXmlProfile(xmlPath: string, name: string) {
  const xmlProfile = await readFile(xmlPath, "utf-8");
  const parsedXml: XmlProfile = await parseStringPromise(xmlProfile);

  const totalBytes = parsedXml["trace-query-result"].node[0].row.find(
    ({ $ }) => {
      return $.category === "All Heap Allocations";
    }
  );

  if (!totalBytes) {
    throw new Error(
      `Failed to parse total memory usage from instruments trace`
    );
  }

  return createBenchmarkEntry(name, totalBytes.$["total-bytes"], "bytes");
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
