import {
  freqToLum,
  parabolicPeakInterp,
  hannWindow,
  fft,
  yuvToRgb,
} from "./utils.js";
import {
  VIS_MAP,
  COL_FMT,
  HDR_SIZE,
  HDR_WINDOW_SIZE,
  BREAK_OFFSET,
  LEADER_OFFSET,
  VIS_START_OFFSET,
  VIS_BIT_SIZE,
} from "./spec.js";

class SSTVDecoder {
  constructor(audioBuffer, sampleRate, fftSize = null, onProgress, onStart = null, onLine = null) {
    this.samples = audioBuffer;
    this.sampleRate = sampleRate;
    this.fftSize = fftSize;
    this.mode = null;
    this.onProgress = onProgress;
    this.onStart = onStart;
    this.onLine = onLine;
  }

  async decode() {
    const headerEnd = this._findHeader();
    if (this.onProgress) this.onProgress(5);

    this.mode = this._decodeVIS(headerEnd);
    this.onStart?.(this.mode.LINE_WIDTH, this.mode.LINE_COUNT, this.mode.NAME);
    if (this.onProgress) this.onProgress(10);

    const visEnd = headerEnd + Math.round(VIS_BIT_SIZE * 9 * this.sampleRate);
    const imageData = this._decodeImageData(visEnd);

    return this._generateImageBuffer(imageData);
  }

  _peakFreq(data, minFrequency = 1000, maxFrequency = 2600) {
    if (!data || data.length < 8) return Number.NaN;
    const window = hannWindow(data.length);
    const windowedData = data.map((value, index) => value * window[index]);
    const spectrum = fft(windowedData, this.sampleRate, this.fftSize);
    const binWidth = this.sampleRate / (2 * spectrum.length);
    const firstBin = Math.max(1, Math.ceil(minFrequency / binWidth));
    const lastBin = Math.min(spectrum.length - 2, Math.floor(maxFrequency / binWidth));
    if (firstBin > lastBin) return Number.NaN;
    let peakBin = firstBin;
    let peakMagnitude = -Infinity;
    for (let bin = firstBin; bin <= lastBin; bin++) {
      if (spectrum[bin] > peakMagnitude) {
        peakMagnitude = spectrum[bin];
        peakBin = bin;
      }
    }
    if (!Number.isFinite(peakMagnitude) || peakMagnitude <= 0) return Number.NaN;
    return parabolicPeakInterp(spectrum, peakBin) * binWidth;
  }

  _tonePower(data, frequency) {
    if (!data || data.length < 8) return 0;
    const window = hannWindow(data.length);
    const coefficient = 2 * Math.cos((2 * Math.PI * frequency) / this.sampleRate);
    let previous = 0;
    let previousPrevious = 0;

    for (let index = 0; index < data.length; index++) {
      const current =
        coefficient * previous - previousPrevious + data[index] * window[index];
      previousPrevious = previous;
      previous = current;
    }

    const power =
      previous * previous +
      previousPrevious * previousPrevious -
      coefficient * previous * previousPrevious;
    return Number.isFinite(power) ? Math.max(0, power) : 0;
  }

  _findHeader() {
    const headerSize = Math.round(HDR_SIZE * this.sampleRate);
    const windowSize = Math.round(HDR_WINDOW_SIZE * this.sampleRate);
    const jumpSize = Math.max(1, Math.round(0.005 * this.sampleRate));
    const windowSeconds = windowSize / this.sampleRate;
    const centeredWindowStart = (segmentStart, segmentEnd) =>
      Math.round((segmentStart + (segmentEnd - segmentStart - windowSeconds) / 2) * this.sampleRate);
    const leader1Start = centeredWindowStart(0, BREAK_OFFSET);
    const breakStart = centeredWindowStart(BREAK_OFFSET, LEADER_OFFSET);
    const leader2Start = centeredWindowStart(LEADER_OFFSET, VIS_START_OFFSET);
    const visStart = centeredWindowStart(VIS_START_OFFSET, HDR_SIZE);

    for (let offset = 0; offset <= this.samples.length - headerSize; offset += jumpSize) {
      const f1 = this._peakFreq(this.samples.slice(offset + leader1Start, offset + leader1Start + windowSize), 1750, 2050);
      const f2 = this._peakFreq(this.samples.slice(offset + breakStart, offset + breakStart + windowSize), 1050, 1350);
      const f3 = this._peakFreq(this.samples.slice(offset + leader2Start, offset + leader2Start + windowSize), 1750, 2050);
      const f4 = this._peakFreq(this.samples.slice(offset + visStart, offset + visStart + windowSize), 1050, 1350);
      if (
        Number.isFinite(f1) && Number.isFinite(f2) &&
        Number.isFinite(f3) && Number.isFinite(f4) &&
        Math.abs(f1 - 1900) < 65 &&
        Math.abs(f2 - 1200) < 85 &&
        Math.abs(f3 - 1900) < 65 &&
        Math.abs(f4 - 1200) < 85
      ) {
        const expectedTones = [
          [leader1Start, 1900],
          [breakStart, 1200],
          [leader2Start, 1900],
          [visStart, 1200],
        ];
        const refineRadius = Math.round(0.01 * this.sampleRate);
        const refineStep = Math.max(1, Math.round(0.00025 * this.sampleRate));
        const lastOffset = Math.min(
          offset + refineRadius,
          this.samples.length - headerSize
        );
        let bestOffset = offset;
        let bestScore = -Infinity;

        for (
          let candidate = Math.max(0, offset - refineRadius);
          candidate <= lastOffset;
          candidate += refineStep
        ) {
          let score = 0;
          for (const [windowStart, frequency] of expectedTones) {
            const segment = this.samples.slice(
              candidate + windowStart,
              candidate + windowStart + windowSize
            );
            score += this._tonePower(segment, frequency);
          }
          if (score > bestScore) {
            bestScore = score;
            bestOffset = candidate;
          }
        }

        return bestOffset + headerSize;
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
      const freq = this._peakFreq(section, 1050, 2450);
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
      const bitWindowSize = Math.round(bitSize * 0.8);
      const start = visStart + i * bitSize + Math.floor((bitSize - bitWindowSize) / 2);
      const end = start + bitWindowSize;
      if (end > this.samples.length) throw new Error("SSTV VIS header is incomplete.");
      const section = this.samples.slice(start, end);
      const freq = this._peakFreq(section, 1000, 1400);
      if (!Number.isFinite(freq)) throw new Error("Could not read the SSTV VIS header.");
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
          const freq = this._peakFreq(pixelArea, 1400, 2400);
          imageData[line][chan][px] = freqToLum(freq);
        }
      }

      if (this.onLine) {
        const lines =
          channels === 2 && mode.HAS_ALT_SCAN
            ? line % 2 === 1
              ? [line - 1, line]
              : []
            : [line];
        for (const y of lines) {
          this.onLine(y, this._generateImageRow(imageData, y));
        }
      }
    }

    return imageData;
  }

  _generateImageRow(imageData, y) {
    const mode = this.mode;
    const width = mode.LINE_WIDTH;
    const channels = mode.CHAN_COUNT;
    const oddLine = y % 2;
    const row = new Uint8ClampedArray(width * 4);

    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;

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

      const index = x * 4;
      row[index] = r;
      row[index + 1] = g;
      row[index + 2] = b;
      row[index + 3] = 255;
    }

    return row;
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
