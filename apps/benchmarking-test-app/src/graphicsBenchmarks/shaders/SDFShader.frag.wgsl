struct FragmentOutput {
    @location(0) FragColor: vec4<f32>,
    @builtin(frag_depth) gl_FragDepth: f32,
}

@group(1) @binding(0) 
var inputBufferTexture: texture_2d<f32>;
@group(1) @binding(1) 
var inputBufferSampler: sampler;
@group(1) @binding(2) 
var noiseTexture: texture_2d<f32>;
@group(1) @binding(3) 
var noiseSampler: sampler;
@group(1) @binding(4) 
var uDepthTexture: texture_2d<f32>;
@group(1) @binding(5) 
var uDepthSampler: sampler;
@group(0) @binding(5) 
var<uniform> cameraPos: vec3<f32>;
@group(0) @binding(6) 
var<uniform> cameraMatrix: mat4x4<f32>;
@group(0) @binding(7) 
var<uniform> uTime: f32;
@group(0) @binding(8) 
var<uniform> fov: f32;
@group(0) @binding(10) 
var<uniform> aspectRatio: f32;
@group(0) @binding(11) 
var<uniform> near: f32;
@group(0) @binding(12) 
var<uniform> uColor: vec3<f32>;
@group(0) @binding(13) 
var<uniform> scale: vec3<f32>;
@group(0) @binding(14) 
var<uniform> mode: i32;
@group(0) @binding(15) 
var<uniform> sdfMatrix: mat4x4<f32>;
@group(0) @binding(16) 
var<uniform> sdfMatrixInv: mat4x4<f32>;
@group(0) @binding(17) 
var<uniform> lightDirection: vec3<f32>;
var<private> vUv_1: vec2<f32>;
@group(0) @binding(18) 
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
    let _e27 = uTime;
    angle = _e27;
    let _e30 = angle;
    c = cos(_e30);
    let _e34 = angle;
    s = sin(_e34);
    let _e41 = c;
    let _e42 = s;
    let _e45 = s;
    let _e46 = c;
    rotationMatrix = mat3x3<f32>(vec3<f32>(1f, 0f, 0f), vec3<f32>(0f, _e41, -(_e42)), vec3<f32>(0f, _e45, _e46));
    let _e52 = rotationMatrix;
    let _e53 = p_1;
    p_1 = (_e52 * _e53);
    let _e55 = p_1;
    let _e57 = p_1;
    let _e60 = t_1;
    let _e63 = p_1;
    q = vec2<f32>((length(_e57.xz) - _e60.x), _e63.y);
    let _e68 = q;
    let _e70 = t_1;
    let _e73 = q;
    return vec3<f32>((length(_e68) - _e70.y), _e73.y, 0f);
}

