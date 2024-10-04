// from: https://github.com/pmndrs/postprocessing/blob/main/src/effects/glsl/fxaa.vert
layout(binding = 0) uniform vec2 texelSize;

layout(location = 0) in vec4 position;
layout(location = 1) in vec2 uv;

layout(location = 0) out vec2 vUv;
layout(location = 1) out vec2 vUvDown;
layout(location = 2) out vec2 vUvUp;
layout(location = 3) out vec2 vUvLeft;
layout(location = 4) out vec2 vUvRight;

layout(location = 5) out vec2 vUvDownLeft;
layout(location = 6) out vec2 vUvUpRight;
layout(location = 7) out vec2 vUvUpLeft;
layout(location = 8) out vec2 vUvDownRight;

void main() {
  vUv = uv;

  vUvDown = uv + vec2(0.0, -1.0) * texelSize;
  vUvUp = uv + vec2(0.0, 1.0) * texelSize;
  vUvRight = uv + vec2(1.0, 0.0) * texelSize;
  vUvLeft = uv + vec2(-1.0, 0.0) * texelSize;

  vUvDownLeft = uv + vec2(-1.0, -1.0) * texelSize;
  vUvUpRight = uv + vec2(1.0, 1.0) * texelSize;
  vUvUpLeft = uv + vec2(-1.0, 1.0) * texelSize;
  vUvDownRight = uv + vec2(1.0, -1.0) * texelSize;

  gl_Position = vec4(position.x, position.y, position.z, 1);
}
