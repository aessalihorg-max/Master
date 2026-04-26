/**
 * bandLock.ts
 * Simulation logic for band locking in web environment
 */

export interface BandLockStatus {
  success: boolean;
  message: string;
  ratLock?: string;
  bandLock?: string;
  timestamp: string;
}

export const RAT_OPTIONS = [
  { label: 'Auto (Best Select)', value: 'auto' },
  { label: '2G (GSM Only)', value: '2G' },
  { label: '3G (UMTS Only)', value: '3G' },
  { label: '4G (LTE Only)', value: '4G' },
  { label: '5G (NR Only)', value: '5G' },
];

export const BANDS = [
  // 4G LTE
  { label: 'LTE Band 1 (2100)', value: 'band1' },
  { label: 'LTE Band 3 (1800)', value: 'band3' },
  { label: 'LTE Band 7 (2600)', value: 'band7' },
  { label: 'LTE Band 20 (800)', value: 'band20' },
  // 5G NR
  { label: '5G Band n1 (2100)', value: 'n1' },
  { label: '5G Band n3 (1800)', value: 'n3' },
  { label: '5G Band n7 (2600)', value: 'n7' },
  { label: '5G Band n78 (3.5GHz)', value: 'n78' },
];

export async function setRatLockSimulation(rat: string): Promise<BandLockStatus> {
  await new Promise(r => setTimeout(r, 1500)); // Simulate hardware delay
  return {
    success: true,
    message: `RAT locked to ${rat === 'auto' ? 'Auto mode' : rat}`,
    ratLock: rat,
    timestamp: new Date().toISOString(),
  };
}

export async function setBandLockSimulation(band: string): Promise<BandLockStatus> {
  await new Promise(r => setTimeout(r, 2000)); // Simulate modem handshake
  return {
    success: true,
    message: `Modem locked to frequency band ${band}`,
    bandLock: band,
    timestamp: new Date().toISOString(),
  };
}
