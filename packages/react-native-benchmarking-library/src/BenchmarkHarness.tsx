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
import { Benchmark } from "./Benchmark";
import { JavaScriptEngineVersion } from "./JavaScriptEngineVersion";
import { GraphicsBenchmark } from "./GraphicsBenchmark";

interface BenchmarkDescriptor {
  benchmarkType: "headless" | "graphics";
  title: string;
  benchmarkFn: () => Promise<void>;
}

export const BenchmarkHarness: React.FC<{ items: BenchmarkDescriptor[] }> = ({
  items,
}) => {
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
        {items.map(({ benchmarkType, title, benchmarkFn }) => {
          switch (benchmarkType) {
            case "graphics":
              return <GraphicsBenchmark run={benchmarkFn} name={title} />;
            case "headless":
            default:
              return (
                <Benchmark
                  flamegraphEnabled={flamegraphEnabled}
                  name={title}
                  run={benchmarkFn}
                />
              );
          }
        })}
      </SafeAreaView>
    </>
  );
};
