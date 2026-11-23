import test from "node:test";
import assert from "node:assert/strict";
import { appendTone } from "../public/scripts/sstv/encoder-audio.js";

test("short SSTV pixel tones retain modulation amplitude", () => {
  const samples = [];
  appendTone(samples, { value: 0 }, 1500, 0.073216 / 320, 11025);
  assert.ok(samples.length >= 2 && samples.length <= 4);
  assert.ok(Math.max(...samples.map(Math.abs)) > 0.5);
});

test("oscillator phase remains continuous across adjacent pixel tones", () => {
  const samples = [];
  const phase = { value: 0 };
  appendTone(samples, phase, 1500, 0.146432 / 320, 11025);
  appendTone(samples, phase, 2200, 0.146432 / 320, 11025);
  assert.ok(Number.isFinite(phase.value));
  assert.ok(phase.value >= 0 && phase.value < Math.PI * 2);
  assert.ok(samples.every(Number.isFinite));
});

test("rejects invalid frequency and sample rate", () => {
  assert.throws(() => appendTone([], { value: 0 }, 6000, 0.01, 11025), /Invalid/);
  assert.throws(() => appendTone([], { value: 0 }, 1500, 0.01, 1000), /Invalid/);
});
