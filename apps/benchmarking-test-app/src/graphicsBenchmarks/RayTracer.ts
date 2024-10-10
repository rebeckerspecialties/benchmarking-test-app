import Scene from "./cornell/scene";
import Common from "./cornell/common";
import Radiosity from "./cornell/radiosity";
import Tonemapper from "./cornell/tonemapper";
import Raytracer from "./cornell/raytracer";
import { CanvasContext } from "./types";

const params = {
  renderer: "raytracer",
  rotateCamera: true,
};

export const runRayTracer = async (
  context: CanvasContext,
  device: GPUDevice,
  canvas: HTMLCanvasElement,
  requestAnimationFrame: (callback: (time: number) => void) => number
) => {
  const framebuffer = device.createTexture({
    label: "framebuffer",
    size: [canvas.width, canvas.height],
    format: "rgba16float",
    usage:
      GPUTextureUsage.STORAGE_BINDING |
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.TEXTURE_BINDING,
  });

  const scene = new Scene(device);
  const common = new Common(device, scene.quadBuffer);
  const radiosity = new Radiosity(device, common, scene);
  const raytracer = new Raytracer(device, common, radiosity, framebuffer);

  let frame = 0;

  return new Promise<void>((resolve) => {
    const animate = () => {
      frame++;
      const canvasTexture = context.getCurrentTexture();
      const commandEncoder = device.createCommandEncoder();

      common.update({
        rotateCamera: params.rotateCamera,
        aspect: canvas.width / canvas.height,
      });
      radiosity.run(commandEncoder);

      raytracer.run(commandEncoder);

      const tonemapper = new Tonemapper(
        device,
        common,
        framebuffer,
        canvasTexture
      );
      tonemapper.run(commandEncoder);

      device.queue.submit([commandEncoder.finish()]);

      if (frame >= 500) {
        resolve();
      } else {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  });
};
