struct Material {
    diffuse: vec4<f32>,
    normal: vec3<f32>,
    roughness: f32,
    metalness: f32,
    emissive: vec3<f32>,
}

struct RayTracingInfo {
    NoV: f32,
    NoL: f32,
    NoH: f32,
    LoH: f32,
    VoH: f32,
    isDiffuseSample: bool,
    isEnvSample: bool,
}

struct RayTracingResult {
    gi: vec3<f32>,
    l: vec3<f32>,
    hitPos: vec3<f32>,
    isMissedRay: bool,
    brdf: vec3<f32>,
    pdf: f32,
}

struct EnvMisSample {
    pdf: f32,
    probability: f32,
    isEnvSample: bool,
}

struct FragmentOutput {
    @location(0) fragColor: vec4<f32>,
}

const c_precision: f32 = 256f;
const c_precisionp1_: f32 = 257f;

var<private> vUv_1: vec2<f32>;
var<private> fragColor: vec4<f32>;
@group(0) @binding(0) 
var accumulatedTexture: texture_2d<f32>;
@group(0) @binding(1) 
var depthTexture: texture_2d<f32>;
@group(0) @binding(2) 
var velocityTexture: texture_2d<f32>;
@group(0) @binding(3) 
var directLightTexture: texture_2d<f32>;
@group(0) @binding(4) 
var samp: sampler;
@group(1) @binding(0) 
var<uniform> backgroundColor: vec3<f32>;
@group(1) @binding(1) 
var<uniform> viewMatrix: mat4x4<f32>;
@group(1) @binding(2) 
var<uniform> projectionMatrix: mat4x4<f32>;
@group(1) @binding(3) 
var<uniform> projectionMatrixInverse: mat4x4<f32>;
@group(1) @binding(4) 
var<uniform> cameraMatrixWorld: mat4x4<f32>;
@group(1) @binding(5) 
var<uniform> maxEnvMapMipLevel: f32;
@group(1) @binding(6) 
var<uniform> rayDistance: f32;
@group(1) @binding(7) 
var<uniform> thickness: f32;
@group(1) @binding(8) 
var<uniform> envBlur: f32;
@group(1) @binding(9) 
var<uniform> resolution: vec2<f32>;
@group(1) @binding(10) 
var<uniform> cameraNear: f32;
@group(1) @binding(11) 
var<uniform> cameraFar: f32;
@group(1) @binding(12) 
var<uniform> nearMinusFar: f32;
@group(1) @binding(13) 
var<uniform> nearMulFar: f32;
@group(1) @binding(14) 
var<uniform> farMinusNear: f32;
@group(1) @binding(15) 
var<uniform> mode: i32;
var<private> invTexSize: vec2<f32>;
@group(2) @binding(0) 
var gBufferTexture_2: texture_2d<f32>;
@group(2) @binding(1) 
var gBufferSamp: sampler;
var<private> worldNormal: vec3<f32>;
var<private> worldPos_3: vec3<f32>;
var<private> mat: Material;

fn rand(co: vec2<f32>) -> f32 {
    var co_1: vec2<f32>;

    co_1 = co;
    let _e30 = co_1;
    let _e39 = co_1;
    let _e51 = co_1;
    let _e60 = co_1;
    return fract((sin(dot(_e60, vec2<f32>(12.9898f, 78.233f))) * 43758.547f));
}

fn blueNoise(co_2: vec2<f32>) -> vec4<f32> {
    var co_3: vec2<f32>;

    co_3 = co_2;
    let _e27 = co_3;
    let _e28 = rand(_e27);
    let _e30 = co_3;
    let _e31 = rand(_e30);
    let _e33 = co_3;
    let _e34 = rand(_e33);
    let _e36 = co_3;
    let _e37 = rand(_e36);
    return vec4<f32>(_e28, _e31, _e34, _e37);
}

fn color2float(color: vec3<f32>) -> f32 {
    var color_1: vec3<f32>;

    color_1 = color;
    let _e30 = color_1;
    let _e36 = color_1;
    color_1 = min((_e36 + vec3(0.0001f)), vec3(0.999999f));
    let _e43 = color_1;
    let _e48 = color_1;
    let _e54 = color_1;
    let _e59 = color_1;
    let _e67 = color_1;
    let _e72 = color_1;
    return ((floor(((_e48.x * c_precision) + 0.5f)) + (floor(((_e59.z * c_precision) + 0.5f)) * c_precisionp1_)) + ((floor(((_e72.y * c_precision) + 0.5f)) * c_precisionp1_) * c_precisionp1_));
}

fn float2color(value: f32) -> vec3<f32> {
    var value_1: f32;
    var color_2: vec3<f32>;

    value_1 = value;
    let _e33 = value_1;
    color_2.x = ((_e33 - (floor((_e33 / c_precisionp1_)) * c_precisionp1_)) / c_precision);
    let _e40 = value_1;
    let _e42 = value_1;
    let _e45 = value_1;
    let _e47 = value_1;
    let _e49 = floor((_e47 / c_precisionp1_));
    color_2.z = ((_e49 - (floor((_e49 / c_precisionp1_)) * c_precisionp1_)) / c_precision);
    let _e56 = value_1;
    let _e61 = value_1;
    color_2.y = (floor((_e61 / 66049f)) / c_precision);
    let _e68 = color_2;
    color_2 = (_e68 - vec3(0.0001f));
    let _e75 = color_2;
    color_2 = max(_e75, vec3(0f));
    let _e79 = color_2;
    return _e79;
}

fn OctWrap(v: vec2<f32>) -> vec2<f32> {
    var v_1: vec2<f32>;
    var w: vec2<f32>;

    v_1 = v;
    let _e31 = v_1;
    let _e33 = v_1;
    w = (vec2(1f) - abs(_e33.yx));
    let _e39 = v_1;
    if (_e39.x < 0f) {
        let _e44 = w;
        w.x = -(_e44.x);
    }
    let _e47 = v_1;
    if (_e47.y < 0f) {
        let _e52 = w;
        w.y = -(_e52.y);
    }
    let _e55 = w;
    return _e55;
}

fn encodeOctWrap(n: vec3<f32>) -> vec2<f32> {
    var n_1: vec3<f32>;
    var local: vec2<f32>;

    n_1 = n;
    let _e30 = n_1;
    let _e31 = n_1;
    let _e33 = n_1;
    let _e36 = n_1;
    let _e38 = n_1;
    let _e42 = n_1;
    let _e44 = n_1;
    n_1 = (_e30 / vec3(((abs(_e33.x) + abs(_e38.y)) + abs(_e44.z))));
    let _e50 = n_1;
    let _e52 = n_1;
    if (_e52.z > 0f) {
        let _e56 = n_1;
        local = _e56.xy;
    } else {
        let _e58 = n_1;
        let _e60 = n_1;
        let _e62 = OctWrap(_e60.xy);
        local = _e62;
    }
    let _e64 = local;
    n_1.x = _e64.x;
    n_1.y = _e64.y;
    let _e69 = n_1;
    let _e71 = n_1;
    let _e77 = ((_e71.xy * 0.5f) + vec2(0.5f));
    n_1.x = _e77.x;
    n_1.y = _e77.y;
    let _e82 = n_1;
    return _e82.xy;
}

fn decodeOctWrap(f: vec2<f32>) -> vec3<f32> {
    var f_1: vec2<f32>;
    var n_2: vec3<f32>;
    var t: f32;
    var local_1: f32;
    var local_2: f32;

    f_1 = f;
    let _e30 = f_1;
    f_1 = ((_e30 * 2f) - vec2(1f));
    let _e36 = f_1;
    let _e38 = f_1;
    let _e41 = f_1;
    let _e43 = f_1;
    let _e47 = f_1;
    let _e49 = f_1;
    n_2 = vec3<f32>(_e36.x, _e38.y, ((1f - abs(_e43.x)) - abs(_e49.y)));
    let _e55 = n_2;
    let _e59 = n_2;
    t = max(-(_e59.z), 0f);
    let _e66 = n_2;
    let _e68 = n_2;
    if (_e68.x >= 0f) {
        let _e72 = t;
        local_1 = -(_e72);
    } else {
        let _e74 = t;
        local_1 = _e74;
    }
    let _e76 = local_1;
    n_2.x = (_e66.x + _e76);
    let _e79 = n_2;
    let _e81 = n_2;
    if (_e81.y >= 0f) {
        let _e85 = t;
        local_2 = -(_e85);
    } else {
        let _e87 = t;
        local_2 = _e87;
    }
    let _e89 = local_2;
    n_2.y = (_e79.y + _e89);
    let _e92 = n_2;
    return normalize(_e92);
}

