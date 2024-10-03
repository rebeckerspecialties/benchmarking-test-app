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
var depthTexture: texture_2d<f32>;
@group(0) @binding(3) 
var samp: sampler;

fn main_1() {
    var depth: f32;
    var ssgiClr: vec3<f32>;

    let _e8 = uv_1;
    let _e10 = textureSampleLevel(depthTexture, samp, _e8, 0f);
    depth = _e10.x;
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
