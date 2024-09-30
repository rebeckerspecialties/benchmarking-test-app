layout(location = 0) in vec3 position;
layout(location = 0) out vec2 vUv;

// Log depth
layout(location = 1) out float vFragDepth;
layout(location = 2) out float vIsPerspective;

// Fog
layout(location = 3) out float vFogDepth;

layout(binding = 0) uniform vec2 uv;
layout(binding = 1) uniform mat4 projectionMatrix;
layout(binding = 2) uniform mat4 modelViewMatrix;

bool isPerspectiveMatrix(mat4 m) {
  return m[2][3] == -1.0;
}

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

  // Log depth
  vFragDepth = 1.0 + gl_Position.w;
  vIsPerspective = float(isPerspectiveMatrix(projectionMatrix));

  // Fog
  vFogDepth = (modelViewMatrix * vec4(position, 1.0)).z;
}