fn packNormal(normal: vec3<f32>) -> f32 {
    var normal_1: vec3<f32>;

    normal_1 = normal;
    let _e31 = normal_1;
    let _e32 = encodeOctWrap(_e31);
    let _e34 = normal_1;
    let _e35 = encodeOctWrap(_e34);
    let _e38 = normal_1;
    let _e39 = encodeOctWrap(_e38);
    let _e41 = normal_1;
    let _e42 = encodeOctWrap(_e41);
    return bitcast<f32>(pack2x16float(_e42));
}

fn unpackNormal(packedNormal: f32) -> vec3<f32> {
    var packedNormal_1: f32;

    packedNormal_1 = packedNormal;
    let _e31 = packedNormal_1;
    let _e34 = packedNormal_1;
    let _e38 = packedNormal_1;
    let _e41 = packedNormal_1;
    let _e44 = decodeOctWrap(unpack2x16float(bitcast<u32>(_e41)));
    return _e44;
}

fn packTwoVec4_(v1_: vec4<f32>, v2_: vec4<f32>) -> vec4<f32> {
    var v1_1: vec4<f32>;
    var v2_1: vec4<f32>;
    var encoded: vec4<f32> = vec4(0f);
    var v1r: u32;
    var v1g: u32;
    var v2r: u32;
    var v2g: u32;

    v1_1 = v1_;
    v2_1 = v2_;
    let _e35 = v1_1;
    v1_1 = (_e35 + vec4(0.0001f));
    let _e39 = v2_1;
    v2_1 = (_e39 + vec4(0.0001f));
    let _e43 = v1_1;
    let _e45 = v1_1;
    v1r = pack2x16float(_e45.xy);
    let _e49 = v1_1;
    let _e51 = v1_1;
    v1g = pack2x16float(_e51.zw);
    let _e55 = v2_1;
    let _e57 = v2_1;
    v2r = pack2x16float(_e57.xy);
    let _e61 = v2_1;
    let _e63 = v2_1;
    v2g = pack2x16float(_e63.zw);
    let _e69 = v1r;
    encoded.x = bitcast<f32>(_e69);
    let _e73 = v1g;
    encoded.y = bitcast<f32>(_e73);
    let _e77 = v2r;
    encoded.z = bitcast<f32>(_e77);
    let _e81 = v2g;
    encoded.w = bitcast<f32>(_e81);
    let _e83 = encoded;
    return _e83;
}

fn unpackTwoVec4_(encoded_1: vec4<f32>, v1_2: ptr<function, vec4<f32>>, v2_2: ptr<function, vec4<f32>>) {
    var encoded_2: vec4<f32>;
    var r: u32;
    var g: u32;
    var b: u32;
    var a: u32;

    encoded_2 = encoded_1;
    let _e32 = encoded_2;
    let _e34 = encoded_2;
    r = bitcast<u32>(_e34.x);
    let _e38 = encoded_2;
    let _e40 = encoded_2;
    g = bitcast<u32>(_e40.y);
    let _e44 = encoded_2;
    let _e46 = encoded_2;
    b = bitcast<u32>(_e46.z);
    let _e50 = encoded_2;
    let _e52 = encoded_2;
    a = bitcast<u32>(_e52.w);
    let _e56 = (*v1_2);
    let _e59 = r;
    let _e60 = unpack2x16float(_e59);
    (*v1_2).x = _e60.x;
    (*v1_2).y = _e60.y;
    let _e65 = (*v1_2);
    let _e68 = g;
    let _e69 = unpack2x16float(_e68);
    (*v1_2).z = _e69.x;
    (*v1_2).w = _e69.y;
    let _e74 = (*v2_2);
    let _e77 = b;
    let _e78 = unpack2x16float(_e77);
    (*v2_2).x = _e78.x;
    (*v2_2).y = _e78.y;
    let _e83 = (*v2_2);
    let _e86 = a;
    let _e87 = unpack2x16float(_e86);
    (*v2_2).z = _e87.x;
    (*v2_2).w = _e87.y;
    let _e92 = (*v1_2);
    (*v1_2) = (_e92 - vec4(0.0001f));
    let _e96 = (*v2_2);
    (*v2_2) = (_e96 - vec4(0.0001f));
    return;
}

fn unpackTwoVec4_1(encoded_3: vec4<f32>, index: i32) -> vec4<f32> {
    var encoded_4: vec4<f32>;
    var local_3: f32;
    var local_4: f32;
    var r_1: u32;
    var local_5: f32;
    var local_6: f32;
    var g_1: u32;
    var v_2: vec4<f32>;

    encoded_4 = encoded_3;
    if (index == 0i) {
        let _e33 = encoded_4;
        local_3 = _e33.x;
    } else {
        let _e35 = encoded_4;
        local_3 = _e35.z;
    }
    if (index == 0i) {
        let _e41 = encoded_4;
        local_4 = _e41.x;
    } else {
        let _e43 = encoded_4;
        local_4 = _e43.z;
    }
    let _e46 = local_4;
    r_1 = bitcast<u32>(_e46);
    if (index == 0i) {
        let _e51 = encoded_4;
        local_5 = _e51.y;
    } else {
        let _e53 = encoded_4;
        local_5 = _e53.w;
    }
    if (index == 0i) {
        let _e59 = encoded_4;
        local_6 = _e59.y;
    } else {
        let _e61 = encoded_4;
        local_6 = _e61.w;
    }
    let _e64 = local_6;
    g_1 = bitcast<u32>(_e64);
    let _e68 = v_2;
    let _e71 = r_1;
    let _e72 = unpack2x16float(_e71);
    v_2.x = _e72.x;
    v_2.y = _e72.y;
    let _e77 = v_2;
    let _e80 = g_1;
    let _e81 = unpack2x16float(_e80);
    v_2.z = _e81.x;
    v_2.w = _e81.y;
    let _e86 = v_2;
    v_2 = (_e86 - vec4(0.0001f));
    let _e90 = v_2;
    return _e90;
}

fn encodeRGBE8_(rgb: vec3<f32>) -> vec4<f32> {
    var rgb_1: vec3<f32>;
    var vEncoded: vec4<f32>;
    var maxComponent: f32;
    var fExp: f32;

    rgb_1 = rgb;
    let _e31 = rgb_1;
    let _e33 = rgb_1;
    let _e35 = rgb_1;
    let _e37 = rgb_1;
    let _e40 = rgb_1;
    let _e42 = rgb_1;
    let _e44 = rgb_1;
    let _e46 = rgb_1;
    let _e48 = rgb_1;
    let _e51 = rgb_1;
    maxComponent = max(max(_e46.x, _e48.y), _e51.z);
    let _e56 = maxComponent;
    let _e59 = maxComponent;
    fExp = ceil(log2(_e59));
    let _e63 = vEncoded;
    let _e65 = rgb_1;
    let _e67 = fExp;
    let _e70 = (_e65 / vec3(exp2(_e67)));
    vEncoded.x = _e70.x;
    vEncoded.y = _e70.y;
    vEncoded.z = _e70.z;
    let _e78 = fExp;
    vEncoded.w = ((_e78 + 128f) / 255f);
    let _e83 = vEncoded;
    return _e83;
}

fn decodeRGBE8_(rgbe: vec4<f32>) -> vec3<f32> {
    var rgbe_1: vec4<f32>;
    var vDecoded: vec3<f32>;
    var fExp_1: f32;

    rgbe_1 = rgbe;
    let _e31 = rgbe_1;
    fExp_1 = ((_e31.w * 255f) - 128f);
    let _e38 = rgbe_1;
    let _e41 = fExp_1;
    vDecoded = (_e38.xyz * exp2(_e41));
    let _e44 = vDecoded;
    return _e44;
}

