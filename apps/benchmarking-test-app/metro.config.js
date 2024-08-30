const { makeMetroConfig } = require("@rnx-kit/metro-config");
const path = require("path");
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
    },
  },
});
