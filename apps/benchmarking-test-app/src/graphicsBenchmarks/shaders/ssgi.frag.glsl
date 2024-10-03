// https://github.com/0beqz/realism-effects/blob/main/src/ssgi/shader/ssgi.frag
varying vec2 vUv;

uniform sampler2D accumulatedTexture;
uniform highp sampler2D depthTexture;
uniform highp sampler2D velocityTexture;
uniform sampler2D directLightTexture;
uniform vec3 backgroundColor;

uniform mat4 projectionMatrix;
uniform mat4 projectionMatrixInverse;
uniform mat4 cameraMatrixWorld;

uniform float maxEnvMapMipLevel;

uniform float rayDistance;
uniform float thickness;
uniform float envBlur;

uniform vec2 resolution;

uniform float cameraNear;
uniform float cameraFar;
uniform float nearMinusFar;
uniform float nearMulFar;
uniform float farMinusNear;

struct EquirectHdrInfo {
  sampler2D marginalWeights;
  sampler2D conditionalWeights;
  sampler2D map;
  vec2 size;
  float totalSumWhole;
  float totalSumDecimal;
};

uniform EquirectHdrInfo envMapInfo;

#define INVALID_RAY_COORDS vec2(-1.0);
#define EPSILON 0.00001
#define ONE_MINUS_EPSILON 1.0 - EPSILON

vec2 invTexSize;

#define MODE_SSGI 0
#define MODE_SSR 1

// #include <packing>

// helper functions

// start gbuffer_packing
// https://github.com/0beqz/realism-effects/blob/main/src/gbuffer/shader/gbuffer_packing.glsl
uniform highp sampler2D gBufferTexture;

struct Material {
  highp vec4 diffuse;
  highp vec3 normal;
  highp float roughness;
  highp float metalness;
  highp vec3 emissive;
};

#define ONE_SAFE 0.999999
#define NON_ZERO_OFFSET 0.0001

const highp float c_precision = 256.0;
const highp float c_precisionp1 = c_precision + 1.0;

highp float color2float(in highp vec3 color) {
  color = min(color + NON_ZERO_OFFSET, vec3(ONE_SAFE));

  return floor(color.r * c_precision + 0.5) + floor(color.b * c_precision + 0.5) * c_precisionp1 +
    floor(color.g * c_precision + 0.5) * c_precisionp1 * c_precisionp1;
}

highp vec3 float2color(in highp float value) {
  highp vec3 color;
  color.r = mod(value, c_precisionp1) / c_precision;
  color.b = mod(floor(value / c_precisionp1), c_precisionp1) / c_precision;
  color.g = floor(value / (c_precisionp1 * c_precisionp1)) / c_precision;

  color -= NON_ZERO_OFFSET;
  color = max(color, vec3(0.0));

  return color;
}

highp vec2 OctWrap(highp vec2 v) {
  highp vec2 w = 1.0 - abs(v.yx);
  if(v.x < 0.0)
    w.x = -w.x;
  if(v.y < 0.0)
    w.y = -w.y;
  return w;
}

highp vec2 encodeOctWrap(highp vec3 n) {
  n /= (abs(n.x) + abs(n.y) + abs(n.z));
  n.xy = n.z > 0.0 ? n.xy : OctWrap(n.xy);
  n.xy = n.xy * 0.5 + 0.5;
  return n.xy;
}

highp vec3 decodeOctWrap(highp vec2 f) {
  f = f * 2.0 - 1.0;
  highp vec3 n = vec3(f.x, f.y, 1.0 - abs(f.x) - abs(f.y));
  highp float t = max(-n.z, 0.0);
  n.x += n.x >= 0.0 ? -t : t;
  n.y += n.y >= 0.0 ? -t : t;
  return normalize(n);
}

highp float packNormal(highp vec3 normal) {
  return uintBitsToFloat(packHalf2x16(encodeOctWrap(normal)));
}

highp vec3 unpackNormal(highp float packedNormal) {
  return decodeOctWrap(unpackHalf2x16(floatBitsToUint(packedNormal)));
}

highp vec4 packTwoVec4(highp vec4 v1, highp vec4 v2) {
  // note: we get artifacts on some back-ends such as v2 = vec3(1., 0., 0.) being decoded as black (only applies for v2 and red channel)
  highp vec4 encoded = vec4(0.0);

  v1 += NON_ZERO_OFFSET;
  v2 += NON_ZERO_OFFSET;

  highp uint v1r = packHalf2x16(v1.rg);
  highp uint v1g = packHalf2x16(v1.ba);
  highp uint v2r = packHalf2x16(v2.rg);
  highp uint v2g = packHalf2x16(v2.ba);

  encoded.r = uintBitsToFloat(v1r);
  encoded.g = uintBitsToFloat(v1g);
  encoded.b = uintBitsToFloat(v2r);
  encoded.a = uintBitsToFloat(v2g);

  return encoded;
}

