export type CanvasContext = GPUCanvasContext & {
  present: () => void;
};
