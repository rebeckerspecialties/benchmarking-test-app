// https://github.com/0beqz/realism-effects/blob/main/src/ssgi/shader/ssgi_compose.frag
uniform sampler2D inputTexture;
uniform sampler2D sceneTexture;
uniform highp sampler2D depthTexture;
uniform bool isDebug;

uniform float cameraNear;
uniform float cameraFar;

// source: https://github.com/mrdoob/three.js/blob/1e352b62a57f78a032019c37c8c33e3bf7839c04/src/renderers/shaders/ShaderChunk/packing.glsl.js#L97
float perspectiveDepthToViewZ(const in float depth, const in float near, const in float far) {
	// maps perspective depth in [ 0, 1 ] to viewZ
  return (near * far) / ((far - near) * depth - far);
}

// source: https://github.com/mrdoob/three.js/blob/79ea10830dfc97b6c0a7e29d217c7ff04c081095/examples/jsm/shaders/BokehShader.js#L66
float getViewZ(const in float depth) {
  return perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if(isDebug) {
    outputColor = textureLod(inputTexture, uv, 0.);
    return;
  }

  float depth = textureLod(depthTexture, uv, 0.).r;
  vec3 ssgiClr;

  if(depth == 1.0) {
    ssgiClr = textureLod(sceneTexture, uv, 0.).rgb;
  } else {
    ssgiClr = textureLod(inputTexture, uv, 0.).rgb;
  }

  outputColor = vec4(ssgiClr, 1.0);
}
