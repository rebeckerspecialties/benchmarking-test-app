layout(location = 0) in vec2 vUv;
layout(location = 0) out vec4 outputColor;

layout(set = 0, binding = 0) uniform texture2D inputTexture;
layout(set = 0, binding = 1) uniform texture2D depthTexture;
layout(set = 0, binding = 2) uniform sampler samp;

layout(set = 1, binding = 0) uniform float radius;
layout(set = 1, binding = 1) uniform float phi;
layout(set = 1, binding = 2) uniform float lumaPhi;
layout(set = 1, binding = 3) uniform float depthPhi;
layout(set = 1, binding = 4) uniform float normalPhi;
layout(set = 1, binding = 5) uniform float roughnessPhi;
layout(set = 1, binding = 6) uniform float specularPhi;
layout(set = 1, binding = 7) uniform vec2 resolution;

#define PI 3.1415926535897932384626433832795

// pseudorandom function, stand-in for true noise function
float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

vec4 blueNoise(vec2 co) {
  return vec4(rand(co), rand(co), rand(co), rand(co));
}

// #include <common>
// start gbuffer_packing
// https://github.com/0beqz/realism-effects/blob/main/src/gbuffer/shader/gbuffer_packing.glsl
layout(set = 2, binding = 0) uniform texture2D gBufferTexture;
layout(set = 2, binding = 1) uniform sampler gBufferSamp;

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

vec3 float2color(float value) {
  vec3 color;
  color.r = mod(value, c_precisionp1) / c_precision;
  color.b = mod(floor(value / c_precisionp1), c_precisionp1) / c_precision;
  color.g = floor(value / (c_precisionp1 * c_precisionp1)) / c_precision;

  color -= NON_ZERO_OFFSET;
  color = max(color, vec3(0.0));

  return color;
}

vec3 decodeOctWrap(vec2 f) {
  f = f * 2.0 - 1.0;
  vec3 n = vec3(f.x, f.y, 1.0 - abs(f.x) - abs(f.y));
  float t = max(-n.z, 0.0);
  n.x += n.x >= 0.0 ? -t : t;
  n.y += n.y >= 0.0 ? -t : t;
  return normalize(n);
}

vec3 unpackNormal(float packedNormal) {
  return decodeOctWrap(unpackHalf2x16(floatBitsToUint(packedNormal)));
}

vec3 decodeRGBE8(vec4 rgbe) {
  vec3 vDecoded;
  float fExp = rgbe.a * 255.0 - 128.0;
  vDecoded = rgbe.rgb * exp2(fExp);
  return vDecoded;
}

vec4 floatToVec4(float f) {
  uint value = floatBitsToUint(f);

  vec4 v;
  v.r = float(value & 0xFFu) / 255.0;
  v.g = float((value >> 8u) & 0xFFu) / 255.0;
  v.b = float((value >> 16u) & 0xFFu) / 255.0;
  v.a = float((value >> 24u) & 0xFFu) / 255.0;

  v -= NON_ZERO_OFFSET;
  v = max(v, vec4(0.0));

  return v;
}

// loading a material from a packed g-buffer
Material getMaterial(texture2D gBufferTexture, vec2 uv) {
  vec4 gBuffer = textureLod(sampler2D(gBufferTexture, gBufferSamp), uv, 0.0);

  vec4 diffuse = floatToVec4(gBuffer.r);
  vec3 normal = unpackNormal(gBuffer.g);

  // using float2color instead of unpackVec2 as the latter results in severe
  // precision loss and artifacts on Metal backends
  vec3 roughnessMetalness = float2color(gBuffer.b);
  float roughness = roughnessMetalness.r;
  float metalness = roughnessMetalness.g;

  vec3 emissive = decodeRGBE8(floatToVec4(gBuffer.a));

  return Material(diffuse, normal, roughness, metalness, emissive);
}
// end gbuffer_packing

#define luminance(a) pow(dot(vec3(0.2125, 0.7154, 0.0721), a), 0.125)
#define inputTexture2 inputTexture

Material mat;
vec3 normal;
float depth;
float glossiness;
float specularFactor;

struct InputTexel {
  vec3 rgb;
  float a;
  float luminance;
  float w;
  float totalWeight;
  bool isSpecular;
};

void toDenoiseSpace(inout vec3 color) {
  color = log(color + 1.);
}
void toLinearSpace(inout vec3 color) {
  color = exp(color) - 1.;
}

