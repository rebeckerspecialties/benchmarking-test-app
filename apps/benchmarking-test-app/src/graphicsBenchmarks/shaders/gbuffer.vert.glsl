layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;
layout(location = 2) in vec2 uv;
layout(location = 3) in vec3 color;
layout(location = 4) in float roughness;
layout(location = 5) in float metalness;
layout(location = 6) in vec3 emissive;

layout(location = 0) out vec4 vDiffuse;
layout(location = 1) out vec3 vNormal;
layout(location = 2) out float vRoughness;
layout(location = 3) out float vMetalness;
layout(location = 4) out vec3 vEmissive;

layout(binding = 0) uniform mat4 projectionMatrix;
layout(binding = 1) uniform mat4 modelViewMatrix;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vDiffuse = vec4(color, 1.0);
  vNormal = normalize((vec4(normal, 1.) * modelViewMatrix).xyz);
  vRoughness = roughness;
  vMetalness = metalness;
  vEmissive = vEmissive;
}
