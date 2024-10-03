// Contents generated using naga: https://github.com/gfx-rs/wgpu/tree/trunk/naga#readme

export const sdfShaderVertWGSL = `
struct VertexOutput {
    @location(0) vUv: vec2<f32>,
    @location(1) vFragDepth: f32,
    @location(2) vIsPerspective: f32,
    @location(3) vFogDepth: f32,
    @builtin(position) gl_Position: vec4<f32>,
}

var<private> position_1: vec3<f32>;
var<private> uv_1: vec2<f32>;
var<private> vUv: vec2<f32>;
var<private> vFragDepth: f32;
var<private> vIsPerspective: f32;
var<private> vFogDepth: f32;
@group(0) @binding(0)
var<uniform> projectionMatrix: mat4x4<f32>;
@group(0) @binding(1)
var<uniform> modelViewMatrix: mat4x4<f32>;
var<private> gl_Position: vec4<f32>;

fn isPerspectiveMatrix(m: mat4x4<f32>) -> bool {
    var m_1: mat4x4<f32>;

    m_1 = m;
    let _e14 = m_1[2][3];
    return (_e14 == -1f);
}

fn main_1() {
    let _e8 = uv_1;
    vUv = _e8;
    let _e10 = projectionMatrix;
    let _e11 = modelViewMatrix;
    let _e13 = position_1;
    gl_Position = ((_e10 * _e11) * vec4<f32>(_e13.x, _e13.y, _e13.z, 1f));
    let _e21 = gl_Position;
    vFragDepth = (1f + _e21.w);
    let _e25 = projectionMatrix;
    let _e26 = isPerspectiveMatrix(_e25);
    vIsPerspective = select(0f, 1f, _e26);
    let _e30 = modelViewMatrix;
    let _e31 = position_1;
    vFogDepth = (_e30 * vec4<f32>(_e31.x, _e31.y, _e31.z, 1f)).z;
    return;
}

@vertex
fn main(@location(0) position: vec3<f32>, @location(1) uv: vec2<f32>) -> VertexOutput {
    position_1 = position;
    uv_1 = uv;
    main_1();
    let _e21 = vUv;
    let _e23 = vFragDepth;
    let _e25 = vIsPerspective;
    let _e27 = vFogDepth;
    let _e29 = gl_Position;
    return VertexOutput(_e21, _e23, _e25, _e27, _e29);
}

`;

