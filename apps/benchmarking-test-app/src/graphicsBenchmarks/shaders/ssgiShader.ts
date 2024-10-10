export const basicVertWGSL = `
struct VertexOutput {
    @location(0) vUv: vec2<f32>,
    @builtin(position) gl_Position: vec4<f32>,
}

var<private> position_1: vec4<f32>;
var<private> uv_1: vec2<f32>;
var<private> vUv: vec2<f32>;
var<private> gl_Position: vec4<f32>;

fn main_1() {
    let _e3 = uv_1;
    vUv = _e3;
    let _e5 = position_1;
    gl_Position = _e5;
    return;
}

@vertex
fn main(@location(0) position: vec4<f32>, @location(1) uv: vec2<f32>) -> VertexOutput {
    position_1 = position;
    uv_1 = uv;
    main_1();
    let _e11 = vUv;
    let _e13 = gl_Position;
    return VertexOutput(_e11, _e13);
}
`;

export const ssgiFragWGSL = `
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

var<private> vUv_1: vec2<f32>;
var<private> fragColor: vec4<f32>;
@group(0) @binding(0)
var accumulatedTexture: texture_2d<f32>;
@group(0) @binding(1)
var depthTexture: texture_depth_2d;
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
var normalTexture: texture_2d<f32>;
@group(2) @binding(1)
var diffuseTexture: texture_2d<f32>;
@group(2) @binding(2)
var materialTexture: texture_2d<f32>;
@group(2) @binding(3)
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
    return fract((sin(dot(_e60, vec2<f32>(12.9898f, 78.233f))) * 43758.547f)) * 0.1;
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

fn getMaterial(uv: vec2<f32>) -> Material {
    var uv_1: vec2<f32>;
    var diffuse: vec4<f32>;
    var normal: vec4<f32>;
    var materialProperties: vec4<f32>;
    var roughness: f32;
    var metalness: f32;
    var emissivePower: f32;
    var emissive: vec3<f32>;

    uv_1 = uv;
    let _e32 = uv_1;
    let _e34 = textureSampleLevel(diffuseTexture, gBufferSamp, _e32, 0f);
    diffuse = _e34;
    let _e38 = uv_1;
    let _e40 = textureSampleLevel(normalTexture, gBufferSamp, _e38, 0f);
    normal = _e40;
    let _e44 = uv_1;
    let _e46 = textureSampleLevel(materialTexture, gBufferSamp, _e44, 0f);
    materialProperties = _e46;
    let _e48 = materialProperties;
    roughness = _e48.x;
    let _e51 = materialProperties;
    metalness = _e51.y;
    let _e54 = materialProperties;
    emissivePower = _e54.z;
    let _e57 = emissivePower;
    emissive = vec3(_e57);
    let _e60 = diffuse;
    let _e61 = normal;
    let _e63 = roughness;
    let _e64 = metalness;
    let _e65 = emissive;
    return Material(_e60, _e61.xyz, _e63, _e64, _e65);
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

fn getBasisFromNormal(normal_1: vec3<f32>) -> mat3x3<f32> {
    var other: vec3<f32>;
    var ortho: vec3<f32>;
    var ortho2_: vec3<f32>;

    if (abs(normal_1.x) > 0.5f) {
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
    ortho = normalize(cross(normal_1, _e47));
    let _e52 = ortho;
    let _e55 = ortho;
    ortho2_ = normalize(cross(normal_1, _e55));
    let _e59 = ortho2_;
    let _e60 = ortho;
    return mat3x3<f32>(vec3<f32>(_e59.x, _e59.y, _e59.z), vec3<f32>(_e60.x, _e60.y, _e60.z), vec3<f32>(normal_1.x, normal_1.y, normal_1.z));
}

fn F_Schlick(f0_: vec3<f32>, theta: f32) -> vec3<f32> {
    return (f0_ + ((vec3(1f) - f0_) * pow((1f - theta), 5f)));
}

fn F_Schlick_1(f0_1: f32, f90_: f32, theta_1: f32) -> f32 {
    return (f0_1 + ((f90_ - f0_1) * pow((1f - theta_1), 5f)));
}

fn D_GTR(roughness_1: f32, NoH: f32, k: f32) -> f32 {
    var a2_: f32;

    a2_ = pow(roughness_1, 2f);
    let _e35 = a2_;
    let _e38 = a2_;
    let _e39 = a2_;
    let _e47 = a2_;
    let _e48 = a2_;
    return (_e35 / (3.1415927f * pow((((NoH * NoH) * ((_e47 * _e48) - 1f)) + 1f), k)));
}

fn SmithG(NDotV: f32, alphaG: f32) -> f32 {
    var a: f32;
    var b: f32;

    a = (alphaG * alphaG);
    b = (NDotV * NDotV);
    let _e36 = a;
    let _e37 = b;
    let _e39 = a;
    let _e40 = b;
    let _e43 = a;
    let _e44 = b;
    let _e46 = a;
    let _e47 = b;
    return ((2f * NDotV) / (NDotV + sqrt(((_e43 + _e44) - (_e46 * _e47)))));
}

fn GGXVNDFPdf(NoH_1: f32, NoV: f32, roughness_2: f32) -> f32 {
    var D: f32;
    var G1_: f32;

    let _e33 = D_GTR(roughness_2, NoH_1, 2f);
    D = _e33;
    let _e37 = SmithG(NoV, (roughness_2 * roughness_2));
    G1_ = _e37;
    let _e39 = D;
    let _e40 = G1_;
    return ((_e39 * _e40) / max(0.00001f, (4f * NoV)));
}

fn GeometryTerm(NoL: f32, NoV_1: f32, roughness_3: f32) -> f32 {
    var a2_1: f32;
    var G1_1: f32;
    var G2_: f32;

    a2_1 = (roughness_3 * roughness_3);
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

fn evalDisneyDiffuse(NoL_1: f32, NoV_2: f32, LoH: f32, roughness_4: f32, metalness_1: f32) -> vec3<f32> {
    var FD90_: f32;
    var a_1: f32;
    var b_1: f32;

    FD90_ = (0.5f + ((2f * roughness_4) * pow(LoH, 2f)));
    let _e45 = FD90_;
    let _e46 = F_Schlick_1(1f, _e45, NoL_1);
    a_1 = _e46;
    let _e51 = FD90_;
    let _e52 = F_Schlick_1(1f, _e51, NoV_2);
    b_1 = _e52;
    let _e54 = a_1;
    let _e55 = b_1;
    return vec3((((_e54 * _e55) / 3.1415927f) * (1f - metalness_1)));
}

fn evalDisneySpecular(roughness_5: f32, NoH_2: f32, NoV_3: f32, NoL_2: f32) -> vec3<f32> {
    var D_1: f32;
    var G: f32;
    var spec: vec3<f32>;

    let _e34 = D_GTR(roughness_5, NoH_2, 2f);
    D_1 = _e34;
    let _e58 = GeometryTerm(NoL_2, NoV_3, pow((0.5f + (roughness_5 * 0.5f)), 2f));
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
    var local: vec3<f32>;
    var T1_: vec3<f32>;
    var T2_: vec3<f32>;
    var r: f32;
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
        local = (vec3<f32>(-(_e62.y), _e65.x, 0f) * inverseSqrt(_e70));
    } else {
        local = vec3<f32>(1f, 0f, 0f);
    }
    let _e78 = local;
    T1_ = _e78;
    let _e82 = Vh;
    let _e83 = T1_;
    T2_ = cross(_e82, _e83);
    r = sqrt(r1_);
    phi = (6.2831855f * r2_);
    let _e93 = r;
    let _e95 = phi;
    t1_ = (_e93 * cos(_e95));
    let _e99 = r;
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
    var local_1: vec3<f32>;
    var up: vec3<f32>;

    if (abs(N.z) < 0.9999999f) {
        local_1 = vec3<f32>(0f, 0f, 1f);
    } else {
        local_1 = vec3<f32>(1f, 0f, 0f);
    }
    let _e51 = local_1;
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

fn cosineSampleHemisphere(n: vec3<f32>, u: vec2<f32>) -> vec3<f32> {
    var r_1: f32;
    var theta_2: f32;
    var b_2: vec3<f32>;
    var t: vec3<f32>;

    r_1 = sqrt(u.x);
    theta_2 = (6.2831855f * u.y);
    b_2 = normalize(cross(n, vec3<f32>(0f, 1f, 1f)));
    let _e61 = b_2;
    t = cross(_e61, n);
    let _e64 = r_1;
    let _e66 = theta_2;
    let _e69 = b_2;
    let _e80 = r_1;
    let _e82 = theta_2;
    let _e85 = t;
    let _e88 = r_1;
    let _e90 = theta_2;
    let _e93 = b_2;
    let _e104 = r_1;
    let _e106 = theta_2;
    let _e109 = t;
    return normalize(((((_e88 * sin(_e90)) * _e93) + (sqrt((1f - u.x)) * n)) + ((_e104 * cos(_e106)) * _e109)));
}

fn misHeuristic(a_2: f32, b_3: f32) -> f32 {
    var a_3: f32;
    var b_4: f32;
    var aa: f32;
    var bb: f32;

    a_3 = a_2;
    b_4 = b_3;
    let _e32 = a_3;
    let _e33 = a_3;
    aa = (_e32 * _e33);
    let _e36 = b_4;
    let _e37 = b_4;
    bb = (_e36 * _e37);
    let _e40 = aa;
    let _e41 = aa;
    let _e42 = bb;
    return (_e40 / (_e41 + _e42));
}

fn alignToNormal(normal_2: vec3<f32>, direction: vec3<f32>) -> vec3<f32> {
    var tangent: vec3<f32>;
    var bitangent: vec3<f32>;
    var localDir: vec3<f32>;
    var localDirAligned: vec3<f32>;
    var alignedDir: vec3<f32>;

    Onb(normal_2, (&tangent), (&bitangent));
    let _e38 = tangent;
    let _e39 = bitangent;
    let _e40 = ToLocal(_e38, _e39, normal_2, direction);
    localDir = _e40;
    let _e42 = localDir;
    let _e44 = localDir;
    let _e46 = localDir;
    let _e48 = localDir;
    localDirAligned = vec3<f32>(_e42.x, _e44.y, abs(_e48.z));
    let _e56 = tangent;
    let _e57 = bitangent;
    let _e58 = localDirAligned;
    let _e59 = ToWorld(_e56, _e57, normal_2, _e58);
    alignedDir = _e59;
    let _e61 = alignedDir;
    return _e61;
}

fn getFlatness(g: vec3<f32>, rp: vec3<f32>) -> f32 {
    var g_1: vec3<f32>;
    var rp_1: vec3<f32>;
    var gw: vec3<f32>;
    var pw: vec3<f32>;
    var wfcurvature: f32;

    g_1 = g;
    rp_1 = rp;
    let _e33 = g_1;
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
    var maxComponent: f32;
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
    maxComponent = max(max(_e48.x, _e50.y), _e53.z);
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
    let _e81 = maxComponent;
    let _e82 = minComponent;
    delta = (_e81 - _e82);
    let _e85 = maxComponent;
    let _e86 = minComponent;
    if (_e85 == _e86) {
        {
            return 0f;
        }
    } else {
        {
            let _e89 = delta;
            let _e90 = maxComponent;
            return (_e89 / _e90);
        }
    }
}

@diagnostic(off,derivative_uniformity)
fn BinarySearch(dir: ptr<function, vec3<f32>>, hitPos: ptr<function, vec3<f32>>) -> vec2<f32> {
    var rayHitDepthDifference: f32;
    var uv_2: vec2<f32>;
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
            uv_2 = _e52;
            let _e55 = uv_2;
            let _e57 = textureSample(depthTexture, samp, _e55);
            unpackedDepth = _e57;
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
    uv_2 = _e82;
    let _e83 = uv_2;
    return _e83;
}

@diagnostic(off,derivative_uniformity)
fn RayMarch(dir_1: ptr<function, vec3<f32>>, hitPos_1: ptr<function, vec3<f32>>, random: vec4<f32>) -> vec2<f32> {
    var random_1: vec4<f32>;
    var rayHitDepthDifference_1: f32;
    var uv_3: vec2<f32>;
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
            uv_3 = _e103;
            let _e106 = uv_3;
            let _e108 = textureSample(depthTexture, samp, _e106);
            unpackedDepth_1 = _e108;
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
                            let _e129 = uv_3;
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
    let _e142 = uv_3;
    return _e142;
}

fn getEnvColor(l: vec3<f32>, worldPos: vec3<f32>, roughness_6: f32, isDiffuseSample: bool, isEnvSample: bool) -> vec3<f32> {
    var l_1: vec3<f32>;
    var worldPos_1: vec3<f32>;
    var roughness_7: f32;
    var isDiffuseSample_1: bool;
    var isEnvSample_1: bool;

    l_1 = l;
    worldPos_1 = worldPos;
    roughness_7 = roughness_6;
    isDiffuseSample_1 = isDiffuseSample;
    isEnvSample_1 = isEnvSample;
    return vec3(0f);
}

fn doSample(viewPos: vec3<f32>, viewDir: vec3<f32>, viewNormal: vec3<f32>, worldPos_2: vec3<f32>, metalness_2: f32, roughness_8: f32, isDiffuseSample_2: bool, isEnvSample_2: bool, NoV_4: f32, NoL_3: f32, NoH_3: f32, LoH_1: f32, VoH: f32, random_2: vec4<f32>, l_2: ptr<function, vec3<f32>>, hitPos_2: ptr<function, vec3<f32>>, isMissedRay: ptr<function, bool>, brdf: ptr<function, vec3<f32>>, pdf: ptr<function, f32>) -> vec3<f32> {
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
            let _e60 = evalDisneyDiffuse(NoL_3, NoV_4, LoH_1, roughness_8, metalness_2);
            diffuseBrdf = _e60;
            (*pdf) = (NoL_3 / 3.1415927f);
            let _e64 = diffuseBrdf;
            (*brdf) = _e64;
        }
    } else {
        {
            let _e65 = evalDisneySpecular(roughness_8, NoH_3, NoV_4, NoL_3);
            specularBrdf = _e65;
            let _e67 = GGXVNDFPdf(NoH_3, NoV_4, roughness_8);
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
        let _e98 = getEnvColor(_e97, worldPos_2, roughness_8, isDiffuseSample_2, isEnvSample_2);
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
    let _e116 = getEnvColor(_e115, worldPos_2, roughness_8, isDiffuseSample_2, isEnvSample_2);
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
            let _e198 = mix(_e175.xyz, vec3(dot(vec3<f32>(0.2125f, 0.7154f, 0.0721f), _e187.xyz)), vec3((((1f - roughness_8) * _e193) * 0.4f)));
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

fn calculateAngles(h: ptr<function, vec3<f32>>, l_3: ptr<function, vec3<f32>>, v: ptr<function, vec3<f32>>, n_1: ptr<function, vec3<f32>>, NoL_4: ptr<function, f32>, NoH_4: ptr<function, f32>, LoH_2: ptr<function, f32>, VoH_1: ptr<function, f32>) {
    let _e39 = (*v);
    let _e40 = (*l_3);
    let _e42 = (*v);
    let _e43 = (*l_3);
    (*h) = normalize((_e42 + _e43));
    let _e48 = (*n_1);
    let _e49 = (*l_3);
    let _e57 = (*n_1);
    let _e58 = (*l_3);
    (*NoL_4) = clamp(dot(_e57, _e58), 0.00001f, 0.99999f);
    let _e67 = (*n_1);
    let _e68 = (*h);
    let _e76 = (*n_1);
    let _e77 = (*h);
    (*NoH_4) = clamp(dot(_e76, _e77), 0.00001f, 0.99999f);
    let _e86 = (*l_3);
    let _e87 = (*h);
    let _e95 = (*l_3);
    let _e96 = (*h);
    (*LoH_2) = clamp(dot(_e95, _e96), 0.00001f, 0.99999f);
    let _e105 = (*v);
    let _e106 = (*h);
    let _e114 = (*v);
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
    var n_2: vec3<f32>;
    var v_1: vec3<f32>;
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
    var local_2: vec3<f32>;
    var diffuseRay: vec3<f32>;
    var local_3: vec3<f32>;
    var specularRay: vec3<f32>;
    var directLight_1: vec3<f32>;
    var gDiffuse: vec4<f32>;
    var gSpecular: vec4<f32>;
    var rayLength: f32 = 0f;
    var hitPosWS: vec4<f32>;
    var cameraPosWS: vec3<f32>;
    var packedRoughnessRayLength: u32;
    var a_4: f32;

    let _e33 = vUv_1;
    let _e35 = textureSample(depthTexture, samp, _e33);
    unpackedDepth_2 = _e35;
    let _e38 = unpackedDepth_2;
    if (_e38 == 1f) {
        {
            let _e43 = vUv_1;
            let _e45 = textureSampleLevel(directLightTexture, samp, _e43, 0f);
            directLight = _e45;
            let _e47 = directLight;
            fragColor = _e47;
            return;
        }
    }
    let _e49 = vUv_1;
    let _e50 = getMaterial(_e49);
    mat = _e50;
    let _e51 = mat;
    let _e53 = mat;
    let _e58 = mat;
    let _e60 = mat;
    roughnessSq = clamp((_e58.roughness * _e60.roughness), 0.000001f, 1f);
    let _e68 = resolution;
    invTexSize = (vec2(1f) / _e68);
    let _e72 = unpackedDepth_2;
    let _e73 = getViewZ(_e72);
    viewZ_2 = _e73;
    let _e76 = viewZ_2;
    let _e77 = getViewPosition(_e76);
    viewPos_1 = _e77;
    let _e80 = viewPos_1;
    viewDir_1 = normalize(_e80);
    let _e83 = mat;
    worldNormal = normalize((vec4<f32>(_e83.normal.x, _e83.normal.y, _e83.normal.z, 1f) * viewMatrix).xyz);
    viewNormal_1 = _e83.normal;
    let _e105 = cameraMatrixWorld;
    let _e106 = viewPos_1;
    worldPos_3 = (_e105 * vec4<f32>(_e106.x, _e106.y, _e106.z, 1f)).xyz;
    let _e114 = viewNormal_1;
    n_2 = _e114;
    let _e116 = viewDir_1;
    v_1 = -(_e116);
    let _e122 = n_2;
    let _e123 = v_1;
    let _e128 = n_2;
    let _e129 = v_1;
    NoV_5 = max(0.00001f, dot(_e128, _e129));
    let _e133 = v_1;
    let _e139 = viewMatrix;
    V_3 = (vec4<f32>(_e133.x, _e133.y, _e133.z, 0f) * _e139).xyz;
    let _e143 = worldNormal;
    N_1 = _e143;
    let _e162 = N_1;
    Onb(_e162, (&T_1), (&B_1));
    let _e169 = T_1;
    let _e170 = B_1;
    let _e171 = N_1;
    let _e172 = V_3;
    let _e173 = ToLocal(_e169, _e170, _e171, _e172);
    V_3 = _e173;
    let _e176 = mat;
    let _e179 = mat;
    let _e183 = mat;
    let _e186 = mat;
    f0_2 = mix(vec3(0.04f), _e183.diffuse.xyz, vec3(_e186.metalness));
    let _e206 = vUv_1;
    let _e207 = blueNoise(_e206);
    random_3 = _e207;
    let _e211 = random_3;
    let _e213 = random_3;
    let _e215 = V_3;
    let _e216 = roughnessSq;
    let _e217 = roughnessSq;
    let _e218 = random_3;
    let _e220 = random_3;
    let _e222 = SampleGGXVNDF(_e215, _e216, _e217, _e218.x, _e220.y);
    H = _e222;
    let _e223 = H;
    if (_e223.z < 0f) {
        let _e227 = H;
        H = -(_e227);
    }
    let _e229 = V_3;
    let _e232 = V_3;
    let _e234 = H;
    let _e236 = V_3;
    let _e239 = V_3;
    let _e241 = H;
    l_4 = normalize(reflect(-(_e239), _e241));
    let _e248 = T_1;
    let _e249 = B_1;
    let _e250 = N_1;
    let _e251 = l_4;
    let _e252 = ToWorld(_e248, _e249, _e250, _e251);
    l_4 = _e252;
    let _e253 = l_4;
    let _e259 = cameraMatrixWorld;
    l_4 = (vec4<f32>(_e253.x, _e253.y, _e253.z, 0f) * _e259).xyz;
    let _e263 = l_4;
    l_4 = normalize(_e263);
    calculateAngles((&h_1), (&l_4), (&v_1), (&n_2), (&NoL_5), (&NoH_5), (&LoH_3), (&VoH_2));
    let _e281 = mode;
    if (_e281 == 0i) {
        {
            let _e286 = f0_2;
            let _e287 = VoH_2;
            let _e288 = F_Schlick(_e286, _e287);
            F = _e288;
            let _e290 = mat;
            let _e297 = mat;
            let _e304 = mat;
            diffW = ((1f - _e290.metalness) * dot(vec3<f32>(0.2125f, 0.7154f, 0.0721f), _e304.diffuse.xyz));
            let _e318 = F;
            specW = dot(vec3<f32>(0.2125f, 0.7154f, 0.0721f), _e318);
            let _e322 = diffW;
            diffW = max(_e322, 0.00001f);
            let _e327 = specW;
            specW = max(_e327, 0.00001f);
            let _e331 = diffW;
            let _e332 = specW;
            invW = (1f / (_e331 + _e332));
            let _e335 = diffW;
            let _e336 = invW;
            diffW = (_e335 * _e336);
            let _e338 = random_3;
            let _e340 = diffW;
            isDiffuseSample_3 = (_e338.z < _e340);
        }
    } else {
        {
            isDiffuseSample_3 = false;
        }
    }
    ems.pdf = 1f;
    envMisDir = vec3(0f);
    envPdf = 1f;
    let _e349 = ems;
    if _e349.isEnvSample {
        let _e351 = envMisDir;
        local_2 = _e351;
    } else {
        let _e353 = random_3;
        let _e355 = viewNormal_1;
        let _e356 = random_3;
        let _e358 = cosineSampleHemisphere(_e355, _e356.xy);
        local_2 = _e358;
    }
    let _e360 = local_2;
    diffuseRay = _e360;
    let _e362 = ems;
    if _e362.isEnvSample {
        let _e364 = envMisDir;
        local_3 = _e364;
    } else {
        let _e365 = l_4;
        local_3 = _e365;
    }
    let _e367 = local_3;
    specularRay = _e367;
    let _e369 = mode;
    if (_e369 == 0i) {
        {
            let _e372 = isDiffuseSample_3;
            if _e372 {
                {
                    let _e373 = diffuseRay;
                    l_4 = _e373;
                    calculateAngles((&h_1), (&l_4), (&v_1), (&n_2), (&NoL_5), (&NoH_5), (&LoH_3), (&VoH_2));
                    let _e394 = mat;
                    let _e398 = ems;
                    let _e411 = viewPos_1;
                    let _e412 = viewDir_1;
                    let _e413 = viewNormal_1;
                    let _e414 = worldPos_3;
                    let _e415 = mat;
                    let _e417 = roughnessSq;
                    let _e418 = isDiffuseSample_3;
                    let _e419 = ems;
                    let _e421 = NoV_5;
                    let _e422 = NoL_5;
                    let _e423 = NoH_5;
                    let _e424 = LoH_3;
                    let _e425 = VoH_2;
                    let _e426 = random_3;
                    let _e432 = doSample(_e411, _e412, _e413, _e414, _e415.metalness, _e417, _e418, _e419.isEnvSample, _e421, _e422, _e423, _e424, _e425, _e426, (&l_4), (&hitPos_3), (&isMissedRay_1), (&brdf_1), (&pdf_1));
                    gi = _e432;
                    let _e433 = gi;
                    let _e434 = brdf_1;
                    gi = (_e433 * _e434);
                    let _e436 = ems;
                    if _e436.isEnvSample {
                        {
                            let _e438 = gi;
                            let _e439 = ems;
                            let _e442 = ems;
                            let _e444 = pdf_1;
                            let _e445 = misHeuristic(_e442.pdf, _e444);
                            gi = (_e438 * _e445);
                        }
                    } else {
                        {
                            let _e447 = gi;
                            let _e448 = pdf_1;
                            gi = (_e447 / vec3(_e448));
                        }
                    }
                    let _e451 = gi;
                    let _e452 = ems;
                    gi = (_e451 / vec3(_e452.pdf));
                    let _e456 = diffuseSamples;
                    diffuseSamples = (_e456 + 1f);
                    let _e462 = diffuseSamples;
                    let _e464 = diffuseGI;
                    let _e465 = gi;
                    let _e467 = diffuseSamples;
                    diffuseGI = mix(_e464, _e465, vec3((1f / _e467)));
                }
            }
        }
    }
    let _e471 = specularRay;
    l_4 = _e471;
    calculateAngles((&h_1), (&l_4), (&v_1), (&n_2), (&NoL_5), (&NoH_5), (&LoH_3), (&VoH_2));
    let _e492 = mat;
    let _e496 = ems;
    let _e509 = viewPos_1;
    let _e510 = viewDir_1;
    let _e511 = viewNormal_1;
    let _e512 = worldPos_3;
    let _e513 = mat;
    let _e515 = roughnessSq;
    let _e516 = isDiffuseSample_3;
    let _e517 = ems;
    let _e519 = NoV_5;
    let _e520 = NoL_5;
    let _e521 = NoH_5;
    let _e522 = LoH_3;
    let _e523 = VoH_2;
    let _e524 = random_3;
    let _e530 = doSample(_e509, _e510, _e511, _e512, _e513.metalness, _e515, _e516, _e517.isEnvSample, _e519, _e520, _e521, _e522, _e523, _e524, (&l_4), (&hitPos_3), (&isMissedRay_1), (&brdf_1), (&pdf_1));
    gi = _e530;
    let _e531 = gi;
    let _e532 = brdf_1;
    gi = (_e531 * _e532);
    let _e534 = ems;
    if _e534.isEnvSample {
        {
            let _e536 = gi;
            let _e537 = ems;
            let _e540 = ems;
            let _e542 = pdf_1;
            let _e543 = misHeuristic(_e540.pdf, _e542);
            gi = (_e536 * _e543);
        }
    } else {
        {
            let _e545 = gi;
            let _e546 = pdf_1;
            gi = (_e545 / vec3(_e546));
        }
    }
    let _e549 = gi;
    let _e550 = ems;
    gi = (_e549 / vec3(_e550.pdf));
    let _e554 = hitPos_3;
    specularHitPos = _e554;
    let _e555 = specularSamples;
    specularSamples = (_e555 + 1f);
    let _e561 = specularSamples;
    let _e563 = specularGI;
    let _e564 = gi;
    let _e566 = specularSamples;
    specularGI = mix(_e563, _e564, vec3((1f / _e566)));
    let _e572 = vUv_1;
    let _e574 = textureSampleLevel(directLightTexture, samp, _e572, 0f);
    directLight_1 = _e574.xyz;
    let _e577 = diffuseGI;
    let _e578 = directLight_1;
    // diffuseGI = (_e577 + _e578);
    let _e580 = specularGI;
    let _e581 = directLight_1;
    // specularGI = (_e580 + _e581);
    let _e585 = mode;
    if (_e585 == 0i) {
        {
            let _e588 = diffuseSamples;
            if (_e588 == 0f) {
                diffuseGI = vec3(-1f);
            }
            let _e594 = diffuseGI;
            let _e595 = mat;
            gDiffuse = vec4<f32>(_e594.x, _e594.y, _e594.z, _e595.roughness);
        }
    }
    let _e606 = cameraMatrixWorld[3];
    cameraPosWS = _e606.xyz;
    let _e609 = hitPos_3;
    isMissedRay_1 = (_e609.x > 1000000000f);
    let _e613 = isMissedRay_1;
    if !(_e613) {
        {
            let _e615 = cameraMatrixWorld;
            let _e616 = specularHitPos;
            hitPosWS = (_e615 * vec4<f32>(_e616.x, _e616.y, _e616.z, 1f));
            let _e624 = hitPosWS;
            let _e626 = cameraPosWS;
            let _e627 = hitPosWS;
            rayLength = distance(_e626, _e627.xyz);
        }
    }
    let _e630 = rayLength;
    let _e631 = mat;
    let _e634 = rayLength;
    let _e635 = mat;
    packedRoughnessRayLength = pack2x16float(vec2<f32>(_e634, _e635.roughness));
    let _e641 = packedRoughnessRayLength;
    a_4 = bitcast<f32>(_e641);
    let _e644 = mode;
    if (_e644 == 0i) {
        {
            let _e647 = specularGI;
            let _e648 = rayLength;
            gSpecular = vec4<f32>(_e647.x, _e647.y, _e647.z, _e648);
            let _e653 = gDiffuse;
            let _e654 = gSpecular;
            let _e656 = mat;
            fragColor = ((_e653 + _e654) + vec4<f32>(_e656.emissive.x, _e656.emissive.y, _e656.emissive.z, 1f));
            return;
        }
    } else {
        {
            let _e664 = specularGI;
            let _e665 = a_4;
            gSpecular = vec4<f32>(_e664.x, _e664.y, _e664.z, _e665);
            let _e670 = gSpecular;
            fragColor = _e670;
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
`;

