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

type benchmarkAsync = (
  testId: string,
  driver: Browser,
  skipIfJavaScriptCore: boolean
) => Promise<void>;

async function runBenchmark(
  testId: string,
  driver: Browser,
  skipIfJavaScriptCore: boolean
) {
  const engineVersion = driver.$(`~EngineVersion`);
  await engineVersion.waitForDisplayed({ timeout: 40000 });
  const engineVersionText = await engineVersion.getText();

  if (skipIfJavaScriptCore && engineVersionText === "Using JavaScriptCore") {
    return "-1";
  }

  const benchmark = driver.$(`~${testId}`);
  await benchmark.click();

  const completed = driver.$(`~${testId}Completed`);

  await completed.waitForDisplayed({ timeout: 40000 });
  const result = await completed.getText();
  return result;
}

async function runBenchmarkWithProfiler(
  profileName: string,
  testId: string,
  driver: Browser,
  skipIfJavaScriptCore: boolean
) {
  const perfTracePath = `${perfTraceDir}/${testId}-trace.zip`;
  try {
    await driver.execute("mobile: startPerfRecord", {
      profileName,
      pid: "current",
      timeout: 1000,
    });

    await runBenchmark(testId, driver, skipIfJavaScriptCore);

    const output = (await driver.execute("mobile: stopPerfRecord", {
      profileName,
    })) as string;

    let buff = Buffer.from(output, "base64");
    await writeFile(perfTracePath, buff);
    console.log("Performance profile written to", perfTracePath);
  } catch (err) {
    console.error(err);
  }
}

async function runBenchmarkWithFlameGraph(
  testId: string,
  driver: Browser,
  skipIfJavaScriptCore: boolean
) {
  const perfTracePath = `${perfTraceDir}/${testId}-flamegraph.cpuprofile`;
  const toggleFlamegraphButton = driver.$("~toggleFlamegraph");
  await toggleFlamegraphButton.click();

  let result = await runBenchmark(testId, driver, skipIfJavaScriptCore);

  if (parseInt(result) === -1) {
    console.log("Skipped writing flamegraph");
    return;
  }

  const profileLocationText = driver.$("~profileLocation");
  const path = await profileLocationText.getText();

  const libraryPath = path.match(/\/Library\/Caches\/.+\.cpuprofile/g)?.at(0);

  if (!libraryPath) {
    console.log("Skipped writing flamegraph");
    return;
  }

  const appPath = `@com.rbckr.TestApp${libraryPath}`;
  console.log("Searching for artifact at:", libraryPath);

  const traceBase64 = await driver.pullFile(appPath).catch(() => undefined);
  if (!traceBase64) {
    console.log("Failed to find trace at:", libraryPath);
    return;
  }

  let buff = Buffer.from(traceBase64, "base64");
  await writeFile(perfTracePath, buff);
  console.log("Flamegraph written to", perfTracePath);
}

async function runBenchmarkWithWallClockTime(
  testId: string,
  driver: Browser,
  skipIfJavaScriptCore: boolean
) {
  const outputPath = `${perfTraceDir}/${testId}WallClock-ms.txt`;

  const text = await runBenchmark(testId, driver, skipIfJavaScriptCore);

  await writeFile(outputPath, text);
  console.log("Benchmark time written to", outputPath);
}

function withDriver(benchmarkAsync: benchmarkAsync) {
  return async (testId: string, skipIfJavaScriptCore = false) => {
    const driver = await remote(wdOpts);
    try {
      await benchmarkAsync(testId, driver, skipIfJavaScriptCore);
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
export const benchmarkWithProfiler = withDriver(
  runBenchmarkWithProfiler.bind(null, "Time Profiler")
);
export const benchmarkWithMemoryProfiler = withDriver(
  runBenchmarkWithProfiler.bind(null, "Allocations")
);
export const benchmarkWithFlamegraph = withDriver(runBenchmarkWithFlameGraph);