export const sdfShaderFragWGSL = `
struct FragmentOutput {
    @location(0) FragColor: vec4<f32>,
    @builtin(frag_depth) gl_FragDepth: f32,
}

@group(1) @binding(0)
var inputBufferTexture: texture_2d<f32>;
@group(1) @binding(1)
var noiseTexture: texture_2d<f32>;
@group(1) @binding(2)
var uDepthTexture: texture_depth_2d;
@group(1) @binding(3)
var samp: sampler;
@group(0) @binding(2)
var<uniform> cameraPos: vec3<f32>;
@group(0) @binding(3)
var<uniform> cameraMatrix: mat4x4<f32>;
@group(0) @binding(4)
var<uniform> uTime: f32;
@group(0) @binding(5)
var<uniform> fov: f32;
@group(0) @binding(6)
var<uniform> aspectRatio: f32;
@group(0) @binding(7)
var<uniform> near: f32;
@group(0) @binding(8)
var<uniform> uColor: vec3<f32>;
@group(0) @binding(9)
var<uniform> scale: vec3<f32>;
@group(0) @binding(10)
var<uniform> mode: i32;
@group(0) @binding(11)
var<uniform> sdfMatrix: mat4x4<f32>;
@group(0) @binding(12)
var<uniform> sdfMatrixInv: mat4x4<f32>;
@group(0) @binding(13)
var<uniform> lightDirection: vec3<f32>;
var<private> vUv_1: vec2<f32>;
@group(0) @binding(14)
var<uniform> logDepthBufFC: f32;
var<private> vFragDepth_1: f32;
var<private> vIsPerspective_1: f32;
var<private> FragColor: vec4<f32>;
var<private> gl_FragDepth: f32;
var<private> gl_FragCoord_1: vec4<f32>;

fn torus(p: vec3<f32>, t: vec2<f32>) -> vec3<f32> {
    var p_1: vec3<f32>;
    var t_1: vec2<f32>;
    var angle: f32;
    var c: f32;
    var s: f32;
    var rotationMatrix: mat3x3<f32>;
    var q: vec2<f32>;

    p_1 = p;
    t_1 = t;
    let _e5 = uTime;
    angle = _e5;
    let _e7 = angle;
    c = cos(_e7);
    let _e10 = angle;
    s = sin(_e10);
    let _e17 = c;
    let _e18 = s;
    let _e21 = s;
    let _e22 = c;
    rotationMatrix = mat3x3<f32>(vec3<f32>(1f, 0f, 0f), vec3<f32>(0f, _e17, -(_e18)), vec3<f32>(0f, _e21, _e22));
    let _e28 = rotationMatrix;
    let _e29 = p_1;
    p_1 = (_e28 * _e29);
    let _e31 = p_1;
    let _e34 = t_1;
    let _e37 = p_1;
    q = vec2<f32>((length(_e31.xz) - _e34.x), _e37.y);
    let _e41 = q;
    let _e43 = t_1;
    let _e46 = q;
    return vec3<f32>((length(_e41) - _e43.y), _e46.y, 0f);
}

@diagnostic(off,derivative_uniformity)
fn cloudShape(p_2: vec3<f32>) -> f32 {
    var textureSize: f32 = 64f;

    var thisScale = scale;
    var transformedP = p_2;
    transformedP.x = (transformedP.x + (sin((uTime + (sin((uTime * 0.27f)) * 0.5f))) * 5f));
    transformedP.y = (transformedP.y + (cos((uTime + (cos((uTime * 0.33f)) * 0.3f))) * 5f));
    transformedP.z = (transformedP.z + (sin((uTime + (sin((uTime * 0.22f)) * 0.4f))) * 5f));
    var scaledP = (transformedP * thisScale);
    var sliceSize = (1f / textureSize);
    var slice = floor((scaledP.z * textureSize));
    var x = (scaledP.x - floor(scaledP.x));
    var y = ((scaledP.y - floor(scaledP.y)) + (slice * sliceSize));
    var density = textureSample(noiseTexture, samp, vec2<f32>(x, y)).r;
    return (density * 0.025f);
}

@diagnostic(off,derivative_uniformity)
fn rayMarchClouds(ro: vec3<f32>, rd: vec3<f32>) -> vec4<f32> {
    var d: f32 = 0f;
    var accumulatedColor: vec4<f32> = vec4(0f);
    var i: i32 = 0i;
    var p_4: vec3<f32>;
    var depthFromCamera: f32;
    var depthFromTexture: f32;
    var density_1: f32;
    var cloudColor: vec3<f32>;
    var alpha: f32;

    loop {
        if !(((i < 100i) && (d < 5000f))) {
            break;
        }
        {
            p_4 = (ro + (rd * d));
            depthFromCamera = length((p_4 - cameraPos));
            depthFromTexture = (textureSample(uDepthTexture, samp, vUv_1) * 10f);
            if (depthFromCamera > depthFromTexture) {
                break;
            }
            density_1 = cloudShape(p_4);
            if (density_1 > 0.001f) {
                cloudColor = vec3<f32>(1f, 1f, 1f);
                alpha = density_1;
                let _e62 = (cloudColor * alpha);
                accumulatedColor = (accumulatedColor + (vec4<f32>(_e62.x, _e62.y, _e62.z, alpha) * (1f - accumulatedColor.w)));
            }
            d = (d + 0.1f);
        }
        continuing {
            let _e23 = i;
            i = (_e23 + 1i);
        }
    }
    return accumulatedColor;
}

fn shortestDistanceToTorus(ro_2: vec3<f32>, t_2: vec2<f32>) -> f32 {
    var ro_3: vec3<f32>;
    var t_3: vec2<f32>;

    ro_3 = ro_2;
    t_3 = t_2;
    let _e5 = sdfMatrixInv;
    let _e6 = ro_3;
    ro_3 = (_e5 * vec4<f32>(_e6.x, _e6.y, _e6.z, 1f)).xyz;
    let _e14 = ro_3;
    let _e15 = t_3;
    let _e16 = torus(_e14, _e15);
    return _e16.x;
}

fn estimateNormal(p_5: vec3<f32>, torusParams: vec2<f32>) -> vec3<f32> {
    var p_6: vec3<f32>;
    var torusParams_1: vec2<f32>;
    var epsilon: f32 = 0.01f;

    p_6 = p_5;
    torusParams_1 = torusParams;
    let _e54 = p_6;
    let _e55 = epsilon;
    let _e60 = torusParams_1;
    let _e61 = shortestDistanceToTorus((_e54 + vec3<f32>(_e55, 0f, 0f)), _e60);
    let _e62 = p_6;
    let _e63 = epsilon;
    let _e68 = torusParams_1;
    let _e69 = shortestDistanceToTorus((_e62 - vec3<f32>(_e63, 0f, 0f)), _e68);
    let _e71 = p_6;
    let _e73 = epsilon;
    let _e77 = torusParams_1;
    let _e78 = shortestDistanceToTorus((_e71 + vec3<f32>(0f, _e73, 0f)), _e77);
    let _e79 = p_6;
    let _e81 = epsilon;
    let _e85 = torusParams_1;
    let _e86 = shortestDistanceToTorus((_e79 - vec3<f32>(0f, _e81, 0f)), _e85);
    let _e88 = p_6;
    let _e91 = epsilon;
    let _e94 = torusParams_1;
    let _e95 = shortestDistanceToTorus((_e88 + vec3<f32>(0f, 0f, _e91)), _e94);
    let _e96 = p_6;
    let _e99 = epsilon;
    let _e102 = torusParams_1;
    let _e103 = shortestDistanceToTorus((_e96 - vec3<f32>(0f, 0f, _e99)), _e102);
    return normalize(vec3<f32>((_e61 - _e69), (_e78 - _e86), (_e95 - _e103)));
}

fn opUnion(d1_: f32, d2_: f32) -> f32 {
    var d1_1: f32;
    var d2_1: f32;

    d1_1 = d1_;
    d2_1 = d2_;
    let _e4 = d1_1;
    let _e5 = d2_1;
    return min(_e4, _e5);
}

fn pal(t_4: f32, a: vec3<f32>, b: vec3<f32>, c_1: vec3<f32>, d_1: vec3<f32>) -> vec3<f32> {
    var t_5: f32;
    var a_1: vec3<f32>;
    var b_1: vec3<f32>;
    var c_2: vec3<f32>;
    var d_2: vec3<f32>;

    t_5 = t_4;
    a_1 = a;
    b_1 = b;
    c_2 = c_1;
    d_2 = d_1;
    let _e10 = a_1;
    let _e11 = b_1;
    let _e13 = c_2;
    let _e14 = t_5;
    let _e16 = d_2;
    return (_e10 + (_e11 * cos((6.28318f * ((_e13 * _e14) + _e16)))));
}

fn spectrum(n: f32) -> vec3<f32> {
    var n_1: f32;

    n_1 = n;
    let _e2 = n_1;
    let _e19 = pal(_e2, vec3<f32>(0.5f, 0.5f, 0.5f), vec3<f32>(0.5f, 0.5f, 0.5f), vec3<f32>(1f, 1f, 1f), vec3<f32>(0f, 0.33f, 0.67f));
    return _e19;
}

fn gamma(color: vec3<f32>, g: f32) -> vec3<f32> {
    var color_1: vec3<f32>;
    var g_1: f32;

    color_1 = color;
    g_1 = g;
    let _e4 = color_1;
    let _e5 = g_1;
    return pow(_e4, vec3(_e5));
}

fn linearToScreen(linearRGB: vec3<f32>) -> vec3<f32> {
    var linearRGB_1: vec3<f32>;
    var GAMMA: f32 = 2.2f;

    linearRGB_1 = linearRGB;
    let _e4 = linearRGB_1;
    let _e6 = GAMMA;
    let _e8 = gamma(_e4, (1f / _e6));
    return _e8;
}

@diagnostic(off,derivative_uniformity)
fn rayMarchPhong(ro_4: vec3<f32>, rd_2: vec3<f32>) -> vec3<f32> {
    var ro_5: vec3<f32>;
    var rd_3: vec3<f32>;
    var invsdfMatrix: mat4x4<f32>;
    var d_3: f32 = 0f;
    var i_1: i32 = 0i;
    var p_7: vec3<f32>;
    var dist: f32;
    var depth1_: f32;
    var linearDepth1_: f32;
    var normal: vec3<f32>;
    var eyeDirection: vec3<f32>;
    var reflection: vec3<f32>;
    var dome: vec3<f32>;
    var nor: vec3<f32>;
    var perturb: vec3<f32>;
    var iridescentColor: vec3<f32>;
    var specular2_: f32;
    var shadow: f32;
    var cameraDist: f32;
    var shade: f32;
    var ambientColor: vec3<f32>;
    var diffuseColor: vec3<f32>;
    var specularColor: vec3<f32>;
    var shininess: f32;
    var normalLightDirection: vec3<f32>;
    var diffuseFactor: f32;
    var diffuse: vec3<f32>;
    var viewDirection: vec3<f32>;
    var reflectionDirection: vec3<f32>;
    var specularFactor: f32;
    var specular: vec3<f32>;
    var phongColor: vec3<f32>;
    var finalColor: vec3<f32>;

    ro_5 = ro_4;
    rd_3 = rd_2;
    let _e11 = sdfMatrixInv;
    invsdfMatrix = _e11;
    loop {
        let _e17 = i_1;
        let _e20 = d_3;
        if !(((_e17 < 100i) && (_e20 < 5000f))) {
            break;
        }
        {
            let _e28 = ro_5;
            let _e29 = rd_3;
            let _e30 = d_3;
            p_7 = (_e28 + (_e29 * _e30));
            let _e34 = p_7;
            let _e38 = shortestDistanceToTorus(_e34, vec2<f32>(0.5f, 0.2f));
            dist = _e38;
            let _e40 = dist;
            if (_e40 < 0.001f) {
                {
                    let _e43 = vUv_1;
                    let _e44 = textureSample(uDepthTexture, samp, _e43);
                    depth1_ = (_e44 * 0.5f);
                    let _e49 = depth1_;
                    linearDepth1_ = (exp2((_e49 * 26.575424f)) - 1f);
                    let _e56 = d_3;
                    let _e57 = linearDepth1_;
                    if (_e56 > _e57) {
                        {
                            break;
                        }
                    }
                    let _e59 = p_7;
                    let _e63 = estimateNormal(_e59, vec2<f32>(0.5f, 0.2f));
                    normal = _e63;
                    let _e65 = ro_5;
                    let _e66 = p_7;
                    eyeDirection = normalize((_e65 - _e66));
                    let _e70 = rd_3;
                    let _e71 = normal;
                    reflection = reflect(_e70, normalize(_e71));
                    dome = vec3<f32>(0f, 1f, 0f);
                    let _e80 = normal;
                    nor = normalize(_e80);
                    let _e83 = p_7;
                    perturb = sin((_e83 * 10f));
                    let _e88 = nor;
                    let _e89 = perturb;
                    let _e93 = eyeDirection;
                    let _e97 = spectrum((dot((_e88 + (_e89 * 0.05f)), _e93) * 2f));
                    iridescentColor = _e97;
                    let _e99 = reflection;
                    let _e100 = lightDirection;
                    specular2_ = clamp(dot(_e99, _e100), 0f, 1f);
                    let _e106 = specular2_;
                    let _e120 = specular2_;
                    specular2_ = (pow((((sin(((_e106 * 20f) - 3f)) * 0.5f) + 0.5f) + 0.1f), 32f) * _e120);
                    let _e122 = specular2_;
                    specular2_ = (_e122 * 0.1f);
                    let _e125 = specular2_;
                    let _e126 = reflection;
                    let _e127 = lightDirection;
                    specular2_ = (_e125 + (pow((clamp(dot(_e126, _e127), 0f, 1f) + 0.3f), 8f) * 0.1f));
                    let _e139 = nor;
                    let _e140 = dome;
                    shadow = pow(clamp(((dot(_e139, _e140) * 0.5f) + 1.2f), 0f, 1f), 3f);
                    let _e152 = iridescentColor;
                    let _e153 = shadow;
                    let _e155 = specular2_;
                    iridescentColor = ((_e152 * _e153) + vec3(_e155));
                    let _e158 = p_7;
                    let _e159 = cameraPos;
                    cameraDist = length((_e158 - _e159));
                    let _e165 = cameraDist;
                    shade = smoothstep(0f, 5f, _e165);
                    ambientColor = vec3<f32>(0.2f, 0.2f, 0.2f);
                    let _e173 = uColor;
                    diffuseColor = (_e173 * 2f);
                    specularColor = vec3<f32>(1f, 1f, 1f);
                    shininess = 32f;
                    let _e184 = lightDirection;
                    normalLightDirection = normalize(_e184);
                    let _e188 = normal;
                    let _e190 = normalLightDirection;
                    diffuseFactor = max(0f, dot(normalize(_e188), -(_e190)));
                    let _e195 = diffuseColor;
                    let _e196 = diffuseFactor;
                    diffuse = (_e195 * _e196);
                    let _e199 = cameraPos;
                    let _e200 = p_7;
                    viewDirection = normalize((_e199 - _e200));
                    let _e204 = normalLightDirection;
                    let _e205 = normal;
                    reflectionDirection = reflect(_e204, normalize(_e205));
                    let _e210 = viewDirection;
                    let _e211 = reflectionDirection;
                    let _e214 = shininess;
                    specularFactor = pow(max(0f, dot(_e210, _e211)), _e214);
                    let _e217 = specularColor;
                    let _e218 = specularFactor;
                    specular = (_e217 * _e218);
                    let _e221 = ambientColor;
                    let _e222 = diffuse;
                    let _e224 = specular;
                    phongColor = ((_e221 + _e222) + _e224);
                    let _e229 = phongColor;
                    let _e230 = shade;
                    finalColor = mix(vec3(0f), _e229, vec3(_e230));
                    let _e234 = finalColor;
                    let _e235 = iridescentColor;
                    let _e238 = mix(_e234, _e235, vec3(0.2f));
                    finalColor = _e238;
                    return _e238;
                }
            }
            let _e239 = d_3;
            let _e240 = dist;
            d_3 = (_e239 + _e240);
        }
        continuing {
            let _e25 = i_1;
            i_1 = (_e25 + 1i);
        }
    }
    return vec3(-1f);
}

@diagnostic(off,derivative_uniformity)
fn main_1() {
    var uv: vec2<f32>;
    var tanHalfFov: f32;
    var clipSpaceDir: vec3<f32>;
    var viewDir: vec3<f32>;
    var color_2: vec3<f32>;
    var cloudColor_1: vec4<f32>;
    var backgroundColor: vec4<f32>;
    var outputColor: vec4<f32>;
    var local: f32;

    uv = vUv_1;
    tanHalfFov = tan((radians(fov) / 2f));
    clipSpaceDir = vec3<f32>(((((uv.x - 0.5f) * aspectRatio) * 2f) * tanHalfFov), (((uv.y - 0.5f) * 2f) * tanHalfFov), -1f);
    viewDir = (cameraMatrix * vec4<f32>(clipSpaceDir.x, clipSpaceDir.y, clipSpaceDir.z, 0f)).xyz;
    viewDir = normalize(viewDir);
    FragColor = textureSample(inputBufferTexture, samp, uv);
    if (mode == 0i) {
        color_2 = rayMarchPhong(cameraPos, viewDir);
        if any((color_2 != vec3(-1f))) {
            FragColor = vec4<f32>(color_2.x, color_2.y, color_2.z, 1f);
        }
    } else {
        if (mode == 3i) {
            cloudColor_1 = rayMarchClouds(cameraPos, viewDir);
            backgroundColor = textureSample(inputBufferTexture, samp, uv);
            let _e96 = ((cloudColor_1.xyz * cloudColor_1.w) + (backgroundColor.xyz * (1f - cloudColor_1.w)));
            outputColor.x = _e96.x;
            outputColor.y = _e96.y;
            outputColor.z = _e96.z;
            outputColor.w = 1f;
            FragColor = outputColor;
        }
    }
    if (vIsPerspective_1 == 0f) {
        local = gl_FragCoord_1.z;
    } else {
        local = ((log2(vFragDepth_1) * logDepthBufFC) * 0.5f);
    }
    gl_FragDepth = local;
    return;
}

@fragment
@diagnostic(off,derivative_uniformity)
fn main(@location(0) vUv: vec2<f32>, @location(1) vFragDepth: f32, @location(2) vIsPerspective: f32, @builtin(position) gl_FragCoord: vec4<f32>) -> FragmentOutput {
    vUv_1 = vUv;
    vFragDepth_1 = vFragDepth;
    vIsPerspective_1 = vIsPerspective;
    gl_FragCoord_1 = gl_FragCoord;
    main_1();
    let _e9 = FragColor;
    let _e11 = gl_FragDepth;
    return FragmentOutput(_e9, _e11);
}
`;

export const redFragWGSL = `
@fragment
fn main() -> @location(0) vec4f {
  return vec4(1.0, 0.0, 0.0, 1.0);
}
`;

export const vertexShadowWGSL = `
@group(0) @binding(0)
var<uniform> projectionMatrix: mat4x4<f32>;
@group(0) @binding(1)
var<uniform> modelViewMatrix: mat4x4<f32>;

@vertex
fn main(
  @location(0) position: vec3f
) -> @builtin(position) vec4f {
  return projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