export const ssgiComposeFragWGSL = `
struct FragmentOutput {
    @location(0) outputColor: vec4<f32>,
}

var<private> uv_1: vec2<f32>;
var<private> outputColor: vec4<f32>;
@group(0) @binding(0)
var inputTexture: texture_2d<f32>;
@group(0) @binding(1)
var sceneTexture: texture_2d<f32>;
@group(0) @binding(2)
var depthTexture: texture_depth_2d;
@group(0) @binding(3)
var samp: sampler;

fn main_1() {
    var depth: f32;
    var ssgiClr: vec3<f32>;

    let _e8 = uv_1;
    let _e10 = textureSample(depthTexture, samp, _e8);
    depth = _e10;
    let _e14 = depth;
    if (_e14 == 1f) {
        {
            let _e19 = uv_1;
            let _e21 = textureSampleLevel(sceneTexture, samp, _e19, 0f);
            ssgiClr = _e21.xyz;
        }
    } else {
        {
            let _e25 = uv_1;
            let _e27 = textureSampleLevel(inputTexture, samp, _e25, 0f);
            ssgiClr = _e27.xyz;
        }
    }
    let _e29 = ssgiClr;
    outputColor = vec4<f32>(_e29.x, _e29.y, _e29.z, 1f);
    return;
}

@fragment
fn main(@location(0) uv: vec2<f32>) -> FragmentOutput {
    uv_1 = uv;
    main_1();
    let _e15 = outputColor;
    return FragmentOutput(_e15);
}

`;

