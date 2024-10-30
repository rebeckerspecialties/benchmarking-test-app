/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import { SafeAreaView, StatusBar } from "react-native";
import { simpleBenchmark } from "./src/benchmarks";
import { bitEcsBenchmark } from "./src/benchmarks/bitEcsBenchmark";
import { threeJsBenchmark } from "./src/benchmarks/threeJsBenchmark";
import { hyperfluxBenchmark } from "./src/benchmarks/hyperfluxBenchmark";
import { irEcsBenchmark } from "./src/benchmarks/irEcsBenchmark";
import { runHelloTriangle } from "./src/graphicsBenchmarks/HelloTriangle";
import { runSignedDistanceField } from "./src/graphicsBenchmarks/SignedDistanceField";
import { runDragonFxaa } from "./src/graphicsBenchmarks/DragonFxaa";
import { runRayTracer } from "./src/graphicsBenchmarks/RayTracer";
import {
  runScreenSpaceGlobalIllumination,
  runScreenSpaceReflection,
} from "./src/graphicsBenchmarks/ScreenSpaceGlobalIllumination";
import {
  BenchmarkDescriptor,
  BenchmarkHarness,
} from "react-native-benchmarking-library";

const BENCHMARK_MATRIX: BenchmarkDescriptor[] = [
  {
    title: "simpleBenchmark",
    benchmarkType: "headless",
    benchmarkFn: simpleBenchmark,
  },
  {
    title: "bitEcsBenchmark",
    benchmarkType: "headless",
    benchmarkFn: bitEcsBenchmark,
  },
  {
    title: "threeJsBenchmark",
    benchmarkType: "headless",
    benchmarkFn: threeJsBenchmark,
  },
  {
    title: "hyperfluxBenchmark",
    benchmarkType: "headless",
    benchmarkFn: hyperfluxBenchmark,
  },
  {
    title: "irEcsBenchmark",
    benchmarkType: "headless",
    benchmarkFn: irEcsBenchmark,
  },
  {
    title: "triangleWebGpuBenchmark",
    benchmarkType: "graphics",
    benchmarkFn: runHelloTriangle,
  },
  {
    title: "sdfWebGpuBenchmark",
    benchmarkType: "graphics",
    benchmarkFn: runSignedDistanceField,
  },
  {
    title: "dragonFxaaBenchmark",
    benchmarkType: "graphics",
    benchmarkFn: runDragonFxaa,
  },
  {
    title: "ssgiBenchmark",
    benchmarkType: "graphics",
    benchmarkFn: runScreenSpaceGlobalIllumination,
  },
  {
    title: "ssrBenchmark",
    benchmarkType: "graphics",
    benchmarkFn: runScreenSpaceReflection,
  },
  {
    title: "rayTracerBenchmark",
    benchmarkType: "graphics",
    benchmarkFn: runRayTracer,
  },
];

const App = () => {
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "white" }}
        accessibilityLabel="benchmarkSafeArea"
      >
        <BenchmarkHarness items={BENCHMARK_MATRIX} />
      </SafeAreaView>
    </>
  );
};

export default App;
