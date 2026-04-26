/**
 * Service to handle communication with the native Android layer via Capacitor.
 * This service listens for real-time RF telemetry data from the 'RFTelemetry' plugin.
 */

export interface RFData {
  rsrp: number;
  rsrq: number;
  sinr: number;
  pci: number | string;
  earfcn: number;
  rat: string;
  cellId: number | string;
  timestamp: number;
  ssRsrp?: number;
  ssSinr?: number;
  nrarfcn?: number;
  rrcState?: string;
}

type TelephonyCallback = (data: RFData) => void;

class TelemetryService {
  private listeners: TelephonyCallback[] = [];
  private isNative: boolean = false;

  constructor() {
    // Check if running in a Capacitor/Native environment
    this.isNative = (window as any).Capacitor !== undefined;
    
    if (this.isNative) {
      this.setupNativeListener();
    }
  }

  private setupNativeListener() {
    const Capacitor = (window as any).Capacitor;
    if (!Capacitor) return;

    // Listen for the 'rfData' event from the 'RFTelemetry' plugin
    Capacitor.Plugins.RFTelemetry.addListener('rfData', (data: RFData) => {
      this.notifyListeners(data);
    });
  }

  public subscribe(callback: TelephonyCallback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(data: RFData) {
    this.listeners.forEach(listener => listener(data));
  }

  public async startStreaming() {
    if (this.isNative) {
      const Capacitor = (window as any).Capacitor;
      await Capacitor.Plugins.RFTelemetry.startStream();
    } else {
      console.warn('TelemetryService: Not running in a native environment. Streaming not started.');
    }
  }

  public async stopStreaming() {
    if (this.isNative) {
      const Capacitor = (window as any).Capacitor;
      await Capacitor.Plugins.RFTelemetry.stopStream();
    }
  }

  public checkNativeSupport(): boolean {
    return this.isNative;
  }
}

export const telemetryService = new TelemetryService();
