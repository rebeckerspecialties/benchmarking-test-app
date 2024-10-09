layout(location = 0) in vec4 vDiffuse;
layout(location = 1) in vec3 vNormal;
layout(location = 2) in float vRoughness;
layout(location = 3) in float vMetalness;
layout(location = 4) in vec3 vEmissive;

layout(location = 0) out vec4 outColor;

// start gbuffer_packing
// https://github.com/0beqz/realism-effects/blob/main/src/gbuffer/shader/gbuffer_packing.glsl

struct Material {
  vec4 diffuse;
  vec3 normal;
  float roughness;
  float metalness;
  vec3 emissive;
};

#define ONE_SAFE 0.999999
#define NON_ZERO_OFFSET 0.0001

const float c_precision = 256.0;
const float c_precisionp1 = c_precision + 1.0;

float color2float(vec3 color) {
  color = min(color + NON_ZERO_OFFSET, vec3(ONE_SAFE));

  return floor(color.r * c_precision + 0.5) + floor(color.b * c_precision + 0.5) * c_precisionp1 +
    floor(color.g * c_precision + 0.5) * c_precisionp1 * c_precisionp1;
}

vec2 OctWrap(vec2 v) {
  vec2 w = 1.0 - abs(v.yx);
  if(v.x < 0.0)
    w.x = -w.x;
  if(v.y < 0.0)
    w.y = -w.y;
  return w;
}

vec2 encodeOctWrap(vec3 n) {
  n /= (abs(n.x) + abs(n.y) + abs(n.z));
  n.xy = n.z > 0.0 ? n.xy : OctWrap(n.xy);
  n.xy = n.xy * 0.5 + 0.5;
  return n.xy;
}

float packNormal(vec3 normal) {
  return uintBitsToFloat(packHalf2x16(encodeOctWrap(normal)));
}

vec4 encodeRGBE8(vec3 rgb) {
  vec4 vEncoded;
  float maxComponent = max(max(rgb.r, rgb.g), rgb.b);
  float fExp = ceil(log2(maxComponent));
  vEncoded.rgb = rgb / exp2(fExp);
  vEncoded.a = (fExp + 128.0) / 255.0;
  return vEncoded;
}

float vec4ToFloat(vec4 vec) {
  vec = min(vec + NON_ZERO_OFFSET, vec4(ONE_SAFE));

  uvec4 v = uvec4(vec * 255.0);
  uint value = (v.a << 24u) | (v.b << 16u) | (v.g << 8u) | (v.r);
  return uintBitsToFloat(value);
}

vec4 packGBuffer(vec4 diffuse, vec3 normal, float roughness, float metalness, vec3 emissive) {
  vec4 gBuffer;

  gBuffer.r = vec4ToFloat(diffuse);
  gBuffer.g = packNormal(normal);

  // unfortunately packVec2 results in severe precision loss and artifacts for
  // the first on Metal backends thus we use color2float instead
  gBuffer.b = color2float(vec3(roughness, metalness, 0.));
  gBuffer.a = vec4ToFloat(encodeRGBE8(emissive));

  return gBuffer;
}

// end gbuffer_packing

void main() {
  outColor = packGBuffer(vDiffuse, vNormal, vRoughness, vMetalness, vEmissive);
}
