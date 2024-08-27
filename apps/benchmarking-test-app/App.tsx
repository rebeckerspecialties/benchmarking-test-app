/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import React, { useCallback, useState } from "react";

import { Button, SafeAreaView, StatusBar, Text } from "react-native";
import { Benchmark, simpleBenchmark } from "./src/benchmarks";
import { bitEcsBenchmark } from "./src/benchmarks/bitEcsBenchmark";
import { threeJsBenchmark } from "./src/benchmarks/threeJsBenchmark";
import { JavaScriptEngineVersion } from "./src/JavaScriptEngineVersion";

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
        <Button title={toggleFlamegraphTitle} onPress={toggleFlamegraph} />
        <Benchmark
          name="simpleBenchmark"
          run={simpleBenchmark}
          flamegraphEnabled={flamegraphEnabled}
        />
        <Benchmark
          name="bitEcsBenchmark"
          run={bitEcsBenchmark}
          flamegraphEnabled={flamegraphEnabled}
        />
        <Benchmark
          name="threeJsBenchmark"
          run={threeJsBenchmark}
          flamegraphEnabled={flamegraphEnabled}
        />
      </SafeAreaView>
    </>
  );
};

export default App;