void unpackTwoVec4(highp vec4 encoded, out highp vec4 v1, out highp vec4 v2) {
  highp uint r = floatBitsToUint(encoded.r);
  highp uint g = floatBitsToUint(encoded.g);
  highp uint b = floatBitsToUint(encoded.b);
  highp uint a = floatBitsToUint(encoded.a);

  v1.rg = unpackHalf2x16(r);
  v1.ba = unpackHalf2x16(g);
  v2.rg = unpackHalf2x16(b);
  v2.ba = unpackHalf2x16(a);

  v1 -= NON_ZERO_OFFSET;
  v2 -= NON_ZERO_OFFSET;
}

vec4 unpackTwoVec4(highp vec4 encoded, const int index) {
  highp uint r = floatBitsToUint(index == 0 ? encoded.r : encoded.b);
  highp uint g = floatBitsToUint(index == 0 ? encoded.g : encoded.a);

  vec4 v;

  v.rg = unpackHalf2x16(r);
  v.ba = unpackHalf2x16(g);

  v -= NON_ZERO_OFFSET;

  return v;
}

// highp float packVec2(highp vec2 value) {
//   value = min(value + NON_ZERO_OFFSET, vec2(ONE_SAFE));

//   return uintBitsToFloat(packUnorm2x16(value));
// }

// highp vec2 unpackVec2(highp float packedValue) {
//   vec2 v = unpackUnorm2x16(floatBitsToUint(packedValue));
//   v = max(v - NON_ZERO_OFFSET, vec2(0.0));

//   return v;
// }

highp vec4 encodeRGBE8(highp vec3 rgb) {
  highp vec4 vEncoded;
  highp float maxComponent = max(max(rgb.r, rgb.g), rgb.b);
  highp float fExp = ceil(log2(maxComponent));
  vEncoded.rgb = rgb / exp2(fExp);
  vEncoded.a = (fExp + 128.0) / 255.0;
  return vEncoded;
}

highp vec3 decodeRGBE8(highp vec4 rgbe) {
  highp vec3 vDecoded;
  highp float fExp = rgbe.a * 255.0 - 128.0;
  vDecoded = rgbe.rgb * exp2(fExp);
  return vDecoded;
}

highp float vec4ToFloat(highp vec4 vec) {
  vec = min(vec + NON_ZERO_OFFSET, vec4(ONE_SAFE));

  highp uvec4 v = uvec4(vec * 255.0);
  highp uint value = (v.a << 24u) | (v.b << 16u) | (v.g << 8u) | (v.r);
  return uintBitsToFloat(value);
}

highp vec4 floatToVec4(highp float f) {
  highp uint value = floatBitsToUint(f);

  highp vec4 v;
  v.r = float(value & 0xFFu) / 255.0;
  v.g = float((value >> 8u) & 0xFFu) / 255.0;
  v.b = float((value >> 16u) & 0xFFu) / 255.0;
  v.a = float((value >> 24u) & 0xFFu) / 255.0;

  v -= NON_ZERO_OFFSET;
  v = max(v, vec4(0.0));

  return v;
}

highp vec4 packGBuffer(highp vec4 diffuse, highp vec3 normal, highp float roughness, highp float metalness, highp vec3 emissive) {
  highp vec4 gBuffer;

  gBuffer.r = vec4ToFloat(diffuse);
  gBuffer.g = packNormal(normal);

  // unfortunately packVec2 results in severe precision loss and artifacts for
  // the first on Metal backends thus we use color2float instead
  gBuffer.b = color2float(vec3(roughness, metalness, 0.));
  gBuffer.a = vec4ToFloat(encodeRGBE8(emissive));

  return gBuffer;
}

// loading a material from a packed g-buffer
Material getMaterial(highp sampler2D gBufferTexture, highp vec2 uv) {
  highp vec4 gBuffer = textureLod(gBufferTexture, uv, 0.0);

  highp vec4 diffuse = floatToVec4(gBuffer.r);
  highp vec3 normal = unpackNormal(gBuffer.g);

  // using float2color instead of unpackVec2 as the latter results in severe
  // precision loss and artifacts on Metal backends
  highp vec3 roughnessMetalness = float2color(gBuffer.b);
  highp float roughness = roughnessMetalness.r;
  highp float metalness = roughnessMetalness.g;

  highp vec3 emissive = decodeRGBE8(floatToVec4(gBuffer.a));

  return Material(diffuse, normal, roughness, metalness, emissive);
}

