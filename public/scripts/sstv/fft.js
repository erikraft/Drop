class FFT {
  constructor(bufferSize, sampleRate) {
    this.bufferSize = bufferSize;
    this.sampleRate = sampleRate;
    this.bandwidth = ((2 / bufferSize) * sampleRate) / 2;

    this.spectrum = new Float64Array(bufferSize / 2);
    this.real = new Float64Array(bufferSize);
    this.imag = new Float64Array(bufferSize);

    this.peakBand = 0;
    this.peak = 0;

    this.reverseTable = new Uint32Array(bufferSize);
    let limit = 1;
    let bit = bufferSize >> 1;
    while (limit < bufferSize) {
      for (let i = 0; i < limit; i++) {
        this.reverseTable[i + limit] = this.reverseTable[i] + bit;
      }
      limit = limit << 1;
      bit = bit >> 1;
    }

    this.sinTable = new Float64Array(bufferSize);
    this.cosTable = new Float64Array(bufferSize);
    for (let i = 0; i < bufferSize; i++) {
      this.sinTable[i] = Math.sin(-Math.PI / i);
      this.cosTable[i] = Math.cos(-Math.PI / i);
    }
  }

  forward(buffer) {
    const bufferSize = this.bufferSize;
    const cosTable = this.cosTable;
    const sinTable = this.sinTable;
    const reverseTable = this.reverseTable;
    const real = this.real;
    const imag = this.imag;
    const spectrum = this.spectrum;

    if (bufferSize !== buffer.length) {
      throw new Error("Supplied buffer is not the same size as defined FFT");
    }

    for (let i = 0; i < bufferSize; i++) {
      real[i] = buffer[reverseTable[i]];
      imag[i] = 0;
    }

    let halfSize = 1;
    while (halfSize < bufferSize) {
      const phaseShiftStepReal = cosTable[halfSize];
      const phaseShiftStepImag = sinTable[halfSize];

      let currentPhaseShiftReal = 1;
      let currentPhaseShiftImag = 0;

      for (let fftStep = 0; fftStep < halfSize; fftStep++) {
        let i = fftStep;

        while (i < bufferSize) {
          const off = i + halfSize;
          const tr =
            currentPhaseShiftReal * real[off] -
            currentPhaseShiftImag * imag[off];
          const ti =
            currentPhaseShiftReal * imag[off] +
            currentPhaseShiftImag * real[off];

          real[off] = real[i] - tr;
          imag[off] = imag[i] - ti;
          real[i] += tr;
          imag[i] += ti;

          i += halfSize << 1;
        }

        const tmpReal = currentPhaseShiftReal;
        currentPhaseShiftReal =
          tmpReal * phaseShiftStepReal -
          currentPhaseShiftImag * phaseShiftStepImag;
        currentPhaseShiftImag =
          tmpReal * phaseShiftStepImag +
          currentPhaseShiftImag * phaseShiftStepReal;
      }

      halfSize = halfSize << 1;
    }

    const bSi = 2 / bufferSize;
    for (let i = 0; i < bufferSize / 2; i++) {
      const rval = real[i];
      const ival = imag[i];
      const mag = bSi * Math.sqrt(rval * rval + ival * ival);

      if (mag > this.peak) {
        this.peakBand = i;
        this.peak = mag;
      }

      spectrum[i] = mag;
    }

    return spectrum;
  }
}

export default FFT;
