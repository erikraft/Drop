import test from "node:test";
import assert from "node:assert/strict";
import { createToneWriter, applyTransmissionEdgeFade } from "../public/scripts/sstv/tone-generator.js";

test("short pixel tones keep useful amplitude", () => {
  const samples = [];
  createToneWriter(11025, samples)(1500, 0.146432 / 320);
  assert.ok(samples.length >= 4 && samples.length <= 6);
  assert.ok(Math.max(...samples.map(Math.abs)) > 0.5);
});

test("fractional sample carry prevents pixel timing drift", () => {
  const samples = [];
  const tone = createToneWriter(11025, samples);
  for (let i = 0; i < 320; i++) tone(1800, 0.146432 / 320);
  assert.ok(Math.abs(samples.length - Math.round(0.146432 * 11025)) <= 1);
});

test("transmission fade changes only outer edges", () => {
  const samples = new Array(1000).fill(0.7);
  applyTransmissionEdgeFade(samples, 10000, 0.005);
  assert.equal(samples[0], 0);
  assert.equal(samples[499], 0.7);
  assert.equal(samples[500], 0.7);
  assert.ok(samples[999] < 0.7);
});

test("rejects invalid tone inputs", () => {
  assert.throws(() => createToneWriter(1000, []), /Invalid/);
  assert.throws(() => createToneWriter(11025, [])(6000, 0.01), /Invalid/);
});
