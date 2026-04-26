/**
 * carrierInfo.ts
 * Utility for fetching carrier and SIM information.
 */

export interface CarrierInfo {
  operatorName: string;
  mcc: string;
  mnc: string;
  simState: 'READY' | 'ABSENT' | 'LOCKED' | 'UNKNOWN';
  networkType: string;
  dataState: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING';
  roaming: boolean;
  signalStrength: number; // dBm
  registrationState: 'HOME' | 'ROAMING' | 'SEARCHING' | 'DENIED';
}

export async function getCarrierInfoSimulation(): Promise<CarrierInfo> {
  // Simulate network latency
  await new Promise(r => setTimeout(r, 600));

  return {
    operatorName: 'GLOBAL_MOBILE_NET',
    mcc: '208',
    mnc: '10',
    simState: 'READY',
    networkType: '5G_NR',
    dataState: 'CONNECTED',
    roaming: false,
    signalStrength: -88,
    registrationState: 'HOME',
  };
}
