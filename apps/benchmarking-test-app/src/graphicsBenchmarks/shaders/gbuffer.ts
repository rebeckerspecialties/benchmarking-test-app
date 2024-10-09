export const gbufferVertWGSL = `
struct VertexOutput {
    @location(0) vDiffuse: vec4<f32>,
    @location(1) vNormal: vec3<f32>,
    @location(2) vRoughness: f32,
    @location(3) vMetalness: f32,
    @location(4) vEmissive: vec3<f32>,
    @builtin(position) gl_Position: vec4<f32>,
}

var<private> position_1: vec3<f32>;
var<private> normal_1: vec3<f32>;
var<private> uv_1: vec2<f32>;
var<private> color_1: vec3<f32>;
var<private> roughness_1: f32;
var<private> metalness_1: f32;
var<private> emissive_1: vec3<f32>;
var<private> vDiffuse: vec4<f32>;
var<private> vNormal: vec3<f32>;
var<private> vRoughness: f32;
var<private> vMetalness: f32;
var<private> vEmissive: vec3<f32>;
@group(0) @binding(0)
var<uniform> projectionMatrix: mat4x4<f32>;
@group(0) @binding(1)
var<uniform> modelViewMatrix: mat4x4<f32>;
var<private> gl_Position: vec4<f32>;

fn main_1() {
    let _e15 = projectionMatrix;
    let _e16 = modelViewMatrix;
    let _e18 = position_1;
    gl_Position = ((_e15 * _e16) * vec4<f32>(_e18.x, _e18.y, _e18.z, 1f));
    let _e25 = color_1;
    vDiffuse = vec4<f32>(_e25.x, _e25.y, _e25.z, 1f);
    let _e31 = normal_1;
    let _e37 = modelViewMatrix;
    let _e40 = normal_1;
    let _e46 = modelViewMatrix;
    vNormal = normalize((vec4<f32>(_e40.x, _e40.y, _e40.z, 1f) * _e46).xyz);
    let _e50 = roughness_1;
    vRoughness = _e50;
    let _e51 = metalness_1;
    vMetalness = _e51;
    let _e52 = vEmissive;
    vEmissive = _e52;
    return;
}

@vertex
fn main(@location(0) position: vec3<f32>, @location(1) normal: vec3<f32>, @location(2) uv: vec2<f32>, @location(3) color: vec3<f32>, @location(4) roughness: f32, @location(5) metalness: f32, @location(6) emissive: vec3<f32>) -> VertexOutput {
    position_1 = position;
    normal_1 = normal;
    uv_1 = uv;
    color_1 = color;
    roughness_1 = roughness;
    metalness_1 = metalness;
    emissive_1 = emissive;
    main_1();
    let _e43 = vDiffuse;
    let _e45 = vNormal;
    let _e47 = vRoughness;
    let _e49 = vMetalness;
    let _e51 = vEmissive;
    let _e53 = gl_Position;
    return VertexOutput(_e43, _e45, _e47, _e49, _e51, _e53);
}
`;