export const poissonDenoiseFragWGSL = `
struct Material {
    diffuse: vec4<f32>,
    normal: vec3<f32>,
    roughness: f32,
    metalness: f32,
    emissive: vec3<f32>,
}

struct InputTexel {
    rgb: vec3<f32>,
    a: f32,
    luminance: f32,
    w: f32,
    totalWeight: f32,
    isSpecular: bool,
}

struct FragmentOutput {
    @location(0) outputColor: vec4<f32>,
}

var<private> vUv_1: vec2<f32>;
var<private> outputColor: vec4<f32>;
@group(0) @binding(0)
var inputTexture: texture_2d<f32>;
@group(0) @binding(1)
var depthTexture: texture_depth_2d;
@group(0) @binding(2)
var samp: sampler;
@group(1) @binding(0)
var<uniform> radius: f32;
@group(1) @binding(1)
var<uniform> phi: f32;
@group(1) @binding(2)
var<uniform> lumaPhi: f32;
@group(1) @binding(3)
var<uniform> depthPhi: f32;
@group(1) @binding(4)
var<uniform> normalPhi: f32;
@group(1) @binding(5)
var<uniform> roughnessPhi: f32;
@group(1) @binding(6)
var<uniform> specularPhi: f32;
@group(1) @binding(7)
var<uniform> resolution: vec2<f32>;
@group(2) @binding(0)
var normalTexture: texture_2d<f32>;
@group(2) @binding(1)
var diffuseTexture: texture_2d<f32>;
@group(2) @binding(2)
var materialTexture: texture_2d<f32>;
@group(2) @binding(3)
var gBufferSamp: sampler;
var<private> mat_2: Material;
var<private> normal_1: vec3<f32>;
var<private> depth: f32;
var<private> glossiness: f32;
var<private> specularFactor: f32;
var<private> POISSON: array<vec2<f32>, 8> = array<vec2<f32>, 8>(vec2<f32>(-1f, 0f), vec2<f32>(0f, -1f), vec2<f32>(1f, 0f), vec2<f32>(0f, 1f), vec2<f32>(-0.35355338f, -0.35355338f), vec2<f32>(0.35355338f, -0.35355338f), vec2<f32>(0.35355338f, 0.35355338f), vec2<f32>(-0.35355338f, 0.35355338f));

fn rand(co: vec2<f32>) -> f32 {
    var co_1: vec2<f32>;

    co_1 = co;
    let _e19 = co_1;
    let _e28 = co_1;
    let _e40 = co_1;
    let _e49 = co_1;
    return fract((sin(dot(_e49, vec2<f32>(12.9898f, 78.233f))) * 43758.547f) - 0.5f);
}

fn blueNoise(co_2: vec2<f32>) -> vec4<f32> {
    var co_3: vec2<f32>;

    co_3 = co_2;
    let _e16 = co_3;
    let _e17 = rand(_e16);
    let _e19 = co_3;
    let _e20 = rand(_e19);
    let _e22 = co_3;
    let _e23 = rand(_e22);
    let _e25 = co_3;
    let _e26 = rand(_e25);
    return vec4<f32>(_e17, _e20, _e23, _e26);
}

fn getMaterial(uv: vec2<f32>) -> Material {
    var uv_1: vec2<f32>;
    var diffuse: vec4<f32>;
    var normal: vec4<f32>;
    var materialProperties: vec4<f32>;
    var roughness: f32;
    var metalness: f32;
    var emissivePower: f32;
    var emissive: vec3<f32>;

    uv_1 = uv;
    let _e21 = uv_1;
    let _e23 = textureSampleLevel(diffuseTexture, gBufferSamp, _e21, 0f);
    diffuse = _e23;
    let _e27 = uv_1;
    let _e29 = textureSampleLevel(normalTexture, gBufferSamp, _e27, 0f);
    normal = _e29;
    let _e33 = uv_1;
    let _e35 = textureSampleLevel(materialTexture, gBufferSamp, _e33, 0f);
    materialProperties = _e35;
    let _e37 = materialProperties;
    roughness = _e37.x;
    let _e40 = materialProperties;
    metalness = _e40.y;
    let _e43 = materialProperties;
    emissivePower = _e43.z;
    let _e46 = emissivePower;
    emissive = vec3(_e46);
    let _e49 = diffuse;
    let _e50 = normal;
    let _e52 = roughness;
    let _e53 = metalness;
    let _e54 = emissive;
    return Material(_e49, _e50.xyz, _e52, _e53, _e54);
}

fn toDenoiseSpace(color: ptr<function, vec3<f32>>) {
    let _e23 = (*color);
    let _e27 = (*color);
    (*color) = log((_e27 + vec3(1f)));
    return;
}

fn toLinearSpace(color_1: ptr<function, vec3<f32>>) {
    let _e24 = (*color_1);
    (*color_1) = (exp(_e24) - vec3(1f));
    return;
}

fn getBasicNeighborWeight(neighborUv: ptr<function, vec2<f32>>) -> f32 {
    var neighborMat: Material;
    var neighborNormal: vec3<f32>;
    var neighborDepth: f32;
    var normalDiff: f32;
    var depthDiff: f32;
    var roughnessDiff: f32;
    var wBasic: f32;

    let _e24 = (*neighborUv);
    let _e25 = getMaterial(_e24);
    neighborMat = _e25;
    let _e27 = neighborMat;
    neighborNormal = _e27.normal;
    let _e32 = (*neighborUv);
    let _e34 = textureSample(depthTexture, samp, _e32);
    neighborDepth = _e34;
    let _e37 = neighborDepth;
    if (_e37 == 1f) {
        return 0f;
    }
    let _e44 = normal_1;
    let _e45 = neighborNormal;
    let _e50 = normal_1;
    let _e51 = neighborNormal;
    normalDiff = (1f - max(dot(_e50, _e51), 0f));
    let _e58 = depth;
    let _e59 = neighborDepth;
    let _e61 = depth;
    let _e62 = neighborDepth;
    depthDiff = (10000f * abs((_e61 - _e62)));
    let _e67 = mat_2;
    let _e69 = neighborMat;
    let _e72 = mat_2;
    let _e74 = neighborMat;
    roughnessDiff = abs((_e72.roughness - _e74.roughness));
    let _e79 = normalDiff;
    let _e81 = normalPhi;
    let _e83 = depthDiff;
    let _e84 = depthPhi;
    let _e87 = roughnessDiff;
    let _e88 = roughnessPhi;
    let _e91 = normalDiff;
    let _e93 = normalPhi;
    let _e95 = depthDiff;
    let _e96 = depthPhi;
    let _e99 = roughnessDiff;
    let _e100 = roughnessPhi;
    wBasic = exp((((-(_e91) * _e93) - (_e95 * _e96)) - (_e99 * _e100)));
    let _e105 = wBasic;
    return _e105;
}

fn getNormal(mat: Material) -> vec3<f32> {
    var mat_1: Material;

    mat_1 = mat;
    let _e24 = mat_1;
    return _e24.normal;
}

fn outputTexel(inp: InputTexel) {
    var inp_1: InputTexel;
    var local: vec3<f32>;

    inp_1 = inp;
    let _e26 = inp_1;
    let _e28 = inp_1;
    inp_1.rgb = (_e26.rgb / vec3(_e28.totalWeight));
    let _e32 = outputColor;
    let _e34 = inp_1;
    outputColor.x = _e34.rgb.x;
    outputColor.y = _e34.rgb.y;
    outputColor.z = _e34.rgb.z;
    let _e42 = outputColor;
    let _e44 = outputColor;
    local = _e44.xyz;
    toLinearSpace((&local));
    let _e53 = local.x;
    outputColor.x = _e53;
    let _e54 = local.y;
    outputColor.y = _e54;
    let _e55 = local.z;
    outputColor.z = _e55;
    let _e57 = inp_1;
    outputColor.w = _e57.a;
    return;
}

fn applyWeight(inp_2: ptr<function, InputTexel>, neighborUv_1: vec2<f32>, wBasic_1: f32) {
    var neighborUv_2: vec2<f32>;
    var wBasic_2: f32;
    var w: f32;
    var t: vec4<f32>;
    var local_1: vec3<f32>;
    var disocclW: f32;
    var lumaDiff: f32;
    var lumaFactor: f32;

    neighborUv_2 = neighborUv_1;
    wBasic_2 = wBasic_1;
    let _e28 = wBasic_2;
    w = _e28;
    let _e31 = (*inp_2);
    if _e31.isSpecular {
        {
            let _e35 = neighborUv_2;
            let _e37 = textureSampleLevel(inputTexture, samp, _e35, 0f);
            t = _e37;
            let _e38 = w;
            let _e39 = specularFactor;
            w = (_e38 * _e39);
        }
    } else {
        {
            let _e43 = neighborUv_2;
            let _e45 = textureSampleLevel(inputTexture, samp, _e43, 0f);
            t = _e45;
        }
    }
    let _e46 = t;
    let _e48 = t;
    local_1 = _e48.xyz;
    toDenoiseSpace((&local_1));
    let _e57 = local_1.x;
    t.x = _e57;
    let _e58 = local_1.y;
    t.y = _e58;
    let _e59 = local_1.z;
    t.z = _e59;
    let _e62 = w;
    disocclW = pow(_e62, 0.1f);
    let _e66 = (*inp_2);
    let _e72 = t;
    let _e78 = t;
    let _e86 = t;
    let _e92 = t;
    let _e98 = (*inp_2);
    let _e104 = t;
    let _e110 = t;
    let _e118 = t;
    let _e124 = t;
    lumaDiff = abs((_e98.luminance - pow(dot(vec3<f32>(0.2125f, 0.7154f, 0.0721f), _e124.xyz), 0.125f)));
    let _e134 = lumaDiff;
    lumaDiff = min(_e134, 0.5f);
    let _e137 = lumaDiff;
    let _e139 = lumaPhi;
    let _e141 = lumaDiff;
    let _e143 = lumaPhi;
    lumaFactor = exp((-(_e141) * _e143));
    let _e147 = w;
    let _e148 = lumaFactor;
    let _e151 = (*inp_2);
    let _e153 = w;
    let _e154 = lumaFactor;
    let _e156 = disocclW;
    let _e157 = (*inp_2);
    let _e160 = (*inp_2);
    w = (mix((_e153 * _e154), _e156, _e157.w) * _e160.w);
    let _e163 = w;
    let _e167 = w;
    w = (_e163 * step(0.0001f, _e167));
    let _e171 = (*inp_2);
    let _e173 = w;
    let _e174 = t;
    (*inp_2).rgb = (_e171.rgb + (_e173 * _e174.xyz));
    let _e179 = (*inp_2);
    let _e181 = w;
    (*inp_2).totalWeight = (_e179.totalWeight + _e181);
    return;
}

fn main_1() {
    var input: InputTexel;
    var maxAlpha: f32 = 0f;
    var t_1: vec4<f32>;
    var age: f32;
    var local_2: vec3<f32>;
    var inp_3: InputTexel;
    var flatness: f32;
    var random: vec4<f32>;
    var r: f32;
    var angle: f32;
    var s: f32;
    var c: f32;
    var rm: mat2x2<f32>;
    var i: i32 = 0i;
    var offset: vec2<f32>;
    var neighborUv_3: vec2<f32>;
    var wBasic_3: f32;

    let _e25 = vUv_1;
    let _e27 = textureSample(depthTexture, samp, _e25);
    depth = _e27;
    let _e29 = depth;
    let _e33 = depth;
    let _e34 = fwidth(_e33);
    if ((_e29 == 1f) && (_e34 == 0f)) {
        {
            discard;
        }
    }
    let _e44 = vUv_1;
    let _e46 = textureSampleLevel(inputTexture, samp, _e44, 0f);
    t_1 = _e46;
    let _e48 = t_1;
    let _e53 = phi;
    let _e55 = t_1;
    let _e60 = phi;
    age = (1f / pow((_e55.w + 1f), (1.2f * _e60)));
    let _e65 = t_1;
    let _e67 = t_1;
    let _e70 = (_e67.xyz * 1.0003f);
    t_1.x = _e70.x;
    t_1.y = _e70.y;
    t_1.z = _e70.z;
    let _e77 = t_1;
    let _e79 = t_1;
    local_2 = _e79.xyz;
    toDenoiseSpace((&local_2));
    let _e88 = local_2.x;
    t_1.x = _e88;
    let _e89 = local_2.y;
    t_1.y = _e89;
    let _e90 = local_2.z;
    t_1.z = _e90;
    let _e91 = t_1;
    let _e93 = t_1;
    let _e99 = t_1;
    let _e105 = t_1;
    let _e113 = t_1;
    let _e119 = t_1;
    let _e124 = age;
    inp_3 = InputTexel(_e91.xyz, _e93.w, pow(dot(vec3<f32>(0.2125f, 0.7154f, 0.0721f), _e119.xyz), 0.125f), _e124, 1f, false);
    let _e130 = inp_3;
    let _e132 = maxAlpha;
    let _e133 = inp_3;
    maxAlpha = max(_e132, _e133.a);
    let _e136 = inp_3;
    input = _e136;
    let _e138 = vUv_1;
    let _e139 = getMaterial(_e138);
    mat_2 = _e139;
    let _e141 = mat_2;
    let _e142 = getNormal(_e141);
    normal_1 = _e142;
    let _e146 = mat_2;
    let _e155 = mat_2;
    glossiness = max(0f, (4f * (1f - (_e155.roughness / 0.25f))));
    let _e162 = glossiness;
    let _e164 = specularPhi;
    let _e166 = glossiness;
    let _e168 = specularPhi;
    specularFactor = exp((-(_e166) * _e168));
    let _e173 = normal_1;
    let _e176 = normal_1;
    let _e177 = fwidth(_e176);
    let _e181 = normal_1;
    let _e184 = normal_1;
    let _e185 = fwidth(_e184);
    flatness = (1f - min(length(_e185), 1f));
    let _e193 = flatness;
    flatness = ((pow(_e193, 2f) * 0.75f) + 0.25f);
    let _e201 = vUv_1;
    let _e202 = blueNoise(_e201);
    random = _e202;
    let _e204 = radius;
    r = _e204;
    let _e206 = random;
    angle = ((_e206.x * 2f) * 3.1415927f);
    let _e214 = angle;
    s = sin(_e214);
    let _e218 = angle;
    c = cos(_e218);
    let _e221 = r;
    let _e222 = flatness;
    let _e224 = c;
    let _e225 = s;
    let _e227 = s;
    let _e228 = c;
    rm = ((_e221 * _e222) * mat2x2<f32>(vec2<f32>(_e224, -(_e225)), vec2<f32>(_e227, _e228)));
    loop {
        let _e236 = i;
        if !((_e236 < 8i)) {
            break;
        }
        {
            {
                let _e243 = i;
                let _e245 = POISSON[_e243];
                offset = _e245;
                let _e247 = vUv_1;
                let _e248 = rm;
                let _e249 = offset;
                let _e250 = resolution;
                neighborUv_3 = (_e247 + (_e248 * (_e249 / _e250)));
                let _e257 = getBasicNeighborWeight((&neighborUv_3));
                wBasic_3 = _e257;
                let _e263 = neighborUv_3;
                let _e264 = wBasic_3;
                applyWeight((&input), _e263, _e264);
            }
        }
        continuing {
            let _e240 = i;
            i = (_e240 + 1i);
        }
    }
    let _e266 = input;
    outputTexel(_e266);
    return;
}

@fragment
fn main(@location(0) vUv: vec2<f32>) -> FragmentOutput {
    vUv_1 = vUv;
    main_1();
    let _e96 = outputColor;
    return FragmentOutput(_e96);
}
`;