Material getMaterial(highp vec2 uv) {
  return getMaterial(gBufferTexture, uv);
}

highp vec3 getNormal(highp sampler2D gBufferTexture, highp vec2 uv) {
  return unpackNormal(textureLod(gBufferTexture, uv, 0.0).g);
}
// end gbuffer_packing

// begin ssgi_utils
// https://github.com/0beqz/realism-effects/blob/main/src/ssgi/shader/ssgi_utils.frag
#define PI M_PI

#define luminance(a) dot(vec3(0.2125, 0.7154, 0.0721), a)

// source:
// https://github.com/mrdoob/three.js/blob/342946c8392639028da439b6dc0597e58209c696/examples/js/shaders/SAOShader.js#L123
float getViewZ(const in float depth) {
#ifdef PERSPECTIVE_CAMERA
  return nearMulFar / (farMinusNear * depth - cameraFar);
#else
  return depth * nearMinusFar - cameraNear;
#endif
}

// source:
// https://github.com/mrdoob/three.js/blob/dev/examples/js/shaders/SSAOShader.js
vec3 getViewPosition(float viewZ) {
  float clipW = projectionMatrix[2][3] * viewZ + projectionMatrix[3][3];
  vec4 clipPosition = vec4((vec3(vUv, viewZ) - 0.5) * 2.0, 1.0);
  clipPosition *= clipW;
  vec3 p = (projectionMatrixInverse * clipPosition).xyz;
  p.z = viewZ;
  return p;
}

vec2 viewSpaceToScreenSpace(const vec3 position) {
  vec4 projectedCoord = projectionMatrix * vec4(position, 1.0);
  projectedCoord.xy /= projectedCoord.w;
  // [-1, 1] --> [0, 1] (NDC to screen position)
  projectedCoord.xy = projectedCoord.xy * 0.5 + 0.5;

  return projectedCoord.xy;
}

vec3 worldSpaceToViewSpace(vec3 worldPosition) {
  vec4 viewPosition = viewMatrix * vec4(worldPosition, 1.0);
  return viewPosition.xyz / viewPosition.w;
}

#ifdef BOX_PROJECTED_ENV_MAP
uniform vec3 envMapSize;
uniform vec3 envMapPosition;

vec3 parallaxCorrectNormal(const vec3 v, const vec3 cubeSize, const vec3 cubePos, const vec3 worldPosition) {
  vec3 nDir = normalize(v);
  vec3 rbmax = (.5 * cubeSize + cubePos - worldPosition) / nDir;
  vec3 rbmin = (-.5 * cubeSize + cubePos - worldPosition) / nDir;
  vec3 rbminmax;
  rbminmax.x = (nDir.x > 0.) ? rbmax.x : rbmin.x;
  rbminmax.y = (nDir.y > 0.) ? rbmax.y : rbmin.y;
  rbminmax.z = (nDir.z > 0.) ? rbmax.z : rbmin.z;
  float correction = min(min(rbminmax.x, rbminmax.y), rbminmax.z);
  vec3 boxIntersection = worldPosition + nDir * correction;

  return boxIntersection - cubePos;
}
#endif

#define M_PI 3.1415926535897932384626433832795

// source:
// https://github.com/gkjohnson/three-gpu-pathtracer/blob/4de53ebc08dffdb21dbb14beb5c9953b600978cc/src/shader/shaderUtils.js#L215
// ray sampling x and z are swapped to align with expected background view
vec2 equirectDirectionToUv(const vec3 direction) {
  // from Spherical.setFromCartesianCoords
  vec2 uv = vec2(atan(direction.z, direction.x), acos(direction.y));
  uv /= vec2(2.0 * M_PI, M_PI);
  // apply adjustments to get values in range [0, 1] and y right side up

  uv.x += 0.5;
  uv.y = 1.0 - uv.y;

  return uv;
}

// source: https://github.com/gkjohnson/three-gpu-pathtracer
vec3 equirectUvToDirection(vec2 uv) {
  // undo above adjustments
  uv.x -= 0.5;
  uv.y = 1.0 - uv.y;
  // from Vector3.setFromSphericalCoords
  float theta = uv.x * 2.0 * PI;
  float phi = uv.y * PI;
  float sinPhi = sin(phi);
  return vec3(sinPhi * cos(theta), cos(phi), sinPhi * sin(theta));
}

// source:
// https://github.com/gkjohnson/three-gpu-pathtracer/blob/3340cc19c796a01abe0ec121930154ec3301e4f2/src/shader/shaderEnvMapSampling.js#L3
vec3 sampleEquirectEnvMapColor(const vec3 direction, const sampler2D map, const float lod) {
  return textureLod(map, equirectDirectionToUv(direction), lod).rgb;
}

