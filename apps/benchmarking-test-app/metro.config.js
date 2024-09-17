const { makeMetroConfig } = require("@rnx-kit/metro-config");
const path = require("path");
const threePackagePath = path.resolve(__dirname, "../../node_modules/three");

module.exports = makeMetroConfig({
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: false,
      },
    }),
  },
  resolver: {
    extraNodeModules: {
      perf_hooks: path.resolve(__dirname + "../../../packages/perf_hooks"),
      three: threePackagePath,
    },
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === "three") {
        return {
          filePath: path.resolve(threePackagePath, "build/three.webgpu.js"),
          type: "sourceFile",
        };
      }
      // Let Metro handle other modules
      return context.resolveRequest(context, moduleName, platform);
    },
  },
});