fn cloudShape(p_2: vec3<f32>) -> f32 {
    var p_3: vec3<f32>;
    var textureSize: f32 = 128f;
    var thisScale: vec3<f32>;
    var transformedP: vec3<f32>;
    var scaledP: vec3<f32>;
    var sliceSize: f32;
    var slice: f32;
    var x: f32;
    var y: f32;
    var density: f32;

    p_3 = p_2;
    let _e27 = scale;
    thisScale = _e27;
    let _e29 = p_3;
    transformedP = _e29;
    let _e32 = transformedP;
    let _e34 = uTime;
    let _e35 = uTime;
    let _e38 = uTime;
    let _e45 = uTime;
    let _e46 = uTime;
    let _e49 = uTime;
    transformedP.x = (_e32.x + (sin((_e45 + (sin((_e49 * 0.27f)) * 0.5f))) * 5f));
    let _e61 = transformedP;
    let _e63 = uTime;
    let _e64 = uTime;
    let _e67 = uTime;
    let _e74 = uTime;
    let _e75 = uTime;
    let _e78 = uTime;
    transformedP.y = (_e61.y + (cos((_e74 + (cos((_e78 * 0.33f)) * 0.3f))) * 5f));
    let _e90 = transformedP;
    let _e92 = uTime;
    let _e93 = uTime;
    let _e96 = uTime;
    let _e103 = uTime;
    let _e104 = uTime;
    let _e107 = uTime;
    transformedP.z = (_e90.z + (sin((_e103 + (sin((_e107 * 0.22f)) * 0.4f))) * 5f));
    let _e118 = transformedP;
    let _e119 = thisScale;
    scaledP = (_e118 * _e119);
    let _e123 = textureSize;
    sliceSize = (1f / _e123);
    let _e126 = scaledP;
    let _e128 = textureSize;
    let _e130 = scaledP;
    let _e132 = textureSize;
    slice = floor((_e130.z * _e132));
    let _e136 = scaledP;
    let _e138 = scaledP;
    let _e140 = scaledP;
    x = (_e136.x - floor(_e140.x));
    let _e145 = scaledP;
    let _e147 = scaledP;
    let _e149 = scaledP;
    let _e153 = slice;
    let _e154 = sliceSize;
    y = ((_e145.y - floor(_e149.y)) + (_e153 * _e154));
    let _e158 = x;
    let _e159 = y;
    let _e161 = x;
    let _e162 = y;
    let _e164 = textureSample(noiseTexture, noiseSampler, vec2<f32>(_e161, _e162));
    density = _e164.x;
    let _e167 = density;
    return (_e167 * 0.025f);
}

fn rayMarchClouds(ro: vec3<f32>, rd: vec3<f32>) -> vec4<f32> {
    var ro_1: vec3<f32>;
    var rd_1: vec3<f32>;
    var d: f32 = 0f;
    var accumulatedColor: vec4<f32> = vec4(0f);
    var i: i32 = 0i;
    var p_4: vec3<f32>;
    var depthFromCamera: f32;
    var depthFromTexture: f32;
    var density_1: f32;
    var cloudColor: vec3<f32>;
    var alpha: f32;

    ro_1 = ro;
    rd_1 = rd;
    loop {
        let _e34 = i;
        let _e37 = d;
        if !(((_e34 < 100i) && (_e37 < 5000f))) {
            break;
        }
        {
            let _e45 = ro_1;
            let _e46 = rd_1;
            let _e47 = d;
            p_4 = (_e45 + (_e46 * _e47));
            let _e51 = p_4;
            let _e52 = cameraPos;
            let _e54 = p_4;
            let _e55 = cameraPos;
            depthFromCamera = length((_e54 - _e55));
            let _e60 = vUv_1;
            let _e61 = textureSample(uDepthTexture, uDepthSampler, _e60);
            depthFromTexture = (_e61.x * 10f);
            let _e66 = depthFromCamera;
            let _e67 = depthFromTexture;
            if (_e66 > _e67) {
                {
                    break;
                }
            }
            let _e70 = p_4;
            let _e71 = cloudShape(_e70);
            density_1 = _e71;
            let _e73 = density_1;
            if (_e73 > 0.001f) {
                {
                    cloudColor = vec3<f32>(1f, 1f, 1f);
                    let _e81 = density_1;
                    alpha = _e81;
                    let _e83 = accumulatedColor;
                    let _e84 = cloudColor;
                    let _e85 = alpha;
                    let _e86 = (_e84 * _e85);
                    let _e87 = alpha;
                    let _e93 = accumulatedColor;
                    accumulatedColor = (_e83 + (vec4<f32>(_e86.x, _e86.y, _e86.z, _e87) * (1f - _e93.w)));
                }
            }
            let _e98 = d;
            d = (_e98 + 0.1f);
        }
        continuing {
            let _e42 = i;
            i = (_e42 + 1i);
        }
    }
    let _e101 = accumulatedColor;
    return _e101;
}

fn shortestDistanceToTorus(ro_2: vec3<f32>, t_2: vec2<f32>) -> f32 {
    var ro_3: vec3<f32>;
    var t_3: vec2<f32>;

    ro_3 = ro_2;
    t_3 = t_2;
    let _e27 = sdfMatrixInv;
    let _e28 = ro_3;
    ro_3 = (_e27 * vec4<f32>(_e28.x, _e28.y, _e28.z, 1f)).xyz;
    let _e38 = ro_3;
    let _e39 = t_3;
    let _e40 = torus(_e38, _e39);
    return _e40.x;
}

