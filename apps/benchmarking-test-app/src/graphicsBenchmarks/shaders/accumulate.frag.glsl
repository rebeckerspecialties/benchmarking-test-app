layout(location = 0) in vec2 uv;
layout(location = 0) out vec4 outputColor;

// Packed specular and diffuse
layout(binding = 0) uniform texture2D inputTexture;
layout(binding = 1) uniform float roughness;
layout(binding = 2) uniform sampler samp;

#define NON_ZERO_OFFSET 0.0001

struct TexelLighting {
  vec4 diffuse;
  vec4 specular;
};

TexelLighting unpackTwoVec4(vec4 encoded) {
  vec4 v1 = vec4(0.0);
  vec4 v2 = vec4(0.0);

  uint r = floatBitsToUint(encoded.r);
  uint g = floatBitsToUint(encoded.g);
  uint b = floatBitsToUint(encoded.b);
  uint a = floatBitsToUint(encoded.a);

  v1.rg = unpackHalf2x16(r);
  v1.ba = unpackHalf2x16(g);
  v2.rg = unpackHalf2x16(b);
  v2.ba = unpackHalf2x16(a);

  v1 -= NON_ZERO_OFFSET;
  v2 -= NON_ZERO_OFFSET;

  return TexelLighting(v1, v2);
}

vec4 accumulate(vec4 inputTexel) {
  TexelLighting t = unpackTwoVec4(inputTexel);

  return mix(t.diffuse, t.specular, roughness);
}

void main() {
  vec4 inputTexel = texture(sampler2D(inputTexture, samp), uv);

  outputColor = accumulate(inputTexel);
}
