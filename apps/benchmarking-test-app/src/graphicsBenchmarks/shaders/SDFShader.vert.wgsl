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
    var m_1: mat4x4<f32>;

    m_1 = m;
    let _e14 = m_1[2][3];
    return (_e14 == -1f);
}

fn main_1() {
    let _e8 = uv;
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
fn main(@location(0) position: vec3<f32>) -> VertexOutput {
    position_1 = position;
    main_1();
    let _e19 = vUv;
    let _e21 = vFragDepth;
    let _e23 = vIsPerspective;
    let _e25 = vFogDepth;
    let _e27 = gl_Position;
    return VertexOutput(_e19, _e21, _e23, _e25, _e27);
}