fn vec4ToFloat(vec: vec4<f32>) -> f32 {
    var vec_1: vec4<f32>;
    var v_3: vec4<u32>;
    var value_2: u32;

    vec_1 = vec;
    let _e30 = vec_1;
    let _e36 = vec_1;
    vec_1 = min((_e36 + vec4(0.0001f)), vec4(0.999999f));
    let _e43 = vec_1;
    v_3 = vec4<u32>((_e43 * 255f));
    let _e48 = v_3;
    let _e52 = v_3;
    let _e57 = v_3;
    let _e62 = v_3;
    value_2 = ((((_e48.w << 24u) | (_e52.z << 16u)) | (_e57.y << 8u)) | _e62.x);
    let _e67 = value_2;
    return bitcast<f32>(_e67);
}

fn floatToVec4_(f_2: f32) -> vec4<f32> {
    var f_3: f32;
    var value_3: u32;
    var v_4: vec4<f32>;

    f_3 = f_2;
    let _e31 = f_3;
    value_3 = bitcast<u32>(_e31);
    let _e36 = value_3;
    v_4.x = (f32((_e36 & 255u)) / 255f);
    let _e43 = value_3;
    v_4.y = (f32(((_e43 >> 8u) & 255u)) / 255f);
    let _e52 = value_3;
    v_4.z = (f32(((_e52 >> 16u) & 255u)) / 255f);
    let _e61 = value_3;
    v_4.w = (f32(((_e61 >> 24u) & 255u)) / 255f);
    let _e69 = v_4;
    v_4 = (_e69 - vec4(0.0001f));
    let _e76 = v_4;
    v_4 = max(_e76, vec4(0f));
    let _e80 = v_4;
    return _e80;
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
    let _e41 = diffuse_1;
    let _e42 = vec4ToFloat(_e41);
    gBuffer.x = _e42;
    let _e45 = normal_3;
    let _e46 = packNormal(_e45);
    gBuffer.y = _e46;
    let _e48 = roughness_1;
    let _e49 = metalness_1;
    let _e52 = roughness_1;
    let _e53 = metalness_1;
    let _e56 = color2float(vec3<f32>(_e52, _e53, 0f));
    gBuffer.z = _e56;
    let _e59 = emissive_1;
    let _e60 = encodeRGBE8_(_e59);
    let _e62 = emissive_1;
    let _e63 = encodeRGBE8_(_e62);
    let _e64 = vec4ToFloat(_e63);
    gBuffer.w = _e64;
    let _e65 = gBuffer;
    return _e65;
}

fn getMaterial(gBufferTexture: texture_2d<f32>, uv: vec2<f32>) -> Material {
    var uv_1: vec2<f32>;
    var gBuffer_1: vec4<f32>;
    var diffuse_2: vec4<f32>;
    var normal_4: vec3<f32>;
    var roughnessMetalness: vec3<f32>;
    var roughness_2: f32;
    var metalness_2: f32;
    var emissive_2: vec3<f32>;

    uv_1 = uv;
    let _e33 = uv_1;
    let _e35 = textureSampleLevel(gBufferTexture, gBufferSamp, _e33, 0f);
    gBuffer_1 = _e35;
    let _e37 = gBuffer_1;
    let _e39 = gBuffer_1;
    let _e41 = floatToVec4_(_e39.x);
    diffuse_2 = _e41;
    let _e43 = gBuffer_1;
    let _e45 = gBuffer_1;
    let _e47 = unpackNormal(_e45.y);
    normal_4 = _e47;
    let _e49 = gBuffer_1;
    let _e51 = gBuffer_1;
    let _e53 = float2color(_e51.z);
    roughnessMetalness = _e53;
    let _e55 = roughnessMetalness;
    roughness_2 = _e55.x;
    let _e58 = roughnessMetalness;
    metalness_2 = _e58.y;
    let _e61 = gBuffer_1;
    let _e63 = gBuffer_1;
    let _e65 = floatToVec4_(_e63.w);
    let _e66 = gBuffer_1;
    let _e68 = gBuffer_1;
    let _e70 = floatToVec4_(_e68.w);
    let _e71 = decodeRGBE8_(_e70);
    emissive_2 = _e71;
    let _e73 = diffuse_2;
    let _e74 = normal_4;
    let _e75 = roughness_2;
    let _e76 = metalness_2;
    let _e77 = emissive_2;
    return Material(_e73, _e74, _e75, _e76, _e77);
}

fn getMaterial_1(uv_2: vec2<f32>) -> Material {
    var uv_3: vec2<f32>;

    uv_3 = uv_2;
    let _e31 = uv_3;
    let _e32 = getMaterial(gBufferTexture_2, _e31);
    return _e32;
}

fn getNormal(gBufferTexture_1: texture_2d<f32>, uv_4: vec2<f32>) -> vec3<f32> {
    var uv_5: vec2<f32>;

    uv_5 = uv_4;
    let _e33 = uv_5;
    let _e35 = textureSampleLevel(gBufferTexture_1, samp, _e33, 0f);
    let _e39 = uv_5;
    let _e41 = textureSampleLevel(gBufferTexture_1, samp, _e39, 0f);
    let _e43 = unpackNormal(_e41.y);
    return _e43;
}

fn getViewZ(depth: f32) -> f32 {
    let _e29 = nearMulFar;
    let _e30 = farMinusNear;
    let _e32 = cameraFar;
    return (_e29 / ((_e30 * depth) - _e32));
}

fn getViewPosition(viewZ: f32) -> vec3<f32> {
    var viewZ_1: f32;
    var clipW: f32;
    var clipPosition: vec4<f32>;
    var p: vec3<f32>;

    viewZ_1 = viewZ;
    let _e34 = projectionMatrix[2][3];
    let _e35 = viewZ_1;
    let _e41 = projectionMatrix[3][3];
    clipW = ((_e34 * _e35) + _e41);
    let _e44 = vUv_1;
    let _e45 = viewZ_1;
    let _e53 = ((vec3<f32>(_e44.x, _e44.y, _e45) - vec3(0.5f)) * 2f);
    clipPosition = vec4<f32>(_e53.x, _e53.y, _e53.z, 1f);
    let _e60 = clipPosition;
    let _e61 = clipW;
    clipPosition = (_e60 * _e61);
    let _e63 = projectionMatrixInverse;
    let _e64 = clipPosition;
    p = (_e63 * _e64).xyz;
    let _e69 = viewZ_1;
    p.z = _e69;
    let _e70 = p;
    return _e70;
}

fn viewSpaceToScreenSpace(position: vec3<f32>) -> vec2<f32> {
    var projectedCoord: vec4<f32>;

    let _e29 = projectionMatrix;
    projectedCoord = (_e29 * vec4<f32>(position.x, position.y, position.z, 1f));
    let _e37 = projectedCoord;
    let _e39 = projectedCoord;
    let _e41 = projectedCoord;
    let _e44 = (_e39.xy / vec2(_e41.w));
    projectedCoord.x = _e44.x;
    projectedCoord.y = _e44.y;
    let _e49 = projectedCoord;
    let _e51 = projectedCoord;
    let _e57 = ((_e51.xy * 0.5f) + vec2(0.5f));
    projectedCoord.x = _e57.x;
    projectedCoord.y = _e57.y;
    let _e62 = projectedCoord;
    return _e62.xy;
}

fn worldSpaceToViewSpace(worldPosition: vec3<f32>) -> vec3<f32> {
    var worldPosition_1: vec3<f32>;
    var viewPosition: vec4<f32>;

    worldPosition_1 = worldPosition;
    let _e30 = viewMatrix;
    let _e31 = worldPosition_1;
    viewPosition = (_e30 * vec4<f32>(_e31.x, _e31.y, _e31.z, 1f));
    let _e39 = viewPosition;
    let _e41 = viewPosition;
    return (_e39.xyz / vec3(_e41.w));
}

fn getBasisFromNormal(normal_5: vec3<f32>) -> mat3x3<f32> {
    var other: vec3<f32>;
    var ortho: vec3<f32>;
    var ortho2_: vec3<f32>;

    if (abs(normal_5.x) > 0.5f) {
        {
            other = vec3<f32>(0f, 1f, 0f);
        }
    } else {
        {
            other = vec3<f32>(1f, 0f, 0f);
        }
    }
    let _e44 = other;
    let _e47 = other;
    ortho = normalize(cross(normal_5, _e47));
    let _e52 = ortho;
    let _e55 = ortho;
    ortho2_ = normalize(cross(normal_5, _e55));
    let _e59 = ortho2_;
    let _e60 = ortho;
    return mat3x3<f32>(vec3<f32>(_e59.x, _e59.y, _e59.z), vec3<f32>(_e60.x, _e60.y, _e60.z), vec3<f32>(normal_5.x, normal_5.y, normal_5.z));
}

