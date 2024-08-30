import { Text } from "react-native";

export const JavaScriptEngineVersion: React.FC = () => {
  if (isHermes()) {
    return <Text>Using Hermes</Text>;
  }
  return <Text>Using JavaScriptCore</Text>;
};

const isHermes = () =>
  !!(global as unknown as { HermesInternal: null | object }).HermesInternal;
