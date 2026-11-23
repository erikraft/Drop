/**
 * Append a phase-continuous SSTV tone. Pixel durations are only a few samples;
 * per-tone attack/release envelopes would suppress almost the entire pixel.
 * @param {number[]} output
 * @param {{ value: number }} phase
 * @param {number} frequency
 * @param {number} durationSeconds
 * @param {number} sampleRate
 */
export function appendTone(output, phase, frequency, durationSeconds, sampleRate) {
  if (!Array.isArray(output) || !phase || !Number.isFinite(phase.value) ||
      !Number.isFinite(frequency) || frequency <= 0 ||
      !Number.isFinite(durationSeconds) || durationSeconds <= 0 ||
      !Number.isSafeInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000 ||
      frequency >= sampleRate / 2) {
    throw new TypeError("Invalid SSTV tone parameters.");
  }
  const count = Math.max(1, Math.round(durationSeconds * sampleRate));
  const increment = (2 * Math.PI * frequency) / sampleRate;
  for (let index = 0; index < count; index++) {
    output.push(Math.sin(phase.value) * 0.72);
    phase.value += increment;
    if (phase.value >= Math.PI * 2) phase.value %= Math.PI * 2;
  }
}