// source of the following functions: https://www.shadertoy.com/view/cll3R4

mat3 getBasisFromNormal(const vec3 normal) {
  vec3 other;
  if(abs(normal.x) > 0.5) {
    other = vec3(0.0, 1.0, 0.0);
  } else {
    other = vec3(1.0, 0.0, 0.0);
  }
  vec3 ortho = normalize(cross(normal, other));
  vec3 ortho2 = normalize(cross(normal, ortho));
  return mat3(ortho2, ortho, normal);
}

vec3 F_Schlick(const vec3 f0, const float theta) {
  return f0 + (1. - f0) * pow(1.0 - theta, 5.);
}

float F_Schlick(const float f0, const float f90, const float theta) {
  return f0 + (f90 - f0) * pow(1.0 - theta, 5.0);
}

float D_GTR(const float roughness, const float NoH, const float k) {
  float a2 = pow(roughness, 2.);
  return a2 / (PI * pow((NoH * NoH) * (a2 * a2 - 1.) + 1., k));
}

float SmithG(const float NDotV, const float alphaG) {
  float a = alphaG * alphaG;
  float b = NDotV * NDotV;
  return (2.0 * NDotV) / (NDotV + sqrt(a + b - a * b));
}

float GGXVNDFPdf(const float NoH, const float NoV, const float roughness) {
  float D = D_GTR(roughness, NoH, 2.);
  float G1 = SmithG(NoV, roughness * roughness);
  return (D * G1) / max(0.00001, 4.0 * NoV);
}

float GeometryTerm(const float NoL, const float NoV, const float roughness) {
  float a2 = roughness * roughness;
  float G1 = SmithG(NoV, a2);
  float G2 = SmithG(NoL, a2);
  return G1 * G2;
}

vec3 evalDisneyDiffuse(const float NoL, const float NoV, const float LoH, const float roughness, const float metalness) {
  float FD90 = 0.5 + 2. * roughness * pow(LoH, 2.);
  float a = F_Schlick(1., FD90, NoL);
  float b = F_Schlick(1., FD90, NoV);

  return vec3((a * b / PI) * (1. - metalness));
}

vec3 evalDisneySpecular(const float roughness, const float NoH, const float NoV, const float NoL) {
  float D = D_GTR(roughness, NoH, 2.);
  float G = GeometryTerm(NoL, NoV, pow(0.5 + roughness * .5, 2.));

  vec3 spec = vec3(D * G / (4. * NoL * NoV));

  return spec;
}

vec3 SampleGGXVNDF(const vec3 V, const float ax, const float ay, const float r1, const float r2) {
  vec3 Vh = normalize(vec3(ax * V.x, ay * V.y, V.z));

  float lensq = Vh.x * Vh.x + Vh.y * Vh.y;
  vec3 T1 = lensq > 0. ? vec3(-Vh.y, Vh.x, 0.) * inversesqrt(lensq) : vec3(1., 0., 0.);
  vec3 T2 = cross(Vh, T1);

  float r = sqrt(r1);
  float phi = 2.0 * PI * r2;
  float t1 = r * cos(phi);
  float t2 = r * sin(phi);
  float s = 0.5 * (1.0 + Vh.z);
  t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

  vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * Vh;

  return normalize(vec3(ax * Nh.x, ay * Nh.y, max(0.0, Nh.z)));
}

void Onb(const vec3 N, inout vec3 T, inout vec3 B) {
  vec3 up = abs(N.z) < 0.9999999 ? vec3(0, 0, 1) : vec3(1, 0, 0);
  T = normalize(cross(up, N));
  B = cross(N, T);
}

vec3 ToLocal(const vec3 X, const vec3 Y, const vec3 Z, const vec3 V) {
  return vec3(dot(V, X), dot(V, Y), dot(V, Z));
}

vec3 ToWorld(const vec3 X, const vec3 Y, const vec3 Z, const vec3 V) {
  return V.x * X + V.y * Y + V.z * Z;
}

// source: https://www.shadertoy.com/view/cll3R4
vec3 cosineSampleHemisphere(const vec3 n, const vec2 u) {
  float r = sqrt(u.x);
  float theta = 2.0 * PI * u.y;

  vec3 b = normalize(cross(n, vec3(0.0, 1.0, 1.0)));
  vec3 t = cross(b, n);

  return normalize(r * sin(theta) * b + sqrt(1.0 - u.x) * n + r * cos(theta) * t);
}

// end: functions

