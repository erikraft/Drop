import {
  freqToLum,
  hannWindow,
  yuvToRgb,
} from "./utils.js";
import FFT from "./fft.js";
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
  constructor(
    audioBuffer,
    sampleRate,
    fftSize = null,
    onProgress,
    onStart = null,
    onLine = null,
    cpuBudgetSeconds = 600
  ) {
    this.samples = audioBuffer;
    this.sampleRate = sampleRate;
    this.fftSize = fftSize;
    this.mode = null;
    this.onProgress = onProgress;
    this.onStart = onStart;
    this.onLine = onLine;
    this.cpuBudgetSeconds = cpuBudgetSeconds;
    this.decodeDeadline = null;
    this.hannWindows = new Map();
    this.frequencyCoefficients = new Map();
    this.fftInstances = new Map();
    this.windowedSamples = new Float64Array(0);
  }

  async decode() {
    const now = globalThis.performance?.now?.() ?? Date.now();
    this.decodeDeadline = now + this.cpuBudgetSeconds * 1000;
    const headerEnd = this._findHeader();
    this._throwIfCpuBudgetExceeded();
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
    const fftSize = Math.max(
      this.fftSize ?? 0,
      2 ** Math.ceil(Math.log2(data.length))
    );
    const binWidth = this.sampleRate / fftSize;
    const firstBin = Math.max(1, Math.ceil(minFrequency / binWidth));
    const lastBin = Math.min(fftSize / 2 - 2, Math.floor(maxFrequency / binWidth));
    if (firstBin > lastBin) return Number.NaN;

    let window = this.hannWindows.get(data.length);
    if (!window) {
      window = new Float64Array(data.length);
      for (let index = 0; index < data.length; index++) {
        window[index] = 0.5 * (1 - Math.cos((2 * Math.PI * index) / (data.length - 1)));
      }
      this.hannWindows.set(data.length, window);
    }

    if (this.windowedSamples.length < data.length) {
      this.windowedSamples = new Float64Array(data.length);
    }
    const windowedSamples = this.windowedSamples;
    for (let index = 0; index < data.length; index++) {
      windowedSamples[index] = data[index] * window[index];
    }

    let coefficients = this.frequencyCoefficients.get(fftSize);
    if (!coefficients) {
      coefficients = new Float64Array(fftSize / 2);
      for (let bin = 0; bin < coefficients.length; bin++) {
        coefficients[bin] = 2 * Math.cos((2 * Math.PI * bin) / fftSize);
      }
      this.frequencyCoefficients.set(fftSize, coefficients);
    }

    const scanFirstBin = Math.max(1, firstBin - 1);
    const scanLastBin = Math.min(fftSize / 2 - 1, lastBin + 1);
    let peakBin = -1;
    let peakMagnitude = -Infinity;
    let peakLeft = 0;
    let peakRight = 0;
    const scanWork = (lastBin - firstBin + 1) * data.length;
    const fftWork = fftSize * Math.log2(fftSize);

    if (scanWork >= fftWork) {
      let cached = this.fftInstances.get(fftSize);
      if (!cached) {
        cached = { fft: new FFT(fftSize, this.sampleRate), input: new Float32Array(fftSize) };
        this.fftInstances.set(fftSize, cached);
      }
      cached.input.fill(0);
      cached.input.set(windowedSamples.subarray(0, data.length));
      const spectrum = cached.fft.forward(cached.input);
      for (let bin = firstBin; bin <= lastBin; bin++) {
        if (spectrum[bin] > peakMagnitude) {
          peakBin = bin;
          peakMagnitude = spectrum[bin];
          peakLeft = spectrum[bin - 1];
          peakRight = spectrum[bin + 1];
        }
      }
    } else {
      let previousMagnitude = 0;
      for (let bin = scanFirstBin; bin <= scanLastBin; bin++) {
        const coefficient = coefficients[bin];
        let previous = 0;
        let previousPrevious = 0;
        for (let index = 0; index < data.length; index++) {
          const current =
            coefficient * previous - previousPrevious + windowedSamples[index];
          previousPrevious = previous;
          previous = current;
        }
        const power =
          previous * previous +
          previousPrevious * previousPrevious -
          coefficient * previous * previousPrevious;
        const magnitude = Math.sqrt(Math.max(0, power));

        if (bin >= firstBin && bin <= lastBin && magnitude > peakMagnitude) {
          peakBin = bin;
          peakMagnitude = magnitude;
          peakLeft = previousMagnitude;
          peakRight = 0;
        } else if (bin === peakBin + 1) {
          peakRight = magnitude;
        }
        previousMagnitude = magnitude;
      }
    }

    if (peakBin < 0 || !Number.isFinite(peakMagnitude) || peakMagnitude <= 0) {
      return Number.NaN;
    }

    const denominator = peakLeft - 2 * peakMagnitude + peakRight;
    const offset =
      Math.abs(denominator) < Number.EPSILON
        ? 0
        : Math.max(-0.5, Math.min(0.5, (0.5 * (peakLeft - peakRight)) / denominator));
    return (peakBin + offset) * binWidth;
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

  _throwIfCpuBudgetExceeded() {
    if (this.decodeDeadline === null) return;
    const now = globalThis.performance?.now?.() ?? Date.now();
    if (now >= this.decodeDeadline) {
      throw new Error("SSTV decoding CPU time limit reached.");
    }
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

    const maxHeaderSearchSamples = Math.min(
      this.samples.length - headerSize,
      Math.round(60 * this.sampleRate)
    );
    for (let offset = 0; offset <= maxHeaderSearchSamples; offset += jumpSize) {
      this._throwIfCpuBudgetExceeded();
      const f1 = this._peakFreq(this.samples.subarray(offset + leader1Start, offset + leader1Start + windowSize), 1750, 2050);
      const f2 = this._peakFreq(this.samples.subarray(offset + breakStart, offset + breakStart + windowSize), 1050, 1350);
      const f3 = this._peakFreq(this.samples.subarray(offset + leader2Start, offset + leader2Start + windowSize), 1750, 2050);
      const f4 = this._peakFreq(this.samples.subarray(offset + visStart, offset + visStart + windowSize), 1050, 1350);
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
            const segment = this.samples.subarray(
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
    const syncSamples = Math.round(this.mode.SYNC_PULSE * this.sampleRate);
    const porchSamples = Math.round(this.mode.SYNC_PORCH * this.sampleRate);
    const syncProbeLength = Math.max(8, Math.round(syncSamples * 0.4));
    const porchProbeLength = porchSamples >= 8
      ? Math.max(8, Math.round(porchSamples * 0.75))
      : 0;
    const searchRadius = startOfSync
      ? Math.round(Math.max(0.02, this.mode.SYNC_PULSE * 2) * this.sampleRate)
      : Math.round(2 * this.mode.LINE_TIME * this.sampleRate);
    const searchStart = startOfSync
      ? Math.max(syncProbeLength, alignStart - searchRadius)
      : Math.max(syncProbeLength, alignStart);
    const searchStop = Math.min(
      this.samples.length - (startOfSync
        ? syncSamples + porchProbeLength
        : porchProbeLength),
      alignStart + searchRadius
    );

    if (searchStop <= searchStart) return null;

    const contrast = (expectedPower, competingPower) => {
      const total = expectedPower + competingPower;
      if (!Number.isFinite(total) || total <= Number.EPSILON) return -1;
      return (expectedPower - competingPower) / total;
    };

    const scoreAt = (candidate) => {
      if (startOfSync) {
        // A line begins with 1200 Hz sync, followed by the 1500 Hz porch.
        const before = this.samples.subarray(
          candidate - syncProbeLength,
          candidate
        );
        const sync = this.samples.subarray(
          candidate,
          candidate + syncProbeLength
        );
        const transitionScore = contrast(
          this._tonePower(sync, 1200),
          this._tonePower(before, 1200)
        );

        if (porchProbeLength === 0) return transitionScore;
        const porchInset = Math.max(0, Math.floor((porchSamples - porchProbeLength) / 2));
        const porchStart = candidate + syncSamples + porchInset;
        const porch = this.samples.subarray(
          porchStart,
          porchStart + porchProbeLength
        );
        const porchScore = contrast(
          this._tonePower(porch, 1500),
          this._tonePower(porch, 1200)
        );
        return transitionScore * 0.65 + porchScore * 0.35;
      }

      // Scottie modes have an initial sync immediately after the VIS stop
      // tone. That stop tone and the first sync are both 1200 Hz, so their
      // boundary is not observable. Align to the 1200 -> 1500 porch edge.
      const sync = this.samples.subarray(
        candidate - syncProbeLength,
        candidate
      );
      if (porchProbeLength === 0) return -1;
      const porch = this.samples.subarray(
        candidate,
        candidate + porchProbeLength
      );
      const syncScore = contrast(
        this._tonePower(sync, 1200),
        this._tonePower(sync, 1500)
      );
      const porchScore = contrast(
        this._tonePower(porch, 1500),
        this._tonePower(porch, 1200)
      );
      return syncScore * 0.65 + porchScore * 0.35;
    };

    let bestCandidate = null;
    let bestScore = -Infinity;
    const searchStep = Math.max(1, Math.round(0.00025 * this.sampleRate));

    for (
      let candidate = searchStart;
      candidate <= searchStop;
      candidate += searchStep
    ) {
      this._throwIfCpuBudgetExceeded();
      const score = scoreAt(candidate);
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    if (bestCandidate === null || bestScore < 0.25) return null;

    const refineStart = Math.max(searchStart, bestCandidate - searchStep);
    const refineStop = Math.min(searchStop, bestCandidate + searchStep);
    for (let candidate = refineStart; candidate <= refineStop; candidate++) {
      this._throwIfCpuBudgetExceeded();
      const score = scoreAt(candidate);
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    return bestCandidate;
  }
  _decodeVIS(visStart) {
    const bitSize = Math.round(VIS_BIT_SIZE * this.sampleRate);
    const visBits = [];

    for (let i = 0; i < 8; i++) {
      const bitWindowSize = Math.round(bitSize * 0.8);
      const start = visStart + i * bitSize + Math.floor((bitSize - bitWindowSize) / 2);
      const end = start + bitWindowSize;
      if (end > this.samples.length) throw new Error("SSTV VIS header is incomplete.");
      const section = this.samples.subarray(start, end);
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
      this._throwIfCpuBudgetExceeded();
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
          // The first Martin/Robot sync starts immediately after the known VIS
          // stop bit, so its position is already exact. Only align later lines,
          // or modes that carry an initial scan before their first sync pulse.
          const shouldAlignSync = line > 0 || chan > 0 || mode.HAS_START_SYNC;
          if (shouldAlignSync) {
            const aligned = this._alignSync(seqStart);
            if (aligned !== null) seqStart = aligned;
          }
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

          const pixelArea = this.samples.subarray(pxStart, pxEnd);
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