export const modelFragWGSL = `
struct FragmentOutput {
    @location(0) outColor: vec4<f32>,
}

var<private> vDiffuse_1: vec4<f32>;
var<private> vNormal_1: vec3<f32>;
var<private> vRoughness_1: f32;
var<private> vMetalness_1: f32;
var<private> vEmissive_1: vec3<f32>;
var<private> outColor: vec4<f32>;

fn main_1() {
    let _e6 = vDiffuse_1;
    let _e7 = vEmissive_1;
    outColor = (_e6 + vec4<f32>(_e7.x, _e7.y, _e7.z, 1f));
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
    let _e23 = outColor;
    return FragmentOutput(_e23);
}
`;

export const normalFragWGSL = `
struct FragmentOutput {
    @location(0) outColor: vec4<f32>,
}

var<private> vDiffuse_1: vec4<f32>;
var<private> vNormal_1: vec3<f32>;
var<private> vRoughness_1: f32;
var<private> vMetalness_1: f32;
var<private> vEmissive_1: vec3<f32>;
var<private> outColor: vec4<f32>;

fn main_1() {
    let _e6 = vNormal_1;
    outColor = vec4<f32>(_e6.x, _e6.y, _e6.z, 0f);
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
    let _e23 = outColor;
    return FragmentOutput(_e23);
}
`;

export const materialFragWGSL = `
struct FragmentOutput {
    @location(0) outColor: vec4<f32>,
}

var<private> vDiffuse_1: vec4<f32>;
var<private> vNormal_1: vec3<f32>;
var<private> vRoughness_1: f32;
var<private> vMetalness_1: f32;
var<private> vEmissive_1: vec3<f32>;
var<private> outColor: vec4<f32>;

fn main_1() {
    var emissivePower: f32;

    let _e6 = vEmissive_1;
    let _e8 = vEmissive_1;
    let _e11 = vEmissive_1;
    emissivePower = (((_e6.x + _e8.y) + _e11.z) / 3f);
    let _e17 = vRoughness_1;
    let _e18 = vMetalness_1;
    let _e19 = emissivePower;
    outColor = vec4<f32>(_e17, _e18, _e19, 0f);
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
    let _e23 = outColor;
    return FragmentOutput(_e23);
}
`;

export const modelVertWGSL = `
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
    vNormal = normal_1;
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
