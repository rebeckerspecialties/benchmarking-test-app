layout(location = 0) in vec4 vDiffuse;
layout(location = 1) in vec3 vNormal;
layout(location = 2) in float vRoughness;
layout(location = 3) in float vMetalness;
layout(location = 4) in vec3 vEmissive;

layout(location = 0) out vec4 outColor;

void main() {
  float emissivePower = (vEmissive.x + vEmissive.y + vEmissive.z) / 3.0;
  outColor = vec4(vRoughness, vMetalness, emissivePower, 0);
}
