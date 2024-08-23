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

async function runTest(testId) {
  const perfTracePath = `${perfTraceDir}/${testId}-trace.zip`;
  const driver = await remote(wdOpts);
  try {
    await driver.execute("mobile: startPerfRecord", {
      profileName: "Time Profiler",
      pid: "current",
      timeout: 2000,
    });
    const benchmark = await driver.$(`~${testId}`);
    await benchmark.click();

    const completed = await driver.$(`~${testIdCompleted}`);

    await completed.waitForDisplayed({ timeout: 20000 });
  } catch (err) {
    console.error(err);
  } finally {
    const output = await driver.execute("mobile: stopPerfRecord", {
      profileName: "Time Profiler",
    });

    let buff = await Buffer.from(output, "base64");
    await writeFile(perfTracePath, buff, (err) => {
      if (err) throw err;
      console.log("Performance profile written to", perfTracePath);
    });

    await driver.deleteSession();
  }
}

module.exports = {
  runTest,
};