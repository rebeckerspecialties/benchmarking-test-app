import { Text } from "react-native";

export const JavaScriptEngineVersion: React.FC = () => {
  if (isHermes()) {
    return <Text testID="EngineVersion">Using Hermes</Text>;
  }
  if (isV8()) {
    return <Text testID="EngineVersion">Using V8</Text>;
  }
  return <Text testID="EngineVersion">Using JavaScriptCore</Text>;
};

const isHermes = () =>
  !!(global as unknown as { HermesInternal: null | object }).HermesInternal;

const isV8 = () =>
  !!(global as unknown as { _v8runtime?: object })._v8runtime;
