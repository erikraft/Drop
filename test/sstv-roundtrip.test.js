import test from "node:test";
import assert from "node:assert/strict";
import SSTVDecoder from "../public/scripts/sstv/decoder.js";
import { encodeSstvSamples } from "../public/scripts/sstv/encoder.js";
import { M1, M2, HDR_SIZE, VIS_BIT_SIZE } from "../public/scripts/sstv/spec.js";

const sampleRate = 11025;
const rowColors = [
  [220, 40, 60],
  [40, 220, 60],
  [40, 60, 220],
  [180, 120, 40],
  [30, 150, 230],
  [240, 230, 40],
];

function makeImageData() {
  const width = 320;
  const height = rowColors.length;
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    const [red, green, blue] = rowColors[y];
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      data[offset] = red;
      data[offset + 1] = green;
      data[offset + 2] = blue;
      data[offset + 3] = 255;
    }
  }

  return { data, width, height };
}

class AlignmentTrackingDecoder extends SSTVDecoder {
  constructor(...args) {
    super(...args);
    this.syncAlignments = [];
  }

  _alignSync(alignStart, startOfSync = true) {
    const aligned = super._alignSync(alignStart, startOfSync);
    this.syncAlignments.push({ alignStart, aligned, startOfSync });
    return aligned;
  }
}

for (const [visCode, mode] of [
  [44, M1],
  [40, M2],
]) {
  test(`encoder and decoder preserve ${mode.NAME} rows and sync timing`, async () => {
    const imageData = makeImageData();
    const samples = encodeSstvSamples(imageData, visCode);
    const decoder = new AlignmentTrackingDecoder(samples, sampleRate, 512);
    const { buffer, width, height } = await decoder.decode();

    assert.equal(width, 320);
    assert.equal(height, mode.LINE_COUNT);

    // The encoder's fractional sample accumulator and decoder's mode timing
    // must agree to within a few samples on every subsequent line.
    const lineAlignments = decoder.syncAlignments
      .filter((entry) => entry.startOfSync)
      .slice(0, rowColors.length - 1);
    assert.equal(lineAlignments.length, rowColors.length - 1);

    const firstImageSample = Math.round(
      (HDR_SIZE + VIS_BIT_SIZE * 9) * sampleRate
    );
    for (let line = 1; line < rowColors.length; line++) {
      const expectedSync = Math.round(
        firstImageSample + line * mode.LINE_TIME * sampleRate
      );
      assert.ok(
        lineAlignments[line - 1].aligned !== null,
        `${mode.NAME} line ${line} sync should be found`
      );
      assert.ok(
        Math.abs(lineAlignments[line - 1].aligned - expectedSync) <= 4,
        `${mode.NAME} line ${line} sync should align to the encoded boundary`
      );
    }

    for (let y = 0; y < rowColors.length; y++) {
      const expected = rowColors[y];
      const offset = (y * width + 160) * 4;
      for (let channel = 0; channel < 3; channel++) {
        assert.ok(
          Math.abs(buffer[offset + channel] - expected[channel]) <= 12,
          `${mode.NAME} row ${y} channel ${channel} should round-trip`
        );
      }
    }
  });
}

test("encoder rejects malformed image data and unsupported modes", () => {
  assert.throws(
    () => encodeSstvSamples({ data: new Uint8ClampedArray(4), width: 1, height: 1 }, 44),
    /320/
  );
  assert.throws(
    () => encodeSstvSamples(makeImageData(), 60),
    /Unsupported SSTV encoder mode/
  );
});
