struct VertexOutput {
    @location(0) vUv: vec2<f32>,
    @location(1) vFragDepth: f32,
    @location(2) vIsPerspective: f32,
    @location(3) vFogDepth: f32,
    @builtin(position) gl_Position: vec4<f32>,
}

var<private> position_1: vec3<f32>;
var<private> vUv: vec2<f32>;
var<private> vFragDepth: f32;
var<private> vIsPerspective: f32;
var<private> vFogDepth: f32;
@group(0) @binding(0)
var<uniform> uv: vec2<f32>;
@group(0) @binding(1)
var<uniform> projectionMatrix: mat4x4<f32>;
@group(0) @binding(2)
var<uniform> modelViewMatrix: mat4x4<f32>;
var<private> gl_Position: vec4<f32>;

fn isPerspectiveMatrix(m: mat4x4<f32>) -> bool {
    return (m[2][3] == -1f);
}

fn main_1() {
    vUv = uv;
    let _e13 = position_1;
    gl_Position = ((projectionMatrix * modelViewMatrix) * vec4<f32>(_e13.x, _e13.y, _e13.z, 1f));
    vFragDepth = (1f + gl_Position.w);
    vIsPerspective = select(0f, 1f, isPerspectiveMatrix(projectionMatrix));
    let _e31 = position_1;
    vFogDepth = (modelViewMatrix * vec4<f32>(_e31.x, _e31.y, _e31.z, 1f)).z;
    return;
}

@vertex
fn main(@location(0) position: vec3<f32>) -> VertexOutput {
    position_1 = position;
    main_1();
    return VertexOutput(vUv, vFragDepth, vIsPerspective, vFogDepth, gl_Position);
}
