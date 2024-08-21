/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import React, {
  FunctionComponent,
  useEffect,
  useCallback,
  useState,
} from "react";

import { SafeAreaView, View, Button, ViewProps, StatusBar } from "react-native";

import { EngineView, useEngine } from "@babylonjs/react-native";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import "@babylonjs/loaders/glTF";

const EngineScreen: FunctionComponent<ViewProps> = (props: ViewProps) => {
  const engine = useEngine();
  const [camera, setCamera] = useState<Camera>();

  // Taken from https://github.com/BabylonJS/BabylonReactNativeSample/blob/main/App.tsx
  useEffect(() => {
    if (engine) {
      const url =
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoxAnimated/glTF/BoxAnimated.gltf";
      SceneLoader.LoadAsync(url, undefined, engine).then((loadScene) => {
        loadScene.createDefaultCameraOrLight(true, undefined, true);
        (loadScene.activeCamera as ArcRotateCamera).alpha += Math.PI;
        (loadScene.activeCamera as ArcRotateCamera).radius = 10;
        setCamera(loadScene.activeCamera!);
      });
    }
  }, [engine]);

  return (
    <>
      <View style={props.style}>
        <View style={{ flex: 1 }}>
          <EngineView camera={camera} displayFrameRate={true} />
        </View>
      </View>
    </>
  );
};

const App = () => {
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
        <EngineScreen style={{ flex: 1 }} />
      </SafeAreaView>
    </>
  );
};

export default App;