fn estimateNormal(p_5: vec3<f32>, torusParams: vec2<f32>) -> vec3<f32> {
    var p_6: vec3<f32>;
    var torusParams_1: vec2<f32>;
    var epsilon: f32 = 0.01f;

    p_6 = p_5;
    torusParams_1 = torusParams;
    let _e29 = p_6;
    let _e30 = epsilon;
    let _e36 = p_6;
    let _e37 = epsilon;
    let _e42 = torusParams_1;
    let _e43 = shortestDistanceToTorus((_e36 + vec3<f32>(_e37, 0f, 0f)), _e42);
    let _e44 = p_6;
    let _e45 = epsilon;
    let _e51 = p_6;
    let _e52 = epsilon;
    let _e57 = torusParams_1;
    let _e58 = shortestDistanceToTorus((_e51 - vec3<f32>(_e52, 0f, 0f)), _e57);
    let _e60 = p_6;
    let _e62 = epsilon;
    let _e67 = p_6;
    let _e69 = epsilon;
    let _e73 = torusParams_1;
    let _e74 = shortestDistanceToTorus((_e67 + vec3<f32>(0f, _e69, 0f)), _e73);
    let _e75 = p_6;
    let _e77 = epsilon;
    let _e82 = p_6;
    let _e84 = epsilon;
    let _e88 = torusParams_1;
    let _e89 = shortestDistanceToTorus((_e82 - vec3<f32>(0f, _e84, 0f)), _e88);
    let _e91 = p_6;
    let _e94 = epsilon;
    let _e98 = p_6;
    let _e101 = epsilon;
    let _e104 = torusParams_1;
    let _e105 = shortestDistanceToTorus((_e98 + vec3<f32>(0f, 0f, _e101)), _e104);
    let _e106 = p_6;
    let _e109 = epsilon;
    let _e113 = p_6;
    let _e116 = epsilon;
    let _e119 = torusParams_1;
    let _e120 = shortestDistanceToTorus((_e113 - vec3<f32>(0f, 0f, _e116)), _e119);
    let _e123 = p_6;
    let _e124 = epsilon;
    let _e130 = p_6;
    let _e131 = epsilon;
    let _e136 = torusParams_1;
    let _e137 = shortestDistanceToTorus((_e130 + vec3<f32>(_e131, 0f, 0f)), _e136);
    let _e138 = p_6;
    let _e139 = epsilon;
    let _e145 = p_6;
    let _e146 = epsilon;
    let _e151 = torusParams_1;
    let _e152 = shortestDistanceToTorus((_e145 - vec3<f32>(_e146, 0f, 0f)), _e151);
    let _e154 = p_6;
    let _e156 = epsilon;
    let _e161 = p_6;
    let _e163 = epsilon;
    let _e167 = torusParams_1;
    let _e168 = shortestDistanceToTorus((_e161 + vec3<f32>(0f, _e163, 0f)), _e167);
    let _e169 = p_6;
    let _e171 = epsilon;
    let _e176 = p_6;
    let _e178 = epsilon;
    let _e182 = torusParams_1;
    let _e183 = shortestDistanceToTorus((_e176 - vec3<f32>(0f, _e178, 0f)), _e182);
    let _e185 = p_6;
    let _e188 = epsilon;
    let _e192 = p_6;
    let _e195 = epsilon;
    let _e198 = torusParams_1;
    let _e199 = shortestDistanceToTorus((_e192 + vec3<f32>(0f, 0f, _e195)), _e198);
    let _e200 = p_6;
    let _e203 = epsilon;
    let _e207 = p_6;
    let _e210 = epsilon;
    let _e213 = torusParams_1;
    let _e214 = shortestDistanceToTorus((_e207 - vec3<f32>(0f, 0f, _e210)), _e213);
    return normalize(vec3<f32>((_e137 - _e152), (_e168 - _e183), (_e199 - _e214)));
}

