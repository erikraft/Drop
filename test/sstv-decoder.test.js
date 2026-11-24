import test from "node:test";
import assert from "node:assert/strict";
import SSTVDecoder from "../public/scripts/sstv/decoder.js";
import { createToneWriter } from "../public/scripts/sstv/tone-generator.js";
import { M1, R36 } from "../public/scripts/sstv/spec.js";
import { parabolicPeakInterp } from "../public/scripts/sstv/utils.js";

function makeSstvHeader(visCode, sampleRate = 11025, leadingSilenceSeconds = 0.123) {
  const samples = new Array(Math.round(sampleRate * leadingSilenceSeconds)).fill(0);
  let phase = 0;
  const tone = (frequency, duration) => {
    const count = Math.round(sampleRate * duration);
    for (let index = 0; index < count; index++) {
      samples.push(Math.sin(phase) * 0.8);
      phase += (2 * Math.PI * frequency) / sampleRate;
      if (phase >= Math.PI * 2) phase -= Math.PI * 2;
    }
  };
  tone(1900, 0.3);
  tone(1200, 0.01);
  tone(1900, 0.3);
  tone(1200, 0.03);
  let parity = 0;
  for (let bit = 0; bit < 7; bit++) {
    const value = (visCode >> bit) & 1;
    parity ^= value;
    tone(value ? 1100 : 1300, 0.03);
  }
  tone(parity ? 1100 : 1300, 0.03);
  tone(1200, 0.03);
  tone(1700, 0.06);
  return new Float32Array(samples);
}

function makeTone(frequency, sampleRate, sampleCount) {
  return Float32Array.from(
    { length: sampleCount },
    (_, index) => Math.sin((2 * Math.PI * frequency * index) / sampleRate) * 0.8
  );
}

function makeMartin1FirstLine(sampleRate = 11025, leadingSilenceSeconds = 0.123) {
  const visCode = 44;
  const samples = new Array(Math.round(sampleRate * leadingSilenceSeconds)).fill(0);
  const tone = createToneWriter(sampleRate, samples);

  tone(1900, 0.3);
  tone(1200, 0.01);
  tone(1900, 0.3);
  tone(1200, 0.03);

  let parity = 0;
  for (let bit = 0; bit < 7; bit++) {
    const value = (visCode >> bit) & 1;
    parity ^= value;
    tone(value ? 1100 : 1300, 0.03);
  }
  tone(parity ? 1100 : 1300, 0.03);
  tone(1200, 0.03);

  // Distinct, constant channels make a bad header-to-image alignment obvious.
  tone(1200, M1.SYNC_PULSE);
  tone(1500, M1.SYNC_PORCH);
  for (const frequency of [1500, 1900, 2300]) {
    for (let pixel = 0; pixel < M1.LINE_WIDTH; pixel++) {
      tone(frequency, M1.PIXEL_TIME);
    }
    tone(1500, M1.SEP_PULSE);
  }

  return Float32Array.from(samples);
}

for (const [visCode, expectedName] of [
  [8, "Robot 36"],
  [12, "Robot 72"],
  [40, "Martin 2"],
  [44, "Martin 1"],
  [56, "Scottie 2"],
  [60, "Scottie 1"],
  [76, "Scottie DX"],
]) {
  test(`automatically detects ${expectedName} after leading silence`, async () => {
    const sampleRate = 11025;
    const samples = makeSstvHeader(visCode, sampleRate);
    let detectedMode = null;
    const decoder = new SSTVDecoder(samples, 11025, 512, () => {}, (_w, _h, name) => {
      detectedMode = name;
    });
    const headerEnd = decoder._findHeader();
    assert.ok(
      Math.abs(headerEnd / sampleRate - (0.123 + 0.64)) < 0.001,
      "header alignment should be within one millisecond"
    );
    await decoder.decode();
    assert.equal(detectedMode, expectedName);
  });
}

test("aligns the first Martin 1 image row after the VIS header", async () => {
  const sampleRate = 11025;
  const decoder = new SSTVDecoder(
    makeMartin1FirstLine(sampleRate),
    sampleRate,
    512
  );
  const { buffer, width } = await decoder.decode();
  const offset = 160 * 4;

  assert.equal(width, 320);
  assert.ok(buffer[offset] > 240, "red channel should decode the 2300 Hz test tone");
  assert.ok(buffer[offset + 1] < 20, "green channel should decode the 1500 Hz test tone");
  assert.ok(
    Math.abs(buffer[offset + 2] - 128) < 16,
    "blue channel should decode the 1900 Hz test tone"
  );
});