// source: https://github.com/gkjohnson/three-gpu-pathtracer
float equirectDirectionPdf(vec3 direction) {
  vec2 uv = equirectDirectionToUv(direction);
  float theta = uv.y * PI;
  float sinTheta = sin(theta);
  if(sinTheta == 0.0) {
    return 0.0;
  }

  return 1.0 / (2.0 * PI * PI * sinTheta);
}

// for whatever reason, using names like "random" or "noise" for the blueNoise
// param results in shader errors, e.g. "_urandom is not defined"
// source: https://github.com/gkjohnson/three-gpu-pathtracer
float sampleEquirectProbability(EquirectHdrInfo info, vec2 blueNoise, out vec3 direction) {
  // sample env map cdf
  float v = textureLod(info.marginalWeights, vec2(blueNoise.x, 0.0), 0.).x;
  float u = textureLod(info.conditionalWeights, vec2(blueNoise.y, v), 0.).x;
  vec2 uv = vec2(u, v);

  vec3 derivedDirection = equirectUvToDirection(uv);
  direction = derivedDirection;
  vec3 color = texture(info.map, uv).rgb;

  float totalSum = info.totalSumWhole + info.totalSumDecimal;
  float lum = luminance(color);
  float pdf = lum / totalSum;

  return info.size.x * info.size.y * pdf;
}

float misHeuristic(float a, float b) {
  float aa = a * a;
  float bb = b * b;
  return aa / (aa + bb);
}

// this function takes a normal and a direction as input and returns a new
// direction that is aligned to the normal
vec3 alignToNormal(const vec3 normal, const vec3 direction) {
  vec3 tangent;
  vec3 bitangent;
  Onb(normal, tangent, bitangent);

  vec3 localDir = ToLocal(tangent, bitangent, normal, direction);
  vec3 localDirAligned = vec3(localDir.x, localDir.y, abs(localDir.z));
  vec3 alignedDir = ToWorld(tangent, bitangent, normal, localDirAligned);

  return alignedDir;
}

// source:
// http://rodolphe-vaillant.fr/entry/118/curvature-of-a-distance-field-implicit-surface
float getFlatness(vec3 g, vec3 rp) {
  vec3 gw = fwidth(g);
  vec3 pw = fwidth(rp);

  float wfcurvature = length(gw) / length(pw);
  wfcurvature = smoothstep(0.0, 30., wfcurvature);

  return clamp(wfcurvature, 0., 1.);
}

// end ssgi_utils

vec2 RayMarch(inout vec3 dir, inout vec3 hitPos, vec4 random);
vec2 BinarySearch(inout vec3 dir, inout vec3 hitPos);

struct RayTracingInfo {
  float NoV;            // dot(n, v)
  float NoL;            // dot(n, l)
  float NoH;            // dot(n, h)
  float LoH;            // dot(l, h)
  float VoH;            // dot(v, h)
  bool isDiffuseSample; // whether the sample is diffuse or specular
  bool isEnvSample;     // whether the sample is importance sampled from the env
                        // map
};

struct RayTracingResult {
  vec3 gi;          // computed global illumination for a sample
  vec3 l;           // sample world space direction
  vec3 hitPos;      // hit position
  bool isMissedRay; // whether the ray missed the scene
  vec3 brdf;        // brdf value
  float pdf;        // pdf value
};

struct EnvMisSample {
  float pdf;
  float probability;
  bool isEnvSample;
};

// !todo: refactor functions
// RayTracingResult doSample(const vec3 viewPos, const vec3 viewDir, const vec3
// viewNormal, const vec3 worldPos, const vec4 random, Material mat,
// RayTracingInfo info);

vec3 worldNormal;

vec3 doSample(
  const vec3 viewPos,
  const vec3 viewDir,
  const vec3 viewNormal,
  const vec3 worldPos,
  const float metalness,
  const float roughness,
  const bool isDiffuseSample,
  const bool isEnvSample,
  const float NoV,
  const float NoL,
  const float NoH,
  const float LoH,
  const float VoH,
  const vec4 random,
  inout vec3 l,
  inout vec3 hitPos,
  out bool isMissedRay,
  out vec3 brdf,
  out float pdf
);

void calculateAngles(inout vec3 h, inout vec3 l, inout vec3 v, inout vec3 n, inout float NoL, inout float NoH, inout float LoH, inout float VoH) {
  h = normalize(v + l); // half vector

  NoL = clamp(dot(n, l), EPSILON, ONE_MINUS_EPSILON);
  NoH = clamp(dot(n, h), EPSILON, ONE_MINUS_EPSILON);
  LoH = clamp(dot(l, h), EPSILON, ONE_MINUS_EPSILON);
  VoH = clamp(dot(v, h), EPSILON, ONE_MINUS_EPSILON);
}

vec3 worldPos;
Material mat;

