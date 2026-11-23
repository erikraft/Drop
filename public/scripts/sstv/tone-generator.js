/**
 * Phase-continuous SSTV tone writer with fractional sample carry.
 * Pixel intervals are shorter than a handful of samples; never fade each tone.
 * @param {number} sampleRate
 * @param {number[]} output
 */
export function createToneWriter(sampleRate, output) {
  if (!Number.isSafeInteger(sampleRate) || sampleRate < 8000 ||
      sampleRate > 192000 || !Array.isArray(output)) {
    throw new TypeError("Invalid SSTV tone writer configuration.");
  }
  let phase = 0;
  let fractionalSamples = 0;
  return (frequency, durationSeconds) => {
    if (!Number.isFinite(frequency) || frequency <= 0 ||
        frequency >= sampleRate / 2 ||
        !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new RangeError("Invalid SSTV tone frequency or duration.");
    }
    const exactSamples = durationSeconds * sampleRate + fractionalSamples;
    const sampleCount = Math.max(1, Math.round(exactSamples));
    fractionalSamples = exactSamples - sampleCount;
    const increment = (2 * Math.PI * frequency) / sampleRate;
    for (let index = 0; index < sampleCount; index++) {
      output.push(0.72 * Math.sin(phase));
      phase += increment;
      if (phase >= 2 * Math.PI) phase %= 2 * Math.PI;
    }
  };
}

export function applyTransmissionEdgeFade(samples, sampleRate, fadeSeconds = 0.005) {
  if (!Array.isArray(samples) || !Number.isSafeInteger(sampleRate) ||
      sampleRate < 8000 || !Number.isFinite(fadeSeconds) || fadeSeconds < 0) {
    throw new TypeError("Invalid SSTV transmission fade input.");
  }
  const fadeSamples = Math.min(
    Math.floor(sampleRate * fadeSeconds),
    Math.floor(samples.length / 2)
  );
  for (let index = 0; index < fadeSamples; index++) {
    const gain = index / fadeSamples;
    samples[index] *= gain;
    samples[samples.length - 1 - index] *= gain;
  }
  return samples;
}
