import FFT from "./fft.js";

export function freqToLum(freq) {
  const lum = Math.round((freq - 1500) / 3.1372549);
  return Math.min(Math.max(lum, 0), 255);
}

export function lumToFreq(lum) {
  const clampedLum = Math.min(Math.max(lum, 0), 255);
  return 1500 + clampedLum * 3.1372549;
}

export function parabolicPeakInterp(bins, x) {
  if (!bins || !Number.isInteger(x) || x <= 0 || x >= bins.length - 1) return x;
  const left = bins[x - 1];
  const center = bins[x];
  const right = bins[x + 1];
  const denominator = left - 2 * center + right;
  if (!Number.isFinite(left) || !Number.isFinite(center) ||
      !Number.isFinite(right) || Math.abs(denominator) < Number.EPSILON) return x;
  const offset = (0.5 * (left - right)) / denominator;
  if (!Number.isFinite(offset)) return x;
  return x + Math.max(-0.5, Math.min(0.5, offset));
}

export function barycentricPeakInterp(bins, x) {
  return parabolicPeakInterp(bins, x);
}

export function fft(data, sampleRate = 44100, size) {
  const nextPow2 = Math.pow(2, Math.ceil(Math.log2(data.length)));
  const fftSize = Math.max(size, nextPow2);

  const padded = new Float32Array(fftSize);
  padded.set(data);

  const fft = new FFT(fftSize, sampleRate);
  fft.forward(padded);

  const spectrum = fft.spectrum.slice();
  const n = spectrum.length;

  for (let i = 1; i < n - 1; i++) {
    spectrum[i] *= 2;
  }

  return spectrum;
}

export function hannWindow(length) {
  const window = new Array(length);
  for (let i = 0; i < length; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (length - 1)));
  }
  return window;
}

export function yuvToRgb(y, u, v) {
  const U = u - 128;
  const V = v - 128;

  let r = y + 1.402 * V;
  let g = y - 0.344136 * U - 0.714136 * V;
  let b = y + 1.772 * U;

  r = Math.max(0, Math.min(255, Math.round(r)));
  g = Math.max(0, Math.min(255, Math.round(g)));
  b = Math.max(0, Math.min(255, Math.round(b)));

  return [r, g, b];
}

export function rgbToYUV(r, g, b) {
  const y = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  const cb = Math.round(128 - 0.168736 * r - 0.331264 * g + 0.5 * b);
  const cr = Math.round(128 + 0.5 * r - 0.418688 * g - 0.081312 * b);

  return {
    y: Math.min(Math.max(y, 0), 255),
    cb: Math.min(Math.max(cb, 0), 255),
    cr: Math.min(Math.max(cr, 0), 255),
  };
}
