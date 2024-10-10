// source: https://github.com/webgpu/webgpu-samples/tree/3c9b66b25a526f626ae8dadc127758421f275694/sample/cornell
export const commonWGSL = `
const pi = 3.14159265359;

// Quad describes 2D rectangle on a plane
struct Quad {
  // The surface plane
  plane    : vec4f,
  // A plane with a normal in the 'u' direction, intersecting the origin, at
  // right-angles to the surface plane.
  // The dot product of 'right' with a 'vec4(pos, 1)' will range between [-1..1]
  // if the projected point is within the quad.
  right    : vec4f,
  // A plane with a normal in the 'v' direction, intersecting the origin, at
  // right-angles to the surface plane.
  // The dot product of 'up' with a 'vec4(pos, 1)' will range between [-1..1]
  // if the projected point is within the quad.
  up       : vec4f,
  // The diffuse color of the quad
  color    : vec3f,
  // Emissive value. 0=no emissive, 1=full emissive.
  emissive : f32,
};

// Ray is a start point and direction.
struct Ray {
  start : vec3f,
  dir   : vec3f,
}

// Value for HitInfo.quad if no intersection occured.
const kNoHit = 0xffffffff;

// HitInfo describes the hit location of a ray-quad intersection
struct HitInfo {
  // Distance along the ray to the intersection
  dist : f32,
  // The quad index that was hit
  quad : u32,
  // The position of the intersection
  pos : vec3f,
  // The UVs of the quad at the point of intersection
  uv : vec2f,
}

// CommonUniforms uniform buffer data
struct CommonUniforms {
  // Model View Projection matrix
  mvp : mat4x4f,
  // Inverse of mvp
  inv_mvp : mat4x4f,
  // Random seed for the workgroup
  seed : vec3u,
}

// The common uniform buffer binding.
@group(0) @binding(0) var<uniform> common_uniforms : CommonUniforms;

// The quad buffer binding.
@group(0) @binding(1) var<storage> quads : array<Quad>;

// intersect_ray_quad will check to see if the ray 'r' intersects the quad 'q'.
// If an intersection occurs, and the intersection is closer than 'closest' then
// the intersection information is returned, otherwise 'closest' is returned.
fn intersect_ray_quad(r : Ray, quad : u32, closest : HitInfo) -> HitInfo {
  let q = quads[quad];
  let plane_dist = dot(q.plane, vec4(r.start, 1));
  let ray_dist = plane_dist / -dot(q.plane.xyz, r.dir);
  let pos = r.start + r.dir * ray_dist;
  let uv = vec2(dot(vec4f(pos, 1), q.right),
                dot(vec4f(pos, 1), q.up)) * 0.5 + 0.5;
  let hit = plane_dist > 0 &&
            ray_dist > 0 &&
            ray_dist < closest.dist &&
            all((uv > vec2f()) & (uv < vec2f(1)));
  return HitInfo(
    select(closest.dist, ray_dist, hit),
    select(closest.quad, quad,     hit),
    select(closest.pos,  pos,      hit),
    select(closest.uv,   uv,       hit),
  );
}

// raytrace finds the closest intersecting quad for the given ray
fn raytrace(ray : Ray) -> HitInfo {
  var hit = HitInfo();
  hit.dist = 1e20;
  hit.quad = kNoHit;
  for (var quad = 0u; quad < arrayLength(&quads); quad++) {
    hit = intersect_ray_quad(ray, quad, hit);
  }
  return hit;
}

// A psuedo random number. Initialized with init_rand(), updated with rand().
var<private> rnd : vec3u;

// Initializes the random number generator.
fn init_rand(invocation_id : vec3u) {
  const A = vec3(1741651 * 1009,
                 140893  * 1609 * 13,
                 6521    * 983  * 7 * 2);
  rnd = (invocation_id * A) ^ common_uniforms.seed;
}

// Returns a random number between 0 and 1.
fn rand() -> f32 {
  const C = vec3(60493  * 9377,
                 11279  * 2539 * 23,
                 7919   * 631  * 5 * 3);

  rnd = (rnd * C) ^ (rnd.yzx >> vec3(4u));
  return f32(rnd.x ^ rnd.y) / f32(0xffffffff);
}

// Returns a random point within a unit sphere centered at (0,0,0).
fn rand_unit_sphere() -> vec3f {
    var u = rand();
    var v = rand();
    var theta = u * 2.0 * pi;
    var phi = acos(2.0 * v - 1.0);
    var r = pow(rand(), 1.0/3.0);
    var sin_theta = sin(theta);
    var cos_theta = cos(theta);
    var sin_phi = sin(phi);
    var cos_phi = cos(phi);
    var x = r * sin_phi * sin_theta;
    var y = r * sin_phi * cos_theta;
    var z = r * cos_phi;
    return vec3f(x, y, z);
}

fn rand_concentric_disk() -> vec2f {
    let u = vec2f(rand(), rand());
    let uOffset = 2.f * u - vec2f(1, 1);

    if (uOffset.x == 0 && uOffset.y == 0){
        return vec2f(0, 0);
    }

    var theta = 0.0;
    var r = 0.0;
    if (abs(uOffset.x) > abs(uOffset.y)) {
        r = uOffset.x;
        theta = (pi / 4) * (uOffset.y / uOffset.x);
    } else {
        r = uOffset.y;
        theta = (pi / 2) - (pi / 4) * (uOffset.x / uOffset.y);
    }
    return r * vec2f(cos(theta), sin(theta));
}

fn rand_cosine_weighted_hemisphere() -> vec3f {
    let d = rand_concentric_disk();
    let z = sqrt(max(0.0, 1.0 - d.x * d.x - d.y * d.y));
    return vec3f(d.x, d.y, z);
}
`;

