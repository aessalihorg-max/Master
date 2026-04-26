/**
 * pesqCalculator.ts
 * Simplified PESQ-inspired voice quality scoring algorithm
 */

export interface PESQResult {
  mosScore: number;
  quality: string;
  volumeLevel: number;
  signalNoiseRatio: number;
  spectralFlatness: number;
  zeroCrossingRate: number;
  jitter: number;
  silenceDetected: boolean;
  distortionDetected: boolean;
  noise: 'Low' | 'Moderate' | 'High';
  sampleRate: number;
  duration: number;
  samplesAnalyzed: number;
  timestamp: string;
}

export function calculatePESQ(samples: Float32Array): PESQResult {
  const rms = calculateRMS(samples);
  const snr = estimateSNR(samples);
  const spectralFlatness = estimateSpectralFlatness(samples);
  const zcr = estimateZeroCrossingRate(samples);
  const jitter = estimateJitter(samples);

  let mosScore = 4.5;

  if (rms < 0.005) mosScore -= 3.5;
  else if (rms < 0.02) mosScore -= 2.0;
  else if (rms < 0.05) mosScore -= 1.0;
  else if (rms < 0.1) mosScore -= 0.3;

  if (rms > 0.95) mosScore -= 2.5;
  else if (rms > 0.90) mosScore -= 1.5;
  else if (rms > 0.80) mosScore -= 0.5;

  if (snr < 5) mosScore -= 2.0;
  else if (snr < 10) mosScore -= 1.5;
  else if (snr < 15) mosScore -= 0.8;
  else if (snr < 20) mosScore -= 0.3;

  if (spectralFlatness < 0.2) mosScore -= 1.0;
  else if (spectralFlatness < 0.35) mosScore -= 0.5;

  if (jitter > 50) mosScore -= 0.5;
  else if (jitter > 100) mosScore -= 1.0;

  mosScore = Math.max(1.0, Math.min(5.0, mosScore));

  const silenceDetected = rms < 0.005;
  const distortionDetected = rms > 0.90;

  let noiseCategory: 'Low' | 'Moderate' | 'High' = 'Low';
  if (snr > 25) noiseCategory = 'Low';
  else if (snr > 15) noiseCategory = 'Moderate';
  else noiseCategory = 'High';

  return {
    mosScore: parseFloat(mosScore.toFixed(2)),
    quality: getLabelForMOS(mosScore),
    volumeLevel: parseFloat((20 * Math.log10(rms || 0.001)).toFixed(1)),
    signalNoiseRatio: parseFloat(snr.toFixed(1)),
    spectralFlatness: parseFloat(spectralFlatness.toFixed(2)),
    zeroCrossingRate: parseFloat(zcr.toFixed(3)),
    jitter: parseFloat(jitter.toFixed(1)),
    silenceDetected,
    distortionDetected,
    noise: noiseCategory,
    sampleRate: 16000,
    duration: parseFloat((samples.length / 16000).toFixed(1)),
    samplesAnalyzed: samples.length,
    timestamp: new Date().toISOString(),
  };
}

function calculateRMS(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

function estimateSNR(samples: Float32Array): number {
  const rms = calculateRMS(samples);
  const noiseEstimate = rms * 0.15;
  if (rms < 0.001 || noiseEstimate < 0.0001) return 0;
  return 20 * Math.log10(rms / noiseEstimate);
}

function estimateSpectralFlatness(samples: Float32Array): number {
  const fftSize = Math.min(2048, samples.length);
  const powerSpectrum = simplePowerSpectrum(samples.slice(0, fftSize));
  
  const geometricMean = Math.exp(
    powerSpectrum.reduce((sum, val) => sum + Math.log(val || 0.0001), 0) / powerSpectrum.length
  );
  const arithmeticMean = powerSpectrum.reduce((sum, val) => sum + val, 0) / powerSpectrum.length;
  
  const flatness = geometricMean / arithmeticMean;
  return isNaN(flatness) ? 0.5 : Math.min(flatness, 1.0);
}

function simplePowerSpectrum(samples: Float32Array): number[] {
  const n = samples.length;
  const spectrum = new Array(n / 2).fill(0);
  for (let k = 0; k < n / 2; k++) {
    let real = 0;
    let imag = 0;
    for (let t = 0; t < n; t++) {
      const angle = (2 * Math.PI * k * t) / n;
      real += samples[t] * Math.cos(angle);
      imag -= samples[t] * Math.sin(angle);
    }
    spectrum[k] = (real * real + imag * imag) / n;
  }
  return spectrum;
}

function estimateZeroCrossingRate(samples: Float32Array): number {
  let crossings = 0;
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i] > 0 && samples[i-1] <= 0) || (samples[i] < 0 && samples[i-1] >= 0)) {
      crossings++;
    }
  }
  return crossings / (2 * samples.length);
}

function estimateJitter(samples: Float32Array): number {
  const crossings: number[] = [];
  for (let i = 1; i < Math.min(4000, samples.length); i++) {
    if ((samples[i] > 0 && samples[i-1] <= 0) || (samples[i] < 0 && samples[i-1] >= 0)) {
      crossings.push(i);
    }
  }
  if (crossings.length < 2) return 0;
  const intervals: number[] = [];
  for (let i = 1; i < crossings.length; i++) {
    intervals.push(crossings[i] - crossings[i-1]);
  }
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((a, x) => a + Math.pow(x - mean, 2), 0) / intervals.length;
  return Math.sqrt(variance) * (1000 / 16000);
}

function getLabelForMOS(score: number): string {
  if (score >= 4.5) return 'Excellent';
  if (score >= 4.0) return 'Good';
  if (score >= 3.0) return 'Fair';
  if (score >= 2.0) return 'Poor';
  return 'Bad';
}
