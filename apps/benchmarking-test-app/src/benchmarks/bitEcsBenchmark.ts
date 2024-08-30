import {
  createWorld,
  defineComponent,
  defineQuery,
  defineSystem,
  addComponent,
  removeComponent,
  addEntity,
  removeEntity,
  Types,
} from "bitecs";

const ENTITY_COUNT = 5000;
const ITERATIONS = 5000;

export const bitEcsBenchmark = async () => {
  await new Promise((resolve) => setTimeout(resolve, 10));
  const world = createWorld();
  const { f32, ui16 } = Types;
  const Vector3 = { x: f32, y: f32, z: f32 };
  const Position = defineComponent(Vector3);
  const Velocity = defineComponent({ ...Vector3, magnitude: ui16 });

  const query = defineQuery([Position, Velocity]);

  const physicsSystem = defineSystem((world) => {
    const entities = query(world);
    for (let i = 0; i < entities.length; i++) {
      const id = entities[i];
      const magnitude = Velocity.magnitude[id];
      Position.x[id] += Velocity.x[id] * magnitude;
      Position.y[id] += Velocity.y[id] * magnitude;
      Position.z[id] += Velocity.z[id] * magnitude;
    }
    return world;
  });

  const entities: number[] = [];
  for (let i = 0; i < ENTITY_COUNT; i++) {
    const id = addEntity(world);
    entities.push(id);
    addComponent(world, Position, id);
    Position.x[id] = 0;
    Position.y[id] = 0;
    Position.z[id] = 0;

    addComponent(world, Velocity, id);
    Velocity.x[id] = Math.sin(i);
    Velocity.y[id] = Math.cos(i);
    Velocity.z[id] = 1;
    Velocity.magnitude[id] = i;
  }

  for (let i = 0; i < ITERATIONS; i++) {
    physicsSystem(world);
  }

  for (let i = 0; i < ENTITY_COUNT; i++) {
    const id = entities[i];
    removeComponent(world, Position, id);
    removeComponent(world, Velocity, id);
    removeEntity(world, id);
  }
};