export const radiosityWGSL = `
// A storage buffer holding an array of atomic<u32>.
// The array elements are a sequence of red, green, blue components, for each
// lightmap texel, for each quad surface.
@group(1) @binding(0)
var<storage, read_write> accumulation : array<atomic<u32>>;

// The output lightmap texture.
@group(1) @binding(1)
var lightmap : texture_storage_2d_array<rgba16float, write>;

// Uniform data used by the accumulation_to_lightmap entry point
struct Uniforms {
  // Scalar for converting accumulation values to output lightmap values
  accumulation_to_lightmap_scale : f32,
  // Accumulation buffer rescaling value
  accumulation_buffer_scale : f32,
  // The width of the light
  light_width : f32,
  // The height of the light
  light_height : f32,
  // The center of the light
  light_center : vec3f,
}

// accumulation_to_lightmap uniforms binding point
@group(1) @binding(2) var<uniform> uniforms : Uniforms;

// Number of photons emitted per workgroup
override PhotonsPerWorkgroup : u32;

// Maximum value that can be added to the accumulation buffer from a single photon
override PhotonEnergy : f32;

// Number of bounces of each photon
const PhotonBounces = 4;

// Amount of light absorbed with each photon bounce (0: 0%, 1: 100%)
const LightAbsorbtion = 0.5;

// Radiosity compute shader.
// Each invocation creates a photon from the light source, and accumulates
// bounce lighting into the 'accumulation' buffer.
@compute @workgroup_size(PhotonsPerWorkgroup)
fn radiosity(@builtin(global_invocation_id) invocation_id : vec3u) {
  init_rand(invocation_id);
  photon();
}

// Spawns a photon at the light source, performs ray tracing in the scene,
// accumulating light values into 'accumulation' for each quad surface hit.
fn photon() {
  // Create a random ray from the light.
  var ray = new_light_ray();
  // Give the photon an initial energy value.
  var color = PhotonEnergy * vec3f(1, 0.8, 0.6);

  // Start bouncing.
  for (var i = 0; i < (PhotonBounces+1); i++) {
    // Find the closest hit of the ray with the scene's quads.
    let hit = raytrace(ray);
    let quad = quads[hit.quad];

    // Bounce the ray.
    ray.start = hit.pos + quad.plane.xyz * 1e-5;
    ray.dir = normalize(reflect(ray.dir, quad.plane.xyz) + rand_unit_sphere() * 0.75);

    // Photon color is multiplied by the quad's color.
    color *= quad.color;

    // Accumulate the aborbed light into the 'accumulation' buffer.
    accumulate(hit.uv, hit.quad, color * LightAbsorbtion);

    // What wasn't absorbed is reflected.
    color *= 1 - LightAbsorbtion;
  }
}

// Performs an atomicAdd() with 'color' into the 'accumulation' buffer at 'uv'
// and 'quad'.
fn accumulate(uv : vec2f, quad : u32, color : vec3f) {
  let dims = textureDimensions(lightmap);
  let base_idx = accumulation_base_index(vec2u(uv * vec2f(dims)), quad);
  atomicAdd(&accumulation[base_idx + 0], u32(color.r + 0.5));
  atomicAdd(&accumulation[base_idx + 1], u32(color.g + 0.5));
  atomicAdd(&accumulation[base_idx + 2], u32(color.b + 0.5));
}

// Returns the base element index for the texel at 'coord' for 'quad'
fn accumulation_base_index(coord : vec2u, quad : u32) -> u32 {
  let dims = textureDimensions(lightmap);
  let c = min(vec2u(dims) - 1, coord);
  return 3 * (c.x + dims.x * c.y + dims.x * dims.y * quad);
}

// Returns a new Ray at a random point on the light, in a random downwards
// direction.
fn new_light_ray() -> Ray {
  let center = uniforms.light_center;
  let pos = center + vec3f(uniforms.light_width * (rand() - 0.5),
                           0,
                           uniforms.light_height * (rand() - 0.5));
  var dir = rand_cosine_weighted_hemisphere().xzy;
  dir.y = -dir.y;
  return Ray(pos, dir);
}

override AccumulationToLightmapWorkgroupSizeX : u32;
override AccumulationToLightmapWorkgroupSizeY : u32;

// Compute shader used to copy the atomic<u32> data in 'accumulation' to
// 'lightmap'. 'accumulation' might also be scaled to reduce integer overflow.
@compute @workgroup_size(AccumulationToLightmapWorkgroupSizeX, AccumulationToLightmapWorkgroupSizeY)
fn accumulation_to_lightmap(@builtin(global_invocation_id) invocation_id : vec3u,
                            @builtin(workgroup_id)         workgroup_id  : vec3u) {
  let dims = textureDimensions(lightmap);
  let quad = workgroup_id.z; // The workgroup 'z' value holds the quad index.
  let coord = invocation_id.xy;
  if (all(coord < dims)) {
    // Load the color value out of 'accumulation'
    let base_idx = accumulation_base_index(coord, quad);
    let color = vec3(f32(atomicLoad(&accumulation[base_idx + 0])),
                     f32(atomicLoad(&accumulation[base_idx + 1])),
                     f32(atomicLoad(&accumulation[base_idx + 2])));

    // Multiply the color by 'uniforms.accumulation_to_lightmap_scale' and write it to
    // the lightmap.
    textureStore(lightmap, coord, quad, vec4(color * uniforms.accumulation_to_lightmap_scale, 1));

    // If the 'accumulation' buffer is nearing saturation, then
    // 'uniforms.accumulation_buffer_scale' will be less than 1, scaling the values
    // to something less likely to overflow the u32.
    if (uniforms.accumulation_buffer_scale != 1.0) {
      let scaled = color * uniforms.accumulation_buffer_scale + 0.5;
      atomicStore(&accumulation[base_idx + 0], u32(scaled.r));
      atomicStore(&accumulation[base_idx + 1], u32(scaled.g));
      atomicStore(&accumulation[base_idx + 2], u32(scaled.b));
    }
  }
}

`;

