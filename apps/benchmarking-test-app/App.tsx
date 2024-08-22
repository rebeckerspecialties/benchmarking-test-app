/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import React from "react";

import { SafeAreaView, StatusBar } from "react-native";
import { Benchmark, simpleBenchmark } from "./src/benchmarks";
import { bitEcsBenchmark } from "./src/benchmarks/bitEcsBenchmark";
import { threeJsBenchmark } from "./src/benchmarks/threeJsBenchmark";

const App = () => {
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "white" }}
        accessibilityLabel="benchmarkSafeArea"
      >
        <Benchmark name="simpleBenchmark" run={simpleBenchmark} />
        <Benchmark name="bitEcsBenchmark" run={bitEcsBenchmark} />
        <Benchmark name="threeJsBenchmark" run={threeJsBenchmark} />
      </SafeAreaView>
    </>
  );
};

export default App;
