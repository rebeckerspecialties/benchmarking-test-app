// @ts-check
const { createRunOncePlugin, withDangerousMod } = require("@expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

const PLUGIN_NAME = "benchmarking-test-app-jsc-android";

const MAIN_REACT_NATIVE_HOST_PATH = [
  "android",
  "app",
  "src",
  "reacthost-0.76",
  "java",
  "com",
  "microsoft",
  "reacttetapp",
  "react",
  "MainReactNativeHost.kt",
];

const TEST_APP_PATH = [
  "android",
  "app",
  "src",
  "reactapplication-0.76",
  "java",
  "com",
  "microsoft",
  "reacttestapp",
  "TestApp.kt",
];

/**
 * @param {string} contents
 */
function patchMainReactNativeHost(contents) {
  if (contents.includes("JSCExecutorFactory(")) {
    return contents;
  }

  let updated = contents.replace(
    "import com.facebook.hermes.reactexecutor.HermesExecutorFactory",
    [
      "import com.facebook.hermes.reactexecutor.HermesExecutorFactory",
      "import com.facebook.react.modules.systeminfo.AndroidInfoHelpers",
      "import io.github.reactnativecommunity.javascriptcore.JSCExecutorFactory",
    ].join("\n"),
  );

  updated = updated.replace(
    /override fun getJavaScriptExecutorFactory\(\): JavaScriptExecutorFactory = HermesExecutorFactory\(\)/,
    [
      "override fun getJavaScriptExecutorFactory(): JavaScriptExecutorFactory =",
      "        if (BuildConfig.REACTAPP_USE_HERMES) {",
      "            HermesExecutorFactory()",
      "        } else {",
      "            JSCExecutorFactory(",
      "                application.packageName,",
      "                AndroidInfoHelpers.getFriendlyDeviceName()",
      "            )",
      "        }",
    ].join("\n"),
  );

  return updated;
}

/**
 * @param {string} contents
 */
function patchTestApp(contents) {
  if (contents.includes("JSCRuntimeFactory()")) {
    return contents;
  }

  let updated = contents.replace(
    "import com.facebook.react.ReactHost",
    [
      "import com.facebook.react.ReactHost",
      "import io.github.reactnativecommunity.javascriptcore.JSCRuntimeFactory",
    ].join("\n"),
  );

  updated = updated.replace(
    /override val reactHost: ReactHost\s*get\(\) = getDefaultReactHost\(this\.applicationContext, reactNativeHost\)/,
    [
      "override val reactHost: ReactHost",
      "        get() =",
      "            if (BuildConfig.REACTAPP_USE_HERMES) {",
      "                getDefaultReactHost(this.applicationContext, reactNativeHost)",
      "            } else {",
      "                getDefaultReactHost(",
      "                    this.applicationContext,",
      "                    reactNativeHost,",
      "                    JSCRuntimeFactory()",
      "                )",
      "            }",
    ].join("\n"),
  );

  return updated;
}

/**
 * @param {import("@expo/config-plugins").ExportedConfig} config
 */
function withJscAndroid(config) {
  return withDangerousMod(config, ["android", (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const rntaRoot = path.dirname(
      require.resolve("react-native-test-app/package.json", { paths: [projectRoot] }),
    );

    const mainReactNativeHost = path.join(rntaRoot, ...MAIN_REACT_NATIVE_HOST_PATH);
    if (fs.existsSync(mainReactNativeHost)) {
      const original = fs.readFileSync(mainReactNativeHost, { encoding: "utf8" });
      const patched = patchMainReactNativeHost(original);
      if (patched !== original) {
        fs.writeFileSync(mainReactNativeHost, patched);
      }
    } else {
      console.warn(
        `[${PLUGIN_NAME}] Unable to locate MainReactNativeHost.kt at ${mainReactNativeHost}`,
      );
    }

    const testAppPath = path.join(rntaRoot, ...TEST_APP_PATH);
    if (fs.existsSync(testAppPath)) {
      const original = fs.readFileSync(testAppPath, { encoding: "utf8" });
      const patched = patchTestApp(original);
      if (patched !== original) {
        fs.writeFileSync(testAppPath, patched);
      }
    } else {
      console.warn(`[${PLUGIN_NAME}] Unable to locate TestApp.kt at ${testAppPath}`);
    }

    return config;
  }]);
}

module.exports = createRunOncePlugin(withJscAndroid, PLUGIN_NAME, "1.0.0");
