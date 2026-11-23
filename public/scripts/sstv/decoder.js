import {
  freqToLum,
  barycentricPeakInterp,
  hannWindow,
  fft,
  yuvToRgb,
} from "../utils.js";
import {
  VIS_MAP,
  COL_FMT,
  HDR_SIZE,
  HDR_WINDOW_SIZE,
  BREAK_OFFSET,
  LEADER_OFFSET,
  VIS_START_OFFSET,
  VIS_BIT_SIZE,
} from "../spec.js";

class SSTVDecoder {
  constructor(audioBuffer, sampleRate, fftSize = null, onProgress) {
    this.samples = audioBuffer;
    this.sampleRate = sampleRate;
    this.fftSize = fftSize;
    this.mode = null;
    this.onProgress = onProgress;
  }

  async decode() {
    const headerEnd = this._findHeader();
    if (this.onProgress) this.onProgress(5);

    this.mode = this._decodeVIS(headerEnd);
    if (this.onProgress) this.onProgress(10);

    const visEnd = headerEnd + Math.round(VIS_BIT_SIZE * 9 * this.sampleRate);
    const imageData = this._decodeImageData(visEnd);

    return this._generateImageBuffer(imageData);
  }

  _peakFreq(data) {
    const window = hannWindow(data.length);
    const windowedData = data.map((v, i) => v * window[i]);
    const spectrum = fft(windowedData, this.sampleRate, this.fftSize);
    const maxIndex = spectrum.indexOf(Math.max(...spectrum));
    const interp = barycentricPeakInterp(spectrum, maxIndex);
    return (interp * this.sampleRate) / (2 * spectrum.length);
  }

  _findHeader() {
    const headerSize = Math.round(HDR_SIZE * this.sampleRate);
    const windowSize = Math.round(HDR_WINDOW_SIZE * this.sampleRate);
    const jumpSize = Math.round(0.002 * this.sampleRate);

    const leader1Start = 0;
    const leader1End = leader1Start + windowSize;
    const breakStart = Math.round(BREAK_OFFSET * this.sampleRate);
    const breakEnd = breakStart + windowSize;
    const leader2Start = Math.round(LEADER_OFFSET * this.sampleRate);
    const leader2End = leader2Start + windowSize;
    const visStart = Math.round(VIS_START_OFFSET * this.sampleRate);
    const visEnd = visStart + windowSize;

    for (
      let offset = 0;
      offset < this.samples.length - headerSize;
      offset += jumpSize
    ) {
      const chunk = this.samples.slice(offset, offset + headerSize);

      const f1 = this._peakFreq(chunk.slice(leader1Start, leader1End));
      const f2 = this._peakFreq(chunk.slice(breakStart, breakEnd));
      const f3 = this._peakFreq(chunk.slice(leader2Start, leader2End));
      const f4 = this._peakFreq(chunk.slice(visStart, visEnd));

      if (
        Math.abs(f1 - 1900) < 50 &&
        Math.abs(f2 - 1200) < 50 &&
        Math.abs(f3 - 1900) < 50 &&
        Math.abs(f4 - 1200) < 50
      ) {
        console.log("SSTV header found at", offset);
        return offset + headerSize;
      }
    }

    throw new Error("SSTV header not found in audio.");
  }

  _alignSync(alignStart, startOfSync = true) {
    const syncWindow = Math.round(this.mode.SYNC_PULSE * 1.4 * this.sampleRate);
    const alignStop = this.samples.length - syncWindow;

    if (alignStop <= alignStart) return null;

    for (let i = alignStart; i < alignStop; i++) {
      const section = this.samples.slice(i, i + syncWindow);
      const freq = this._peakFreq(section);
      if (freq > 1350) {
        const syncEnd = i + Math.floor(syncWindow / 2);
        return startOfSync
          ? syncEnd - Math.round(this.mode.SYNC_PULSE * this.sampleRate)
          : syncEnd;
      }
    }
    return null;
  }

  _decodeVIS(visStart) {
    const bitSize = Math.round(VIS_BIT_SIZE * this.sampleRate);
    const visBits = [];

    for (let i = 0; i < 8; i++) {
      const start = visStart + i * bitSize;
      const section = this.samples.slice(start, start + bitSize);
      const freq = this._peakFreq(section);
      visBits.push(freq <= 1200 ? 1 : 0);
    }

    const parity = visBits.reduce((a, b) => a + b, 0) % 2 === 0;
    if (!parity) {
      throw new Error("Invalid parity bit in VIS header");
    }

    let visCode = 0;
    for (let i = 6; i >= 0; i--) {
      visCode = (visCode << 1) | visBits[i];
    }

    const mode = VIS_MAP[visCode];
    if (!mode) {
      throw new Error(`Unsupported VIS code: ${visCode}`);
    }

    console.log(`Detected SSTV mode: ${mode.NAME}`);
    return mode;
  }

