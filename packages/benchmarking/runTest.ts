import { Browser, remote } from "webdriverio";
import { writeFile } from "fs/promises";

const capabilities = {
  platformName: "iOS",
  "appium:automationName": "XCUITest",
};

const wdOpts = {
  hostname: process.env.APPIUM_HOST || "0.0.0.0",
  port: process.env.APPIUM_PORT ? parseInt(process.env.APPIUM_PORT, 10) : 4723,
  path: "/wd/hub",
  capabilities,
};

const perfTraceDir = process.env.DEVICEFARM_LOG_DIR ?? ".";

type benchmarkAsync = (testId: string, driver: Browser) => Promise<void>;

async function runBenchmark(testId: string, driver: Browser) {
  const benchmark = driver.$(`~${testId}`);
  await benchmark.click();

  const completed = driver.$(`~${testId}Completed`);

  await completed.waitForDisplayed({ timeout: 20000 });
  const result = await completed.getText();
  return result;
}

async function runBenchmarkWithProfiler(testId: string, driver: Browser) {
  const perfTracePath = `${perfTraceDir}/${testId}-trace.zip`;
  await driver.execute("mobile: startPerfRecord", {
    profileName: "Time Profiler",
    pid: "current",
    timeout: 2000,
  });

  await runBenchmark(testId, driver);

  const output = (await driver.execute("mobile: stopPerfRecord", {
    profileName: "Time Profiler",
  })) as string;

  let buff = Buffer.from(output, "base64");
  await writeFile(perfTracePath, buff);
  console.log("Performance profile written to", perfTracePath);
}

async function runBenchmarkWithFlameGraph(testId: string, driver: Browser) {
  const perfTracePath = `${perfTraceDir}/${testId}-flamegraph.cpuprofile`;
  const toggleFlamegraphButton = driver.$("~toggleFlamegraph");
  await toggleFlamegraphButton.click();

  await runBenchmark(testId, driver);

  const profileLocationText = driver.$("~profileLocation");
  const path = await profileLocationText.getText();

  console.log(path);

  const libraryPath = path.match(/\/Library\/Caches\/.+\.cpuprofile/g)?.at(0);

  if (!libraryPath) {
    console.log("Skipped writing flamegraph");
  }

  console.log(libraryPath);
  const appPath = `@com.rbckr.TestApp${libraryPath}`;
  console.log(appPath);

  const traceBase64 = await driver.pullFile(appPath);
  let buff = Buffer.from(traceBase64, "base64");
  await writeFile(perfTracePath, buff);
  console.log("Flamegraph written to", perfTracePath);
}

async function runBenchmarkWithWallClockTime(testId: string, driver: Browser) {
  const outputPath = `${perfTraceDir}/${testId}WallClock-ms.txt`;

  const text = await runBenchmark(testId, driver);

  await writeFile(outputPath, text);
  console.log("Benchmark time written to", outputPath);
}

function withDriver(benchmarkAsync: benchmarkAsync) {
  return async (testId: string) => {
    const driver = await remote(wdOpts);
    try {
      await benchmarkAsync(testId, driver);
    } catch (err) {
      throw new Error(`${testId} failed with the following error: ${err}`);
    } finally {
      await driver.deleteSession();
    }
  };
}

export const benchmarkWithWallClockTime = withDriver(
  runBenchmarkWithWallClockTime
);
export const benchmarkWithProfiler = withDriver(runBenchmarkWithProfiler);
export const benchmarkWithFlamegraph = withDriver(runBenchmarkWithFlameGraph);
