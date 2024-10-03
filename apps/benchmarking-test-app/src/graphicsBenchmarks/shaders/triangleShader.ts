export const triangleVertWGSL = `@vertex
fn main(
  @builtin(vertex_index) VertexIndex : u32
) -> @builtin(position) vec4f {
  var pos = array<vec2f, 3>(
    vec2(0.0, 0.5),
    vec2(-0.5, -0.5),
    vec2(0.5, -0.5)
  );

  return vec4f(pos[VertexIndex], 0.0, 1.0);
}`;

export const redFragWGSL = `
@binding(0) @group(0) var<uniform> frame : f32;
@fragment
fn main() -> @location(0) vec4f {
  return vec4(1.0, sin(frame / 128), 0.0, 1.0);
}`;
