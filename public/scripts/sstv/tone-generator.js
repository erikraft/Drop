/**
 * Writes phase-continuous SSTV tones while carrying fractional sample counts
 * between calls. This prevents per-pixel rounding drift and avoids fading every
 * individual pixel tone (which would nearly mute short pixel intervals).
 * @param {number} sampleRate
 * @param {number[]} output
 * @returns {(frequency: number, durationSeconds: number) => void}
 */
import { appendTone } from "./encoder-audio.js";

export function createToneWriter(sampleRate, output) {
  if (!Number.isSafeInteger(sampleRate) || sampleRate < 8000 || !Array.isArray(output)) {
    throw new TypeError("Invalid SSTV tone writer configuration.");
  }

  const phase = { value: 0 };
  let fractionalSamples = 0;

  return (frequency, durationSeconds) => {
    if (!Number.isFinite(frequency) || frequency <= 0 ||
        !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new RangeError("SSTV tone frequency and duration must be positive finite numbers.");
    }

    const exactSamples = durationSeconds * sampleRate + fractionalSamples;
    const sampleCount = Math.max(1, Math.round(exactSamples));
    fractionalSamples = exactSamples - sampleCount;
    appendTone(output, phase, frequency, sampleCount / sampleRate, sampleRate);
  };
}

/** Apply a short fade only at the outer edges of the complete transmission. */
export function applyTransmissionEdgeFade(samples, sampleRate, fadeSeconds = 0.005) {
  if (!Array.isArray(samples) || !Number.isSafeInteger(sampleRate) ||
      sampleRate < 8000 || !Number.isFinite(fadeSeconds) || fadeSeconds < 0) {
    throw new TypeError("Invalid SSTV transmission fade input.");
  }

  const fadeSamples = Math.min(
    Math.floor(sampleRate * fadeSeconds),
    Math.floor(samples.length / 2)
  );
  if (fadeSamples === 0) return samples;

  for (let index = 0; index < fadeSamples; index++) {
    const gain = index / fadeSamples;
    samples[index] *= gain;
    samples[samples.length - 1 - index] *= gain;
  }
  return samples;
}