export const raytracerWGSL = `
// The lightmap data
@group(1) @binding(0) var lightmap : texture_2d_array<f32>;

// The sampler used to sample the lightmap
@group(1) @binding(1) var smpl : sampler;

// The output framebuffer
@group(1) @binding(2) var framebuffer : texture_storage_2d<rgba16float, write>;

override WorkgroupSizeX : u32;
override WorkgroupSizeY : u32;

const NumReflectionRays = 5;

@compute @workgroup_size(WorkgroupSizeX, WorkgroupSizeY)
fn main(@builtin(global_invocation_id) invocation_id : vec3u) {
  if (all(invocation_id.xy < textureDimensions(framebuffer))) {
    init_rand(invocation_id);

    // Calculate the fragment's NDC coordinates for the intersection of the near
    // clip plane and far clip plane
    let uv = vec2f(invocation_id.xy) / vec2f(textureDimensions(framebuffer).xy);
    let ndcXY = (uv - 0.5) * vec2(2, -2);

    // Transform the coordinates back into world space
    var near = common_uniforms.inv_mvp * vec4f(ndcXY, 0.0, 1);
    var far = common_uniforms.inv_mvp * vec4f(ndcXY, 1, 1);
    near /= near.w;
    far /= far.w;

    // Create a ray that starts at the near clip plane, heading in the fragment's
    // z-direction, and raytrace to find the nearest quad that the ray intersects.
    let ray = Ray(near.xyz, normalize(far.xyz - near.xyz));
    let hit = raytrace(ray);

    let hit_color = sample_hit(hit);
    var normal = quads[hit.quad].plane.xyz;

    // Fire a few rays off the surface to collect some reflections
    let bounce = reflect(ray.dir, normal);
    var reflection : vec3f;
    for (var i = 0; i < NumReflectionRays; i++) {
      let reflection_dir = normalize(bounce + rand_unit_sphere()*0.1);
      let reflection_ray = Ray(hit.pos + bounce * 1e-5, reflection_dir);
      let reflection_hit = raytrace(reflection_ray);
      reflection += sample_hit(reflection_hit);
    }
    let color = mix(reflection / NumReflectionRays, hit_color, 0.95);

    textureStore(framebuffer, invocation_id.xy, vec4(color, 1));
  }
}


// Returns the sampled hit quad's lightmap at 'hit.uv', and adds the quad's
// emissive value.
fn sample_hit(hit : HitInfo) -> vec3f {
  let quad = quads[hit.quad];
  // Sample the quad's lightmap, and add emissive.
  return textureSampleLevel(lightmap, smpl, hit.uv, hit.quad, 0).rgb +
         quad.emissive * quad.color;
}
`;

