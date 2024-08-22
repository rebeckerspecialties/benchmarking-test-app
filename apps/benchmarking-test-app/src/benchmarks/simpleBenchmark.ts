export const simpleBenchmark = async () => {
  for (let i = 0, x = 0; i < 100; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, i);
    });
  }
};
