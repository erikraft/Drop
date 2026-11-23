import test from "node:test";
import assert from "node:assert/strict";
import {
  parseImageDimensions,
  readImageDimensions,
  MAX_IMAGE_DIMENSION,
} from "../public/scripts/sstv/image-validation.js";

function pngHeader(width, height) {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0x00, 0x00, 0x00, 0x0d], 8);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  return bytes;
}

test("reads PNG dimensions from the header", () => {
  assert.deepEqual(parseImageDimensions(pngHeader(320, 256), "image/png"), {
    width: 320,
    height: 256,
  });
});

test("rejects oversized dimensions before image decoding", () => {
  assert.throws(
    () => parseImageDimensions(pngHeader(MAX_IMAGE_DIMENSION + 1, 1), "image/png"),
    /dimensions exceed/
  );
});

test("reads JPEG dimensions from a Start Of Frame marker", () => {
  const bytes = new Uint8Array([
    0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08,
    0x01, 0x00, 0x01, 0x40, 0x03, 0x01, 0x11,
    0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
  ]);
  assert.deepEqual(parseImageDimensions(bytes, "image/jpeg"), {
    width: 320,
    height: 256,
  });
});

test("reads WebP VP8X dimensions", () => {
  const bytes = new Uint8Array(30);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0);
  bytes.set([0x57, 0x45, 0x42, 0x50], 8);
  bytes.set([0x56, 0x50, 0x38, 0x58], 12);
  bytes.set([10, 0, 0, 0], 16);
  bytes[24] = 319 & 0xff;
  bytes[25] = (319 >> 8) & 0xff;
  bytes[26] = (319 >> 16) & 0xff;
  bytes[27] = 255 & 0xff;
  bytes[28] = (255 >> 8) & 0xff;
  bytes[29] = (255 >> 16) & 0xff;
  assert.deepEqual(parseImageDimensions(bytes, "image/webp"), {
    width: 320,
    height: 256,
  });
});

test("rejects a file whose header does not match the declared image type", async () => {
  const file = new Blob([new Uint8Array(24)], { type: "image/png" });
  await assert.rejects(() => readImageDimensions(file), /header is invalid/);
});

test("detects PNG signature even when the declared MIME type is incorrect", () => {
  assert.deepEqual(parseImageDimensions(pngHeader(320, 256), "image/jpeg"), {
    width: 320,
    height: 256,
  });
});

test("detects the image signature when the MIME type is empty", () => {
  assert.deepEqual(parseImageDimensions(pngHeader(320, 256), ""), {
    width: 320,
    height: 256,
  });
});

test("reads GIF logical screen dimensions", () => {
  const bytes = new Uint8Array([..."GIF89a"].map((char) => char.charCodeAt(0)).concat([0x40, 0x01, 0x00, 0x01]));
  assert.deepEqual(parseImageDimensions(bytes, "image/gif"), { width: 320, height: 256 });
});

test("reads BMP dimensions and handles top-down images", () => {
  const bytes = new Uint8Array(54);
  bytes.set([0x42, 0x4d], 0);
  new DataView(bytes.buffer).setUint32(14, 40, true);
  new DataView(bytes.buffer).setInt32(18, 320, true);
  new DataView(bytes.buffer).setInt32(22, -256, true);
  assert.deepEqual(parseImageDimensions(bytes, "image/bmp"), { width: 320, height: 256 });
});
