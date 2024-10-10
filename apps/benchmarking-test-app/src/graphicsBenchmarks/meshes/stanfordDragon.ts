// from: https://github.com/webgpu/webgpu-samples/blob/1e05ae987e74140db755b6e3c655ea113c896aef/meshes/stanfordDragon.ts
import dragonRawData from "./stanfordDragonData";
import { computeProjectedPlaneUVs, generateNormals } from "./utils";

const { positions, normals, triangles } = generateNormals(
  Math.PI,
  dragonRawData.positions as [number, number, number][],
  dragonRawData.cells as [number, number, number][]
);

const uvs = computeProjectedPlaneUVs(positions, "xy");

const colors: [number, number, number][] = positions.map(() => [
  0.2 + Math.random() / 10,
  0.1 + Math.random() / 10,
  0.4 + Math.random() / 10,
]);
const roughness: [number][] = positions.map(() => [0.8]);
const metalness: [number][] = positions.map(() => [0.1]);
const emissives: [number, number, number][] = positions.map(() => [0, 0, 0]);

// Push indices for an additional ground plane
triangles.push(
  [positions.length, positions.length + 2, positions.length + 1],
  [positions.length, positions.length + 1, positions.length + 3]
);

// Push vertex attributes for an additional ground plane
// prettier-ignore
positions.push(
  [-100, 20, -100], //
  [ 100, 20,  100], //
  [-100, 20,  100], //
  [ 100, 20, -100]
);
normals.push(
  [0, 1, 0], //
  [0, 1, 0], //
  [0, 1, 0], //
  [0, 1, 0]
);
uvs.push(
  [0, 0], //
  [1, 1], //
  [0, 1], //
  [1, 0]
);
colors.push([0.3, 0.3, 0.3], [0.3, 0.3, 0.3], [0.3, 0.3, 0.3], [0.3, 0.3, 0.3]);
roughness.push([0.2], [0.2], [0.2], [0.2]);
metalness.push([0.8], [0.8], [0.8], [0.8]);
emissives.push([0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]);

export const mesh = {
  positions,
  triangles,
  normals,
  uvs,
  colors,
  roughness,
  metalness,
  emissives,
};
