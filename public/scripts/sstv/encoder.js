import { createToneWriter, applyTransmissionEdgeFade } from "./tone-generator.js";
import {
  M1,
  M2,
  BREAK_OFFSET,
  LEADER_OFFSET,
  VIS_START_OFFSET,
  HDR_SIZE,
  VIS_BIT_SIZE,
} from "./spec.js";

const ENCODER_MODES = new Map([
  [44, M1],
  [40, M2],
]);

/**
 * Encode an RGBA image into the project's supported Martin SSTV audio modes.
 * A shorter image height is accepted for deterministic partial-frame tests;
 * the browser UI always supplies a full 320 × 256 canvas.
 *
 * @param {{ data: Uint8ClampedArray, width: number, height: number }} imageData
 * @param {number} visCode
 * @param {number} sampleRate
 * @returns {Float32Array}
 */
export function encodeSstvSamples(imageData, visCode, sampleRate = 11025) {
  if (!imageData || typeof imageData !== "object") {
    throw new TypeError("A valid ImageData object is required.");
  }

  const { data, width, height } = imageData;
  if (
    !(data instanceof Uint8ClampedArray) ||
    width !== 320 ||
    !Number.isInteger(height) ||
    height < 1 ||
    height > 256 ||
    data.length !== width * height * 4
  ) {
    throw new TypeError("SSTV input must be RGBA ImageData with 320 × 1–256 pixels.");
  }

  if (!Number.isInteger(visCode) || !ENCODER_MODES.has(visCode)) {
    throw new RangeError("Unsupported SSTV encoder mode.");
  }
  if (
    !Number.isSafeInteger(sampleRate) ||
    sampleRate < 8000 ||
    sampleRate > 192000
  ) {
    throw new RangeError("Unsupported SSTV sample rate.");
  }

  const mode = ENCODER_MODES.get(visCode);
  const samples = [];
  const tone = createToneWriter(sampleRate, samples);

  // VIS header timings are shared with the decoder's format specification.
  tone(1900, BREAK_OFFSET);
  tone(1200, LEADER_OFFSET - BREAK_OFFSET);
  tone(1900, VIS_START_OFFSET - LEADER_OFFSET);
  tone(1200, HDR_SIZE - VIS_START_OFFSET);

  let parity = 0;
  for (let bit = 0; bit < 7; bit++) {
    const value = (visCode >> bit) & 1;
    parity ^= value;
    tone(value ? 1100 : 1300, VIS_BIT_SIZE);
  }
  tone(parity ? 1100 : 1300, VIS_BIT_SIZE);
  tone(1200, VIS_BIT_SIZE);

  // Martin transmits green, blue, then red (GBR), with timing taken directly
  // from the same mode definitions used by the decoder.
  for (let y = 0; y < height; y++) {
    tone(1200, mode.SYNC_PULSE);
    tone(1500, mode.SYNC_PORCH);

    for (const channel of [1, 2, 0]) {
      for (let x = 0; x < width; x++) {
        const value = data[(y * width + x) * 4 + channel];
        tone(1500 + (value / 255) * 800, mode.PIXEL_TIME);
      }
      tone(1500, mode.SEP_PULSE);
    }
  }

  applyTransmissionEdgeFade(samples, sampleRate);
  return Float32Array.from(samples);
}
