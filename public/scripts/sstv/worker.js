import SSTVDecoder from "./decoder.js";

const MAX_AUDIO_SECONDS = 600;
const MAX_AUDIO_SAMPLES = 30_000_000;
const ALLOWED_FFT_SIZES = new Set([64, 128, 256, 512, 1024, 2048]);

function validateRequest(payload) {
  if (!payload || typeof payload !== "object") {
    throw new TypeError("Invalid SSTV decoder request.");
  }
  const { samples, sampleRate, fftSize } = payload;
  if (!(samples instanceof Float32Array) || samples.length === 0) {
    throw new TypeError("Audio samples must be a non-empty Float32Array.");
  }
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000) {
    throw new RangeError("Unsupported audio sample rate.");
  }
  if (samples.length > sampleRate * MAX_AUDIO_SECONDS ||
      samples.length > MAX_AUDIO_SAMPLES) {
    throw new RangeError("Audio exceeds the 10-minute or 30-million-sample limit.");
  }
  if (!Number.isInteger(fftSize) || !ALLOWED_FFT_SIZES.has(fftSize)) {
    throw new RangeError("Unsupported FFT size.");
  }
  return { samples, sampleRate, fftSize };
}

self.onmessage = async (event) => {
  let request;
  try {
    request = validateRequest(event.data);
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : "Invalid decoder request." });
    return;
  }

  const { samples, sampleRate, fftSize } = request;
  try {
    const decoder = new SSTVDecoder(
      samples,
      sampleRate,
      fftSize,
      (progress) => self.postMessage({ progress })
    );
    const result = await decoder.decode();
    self.postMessage(
      { imageData: result.buffer.buffer, width: result.width, height: result.height },
      [result.buffer.buffer]
    );
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : "SSTV decoding failed." });
  }
};