fn opUnion(d1_: f32, d2_: f32) -> f32 {
    var d1_1: f32;
    var d2_1: f32;

    d1_1 = d1_;
    d2_1 = d2_;
    let _e29 = d1_1;
    let _e30 = d2_1;
    return min(_e29, _e30);
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
    let _e33 = a_1;
    let _e34 = b_1;
    let _e36 = c_2;
    let _e37 = t_5;
    let _e39 = d_2;
    let _e43 = c_2;
    let _e44 = t_5;
    let _e46 = d_2;
    return (_e33 + (_e34 * cos((6.28318f * ((_e43 * _e44) + _e46)))));
}

fn spectrum(n: f32) -> vec3<f32> {
    var n_1: f32;

    n_1 = n;
    let _e42 = n_1;
    let _e59 = pal(_e42, vec3<f32>(0.5f, 0.5f, 0.5f), vec3<f32>(0.5f, 0.5f, 0.5f), vec3<f32>(1f, 1f, 1f), vec3<f32>(0f, 0.33f, 0.67f));
    return _e59;
}

fn gamma(color: vec3<f32>, g: f32) -> vec3<f32> {
    var color_1: vec3<f32>;
    var g_1: f32;

    color_1 = color;
    g_1 = g;
    let _e28 = g_1;
    let _e30 = color_1;
    let _e31 = g_1;
    return pow(_e30, vec3(_e31));
}