void main() {
  float unpackedDepth = textureLod(depthTexture, vUv, 0.0).r;

  // filter out background
  if(unpackedDepth == 1.0) {
    vec4 directLight = textureLod(directLightTexture, vUv, 0.0);
    gl_FragColor = packTwoVec4(directLight, directLight);
    return;
  }

  mat = getMaterial(gBufferTexture, vUv);
  float roughnessSq = clamp(mat.roughness * mat.roughness, 0.000001, 1.0);

  invTexSize = 1. / resolution;

  // view-space depth
  float viewZ = getViewZ(unpackedDepth);

  // view-space position of the current texel
  vec3 viewPos = getViewPosition(viewZ);

  vec3 viewDir = normalize(viewPos);
  worldNormal = mat.normal;
  vec3 viewNormal = normalize((vec4(worldNormal, 0.) * cameraMatrixWorld).xyz);
  worldPos = (cameraMatrixWorld * vec4(viewPos, 1.)).xyz;

  vec3 n = viewNormal; // view-space normal
  vec3 v = -viewDir;   // incoming vector
  float NoV = max(EPSILON, dot(n, v));

  // convert view dir to world-space
  vec3 V = (vec4(v, 0.) * viewMatrix).xyz;
  vec3 N = worldNormal;

  vec4 random;
  vec3 H, l, h, F, T, B, envMisDir, gi;
  vec3 diffuseGI, specularGI, brdf, hitPos, specularHitPos;

  Onb(N, T, B);

  V = ToLocal(T, B, N, V);

  // fresnel f0
  vec3 f0 = mix(vec3(0.04), mat.diffuse.rgb, mat.metalness);

  float NoL, NoH, LoH, VoH, diffW, specW, invW, pdf, envPdf, diffuseSamples, specularSamples;
  bool isDiffuseSample, isEnvSample, isMissedRay;

  random = blueNoise();
  // Disney BRDF and sampling source: https://www.shadertoy.com/view/cll3R4
  // calculate GGX reflection ray
  H = SampleGGXVNDF(V, roughnessSq, roughnessSq, random.r, random.g);
  if(H.z < 0.0)
    H = -H;

  l = normalize(reflect(-V, H));
  l = ToWorld(T, B, N, l);

  // convert reflected vector back to view-space
  l = (vec4(l, 0.) * cameraMatrixWorld).xyz;
  l = normalize(l);

  calculateAngles(h, l, v, n, NoL, NoH, LoH, VoH);

#if mode == MODE_SSGI
  // fresnel
  F = F_Schlick(f0, VoH);

  // diffuse and specular weight
  diffW = (1. - mat.metalness) * luminance(mat.diffuse.rgb);
  specW = luminance(F);

  diffW = max(diffW, EPSILON);
  specW = max(specW, EPSILON);

  invW = 1. / (diffW + specW);

  // relative weights used for choosing either a diffuse or specular ray
  diffW *= invW;

  // if diffuse lighting should be sampled
  isDiffuseSample = random.b < diffW;
#else
  isDiffuseSample = false;
#endif

  EnvMisSample ems;
  ems.pdf = 1.;

  envMisDir = vec3(0.0);
  envPdf = 1.;

#ifdef importanceSampling
  ems.pdf = sampleEquirectProbability(envMapInfo, random.rg, envMisDir);
  envMisDir = normalize((vec4(envMisDir, 0.) * cameraMatrixWorld).xyz);

  ems.probability = dot(envMisDir, viewNormal);
  ems.probability *= mat.roughness;
  ems.probability = min(ONE_MINUS_EPSILON, ems.probability);

  ems.isEnvSample = random.a < ems.probability;

  if(ems.isEnvSample) {
    ems.pdf /= 1. - ems.probability;

    l = envMisDir;
    calculateAngles(h, l, v, n, NoL, NoH, LoH, VoH);
  } else {
    ems.pdf = 1. - ems.probability;
  }
#endif

  vec3 diffuseRay = ems.isEnvSample ? envMisDir : cosineSampleHemisphere(viewNormal, random.rg);
  vec3 specularRay = ems.isEnvSample ? envMisDir : l;

// optional diffuse ray
#if mode == MODE_SSGI
  if(isDiffuseSample) {
    l = diffuseRay;

    calculateAngles(h, l, v, n, NoL, NoH, LoH, VoH);

    gi = doSample(viewPos, viewDir, viewNormal, worldPos, mat.metalness, roughnessSq, isDiffuseSample, ems.isEnvSample, NoV, NoL, NoH, LoH, VoH, random, l, hitPos, isMissedRay, brdf, pdf);

    gi *= brdf;

    if(ems.isEnvSample) {
      gi *= misHeuristic(ems.pdf, pdf);
    } else {
      gi /= pdf;
    }
    gi /= ems.pdf;

    diffuseSamples++;

    diffuseGI = mix(diffuseGI, gi, 1. / diffuseSamples);
  }
#endif

  // specular ray (traced every frame)
  l = specularRay;
  calculateAngles(h, l, v, n, NoL, NoH, LoH, VoH);

  gi = doSample(viewPos, viewDir, viewNormal, worldPos, mat.metalness, roughnessSq, isDiffuseSample, ems.isEnvSample, NoV, NoL, NoH, LoH, VoH, random, l, hitPos, isMissedRay, brdf, pdf);

  gi *= brdf;

  if(ems.isEnvSample) {
    gi *= misHeuristic(ems.pdf, pdf);
  } else {
    gi /= pdf;
  }
  gi /= ems.pdf;

  specularHitPos = hitPos;

  specularSamples++;

  specularGI = mix(specularGI, gi, 1. / specularSamples);

#ifdef useDirectLight
  vec3 directLight = textureLod(directLightTexture, vUv, 0.).rgb;

  diffuseGI += directLight;
  specularGI += directLight;
#endif

  highp vec4 gDiffuse, gSpecular;

#if mode == MODE_SSGI
  if(diffuseSamples == 0.0)
    diffuseGI = vec3(-1.0);
  gDiffuse = vec4(diffuseGI, mat.roughness);
#endif

  // calculate world-space ray length used for reprojecting hit points instead
  // of screen-space pixels in the temporal reproject pass
  highp float rayLength = 0.0;
  vec4 hitPosWS;
  vec3 cameraPosWS = cameraMatrixWorld[3].xyz;

  isMissedRay = hitPos.x > 10.0e8;

  if(!isMissedRay) {
    // convert hitPos from view- to world-space
    hitPosWS = cameraMatrixWorld * vec4(specularHitPos, 1.0);

    // get the camera position in world-space from the camera matrix
    rayLength = distance(cameraPosWS, hitPosWS.xyz);
  }

  // encode both roughness and rayLength into the alpha channel
  highp uint packedRoughnessRayLength = packHalf2x16(vec2(rayLength, mat.roughness));
  highp float a = uintBitsToFloat(packedRoughnessRayLength);

#if mode == MODE_SSGI
  gSpecular = vec4(specularGI, rayLength);
  gl_FragColor = packTwoVec4(gDiffuse, gSpecular);
#else
  gSpecular = vec4(specularGI, a);
  gl_FragColor = gSpecular;
#endif
}

