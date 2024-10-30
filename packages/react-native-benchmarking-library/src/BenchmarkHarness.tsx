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

import { Button, View } from "react-native";
import { Benchmark } from "./Benchmark";
import { JavaScriptEngineVersion } from "./JavaScriptEngineVersion";
import { GraphicsBenchmark } from "./GraphicsBenchmark";
import { graphicsBenchmarkFn } from "./WebGpuBenchmark";

export type BenchmarkDescriptor =
  | {
      benchmarkType: "headless";
      title: string;
      benchmarkFn: () => Promise<void>;
    }
  | {
      benchmarkType: "graphics";
      title: string;
      benchmarkFn: graphicsBenchmarkFn;
    };

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
      <View
        style={{ flex: 1, backgroundColor: "white" }}
        accessibilityLabel="benchmarkView"
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
              return (
                <GraphicsBenchmark run={benchmarkFn} name={title} key={title} />
              );
            case "headless":
            default:
              return (
                <Benchmark
                  flamegraphEnabled={flamegraphEnabled}
                  name={title}
                  run={benchmarkFn}
                  key={title}
                />
              );
          }
        })}
      </View>
    </>
  );
};
