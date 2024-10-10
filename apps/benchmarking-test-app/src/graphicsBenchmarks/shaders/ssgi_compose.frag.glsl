// https://github.com/0beqz/realism-effects/blob/main/src/ssgi/shader/ssgi_compose.frag
layout(location = 0) in vec2 uv;
layout(location = 0) out vec4 outputColor;

layout(binding = 0) uniform texture2D inputTexture;
layout(binding = 1) uniform texture2D sceneTexture;
layout(binding = 2) uniform texture2D depthTexture;
layout(binding = 3) uniform sampler samp;

void main() {
  float depth = textureLod(sampler2D(depthTexture, samp), uv, 0.).r;
  vec3 ssgiClr;

  if(depth == 1.0) {
    ssgiClr = textureLod(sampler2D(sceneTexture, samp), uv, 0.).rgb;
  } else {
    ssgiClr = textureLod(sampler2D(inputTexture, samp), uv, 0.).rgb;
  }

  outputColor = vec4(ssgiClr, 1.0);
}