fn F_Schlick(f0_: vec3<f32>, theta: f32) -> vec3<f32> {
    return (f0_ + ((vec3(1f) - f0_) * pow((1f - theta), 5f)));
}

fn F_Schlick_1(f0_1: f32, f90_: f32, theta_1: f32) -> f32 {
    return (f0_1 + ((f90_ - f0_1) * pow((1f - theta_1), 5f)));
}

fn D_GTR(roughness_3: f32, NoH: f32, k: f32) -> f32 {
    var a2_: f32;

    a2_ = pow(roughness_3, 2f);
    let _e35 = a2_;
    let _e38 = a2_;
    let _e39 = a2_;
    let _e47 = a2_;
    let _e48 = a2_;
    return (_e35 / (3.1415927f * pow((((NoH * NoH) * ((_e47 * _e48) - 1f)) + 1f), k)));
}

fn SmithG(NDotV: f32, alphaG: f32) -> f32 {
    var a_1: f32;
    var b_1: f32;

    a_1 = (alphaG * alphaG);
    b_1 = (NDotV * NDotV);
    let _e36 = a_1;
    let _e37 = b_1;
    let _e39 = a_1;
    let _e40 = b_1;
    let _e43 = a_1;
    let _e44 = b_1;
    let _e46 = a_1;
    let _e47 = b_1;
    return ((2f * NDotV) / (NDotV + sqrt(((_e43 + _e44) - (_e46 * _e47)))));
}

fn GGXVNDFPdf(NoH_1: f32, NoV: f32, roughness_4: f32) -> f32 {
    var D: f32;
    var G1_: f32;

    let _e33 = D_GTR(roughness_4, NoH_1, 2f);
    D = _e33;
    let _e37 = SmithG(NoV, (roughness_4 * roughness_4));
    G1_ = _e37;
    let _e39 = D;
    let _e40 = G1_;
    return ((_e39 * _e40) / max(0.00001f, (4f * NoV)));
}

fn GeometryTerm(NoL: f32, NoV_1: f32, roughness_5: f32) -> f32 {
    var a2_1: f32;
    var G1_1: f32;
    var G2_: f32;

    a2_1 = (roughness_5 * roughness_5);
    let _e34 = a2_1;
    let _e35 = SmithG(NoV_1, _e34);
    G1_1 = _e35;
    let _e38 = a2_1;
    let _e39 = SmithG(NoL, _e38);
    G2_ = _e39;
    let _e41 = G1_1;
    let _e42 = G2_;
    return (_e41 * _e42);
}

fn evalDisneyDiffuse(NoL_1: f32, NoV_2: f32, LoH: f32, roughness_6: f32, metalness_3: f32) -> vec3<f32> {
    var FD90_: f32;
    var a_2: f32;
    var b_2: f32;

    FD90_ = (0.5f + ((2f * roughness_6) * pow(LoH, 2f)));
    let _e45 = FD90_;
    let _e46 = F_Schlick_1(1f, _e45, NoL_1);
    a_2 = _e46;
    let _e51 = FD90_;
    let _e52 = F_Schlick_1(1f, _e51, NoV_2);
    b_2 = _e52;
    let _e54 = a_2;
    let _e55 = b_2;
    return vec3((((_e54 * _e55) / 3.1415927f) * (1f - metalness_3)));
}

fn evalDisneySpecular(roughness_7: f32, NoH_2: f32, NoV_3: f32, NoL_2: f32) -> vec3<f32> {
    var D_1: f32;
    var G: f32;
    var spec: vec3<f32>;

    let _e34 = D_GTR(roughness_7, NoH_2, 2f);
    D_1 = _e34;
    let _e58 = GeometryTerm(NoL_2, NoV_3, pow((0.5f + (roughness_7 * 0.5f)), 2f));
    G = _e58;
    let _e60 = D_1;
    let _e61 = G;
    spec = vec3(((_e60 * _e61) / ((4f * NoL_2) * NoV_3)));
    let _e69 = spec;
    return _e69;
}

fn SampleGGXVNDF(V: vec3<f32>, ax: f32, ay: f32, r1_: f32, r2_: f32) -> vec3<f32> {
    var Vh: vec3<f32>;
    var lensq: f32;
    var local_7: vec3<f32>;
    var T1_: vec3<f32>;
    var T2_: vec3<f32>;
    var r_2: f32;
    var phi: f32;
    var t1_: f32;
    var t2_: f32;
    var s: f32;
    var Nh: vec3<f32>;

    Vh = normalize(vec3<f32>((ax * V.x), (ay * V.y), V.z));
    let _e47 = Vh;
    let _e49 = Vh;
    let _e52 = Vh;
    let _e54 = Vh;
    lensq = ((_e47.x * _e49.x) + (_e52.y * _e54.y));
    let _e59 = lensq;
    if (_e59 > 0f) {
        let _e62 = Vh;
        let _e65 = Vh;
        let _e70 = lensq;
        local_7 = (vec3<f32>(-(_e62.y), _e65.x, 0f) * inverseSqrt(_e70));
    } else {
        local_7 = vec3<f32>(1f, 0f, 0f);
    }
    let _e78 = local_7;
    T1_ = _e78;
    let _e82 = Vh;
    let _e83 = T1_;
    T2_ = cross(_e82, _e83);
    r_2 = sqrt(r1_);
    phi = (6.2831855f * r2_);
    let _e93 = r_2;
    let _e95 = phi;
    t1_ = (_e93 * cos(_e95));
    let _e99 = r_2;
    let _e101 = phi;
    t2_ = (_e99 * sin(_e101));
    let _e107 = Vh;
    s = (0.5f * (1f + _e107.z));
    let _e113 = s;
    let _e116 = t1_;
    let _e117 = t1_;
    let _e121 = t1_;
    let _e122 = t1_;
    let _e127 = s;
    let _e128 = t2_;
    t2_ = (((1f - _e113) * sqrt((1f - (_e121 * _e122)))) + (_e127 * _e128));
    let _e131 = t1_;
    let _e132 = T1_;
    let _e134 = t2_;
    let _e135 = T2_;
    let _e140 = t1_;
    let _e141 = t1_;
    let _e144 = t2_;
    let _e145 = t2_;
    let _e150 = t1_;
    let _e151 = t1_;
    let _e154 = t2_;
    let _e155 = t2_;
    let _e161 = t1_;
    let _e162 = t1_;
    let _e165 = t2_;
    let _e166 = t2_;
    let _e171 = t1_;
    let _e172 = t1_;
    let _e175 = t2_;
    let _e176 = t2_;
    let _e181 = Vh;
    Nh = (((_e131 * _e132) + (_e134 * _e135)) + (sqrt(max(0f, ((1f - (_e171 * _e172)) - (_e175 * _e176)))) * _e181));
    let _e185 = Nh;
    let _e188 = Nh;
    let _e192 = Nh;
    let _e195 = Nh;
    let _e199 = Nh;
    let _e202 = Nh;
    let _e206 = Nh;
    let _e209 = Nh;
    return normalize(vec3<f32>((ax * _e199.x), (ay * _e202.y), max(0f, _e209.z)));
}

fn Onb(N: vec3<f32>, T: ptr<function, vec3<f32>>, B: ptr<function, vec3<f32>>) {
    var local_8: vec3<f32>;
    var up: vec3<f32>;

    if (abs(N.z) < 0.9999999f) {
        local_8 = vec3<f32>(0f, 0f, 1f);
    } else {
        local_8 = vec3<f32>(1f, 0f, 0f);
    }
    let _e51 = local_8;
    up = _e51;
    let _e54 = up;
    let _e57 = up;
    (*T) = normalize(cross(_e57, N));
    let _e61 = (*T);
    (*B) = cross(N, _e61);
    return;
}

fn ToLocal(X: vec3<f32>, Y: vec3<f32>, Z: vec3<f32>, V_1: vec3<f32>) -> vec3<f32> {
    return vec3<f32>(dot(V_1, X), dot(V_1, Y), dot(V_1, Z));
}