vec3 getEnvColor(vec3 l, vec3 worldPos, float roughness, bool isDiffuseSample, bool isEnvSample) {
  vec3 envMapSample;
#ifdef USE_ENVMAP
  // world-space reflected ray
  vec3 reflectedWS = normalize((vec4(l, 0.) * viewMatrix).xyz);

#ifdef BOX_PROJECTED_ENV_MAP
  reflectedWS = parallaxCorrectNormal(reflectedWS.xyz, envMapSize, envMapPosition, worldPos);
  reflectedWS = normalize(reflectedWS.xyz);
#endif

  float mip = envBlur * maxEnvMapMipLevel;

  if(!isDiffuseSample && roughness < 0.15)
    mip *= roughness / 0.15;

  envMapSample = sampleEquirectEnvMapColor(reflectedWS, envMapInfo.map, mip);

  float maxEnvLum = isEnvSample ? 100.0 : 25.0;

  if(maxEnvLum != 0.0) {
    // we won't deal with calculating direct sun light from the env map as it
    // is too noisy
    float envLum = luminance(envMapSample);

    if(envLum > maxEnvLum) {
      envMapSample *= maxEnvLum / envLum;
    }
  }

  return envMapSample;
#else
  // if we don't have an environment map, just return black
  return vec3(0.0);
#endif
}

float getSaturation(vec3 c) {
  float maxComponent = max(max(c.r, c.g), c.b);
  float minComponent = min(min(c.r, c.g), c.b);

  float delta = maxComponent - minComponent;

  // If the maximum and minimum components are equal, the color is achromatic (gray)
  if(maxComponent == minComponent) {
    return 0.0;
  } else {
    return delta / maxComponent;
  }
}

