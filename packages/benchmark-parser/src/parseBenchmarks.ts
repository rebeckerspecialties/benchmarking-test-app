import { open, Options, ZipFile } from "yauzl";

async function openZipFile(path: string, options: Options) {
  return new Promise((resolve, reject) => {
    open(path, options, (err, zipFile) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(zipFile);
    });
  });
}

async function readZipEntry(zipFile: ZipFile) {
  return new Promise((resolve) => {
    zipFile.readEntry();
    zipFile.on("entry", () => {});
  });
}

function extractBenchmarkZips(paths: string[]) {}

async function parseBenchmarks() {}