export const gbufferFragWGSL = `struct Material {
    diffuse: vec4<f32>,
    normal: vec3<f32>,
    roughness: f32,
    metalness: f32,
    emissive: vec3<f32>,
}

struct FragmentOutput {
    @location(0) outColor: vec4<f32>,
}

const c_precision: f32 = 256f;
const c_precisionp1_: f32 = 257f;

var<private> vDiffuse_1: vec4<f32>;
var<private> vNormal_1: vec3<f32>;
var<private> vRoughness_1: f32;
var<private> vMetalness_1: f32;
var<private> vEmissive_1: vec3<f32>;
var<private> outColor: vec4<f32>;

fn color2float(color: vec3<f32>) -> f32 {
    var color_1: vec3<f32>;

    color_1 = color;
    let _e10 = color_1;
    let _e16 = color_1;
    color_1 = min((_e16 + vec3(0.0001f)), vec3(0.999999f));
    let _e23 = color_1;
    let _e28 = color_1;
    let _e34 = color_1;
    let _e39 = color_1;
    let _e47 = color_1;
    let _e52 = color_1;
    return ((floor(((_e28.x * c_precision) + 0.5f)) + (floor(((_e39.z * c_precision) + 0.5f)) * c_precisionp1_)) + ((floor(((_e52.y * c_precision) + 0.5f)) * c_precisionp1_) * c_precisionp1_));
}

fn OctWrap(v: vec2<f32>) -> vec2<f32> {
    var v_1: vec2<f32>;
    var w: vec2<f32>;

    v_1 = v;
    let _e11 = v_1;
    let _e13 = v_1;
    w = (vec2(1f) - abs(_e13.yx));
    let _e19 = v_1;
    if (_e19.x < 0f) {
        let _e24 = w;
        w.x = -(_e24.x);
    }
    let _e27 = v_1;
    if (_e27.y < 0f) {
        let _e32 = w;
        w.y = -(_e32.y);
    }
    let _e35 = w;
    return _e35;
}

fn encodeOctWrap(n: vec3<f32>) -> vec2<f32> {
    var n_1: vec3<f32>;
    var local: vec2<f32>;

    n_1 = n;
    let _e10 = n_1;
    let _e11 = n_1;
    let _e13 = n_1;
    let _e16 = n_1;
    let _e18 = n_1;
    let _e22 = n_1;
    let _e24 = n_1;
    n_1 = (_e10 / vec3(((abs(_e13.x) + abs(_e18.y)) + abs(_e24.z))));
    let _e30 = n_1;
    let _e32 = n_1;
    if (_e32.z > 0f) {
        let _e36 = n_1;
        local = _e36.xy;
    } else {
        let _e38 = n_1;
        let _e40 = n_1;
        let _e42 = OctWrap(_e40.xy);
        local = _e42;
    }
    let _e44 = local;
    n_1.x = _e44.x;
    n_1.y = _e44.y;
    let _e49 = n_1;
    let _e51 = n_1;
    let _e57 = ((_e51.xy * 0.5f) + vec2(0.5f));
    n_1.x = _e57.x;
    n_1.y = _e57.y;
    let _e62 = n_1;
    return _e62.xy;
}

fn packNormal(normal: vec3<f32>) -> f32 {
    var normal_1: vec3<f32>;

    normal_1 = normal;
    let _e11 = normal_1;
    let _e12 = encodeOctWrap(_e11);
    let _e14 = normal_1;
    let _e15 = encodeOctWrap(_e14);
    let _e18 = normal_1;
    let _e19 = encodeOctWrap(_e18);
    let _e21 = normal_1;
    let _e22 = encodeOctWrap(_e21);
    return bitcast<f32>(pack2x16float(_e22));
}

fn encodeRGBE8_(rgb: vec3<f32>) -> vec4<f32> {
    var rgb_1: vec3<f32>;
    var vEncoded: vec4<f32>;
    var maxComponent: f32;
    var fExp: f32;

    rgb_1 = rgb;
    let _e11 = rgb_1;
    let _e13 = rgb_1;
    let _e15 = rgb_1;
    let _e17 = rgb_1;
    let _e20 = rgb_1;
    let _e22 = rgb_1;
    let _e24 = rgb_1;
    let _e26 = rgb_1;
    let _e28 = rgb_1;
    let _e31 = rgb_1;
    maxComponent = max(max(_e26.x, _e28.y), _e31.z);
    let _e36 = maxComponent;
    let _e39 = maxComponent;
    fExp = ceil(log2(_e39));
    let _e43 = vEncoded;
    let _e45 = rgb_1;
    let _e47 = fExp;
    let _e50 = (_e45 / vec3(exp2(_e47)));
    vEncoded.x = _e50.x;
    vEncoded.y = _e50.y;
    vEncoded.z = _e50.z;
    let _e58 = fExp;
    vEncoded.w = ((_e58 + 128f) / 255f);
    let _e63 = vEncoded;
    return _e63;
}

fn vec4ToFloat(vec: vec4<f32>) -> f32 {
    var vec_1: vec4<f32>;
    var v_2: vec4<u32>;
    var value: u32;

    vec_1 = vec;
    let _e10 = vec_1;
    let _e16 = vec_1;
    vec_1 = min((_e16 + vec4(0.0001f)), vec4(0.999999f));
    let _e23 = vec_1;
    v_2 = vec4<u32>((_e23 * 255f));
    let _e28 = v_2;
    let _e32 = v_2;
    let _e37 = v_2;
    let _e42 = v_2;
    value = ((((_e28.w << 24u) | (_e32.z << 16u)) | (_e37.y << 8u)) | _e42.x);
    let _e47 = value;
    return bitcast<f32>(_e47);
}

fn packGBuffer(diffuse: vec4<f32>, normal_2: vec3<f32>, roughness: f32, metalness: f32, emissive: vec3<f32>) -> vec4<f32> {
    var diffuse_1: vec4<f32>;
    var normal_3: vec3<f32>;
    var roughness_1: f32;
    var metalness_1: f32;
    var emissive_1: vec3<f32>;
    var gBuffer: vec4<f32>;

    diffuse_1 = diffuse;
    normal_3 = normal_2;
    roughness_1 = roughness;
    metalness_1 = metalness;
    emissive_1 = emissive;
    let _e21 = diffuse_1;
    let _e22 = vec4ToFloat(_e21);
    gBuffer.x = _e22;
    let _e25 = normal_3;
    let _e26 = packNormal(_e25);
    gBuffer.y = _e26;
    let _e28 = roughness_1;
    let _e29 = metalness_1;
    let _e32 = roughness_1;
    let _e33 = metalness_1;
    let _e36 = color2float(vec3<f32>(_e32, _e33, 0f));
    gBuffer.z = _e36;
    let _e39 = emissive_1;
    let _e40 = encodeRGBE8_(_e39);
    let _e42 = emissive_1;
    let _e43 = encodeRGBE8_(_e42);
    let _e44 = vec4ToFloat(_e43);
    gBuffer.w = _e44;
    let _e45 = gBuffer;
    return _e45;
}

fn main_1() {
    let _e13 = vDiffuse_1;
    let _e14 = vNormal_1;
    let _e15 = vRoughness_1;
    let _e16 = vMetalness_1;
    let _e17 = vEmissive_1;
    let _e18 = packGBuffer(_e13, _e14, _e15, _e16, _e17);
    outColor = _e18;
    return;
}

@fragment
fn main(@location(0) vDiffuse: vec4<f32>, @location(1) vNormal: vec3<f32>, @location(2) vRoughness: f32, @location(3) vMetalness: f32, @location(4) vEmissive: vec3<f32>) -> FragmentOutput {
    vDiffuse_1 = vDiffuse;
    vNormal_1 = vNormal;
    vRoughness_1 = vRoughness;
    vMetalness_1 = vMetalness;
    vEmissive_1 = vEmissive;
    main_1();
    let _e27 = outColor;
    return FragmentOutput(_e27);
}
`;