  _decodeImageData(imageStart) {
    const mode = this.mode;
    const width = mode.LINE_WIDTH;
    const height = mode.LINE_COUNT;
    const channels = mode.CHAN_COUNT;

    const windowFactor = mode.WINDOW_FACTOR;
    const imageData = new Array(height)
      .fill(0)
      .map(() =>
        new Array(channels).fill(0).map(() => new Array(width).fill(0))
      );

    let seqStart = imageStart;

    if (mode.HAS_START_SYNC) {
      const aligned = this._alignSync(seqStart, false);
      if (aligned !== null) seqStart = aligned;
    }

    for (let line = 0; line < height; line++) {
      if (this.onProgress && line % 5 === 0) {
        const percent = 10 + Math.round((line / height) * 90);
        this.onProgress(percent);
      }

      if (mode.CHAN_SYNC > 0 && line === 0) {
        const syncOffset = mode.CHAN_OFFSETS[mode.CHAN_SYNC];
        seqStart -= Math.round((syncOffset + mode.SCAN_TIME) * this.sampleRate);
      }

      for (let chan = 0; chan < channels; chan++) {
        if (chan === mode.CHAN_SYNC) {
          if (line > 0 || chan > 0) {
            seqStart += Math.round(mode.LINE_TIME * this.sampleRate);
          }
          const aligned = this._alignSync(seqStart);
          if (aligned !== null) seqStart = aligned;
        }

        for (let px = 0; px < width; px++) {
          const pixelTime =
            mode.HAS_HALF_SCAN && chan > 0
              ? mode.HALF_PIXEL_TIME
              : mode.PIXEL_TIME;
          const centerWindowChan = (pixelTime * windowFactor) / 2;
          const pixelWindowChan = Math.round(
            centerWindowChan * 2 * this.sampleRate
          );

          const chanOffset = mode.CHAN_OFFSETS[chan];
          const pxStart = Math.round(
            seqStart +
              (chanOffset + px * pixelTime - centerWindowChan) * this.sampleRate
          );
          const pxEnd = pxStart + pixelWindowChan;

          if (pxEnd >= this.samples.length) {
            console.warn("Reached end of audio during decoding");
            return imageData;
          }

          const pixelArea = this.samples.slice(pxStart, pxEnd);
          const freq = this._peakFreq(pixelArea);
          imageData[line][chan][px] = freqToLum(freq);
        }
      }
    }

    return imageData;
  }

  _generateImageBuffer(imageData) {
    const mode = this.mode;
    const width = mode.LINE_WIDTH;
    const height = mode.LINE_COUNT;
    const channels = mode.CHAN_COUNT;

    const buffer = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      const oddLine = y % 2;

      for (let x = 0; x < width; x++) {
        let r = 0,
          g = 0,
          b = 0;

        if (channels === 2 && mode.HAS_ALT_SCAN && mode.COLOR === COL_FMT.YUV) {
          const yVal = imageData[y][0][x];
          const cbVal = imageData[y - (oddLine - 1)]?.[1]?.[x] ?? 128;
          const crVal = imageData[y - oddLine]?.[1]?.[x] ?? 128;
          [r, g, b] = yuvToRgb(yVal, cbVal, crVal);
        } else if (channels === 3) {
          if (mode.COLOR === COL_FMT.GBR) {
            r = imageData[y][2][x];
            g = imageData[y][0][x];
            b = imageData[y][1][x];
          } else if (mode.COLOR === COL_FMT.YUV) {
            const yVal = imageData[y][0][x];
            const cbVal = imageData[y][1][x];
            const crVal = imageData[y][2][x];
            [r, g, b] = yuvToRgb(yVal, cbVal, crVal);
          } else if (mode.COLOR === COL_FMT.RGB) {
            r = imageData[y][0][x];
            g = imageData[y][1][x];
            b = imageData[y][2][x];
          }
        }

        const idx = (y * width + x) * 4;
        buffer[idx] = r;
        buffer[idx + 1] = g;
        buffer[idx + 2] = b;
        buffer[idx + 3] = 255;
      }
    }

    return { buffer, width, height };
  }
}

export default SSTVDecoder;
