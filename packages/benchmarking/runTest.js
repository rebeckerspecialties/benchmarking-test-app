const { remote } = require("webdriverio");
const { writeFile } = require("fs");

const capabilities = {
  platformName: "iOS",
  "appium:automationName": "XCUITest",
};

const wdOpts = {
  hostname: process.env.APPIUM_HOST || "0.0.0.0",
  port: parseInt(process.env.APPIUM_PORT, 10) || 4723,
  path: "/wd/hub",
  logLevel: "info",
  capabilities,
};

const perfTraceDir = process.env.DEVICEFARM_LOG_DIR ?? ".";

async function runBenchmark(testId, driver) {
  const benchmark = await driver.$(`~${testId}`);
  await benchmark.click();

  const completed = await driver.$(`~${testId}Completed`);

  await completed.waitForDisplayed({ timeout: 20000 });
  const result = await completed.getText();
  return result;
}

async function runBenchmarkWithProfiler(testId, driver) {
  const perfTracePath = `${perfTraceDir}/${testId}-trace.zip`;
  await driver.execute("mobile: startPerfRecord", {
    profileName: "Time Profiler",
    pid: "current",
    timeout: 2000,
  });

  await runBenchmark(testId, driver);

  const output = await driver.execute("mobile: stopPerfRecord", {
    profileName: "Time Profiler",
  });

  let buff = await Buffer.from(output, "base64");
  await writeFile(perfTracePath, buff, (err) => {
    if (err) throw err;
    console.log("Performance profile written to", perfTracePath);
  });
}

async function runBenchmarkWithWallClockTime(testId, driver) {
  const outputPath = `${perfTraceDir}/${testId}-clock.txt`;

  const text = await runBenchmark(testId, driver);

  await writeFile(outputPath, text, (err) => {
    if (err) throw err;
    console.log("Performance profile written to", outputPath);
  });
}

function withDriver(benchmarkAsync) {
  return async (testId) => {
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

module.exports = {
  runBenchmarkWithWallClockTime: withDriver(runBenchmarkWithWallClockTime),
  runBenchmarkWithProfiler: withDriver(runBenchmarkWithProfiler),
};