fn linearToScreen(linearRGB: vec3<f32>) -> vec3<f32> {
    var linearRGB_1: vec3<f32>;
    var GAMMA: f32 = 2.2f;

    linearRGB_1 = linearRGB;
    let _e29 = GAMMA;
    let _e31 = linearRGB_1;
    let _e33 = GAMMA;
    let _e35 = gamma(_e31, (1f / _e33));
    return _e35;
}

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
    let _e27 = sdfMatrixInv;
    invsdfMatrix = _e27;
    loop {
        let _e33 = i_1;
        let _e36 = d_3;
        if !(((_e33 < 100i) && (_e36 < 5000f))) {
            break;
        }
        {
            let _e44 = ro_5;
            let _e45 = rd_3;
            let _e46 = d_3;
            p_7 = (_e44 + (_e45 * _e46));
            let _e54 = p_7;
            let _e58 = shortestDistanceToTorus(_e54, vec2<f32>(0.5f, 0.2f));
            dist = _e58;
            let _e60 = dist;
            if (_e60 < 0.001f) {
                {
                    let _e64 = vUv_1;
                    let _e65 = textureSample(uDepthTexture, uDepthSampler, _e64);
                    depth1_ = (_e65.x * 0.5f);
                    let _e70 = depth1_;
                    let _e83 = depth1_;
                    linearDepth1_ = (exp2((_e83 * 26.575424f)) - 1f);
                    let _e100 = d_3;
                    let _e101 = linearDepth1_;
                    if (_e100 > _e101) {
                        {
                            break;
                        }
                    }
                    let _e107 = p_7;
                    let _e111 = estimateNormal(_e107, vec2<f32>(0.5f, 0.2f));
                    normal = _e111;
                    let _e113 = ro_5;
                    let _e114 = p_7;
                    let _e116 = ro_5;
                    let _e117 = p_7;
                    eyeDirection = normalize((_e116 - _e117));
                    let _e123 = normal;
                    let _e125 = rd_3;
                    let _e127 = normal;
                    reflection = reflect(_e125, normalize(_e127));
                    dome = vec3<f32>(0f, 1f, 0f);
                    let _e140 = normal;
                    nor = normalize(_e140);
                    let _e143 = p_7;
                    let _e146 = p_7;
                    perturb = sin((_e146 * 10f));
                    let _e151 = nor;
                    let _e152 = perturb;
                    let _e157 = nor;
                    let _e158 = perturb;
                    let _e162 = eyeDirection;
                    let _e166 = nor;
                    let _e167 = perturb;
                    let _e172 = nor;
                    let _e173 = perturb;
                    let _e177 = eyeDirection;
                    let _e181 = spectrum((dot((_e172 + (_e173 * 0.05f)), _e177) * 2f));
                    iridescentColor = _e181;
                    let _e185 = reflection;
                    let _e186 = lightDirection;
                    let _e192 = reflection;
                    let _e193 = lightDirection;
                    specular2_ = clamp(dot(_e192, _e193), 0f, 1f);
                    let _e199 = specular2_;
                    let _e204 = specular2_;
                    let _e217 = specular2_;
                    let _e222 = specular2_;
                    let _e236 = specular2_;
                    specular2_ = (pow((((sin(((_e222 * 20f) - 3f)) * 0.5f) + 0.5f) + 0.1f), 32f) * _e236);
                    let _e238 = specular2_;
                    specular2_ = (_e238 * 0.1f);
                    let _e241 = specular2_;
                    let _e244 = reflection;
                    let _e245 = lightDirection;
                    let _e251 = reflection;
                    let _e252 = lightDirection;
                    let _e262 = reflection;
                    let _e263 = lightDirection;
                    let _e269 = reflection;
                    let _e270 = lightDirection;
                    specular2_ = (_e241 + (pow((clamp(dot(_e269, _e270), 0f, 1f) + 0.3f), 8f) * 0.1f));
                    let _e284 = nor;
                    let _e285 = dome;
                    let _e295 = nor;
                    let _e296 = dome;
                    let _e308 = nor;
                    let _e309 = dome;
                    let _e319 = nor;
                    let _e320 = dome;
                    shadow = pow(clamp(((dot(_e319, _e320) * 0.5f) + 1.2f), 0f, 1f), 3f);
                    let _e332 = iridescentColor;
                    let _e333 = shadow;
                    let _e335 = specular2_;
                    iridescentColor = ((_e332 * _e333) + vec3(_e335));
                    let _e338 = p_7;
                    let _e339 = cameraPos;
                    let _e341 = p_7;
                    let _e342 = cameraPos;
                    cameraDist = length((_e341 - _e342));
                    let _e351 = cameraDist;
                    shade = smoothstep(0f, 5f, _e351);
                    ambientColor = vec3<f32>(0.2f, 0.2f, 0.2f);
                    let _e359 = uColor;
                    diffuseColor = (_e359 * 2f);
                    specularColor = vec3<f32>(1f, 1f, 1f);
                    shininess = 32f;
                    let _e371 = lightDirection;
                    normalLightDirection = normalize(_e371);
                    let _e376 = normal;
                    let _e378 = normalLightDirection;
                    let _e381 = normal;
                    let _e383 = normalLightDirection;
                    let _e388 = normal;
                    let _e390 = normalLightDirection;
                    let _e393 = normal;
                    let _e395 = normalLightDirection;
                    diffuseFactor = max(0f, dot(normalize(_e393), -(_e395)));
                    let _e400 = diffuseColor;
                    let _e401 = diffuseFactor;
                    diffuse = (_e400 * _e401);
                    let _e404 = cameraPos;
                    let _e405 = p_7;
                    let _e407 = cameraPos;
                    let _e408 = p_7;
                    viewDirection = normalize((_e407 - _e408));
                    let _e414 = normal;
                    let _e416 = normalLightDirection;
                    let _e418 = normal;
                    reflectionDirection = reflect(_e416, normalize(_e418));
                    let _e425 = viewDirection;
                    let _e426 = reflectionDirection;
                    let _e431 = viewDirection;
                    let _e432 = reflectionDirection;
                    let _e439 = viewDirection;
                    let _e440 = reflectionDirection;
                    let _e445 = viewDirection;
                    let _e446 = reflectionDirection;
                    let _e449 = shininess;
                    specularFactor = pow(max(0f, dot(_e445, _e446)), _e449);
                    let _e452 = specularColor;
                    let _e453 = specularFactor;
                    specular = (_e452 * _e453);
                    let _e456 = ambientColor;
                    let _e457 = diffuse;
                    let _e459 = specular;
                    phongColor = ((_e456 + _e457) + _e459);
                    let _e468 = phongColor;
                    let _e469 = shade;
                    finalColor = mix(vec3(0f), _e468, vec3(_e469));
                    let _e476 = finalColor;
                    let _e477 = iridescentColor;
                    let _e480 = mix(_e476, _e477, vec3(0.2f));
                    finalColor = _e480;
                    return _e480;
                }
            }
            let _e481 = d_3;
            let _e482 = dist;
            d_3 = (_e481 + _e482);
        }
        continuing {
            let _e41 = i_1;
            i_1 = (_e41 + 1i);
        }
    }
    return vec3(-1f);
}

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

    let _e23 = vUv_1;
    uv = _e23;
    let _e26 = fov;
    let _e31 = fov;
    tanHalfFov = tan((radians(_e31) / 2f));
    let _e37 = uv;
    let _e41 = aspectRatio;
    let _e45 = tanHalfFov;
    let _e47 = uv;
    let _e53 = tanHalfFov;
    clipSpaceDir = vec3<f32>(((((_e37.x - 0.5f) * _e41) * 2f) * _e45), (((_e47.y - 0.5f) * 2f) * _e53), -1f);
    let _e59 = cameraMatrix;
    let _e60 = clipSpaceDir;
    viewDir = (_e59 * vec4<f32>(_e60.x, _e60.y, _e60.z, 0f)).xyz;
    let _e70 = viewDir;
    viewDir = normalize(_e70);
    let _e73 = uv;
    let _e74 = textureSample(inputBufferTexture, inputBufferSampler, _e73);
    FragColor = _e74;
    let _e75 = mode;
    if (_e75 == 0i) {
        {
            let _e80 = cameraPos;
            let _e81 = viewDir;
            let _e82 = rayMarchPhong(_e80, _e81);
            color_2 = _e82;
            let _e84 = color_2;
            if any((_e84 != vec3(-1f))) {
                {
                    let _e90 = color_2;
                    FragColor = vec4<f32>(_e90.x, _e90.y, _e90.z, 1f);
                }
            }
        }
    } else {
        let _e96 = mode;
        if (_e96 == 3i) {
            {
                let _e101 = cameraPos;
                let _e102 = viewDir;
                let _e103 = rayMarchClouds(_e101, _e102);
                cloudColor_1 = _e103;
                let _e106 = uv;
                let _e107 = textureSample(inputBufferTexture, inputBufferSampler, _e106);
                backgroundColor = _e107;
                let _e110 = outputColor;
                let _e112 = cloudColor_1;
                let _e114 = cloudColor_1;
                let _e117 = backgroundColor;
                let _e120 = cloudColor_1;
                let _e124 = ((_e112.xyz * _e114.w) + (_e117.xyz * (1f - _e120.w)));
                outputColor.x = _e124.x;
                outputColor.y = _e124.y;
                outputColor.z = _e124.z;
                outputColor.w = 1f;
                let _e133 = outputColor;
                FragColor = _e133;
            }
        }
    }
    let _e136 = vIsPerspective_1;
    if (_e136 == 0f) {
        let _e139 = gl_FragCoord_1;
        local = _e139.z;
    } else {
        let _e142 = vFragDepth_1;
        let _e144 = logDepthBufFC;
        local = ((log2(_e142) * _e144) * 0.5f);
    }
    let _e149 = local;
    gl_FragDepth = _e149;
    return;
}

@fragment 
fn main(@location(0) vUv: vec2<f32>, @location(1) vFragDepth: f32, @location(2) vIsPerspective: f32, @builtin(position) gl_FragCoord: vec4<f32>) -> FragmentOutput {
    vUv_1 = vUv;
    vFragDepth_1 = vFragDepth;
    vIsPerspective_1 = vIsPerspective;
    gl_FragCoord_1 = gl_FragCoord;
    main_1();
    let _e55 = FragColor;
    let _e57 = gl_FragDepth;
    return FragmentOutput(_e55, _e57);
}
