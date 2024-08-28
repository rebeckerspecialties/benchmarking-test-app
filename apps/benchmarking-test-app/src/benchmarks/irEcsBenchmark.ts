import {
  AnimationSystemGroup,
  createEngine,
  createEntity,
  defineComponent,
  defineQuery,
  defineSystem,
  destroyEngine,
  Entity,
  executeSystems,
  hasComponent,
  removeComponent,
  setComponent,
} from "@ir-engine/ecs";

const ITERATIONS = 50000;

const mockDeltaMillis = 1000 / 60;

export const irEcsBenchmark = async () => {
  await new Promise((resolve) => setTimeout(resolve, 10));

  const MockComponent = setup();

  createEngine();

  const entity = createEntity();

  for (let i = 0; i < ITERATIONS; i++) {
    setComponent(entity, MockComponent, { mockValue: i });
    hasComponent(entity, MockComponent);
    executeSystems(mockDeltaMillis);

    removeComponent(entity, MockComponent);
    hasComponent(entity, MockComponent);
    executeSystems(mockDeltaMillis);
  }

  destroyEngine();
};

const setup = () => {
  const MockComponent = defineComponent({
    name: "MockComponent",
    onInit: (entity) => {
      return {
        mockValue: 0,
      };
    },
    schema: {},
    onSet: (entity, component, json: { mockValue: number } | undefined) => {
      if (typeof json?.mockValue === "number")
        component.mockValue.set(json.mockValue);
    },
    toJSON: (entity, component) => {
      return {
        mockValue: component.mockValue.value,
      };
    },
  });

  const MockSystemState = new Set<Entity>();

  const mockQuery = defineQuery([MockComponent]);

  const execute = () => {
    for (const entity of mockQuery.enter()) {
      MockSystemState.add(entity);
    }

    for (const entity of mockQuery.exit()) {
      MockSystemState.delete(entity);
    }
  };

  defineSystem({
    uuid: "MockSystem",
    insert: { with: AnimationSystemGroup },
    execute,
  });

  return MockComponent;
};
