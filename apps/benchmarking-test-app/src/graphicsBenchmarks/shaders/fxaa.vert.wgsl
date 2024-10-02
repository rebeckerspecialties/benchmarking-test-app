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
