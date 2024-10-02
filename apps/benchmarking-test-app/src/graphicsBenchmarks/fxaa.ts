export const fxaaVertWGSL = `
struct VertexOutput {
    @location(0) vUv: vec2<f32>,
    @location(1) vUvDown: vec2<f32>,
    @location(2) vUvUp: vec2<f32>,
    @location(3) vUvLeft: vec2<f32>,
    @location(4) vUvRight: vec2<f32>,
    @location(5) vUvDownLeft: vec2<f32>,
    @location(6) vUvUpRight: vec2<f32>,
    @location(7) vUvUpLeft: vec2<f32>,
    @location(8) vUvDownRight: vec2<f32>,
    @builtin(position) gl_Position: vec4<f32>,
}

@group(0) @binding(0)
var<uniform> texelSize: vec2<f32>;
var<private> position_1: vec4<f32>;
var<private> uv_1: vec2<f32>;
var<private> vUv: vec2<f32>;
var<private> vUvDown: vec2<f32>;
var<private> vUvUp: vec2<f32>;
var<private> vUvLeft: vec2<f32>;
var<private> vUvRight: vec2<f32>;
var<private> vUvDownLeft: vec2<f32>;
var<private> vUvUpRight: vec2<f32>;
var<private> vUvUpLeft: vec2<f32>;
var<private> vUvDownRight: vec2<f32>;
var<private> gl_Position: vec4<f32>;

fn main_1() {
    let _e12 = uv_1;
    vUv = _e12;
    let _e13 = uv_1;
    let _e18 = texelSize;
    vUvDown = (_e13 + (vec2<f32>(0f, -1f) * _e18));
    let _e21 = uv_1;
    let _e25 = texelSize;
    vUvUp = (_e21 + (vec2<f32>(0f, 1f) * _e25));
    let _e28 = uv_1;
    let _e32 = texelSize;
    vUvRight = (_e28 + (vec2<f32>(1f, 0f) * _e32));
    let _e35 = uv_1;
    let _e40 = texelSize;
    vUvLeft = (_e35 + (vec2<f32>(-1f, 0f) * _e40));
    let _e43 = uv_1;
    let _e49 = texelSize;
    vUvDownLeft = (_e43 + (vec2<f32>(-1f, -1f) * _e49));
    let _e52 = uv_1;
    let _e56 = texelSize;
    vUvUpRight = (_e52 + (vec2<f32>(1f, 1f) * _e56));
    let _e59 = uv_1;
    let _e64 = texelSize;
    vUvUpLeft = (_e59 + (vec2<f32>(-1f, 1f) * _e64));
    let _e67 = uv_1;
    let _e72 = texelSize;
    vUvDownRight = (_e67 + (vec2<f32>(1f, -1f) * _e72));
    let _e76 = position_1;
    let _e78 = position_1;
    let _e81 = position_1;
    gl_Position = vec4<f32>(_e76.x, -(_e78.y), _e81.z, 1f);
    return;
}

@vertex
fn main(@location(0) position: vec4<f32>, @location(1) uv: vec2<f32>) -> VertexOutput {
    position_1 = position;
    uv_1 = uv;
    main_1();
    let _e29 = vUv;
    let _e31 = vUvDown;
    let _e33 = vUvUp;
    let _e35 = vUvLeft;
    let _e37 = vUvRight;
    let _e39 = vUvDownLeft;
    let _e41 = vUvUpRight;
    let _e43 = vUvUpLeft;
    let _e45 = vUvDownRight;
    let _e47 = gl_Position;
    return VertexOutput(_e29, _e31, _e33, _e35, _e37, _e39, _e41, _e43, _e45, _e47);
}

`;

