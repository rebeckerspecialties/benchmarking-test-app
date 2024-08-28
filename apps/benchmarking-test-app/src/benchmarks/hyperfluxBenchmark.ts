import {
  applyIncomingActions,
  createHyperStore,
  defineAction,
  defineActionQueue,
  dispatchAction,
  matches,
  matchesWithDefault,
} from "@ir-engine/hyperflux";

const ACTION_COUNT = 5000;
const ITERATIONS = 5000;

export const hyperfluxBenchmark = async () => {
  for (let i = 0; i < ITERATIONS; i++) {
    const greet = defineAction({
      type: "TEST_GREETING",
      greeting: matchesWithDefault(matches.string, () => "hi"),
    });
    const goodbye = defineAction({
      type: "TEST_GOODBYE",
      greeting: matchesWithDefault(matches.string, () => "bye"),
    });
    createHyperStore({
      getDispatchTime: () => Date.now(),
    });

    const queue = defineActionQueue([greet.matches, goodbye.matches]);
    for (let j = 0; j < ACTION_COUNT; j++) {
      dispatchAction(goodbye({}));
      dispatchAction(greet({}));
    }

    applyIncomingActions();
    queue();
  }
};
