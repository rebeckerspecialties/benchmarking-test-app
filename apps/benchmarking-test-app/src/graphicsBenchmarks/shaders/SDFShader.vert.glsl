varying vec2 vUv;
uniform float near;
uniform float far;

// Log depth
varying float vFragDepth;
varying float vIsPerspective;

// Fog
varying float vFogDepth;

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