float getBasicNeighborWeight(inout vec2 neighborUv) {
  Material neighborMat = getMaterial(gBufferTexture, neighborUv);
  vec3 neighborNormal = neighborMat.normal;
  float neighborDepth = textureLod(sampler2D(depthTexture, samp), neighborUv, 0.0).r;

  if(neighborDepth == 1.0)
    return 0.;

  float normalDiff = 1. - max(dot(normal, neighborNormal), 0.);
  float depthDiff = 10000. * abs(depth - neighborDepth);

  float roughnessDiff = abs(mat.roughness - neighborMat.roughness);

  float wBasic = exp(-normalDiff * normalPhi - depthDiff * depthPhi - roughnessDiff * roughnessPhi);

  return wBasic;
}

vec3 getNormal(Material mat) {
  return mat.normal;
}

#define SQRT_2 1.41421356237

vec2 POISSON[8] = vec2[](vec2(-1.0, 0.0), vec2(0.0, -1.0), vec2(1.0, 0.0), vec2(0.0, 1.0), vec2(-0.25 * SQRT_2, -0.25 * SQRT_2), vec2(0.25 * SQRT_2, -0.25 * SQRT_2), vec2(0.25 * SQRT_2, 0.25 * SQRT_2), vec2(-0.25 * SQRT_2, 0.25 * SQRT_2));

void outputTexel(InputTexel inp) {
  inp.rgb /= inp.totalWeight;

  outputColor.rgb = inp.rgb;
  toLinearSpace(outputColor.rgb);
  outputColor.a = inp.a;
}

void applyWeight(inout InputTexel inp, vec2 neighborUv, float wBasic) {
  float w = wBasic;

  vec4 t;
  if(inp.isSpecular) {
    t = textureLod(sampler2D(inputTexture2, samp), neighborUv, 0.);
    w *= specularFactor;
  } else {
    t = textureLod(sampler2D(inputTexture, samp), neighborUv, 0.);
  }
  toDenoiseSpace(t.rgb);

  float disocclW = pow(w, 0.1);
  float lumaDiff = abs(inp.luminance - luminance(t.rgb));
  lumaDiff = min(lumaDiff, 0.5);
  float lumaFactor = exp(-lumaDiff * lumaPhi);
  w = mix(w * lumaFactor, disocclW, inp.w) * inp.w;

  w *= step(0.0001, w);

  inp.rgb += w * t.rgb;
  inp.totalWeight += w;
}

void main() {
  depth = textureLod(sampler2D(depthTexture, samp), vUv, 0.).r;

  if(depth == 1.0 && fwidth(depth) == 0.) {
    discard;
    return;
  }

  InputTexel input;

  float maxAlpha = 0.;

  vec4 t;

  t = textureLod(sampler2D(inputTexture, samp), vUv, 0.);

  // check: https://www.desmos.com/calculator/isdut5hmdm for graphs
  float age = 1. / pow(t.a + 1., 1.2 * phi);

  // the color becomes darker over time possibly due to precision issues, so we brighten it a bit
  t.rgb *= 1.0003;

  toDenoiseSpace(t.rgb);
  InputTexel inp = InputTexel(t.rgb, t.a, luminance(t.rgb), age, 1., false);
  maxAlpha = max(maxAlpha, inp.a);

  input = inp;

  mat = getMaterial(gBufferTexture, vUv);
  normal = getNormal(mat);
  glossiness = max(0., 4. * (1. - mat.roughness / 0.25));
  specularFactor = exp(-glossiness * specularPhi);

  float flatness = 1. - min(length(fwidth(normal)), 1.);
  flatness = pow(flatness, 2.) * 0.75 + 0.25;

  // float roughnessRadius = mix(sqrt(mat.roughness), 1., 0.5 * (1. - mat.metalness));

  vec4 random = blueNoise(vUv);
  float r = radius;

  // rotate the poisson disk
  float angle = random.r * 2. * PI;
  float s = sin(angle), c = cos(angle);
  mat2 rm = r * flatness * mat2(c, -s, s, c);

  for(int i = 0; i < 8; i++) {
    {
      vec2 offset = POISSON[i];

      vec2 neighborUv = vUv + rm * (offset / resolution);

      float wBasic = getBasicNeighborWeight(neighborUv);

      applyWeight(input, neighborUv, wBasic);
    }
  }

  outputTexel(input);
}