export const fxaaFragWGSL = `
struct FragmentOutput {
    @location(0) outputColor: vec4<f32>,
}

@group(0) @binding(0)
var<uniform> texelSize: vec2<f32>;
@group(0) @binding(1)
var inputBufferTexture: texture_2d<f32>;
@group(0) @binding(2)
var samp: sampler;
var<private> uv_3: vec2<f32>;
var<private> vUvDown_1: vec2<f32>;
var<private> vUvUp_1: vec2<f32>;
var<private> vUvLeft_1: vec2<f32>;
var<private> vUvRight_1: vec2<f32>;
var<private> vUvDownLeft_1: vec2<f32>;
var<private> vUvUpRight_1: vec2<f32>;
var<private> vUvUpLeft_1: vec2<f32>;
var<private> vUvDownRight_1: vec2<f32>;
var<private> outputColor: vec4<f32>;

fn luminance(color: vec3<f32>) -> f32 {
    var color_1: vec3<f32>;

    color_1 = color;
    let _e20 = color_1;
    return dot(_e20, vec3<f32>(0.299f, 0.587f, 0.114f));
}

@diagnostic(off,derivative_uniformity)
fn fxaa(inputColor: vec4<f32>, uv_1: vec2<f32>) -> vec4<f32> {
    var inputColor_1: vec4<f32>;
    var uv_2: vec2<f32>;
    var lumaCenter: f32;
    var lumaDown: f32;
    var lumaUp: f32;
    var lumaLeft: f32;
    var lumaRight: f32;
    var lumaMin: f32;
    var lumaMax: f32;
    var lumaRange: f32;
    var lumaDownLeft: f32;
    var lumaUpRight: f32;
    var lumaUpLeft: f32;
    var lumaDownRight: f32;
    var lumaDownUp: f32;
    var lumaLeftRight: f32;
    var lumaLeftCorners: f32;
    var lumaDownCorners: f32;
    var lumaRightCorners: f32;
    var lumaUpCorners: f32;
    var edgeHorizontal: f32;
    var edgeVertical: f32;
    var isHorizontal: bool;
    var local: f32;
    var stepLength: f32;
    var local_1: f32;
    var luma1_: f32;
    var local_2: f32;
    var luma2_: f32;
    var gradient1_: f32;
    var gradient2_: f32;
    var is1Steepest: bool;
    var gradientScaled: f32;
    var lumaLocalAverage: f32 = 0f;
    var currentUv: vec2<f32>;
    var local_3: vec2<f32>;
    var offset: vec2<f32>;
    var local_4: f32;
    var local_5: f32;
    var local_6: f32;
    var local_7: f32;
    var uv1_: vec2<f32>;
    var local_8: f32;
    var local_9: f32;
    var local_10: f32;
    var local_11: f32;
    var uv2_: vec2<f32>;
    var lumaEnd1_: f32;
    var lumaEnd2_: f32;
    var reached1_: bool;
    var reached2_: bool;
    var reachedBoth: bool;
    var local_12: f32;
    var local_13: f32;
    var local_14: f32;
    var local_15: f32;
    var local_16: f32;
    var local_17: f32;
    var local_18: f32;
    var local_19: f32;
    var i: i32 = 2i;
    var local_20: f32;
    var local_21: f32;
    var local_22: f32;
    var local_23: f32;
    var local_24: f32;
    var local_25: f32;
    var local_26: f32;
    var local_27: f32;
    var local_28: f32;
    var distance1_: f32;
    var local_29: f32;
    var distance2_: f32;
    var isDirection1_: bool;
    var distanceFinal: f32;
    var edgeThickness: f32;
    var isLumaCenterSmaller: bool;
    var correctVariation1_: bool;
    var correctVariation2_: bool;
    var local_30: bool;
    var correctVariation: bool;
    var pixelOffset: f32;
    var local_31: f32;
    var finalOffset: f32;
    var lumaAverage: f32;
    var subPixelOffset1_: f32;
    var subPixelOffset2_: f32;
    var subPixelOffsetFinal: f32;
    var finalUv: vec2<f32>;

    inputColor_1 = inputColor;
    uv_2 = uv_1;
    let _e17 = inputColor_1;
    let _e19 = inputColor_1;
    let _e21 = luminance(_e19.xyz);
    lumaCenter = _e21;
    let _e24 = vUvDown_1;
    let _e25 = textureSample(inputBufferTexture, samp, _e24);
    let _e28 = vUvDown_1;
    let _e29 = textureSample(inputBufferTexture, samp, _e28);
    let _e31 = luminance(_e29.xyz);
    lumaDown = _e31;
    let _e34 = vUvUp_1;
    let _e35 = textureSample(inputBufferTexture, samp, _e34);
    let _e38 = vUvUp_1;
    let _e39 = textureSample(inputBufferTexture, samp, _e38);
    let _e41 = luminance(_e39.xyz);
    lumaUp = _e41;
    let _e44 = vUvLeft_1;
    let _e45 = textureSample(inputBufferTexture, samp, _e44);
    let _e48 = vUvLeft_1;
    let _e49 = textureSample(inputBufferTexture, samp, _e48);
    let _e51 = luminance(_e49.xyz);
    lumaLeft = _e51;
    let _e54 = vUvRight_1;
    let _e55 = textureSample(inputBufferTexture, samp, _e54);
    let _e58 = vUvRight_1;
    let _e59 = textureSample(inputBufferTexture, samp, _e58);
    let _e61 = luminance(_e59.xyz);
    lumaRight = _e61;
    let _e66 = lumaDown;
    let _e67 = lumaUp;
    let _e71 = lumaLeft;
    let _e72 = lumaRight;
    let _e76 = lumaDown;
    let _e77 = lumaUp;
    let _e81 = lumaLeft;
    let _e82 = lumaRight;
    let _e85 = lumaCenter;
    let _e88 = lumaDown;
    let _e89 = lumaUp;
    let _e93 = lumaLeft;
    let _e94 = lumaRight;
    let _e98 = lumaDown;
    let _e99 = lumaUp;
    let _e103 = lumaLeft;
    let _e104 = lumaRight;
    lumaMin = min(_e85, min(min(_e98, _e99), min(_e103, _e104)));
    let _e112 = lumaDown;
    let _e113 = lumaUp;
    let _e117 = lumaLeft;
    let _e118 = lumaRight;
    let _e122 = lumaDown;
    let _e123 = lumaUp;
    let _e127 = lumaLeft;
    let _e128 = lumaRight;
    let _e131 = lumaCenter;
    let _e134 = lumaDown;
    let _e135 = lumaUp;
    let _e139 = lumaLeft;
    let _e140 = lumaRight;
    let _e144 = lumaDown;
    let _e145 = lumaUp;
    let _e149 = lumaLeft;
    let _e150 = lumaRight;
    lumaMax = max(_e131, max(max(_e144, _e145), max(_e149, _e150)));
    let _e155 = lumaMax;
    let _e156 = lumaMin;
    lumaRange = (_e155 - _e156);
    let _e159 = lumaRange;
    let _e161 = lumaMax;
    let _e165 = lumaMax;
    if (_e159 < max(0.0312f, (_e165 * 0.125f))) {
        {
            let _e170 = inputColor_1;
            return _e170;
        }
    }
    let _e172 = vUvDownLeft_1;
    let _e173 = textureSample(inputBufferTexture, samp, _e172);
    let _e176 = vUvDownLeft_1;
    let _e177 = textureSample(inputBufferTexture, samp, _e176);
    let _e179 = luminance(_e177.xyz);
    lumaDownLeft = _e179;
    let _e182 = vUvUpRight_1;
    let _e183 = textureSample(inputBufferTexture, samp, _e182);
    let _e186 = vUvUpRight_1;
    let _e187 = textureSample(inputBufferTexture, samp, _e186);
    let _e189 = luminance(_e187.xyz);
    lumaUpRight = _e189;
    let _e192 = vUvUpLeft_1;
    let _e193 = textureSample(inputBufferTexture, samp, _e192);
    let _e196 = vUvUpLeft_1;
    let _e197 = textureSample(inputBufferTexture, samp, _e196);
    let _e199 = luminance(_e197.xyz);
    lumaUpLeft = _e199;
    let _e202 = vUvDownRight_1;
    let _e203 = textureSample(inputBufferTexture, samp, _e202);
    let _e206 = vUvDownRight_1;
    let _e207 = textureSample(inputBufferTexture, samp, _e206);
    let _e209 = luminance(_e207.xyz);
    lumaDownRight = _e209;
    let _e211 = lumaDown;
    let _e212 = lumaUp;
    lumaDownUp = (_e211 + _e212);
    let _e215 = lumaLeft;
    let _e216 = lumaRight;
    lumaLeftRight = (_e215 + _e216);
    let _e219 = lumaDownLeft;
    let _e220 = lumaUpLeft;
    lumaLeftCorners = (_e219 + _e220);
    let _e223 = lumaDownLeft;
    let _e224 = lumaDownRight;
    lumaDownCorners = (_e223 + _e224);
    let _e227 = lumaDownRight;
    let _e228 = lumaUpRight;
    lumaRightCorners = (_e227 + _e228);
    let _e231 = lumaUpRight;
    let _e232 = lumaUpLeft;
    lumaUpCorners = (_e231 + _e232);
    let _e237 = lumaLeft;
    let _e239 = lumaLeftCorners;
    let _e243 = lumaLeft;
    let _e245 = lumaLeftCorners;
    let _e250 = lumaCenter;
    let _e252 = lumaDownUp;
    let _e256 = lumaCenter;
    let _e258 = lumaDownUp;
    let _e266 = lumaRight;
    let _e268 = lumaRightCorners;
    let _e272 = lumaRight;
    let _e274 = lumaRightCorners;
    edgeHorizontal = ((abs(((-2f * _e243) + _e245)) + (abs(((-2f * _e256) + _e258)) * 2f)) + abs(((-2f * _e272) + _e274)));
    let _e281 = lumaUp;
    let _e283 = lumaUpCorners;
    let _e287 = lumaUp;
    let _e289 = lumaUpCorners;
    let _e294 = lumaCenter;
    let _e296 = lumaLeftRight;
    let _e300 = lumaCenter;
    let _e302 = lumaLeftRight;
    let _e310 = lumaDown;
    let _e312 = lumaDownCorners;
    let _e316 = lumaDown;
    let _e318 = lumaDownCorners;
    edgeVertical = ((abs(((-2f * _e287) + _e289)) + (abs(((-2f * _e300) + _e302)) * 2f)) + abs(((-2f * _e316) + _e318)));
    let _e323 = edgeHorizontal;
    let _e324 = edgeVertical;
    isHorizontal = (_e323 >= _e324);
    let _e327 = isHorizontal;
    if _e327 {
        let _e328 = texelSize;
        local = _e328.y;
    } else {
        let _e330 = texelSize;
        local = _e330.x;
    }
    let _e333 = local;
    stepLength = _e333;
    let _e335 = isHorizontal;
    if _e335 {
        let _e336 = lumaDown;
        local_1 = _e336;
    } else {
        let _e337 = lumaLeft;
        local_1 = _e337;
    }
    let _e339 = local_1;
    luma1_ = _e339;
    let _e341 = isHorizontal;
    if _e341 {
        let _e342 = lumaUp;
        local_2 = _e342;
    } else {
        let _e343 = lumaRight;
        local_2 = _e343;
    }
    let _e345 = local_2;
    luma2_ = _e345;
    let _e347 = luma1_;
    let _e348 = lumaCenter;
    let _e350 = luma1_;
    let _e351 = lumaCenter;
    gradient1_ = abs((_e350 - _e351));
    let _e355 = luma2_;
    let _e356 = lumaCenter;
    let _e358 = luma2_;
    let _e359 = lumaCenter;
    gradient2_ = abs((_e358 - _e359));
    let _e363 = gradient1_;
    let _e364 = gradient2_;
    is1Steepest = (_e363 >= _e364);
    let _e370 = gradient1_;
    let _e371 = gradient2_;
    gradientScaled = (0.25f * max(_e370, _e371));
    let _e377 = is1Steepest;
    if _e377 {
        {
            let _e378 = stepLength;
            stepLength = -(_e378);
            let _e381 = luma1_;
            let _e382 = lumaCenter;
            lumaLocalAverage = (0.5f * (_e381 + _e382));
        }
    } else {
        {
            let _e386 = luma2_;
            let _e387 = lumaCenter;
            lumaLocalAverage = (0.5f * (_e386 + _e387));
        }
    }
    let _e390 = uv_2;
    currentUv = _e390;
    let _e392 = isHorizontal;
    if _e392 {
        {
            let _e394 = currentUv;
            let _e396 = stepLength;
            currentUv.y = (_e394.y + (_e396 * 0.5f));
        }
    } else {
        {
            let _e401 = currentUv;
            let _e403 = stepLength;
            currentUv.x = (_e401.x + (_e403 * 0.5f));
        }
    }
    let _e407 = isHorizontal;
    if _e407 {
        let _e408 = texelSize;
        local_3 = vec2<f32>(_e408.x, 0f);
    } else {
        let _e413 = texelSize;
        local_3 = vec2<f32>(0f, _e413.y);
    }
    let _e417 = local_3;
    offset = _e417;
    let _e419 = currentUv;
    let _e420 = offset;
    if true {
        local_7 = 1f;
    } else {
        if false {
            if true {
                local_5 = 2f;
            } else {
                if true {
                    local_4 = 4f;
                } else {
                    local_4 = 8f;
                }
                let _e438 = local_4;
                local_5 = _e438;
            }
            let _e440 = local_5;
            local_6 = _e440;
        } else {
            local_6 = 1.5f;
        }
        let _e443 = local_6;
        local_7 = _e443;
    }
    let _e445 = local_7;
    uv1_ = (_e419 - (_e420 * _e445));
    let _e449 = currentUv;
    let _e450 = offset;
    if true {
        local_11 = 1f;
    } else {
        if false {
            if true {
                local_9 = 2f;
            } else {
                if true {
                    local_8 = 4f;
                } else {
                    local_8 = 8f;
                }
                let _e468 = local_8;
                local_9 = _e468;
            }
            let _e470 = local_9;
            local_10 = _e470;
        } else {
            local_10 = 1.5f;
        }
        let _e473 = local_10;
        local_11 = _e473;
    }
    let _e475 = local_11;
    uv2_ = (_e449 + (_e450 * _e475));
    let _e480 = uv1_;
    let _e481 = textureSample(inputBufferTexture, samp, _e480);
    let _e484 = uv1_;
    let _e485 = textureSample(inputBufferTexture, samp, _e484);
    let _e487 = luminance(_e485.xyz);
    lumaEnd1_ = _e487;
    let _e490 = uv2_;
    let _e491 = textureSample(inputBufferTexture, samp, _e490);
    let _e494 = uv2_;
    let _e495 = textureSample(inputBufferTexture, samp, _e494);
    let _e497 = luminance(_e495.xyz);
    lumaEnd2_ = _e497;
    let _e499 = lumaEnd1_;
    let _e500 = lumaLocalAverage;
    lumaEnd1_ = (_e499 - _e500);
    let _e502 = lumaEnd2_;
    let _e503 = lumaLocalAverage;
    lumaEnd2_ = (_e502 - _e503);
    let _e506 = lumaEnd1_;
    let _e508 = gradientScaled;
    reached1_ = (abs(_e506) >= _e508);
    let _e512 = lumaEnd2_;
    let _e514 = gradientScaled;
    reached2_ = (abs(_e512) >= _e514);
    let _e517 = reached1_;
    let _e518 = reached2_;
    reachedBoth = (_e517 && _e518);
    let _e521 = reached1_;
    if !(_e521) {
        {
            let _e523 = uv1_;
            let _e524 = offset;
            if true {
                local_15 = 1f;
            } else {
                if false {
                    if true {
                        local_13 = 2f;
                    } else {
                        if true {
                            local_12 = 4f;
                        } else {
                            local_12 = 8f;
                        }
                        let _e542 = local_12;
                        local_13 = _e542;
                    }
                    let _e544 = local_13;
                    local_14 = _e544;
                } else {
                    local_14 = 1.5f;
                }
                let _e547 = local_14;
                local_15 = _e547;
            }
            let _e549 = local_15;
            uv1_ = (_e523 - (_e524 * _e549));
        }
    }
    let _e552 = reached2_;
    if !(_e552) {
        {
            let _e554 = uv2_;
            let _e555 = offset;
            if true {
                local_19 = 1f;
            } else {
                if false {
                    if true {
                        local_17 = 2f;
                    } else {
                        if true {
                            local_16 = 4f;
                        } else {
                            local_16 = 8f;
                        }
                        let _e573 = local_16;
                        local_17 = _e573;
                    }
                    let _e575 = local_17;
                    local_18 = _e575;
                } else {
                    local_18 = 1.5f;
                }
                let _e578 = local_18;
                local_19 = _e578;
            }
            let _e580 = local_19;
            uv2_ = (_e554 + (_e555 * _e580));
        }
    }
    let _e583 = reachedBoth;
    if !(_e583) {
        {
            loop {
                let _e587 = i;
                if !((_e587 < 12i)) {
                    break;
                }
                {
                    let _e594 = reached1_;
                    if !(_e594) {
                        {
                            let _e597 = uv1_;
                            let _e598 = textureSample(inputBufferTexture, samp, _e597);
                            let _e601 = uv1_;
                            let _e602 = textureSample(inputBufferTexture, samp, _e601);
                            let _e604 = luminance(_e602.xyz);
                            lumaEnd1_ = _e604;
                            let _e605 = lumaEnd1_;
                            let _e606 = lumaLocalAverage;
                            lumaEnd1_ = (_e605 - _e606);
                        }
                    }
                    let _e608 = reached2_;
                    if !(_e608) {
                        {
                            let _e611 = uv2_;
                            let _e612 = textureSample(inputBufferTexture, samp, _e611);
                            let _e615 = uv2_;
                            let _e616 = textureSample(inputBufferTexture, samp, _e615);
                            let _e618 = luminance(_e616.xyz);
                            lumaEnd2_ = _e618;
                            let _e619 = lumaEnd2_;
                            let _e620 = lumaLocalAverage;
                            lumaEnd2_ = (_e619 - _e620);
                        }
                    }
                    let _e623 = lumaEnd1_;
                    let _e625 = gradientScaled;
                    reached1_ = (abs(_e623) >= _e625);
                    let _e628 = lumaEnd2_;
                    let _e630 = gradientScaled;
                    reached2_ = (abs(_e628) >= _e630);
                    let _e632 = reached1_;
                    let _e633 = reached2_;
                    reachedBoth = (_e632 && _e633);
                    let _e635 = reached1_;
                    if !(_e635) {
                        {
                            let _e637 = uv1_;
                            let _e638 = offset;
                            let _e639 = i;
                            if (_e639 < 5i) {
                                local_23 = 1f;
                            } else {
                                let _e643 = i;
                                if (_e643 > 5i) {
                                    let _e646 = i;
                                    if (_e646 < 10i) {
                                        local_21 = 2f;
                                    } else {
                                        let _e650 = i;
                                        if (_e650 < 11i) {
                                            local_20 = 4f;
                                        } else {
                                            local_20 = 8f;
                                        }
                                        let _e656 = local_20;
                                        local_21 = _e656;
                                    }
                                    let _e658 = local_21;
                                    local_22 = _e658;
                                } else {
                                    local_22 = 1.5f;
                                }
                                let _e661 = local_22;
                                local_23 = _e661;
                            }
                            let _e663 = local_23;
                            uv1_ = (_e637 - (_e638 * _e663));
                        }
                    }
                    let _e666 = reached2_;
                    if !(_e666) {
                        {
                            let _e668 = uv2_;
                            let _e669 = offset;
                            let _e670 = i;
                            if (_e670 < 5i) {
                                local_27 = 1f;
                            } else {
                                let _e674 = i;
                                if (_e674 > 5i) {
                                    let _e677 = i;
                                    if (_e677 < 10i) {
                                        local_25 = 2f;
                                    } else {
                                        let _e681 = i;
                                        if (_e681 < 11i) {
                                            local_24 = 4f;
                                        } else {
                                            local_24 = 8f;
                                        }
                                        let _e687 = local_24;
                                        local_25 = _e687;
                                    }
                                    let _e689 = local_25;
                                    local_26 = _e689;
                                } else {
                                    local_26 = 1.5f;
                                }
                                let _e692 = local_26;
                                local_27 = _e692;
                            }
                            let _e694 = local_27;
                            uv2_ = (_e668 + (_e669 * _e694));
                        }
                    }
                    let _e697 = reachedBoth;
                    if _e697 {
                        {
                            break;
                        }
                    }
                }
                continuing {
                    let _e591 = i;
                    i = (_e591 + 1i);
                }
            }
        }
    }
    let _e698 = isHorizontal;
    if _e698 {
        let _e699 = uv_2;
        let _e701 = uv1_;
        local_28 = (_e699.x - _e701.x);
    } else {
        let _e704 = uv_2;
        let _e706 = uv1_;
        local_28 = (_e704.y - _e706.y);
    }
    let _e710 = local_28;
    distance1_ = _e710;
    let _e712 = isHorizontal;
    if _e712 {
        let _e713 = uv2_;
        let _e715 = uv_2;
        local_29 = (_e713.x - _e715.x);
    } else {
        let _e718 = uv2_;
        let _e720 = uv_2;
        local_29 = (_e718.y - _e720.y);
    }
    let _e724 = local_29;
    distance2_ = _e724;
    let _e726 = distance1_;
    let _e727 = distance2_;
    isDirection1_ = (_e726 < _e727);
    let _e732 = distance1_;
    let _e733 = distance2_;
    distanceFinal = min(_e732, _e733);
    let _e736 = distance1_;
    let _e737 = distance2_;
    edgeThickness = (_e736 + _e737);
    let _e740 = lumaCenter;
    let _e741 = lumaLocalAverage;
    isLumaCenterSmaller = (_e740 < _e741);
    let _e744 = lumaEnd1_;
    let _e747 = isLumaCenterSmaller;
    correctVariation1_ = ((_e744 < 0f) != _e747);
    let _e750 = lumaEnd2_;
    let _e753 = isLumaCenterSmaller;
    correctVariation2_ = ((_e750 < 0f) != _e753);
    let _e756 = isDirection1_;
    if _e756 {
        let _e757 = correctVariation1_;
        local_30 = _e757;
    } else {
        let _e758 = correctVariation2_;
        local_30 = _e758;
    }
    let _e760 = local_30;
    correctVariation = _e760;
    let _e762 = distanceFinal;
    let _e764 = edgeThickness;
    pixelOffset = ((-(_e762) / _e764) + 0.5f);
    let _e769 = correctVariation;
    if _e769 {
        let _e770 = pixelOffset;
        local_31 = _e770;
    } else {
        local_31 = 0f;
    }
    let _e773 = local_31;
    finalOffset = _e773;
    let _e777 = lumaDownUp;
    let _e778 = lumaLeftRight;
    let _e781 = lumaLeftCorners;
    let _e783 = lumaRightCorners;
    lumaAverage = (0.083333336f * (((2f * (_e777 + _e778)) + _e781) + _e783));
    let _e787 = lumaAverage;
    let _e788 = lumaCenter;
    let _e790 = lumaAverage;
    let _e791 = lumaCenter;
    let _e794 = lumaRange;
    let _e798 = lumaAverage;
    let _e799 = lumaCenter;
    let _e801 = lumaAverage;
    let _e802 = lumaCenter;
    let _e805 = lumaRange;
    subPixelOffset1_ = clamp((abs((_e801 - _e802)) / _e805), 0f, 1f);
    let _e813 = subPixelOffset1_;
    let _e817 = subPixelOffset1_;
    let _e819 = subPixelOffset1_;
    subPixelOffset2_ = ((((-2f * _e813) + 3f) * _e817) * _e819);
    let _e822 = subPixelOffset2_;
    let _e823 = subPixelOffset2_;
    subPixelOffsetFinal = ((_e822 * _e823) * 0.75f);
    let _e830 = finalOffset;
    let _e831 = subPixelOffsetFinal;
    finalOffset = max(_e830, _e831);
    let _e833 = uv_2;
    finalUv = _e833;
    let _e835 = isHorizontal;
    if _e835 {
        {
            let _e837 = finalUv;
            let _e839 = finalOffset;
            let _e840 = stepLength;
            finalUv.y = (_e837.y + (_e839 * _e840));
        }
    } else {
        {
            let _e844 = finalUv;
            let _e846 = finalOffset;
            let _e847 = stepLength;
            finalUv.x = (_e844.x + (_e846 * _e847));
        }
    }
    let _e851 = finalUv;
    let _e852 = textureSample(inputBufferTexture, samp, _e851);
    return _e852;
}

fn main_1() {
    var inputColor_2: vec4<f32>;

    let _e14 = uv_3;
    let _e15 = textureSample(inputBufferTexture, samp, _e14);
    inputColor_2 = _e15;
    let _e19 = inputColor_2;
    let _e20 = uv_3;
    let _e21 = fxaa(_e19, _e20);
    outputColor = _e21;
    return;
}

@diagnostic(off,derivative_uniformity)
@fragment
fn main(@location(0) uv: vec2<f32>, @location(1) vUvDown: vec2<f32>, @location(2) vUvUp: vec2<f32>, @location(3) vUvLeft: vec2<f32>, @location(4) vUvRight: vec2<f32>, @location(5) vUvDownLeft: vec2<f32>, @location(6) vUvUpRight: vec2<f32>, @location(7) vUvUpLeft: vec2<f32>, @location(8) vUvDownRight: vec2<f32>) -> FragmentOutput {
    uv_3 = uv;
    vUvDown_1 = vUvDown;
    vUvUp_1 = vUvUp;
    vUvLeft_1 = vUvLeft;
    vUvRight_1 = vUvRight;
    vUvDownLeft_1 = vUvDownLeft;
    vUvUpRight_1 = vUvUpRight;
    vUvUpLeft_1 = vUvUpLeft;
    vUvDownRight_1 = vUvDownRight;
    main_1();
    let _e45 = outputColor;
    return FragmentOutput(_e45);
}

`;

export const meshVertWGSL = `
struct VertexOutput {
    @location(0) vColor: vec4<f32>,
    @builtin(position) gl_Position: vec4<f32>,
}

@group(0) @binding(0)
var<uniform> modelViewProjection: mat4x4f;

@vertex
fn main(@location(0) position: vec3<f32>, @location(1) normal: vec3<f32>) -> VertexOutput {
  let outputColor = vec4f(normal, 1.0);
  let outputPosition = modelViewProjection * vec4f(-position.x, position.y, position.z, 1.0);

  return VertexOutput(outputColor, outputPosition);
}`;

export const meshFragWGSL = `
@fragment
fn main(@location(0) outputColor: vec4<f32>) -> @location(0) vec4f {
  return outputColor;
}`;