test("rejects a 1200 Hz pulse without the required 1500 Hz porch", () => {
  const sampleRate = 44100;
  const samples = [];
  const tone = createToneWriter(sampleRate, samples);
  tone(1900, 0.025);
  const syncStart = samples.length;
  tone(1200, R36.SYNC_PULSE);
  samples.push(...new Array(Math.round(R36.SYNC_PORCH * sampleRate)).fill(0));
  tone(1900, 0.025);

  const decoder = new SSTVDecoder(
    Float32Array.from(samples),
    sampleRate,
    512
  );
  decoder.mode = R36;

  assert.equal(
    decoder._alignSync(
      syncStart + Math.round(0.001 * sampleRate),
      true
    ),
    null,
    "silence after a 1200 Hz pulse must not be accepted as a line porch"
  );
});

test("rejects an initial sync edge when a 1500 Hz porch is absent", () => {
  const sampleRate = 44100;
  const samples = [];
  const tone = createToneWriter(sampleRate, samples);
  tone(1200, R36.SYNC_PULSE);
  tone(1900, R36.SYNC_PORCH);
  tone(1200, 0.025);

  const decoder = new SSTVDecoder(Float32Array.from(samples), sampleRate, 512);
  decoder.mode = R36;

  assert.equal(
    decoder._alignSync(0, false),
    null,
    "a 1900 Hz scan tone must not be mistaken for the 1500 Hz porch"
  );
});

test("sync alignment validates the 1200 Hz pulse and 1500 Hz porch edges", () => {
  const sampleRate = 44100;
  const samples = [];
  const tone = createToneWriter(sampleRate, samples);
  tone(1900, 0.025);
  const syncStart = samples.length;
  tone(1200, R36.SYNC_PULSE);
  const syncEnd = samples.length;
  tone(1500, R36.SYNC_PORCH);
  tone(1900, 0.025);

  const decoder = new SSTVDecoder(
    Float32Array.from(samples),
    sampleRate,
    512
  );
  decoder.mode = R36;

  const detectedStart = decoder._alignSync(
    syncStart + Math.round(0.001 * sampleRate),
    true
  );
  const detectedEnd = decoder._alignSync(
    syncStart - Math.round(0.001 * sampleRate),
    false
  );

  assert.ok(
    Math.abs(detectedStart - syncStart) <= 2,
    "line sync should align to the rising 1200 Hz edge"
  );
  assert.ok(
    Math.abs(detectedEnd - syncEnd) <= 2,
    "initial sync should align to the 1200-to-1500 Hz porch edge"
  );
});

test("parabolic peak interpolation estimates a fractional FFT bin", () => {
  const bins = new Float64Array([0, 2, 6, 10, 8, 1, 0]);
  const peak = parabolicPeakInterp(bins, 3);
  assert.ok(peak > 3);
  assert.ok(peak < 3.5);
});

test("efficient frequency estimation keeps SSTV tones accurate at supported FFT sizes", () => {
  const sampleRate = 11025;
  for (const fftSize of [512, 2048]) {
    const decoder = new SSTVDecoder(new Float32Array(0), sampleRate, fftSize);
    for (const frequency of [1150, 1900, 2300]) {
      const tone = makeTone(frequency, sampleRate, 512);
      assert.ok(
        Math.abs(decoder._peakFreq(tone, 1000, 2400) - frequency) < 10,
        `FFT ${fftSize} should estimate ${frequency} Hz accurately`
      );
    }
  }
});

test("frequency estimation handles short high-sample-rate pixel windows", () => {
  const sampleRate = 44100;
  const decoder = new SSTVDecoder(new Float32Array(0), sampleRate, 2048);
  const tone = makeTone(1900, sampleRate, 48);
  assert.ok(Math.abs(decoder._peakFreq(tone, 1400, 2400) - 1900) < 20);
});

test("rejects audio without an SSTV header", async () => {
  const decoder = new SSTVDecoder(new Float32Array(11025), 11025, 512);
  await assert.rejects(() => decoder.decode(), /header not found/);
});

test("refines automatic header alignment at 44.1 kHz", () => {
  const sampleRate = 44100;
  const decoder = new SSTVDecoder(
    makeSstvHeader(44, sampleRate),
    sampleRate,
    512
  );
  const headerEnd = decoder._findHeader();
  assert.ok(Math.abs(headerEnd / sampleRate - (0.123 + 0.64)) < 0.001);
  assert.equal(decoder._decodeVIS(headerEnd).NAME, "Martin 1");
});

test("keeps the correct header origin when the recording starts with the SSTV leader", () => {
  const sampleRate = 11025;
  const decoder = new SSTVDecoder(makeSstvHeader(44, sampleRate, 0), sampleRate, 512);
  const headerEnd = decoder._findHeader();
  assert.ok(Math.abs(headerEnd / sampleRate - 0.64) < 0.001);
});

test("rejects decoding immediately when the CPU budget is exhausted", async () => {
  const decoder = new SSTVDecoder(
    makeSstvHeader(44, 11025),
    11025,
    512,
    null,
    null,
    null,
    0
  );
  await assert.rejects(() => decoder.decode(), /CPU time limit/);
});
