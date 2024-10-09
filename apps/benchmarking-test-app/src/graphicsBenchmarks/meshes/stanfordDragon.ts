// from: https://github.com/webgpu/webgpu-samples/blob/1e05ae987e74140db755b6e3c655ea113c896aef/meshes/stanfordDragon.ts
import dragonRawData from "./stanfordDragonData";
import { computeProjectedPlaneUVs, generateNormals } from "./utils";

const { positions, normals, triangles } = generateNormals(
  Math.PI,
  dragonRawData.positions as [number, number, number][],
  dragonRawData.cells as [number, number, number][]
);

const uvs = computeProjectedPlaneUVs(positions, "xy");

// Push indices for an additional ground plane
triangles.push(
  [positions.length, positions.length + 2, positions.length + 1],
  [positions.length, positions.length + 1, positions.length + 3]
);

const colors: [number, number, number][] = triangles.map(() => [0.2, 0.1, 0.4]);
const roughness: [number][] = triangles.map(() => [0.8]);
const metalness: [number][] = triangles.map(() => [0.2]);
const emissives: [number, number, number][] = triangles.map(() => [0, 0, 0]);

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
colors.push([0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, 0.5]);
roughness.push([0], [0], [0], [0]);
metalness.push([1], [1], [1], [1]);
emissives.push([1, 1, 1], [1, 1, 1], [1, 1, 1], [1, 1, 1]);

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
