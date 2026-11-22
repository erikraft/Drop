import SSTVDecoder from "./decoder.js";
self.onmessage = async (event) => {
  const { samples, sampleRate, fftSize } = event.data;
  try {
    const decoder = new SSTVDecoder(samples, sampleRate, fftSize, (progress) => self.postMessage({ progress }));
    const result = await decoder.decode();
    self.postMessage({ imageData: result.buffer.buffer, width: result.width, height: result.height }, [result.buffer.buffer]);
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : String(error) });
  }
};