fn ToWorld(X_1: vec3<f32>, Y_1: vec3<f32>, Z_1: vec3<f32>, V_2: vec3<f32>) -> vec3<f32> {
    return (((V_2.x * X_1) + (V_2.y * Y_1)) + (V_2.z * Z_1));
}

fn cosineSampleHemisphere(n_3: vec3<f32>, u: vec2<f32>) -> vec3<f32> {
    var r_3: f32;
    var theta_2: f32;
    var b_3: vec3<f32>;
    var t_1: vec3<f32>;

    r_3 = sqrt(u.x);
    theta_2 = (6.2831855f * u.y);
    b_3 = normalize(cross(n_3, vec3<f32>(0f, 1f, 1f)));
    let _e61 = b_3;
    t_1 = cross(_e61, n_3);
    let _e64 = r_3;
    let _e66 = theta_2;
    let _e69 = b_3;
    let _e80 = r_3;
    let _e82 = theta_2;
    let _e85 = t_1;
    let _e88 = r_3;
    let _e90 = theta_2;
    let _e93 = b_3;
    let _e104 = r_3;
    let _e106 = theta_2;
    let _e109 = t_1;
    return normalize(((((_e88 * sin(_e90)) * _e93) + (sqrt((1f - u.x)) * n_3)) + ((_e104 * cos(_e106)) * _e109)));
}

fn misHeuristic(a_3: f32, b_4: f32) -> f32 {
    var a_4: f32;
    var b_5: f32;
    var aa: f32;
    var bb: f32;

    a_4 = a_3;
    b_5 = b_4;
    let _e32 = a_4;
    let _e33 = a_4;
    aa = (_e32 * _e33);
    let _e36 = b_5;
    let _e37 = b_5;
    bb = (_e36 * _e37);
    let _e40 = aa;
    let _e41 = aa;
    let _e42 = bb;
    return (_e40 / (_e41 + _e42));
}

fn alignToNormal(normal_6: vec3<f32>, direction: vec3<f32>) -> vec3<f32> {
    var tangent: vec3<f32>;
    var bitangent: vec3<f32>;
    var localDir: vec3<f32>;
    var localDirAligned: vec3<f32>;
    var alignedDir: vec3<f32>;

    Onb(normal_6, (&tangent), (&bitangent));
    let _e38 = tangent;
    let _e39 = bitangent;
    let _e40 = ToLocal(_e38, _e39, normal_6, direction);
    localDir = _e40;
    let _e42 = localDir;
    let _e44 = localDir;
    let _e46 = localDir;
    let _e48 = localDir;
    localDirAligned = vec3<f32>(_e42.x, _e44.y, abs(_e48.z));
    let _e56 = tangent;
    let _e57 = bitangent;
    let _e58 = localDirAligned;
    let _e59 = ToWorld(_e56, _e57, normal_6, _e58);
    alignedDir = _e59;
    let _e61 = alignedDir;
    return _e61;
}

fn getFlatness(g_2: vec3<f32>, rp: vec3<f32>) -> f32 {
    var g_3: vec3<f32>;
    var rp_1: vec3<f32>;
    var gw: vec3<f32>;
    var pw: vec3<f32>;
    var wfcurvature: f32;

    g_3 = g_2;
    rp_1 = rp;
    let _e33 = g_3;
    let _e34 = fwidth(_e33);
    gw = _e34;
    let _e37 = rp_1;
    let _e38 = fwidth(_e37);
    pw = _e38;
    let _e41 = gw;
    let _e44 = pw;
    wfcurvature = (length(_e41) / length(_e44));
    let _e53 = wfcurvature;
    wfcurvature = smoothstep(0f, 30f, _e53);
    let _e58 = wfcurvature;
    return clamp(_e58, 0f, 1f);
}

fn getSaturation(c: vec3<f32>) -> f32 {
    var c_1: vec3<f32>;
    var maxComponent_1: f32;
    var minComponent: f32;
    var delta: f32;

    c_1 = c;
    let _e33 = c_1;
    let _e35 = c_1;
    let _e37 = c_1;
    let _e39 = c_1;
    let _e42 = c_1;
    let _e44 = c_1;
    let _e46 = c_1;
    let _e48 = c_1;
    let _e50 = c_1;
    let _e53 = c_1;
    maxComponent_1 = max(max(_e48.x, _e50.y), _e53.z);
    let _e57 = c_1;
    let _e59 = c_1;
    let _e61 = c_1;
    let _e63 = c_1;
    let _e66 = c_1;
    let _e68 = c_1;
    let _e70 = c_1;
    let _e72 = c_1;
    let _e74 = c_1;
    let _e77 = c_1;
    minComponent = min(min(_e72.x, _e74.y), _e77.z);
    let _e81 = maxComponent_1;
    let _e82 = minComponent;
    delta = (_e81 - _e82);
    let _e85 = maxComponent_1;
    let _e86 = minComponent;
    if (_e85 == _e86) {
        {
            return 0f;
        }
    } else {
        {
            let _e89 = delta;
            let _e90 = maxComponent_1;
            return (_e89 / _e90);
        }
    }
}

fn BinarySearch(dir: ptr<function, vec3<f32>>, hitPos: ptr<function, vec3<f32>>) -> vec2<f32> {
    var rayHitDepthDifference: f32;
    var uv_6: vec2<f32>;
    var i: i32 = 0i;
    var unpackedDepth: f32;
    var z: f32;

    let _e35 = (*dir);
    (*dir) = (_e35 * 0.5f);
    let _e38 = (*hitPos);
    let _e39 = (*dir);
    (*hitPos) = (_e38 - _e39);
    loop {
        let _e43 = i;
        if !((_e43 < 5i)) {
            break;
        }
        {
            let _e51 = (*hitPos);
            let _e52 = viewSpaceToScreenSpace(_e51);
            uv_6 = _e52;
            let _e55 = uv_6;
            let _e57 = textureSampleLevel(depthTexture, samp, _e55, 0f);
            unpackedDepth = _e57.x;
            let _e61 = unpackedDepth;
            let _e62 = getViewZ(_e61);
            z = _e62;
            let _e64 = z;
            let _e65 = (*hitPos);
            rayHitDepthDifference = (_e64 - _e65.z);
            let _e68 = (*dir);
            (*dir) = (_e68 * 0.5f);
            let _e71 = rayHitDepthDifference;
            if (_e71 >= 0f) {
                {
                    let _e74 = (*hitPos);
                    let _e75 = (*dir);
                    (*hitPos) = (_e74 - _e75);
                }
            } else {
                {
                    let _e77 = (*hitPos);
                    let _e78 = (*dir);
                    (*hitPos) = (_e77 + _e78);
                }
            }
        }
        continuing {
            let _e47 = i;
            i = (_e47 + 1i);
        }
    }
    let _e81 = (*hitPos);
    let _e82 = viewSpaceToScreenSpace(_e81);
    uv_6 = _e82;
    let _e83 = uv_6;
    return _e83;
}

