#ifdef USE_FOG
varying float vFogDepth;
#endif
varying vec2 vUv;

uniform float near;
uniform float far;

#ifdef USE_LOGDEPTHBUF
varying float vFragDepth;
varying float vIsPerspective;
#endif

bool isPerspectiveMatrix(mat4 m) {
  return m[2][3] == -1.0;
}

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

#ifdef USE_LOGDEPTHBUF
  vFragDepth = 1.0 + gl_Position.w;
  vIsPerspective = float(isPerspectiveMatrix(projectionMatrix));
#endif
      #ifdef USE_FOG
  vFogDepth = (modelViewMatrix * vec4(position, 1.0)).z;
      #endif
}
