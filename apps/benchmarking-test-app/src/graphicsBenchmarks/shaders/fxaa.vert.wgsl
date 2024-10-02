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
    let _e11 = uv_1;
    vUv = _e11;
    let _e12 = uv_1;
    let _e17 = texelSize;
    vUvDown = (_e12 + (vec2<f32>(0f, -1f) * _e17));
    let _e20 = uv_1;
    let _e24 = texelSize;
    vUvUp = (_e20 + (vec2<f32>(0f, 1f) * _e24));
    let _e27 = uv_1;
    let _e31 = texelSize;
    vUvRight = (_e27 + (vec2<f32>(1f, 0f) * _e31));
    let _e34 = uv_1;
    let _e39 = texelSize;
    vUvLeft = (_e34 + (vec2<f32>(-1f, 0f) * _e39));
    let _e42 = uv_1;
    let _e48 = texelSize;
    vUvDownLeft = (_e42 + (vec2<f32>(-1f, -1f) * _e48));
    let _e51 = uv_1;
    let _e55 = texelSize;
    vUvUpRight = (_e51 + (vec2<f32>(1f, 1f) * _e55));
    let _e58 = uv_1;
    let _e63 = texelSize;
    vUvUpLeft = (_e58 + (vec2<f32>(-1f, 1f) * _e63));
    let _e66 = uv_1;
    let _e71 = texelSize;
    vUvDownRight = (_e66 + (vec2<f32>(1f, -1f) * _e71));
    gl_Position = vec4(0f);
    return;
}

@vertex 
fn main(@location(1) uv: vec2<f32>) -> VertexOutput {
    uv_1 = uv;
    main_1();
    let _e25 = vUv;
    let _e27 = vUvDown;
    let _e29 = vUvUp;
    let _e31 = vUvLeft;
    let _e33 = vUvRight;
    let _e35 = vUvDownLeft;
    let _e37 = vUvUpRight;
    let _e39 = vUvUpLeft;
    let _e41 = vUvDownRight;
    let _e43 = gl_Position;
    return VertexOutput(_e25, _e27, _e29, _e31, _e33, _e35, _e37, _e39, _e41, _e43);
}
