/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import { useCallback, useState } from "react";

import { Button, SafeAreaView, StatusBar } from "react-native";
import { Benchmark, simpleBenchmark } from "./src/benchmarks";
import { bitEcsBenchmark } from "./src/benchmarks/bitEcsBenchmark";
import { threeJsBenchmark } from "./src/benchmarks/threeJsBenchmark";
import { JavaScriptEngineVersion } from "./src/JavaScriptEngineVersion";
import { hyperfluxBenchmark } from "./src/benchmarks/hyperfluxBenchmark";
import { irEcsBenchmark } from "./src/benchmarks/irEcsBenchmark";
import { runHelloTriangle } from "./src/graphicsBenchmarks/HelloTriangle";
import { GraphicsBenchmark } from "./src/graphicsBenchmarks/GraphicsBenchmark";
import { runTriangleFxaa } from "./src/graphicsBenchmarks/TriangleFxaa";

const App = () => {
  const [flamegraphEnabled, setFlamegraphEnabled] = useState(false);

  const toggleFlamegraph = useCallback(() => {
    setFlamegraphEnabled((enabled) => !enabled);
  }, []);

  const toggleFlamegraphTitle = flamegraphEnabled
    ? "Disable Flamegraph"
    : "Enable Flamegraph";

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "white" }}
        accessibilityLabel="benchmarkSafeArea"
      >
        <JavaScriptEngineVersion />
        <Button
          testID="toggleFlamegraph"
          title={toggleFlamegraphTitle}
          onPress={toggleFlamegraph}
        />
        <Benchmark
          flamegraphEnabled={flamegraphEnabled}
          name="simpleBenchmark"
          run={simpleBenchmark}
        />
        <Benchmark
          flamegraphEnabled={flamegraphEnabled}
          name="bitEcsBenchmark"
          run={bitEcsBenchmark}
        />
        <Benchmark
          flamegraphEnabled={flamegraphEnabled}
          name="threeJsBenchmark"
          run={threeJsBenchmark}
        />
        <Benchmark
          flamegraphEnabled={flamegraphEnabled}
          name="hyperfluxBenchmark"
          run={hyperfluxBenchmark}
        />
        <Benchmark
          flamegraphEnabled={flamegraphEnabled}
          name="irEcsBenchmark"
          run={irEcsBenchmark}
        />
        <GraphicsBenchmark
          run={runHelloTriangle}
          name="triangleWebGpuBenchmark"
        />
        <GraphicsBenchmark run={runTriangleFxaa} name="triangleFxaaBenchmark" />
      </SafeAreaView>
    </>
  );
};

export default App;
