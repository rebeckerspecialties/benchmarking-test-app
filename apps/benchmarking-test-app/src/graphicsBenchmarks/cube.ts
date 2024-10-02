export const cubeVertexSize = 4 * 6; // Byte size of one cube vertex.
export const cubePositionOffset = 0;
export const cubeUVOffset = 4 * 4;
export const cubeVertexCount = 36;

export const cubeVertexArray = new Float32Array([
  // float4 position, float2 uv
  // face 1
  1, -1, 1, 1, 0, 1,

  -1, -1, 1, 1, 1, 1,

  -1, -1, -1, 1, 1, 0,

  1, -1, -1, 1, 0, 0,

  1, -1, 1, 1, 0, 1,

  -1, -1, -1, 1, 1, 0,

  // face 2

  1, 1, 1, 1, 0, 1,

  1, -1, 1, 1, 1, 1,

  1, -1, -1, 1, 1, 0,

  1, 1, -1, 1, 0, 0,

  1, 1, 1, 1, 0, 1,

  1, -1, -1, 1, 1, 0,

  // face 3

  -1, 1, 1, 1, 0, 1,

  1, 1, 1, 1, 1, 1,

  1, 1, -1, 1, 1, 0,

  -1, 1, -1, 1, 0, 0,

  -1, 1, 1, 1, 0, 1,

  1, 1, -1, 1, 1, 0,

  // face 4

  -1, -1, 1, 1, 0, 1,

  -1, 1, 1, 1, 1, 1,

  -1, 1, -1, 1, 1, 0,

  -1, -1, -1, 1, 0, 0,

  -1, -1, 1, 1, 0, 1,

  -1, 1, -1, 1, 1, 0,

  // face 5

  1, 1, 1, 1, 0, 1,

  -1, 1, 1, 1, 1, 1,

  -1, -1, 1, 1, 1, 0,

  -1, -1, 1, 1, 1, 0,

  1, -1, 1, 1, 0, 0,

  1, 1, 1, 1, 0, 1,

  // face 6

  1, -1, -1, 1, 0, 1,

  -1, -1, -1, 1, 1, 1,

  -1, 1, -1, 1, 1, 0,

  1, 1, -1, 1, 0, 0,

  1, -1, -1, 1, 0, 1,

  -1, 1, -1, 1, 1, 0,
]);