vec3 doSample(
  const vec3 viewPos,
  const vec3 viewDir,
  const vec3 viewNormal,
  const vec3 worldPos,
  const float metalness,
  const float roughness,
  const bool isDiffuseSample,
  const bool isEnvSample,
  const float NoV,
  const float NoL,
  const float NoH,
  const float LoH,
  const float VoH,
  const vec4 random,
  inout vec3 l,
  inout vec3 hitPos,
  out bool isMissedRay,
  out vec3 brdf,
  out float pdf
) {
  float cosTheta = max(0.0, dot(viewNormal, l));

  if(isDiffuseSample) {
    vec3 diffuseBrdf = evalDisneyDiffuse(NoL, NoV, LoH, roughness, metalness);
    pdf = NoL / M_PI;

    brdf = diffuseBrdf;
  } else {
    vec3 specularBrdf = evalDisneySpecular(roughness, NoH, NoV, NoL);
    pdf = GGXVNDFPdf(NoH, NoV, roughness);

    brdf = specularBrdf;
  }

  brdf *= cosTheta;
  pdf = max(EPSILON, pdf);

  hitPos = viewPos;

  vec2 coords = RayMarch(l, hitPos, random);

  bool allowMissedRays = false;
#ifdef missedRays
  allowMissedRays = true;
#endif

  isMissedRay = hitPos.x == 10.0e9;

  vec3 envMapSample = vec3(0.);

  // inisEnvSample ray, use environment lighting as fallback
  if(isMissedRay && !allowMissedRays)
    return getEnvColor(l, worldPos, roughness, isDiffuseSample, isEnvSample);

  // reproject the coords from the last frame
  vec4 velocity = textureLod(velocityTexture, coords.xy, 0.0);

  vec2 reprojectedUv = coords.xy - velocity.xy;

  vec3 SSGI;
  vec3 envColor = getEnvColor(l, worldPos, roughness, isDiffuseSample, isEnvSample);

  // check if the reprojected coordinates are within the screen
  if(reprojectedUv.x >= 0.0 && reprojectedUv.x <= 1.0 && reprojectedUv.y >= 0.0 && reprojectedUv.y <= 1.0) {
    vec4 reprojectedGI = textureLod(accumulatedTexture, reprojectedUv, 0.);

    float saturation = getSaturation(mat.diffuse.rgb);

    // saturate reprojected GI by the saturation value
    reprojectedGI.rgb = mix(reprojectedGI.rgb, vec3(luminance(reprojectedGI.rgb)), (1. - roughness) * saturation * 0.4);

    SSGI = reprojectedGI.rgb;

    float aspect = resolution.x / resolution.y;

    float border = 0.15;
    float borderFactor = smoothstep(0.0, border, coords.x) * smoothstep(1.0, 1.0 - border, coords.x) * smoothstep(0.0, border, coords.y) *
      smoothstep(1.0, 1.0 - border, coords.y);

    borderFactor = sqrt(borderFactor);
    SSGI = mix(envColor, SSGI, borderFactor);
  } else {
    return envColor;
  }

  if(allowMissedRays) {
    float ssgiLum = luminance(SSGI);
    float envLum = luminance(envMapSample);

    if(envLum > ssgiLum)
      SSGI = envMapSample;
  }

  return SSGI;
}

vec2 RayMarch(inout vec3 dir, inout vec3 hitPos, vec4 random) {
  float rayHitDepthDifference;

  // todo: investigate offset (different value?)
  // hitPos += dir * 0.01;

  dir *= rayDistance / float(steps);

  vec2 uv;

  for(int i = 1; i < steps; i++) {
    // use slower increments for the first few steps to sharpen contact shadows: https://www.desmos.com/calculator/8cvzy4kdeb
    float cs = 1. - exp(-0.25 * pow(float(i) + random.b - 0.5, 2.));
    hitPos += dir * cs;

    uv = viewSpaceToScreenSpace(hitPos);

    float unpackedDepth = textureLod(depthTexture, uv, 0.0).r;
    float z = getViewZ(unpackedDepth);

    rayHitDepthDifference = z - hitPos.z;

    if(rayHitDepthDifference >= 0.0 && rayHitDepthDifference < thickness) {
      if(refineSteps == 0) {
        return uv;
      } else {
        return BinarySearch(dir, hitPos);
      }
    }
  }

  hitPos.xyz = vec3(10.0e9);

  return uv;
}

vec2 BinarySearch(inout vec3 dir, inout vec3 hitPos) {
  float rayHitDepthDifference;
  vec2 uv;

  dir *= 0.5;
  hitPos -= dir;

  for(int i = 0; i < refineSteps; i++) {
    uv = viewSpaceToScreenSpace(hitPos);

    float unpackedDepth = textureLod(depthTexture, uv, 0.0).r;
    float z = getViewZ(unpackedDepth);

    rayHitDepthDifference = z - hitPos.z;

    dir *= 0.5;
    if(rayHitDepthDifference >= 0.0) {
      hitPos -= dir;
    } else {
      hitPos += dir;
    }
  }

  uv = viewSpaceToScreenSpace(hitPos);

  return uv;
}
