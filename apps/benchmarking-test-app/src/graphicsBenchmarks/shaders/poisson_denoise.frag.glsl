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
layout(set = 2, binding = 0) uniform texture2D normalTexture;
layout(set = 2, binding = 1) uniform texture2D diffuseTexture;
// encode roughness, metallic, emissive power floats
layout(set = 2, binding = 2) uniform texture2D materialTexture;
layout(set = 2, binding = 3) uniform sampler gBufferSamp;

struct Material {
  vec4 diffuse;
  vec3 normal;
  float roughness;
  float metalness;
  vec3 emissive;
};

// loading a material from a packed g-buffer
Material getMaterial(vec2 uv) {
  vec4 diffuse = textureLod(sampler2D(diffuseTexture, gBufferSamp), uv, 0.0);
  vec4 normal = textureLod(sampler2D(normalTexture, gBufferSamp), uv, 0.0);
  vec4 materialProperties = textureLod(sampler2D(materialTexture, gBufferSamp), uv, 0.0);
  float roughness = materialProperties.x;
  float metalness = materialProperties.y;
  float emissivePower = materialProperties.z;
  vec3 emissive = vec3(emissivePower);
  return Material(diffuse, normal.xyz, roughness, metalness, emissive);
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
  Material neighborMat = getMaterial(neighborUv);
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

  mat = getMaterial(vUv);
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