fn RayMarch(dir_1: ptr<function, vec3<f32>>, hitPos_1: ptr<function, vec3<f32>>, random: vec4<f32>) -> vec2<f32> {
    var random_1: vec4<f32>;
    var rayHitDepthDifference_1: f32;
    var uv_7: vec2<f32>;
    var i_1: i32 = 1i;
    var cs: f32;
    var unpackedDepth_1: f32;
    var z_1: f32;

    random_1 = random;
    let _e36 = (*dir_1);
    let _e37 = rayDistance;
    (*dir_1) = (_e36 * (_e37 / 20f));
    loop {
        let _e45 = i_1;
        if !((_e45 < 20i)) {
            break;
        }
        {
            let _e55 = i_1;
            let _e57 = random_1;
            let _e63 = i_1;
            let _e65 = random_1;
            let _e75 = i_1;
            let _e77 = random_1;
            let _e83 = i_1;
            let _e85 = random_1;
            cs = (1f - exp((-0.25f * pow(((f32(_e83) + _e85.z) - 0.5f), 2f))));
            let _e96 = (*hitPos_1);
            let _e97 = (*dir_1);
            let _e98 = cs;
            (*hitPos_1) = (_e96 + (_e97 * _e98));
            let _e102 = (*hitPos_1);
            let _e103 = viewSpaceToScreenSpace(_e102);
            uv_7 = _e103;
            let _e106 = uv_7;
            let _e108 = textureSampleLevel(depthTexture, samp, _e106, 0f);
            unpackedDepth_1 = _e108.x;
            let _e112 = unpackedDepth_1;
            let _e113 = getViewZ(_e112);
            z_1 = _e113;
            let _e115 = z_1;
            let _e116 = (*hitPos_1);
            rayHitDepthDifference_1 = (_e115 - _e116.z);
            let _e119 = rayHitDepthDifference_1;
            let _e122 = rayHitDepthDifference_1;
            let _e123 = thickness;
            if ((_e119 >= 0f) && (_e122 < _e123)) {
                {
                    if false {
                        {
                            let _e129 = uv_7;
                            return _e129;
                        }
                    } else {
                        {
                            let _e134 = BinarySearch(dir_1, hitPos_1);
                            return _e134;
                        }
                    }
                }
            }
        }
        continuing {
            let _e49 = i_1;
            i_1 = (_e49 + 1i);
        }
    }
    let _e135 = (*hitPos_1);
    (*hitPos_1).x = 10000000000f;
    (*hitPos_1).y = 10000000000f;
    (*hitPos_1).z = 10000000000f;
    let _e142 = uv_7;
    return _e142;
}

fn getEnvColor(l: vec3<f32>, worldPos: vec3<f32>, roughness_8: f32, isDiffuseSample: bool, isEnvSample: bool) -> vec3<f32> {
    var l_1: vec3<f32>;
    var worldPos_1: vec3<f32>;
    var roughness_9: f32;
    var isDiffuseSample_1: bool;
    var isEnvSample_1: bool;

    l_1 = l;
    worldPos_1 = worldPos;
    roughness_9 = roughness_8;
    isDiffuseSample_1 = isDiffuseSample;
    isEnvSample_1 = isEnvSample;
    return vec3(0f);
}

fn doSample(viewPos: vec3<f32>, viewDir: vec3<f32>, viewNormal: vec3<f32>, worldPos_2: vec3<f32>, metalness_4: f32, roughness_10: f32, isDiffuseSample_2: bool, isEnvSample_2: bool, NoV_4: f32, NoL_3: f32, NoH_3: f32, LoH_1: f32, VoH: f32, random_2: vec4<f32>, l_2: ptr<function, vec3<f32>>, hitPos_2: ptr<function, vec3<f32>>, isMissedRay: ptr<function, bool>, brdf: ptr<function, vec3<f32>>, pdf: ptr<function, f32>) -> vec3<f32> {
    var cosTheta: f32;
    var diffuseBrdf: vec3<f32>;
    var specularBrdf: vec3<f32>;
    var coords: vec2<f32>;
    var allowMissedRays: bool = false;
    var envMapSample: vec3<f32> = vec3(0f);
    var velocity: vec4<f32>;
    var reprojectedUv: vec2<f32>;
    var SSGI: vec3<f32>;
    var envColor: vec3<f32>;
    var reprojectedGI: vec4<f32>;
    var saturation: f32;
    var aspect: f32;
    var border: f32 = 0.15f;
    var borderFactor: f32;
    var ssgiLum: f32;
    var envLum: f32;

    let _e52 = (*l_2);
    let _e56 = (*l_2);
    cosTheta = max(0f, dot(viewNormal, _e56));
    if isDiffuseSample_2 {
        {
            let _e60 = evalDisneyDiffuse(NoL_3, NoV_4, LoH_1, roughness_10, metalness_4);
            diffuseBrdf = _e60;
            (*pdf) = (NoL_3 / 3.1415927f);
            let _e64 = diffuseBrdf;
            (*brdf) = _e64;
        }
    } else {
        {
            let _e65 = evalDisneySpecular(roughness_10, NoH_3, NoV_4, NoL_3);
            specularBrdf = _e65;
            let _e67 = GGXVNDFPdf(NoH_3, NoV_4, roughness_10);
            (*pdf) = _e67;
            let _e68 = specularBrdf;
            (*brdf) = _e68;
        }
    }
    let _e69 = (*brdf);
    let _e70 = cosTheta;
    (*brdf) = (_e69 * _e70);
    let _e75 = (*pdf);
    (*pdf) = max(0.00001f, _e75);
    (*hitPos_2) = viewPos;
    let _e81 = RayMarch(l_2, hitPos_2, random_2);
    coords = _e81;
    let _e85 = (*hitPos_2);
    (*isMissedRay) = (_e85.x == 10000000000f);
    let _e92 = (*isMissedRay);
    let _e93 = allowMissedRays;
    if (_e92 && !(_e93)) {
        let _e97 = (*l_2);
        let _e98 = getEnvColor(_e97, worldPos_2, roughness_10, isDiffuseSample_2, isEnvSample_2);
        return _e98;
    }
    let _e99 = coords;
    let _e102 = coords;
    let _e105 = textureSampleLevel(velocityTexture, samp, _e102.xy, 0f);
    velocity = _e105;
    let _e107 = coords;
    let _e109 = velocity;
    reprojectedUv = (_e107.xy - _e109.xy);
    let _e115 = (*l_2);
    let _e116 = getEnvColor(_e115, worldPos_2, roughness_10, isDiffuseSample_2, isEnvSample_2);
    envColor = _e116;
    let _e118 = reprojectedUv;
    let _e122 = reprojectedUv;
    let _e127 = reprojectedUv;
    let _e132 = reprojectedUv;
    if ((((_e118.x >= 0f) && (_e122.x <= 1f)) && (_e127.y >= 0f)) && (_e132.y <= 1f)) {
        {
            let _e139 = reprojectedUv;
            let _e141 = textureSampleLevel(accumulatedTexture, samp, _e139, 0f);
            reprojectedGI = _e141;
            let _e143 = mat;
            let _e146 = mat;
            let _e149 = getSaturation(_e146.diffuse.xyz);
            saturation = _e149;
            let _e151 = reprojectedGI;
            let _e153 = reprojectedGI;
            let _e159 = reprojectedGI;
            let _e165 = reprojectedGI;
            let _e171 = saturation;
            let _e175 = reprojectedGI;
            let _e181 = reprojectedGI;
            let _e187 = reprojectedGI;
            let _e193 = saturation;
            let _e198 = mix(_e175.xyz, vec3(dot(vec3<f32>(0.2125f, 0.7154f, 0.0721f), _e187.xyz)), vec3((((1f - roughness_10) * _e193) * 0.4f)));
            reprojectedGI.x = _e198.x;
            reprojectedGI.y = _e198.y;
            reprojectedGI.z = _e198.z;
            let _e205 = reprojectedGI;
            SSGI = _e205.xyz;
            let _e207 = resolution;
            let _e209 = resolution;
            aspect = (_e207.x / _e209.y);
            let _e217 = coords;
            let _e220 = border;
            let _e221 = coords;
            let _e226 = border;
            let _e228 = coords;
            let _e232 = border;
            let _e234 = coords;
            let _e240 = coords;
            let _e243 = border;
            let _e244 = coords;
            let _e250 = border;
            let _e252 = coords;
            let _e256 = border;
            let _e258 = coords;
            borderFactor = (((smoothstep(0f, _e220, _e221.x) * smoothstep(1f, (1f - _e232), _e234.x)) * smoothstep(0f, _e243, _e244.y)) * smoothstep(1f, (1f - _e256), _e258.y));
            let _e264 = borderFactor;
            borderFactor = sqrt(_e264);
            let _e269 = envColor;
            let _e270 = SSGI;
            let _e271 = borderFactor;
            SSGI = mix(_e269, _e270, vec3(_e271));
        }
    } else {
        {
            let _e274 = envColor;
            return _e274;
        }
    }
    let _e275 = allowMissedRays;
    if _e275 {
        {
            let _e285 = SSGI;
            ssgiLum = dot(vec3<f32>(0.2125f, 0.7154f, 0.0721f), _e285);
            let _e297 = envMapSample;
            envLum = dot(vec3<f32>(0.2125f, 0.7154f, 0.0721f), _e297);
            let _e300 = envLum;
            let _e301 = ssgiLum;
            if (_e300 > _e301) {
                let _e303 = envMapSample;
                SSGI = _e303;
            }
        }
    }
    let _e304 = SSGI;
    return _e304;
}

