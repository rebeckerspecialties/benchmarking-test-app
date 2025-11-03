#!/usr/bin/env node

/**
 * Updates Android runtime flags to match the desired JavaScript engine.
 *
 * Usage: node scripts/set-runtime.js <hermes|jsc>
 */

const fs = require("node:fs");
const path = require("node:path");

const runtime = process.argv[2];
if (!["hermes", "jsc"].includes(runtime)) {
  console.error('Usage: node scripts/set-runtime.js <hermes|jsc>');
  process.exit(1);
}

const gradlePropertiesPath = path.join(
  __dirname,
  "../apps/benchmarking-test-app/android/gradle.properties",
);

let gradleProperties;
try {
  gradleProperties = fs.readFileSync(gradlePropertiesPath, "utf8");
} catch (error) {
  console.error(`Unable to read ${gradlePropertiesPath}: ${error.message}`);
  process.exit(1);
}

/** @param {string} key @param {string} value */
const setProperty = (key, value) => {
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(gradleProperties)) {
    gradleProperties = gradleProperties.replace(regex, `${key}=${value}`);
  } else {
    gradleProperties = `${gradleProperties.trim()}\n${key}=${value}\n`;
  }
};

if (runtime === "hermes") {
  setProperty("hermesEnabled", "true");
  setProperty("useThirdPartyJSC", "false");
} else {
  setProperty("hermesEnabled", "false");
  setProperty("useThirdPartyJSC", "true");
}

try {
  fs.writeFileSync(gradlePropertiesPath, `${gradleProperties.trimEnd()}\n`);
  console.log(
    `Updated ${path.relative(
      process.cwd(),
      gradlePropertiesPath,
    )} for ${runtime.toUpperCase()}.`,
  );
} catch (error) {
  console.error(`Unable to write ${gradlePropertiesPath}: ${error.message}`);
  process.exit(1);
}
