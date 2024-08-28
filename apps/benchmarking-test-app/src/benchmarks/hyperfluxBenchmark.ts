import {
  applyIncomingActions,
  createHyperStore,
  defineAction,
  defineActionQueue,
  defineState,
  dispatchAction,
  getMutableState,
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
    const HospitalityState = defineState({
      name: "test.hospitality",

      initial: () => ({
        greetingCount: 0,
        firstGreeting: null as string | null,
      }),

      receptors: {
        onGreet: greet.receive((action) => {
          const state = getMutableState(HospitalityState);
          state.greetingCount.set((v) => v + 1);
          if (!state.firstGreeting.value)
            state.firstGreeting.set(action.greeting);
        }),
        onGoodbye: goodbye.receive((action) => {
          const state = getMutableState(HospitalityState);
          state.greetingCount.set((v) => v - 1);
          if (!state.firstGreeting.value)
            state.firstGreeting.set(action.greeting);
        }),
      },
    });

    createHyperStore({
      getDispatchTime: () => Date.now(),
    });

    const queue = defineActionQueue([greet.matches, goodbye.matches]);
    for (let j = 0; j < ACTION_COUNT; j++) {
      dispatchAction(greet({}));
      dispatchAction(goodbye({}));
    }

    applyIncomingActions();
    queue();
  }
};