fn calculateAngles(h: ptr<function, vec3<f32>>, l_3: ptr<function, vec3<f32>>, v_5: ptr<function, vec3<f32>>, n_4: ptr<function, vec3<f32>>, NoL_4: ptr<function, f32>, NoH_4: ptr<function, f32>, LoH_2: ptr<function, f32>, VoH_1: ptr<function, f32>) {
    let _e39 = (*v_5);
    let _e40 = (*l_3);
    let _e42 = (*v_5);
    let _e43 = (*l_3);
    (*h) = normalize((_e42 + _e43));
    let _e48 = (*n_4);
    let _e49 = (*l_3);
    let _e57 = (*n_4);
    let _e58 = (*l_3);
    (*NoL_4) = clamp(dot(_e57, _e58), 0.00001f, 0.99999f);
    let _e67 = (*n_4);
    let _e68 = (*h);
    let _e76 = (*n_4);
    let _e77 = (*h);
    (*NoH_4) = clamp(dot(_e76, _e77), 0.00001f, 0.99999f);
    let _e86 = (*l_3);
    let _e87 = (*h);
    let _e95 = (*l_3);
    let _e96 = (*h);
    (*LoH_2) = clamp(dot(_e95, _e96), 0.00001f, 0.99999f);
    let _e105 = (*v_5);
    let _e106 = (*h);
    let _e114 = (*v_5);
    let _e115 = (*h);
    (*VoH_1) = clamp(dot(_e114, _e115), 0.00001f, 0.99999f);
    return;
}

