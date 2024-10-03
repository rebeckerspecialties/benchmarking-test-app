export const screenVertexSize = 4 * 6; // Byte size of one screen vertex.
export const screenPositionOffset = 0;
export const screenUVOffset = 4 * 4;
export const screenVertexCount = 6;

export const screenVertexArray = new Float32Array([
  // float4 position, float2 uv

  1, 1, 0, 1, 1, 0,

  -1, 1, 0, 1, 0, 0,

  -1, -1, 0, 1, 0, 1,

  -1, -1, 0, 1, 0, 1,

  1, -1, 0, 1, 1, 1,

  1, 1, 0, 1, 1, 0,
]);