export const tonemapperWGSL = `
// The linear-light input framebuffer
@group(0) @binding(0) var input  : texture_2d<f32>;

// The tonemapped, gamma-corrected output framebuffer
@group(0) @binding(1) var output : texture_storage_2d<{OUTPUT_FORMAT}, write>;

const TonemapExposure = 0.5;

const Gamma = 2.2;

override WorkgroupSizeX : u32;
override WorkgroupSizeY : u32;

@compute @workgroup_size(WorkgroupSizeX, WorkgroupSizeY)
fn main(@builtin(global_invocation_id) invocation_id : vec3u) {
  let color = textureLoad(input, invocation_id.xy, 0).rgb;
  let tonemapped = reinhard_tonemap(color);
  textureStore(output, invocation_id.xy, vec4f(tonemapped, 1));
}

fn reinhard_tonemap(linearColor: vec3f) -> vec3f {
  let color = linearColor * TonemapExposure;
  let mapped = color / (1+color);
  return pow(mapped, vec3f(1 / Gamma));
}
`;

export const basicVertWGSL = `
struct VertexOutput {
    @location(0) vUv: vec2<f32>,
    @builtin(position) gl_Position: vec4<f32>,
}
@vertex
fn main(@location(0) position: vec4<f32>, @location(1) uv: vec2<f32>) -> VertexOutput {
    return VertexOutput(uv, position);
}
`;

export const basicFragWGSL = `
@group(0) @binding(0)
var inputBuffer: texture_2d<f32>;
@group(0) @binding(1)
var samp: sampler;

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4f {
  let outputColor = textureSample(inputBuffer, samp, uv);
  return outputColor;
}
`;