fn main_1() {
    var unpackedDepth_2: f32;
    var directLight: vec4<f32>;
    var roughnessSq: f32;
    var viewZ_2: f32;
    var viewPos_1: vec3<f32>;
    var viewDir_1: vec3<f32>;
    var viewNormal_1: vec3<f32>;
    var n_5: vec3<f32>;
    var v_6: vec3<f32>;
    var NoV_5: f32;
    var V_3: vec3<f32>;
    var N_1: vec3<f32>;
    var random_3: vec4<f32>;
    var H: vec3<f32>;
    var l_4: vec3<f32>;
    var h_1: vec3<f32>;
    var F: vec3<f32>;
    var T_1: vec3<f32>;
    var B_1: vec3<f32>;
    var envMisDir: vec3<f32>;
    var gi: vec3<f32>;
    var diffuseGI: vec3<f32>;
    var specularGI: vec3<f32>;
    var brdf_1: vec3<f32>;
    var hitPos_3: vec3<f32>;
    var specularHitPos: vec3<f32>;
    var f0_2: vec3<f32>;
    var NoL_5: f32;
    var NoH_5: f32;
    var LoH_3: f32;
    var VoH_2: f32;
    var diffW: f32;
    var specW: f32;
    var invW: f32;
    var pdf_1: f32;
    var envPdf: f32;
    var diffuseSamples: f32;
    var specularSamples: f32;
    var isDiffuseSample_3: bool;
    var isEnvSample_3: bool;
    var isMissedRay_1: bool;
    var ems: EnvMisSample;
    var local_9: vec3<f32>;
    var diffuseRay: vec3<f32>;
    var local_10: vec3<f32>;
    var specularRay: vec3<f32>;
    var gDiffuse: vec4<f32>;
    var gSpecular: vec4<f32>;
    var rayLength: f32 = 0f;
    var hitPosWS: vec4<f32>;
    var cameraPosWS: vec3<f32>;
    var packedRoughnessRayLength: u32;
    var a_5: f32;

    let _e33 = vUv_1;
    let _e35 = textureSampleLevel(depthTexture, samp, _e33, 0f);
    unpackedDepth_2 = _e35.x;
    let _e38 = unpackedDepth_2;
    if (_e38 == 1f) {
        {
            let _e43 = vUv_1;
            let _e45 = textureSampleLevel(directLightTexture, samp, _e43, 0f);
            directLight = _e45;
            let _e49 = directLight;
            let _e50 = directLight;
            let _e51 = packTwoVec4_(_e49, _e50);
            fragColor = _e51;
            return;
        }
    }
    let _e53 = vUv_1;
    let _e54 = getMaterial(gBufferTexture_2, _e53);
    mat = _e54;
    let _e55 = mat;
    let _e57 = mat;
    let _e62 = mat;
    let _e64 = mat;
    roughnessSq = clamp((_e62.roughness * _e64.roughness), 0.000001f, 1f);
    let _e72 = resolution;
    invTexSize = (vec2(1f) / _e72);
    let _e76 = unpackedDepth_2;
    let _e77 = getViewZ(_e76);
    viewZ_2 = _e77;
    let _e80 = viewZ_2;
    let _e81 = getViewPosition(_e80);
    viewPos_1 = _e81;
    let _e84 = viewPos_1;
    viewDir_1 = normalize(_e84);
    let _e87 = mat;
    worldNormal = _e87.normal;
    let _e89 = worldNormal;
    let _e95 = cameraMatrixWorld;
    let _e98 = worldNormal;
    let _e104 = cameraMatrixWorld;
    viewNormal_1 = normalize((vec4<f32>(_e98.x, _e98.y, _e98.z, 0f) * _e104).xyz);
    let _e109 = cameraMatrixWorld;
    let _e110 = viewPos_1;
    worldPos_3 = (_e109 * vec4<f32>(_e110.x, _e110.y, _e110.z, 1f)).xyz;
    let _e118 = viewNormal_1;
    n_5 = _e118;
    let _e120 = viewDir_1;
    v_6 = -(_e120);
    let _e126 = n_5;
    let _e127 = v_6;
    let _e132 = n_5;
    let _e133 = v_6;
    NoV_5 = max(0.00001f, dot(_e132, _e133));
    let _e137 = v_6;
    let _e143 = viewMatrix;
    V_3 = (vec4<f32>(_e137.x, _e137.y, _e137.z, 0f) * _e143).xyz;
    let _e147 = worldNormal;
    N_1 = _e147;
    let _e166 = N_1;
    Onb(_e166, (&T_1), (&B_1));
    let _e173 = T_1;
    let _e174 = B_1;
    let _e175 = N_1;
    let _e176 = V_3;
    let _e177 = ToLocal(_e173, _e174, _e175, _e176);
    V_3 = _e177;
    let _e180 = mat;
    let _e183 = mat;
    let _e187 = mat;
    let _e190 = mat;
    f0_2 = mix(vec3(0.04f), _e187.diffuse.xyz, vec3(_e190.metalness));
    let _e210 = vUv_1;
    let _e211 = blueNoise(_e210);
    random_3 = _e211;
    let _e215 = random_3;
    let _e217 = random_3;
    let _e219 = V_3;
    let _e220 = roughnessSq;
    let _e221 = roughnessSq;
    let _e222 = random_3;
    let _e224 = random_3;
    let _e226 = SampleGGXVNDF(_e219, _e220, _e221, _e222.x, _e224.y);
    H = _e226;
    let _e227 = H;
    if (_e227.z < 0f) {
        let _e231 = H;
        H = -(_e231);
    }
    let _e233 = V_3;
    let _e236 = V_3;
    let _e238 = H;
    let _e240 = V_3;
    let _e243 = V_3;
    let _e245 = H;
    l_4 = normalize(reflect(-(_e243), _e245));
    let _e252 = T_1;
    let _e253 = B_1;
    let _e254 = N_1;
    let _e255 = l_4;
    let _e256 = ToWorld(_e252, _e253, _e254, _e255);
    l_4 = _e256;
    let _e257 = l_4;
    let _e263 = cameraMatrixWorld;
    l_4 = (vec4<f32>(_e257.x, _e257.y, _e257.z, 0f) * _e263).xyz;
    let _e267 = l_4;
    l_4 = normalize(_e267);
    calculateAngles((&h_1), (&l_4), (&v_6), (&n_5), (&NoL_5), (&NoH_5), (&LoH_3), (&VoH_2));
    let _e285 = mode;
    if (_e285 == 0i) {
        {
            let _e290 = f0_2;
            let _e291 = VoH_2;
            let _e292 = F_Schlick(_e290, _e291);
            F = _e292;
            let _e294 = mat;
            let _e301 = mat;
            let _e308 = mat;
            diffW = ((1f - _e294.metalness) * dot(vec3<f32>(0.2125f, 0.7154f, 0.0721f), _e308.diffuse.xyz));
            let _e322 = F;
            specW = dot(vec3<f32>(0.2125f, 0.7154f, 0.0721f), _e322);
            let _e326 = diffW;
            diffW = max(_e326, 0.00001f);
            let _e331 = specW;
            specW = max(_e331, 0.00001f);
            let _e335 = diffW;
            let _e336 = specW;
            invW = (1f / (_e335 + _e336));
            let _e339 = diffW;
            let _e340 = invW;
            diffW = (_e339 * _e340);
            let _e342 = random_3;
            let _e344 = diffW;
            isDiffuseSample_3 = (_e342.z < _e344);
        }
    } else {
        {
            isDiffuseSample_3 = false;
        }
    }
    ems.pdf = 1f;
    envMisDir = vec3(0f);
    envPdf = 1f;
    let _e353 = ems;
    if _e353.isEnvSample {
        let _e355 = envMisDir;
        local_9 = _e355;
    } else {
        let _e357 = random_3;
        let _e359 = viewNormal_1;
        let _e360 = random_3;
        let _e362 = cosineSampleHemisphere(_e359, _e360.xy);
        local_9 = _e362;
    }
    let _e364 = local_9;
    diffuseRay = _e364;
    let _e366 = ems;
    if _e366.isEnvSample {
        let _e368 = envMisDir;
        local_10 = _e368;
    } else {
        let _e369 = l_4;
        local_10 = _e369;
    }
    let _e371 = local_10;
    specularRay = _e371;
    let _e373 = mode;
    if (_e373 == 0i) {
        {
            let _e376 = isDiffuseSample_3;
            if _e376 {
                {
                    let _e377 = diffuseRay;
                    l_4 = _e377;
                    calculateAngles((&h_1), (&l_4), (&v_6), (&n_5), (&NoL_5), (&NoH_5), (&LoH_3), (&VoH_2));
                    let _e398 = mat;
                    let _e402 = ems;
                    let _e415 = viewPos_1;
                    let _e416 = viewDir_1;
                    let _e417 = viewNormal_1;
                    let _e418 = worldPos_3;
                    let _e419 = mat;
                    let _e421 = roughnessSq;
                    let _e422 = isDiffuseSample_3;
                    let _e423 = ems;
                    let _e425 = NoV_5;
                    let _e426 = NoL_5;
                    let _e427 = NoH_5;
                    let _e428 = LoH_3;
                    let _e429 = VoH_2;
                    let _e430 = random_3;
                    let _e436 = doSample(_e415, _e416, _e417, _e418, _e419.metalness, _e421, _e422, _e423.isEnvSample, _e425, _e426, _e427, _e428, _e429, _e430, (&l_4), (&hitPos_3), (&isMissedRay_1), (&brdf_1), (&pdf_1));
                    gi = _e436;
                    let _e437 = gi;
                    let _e438 = brdf_1;
                    gi = (_e437 * _e438);
                    let _e440 = ems;
                    if _e440.isEnvSample {
                        {
                            let _e442 = gi;
                            let _e443 = ems;
                            let _e446 = ems;
                            let _e448 = pdf_1;
                            let _e449 = misHeuristic(_e446.pdf, _e448);
                            gi = (_e442 * _e449);
                        }
                    } else {
                        {
                            let _e451 = gi;
                            let _e452 = pdf_1;
                            gi = (_e451 / vec3(_e452));
                        }
                    }
                    let _e455 = gi;
                    let _e456 = ems;
                    gi = (_e455 / vec3(_e456.pdf));
                    let _e460 = diffuseSamples;
                    diffuseSamples = (_e460 + 1f);
                    let _e466 = diffuseSamples;
                    let _e468 = diffuseGI;
                    let _e469 = gi;
                    let _e471 = diffuseSamples;
                    diffuseGI = mix(_e468, _e469, vec3((1f / _e471)));
                }
            }
        }
    }
    let _e475 = specularRay;
    l_4 = _e475;
    calculateAngles((&h_1), (&l_4), (&v_6), (&n_5), (&NoL_5), (&NoH_5), (&LoH_3), (&VoH_2));
    let _e496 = mat;
    let _e500 = ems;
    let _e513 = viewPos_1;
    let _e514 = viewDir_1;
    let _e515 = viewNormal_1;
    let _e516 = worldPos_3;
    let _e517 = mat;
    let _e519 = roughnessSq;
    let _e520 = isDiffuseSample_3;
    let _e521 = ems;
    let _e523 = NoV_5;
    let _e524 = NoL_5;
    let _e525 = NoH_5;
    let _e526 = LoH_3;
    let _e527 = VoH_2;
    let _e528 = random_3;
    let _e534 = doSample(_e513, _e514, _e515, _e516, _e517.metalness, _e519, _e520, _e521.isEnvSample, _e523, _e524, _e525, _e526, _e527, _e528, (&l_4), (&hitPos_3), (&isMissedRay_1), (&brdf_1), (&pdf_1));
    gi = _e534;
    let _e535 = gi;
    let _e536 = brdf_1;
    gi = (_e535 * _e536);
    let _e538 = ems;
    if _e538.isEnvSample {
        {
            let _e540 = gi;
            let _e541 = ems;
            let _e544 = ems;
            let _e546 = pdf_1;
            let _e547 = misHeuristic(_e544.pdf, _e546);
            gi = (_e540 * _e547);
        }
    } else {
        {
            let _e549 = gi;
            let _e550 = pdf_1;
            gi = (_e549 / vec3(_e550));
        }
    }
    let _e553 = gi;
    let _e554 = ems;
    gi = (_e553 / vec3(_e554.pdf));
    let _e558 = hitPos_3;
    specularHitPos = _e558;
    let _e559 = specularSamples;
    specularSamples = (_e559 + 1f);
    let _e565 = specularSamples;
    let _e567 = specularGI;
    let _e568 = gi;
    let _e570 = specularSamples;
    specularGI = mix(_e567, _e568, vec3((1f / _e570)));
    let _e576 = mode;
    if (_e576 == 0i) {
        {
            let _e579 = diffuseSamples;
            if (_e579 == 0f) {
                diffuseGI = vec3(-1f);
            }
            let _e585 = diffuseGI;
            let _e586 = mat;
            gDiffuse = vec4<f32>(_e585.x, _e585.y, _e585.z, _e586.roughness);
        }
    }
    let _e597 = cameraMatrixWorld[3];
    cameraPosWS = _e597.xyz;
    let _e600 = hitPos_3;
    isMissedRay_1 = (_e600.x > 1000000000f);
    let _e604 = isMissedRay_1;
    if !(_e604) {
        {
            let _e606 = cameraMatrixWorld;
            let _e607 = specularHitPos;
            hitPosWS = (_e606 * vec4<f32>(_e607.x, _e607.y, _e607.z, 1f));
            let _e615 = hitPosWS;
            let _e617 = cameraPosWS;
            let _e618 = hitPosWS;
            rayLength = distance(_e617, _e618.xyz);
        }
    }
    let _e621 = rayLength;
    let _e622 = mat;
    let _e625 = rayLength;
    let _e626 = mat;
    packedRoughnessRayLength = pack2x16float(vec2<f32>(_e625, _e626.roughness));
    let _e632 = packedRoughnessRayLength;
    a_5 = bitcast<f32>(_e632);
    let _e635 = mode;
    if (_e635 == 0i) {
        {
            let _e638 = specularGI;
            let _e639 = rayLength;
            gSpecular = vec4<f32>(_e638.x, _e638.y, _e638.z, _e639);
            let _e646 = gDiffuse;
            let _e647 = gSpecular;
            let _e648 = packTwoVec4_(_e646, _e647);
            fragColor = _e648;
            return;
        }
    } else {
        {
            let _e649 = specularGI;
            let _e650 = a_5;
            gSpecular = vec4<f32>(_e649.x, _e649.y, _e649.z, _e650);
            let _e655 = gSpecular;
            fragColor = _e655;
            return;
        }
    }
}

@fragment 
fn main(@location(0) vUv: vec2<f32>) -> FragmentOutput {
    vUv_1 = vUv;
    main_1();
    let _e65 = fragColor;
    return FragmentOutput(_e65);
}
