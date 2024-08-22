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

import { SafeAreaView, Button, StatusBar } from "react-native";
import { Benchmark, simpleBenchmark } from "./src/benchmarks";

const App = () => {
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
        <Benchmark name="simpleBenchmark" run={simpleBenchmark} />
      </SafeAreaView>
    </>
  );
};

export default App;
