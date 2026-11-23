export const MAX_IMAGE_FILE_SIZE = 15 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 16_000_000;
export const MAX_IMAGE_DIMENSION = 8192;

const MAX_HEADER_BYTES = 2 * 1024 * 1024;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function readUint16BE(bytes, offset) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function readUint32BE(bytes, offset) {
  return (
    bytes[offset] * 0x1000000 +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  );
}

function readUint16LE(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32LE(bytes, offset) {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0;
}

function ascii(bytes, offset, length) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function validateDimensions(width, height) {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width > MAX_IMAGE_DIMENSION ||
    height > MAX_IMAGE_DIMENSION ||
    width * height > MAX_IMAGE_PIXELS
  ) {
    throw new RangeError("Image dimensions exceed the 8192-pixel or 16-megapixel limit.");
  }
  return { width, height };
}

function parseGif(bytes) {
  if (bytes.length < 10) return null;
  const signature = ascii(bytes, 0, 6);
  if (signature !== "GIF87a" && signature !== "GIF89a") return null;
  return validateDimensions(readUint16LE(bytes, 6), readUint16LE(bytes, 8));
}

function parseBmp(bytes) {
  if (bytes.length < 26 || ascii(bytes, 0, 2) !== "BM") return null;
  const dibSize = readUint32LE(bytes, 14);
  if (dibSize === 12) {
    return validateDimensions(readUint16LE(bytes, 18), readUint16LE(bytes, 20));
  }
  if (dibSize < 40 || bytes.length < 26) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getInt32(18, true);
  const rawHeight = view.getInt32(22, true);
  if (rawHeight === -2147483648) return null;
  return validateDimensions(width, Math.abs(rawHeight));
}

function parsePng(bytes) {
  if (
    bytes.length < 24 ||
    !PNG_SIGNATURE.every((value, index) => bytes[index] === value) ||
    ascii(bytes, 12, 4) !== "IHDR"
  ) return null;

  return validateDimensions(readUint32BE(bytes, 16), readUint32BE(bytes, 20));
}

function parseJpeg(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  const startOfFrame = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);

  let offset = 2;
  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    while (bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;

    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) break;

    const segmentLength = readUint16BE(bytes, offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) break;

    if (startOfFrame.has(marker)) {
      if (segmentLength < 7) break;
      const height = readUint16BE(bytes, offset + 3);
      const width = readUint16BE(bytes, offset + 5);
      return validateDimensions(width, height);
    }

    offset += segmentLength;
  }

  return null;
}

function parseWebp(bytes) {
  if (
    bytes.length < 16 ||
    ascii(bytes, 0, 4) !== "RIFF" ||
    ascii(bytes, 8, 4) !== "WEBP"
  ) return null;

  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const chunkType = ascii(bytes, offset, 4);
    const chunkSize = readUint32LE(bytes, offset + 4);
    const dataOffset = offset + 8;
    if (chunkSize > bytes.length - dataOffset) break;

    if (chunkType === "VP8X" && chunkSize >= 10) {
      const width = 1 + bytes[dataOffset + 4] +
        (bytes[dataOffset + 5] << 8) +
        (bytes[dataOffset + 6] << 16);
      const height = 1 + bytes[dataOffset + 7] +
        (bytes[dataOffset + 8] << 8) +
        (bytes[dataOffset + 9] << 16);
      return validateDimensions(width, height);
    }

    if (chunkType === "VP8L" && chunkSize >= 5 && bytes[dataOffset] === 0x2f) {
      const b1 = bytes[dataOffset + 1];
      const b2 = bytes[dataOffset + 2];
      const b3 = bytes[dataOffset + 3];
      const b4 = bytes[dataOffset + 4];
      const width = 1 + b1 + ((b2 & 0x3f) << 8);
      const height = 1 + ((b2 >> 6) | (b3 << 2) | ((b4 & 0x0f) << 10));
      return validateDimensions(width, height);
    }

    if (
      chunkType === "VP8 " &&
      chunkSize >= 10 &&
      bytes[dataOffset + 3] === 0x9d &&
      bytes[dataOffset + 4] === 0x01 &&
      bytes[dataOffset + 5] === 0x2a
    ) {
      const width = readUint16LE(bytes, dataOffset + 6) & 0x3fff;
      const height = readUint16LE(bytes, dataOffset + 8) & 0x3fff;
      return validateDimensions(width, height);
    }

    offset = dataOffset + chunkSize + (chunkSize % 2);
  }

  return null;
}

/**
 * Parse dimensions from image headers before asking the browser to decode pixels.
 * JPEG metadata is inspected up to the first 2 MiB; files with no readable frame
 * header in that range are rejected rather than decoded without a size check.
 * @param {Uint8Array} bytes
 * @param {string} mimeType
 */
export function parseImageDimensions(bytes, mimeType) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("Image header must be a Uint8Array.");
  }

  let dimensions = null;
  if (mimeType === "image/png") dimensions = parsePng(bytes);
  else if (mimeType === "image/jpeg") dimensions = parseJpeg(bytes);
  else if (mimeType === "image/webp") dimensions = parseWebp(bytes);
  else if (mimeType === "image/gif") dimensions = parseGif(bytes);
  else if (mimeType === "image/bmp" || mimeType === "image/x-ms-bmp") dimensions = parseBmp(bytes);

  if (!dimensions) {
    throw new TypeError("The image header is invalid or its dimensions could not be verified.");
  }
  return dimensions;
}

/**
 * Read only a bounded header before image decoding.
 * @param {Blob} file
 */
export async function readImageDimensions(file) {
  if (!(file instanceof Blob) || file.size <= 0 || file.size > MAX_IMAGE_FILE_SIZE) {
    throw new RangeError("Image file is empty or exceeds the 15 MB limit.");
  }

  const header = new Uint8Array(
    await file.slice(0, MAX_HEADER_BYTES).arrayBuffer()
  );
  return parseImageDimensions(header, file.type);
}
