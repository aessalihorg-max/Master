import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, animate, AnimatePresence } from 'motion/react';
import { 
  Table as TableIcon,
  Settings, 
  Play, 
  Pause,
  Activity, 
  SignalHigh, 
  Map as MapIcon, 
  Download, 
  Upload, 
  Server,
  ZoomIn,
  ZoomOut,
  Maximize,
  Lock,
  Unlock,
  X,
  Check,
  FileSpreadsheet,
  FileText,
  Save,
  Plus,
  Car,
  MapPin,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  CloudOff,
  Database,
  Trash2,
  DownloadCloud,
  LocateFixed,
  Eraser,
  Navigation,
  Layers,
  Signal,
  ArrowUpDown,
  ArrowRight,
  Smartphone,
  Globe,
  Settings2,
  Terminal,
  Zap,
  Search,
  BarChart3,
  ClipboardList,
  Filter,
  ChevronRight,
  ArrowLeft,
  Sun,
  Moon,
  Type,
  Hash,
  Info,
  HelpCircle,
  ShieldCheck,
  Fingerprint,
  Copy,
  Calendar,
  TrendingUp,
  Battery,
  BatteryCharging,
  BatteryWarning,
  BatteryMedium,
  BatteryFull,
  BatteryLow,
  GripVertical,
  Minus,
  Radio,
  GripHorizontal
} from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import MapGL, { Marker, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import 'leaflet/dist/leaflet.css';
import maplibregl from 'maplibre-gl';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker as LeafletMarker, Popup, Circle as LeafletCircle, Polyline as LeafletPolyline, useMap } from 'react-leaflet';
import circle from '@turf/circle';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Label, CartesianGrid, ReferenceArea } from 'recharts';
import * as XLSX from 'xlsx';
import { telemetryService } from './services/telemetryService';
import { saveSiteReport, logTestResult, loginWithGoogle, auth, db, issueLicense, revokeLicense, toggleUserStatus, trackUser } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, onSnapshot, getDoc, doc, setDoc } from 'firebase/firestore';
import { Cloud, CloudCheck, CloudOff as CloudOffIcon, LogOut, User as UserIcon, Layout, Users, Key, AlertTriangle, ShieldAlert } from 'lucide-react';

import { BandLockPanel } from './components/advanced/BandLockPanel';
import { VoiceQualityTester } from './components/advanced/VoiceQualityTester';
import { ProtocolLogViewer } from './components/advanced/ProtocolLogViewer';
import { CarrierStatus } from './components/advanced/CarrierStatus';
import { CarrierFrequencies } from './components/advanced/CarrierFrequencies';

// Fix Leaflet marker icon issue
if (typeof L !== 'undefined' && L.Icon && L.Icon.Default) {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
}

// --- Map Styles ---
const defaultCenter = {
  lat: 40.7128,
  lng: -74.0060
};

// --- Mock Data Generators ---
const MOCK_BANDS: Record<string, string[]> = {
  '2G': ['GSM 850', 'GSM 900', 'DCS 1800', 'PCS 1900'],
  '3G': ['B1 (2100)', 'B2 (1900)', 'B5 (850)', 'B8 (900)'],
  '4G': ['B1', 'B3', 'B7', 'B20', 'B28', 'B38', 'B40'],
  '5G': ['n1', 'n3', 'n28', 'n77', 'n78']
};

// --- SVG Sector Helpers ---
const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
};

const getSectorPath = (x: number, y: number, radius: number, azimuth: number, beamwidth = 65) => {
  const startAngle = azimuth - beamwidth / 2;
  const endAngle = azimuth + beamwidth / 2;
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M", x, y,
    "L", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    "Z"
  ].join(" ");
};

const getMobilityStep = (progress: number) => {
  if (progress === 0) return 'Idle';
  if (progress < 20) return 'Connecting to Server...';
  if (progress < 50) return 'Downloading (1/2)...';
  if (progress < 80) return 'Downloading (2/2)...';
  if (progress < 100) return 'Finalizing...';
  return 'Completed';
};

const getStationaryStep = (progress: number) => {
  if (progress === 0) return 'Idle';
  if (progress < 33) return 'DL Test...';
  if (progress < 66) return 'UL Test...';
  if (progress < 100) return 'Ping Test...';
  return 'Completed';
};

const generateNRParams = () => ({
  earfcn: 634000,
  ssRsrp: -85 + Math.floor(Math.random() * 10 - 5),
  pci: 245,
  ssSinr: 15 + Math.floor(Math.random() * 4 - 2),
  cellId: 10293841,
  rrcState: Math.random() > 0.5 ? 'CONNECTED' : (Math.random() > 0.5 ? 'INACTIVE' : 'IDLE'),
  rankIndicator: Math.floor(Math.random() * 4) + 1
});

const generateLTEParams = () => ({
  earfcn: 1300,
  rsrp: -92 + Math.floor(Math.random() * 8 - 4),
  pci: 112,
  sinr: 12 + Math.floor(Math.random() * 4 - 2),
  cellId: 4839201,
  rrcState: Math.random() > 0.3 ? 'CONNECTED' : 'IDLE',
  rankIndicator: Math.floor(Math.random() * 2) + 1
});

const StatusBadge = ({ status, value }: { status: 'not_run' | 'running' | 'completed' | 'failed', value?: string }) => {
  switch (status) {
    case 'not_run':
      return (
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
          <Clock className="w-2.5 h-2.5" /> Not Run
        </div>
      );
    case 'running':
      return (
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
          <Loader2 className="w-2.5 h-2.5 animate-spin" /> Running
        </div>
      );
    case 'completed':
      return (
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-2.5 h-2.5" /> Completed
          </div>
          {value && (
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              {value}
            </span>
          )}
        </div>
      );
    case 'failed':
      return (
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
          <XCircle className="w-2.5 h-2.5" /> Failed
        </div>
      );
  }
};

const AzureDevOpsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

const mobilityScripts = [
  { id: 'cl_dl', label: 'CL Download', desc: 'Cluster test' },
  { id: 'cl_ul', label: 'CL Upload', desc: 'Cluster test' },
  { id: 'ho_dl', label: 'HO Download', desc: 'Handover test' },
  { id: 'ho_ul', label: 'HO Upload', desc: 'Handover test' },
  { id: 'cl_voice', label: 'CL Voice Call', desc: 'Cluster test' },
  { id: 'ho_voice', label: 'HO Voice Call', desc: 'Handover test' },
];

const stationaryScripts = [
  { id: 'dl', label: 'Download', desc: 'Stationary test' },
  { id: 'ul', label: 'Upload', desc: 'Stationary test' },
  { id: 'voice', label: 'Voice Call', desc: 'Stationary test' },
  { id: 'ping', label: 'Ping Test', desc: 'Stationary test' },
];

interface TestPlanConfig {
  type: 'FTP Download' | 'FTP Upload' | 'HTTP Download' | 'HTTP Upload' | 'HTTPS Download' | 'HTTPS Upload' | 'Ping' | 'Voice Call MOC' | 'Detach & Attach';
  serviceTag?: string;
  protocolType?: string[];
  disconnectionMode?: string;
  serverIp?: string;
  port?: number;
  user?: string;
  password?: string;
  connectTimeout?: number;
  remoteFile?: string;
  threadCount?: number;
  testInterval?: number;
  testCount?: number;
  autoScreenshot?: boolean;
  destination?: string;
  packetSize?: number;
  fragmentFlag?: boolean;
  testTimeout?: number;
  initiateNetworkServiceAccess?: boolean;
  autoDelete?: boolean;
  uploadUrl?: string;
  downloadUrl?: string;
  fileSize?: number;
  destinationNumber?: string;
  originateMode?: string;
  callType?: string;
  setupTimeout?: number;
  callDuration?: number;
  exceptionalInterval?: number;
  callMode?: string;
}

const LegendItem = ({ color, label }: { color: string, label: string }) => (
  <div className="flex items-center gap-2">
    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
    <span className="text-[9px] font-medium text-slate-300">{label}</span>
  </div>
);

const DEFAULT_TEST_PLANS: Record<string, TestPlanConfig> = {
  'FTP Download': {
    type: 'FTP Download',
    protocolType: ['FTP'],
    disconnectionMode: 'Keep Connected',
    serverIp: '10.106.153.106',
    port: 21,
    user: 'DT8',
    password: '••••••',
    connectTimeout: 60,
    testTimeout: 60,
    remoteFile: '/DL/1GB.rar',
    threadCount: 10,
    testInterval: 10,
    testCount: 1,
    autoScreenshot: false
  },
  'FTP Upload': {
    type: 'FTP Upload',
    protocolType: ['FTP'],
    disconnectionMode: 'Keep Connected',
    serverIp: '10.106.153.106',
    port: 21,
    user: 'DT8',
    password: '••••••',
    autoDelete: false,
    connectTimeout: 60,
    testTimeout: 60,
    uploadUrl: '/UL',
    fileSize: 204080,
    threadCount: 10,
    testInterval: 15,
    autoScreenshot: false
  },
  'HTTP Download': {
    type: 'HTTP Download',
    protocolType: ['HTTP'],
    disconnectionMode: 'Keep Connected',
    downloadUrl: 'http://speedtest.tele2.net/1GB.zip',
    connectTimeout: 60,
    testTimeout: 60,
    threadCount: 5,
    testInterval: 10,
    testCount: 1,
    autoScreenshot: false
  },
  'HTTP Upload': {
    type: 'HTTP Upload',
    protocolType: ['HTTP'],
    disconnectionMode: 'Keep Connected',
    uploadUrl: 'http://speedtest.tele2.net/upload.php',
    fileSize: 204080,
    connectTimeout: 60,
    testTimeout: 60,
    threadCount: 5,
    testInterval: 15,
    autoScreenshot: false
  },
  'HTTPS Download': {
    type: 'HTTPS Download',
    protocolType: ['HTTPS'],
    disconnectionMode: 'Keep Connected',
    downloadUrl: 'https://speed.hetzner.de/100MB.bin',
    connectTimeout: 60,
    testTimeout: 60,
    threadCount: 5,
    testInterval: 10,
    testCount: 1,
    autoScreenshot: false
  },
  'HTTPS Upload': {
    type: 'HTTPS Upload',
    protocolType: ['HTTPS'],
    disconnectionMode: 'Keep Connected',
    uploadUrl: 'https://myspeedtestserver.com/upload',
    fileSize: 204080,
    connectTimeout: 60,
    testTimeout: 60,
    threadCount: 5,
    testInterval: 15,
    autoScreenshot: false
  },
  'Ping': {
    type: 'Ping',
    serviceTag: '',
    protocolType: ['IPv4'],
    destination: '10.106.153.107',
    packetSize: 32,
    fragmentFlag: true,
    testTimeout: 1,
    testInterval: 1000,
    testCount: 5,
    autoScreenshot: true,
    initiateNetworkServiceAccess: false
  },
  'Voice Call MOC': {
    type: 'Voice Call MOC',
    serviceTag: '',
    destinationNumber: '99999',
    originateMode: 'LTE',
    callType: 'Call by Call',
    setupTimeout: 45,
    callDuration: 15,
    testInterval: 5,
    exceptionalInterval: 20,
    callMode: 'Finite',
    testCount: 5,
    autoScreenshot: false,
    initiateNetworkServiceAccess: false
  },
  'Detach & Attach': {
    type: 'Detach & Attach',
    serviceTag: '',
    testInterval: 15,
    testCount: 5,
    autoScreenshot: true
  }
};

const validateTestPlan = (plan: TestPlanConfig | null): string[] => {
  if (!plan) return ["No test plan configuration found."];
  const errors: string[] = [];
  
  if (!plan.type) errors.push("Test type is required.");

  if (plan.port !== undefined && (plan.port < 1 || plan.port > 65535)) {
    errors.push("Port must be between 1 and 65535.");
  }

  if (plan.connectTimeout !== undefined && plan.connectTimeout <= 0) {
    errors.push("Connect Timeout must be greater than 0.");
  }

  if (plan.testTimeout !== undefined && plan.testTimeout <= 0) {
    errors.push("Test Timeout must be greater than 0.");
  }

  if (plan.threadCount !== undefined && (plan.threadCount < 1 || plan.threadCount > 100)) {
    errors.push("Thread Count must be between 1 and 100.");
  }

  if (plan.testInterval !== undefined && plan.testInterval < 0) {
    errors.push("Test Interval cannot be negative.");
  }

  if (plan.testCount !== undefined && plan.testCount < 1) {
    errors.push("Test Count must be at least 1.");
  }

  if (plan.fileSize !== undefined && plan.fileSize <= 0) {
    errors.push("File Size must be greater than 0 KB.");
  }

  // --- Type Specific Validations ---

  if (plan.type === 'Voice Call MOC') {
    if (!plan.destinationNumber || plan.destinationNumber.trim() === '') {
      errors.push("Destination Number is required for Voice Call.");
    }
    if (plan.setupTimeout !== undefined && plan.setupTimeout <= 0) {
      errors.push("Setup Timeout must be greater than 0.");
    }
    if (plan.callDuration !== undefined && plan.callDuration <= 0) {
      errors.push("Call Duration must be greater than 0.");
    }
  }

  if (['HTTP Download', 'HTTPS Download'].includes(plan.type)) {
    if (!plan.downloadUrl || plan.downloadUrl.trim() === '') {
      errors.push("Download URL is required.");
    }
  }

  if (['HTTP Upload', 'HTTPS Upload'].includes(plan.type)) {
    if (!plan.uploadUrl || plan.uploadUrl.trim() === '') {
      errors.push("Upload URL is required.");
    }
  }

  if (plan.type === 'Ping') {
    if (!plan.destination || plan.destination.trim() === '') {
      errors.push("Destination IP/Host is required for Ping test.");
    }
    if (plan.packetSize !== undefined && (plan.packetSize < 1 || plan.packetSize > 65500)) {
      errors.push("Ping packet size must be between 1 and 65500.");
    }
  }

  if (['FTP Download', 'FTP Upload'].includes(plan.type)) {
    if (!plan.serverIp || plan.serverIp.trim() === '') {
      errors.push("FTP Server IP/Host is required.");
    }
    if (!plan.user || plan.user.trim() === '') {
      errors.push("FTP Username is required.");
    }
    if (!plan.password || plan.password.trim() === '') {
      errors.push("FTP Password is required.");
    }
    if (plan.type === 'FTP Download' && (!plan.remoteFile || plan.remoteFile.trim() === '')) {
      errors.push("Remote File path is required for FTP Download.");
    }
  }

  return errors;
};

const MapInstanceFetcher = ({ setMap }: { setMap: (map: L.Map) => void }) => {
  const map = useMap();
  useEffect(() => {
    setMap(map);
  }, [map, setMap]);
  return null;
};

export default function App() {

  const [nrParams, setNrParams] = useState(generateNRParams());
  const [lteParams, setLteParams] = useState(generateLTEParams());
  const [wcdmaParams, setWcdmaParams] = useState({ uarfcn: 10700, rscp: -80, psc: 42, ecio: -10, cellId: 29384, rrcState: 'IDLE' });
  const [gsmParams, setGsmParams] = useState({ arfcn: 128, rxLev: -75, bsic: 6, timingAdvance: 2, cellId: 19283, rrcState: 'IDLE' });
  const [isTestRunning, setIsTestRunning] = useState(false);
  
  // Licensing & Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [isUserDisabled, setIsUserDisabled] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [licenseKey, setLicenseKey] = useState(localStorage.getItem('license_key') || '');
  const [licenseExpiry, setLicenseExpiry] = useState<number | null>(null);
  const [isLicenseValid, setIsLicenseValid] = useState(true);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Track user activity
        trackUser(u);

        // Check if user is admin or disabled
        const userRef = doc(db, 'users', u.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setIsAdmin(data.isAdmin || u.email === 'a.essalih.org@gmail.com');
          setIsUserDisabled(data.isDisabled || false);
        } else if (u.email === 'a.essalih.org@gmail.com') {
          setIsAdmin(true);
        }
      } else {
        setIsAdmin(false);
        setIsUserDisabled(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Generate/Retrieve Device Identity
    let storedId = localStorage.getItem('device_fingerprint');
    if (!storedId) {
      const entropy = navigator.userAgent + screen.width + screen.height + Math.random().toString(36).substring(2);
      storedId = 'NT-' + btoa(entropy).substring(0, 16).toUpperCase();
      localStorage.setItem('device_fingerprint', storedId);
    }
    setDeviceId(storedId);

    // Validate current license if exists
    if (licenseKey) {
      validateLicense(licenseKey, storedId);
    } else {
      // Temporary: allow access even without key
      setIsLicenseValid(true);
    }
  }, [licenseKey]);

  const validateLicense = (key: string, id: string) => {
    /* 
       ADMIN LICENSE GENERATOR (Node.js / Browser Console):
       const generateKey = (deviceId, expiryDays = 365) => {
         const expiry = Date.now() + (expiryDays * 24 * 60 * 60 * 1000);
         const raw = `${deviceId}|${expiry}|NTS-2025`;
         return btoa(raw); // This is your License Serial
       };
    */
    // Temporary: Always valid
    setIsLicenseValid(true);
    return true;
    
    /* Original validation logic preserved for reference
    try {
      // Logic: License format is "XXXX-XXXX-XXXX-XXXX" (Simplified Base64 of ID + Expiry)
      // This is a simulation of a hard-to-crack local validation
      const decoded = atob(key);
      const [keyId, expiryStr, Salt] = decoded.split('|');
      
      if (keyId === id && Salt === 'NTS-2025') {
        const expiryDate = parseInt(expiryStr);
        if (expiryDate > Date.now()) {
          setIsLicenseValid(true);
          setLicenseExpiry(expiryDate);
          localStorage.setItem('license_key', key);
          return true;
        }
      }
    } catch (e) {
      // Invalid format
    }
    setIsLicenseValid(false);
    setLicenseExpiry(null);
    return false;
    */
  };

  useEffect(() => {
    // Check WebGL support
    const isWebGLSupported = () => {
      try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
      } catch (e) {
        return false;
      }
    };

    if (!isWebGLSupported()) {
      setMapError(true);
      setToastMessage({ 
        title: 'Compatibility Note', 
        message: 'WebGL is limited here. Use "Basic Map" for 2D mode.', 
        type: 'exit' 
      });
      setTimeout(() => setToastMessage(null), 6000);
    }
  }, []);

  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [isTraceConfigOpen, setIsTraceConfigOpen] = useState(false);
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [traceParameter, setTraceParameter] = useState<'NR RSRP' | 'NR SINR' | 'NR PCI' | 'LTE RSRP' | 'LTE SINR' | 'LTE PCI'>('NR RSRP');
  const [traceHistory, setTraceHistory] = useState<{lng: number, lat: number, value: number, tech: string}[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const [testProgress, setTestProgress] = useState(0);
  const [currentSectorIdx, setCurrentSectorIdx] = useState(0);
  const [completedSectors, setCompletedSectors] = useState<number[]>([]);

  // Task & Firebase Sync Logic
  const toggleTest = async (isRunning: boolean, scriptId: string, scriptLabel: string, mode: 'mobility' | 'stationary' | null) => {
    const nextRunning = !isRunning;
    
    if (nextRunning) {
      if (isUserDisabled) {
        setToastMessage({ title: 'Access Denied', message: 'Your account has been disabled by an admin.', type: 'exit' });
        setTimeout(() => setToastMessage(null), 3000);
        return;
      }
      // Starting a new test
      const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      setCurrentReportId(reportId);
      setTestResults([]); // Reset results for new test
      logDataRef.current = []; // Clear raw log data buffer
      
      // Initialize report in Firestore
      if (mode && user) {
        setIsSyncing(true);
        const success = await saveSiteReport(reportId, mode === 'mobility' ? 'mobility' : 'stationary');
        if (!success) {
           setCurrentReportId(null);
           setToastMessage({ title: 'Sync Error', message: 'Unauthorized entry. Please sign in.', type: 'exit' });
           setTimeout(() => setToastMessage(null), 3000);
        }
        setIsSyncing(false);
      } else if (mode && !user) {
        setToastMessage({ title: 'Offline Mode', message: 'Data not syncing. Please Login first.', type: 'enter' });
        setTimeout(() => setToastMessage(null), 3000);
      }
      
      setScriptStatuses(prev => ({ ...prev, [scriptId]: 'Running' }));
      setIsTestRunning(true);
      setActiveTask({ id: scriptId, name: scriptLabel, type: mode });
    } else {
      // Stopping a test
      setScriptStatuses(prev => ({ ...prev, [scriptId]: 'Completed' }));
      setIsTestRunning(false);
      setActiveTask(null);
      // Wait a moment then clear report ID to stop syncing
      setTimeout(() => {
        setCurrentReportId(null);
        setCompletedTestInfo({ id: scriptId, name: scriptLabel });
        setShowTestCompletionModal(true);
      }, 2000);
    }
  };

  // Task Management State
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [isolatedCell, setIsolatedCell] = useState<{ pci: string | number, cellId: string | number, siteName: string, tech: 'NR' | 'LTE' } | null>(null);
  const [isNativeMode, setIsNativeMode] = useState(false);
  const [testMode, setTestMode] = useState<'mobility' | 'stationary' | null>(null);
  const [stationarySectors, setStationarySectors] = useState<{
    id: string, 
    azimuth: string, 
    uid: string,
    duration: number,
    frequency: number,
    bandwidth: number,
    nrRsrpThreshold: number,
    nrSinrThreshold: number,
    lteRsrpThreshold: number,
    lteSinrThreshold: number,
    nrArfcn?: number,
    earfcn?: number,
    pci?: number,
    cellId?: number,
    testPlan?: TestPlanConfig
  }[]>(() => {
    const saved = localStorage.getItem('stationarySectors');
    return saved ? JSON.parse(saved) : [
      { id: 'Alpha', azimuth: '0', uid: 'sec-1', duration: 60, frequency: 3500, bandwidth: 100, nrRsrpThreshold: -90, nrSinrThreshold: 15, lteRsrpThreshold: -100, lteSinrThreshold: 10, nrArfcn: 633334, earfcn: 1650, pci: 101, cellId: 1 },
      { id: 'Beta', azimuth: '120', uid: 'sec-2', duration: 60, frequency: 3500, bandwidth: 100, nrRsrpThreshold: -90, nrSinrThreshold: 15, lteRsrpThreshold: -100, lteSinrThreshold: 10, nrArfcn: 633334, earfcn: 1650, pci: 102, cellId: 2 },
      { id: 'Gamma', azimuth: '240', uid: 'sec-3', duration: 60, frequency: 3500, bandwidth: 100, nrRsrpThreshold: -90, nrSinrThreshold: 15, lteRsrpThreshold: -100, lteSinrThreshold: 10, nrArfcn: 633334, earfcn: 1650, pci: 103, cellId: 3 }
    ];
  });
  const [editingSectorIdx, setEditingSectorIdx] = useState<number | null>(null);
  const [editingTestPlanIdx, setEditingTestPlanIdx] = useState<number | null>(null);
  const [editingScriptConfigId, setEditingScriptConfigId] = useState<string | null>(null);
  const [scriptConfigs, setScriptConfigs] = useState<Record<string, any>>(() => {
    const saved = localStorage.getItem('scriptConfigs');
    if (saved) return JSON.parse(saved);
    
    const configs: Record<string, any> = {};
    [...mobilityScripts, ...stationaryScripts].forEach(s => {
      if (s.id.includes('dl')) configs[s.id] = { ...DEFAULT_TEST_PLANS['FTP Download'] };
      else if (s.id.includes('ul')) configs[s.id] = { ...DEFAULT_TEST_PLANS['FTP Upload'] };
      else if (s.id.includes('voice')) configs[s.id] = { ...DEFAULT_TEST_PLANS['Voice Call MOC'] };
      else if (s.id.includes('ping')) configs[s.id] = { ...DEFAULT_TEST_PLANS['Ping'] };
      else configs[s.id] = { ...DEFAULT_TEST_PLANS['Detach & Attach'] };
    });
    return configs;
  });
  const [testResults, setTestResults] = useState<any[]>([]);
  const [graphMode, setGraphMode] = useState<'Signal' | 'Throughput' | 'Latency' | 'Events'>('Signal');
  const [activeTask, setActiveTask] = useState<any | null>(null);

  useEffect(() => {
    if (isTestRunning && activeTask) {
      const name = activeTask.name.toLowerCase();
      if (name.includes('dl') || name.includes('ul') || name.includes('download') || name.includes('upload') || name.includes('ftp') || name.includes('http')) {
        setGraphMode('Throughput');
      } else if (name.includes('ping')) {
        setGraphMode('Latency');
      } else if (name.includes('voice') || name.includes('detach') || name.includes('attach')) {
        setGraphMode('Events');
      } else {
        setGraphMode('Throughput');
      }
    } else if (!isTestRunning) {
      setGraphMode('Signal');
    }
  }, [isTestRunning, activeTask]);

  const [zoomLeft, setZoomLeft] = useState<string | null>(null);
  const [zoomRight, setZoomRight] = useState<string | null>(null);
  const [zoomDomainLeft, setZoomDomainLeft] = useState<string | null>(null);
  const [zoomDomainRight, setZoomDomainRight] = useState<string | null>(null);
  const [isProtocolSelectorOpen, setIsProtocolSelectorOpen] = useState(false);
  const [isTestTypeSelectorOpen, setIsTestTypeSelectorOpen] = useState(false);
  const [isDisconnectionModeSelectorOpen, setIsDisconnectionModeSelectorOpen] = useState(false);
  const [isOriginateModeSelectorOpen, setIsOriginateModeSelectorOpen] = useState(false);
  const [isCallTypeSelectorOpen, setIsCallTypeSelectorOpen] = useState(false);
  const [isCallModeSelectorOpen, setIsCallModeSelectorOpen] = useState(false);

  const [selectedTestMode, setSelectedTestMode] = useState<'mobility' | 'sector-1' | 'sector-2' | 'sector-3' | null>(null);
  const [scriptStatuses, setScriptStatuses] = useState<Record<string, 'Idle' | 'Running' | 'Completed' | 'Failed'>>({});

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<'tasks' | 'toolbox' | 'frequencies'>('tasks');
  const [showTestCompletionModal, setShowTestCompletionModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isDeleteConfirmed, setIsDeleteConfirmed] = useState(false);
  const [completedTestInfo, setCompletedTestInfo] = useState<{ id: string, name: string } | null>(null);
  const [siteSearchQuery, setSiteSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentSiteSearches');
    return saved ? JSON.parse(saved) : [];
  });

  const addRecentSearch = (query: string) => {
    if (!query || query.trim().length < 2) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, 5);
      localStorage.setItem('recentSiteSearches', JSON.stringify(updated));
      return updated;
    });
  };

  const sortedTestResults = useMemo(() => {
    let sortableItems = [...testResults];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [testResults, sortConfig]);

  const requestSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction: direction as 'asc' | 'desc' });
  };

  useEffect(() => {
    if (selectedTestMode === 'mobility') {
      setTestMode('mobility');
    } else if (selectedTestMode?.startsWith('sector')) {
      setTestMode('stationary');
      const sectorNum = parseInt(selectedTestMode.split('-')[1]);
      setCurrentSectorIdx(sectorNum - 1);
    } else {
      setTestMode(null);
    }
  }, [selectedTestMode]);

  // Geofence & Location State
  const [currentLocation, setCurrentLocation] = useState({ lat: 40.7128, lng: -74.0060 });
  const [routePath, setRoutePath] = useState<number[][]>([]);
  const [geofences, setGeofences] = useState<{ id: string, name: string, lat: number, lng: number, radius: number }[]>([]);
  const [activeGeofences, setActiveGeofences] = useState<string[]>([]);
  const [geofenceLogs, setGeofenceLogs] = useState<{ time: string, name: string, event: 'entered' | 'exited' }[]>([]);
  const [isGeofencesOpen, setIsGeofencesOpen] = useState(false);
  const [isCellInfosOpen, setIsCellInfosOpen] = useState(false);
  const [isMapLightMode, setIsMapLightMode] = useState(false);
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false);
  const [mapLayers, setMapLayers] = useState(() => {
    const saved = localStorage.getItem('mapLayers');
    return saved ? JSON.parse(saved) : {
      satellite: false,
      traffic: false,
      geofences: true,
      sites: true,
      route: true
    };
  });

  const toggleMapLayer = (layerId: string) => {
    setMapLayers(prev => {
      const next = { ...prev, [layerId]: !prev[layerId as keyof typeof prev] };
      localStorage.setItem('mapLayers', JSON.stringify(next));
      return next;
    });
  };
  const [mapLayerOrder, setMapLayerOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('mapLayerOrder');
    return saved ? JSON.parse(saved) : ['satellite', 'traffic', 'geofences', 'sites', 'route'];
  });
  const [mapDisplayOptions, setMapDisplayOptions] = useState(() => {
    const saved = localStorage.getItem('mapDisplayOptions');
    return saved ? JSON.parse(saved) : { siteName: true, pci: true, cellId: true };
  });
  const [newGeofence, setNewGeofence] = useState({ name: '', lat: '', lng: '', radius: '100' });
  const [mapError, setMapError] = useState(false);
  const [mapRetryKey, setMapRetryKey] = useState(0);
  const [useBasicMap, setUseBasicMap] = useState(false);
  const [leafletMap, setLeafletMap] = useState<L.Map | null>(null);
  const [importedTabLayers, setImportedTabLayers] = useState<{name: string, visible: boolean, data: any}[]>([]);

  const handleTabImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newLayers: {name: string, visible: boolean, data: any}[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        
        if (lines.length < 2) continue;

        let separator = '\t';
        let headers = lines[0].split('\t');
        if (headers.length < 2) {
          headers = lines[0].split(',');
          separator = ',';
        }

        const latIdx = headers.findIndex(h => /lat|latitude/i.test(h.trim()));
        const lngIdx = headers.findIndex(h => /lon|lng|long|longitude/i.test(h.trim()));

        if (latIdx === -1 || lngIdx === -1) continue;

        const points: any[] = [];
        const features = lines.slice(1).map((line, idx) => {
          const cells = line.split(separator);
          const lat = parseFloat(cells[latIdx]);
          const lng = parseFloat(cells[lngIdx]);
          
          if (isNaN(lat) || isNaN(lng)) return null;

          points.push([lng, lat]);

          const properties: any = {};
          headers.forEach((header, hIdx) => {
            properties[header.trim()] = cells[hIdx]?.trim() || '';
          });

          return {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            properties: {
              ...properties,
              id: `imported-${Date.now()}-${i}-${idx}`
            }
          };
        }).filter(Boolean);

        if (features.length === 0) continue;

        // Add a Trace feature (LineString) if there are multiple points
        if (points.length > 1) {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: points
            },
            properties: {
              type: 'trace',
              name: `${file.name} Trace`
            }
          });
        }

        const geojson = {
          type: 'FeatureCollection',
          features
        };

        newLayers.push({
          name: file.name,
          visible: true,
          data: geojson
        });

      } catch (err) {
        console.error("Error parsing file:", file.name, err);
      }
    }

    if (newLayers.length > 0) {
      setImportedTabLayers(prev => [...prev, ...newLayers]);
      setToastMessage({ 
        title: 'Layers Imported', 
        message: `Successfully loaded ${newLayers.length} files.`, 
        type: 'enter' 
      });
      setTimeout(() => setToastMessage(null), 3000);
      
      // Calculate bounds for all points in new layers
      let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
      let hasValidPoints = false;

      newLayers.forEach(layer => {
        layer.data.features.forEach((f: any) => {
          if (f.geometry.type === 'Point') {
            const [lng, lat] = f.geometry.coordinates;
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
            hasValidPoints = true;
          }
        });
      });

      if (hasValidPoints) {
        const centerLng = (minLng + maxLng) / 2;
        const centerLat = (minLat + maxLat) / 2;

        if (mapRef.current) {
          // MapLibre / MapGL
          if (minLat === maxLat && minLng === maxLng) {
            mapRef.current.flyTo({ center: [centerLng, centerLat], zoom: 14, duration: 2000 });
          } else {
            mapRef.current.fitBounds([
              [minLng, minLat],
              [maxLng, maxLat]
            ], { padding: 50, duration: 2000 });
          }
        }
        
        if (leafletMap) {
          // Leaflet
          if (minLat === maxLat && minLng === maxLng) {
            leafletMap.flyTo([centerLat, centerLng], 14, { duration: 2 });
          } else {
            leafletMap.flyToBounds([
              [minLat, minLng],
              [maxLat, maxLng]
            ], { padding: [50, 50], duration: 2 });
          }
        }
      }
    }

    e.target.value = '';
  };
  const [toastMessage, setToastMessage] = useState<{title: string, message: string, type: 'enter' | 'exit'} | null>(null);

  const [customTestPlans, setCustomTestPlans] = useState<Record<string, TestPlanConfig>>(() => {
    const saved = localStorage.getItem('customTestPlans');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('customTestPlans', JSON.stringify(customTestPlans));
  }, [customTestPlans]);

  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [isLoadTemplateModalOpen, setIsLoadTemplateModalOpen] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState('');

  const locateUser = () => {
    if (navigator.geolocation) {
      setToastMessage({ title: 'Location', message: "Requesting high-accuracy location...", type: 'enter' });
      setTimeout(() => setToastMessage(null), 2000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
          if (mapRef.current) {
            mapRef.current.flyTo({ center: [longitude, latitude], zoom: 16, duration: 2000 });
          }
          setToastMessage({ title: 'Location Success', message: `Accuracy: ${position.coords.accuracy.toFixed(1)}m`, type: 'enter' });
          setTimeout(() => setToastMessage(null), 3000);
        },
        (error) => {
          console.error("Error getting location", error);
          let errorMessage = "Could not get your location.";
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage = "Location access denied. Please check browser permissions.";
          } else if (error.code === error.TIMEOUT) {
            errorMessage = "Location request timed out. Retrying...";
          }
          setToastMessage({ title: 'Location Error', message: errorMessage, type: 'exit' });
          setTimeout(() => setToastMessage(null), 4000);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      setToastMessage({ title: 'Location Error', message: "Geolocation is not supported by this browser.", type: 'exit' });
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  useEffect(() => {
    // Initial location fetch without map flyTo (map might not be ready)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
        }
      );
    }
  }, []);

  // Offline Map State
  const mapRef = useRef<any>(null);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [cachedItemCount, setCachedItemCount] = useState(0);
  const [isAutoCacheEnabled, setIsAutoCacheEnabled] = useState(true);
  const isAutoCacheEnabledRef = useRef(isAutoCacheEnabled);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadPaused, setIsDownloadPaused] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadTotal, setDownloadTotal] = useState(0);
  const [downloadCurrent, setDownloadCurrent] = useState(0);
  const isDownloadPausedRef = useRef(false);
  const isDownloadCancelledRef = useRef(false);

  // Floating Overlay State
  const [isFloatingOverlayOpen, setIsFloatingOverlayOpen] = useState(false);
  const [isFloatingConfigOpen, setIsFloatingConfigOpen] = useState(false);
  const [floatingActiveTechTab, setFloatingActiveTechTab] = useState<'NR' | 'LTE' | 'WCDMA' | 'GSM' | 'ALL'>('ALL');
  
  // Store selected parameters as an array of objects to preserve selection order
  const [orderedFloatingParams, setOrderedFloatingParams] = useState<{tech: string, param: string}[]>([
    { tech: 'NR', param: 'ssRsrp' },
    { tech: 'NR', param: 'ssSinr' },
    { tech: 'LTE', param: 'rsrp' },
    { tech: 'LTE', param: 'sinr' }
  ]);

  const floatingParamsConfig: Record<string, string[]> = {
    'NR': ['ssRsrp', 'ssSinr', 'earfcn', 'pci', 'cellId', 'rrcState', 'band', 'rankIndicator'],
    'LTE': ['rsrp', 'sinr', 'earfcn', 'pci', 'cellId', 'rrcState', 'band', 'rankIndicator'],
    'WCDMA': ['rscp', 'ecio', 'uarfcn', 'psc', 'cellId', 'rrcState'],
    'GSM': ['rxLev', 'arfcn', 'bsic', 'timingAdvance', 'cellId', 'rrcState']
  };

  const toggleFloatingParam = (tech: string, param: string) => {
    setOrderedFloatingParams(prev => {
      const exists = prev.find(p => p.tech === tech && p.param === param);
      if (exists) {
        return prev.filter(p => !(p.tech === tech && p.param === param));
      } else {
        return [...prev, { tech, param }];
      }
    });
  };

  // Logging State
  const [isLogging, setIsLogging] = useState(true);
  const logDataRef = useRef<any[]>([]);
  const isLoggingRef = useRef(isLogging);
  const [chartData, setChartData] = useState<any[]>([]);

  const isTestRunningRef = useRef(isTestRunning);
  const activeTaskRef = useRef(activeTask);
  const testProgressRef = useRef(testProgress);

  useEffect(() => {
    isLoggingRef.current = isLogging;
  }, [isLogging]);

  useEffect(() => {
    isTestRunningRef.current = isTestRunning;
  }, [isTestRunning]);

  useEffect(() => {
    activeTaskRef.current = activeTask;
  }, [activeTask]);

  useEffect(() => {
    testProgressRef.current = testProgress;
  }, [testProgress]);

  const exportLogData = () => {
    if (logDataRef.current.length === 0) {
      alert("No data logged yet.");
      return;
    }
    const dataStr = JSON.stringify(logDataRef.current, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drivetest_log_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToExcel = (scriptId: string) => {
    if (testResults.length === 0) {
      alert("No test data recorded.");
      return;
    }

    const script = [...mobilityScripts, ...stationaryScripts].find(s => s.id === scriptId);
    const fileName = `${script?.label || 'Test'}_Report_${new Date().getTime()}.xlsx`;

    // Prepare data for Excel
    const worksheetData = testResults.map(r => ({
      'Timestamp': r.timestamp,
      'Time': r.time,
      'Phase': r.phase.toUpperCase(),
      '5G RSRP (dBm)': r.ssRsrp,
      '5G SINR (dB)': r.ssSinr,
      '4G RSRP (dBm)': r.rsrp,
      '4G SINR (dB)': r.sinr,
      'DL Speed (Mbps)': r.dl,
      'UL Speed (Mbps)': r.ul,
      'Ping (ms)': r.ping,
      'Latitude': r.lat,
      'Longitude': r.lng,
      'NR Band': r.nrBand,
      'LTE Band': r.lteBand,
      'PCI': r.pci,
      'Cell ID': r.cellId
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Measurements");

    // Add summary sheet
    const avgDl = testResults.filter(r => r.dl > 0).reduce((acc, r) => acc + r.dl, 0) / (testResults.filter(r => r.dl > 0).length || 1);
    const avgUl = testResults.filter(r => r.ul > 0).reduce((acc, r) => acc + r.ul, 0) / (testResults.filter(r => r.ul > 0).length || 1);
    const avgPing = testResults.filter(r => r.ping > 0).reduce((acc, r) => acc + r.ping, 0) / (testResults.filter(r => r.ping > 0).length || 1);

    const summaryData = [
      ['Test Report Summary'],
      ['Test Name', script?.label || 'N/A'],
      ['Date', new Date().toLocaleString()],
      ['Total Samples', testResults.length],
      [''],
      ['Average DL Speed', `${avgDl.toFixed(2)} Mbps`],
      ['Average UL Speed', `${avgUl.toFixed(2)} Mbps`],
      ['Average Ping', `${avgPing.toFixed(2)} ms`],
      [''],
      ['Device', 'Huawei Mate 40 Pro (Simulated)'],
      ['App Version', 'v1.2.0']
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    XLSX.writeFile(workbook, fileName);
  };

  // Refactored update logic to handle both simulated and native data
  const updateTelemetryData = (nr: any, lte: any, wcdma?: any, gsm?: any) => {
    setNrParams(nr);
    setLteParams(lte);
    if (wcdma) setWcdmaParams(wcdma);
    if (gsm) setGsmParams(gsm);

    const timestamp = new Date().toLocaleTimeString([], { hour12: false });

    // Determine active phase
    let activePhase: 'dl' | 'ul' | 'ping' | 'rf' | 'voice' | 'detach' = 'rf';
    const isTestRunningCurrent = isTestRunningRef.current;
    const activeTaskCurrent = activeTaskRef.current;
    const testProgressCurrent = testProgressRef.current;

    if (isTestRunningCurrent && activeTaskCurrent) {
      const name = activeTaskCurrent.name.toLowerCase();
      if (name.includes('dl') || name.includes('download')) {
        activePhase = 'dl';
      } else if (name.includes('ul') || name.includes('upload')) {
        activePhase = 'ul';
      } else if (name.includes('ping')) {
        activePhase = 'ping';
      } else if (name.includes('voice')) {
        activePhase = 'voice';
      } else if (name.includes('detach')) {
        activePhase = 'detach';
      } else {
        // Sequential tests
        if (testProgressCurrent < 33) activePhase = 'dl';
        else if (testProgressCurrent < 66) activePhase = 'ul';
        else activePhase = 'ping';
      }
    }

    const dlVal = activePhase === 'dl' ? (150 + Math.floor(Math.random() * 100)) : 0;
    const ulVal = activePhase === 'ul' ? (40 + Math.floor(Math.random() * 20)) : 0;
    const pingVal = activePhase === 'ping' ? (20 + Math.floor(Math.random() * 10)) : 0;
    const voiceEvents = activePhase === 'voice' ? (Math.random() > 0.8 ? (Math.random() > 0.5 ? 'Call Setup' : 'Call Drop') : 'In Call') : 'Idle';
    const detachEvents = activePhase === 'detach' ? (Math.random() > 0.8 ? 'Detach Req' : (Math.random() > 0.6 ? 'Attach Req' : 'Attached')) : 'Idle';

    setChartData(prev => {
      const newData = [...prev, {
        time: timestamp,
        ssRsrp: nr.ssRsrp,
        ssSinr: nr.ssSinr,
        rsrp: lte.rsrp,
        sinr: lte.sinr,
        dl: dlVal,
        ul: ulVal,
        ping: pingVal,
        voiceEvent: voiceEvents,
        detachEvent: detachEvents,
        phase: activePhase
      }];
      if (newData.length > 30) {
        return newData.slice(newData.length - 30);
      }
      return newData;
    });

    if (isLoggingRef.current) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        time: timestamp,
        ssRsrp: nr.ssRsrp,
        ssSinr: nr.ssSinr,
        rsrp: lte.rsrp,
        sinr: lte.sinr,
        dl: dlVal,
        ul: ulVal,
        ping: pingVal,
        voiceEvent: voiceEvents,
        detachEvent: detachEvents,
        phase: activePhase,
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        nrBand: nr.band,
        lteBand: lte.band,
        pci: nr.pci || lte.pci,
        cellId: nr.cellId || lte.cellId
      };
      logDataRef.current.push(logEntry);
      if (isTestRunningCurrent) {
        setTestResults(prev => [...prev, logEntry]);
        
        // Cloud Sync: Log test result to Firestore if a report is active
        if (currentReportId) {
          setIsSyncing(true);
          logTestResult(currentReportId, logEntry).finally(() => {
            setTimeout(() => setIsSyncing(false), 500);
          });
        }
      }
    }
  };

  // Check for native support and setup telemetry listener
  useEffect(() => {
    if (telemetryService.checkNativeSupport()) {
      setIsNativeMode(true);
      telemetryService.startStreaming();
    }

    const unsubscribe = telemetryService.subscribe((data) => {
      if (isNativeMode) {
        const nr = {
          earfcn: data.nrarfcn || 0,
          ssRsrp: data.ssRsrp || data.rsrp,
          pci: Number(data.pci),
          ssSinr: data.ssSinr || data.sinr,
          cellId: Number(data.cellId),
          rrcState: data.rrcState
        };
        const lte = {
          earfcn: data.earfcn,
          rsrp: data.rsrp,
          pci: Number(data.pci),
          sinr: data.sinr,
          cellId: Number(data.cellId),
          rrcState: data.rrcState
        };
        updateTelemetryData(nr, lte);
      }
    });

    return () => {
      unsubscribe();
      telemetryService.stopStreaming();
    };
  }, [isNativeMode]);

  // Simulation interval (only runs when NOT in native mode)
  useEffect(() => {
    if (isNativeMode) return;

    const interval = setInterval(() => {
      const newNr = generateNRParams();
      const newLte = generateLTEParams();
      const newWcdma = { uarfcn: 10700, rscp: -80 + Math.floor(Math.random() * 10), psc: 42, ecio: -10 + Math.floor(Math.random() * 4), cellId: 29384, rrcState: Math.random() > 0.4 ? 'CONNECTED' : 'IDLE' };
      const newGsm = { arfcn: 128, rxLev: -75 + Math.floor(Math.random() * 10), bsic: 6, timingAdvance: 2, cellId: 19283, rrcState: Math.random() > 0.5 ? 'CONNECTED' : 'IDLE' };
      
      // If a stationary test is running, use the current sector's parameters
      if (isTestRunning && testMode === 'stationary' && stationarySectors[currentSectorIdx]) {
        const sector = stationarySectors[currentSectorIdx];
        if (sector.nrArfcn) newNr.earfcn = sector.nrArfcn;
        if (sector.earfcn) newLte.earfcn = sector.earfcn;
        if (sector.pci) {
          newNr.pci = sector.pci;
          newLte.pci = sector.pci;
        }
        if (sector.cellId) {
          newNr.cellId = sector.cellId;
          newLte.cellId = sector.cellId;
        }
      }

      // If a cell is isolated, force the PCI and CellID to match
      if (isolatedCell) {
        if (isolatedCell.tech === 'NR') {
          newNr.pci = Number(isolatedCell.pci);
          newNr.cellId = Number(isolatedCell.cellId);
          // Also make the signal a bit more stable/better for the isolated cell
          newNr.ssRsrp = -75 - Math.floor(Math.random() * 10);
          newNr.ssSinr = 20 + Math.floor(Math.random() * 5);
        } else {
          newLte.pci = Number(isolatedCell.pci);
          newLte.cellId = Number(isolatedCell.cellId);
          newLte.rsrp = -85 - Math.floor(Math.random() * 10);
          newLte.sinr = 18 + Math.floor(Math.random() * 5);
        }
      }

      // Apply Technology Lock
      if (lockedTechs.length > 0) {
        if (!lockedTechs.includes('5G')) {
          newNr.ssRsrp = -140;
          newNr.ssSinr = -20;
        }
        if (!lockedTechs.includes('4G')) {
          newLte.rsrp = -140;
          newLte.sinr = -20;
        }
        if (!lockedTechs.includes('3G')) {
          newWcdma.rscp = -120;
          newWcdma.ecio = -20;
        }
        if (!lockedTechs.includes('2G')) {
          newGsm.rxLev = -110;
        }
      }

      setNrParams(newNr);
      setLteParams(newLte);
      setWcdmaParams(newWcdma);
      setGsmParams(newGsm);

      updateTelemetryData(newNr, newLte, newWcdma, newGsm);
    }, 1000);

    return () => clearInterval(interval);
  }, [isNativeMode, isolatedCell, isTestRunning, activeTask]);

  // Simulate test progress
  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    if (isTestRunning) {
      progressInterval = setInterval(() => {
        setTestProgress((prev) => {
          const nextProgress = prev + 2;
          return nextProgress >= 100 ? 100 : nextProgress;
        });
        
        // Simulate movement for mobility tests
        if (testMode === 'mobility') {
          setCurrentLocation(prev => {
            const newLat = prev.lat + (Math.random() - 0.5) * 0.001;
            const newLng = prev.lng + (Math.random() - 0.5) * 0.001;
            
            setRoutePath(path => [...path, [newLng, newLat]]);
            
            // Add to trace history (throttle to save performance, though 100ms is fine for simulation)
            setTraceHistory(prevHistory => {
              let value = 0;
              let tech = 'NR';
              
              if (traceParameter === 'NR RSRP') { value = nrParams.ssRsrp; tech = 'NR'; }
              else if (traceParameter === 'NR SINR') { value = nrParams.ssSinr; tech = 'NR'; }
              else if (traceParameter === 'NR PCI') { value = nrParams.pci || 0; tech = 'NR'; }
              else if (traceParameter === 'LTE RSRP') { value = lteParams.rsrp; tech = 'LTE'; }
              else if (traceParameter === 'LTE SINR') { value = lteParams.sinr; tech = 'LTE'; }
              else if (traceParameter === 'LTE PCI') { value = lteParams.pci || 0; tech = 'LTE'; }
              
              const newPoint = { lng: newLng, lat: newLat, value, tech };
              const updated = [...prevHistory, newPoint];
              // Keep last 1000 points
              return updated.slice(-1000);
            });

            return { lat: newLat, lng: newLng };
          });
        }
      }, 100);
    }
    return () => clearInterval(progressInterval);
  }, [isTestRunning, testMode]);

  useEffect(() => {
    if (testProgress >= 100 && isTestRunning) {
      if (testMode === 'stationary') {
        if (currentSectorIdx < stationarySectors.length - 1) {
          setCompletedSectors(prev => [...prev, currentSectorIdx]);
          setCurrentSectorIdx(prev => prev + 1);
          setTestProgress(0);
        } else {
          setCompletedSectors([]);
          setCurrentSectorIdx(0);
          setTestProgress(0);
        }
      } else {
        setTestProgress(0);
      }
    }
  }, [testProgress, isTestRunning, testMode, currentSectorIdx, stationarySectors.length, activeTask]);

  // Bottom Sheet Animation Values
  // Lock State
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [lockedTechs, setLockedTechs] = useState<string[]>(['4G', '5G']);
  const [lockedBands, setLockedBands] = useState<string[]>([]);
  const [isDataRoamingEnabled, setIsDataRoamingEnabled] = useState(false);
  const [isBandLockingEnabled, setIsBandLockingEnabled] = useState(false);
  const [preferredNetworkType, setPreferredNetworkType] = useState('5G (Recommended)');
  const [terminalLogs, setTerminalLogs] = useState<string[]>(['Modem connected on /dev/ttyUSB2', 'READY']);
  const [isSendingCommand, setIsSendingCommand] = useState(false);
  const [manualAtCommand, setManualAtCommand] = useState('');
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  const handleManualAtCommand = async (e?: React.FormEvent, manualCmd?: string) => {
    if (e) e.preventDefault();
    const cmdToExecute = manualCmd || manualAtCommand;
    if (!cmdToExecute.trim() || isSendingCommand) return;

    const cmd = cmdToExecute.trim().toUpperCase();
    setTerminalLogs(prev => [...prev, `> ${cmd}`]);
    setManualAtCommand('');
    setIsSendingCommand(true);

    // Simulate network delay
    await new Promise(r => setTimeout(r, 400 + Math.random() * 600));

    if (cmd === 'AT' || cmd === 'ATE1' || cmd === 'AT+CPIN?') {
      setTerminalLogs(prev => [...prev, 'OK']);
    } else if (cmd.startsWith('AT+CSQ')) {
      setTerminalLogs(prev => [...prev, '+CSQ: 31,99', 'OK']);
    } else if (cmd === 'AT+COPS=?') {
      setTerminalLogs(prev => [...prev, 'Scanning for networks... (this may take a few seconds)']);
      await new Promise(r => setTimeout(r, 3000));
      setTerminalLogs(prev => [...prev, 
        '+COPS: (2,"Vodafone UK","Voda UK","23415",7),(1,"EE","EE","23430",7),(1,"O2 - UK","O2","23410",7),(1,"Three","Three","23420",11)',
        'OK'
      ]);
    } else if (cmd === 'AT+CGATT=?') {
      setTerminalLogs(prev => [...prev, 'Executing PDP context detach...']);
      await new Promise(r => setTimeout(r, 1500));
      setTerminalLogs(prev => [...prev, '+CGATT: 0', 'Re-attaching to cellular network...']);
      await new Promise(r => setTimeout(r, 2500));
      setTerminalLogs(prev => [...prev, '+CGATT: 1', 'OK']);
    } else if (cmd === 'AT+CGATT=0') {
      setTerminalLogs(prev => [...prev, '+CGATT: 0', 'OK']);
    } else if (cmd === 'AT+CGATT=1') {
      setTerminalLogs(prev => [...prev, '+CGATT: 1', 'OK']);
    } else if (cmd.startsWith('AT+QNWPREFCFG') || cmd.startsWith('AT+QNWLOCK') || cmd.startsWith('AT+CFUN')) {
      setTerminalLogs(prev => [...prev, 'OK']);
    } else {
      setTerminalLogs(prev => [...prev, 'ERROR']);
    }
    setIsSendingCommand(false);
  };
  
  // Settings State
  const [isHistoricalGraphOpen, setIsHistoricalGraphOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [thresholds, setThresholds] = useState(() => {
    const saved = localStorage.getItem('thresholds');
    return saved ? JSON.parse(saved) : {
      nrRsrp: -90,
      nrSinr: 10,
      lteRsrp: -95,
      lteSinr: 8
    };
  });
  
  // Modal Temp State
  const [tempTechs, setTempTechs] = useState<string[]>(['4G', '5G']);
  const [tempBands, setTempBands] = useState<string[]>([]);
  const [tempRoaming, setTempRoaming] = useState(false);
  const [tempBandLockingEnabled, setTempBandLockingEnabled] = useState(false);
  const [tempNetworkType, setTempNetworkType] = useState('');
  const [tempDeviceInterface, setTempDeviceInterface] = useState('Android (ADB/Intent)');
  const [deviceInterface, setDeviceInterface] = useState('Android (ADB/Intent)');
  const [bandSearchQuery, setBandSearchQuery] = useState('');

  // Battery State
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);

  useEffect(() => {
    let batteryManager: any = null;
    
    const updateBattery = () => {
      if (batteryManager) {
        setBatteryLevel(Math.round(batteryManager.level * 100));
        setIsCharging(batteryManager.charging);
      }
    };

    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        batteryManager = battery;
        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
      });
    }

    return () => {
      if (batteryManager) {
        batteryManager.removeEventListener('levelchange', updateBattery);
        batteryManager.removeEventListener('chargingchange', updateBattery);
      }
    };
  }, []);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('stationarySectors', JSON.stringify(stationarySectors));
  }, [stationarySectors]);

  useEffect(() => {
    localStorage.setItem('scriptConfigs', JSON.stringify(scriptConfigs));
  }, [scriptConfigs]);

  useEffect(() => {
    localStorage.setItem('mapLayers', JSON.stringify(mapLayers));
  }, [mapLayers]);

  useEffect(() => {
    localStorage.setItem('mapLayerOrder', JSON.stringify(mapLayerOrder));
  }, [mapLayerOrder]);

  useEffect(() => {
    localStorage.setItem('mapDisplayOptions', JSON.stringify(mapDisplayOptions));
  }, [mapDisplayOptions]);

  useEffect(() => {
    localStorage.setItem('thresholds', JSON.stringify(thresholds));
  }, [thresholds]);

  // --- Offline Map Logic ---
  useEffect(() => {
    isAutoCacheEnabledRef.current = isAutoCacheEnabled;
  }, [isAutoCacheEnabled]);

  useEffect(() => {
    const protocolFn = async (params: any) => {
      const url = params.url;

      const cachedRes = await caches.match(url);
      if (cachedRes) {
        const data = await cachedRes.arrayBuffer();
        return { data, cacheControl: cachedRes.headers.get('Cache-Control') };
      }

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Fetch failed: ${res.statusText}`);
        
        const resClone = res.clone();
        const data = await res.arrayBuffer();
        
        if (isAutoCacheEnabledRef.current) {
          const cache = await caches.open('maplibre-cache');
          await cache.put(url, resClone);
        }
        
        return { data };
      } catch (err) {
        throw err;
      }
    };

    try {
      maplibregl.addProtocol('https', protocolFn as any);
    } catch (e) {
      maplibregl.removeProtocol('https');
      maplibregl.addProtocol('https', protocolFn as any);
    }

    return () => {
      maplibregl.removeProtocol('https');
    };
  }, []);

  const [cachedItemSize, setCachedItemSize] = useState<number>(0);

  const updateCacheCount = async () => {
    try {
      const cache = await caches.open('maplibre-cache');
      const keys = await cache.keys();
      setCachedItemCount(keys.length);
      
      let totalSize = 0;
      // Note: fetching all responses can be slow for many tiles, so we just estimate
      // based on average vector tile size (around 35KB) for performance, 
      // or we can read the content-length headers if needed.
      totalSize = keys.length * 35000; 
      
      setCachedItemSize(totalSize);
    } catch (e) {
      console.error(e);
    }
  };

  const clearCache = async () => {
    await caches.delete('maplibre-cache');
    updateCacheCount();
  };

  const cancelDownload = () => {
    isDownloadCancelledRef.current = true;
    setIsDownloading(false);
    setIsDownloadPaused(false);
    isDownloadPausedRef.current = false;
  };

  const downloadCurrentArea = async () => {
    if (!mapRef.current) return;
    
    if (isDownloading) {
      const nextPaused = !isDownloadPaused;
      setIsDownloadPaused(nextPaused);
      isDownloadPausedRef.current = nextPaused;
      return;
    }

    setIsDownloading(true);
    setIsDownloadPaused(false);
    isDownloadPausedRef.current = false;
    isDownloadCancelledRef.current = false;
    setDownloadProgress(0);
    const map = mapRef.current.getMap();
    const bounds = map.getBounds();
    const currentZoom = Math.floor(map.getZoom());

    const minLng = bounds.getWest();
    const maxLng = bounds.getEast();
    const minLat = bounds.getSouth();
    const maxLat = bounds.getNorth();

    const lon2tile = (lon: number, zoom: number) => (Math.floor((lon + 180) / 360 * Math.pow(2, zoom)));
    const lat2tile = (lat: number, zoom: number) => (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)));

    const urls: string[] = [];
    for (let z = currentZoom; z <= Math.min(currentZoom + 2, 18); z++) {
      const minX = lon2tile(minLng, z);
      const maxX = lon2tile(maxLng, z);
      const minY = lat2tile(maxLat, z);
      const maxY = lat2tile(minLat, z);

      if ((maxX - minX) * (maxY - minY) > 500) continue; // Prevent massive downloads

      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          urls.push(`https://tiles.basemaps.cartocdn.com/vectortiles/carto.streets/v1/${z}/${x}/${y}.mvt`);
        }
      }
    }

    urls.push('https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json');

    const cache = await caches.open('maplibre-cache');
    setDownloadTotal(urls.length);
    setDownloadCurrent(0);

    for (let i = 0; i < urls.length; i++) {
      if (isDownloadCancelledRef.current) break;

      while (isDownloadPausedRef.current) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (isDownloadCancelledRef.current) break;
      }

      if (isDownloadCancelledRef.current) break;

      const url = urls[i];
      try {
        const match = await cache.match(url);
        if (!match) {
          const res = await fetch(url);
          if (res.ok) await cache.put(url, res);
        }
      } catch (e) {
        console.error("Failed to cache", url);
      }
      
      const current = i + 1;
      setDownloadCurrent(current);
      setDownloadProgress(Math.round((current / urls.length) * 100));
    }

    setIsDownloading(false);
    setIsDownloadPaused(false);
    updateCacheCount();
  };

  // Haversine distance in meters
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const dp = (lat2-lat1) * Math.PI/180;
    const dl = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Group sites by SiteName/Location to extract sectors
  const groupedSites = useMemo(() => {
    const groups = new Map();
    sites.forEach(row => {
      const lat = parseFloat(row.Latitude || row.Lat || row.lat || row.latitude);
      const lng = parseFloat(row.Longitude || row.Lon || row.lng || row.longitude || row.Long);
      if (isNaN(lat) || isNaN(lng)) return;

      const pci = row.PCI || row.PhyCellId || row['Physical Cell ID'] || row.CellID || row['Cell ID'];
      const siteName = row['Site Name'] || row.SiteName || row.SiteID || row['Site ID'] || (pci ? `PCI ${pci}` : 'Unknown Site');
      const siteId = row['gNodeB ID'] || row['eNodeB N'] || row.SiteID || row['Site ID'] || row.siteId || '';
      const azimuth = parseFloat(row.Azimuth || row.AZI || row.Dir || row.Direction || row['Antenna Azimuth']);
      const band = row.Band || row.band || row['Frequency Band'] || row.FreqBand || row['Freq band'] || '';
      const frequency = row.EARFCN || row.ARFCN || row.Frequency || row.Freq || row.DL_EARFCN || row.dl_earfcn || row.DL_EARFC || '';
      const cellId = row['Cell ID'] || row.CellID || row.cellId || row.CellId || row.CGI || row.ECGI || '';

      if (!groups.has(siteName)) {
        groups.set(siteName, { siteName, siteId, lat, lng, sectors: [] });
      }
      
      if (!isNaN(azimuth)) {
        const sectorIndex = groups.get(siteName).sectors.length;
        let color = "#3b82f6"; // 1st Sector: Blue
        if (sectorIndex === 1) color = "#ef4444"; // 2nd Sector: Red
        if (sectorIndex === 2) color = "#10b981"; // 3rd Sector: Green
        
        groups.get(siteName).sectors.push({ azimuth, pci, band, frequency, cellId, color, raw: row });
      }
    });
    return Array.from(groups.values());
  }, [sites]);

  useEffect(() => {
    geofences.forEach(fence => {
      const dist = getDistance(currentLocation.lat, currentLocation.lng, fence.lat, fence.lng);
      const isInside = dist <= fence.radius;
      const wasInside = activeGeofences.includes(fence.id);

      if (isInside && !wasInside) {
        setActiveGeofences(prev => [...prev, fence.id]);
        const time = new Date().toLocaleTimeString();
        setGeofenceLogs(prev => [{ time, name: fence.name, event: 'entered' }, ...prev]);
        setToastMessage({ title: 'Geofence Alert', message: `Entered ${fence.name}`, type: 'enter' });
        setTimeout(() => setToastMessage(null), 4000);
      } else if (!isInside && wasInside) {
        setActiveGeofences(prev => prev.filter(id => id !== fence.id));
        const time = new Date().toLocaleTimeString();
        setGeofenceLogs(prev => [{ time, name: fence.name, event: 'exited' }, ...prev]);
        setToastMessage({ title: 'Geofence Alert', message: `Exited ${fence.name}`, type: 'exit' });
        setTimeout(() => setToastMessage(null), 4000);
      }
    });
  }, [currentLocation, geofences, activeGeofences]);

  // Generate GeoJSON for Connections (Serving/Neighbor)
  const connectionsGeoJSON = useMemo(() => {
    if (!currentLocation || groupedSites.length === 0) return { type: 'FeatureCollection', features: [] };

    const sitesWithDist = groupedSites.map(site => ({
      ...site,
      dist: getDistance(currentLocation.lat, currentLocation.lng, site.lat, site.lng)
    })).sort((a, b) => a.dist - b.dist);

    let servingSite = null;
    let neighborSites = [];

    if (isolatedCell) {
      servingSite = sitesWithDist.find(s => s.siteName === isolatedCell.siteName);
      neighborSites = sitesWithDist.filter(s => s.siteName !== isolatedCell.siteName).slice(0, 2);
    } else {
      servingSite = sitesWithDist[0];
      neighborSites = sitesWithDist.slice(1, 3);
    }

    const features = [];

    if (servingSite) {
      features.push({
        type: 'Feature',
        properties: { type: 'serving' },
        geometry: {
          type: 'LineString',
          coordinates: [[servingSite.lng, servingSite.lat], [currentLocation.lng, currentLocation.lat]]
        }
      });
    }

    neighborSites.forEach(site => {
      features.push({
        type: 'Feature',
        properties: { type: 'neighbor' },
        geometry: {
          type: 'LineString',
          coordinates: [[site.lng, site.lat], [currentLocation.lng, currentLocation.lat]]
        }
      });
    });

    return { type: 'FeatureCollection', features };
  }, [currentLocation, groupedSites, isolatedCell]);

  // Generate GeoJSON for Geofences
  const geofenceGeoJSON = {
    type: 'FeatureCollection',
    features: geofences.map(fence => {
      const center = [fence.lng, fence.lat];
      const radius = fence.radius / 1000; // turf circle takes radius in kilometers
      const options = { steps: 64, units: 'kilometers' as const, properties: { id: fence.id, active: activeGeofences.includes(fence.id) } };
      return circle(center, radius, options);
    })
  };

  // Generate GeoJSON for Trace Points (Colored Breadcrumbs)
  const getTraceColor = (value: number, param: string) => {
    if (param.includes('RSRP')) {
      if (value >= -80) return '#10b981'; // Excellent - Emerald
      if (value >= -95) return '#22c55e'; // Good - Green
      if (value >= -110) return '#eab308'; // Fair - Yellow
      return '#ef4444'; // Bad - Red
    }
    if (param.includes('SINR')) {
      if (value >= 15) return '#10b981';
      if (value >= 10) return '#22c55e';
      if (value >= 5) return '#eab308';
      return '#ef4444';
    }
    // For PCI, use a hash-based color or something distinct
    if (param.includes('PCI')) {
      const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4'];
      return colors[Math.abs(value) % colors.length];
    }
    return '#64748b';
  };

  const traceGeoJSON = {
    type: 'FeatureCollection',
    features: traceHistory.map((point, i) => ({
      type: 'Feature',
      properties: { 
        color: getTraceColor(point.value, traceParameter),
        value: point.value,
        tech: point.tech,
        index: i
      },
      geometry: {
        type: 'Point',
        coordinates: [point.lng, point.lat]
      }
    }))
  };

  // Generate GeoJSON for Route Polyline
  const routeGeoJSON = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: routePath
    }
  };

  // Script Editor State
  const [scripts, setScripts] = useState<Record<string, string>>({
    'http_dl': 'URL: http://speedtest.ftp.otenet.gr/files/test100Mb.db\nDuration: 60s\nPause: 5s',
    'ftp_ul': 'Server: ftp.example.com\nFile: 10MB.bin\nPause: 2s',
    'ping': 'Target: 8.8.8.8\nPacketSize: 32\nCount: 100',
    'sector_1': 'Type: DL/UL/Ping\nDuration: 120s',
    'sector_2': 'Type: DL/UL/Ping\nDuration: 120s',
    'sector_3': 'Type: DL/UL/Ping\nDuration: 120s',
    'task_mobility': 'Type: Mobility\nDuration: Continuous\nLog Interval: 1s',
    'task_stationary': 'Type: Stationary\nSectors: 3\nDuration per sector: 120s',
  });
  const [editingScriptId, setEditingScriptId] = useState<string | null>(null);
  const [editingScriptTitle, setEditingScriptTitle] = useState<string>('');
  const [tempScriptContent, setTempScriptContent] = useState('');

  const openScriptEditor = (id: string, title: string) => {
    setEditingScriptId(id);
    setEditingScriptTitle(title);
    setTempScriptContent(scripts[id] || '');
  };

  const saveScript = () => {
    if (editingScriptId) {
      setScripts(prev => ({ ...prev, [editingScriptId]: tempScriptContent }));
    }
    setEditingScriptId(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      // Map data to ensure we have a SiteName field
      const formattedSites = data.map((row: any, index) => ({
        SiteName: row['Site Name'] || row.SiteName || row.Site || row.Name || `Site_${index + 1}`,
        ...row
      }));
      
      setSites(formattedSites);
      if (formattedSites.length > 0) {
        setIsCreateTaskOpen(true);
      }
    };
    reader.readAsBinaryString(file);
  };

  const exportGPSData = () => {
    if (routePath.length === 0) {
      setToastMessage({ title: 'Export Failed', message: "No GPS coordinates collected yet.", type: 'exit' });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const gpsData = routePath.map(([lng, lat], index) => ({
      index,
      latitude: lat,
      longitude: lng,
      timestamp: new Date().toISOString()
    }));

    const blob = new Blob([JSON.stringify(gpsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `drivetest_gps_export_${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToastMessage({ title: 'Export Success', message: `Exported ${routePath.length} coordinates.`, type: 'enter' });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const updateActiveTestPlan = (updates: any) => {
    if (editingTestPlanIdx !== null) {
      const newSectors = [...stationarySectors];
      newSectors[editingTestPlanIdx].testPlan = { ...newSectors[editingTestPlanIdx].testPlan!, ...updates };
      setStationarySectors(newSectors);
    } else if (editingScriptConfigId !== null) {
      setScriptConfigs(prev => ({
        ...prev,
        [editingScriptConfigId]: { ...prev[editingScriptConfigId], ...updates }
      }));
    }
  };

  const closeTestPlanModal = () => {
    setEditingTestPlanIdx(null);
    setEditingScriptConfigId(null);
  };

  const activeTestPlanObj = editingTestPlanIdx !== null 
    ? stationarySectors[editingTestPlanIdx]?.testPlan 
    : (editingScriptConfigId ? scriptConfigs[editingScriptConfigId] : null);

  const activeTestPlanType = activeTestPlanObj?.type || '';

  const openLockModal = () => {
    setTempTechs(lockedTechs.length > 0 ? lockedTechs : ['4G', '5G']);
    setTempBands(lockedBands);
    setTempRoaming(isDataRoamingEnabled);
    setTempBandLockingEnabled(isBandLockingEnabled);
    setTempNetworkType(preferredNetworkType);
    setTempDeviceInterface(deviceInterface);
    setIsLockModalOpen(true);
  };

  const deviceContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex justify-center bg-black min-h-screen font-sans text-slate-200">
      {/* Mobile Device Container */}
      <div ref={deviceContainerRef} className="w-full max-w-md bg-slate-950 h-[100dvh] relative overflow-hidden flex flex-col shadow-2xl shadow-emerald-900/20 border-x border-slate-900">
        
        {/* Floating Overlay Toggle */}
        {!isFloatingOverlayOpen && (
          <motion.button
            drag
            dragConstraints={deviceContainerRef}
            dragMomentum={false}
            className="absolute top-20 right-4 z-[100] w-10 h-10 bg-slate-900/40 backdrop-blur-sm rounded-full border border-slate-700/50 shadow-xl flex items-center justify-center text-slate-300 hover:text-blue-400 cursor-move pointer-events-auto"
            onClick={() => setIsFloatingOverlayOpen(true)}
            title="Open Signal Overlay"
          >
            <Radio className="w-5 h-5 pointer-events-none drop-shadow-md" />
          </motion.button>
        )}

        {/* Floating Overlay Window */}
        {isFloatingOverlayOpen && (
          <motion.div
            drag
            dragConstraints={deviceContainerRef}
            dragMomentum={false}
            dragHandle=".drag-handle"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-20 right-4 z-[100] w-64 bg-slate-950/20 backdrop-blur-md rounded-xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden pointer-events-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-2 cursor-move border-b border-white/5 bg-white/5 drag-handle hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-2 pointer-events-none text-white/90">
                <GripHorizontal className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Monitor</span>
              </div>
              <div className="flex items-center gap-1">
                <button onPointerDown={(e) => { e.stopPropagation(); setIsFloatingConfigOpen(!isFloatingConfigOpen) }} className={`p-1.5 rounded hover:bg-white/10 transition-colors ${isFloatingConfigOpen ? 'text-blue-400' : 'text-white/60'}`}>
                  <Settings2 className="w-3.5 h-3.5 pointer-events-none" />
                </button>
                <button onPointerDown={(e) => { e.stopPropagation(); setIsFloatingOverlayOpen(false) }} className="p-1.5 rounded hover:bg-white/10 text-white/60 transition-colors">
                  <Minus className="w-3.5 h-3.5 pointer-events-none" />
                </button>
              </div>
            </div>

            {/* Config Window */}
            {isFloatingConfigOpen ? (
              <div className="p-3 max-h-64 overflow-y-auto bg-slate-950/40">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Available Params</h4>
                </div>
                {Object.entries(floatingParamsConfig).map(([tech, params]) => (
                  <div key={tech} className="mb-4 last:mb-0">
                    <div className="text-[10px] font-bold text-white/70 mb-1.5 border-b border-white/10 pb-0.5">
                       {tech}
                    </div>
                    <div className="grid grid-cols-1 gap-0.5">
                      {params.map(param => {
                        const isSelected = orderedFloatingParams.some(p => p.tech === tech && p.param === param);
                        return (
                          <div key={param} className="flex justify-between items-center text-xs text-white/50 pl-2 pr-1 py-0.5 hover:bg-white/5 rounded transition-colors group">
                            <span className="group-hover:text-white/80">{param}</span>
                            <button 
                              onPointerDown={() => toggleFloatingParam(tech, param)}
                              className={`p-0.5 rounded transition-colors ${isSelected ? 'text-red-400' : 'text-emerald-400 hover:text-emerald-300'}`}
                            >
                              {isSelected ? <X className="w-3.5 h-3.5 pointer-events-none" /> : <Plus className="w-3.5 h-3.5 pointer-events-none" />}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
                
                <button
                  onPointerDown={() => setIsFloatingConfigOpen(false)}
                  className="w-full mt-4 py-2 bg-blue-600/60 hover:bg-blue-500/80 text-white rounded text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="flex flex-col bg-slate-950/20">
                {/* Tech Tabs */}
                {orderedFloatingParams.length > 0 && (
                  <div className="flex border-b border-white/5 px-2 py-1 gap-1 overflow-x-auto scrollbar-hide bg-white/5">
                    {['ALL', 'NR', 'LTE', 'WCDMA', 'GSM'].map((tech) => {
                      const techSelected = tech === 'ALL' 
                        ? orderedFloatingParams.length > 0 
                        : orderedFloatingParams.some(p => p.tech === tech);
                      
                      if (!techSelected) return null;

                      const isActive = floatingActiveTechTab === tech;
                      return (
                        <button
                          key={tech}
                          onPointerDown={() => setFloatingActiveTechTab(tech as any)}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter transition-all whitespace-nowrap ${
                            isActive 
                              ? 'bg-blue-500/80 text-white shadow-sm' 
                              : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                          }`}
                        >
                          {tech}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="p-2.5 flex flex-col gap-2 max-h-64 overflow-y-auto w-full box-border">
                  {orderedFloatingParams.length > 0 ? (
                    <div className="grid grid-cols-2 gap-y-2 gap-x-3">
                      {orderedFloatingParams
                        .filter(p => floatingActiveTechTab === 'ALL' || p.tech === floatingActiveTechTab)
                        .map(({ tech, param }, idx) => {
                          const dataMap = { NR: nrParams, LTE: lteParams, WCDMA: wcdmaParams, GSM: gsmParams };
                          const val = (dataMap as any)[tech]?.[param];
                          
                          return (
                            <div key={`${tech}-${param}-${idx}`} className="flex flex-col">
                              <div className="flex items-center gap-1 mb-0.5">
                                <span className="text-[8px] font-bold text-white/20 uppercase tracking-tighter">{tech}</span>
                                <span className="text-[9px] text-white/50 capitalize truncate flex-1">{param}</span>
                              </div>
                              <span className="font-mono text-xs text-emerald-400 font-black drop-shadow-md">
                                {val !== undefined ? val : '-'}
                              </span>
                            </div>
                          );
                        })
                      }
                    </div>
                  ) : (
                    <div className="text-[10px] text-white/30 text-center py-8 flex flex-col items-center gap-3">
                      <div className="p-2 rounded-full bg-white/5">
                        <Settings className="w-5 h-5 opacity-20" />
                      </div>
                      <span>Configure specific parameters</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
        
        {/* Header */}
        <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between z-10 w-full overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-3 shrink-0 mr-4">
            {/* Battery Indicator */}
            {batteryLevel !== null && (
              <div 
                className={`flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  isCharging ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 
                  batteryLevel <= 20 ? 'text-red-400 bg-red-500/10 border-red-500/20' : 
                  'text-slate-400 bg-slate-800/50 border-slate-700'
                }`}
                title={isCharging ? 'Charging' : 'Battery Level'}
              >
                {isCharging ? <BatteryCharging className="w-3 h-3" /> : (
                  batteryLevel > 80 ? <BatteryFull className="w-3 h-3" /> :
                  batteryLevel > 30 ? <BatteryMedium className="w-3 h-3" /> :
                  batteryLevel > 10 ? <BatteryLow className="w-3 h-3" /> :
                  <BatteryWarning className="w-3 h-3 text-red-500 animate-pulse" />
                )}
                <span>{batteryLevel}%</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Map Trace Config Button */}
            <button
              onClick={() => setIsTraceConfigOpen(true)}
              title="Map Trace Settings"
              className={`p-1 flex items-center justify-center rounded border transition-colors ${
                isTraceConfigOpen ? 'bg-blue-500 border-blue-400 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
            </button>

            {/* Lock Button */}
            <button
              onClick={openLockModal}
              title={isBandLockingEnabled ? "Band Locking Active" : "Network Configuration"}
              className={`p-1 flex items-center justify-center rounded border transition-colors ${
                isBandLockingEnabled 
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' 
                  : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {isBandLockingEnabled ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>

            {/* Network Type Indicator */}
            <div className={`flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-1 rounded border ${
              isBandLockingEnabled 
                ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' 
                : 'text-blue-400 bg-blue-500/10 border-blue-500/20'
            }`}>
              <SignalHigh className="w-3 h-3" />
              {isBandLockingEnabled ? `${lockedTechs.join('+')}${lockedBands.length > 0 ? ` (${lockedBands.length})` : ''}` : '5G NSA'}
            </div>
            {/* Roaming Indicator */}
            {isDataRoamingEnabled && (
              <div className="flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-1 rounded border text-orange-400 bg-orange-500/10 border-orange-500/20">
                <Globe className="w-3 h-3" />
                ROAMING
              </div>
            )}
            {/* Geofences Button */}
            <button
              onClick={() => setIsGeofencesOpen(true)}
              className="p-1 flex items-center justify-center rounded border bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
              title="Geofences"
            >
              <MapPin className="w-3.5 h-3.5" />
            </button>
            {/* Cell Infos Button */}
            <button
              onClick={() => setIsCellInfosOpen(true)}
              className="p-1 flex items-center justify-center rounded border bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
              title="Cell Infos"
            >
              <Signal className="w-3.5 h-3.5" />
            </button>
            {/* Export Log Button */}
            <button
              onClick={exportLogData}
              className="p-1 flex items-center justify-center rounded border bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
              title="Export Log Data"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            {/* Help & License Button */}
            <button
              onClick={() => setIsHelpModalOpen(true)}
              className={`p-1 flex items-center justify-center rounded border transition-colors ${
                isLicenseValid 
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/30' 
                  : 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse'
              }`}
              title="Help & License"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>

            {/* Force Location Button */}
            <button
              onClick={locateUser}
              className="p-1 flex items-center justify-center rounded border bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/30 transition-colors"
              title="Force Location Access"
            >
              <LocateFixed className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Main Interface Area: Map Backdrop + Draggable Bottom Sheet */}
        <div className="flex-1 relative overflow-hidden bg-slate-950">
          
          {/* --- Map Layer (Base) --- */}
          <div className="absolute inset-0 z-0 sm:pb-0">
            <div className="relative w-full h-full bg-slate-900 flex items-center justify-center">
          {/* Floating Map Layers Panel */}
          <div className="absolute top-4 right-4 z-30 flex flex-col items-end gap-2">
            <button 
              onClick={() => setIsLayersPanelOpen(!isLayersPanelOpen)}
              className={`p-2 rounded-lg border shadow-xl transition-all flex items-center gap-2 ${
                isLayersPanelOpen 
                  ? 'bg-blue-600 border-blue-500 text-white' 
                  : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Map Layers</span>
            </button>

            <AnimatePresence>
              {isLayersPanelOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="w-64 bg-slate-900/95 border border-slate-700 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md"
                >
                  <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Interface Settings</span>
                    <button onClick={() => setIsLayersPanelOpen(false)}>
                      <X className="w-3 h-3 text-slate-500 hover:text-white" />
                    </button>
                  </div>
                  
                  <div className="p-4 flex flex-col gap-4">
                    {/* Visual Layers */}
                    <div className="space-y-2">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter mb-2">Display Layers</p>
                      {[
                        { id: 'satellite', label: 'Satellite', icon: Globe },
                        { id: 'traffic', label: 'Real-time Traffic', icon: Activity },
                        { id: 'sites', label: 'Radio Sites', icon: MapPin },
                        { id: 'geofences', label: 'Geofences', icon: ShieldCheck },
                        { id: 'route', label: 'Movement Path', icon: Navigation },
                      ].map(layer => (
                        <button 
                          key={layer.id}
                          onClick={() => toggleMapLayer(layer.id)}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg border transition-all ${
                            mapLayers[layer.id as keyof typeof mapLayers]
                              ? 'bg-blue-600/10 border-blue-500/50 text-blue-400'
                              : 'bg-slate-950/50 border-slate-800/50 text-slate-500 hover:bg-slate-800'
                          }`}
                        >
                          <layer.icon className={`w-3.5 h-3.5 ${mapLayers[layer.id as keyof typeof mapLayers] ? 'text-blue-400' : 'text-slate-600'}`} />
                          <span className="text-[11px] font-medium flex-1 text-left">{layer.label}</span>
                          {mapLayers[layer.id as keyof typeof mapLayers] && <CheckCircle2 className="w-3 h-3" />}
                        </button>
                      ))}
                    </div>

                    {/* Offline Management */}
                    <div className="pt-4 border-t border-slate-800 space-y-3">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Offline Cache</p>
                      <div className="flex justify-between items-center px-1">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 font-bold">{cachedItemCount} Tiles Cached</span>
                          <span className="text-[9px] text-slate-600">~{(cachedItemSize / 1024 / 1024).toFixed(1)} MB</span>
                        </div>
                        <button 
                          onClick={clearCache}
                          className="p-1.5 bg-red-900/20 hover:bg-red-500 text-red-500 hover:text-white rounded transition-all border border-red-900/30"
                          title="Clear Cache"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {isDownloading ? (
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-blue-400">{downloadProgress}%</span>
                            <span className="text-slate-500">{downloadCurrent}/{downloadTotal}</span>
                          </div>
                          <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${downloadProgress}%` }} />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={downloadCurrentArea} className="flex-1 py-1 bg-slate-800 text-[9px] font-bold uppercase rounded">
                              {isDownloadPaused ? 'Resume' : 'Pause'}
                            </button>
                            <button onClick={cancelDownload} className="flex-1 py-1 bg-red-900/20 text-red-500 text-[9px] font-bold uppercase rounded border border-red-900/30">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => { updateCacheCount(); downloadCurrentArea(); }}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                          <DownloadCloud className="w-3.5 h-3.5" />
                          Offline Current View
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {mapError ? (
            <div className="flex flex-col items-center justify-center text-slate-500 gap-3 p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-1">
                <MapPin className="w-6 h-6 opacity-40 text-red-500" />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-slate-300">Map display is temporarily unavailable</p>
                <p className="text-[10px] text-slate-500">(WebGL context blocked or unsupported in this environment)</p>
              </div>
              <div className="flex gap-2 mt-2">
                <button 
                  onClick={() => {
                    setMapError(false);
                    setMapRetryKey(prev => prev + 1);
                    setToastMessage({ title: 'Retrying', message: 'Attempting to re-initialize map...', type: 'enter' });
                    setTimeout(() => setToastMessage(null), 2000);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded border border-slate-700 transition-all uppercase tracking-wider"
                >
                  Retry Load
                </button>
                <button 
                  onClick={() => {
                    setMapError(false);
                    setUseBasicMap(true);
                    setToastMessage({ title: 'Basic Map', message: 'Switched to 2D fallback map.', type: 'enter' });
                    setTimeout(() => setToastMessage(null), 3000);
                  }}
                  className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-[10px] font-bold rounded border border-emerald-500/30 transition-all uppercase tracking-wider"
                >
                  Use Basic Map
                </button>
                <button 
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[10px] font-bold rounded border border-blue-500/30 transition-all uppercase tracking-wider"
                >
                  Open in New Tab
                </button>
              </div>
            </div>
          ) : useBasicMap ? (
            <div className="w-full h-full relative z-0">
               <MapContainer 
                  center={[currentLocation.lat, currentLocation.lng]} 
                  zoom={13} 
                  style={{ height: '100%', width: '100%', background: '#0f172a' }}
                  zoomControl={false}
               >
                 <MapInstanceFetcher setMap={setLeafletMap} />
                 {mapLayers.satellite ? (
                   <TileLayer
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                    />
                 ) : (
                   <TileLayer
                      url={isMapLightMode 
                        ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"}
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                 )}
                 {mapLayers.traffic && (
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      opacity={0.3}
                      attribution='&copy; OSM'
                    />
                 )}
                  {mapLayers.sites && groupedSites.map((site: any, idx: number) => (
                    <LeafletMarker 
                      key={idx} 
                      position={[site.lat, site.lng]}
                      eventHandlers={{
                        click: () => setSelectedSite(site.siteName)
                      }}
                    >
                      <Popup>
                        <div className="text-xs font-bold">{site.siteName}</div>
                        <div className="text-[10px] text-slate-500">{site.siteId}</div>
                      </Popup>
                    </LeafletMarker>
                  ))}
                  {mapLayers.geofences && geofences.map((gf) => (
                    <LeafletCircle 
                      key={gf.id}
                      center={[gf.lat, gf.lng]}
                      radius={gf.radius}
                      pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.2 }}
                    >
                      <Popup>
                        <div className="text-[10px font-bold]">{gf.name}</div>
                        <div className="text-[8px]">{gf.radius}m radius</div>
                      </Popup>
                    </LeafletCircle>
                  ))}
                  
                  {/* Imported .tab Layers for Basic Map */}
                  {importedTabLayers.map((layer, lIdx) => {
                    if (!layer.visible) return null;
                    return (
                      <React.Fragment key={`tab-basic-grp-${lIdx}`}>
                        {layer.data.features.map((f: any, fIdx: number) => {
                          if (f.geometry.type === 'Point') {
                            return (
                              <LeafletMarker 
                                key={`tab-basic-pt-${lIdx}-${fIdx}`} 
                                position={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
                              >
                                <Popup>
                                  <div className="text-[10px] font-bold">{layer.name}</div>
                                  <pre className="text-[8px] max-h-32 overflow-auto">
                                    {JSON.stringify(f.properties, null, 2)}
                                  </pre>
                                </Popup>
                              </LeafletMarker>
                            );
                          } else if (f.geometry.type === 'LineString') {
                            // Leaflet Polyline uses [lat, lng]
                            const positions = f.geometry.coordinates.map((coord: any) => [coord[1], coord[0]]);
                            return (
                              <LeafletPolyline 
                                key={`tab-basic-ls-${lIdx}-${fIdx}`}
                                positions={positions}
                                pathOptions={{ color: '#f59e0b', weight: 2, dashArray: '5, 5' }}
                              />
                            );
                          }
                          return null;
                        })}
                      </React.Fragment>
                    );
                  })}
               </MapContainer>
               <button 
                 onClick={() => setUseBasicMap(false)}
                 className="absolute top-2 right-2 z-[1000] p-1.5 bg-slate-900/80 hover:bg-slate-800 rounded border border-slate-700 text-slate-400 text-[10px] uppercase font-bold tracking-wider"
               >
                 Try Pro Map
               </button>
            </div>
          ) : (
            <React.Fragment>
              <div className="absolute inset-0 overflow-hidden">
                <MapGL
              key={mapRetryKey}
              ref={mapRef}
              onLoad={locateUser}
              onError={(e) => {
                console.warn("MapGL Error caught:", e);
                // Be selective which errors we consider fatal "MapError"
                if (e && e.error && e.error.message && (e.error.message.includes('WebGL') || e.error.message.includes('context'))) {
                  setMapError(true);
                } else if (e && e.type === 'webglcontextcreationerror') {
                  setMapError(true);
                }
              }}
              initialViewState={{
                longitude: defaultCenter.lng,
                latitude: defaultCenter.lat,
                zoom: 12
              }}
              style={{ width: '100%', height: '100%' }}
              mapStyle={isMapLightMode 
                ? "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
                : "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"}
              glOptions={{ 
                failIfMajorPerformanceCaveat: false, 
                preserveDrawingBuffer: true,
                antialias: false,
                alpha: true
              }}
            >
              {/* Imported .tab Layers */}
              {importedTabLayers.map((layer, idx) => {
                if (!layer.visible) return null;
                return (
                  <React.Fragment key={`tab-src-container-${idx}`}>
                    <Source id={`tab-src-${idx}`} type="geojson" data={layer.data}>
                      <Layer
                        id={`tab-layer-trace-${idx}`}
                        type="line"
                        filter={['==', '$type', 'LineString']}
                        paint={{
                          'line-color': '#f59e0b',
                          'line-width': 2,
                          'line-dasharray': [2, 1]
                        }}
                      />
                      <Layer
                        id={`tab-layer-${idx}`}
                        type="circle"
                        filter={['==', '$type', 'Point']}
                        paint={{
                          'circle-radius': 6,
                          'circle-color': '#f59e0b',
                          'circle-stroke-width': 2,
                          'circle-stroke-color': '#ffffff',
                          'circle-opacity': 0.8
                        }}
                      />
                      <Layer
                        id={`tab-layer-label-${idx}`}
                        type="symbol"
                        layout={{
                          'text-field': [
                            'coalesce', 
                            ['get', 'Name'], 
                            ['get', 'name'], 
                            ['get', 'SiteName'], 
                            ['get', 'Label'],
                            ['get', 'ID'],
                            ''
                          ],
                          'text-size': 10,
                          'text-offset': [0, 1.5],
                          'text-anchor': 'top'
                        }}
                        paint={{
                          'text-color': '#ffffff',
                          'text-halo-color': '#000000',
                          'text-halo-width': 1
                        }}
                      />
                    </Source>
                  </React.Fragment>
                );
              })}

              {mapLayers.sites && groupedSites.map((site: any, idx: number) => {
              const isSelected = site.siteName === selectedSite;
              return (
                <Marker 
                  key={idx} 
                  longitude={site.lng}
                  latitude={site.lat}
                  anchor="center"
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    setSelectedSite(site.siteName);
                    if (mapRef.current) {
                      mapRef.current.flyTo({
                        center: [site.lng, site.lat],
                        zoom: 16,
                        duration: 1500
                      });
                    }
                  }}
                  style={{ cursor: 'pointer', zIndex: isSelected ? 10 : 1 }}
                >
                  <div className="relative -translate-x-1/2 -translate-y-1/2 w-[100px] h-[100px]">
                    {mapDisplayOptions.siteName && (
                      <div className="absolute bottom-[60px] left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap text-[10px] font-bold text-white bg-slate-900/90 px-2 py-1 rounded-md border border-slate-700 shadow-xl pointer-events-none flex flex-col items-center gap-0.5">
                        <span className="leading-none">{site.siteName}</span>
                        {site.siteId && <span className="text-[8px] text-blue-400 font-mono opacity-90 leading-none">{site.siteId}</span>}
                      </div>
                    )}
                    <svg width="100" height="100" viewBox="0 0 100 100" className="overflow-visible pointer-events-none">
                      {site.sectors.map((sector: any, i: number) => {
                        const path = getSectorPath(50, 50, isSelected ? 48 : 40, sector.azimuth);
                        const textPos = polarToCartesian(50, 50, 55, sector.azimuth);
                        const isIsolated = isolatedCell?.pci === sector.pci && isolatedCell?.cellId === sector.cellId && isolatedCell?.siteName === site.siteName;
                        const stationarySector = stationarySectors.find(s => s.pci === sector.pci && s.cellId === sector.cellId);
                        const isStationaryTarget = !!stationarySector;
                        const isDimmed = isolatedCell && !isIsolated;
                        
                        const query = siteSearchQuery.toLowerCase();
                        const isSearchMatch = query.length > 1 && (
                          (sector.pci || '').toString().toLowerCase().includes(query) ||
                          (sector.cellId || '').toString().toLowerCase().includes(query)
                        );
                        
                        let fill = sector.color ? `${sector.color}66` : "rgba(59, 130, 246, 0.4)";
                        let stroke = sector.color || "#3b82f6";
                        
                        if (isIsolated) {
                          fill = "rgba(236, 72, 153, 0.6)";
                          stroke = "#ec4899";
                        } else if (isSearchMatch) {
                          fill = "rgba(34, 211, 238, 0.6)"; // Cyan for search match
                          stroke = "#22d3ee";
                        } else if (isStationaryTarget) {
                          fill = "rgba(16, 185, 129, 0.4)";
                          stroke = "#10b981";
                        } else if (isSelected) {
                          fill = "rgba(250, 204, 21, 0.4)";
                          stroke = "#facc15";
                        }
                        
                        const opacity = isDimmed && !isSearchMatch ? 0.15 : 1;

                        const labels = [];
                        if (mapDisplayOptions.pci && sector.pci) labels.push(`PCI:${sector.pci}`);
                        if (mapDisplayOptions.cellId && sector.cellId) labels.push(`ID:${sector.cellId}`);
                        
                        if (isStationaryTarget) {
                          labels.push("● TARGET PROFILE");
                          labels.push(`NR  R:${stationarySector.nrRsrpThreshold} S:${stationarySector.nrSinrThreshold}`);
                          labels.push(`LTE R:${stationarySector.lteRsrpThreshold} S:${stationarySector.lteSinrThreshold}`);
                        }

                        return (
                          <g 
                            key={i} 
                            style={{ opacity, transition: 'opacity 0.3s ease', cursor: 'pointer', pointerEvents: 'auto' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const tech = sector.band?.toLowerCase().includes('n') || sector.band?.toLowerCase().includes('nr') ? 'NR' : 'LTE';
                              setIsolatedCell({
                                pci: sector.pci,
                                cellId: sector.cellId,
                                siteName: site.siteName,
                                tech
                              });
                              setSelectedSite(site.siteName);
                              if (mapRef.current) {
                                mapRef.current.flyTo({
                                  center: [site.lng, site.lat],
                                  zoom: 16,
                                  duration: 1500
                                });
                              }
                            }}
                          >
                            {(isIsolated || isSearchMatch) && (
                              <motion.path 
                                d={path}
                                fill={isIsolated ? "rgba(236,72,153,0.3)" : "none"}
                                stroke={isIsolated ? "#ec4899" : "#22d3ee"}
                                strokeWidth={isIsolated ? "6" : "4"}
                                initial={{ opacity: 0.8, scale: 1 }}
                                animate={{ opacity: [0.8, 0, 0.8], scale: isIsolated ? [1, 1.15, 1] : 1.2 }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                style={{ transformOrigin: "50px 50px", filter: `drop-shadow(0 0 12px ${isIsolated ? '#ec4899' : '#22d3ee'})` }}
                              />
                            )}
                            <path 
                              d={path} 
                              fill={fill} 
                              stroke={stroke} 
                              strokeWidth={isIsolated || isStationaryTarget ? "3" : "1"}
                              strokeDasharray={isStationaryTarget && !isIsolated ? "2,1" : "none"}
                            />
                            {labels.map((lbl, lblIdx) => (
                              <text 
                                key={lblIdx}
                                x={textPos.x} 
                                y={textPos.y + (lblIdx * 10 - (labels.length - 1) * 5)} 
                                fontSize={isIsolated ? "11" : "9"} 
                                fill={isIsolated ? "#fbcfe8" : "white"} 
                                textAnchor="middle" 
                                dominantBaseline="middle"
                                className="font-mono font-bold drop-shadow-md"
                              >
                                {lbl}
                              </text>
                            ))}
                          </g>
                        );
                      })}
                      {/* Center dot */}
                      <circle cx="50" cy="50" r="4" fill={isSelected ? "#facc15" : "#ef4444"} stroke="white" strokeWidth="2" />
                      {isSelected && (
                        <motion.circle
                          cx="50"
                          cy="50"
                          r="6"
                          fill="none"
                          stroke="#facc15"
                          strokeWidth="2"
                          initial={{ opacity: 0.8, scale: 1 }}
                          animate={{ opacity: 0, scale: 3 }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                        />
                      )}
                    </svg>
                  </div>
                </Marker>
              );
            })}
            
            {/* Connections (Serving/Neighbor Lines) */}
            <Source id="connections" type="geojson" data={connectionsGeoJSON as any}>
              <Layer
                id="neighbor-line"
                type="line"
                filter={['==', 'type', 'neighbor']}
                paint={{
                  'line-color': '#9ca3af',
                  'line-width': 1.5,
                  'line-dasharray': [2, 2]
                }}
              />
              <Layer
                id="serving-line"
                type="line"
                filter={['==', 'type', 'serving']}
                paint={{
                  'line-color': '#22c55e',
                  'line-width': 2
                }}
              />
            </Source>

            {/* Dynamic Layers driven by mapLayerOrder (bottom to top) */}
            {[...mapLayerOrder].reverse().map(layerId => {
              if (!mapLayers[layerId as keyof typeof mapLayers]) return null;

              if (layerId === 'satellite') {
                return (
                  <React.Fragment key={`source-${layerId}`}>
                    <Source 
                      id="satellite-tiles" 
                      type="raster" 
                      tiles={['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}']} 
                      tileSize={256}
                    >
                      <Layer id="satellite-layer" type="raster" />
                    </Source>
                  </React.Fragment>
                );
              }

              if (layerId === 'geofences') {
                return (
                  <React.Fragment key={`source-${layerId}`}>
                    <Source id="geofences" type="geojson" data={geofenceGeoJSON as any}>
                      <Layer
                        id="geofence-fill"
                        type="fill"
                        paint={{
                          'fill-color': ['case', ['==', ['get', 'active'], true], '#10b981', '#3b82f6'],
                          'fill-opacity': 0.2
                        }}
                      />
                      <Layer
                        id="geofence-line"
                        type="line"
                        paint={{
                          'line-color': ['case', ['==', ['get', 'active'], true], '#10b981', '#3b82f6'],
                          'line-width': 2,
                          'line-opacity': 0.8
                        }}
                      />
                    </Source>
                  </React.Fragment>
                );
              }

              if (layerId === 'route' && routePath.length > 1) {
                return (
                  <React.Fragment key={`source-${layerId}`}>
                    {/* The basic route line */}
                    <Source id="route" type="geojson" data={routeGeoJSON as any}>
                      <Layer
                        id="route-line"
                        type="line"
                        paint={{
                          'line-color': '#475569',
                          'line-width': 2,
                          'line-opacity': 0.5
                        }}
                      />
                    </Source>
                    
                    {/* The Trace Points Layer */}
                    <Source id="trace-points" type="geojson" data={traceGeoJSON as any}>
                      <Layer
                        id="trace-layer"
                        type="circle"
                        paint={{
                          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 2, 16, 6],
                          'circle-color': ['get', 'color'],
                          'circle-stroke-width': 1,
                          'circle-stroke-color': '#ffffff',
                          'circle-stroke-opacity': 0.2
                        }}
                      />
                    </Source>
                  </React.Fragment>
                );
              }

              if (layerId === 'traffic') {
                return (
                  <React.Fragment key={`source-${layerId}`}>
                    <Source id="traffic-mock" type="geojson" data={{
                      type: 'FeatureCollection',
                      features: []
                    }}>
                      <Layer
                        id="traffic-line"
                        type="line"
                        paint={{
                          'line-color': '#f97316',
                          'line-width': 3,
                          'line-opacity': 0.6
                        }}
                      />
                    </Source>
                  </React.Fragment>
                );
              }

              return null;
            })}

            {/* Current Location Marker */}
            <Marker
              longitude={currentLocation.lng}
              latitude={currentLocation.lat}
              anchor="center"
            >
              <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
            </Marker>
          </MapGL>
          </div>

          <div className="absolute top-2 left-2 z-20 flex flex-col items-start gap-2">
            <div className="flex items-start gap-2">
              <button
                onClick={() => setIsLegendExpanded(!isLegendExpanded)}
                className="bg-slate-900/90 backdrop-blur-md p-2 rounded-lg border border-white/10 shadow-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all flex items-center gap-2 group"
                title={isLegendExpanded ? "Collapse Legend" : "Expand Legend"}
              >
                <div className="flex items-center gap-2">
                  <ClipboardList className={`w-3.5 h-3.5 transition-colors ${isLegendExpanded ? 'text-blue-400' : 'text-slate-500'}`} />
                  {!isLegendExpanded && <span className="text-[10px] font-bold uppercase tracking-wider pr-1">Legends</span>}
                  <motion.div
                    animate={{ rotate: isLegendExpanded ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </motion.div>
                </div>
              </button>

              <AnimatePresence>
                {isLegendExpanded && (
                  <motion.div
                    initial={{ opacity: 0, x: -10, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -10, scale: 0.95 }}
                    className="bg-slate-900/90 backdrop-blur-md p-2 rounded-lg border border-white/10 shadow-xl flex flex-row items-center gap-4 overflow-hidden"
                  >
                    <div className="flex flex-col border-r border-white/5 pr-3">
                      <div className="flex items-center gap-1.5 min-w-[80px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-white uppercase tracking-wider">{traceParameter}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-row gap-4">
                      {traceParameter.includes('RSRP') ? (
                        <>
                          <LegendItem color="#10b981" label="Excellent (>-80)" />
                          <LegendItem color="#22c55e" label="Good (-80 to -95)" />
                          <LegendItem color="#eab308" label="Fair (-95 to -110)" />
                          <LegendItem color="#ef4444" label="Bad (<-110)" />
                        </>
                      ) : traceParameter.includes('SINR') ? (
                        <>
                          <LegendItem color="#10b981" label="Excellent (>15)" />
                          <LegendItem color="#22c55e" label="Good (10 to 15)" />
                          <LegendItem color="#eab308" label="Fair (5 to 10)" />
                          <LegendItem color="#ef4444" label="Bad (<5)" />
                        </>
                      ) : (
                        <div className="text-[8px] text-slate-400 italic">Multi-colored by value (Hash-based)</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-col gap-1.5">
              <label 
                className="bg-slate-900/90 backdrop-blur-md p-2 rounded-lg border border-white/10 shadow-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all flex items-center justify-center cursor-pointer w-fit"
                title="Import Layers (.tab, .dat, .id, .map)"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <input type="file" accept=".tab,.tsv,.csv,.txt,.dat,.id,.map" multiple className="hidden" onChange={handleTabImport} />
              </label>

              {importedTabLayers.length > 0 && (
                <div className="flex flex-col gap-1 w-48">
                  {importedTabLayers.map((layer, idx) => (
                    <motion.div 
                      key={`ovl-imported-${idx}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-slate-900/80 backdrop-blur border border-white/5 p-1.5 rounded-lg flex items-center gap-2 group w-full"
                    >
                      <button 
                        onClick={() => {
                          const next = [...importedTabLayers];
                          next[idx].visible = !next[idx].visible;
                          setImportedTabLayers(next);
                        }}
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${layer.visible ? 'bg-amber-500 border-amber-400 text-slate-900' : 'bg-slate-800 border-slate-700 text-transparent'}`}
                      >
                        <Check className="w-2.5 h-2.5" />
                      </button>
                      <span className="text-[9px] font-medium text-slate-300 flex-1 truncate">{layer.name}</span>
                      <button 
                        onClick={() => {
                          setImportedTabLayers(prev => prev.filter((_, i) => i !== idx));
                        }}
                        className="w-3.5 h-3.5 p-0.5 rounded hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur px-2 py-1 rounded text-[10px] font-mono text-slate-400 border border-slate-800 flex items-center gap-1 pointer-events-none z-20">
            <MapIcon className="w-3 h-3" />
            GPS: {currentLocation.lat.toFixed(4)}° N, {Math.abs(currentLocation.lng).toFixed(4)}° W
          </div>

          <div className="absolute bottom-2 right-2 flex flex-col gap-2 z-20">
            <button 
              onClick={() => {
                setRoutePath([]);
                setTraceHistory([]);
                setToastMessage({ title: 'Path Cleared', message: "Route and Trace history have been reset.", type: 'enter' });
                setTimeout(() => setToastMessage(null), 3000);
              }}
              className="bg-slate-900/80 p-2 rounded border border-slate-700 text-slate-300 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 transition-all shadow-md group"
              title="Clear Track Path"
            >
              <Eraser className="w-4 h-4 transition-transform group-active:scale-95" />
            </button>

            <button 
              onClick={locateUser} 
              className="bg-slate-900/80 p-2 rounded border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors shadow-md"
              title="Locate Me"
            >
              <LocateFixed className="w-4 h-4" />
            </button>
          </div>

          {/* Map Mode Toggle Button */}
          <button 
            onClick={() => setIsMapLightMode(!isMapLightMode)} 
            className={`absolute top-2 right-2 px-3 py-2 rounded-lg border transition-all z-40 shadow-lg flex items-center gap-2 ${
              isMapLightMode 
                ? 'bg-blue-500 border-blue-400 text-white' 
                : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
            title={isMapLightMode ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {isMapLightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="text-[10px] font-bold uppercase tracking-wider">{isMapLightMode ? 'Dark' : 'Light'}</span>
          </button>

          {isolatedCell && (
            <div className={`absolute ${isLegendExpanded ? 'top-14' : 'top-12'} left-2 z-30 transition-all duration-300 pointer-events-none`}>
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl p-3 w-48 pointer-events-auto"
              >
                <div className="flex items-center justify-between mb-2 border-b border-slate-800 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-pulse" />
                    <h3 className="text-[9px] font-bold text-slate-200 uppercase tracking-wider">Sector Info</h3>
                  </div>
                  <button 
                    onClick={() => setIsolatedCell(null)}
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] text-slate-500 uppercase font-bold">PCI</span>
                    <span className="text-[10px] font-mono font-bold text-pink-400">{isolatedCell.pci}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] text-slate-500 uppercase font-bold">Cell ID</span>
                    <span className="text-[10px] font-mono font-bold text-blue-400">{isolatedCell.cellId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] text-slate-500 uppercase font-bold">Tech</span>
                    <span className={`text-[8px] font-bold px-1 py-0.5 rounded border ${
                      isolatedCell.tech === 'NR' 
                        ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' 
                        : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    }`}>
                      {isolatedCell.tech === 'NR' ? '5G NR' : '4G LTE'}
                    </span>
                  </div>
                  
                  <button 
                    onClick={() => setIsolatedCell(null)}
                    className="w-full mt-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[8px] font-bold rounded border border-slate-700 transition-all uppercase tracking-widest"
                  >
                    Return to Site View
                  </button>
                </div>
              </motion.div>
            </div>
          )}
          
          {/* Closing for mapError ternary */}
          </React.Fragment>
          )}
        </div>
      </div>

        {/* Toast Notification */}
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`absolute top-16 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-lg shadow-lg border flex items-center gap-2 ${
              toastMessage.type === 'enter' 
                ? 'bg-emerald-900/90 border-emerald-500/50 text-emerald-100' 
                : 'bg-amber-900/90 border-amber-500/50 text-amber-100'
            }`}
          >
            {toastMessage.type === 'enter' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            <div className="flex flex-col">
              {toastMessage.title && <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{toastMessage.title}</span>}
              <span className="text-sm font-medium">{toastMessage.message}</span>
            </div>
          </motion.div>
        )}

          {/* --- Draggable Content Sheet (Overlay) --- */}
          <motion.div 
            drag="y"
            dragConstraints={{ top: 0, bottom: 550 }}
            dragElastic={0.1}
            dragTransition={{ power: 0.2, timeConstant: 200 }}
            initial={{ y: 450 }}
            className="absolute inset-x-0 bottom-0 z-50 bg-slate-950 rounded-t-[32px] shadow-[0_-20px_60px_rgba(0,0,0,0.6)] border-t border-slate-800 flex flex-col h-[85vh]"
          >
            {/* Drag Handle & Grab Zone */}
            <div className="w-full flex flex-col items-center py-3 cursor-grab active:cursor-grabbing border-b border-white/5 shrink-0 hover:bg-white/[0.02] transition-colors">
               <div className="w-12 h-1.5 bg-slate-700/50 rounded-full mb-1" />
               <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Pull to Expand</span>
            </div>

            {/* Content Container (Scrollable internally) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0 bg-slate-950 rounded-t-[32px]">
          {/* --- Fixed RF Parameters Rows --- */}
          <div className="shrink-0 bg-slate-950 border-b border-slate-800 shadow-md flex flex-col relative min-h-fit">
          {/* 2nd Section: NR Row */}
          {(lockedTechs.length === 0 || lockedTechs.includes('5G')) && (
            <div className={`flex items-center px-3 py-2 border-b border-slate-800/50 bg-slate-900/40 transition-opacity duration-300 ${isolatedCell && isolatedCell.tech !== 'NR' ? 'opacity-30' : 'opacity-100'}`}>
              <div className="flex items-center gap-1 w-14 shrink-0">
                <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">5G NR</span>
                {isBandLockingEnabled && lockedTechs.includes('5G') && <Lock className="w-2.5 h-2.5 text-amber-500" />}
              </div>
              <div className="flex-1 flex items-center justify-between gap-1 pl-2">
                <CompactParam label="ARFCN" value={nrParams.earfcn} />
                <CompactParam label="SS-RSRP" value={nrParams.ssRsrp} highlight={nrParams.ssRsrp >= thresholds.nrRsrp ? 'good' : 'warn'} />
                <CompactParam label="PCI" value={isolatedCell && isolatedCell.tech === 'NR' ? isolatedCell.pci : nrParams.pci} highlight={isolatedCell && isolatedCell.tech === 'NR' ? 'good' : undefined} />
                <CompactParam label="SS-SINR" value={nrParams.ssSinr} highlight={nrParams.ssSinr >= thresholds.nrSinr ? 'good' : 'warn'} />
                <RRCStatus state={nrParams.rrcState} />
                <CompactParam label="CellID" value={isolatedCell && isolatedCell.tech === 'NR' ? isolatedCell.cellId : nrParams.cellId} highlight={isolatedCell && isolatedCell.tech === 'NR' ? 'good' : undefined} />
                {isolatedCell && isolatedCell.tech === 'NR' && (
                  <button 
                    onClick={() => setIsolatedCell(null)}
                    className="ml-2 px-2 py-0.5 bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 text-[9px] font-bold rounded border border-pink-500/40 transition-colors uppercase tracking-tighter"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* 3rd Section: LTE Row */}
          {(lockedTechs.length === 0 || lockedTechs.includes('4G') || lockedTechs.includes('5G')) && (
            <div className={`flex items-center px-3 py-2 border-b border-slate-800/50 bg-slate-900/40 transition-opacity duration-300 ${isolatedCell && isolatedCell.tech !== 'LTE' ? 'opacity-30' : 'opacity-100'}`}>
              <div className="flex items-center gap-1 w-14 shrink-0">
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">4G LTE</span>
                {isBandLockingEnabled && lockedTechs.includes('4G') && <Lock className="w-2.5 h-2.5 text-amber-500" />}
              </div>
              <div className="flex-1 flex items-center justify-between gap-1 pl-2">
                <CompactParam label="EARFCN" value={lteParams.earfcn} />
                <CompactParam label="RSRP" value={lteParams.rsrp} highlight={lteParams.rsrp >= thresholds.lteRsrp ? 'good' : 'warn'} />
                <CompactParam label="PCI" value={isolatedCell && isolatedCell.tech === 'LTE' ? isolatedCell.pci : lteParams.pci} highlight={isolatedCell && isolatedCell.tech === 'LTE' ? 'good' : undefined} />
                <CompactParam label="SINR" value={lteParams.sinr} highlight={lteParams.sinr >= thresholds.lteSinr ? 'good' : 'warn'} />
                <RRCStatus state={lteParams.rrcState} />
                <CompactParam label="CellID" value={isolatedCell && isolatedCell.tech === 'LTE' ? isolatedCell.cellId : lteParams.cellId} highlight={isolatedCell && isolatedCell.tech === 'LTE' ? 'good' : undefined} />
                {isolatedCell && isolatedCell.tech === 'LTE' && (
                  <button 
                    onClick={() => setIsolatedCell(null)}
                    className="ml-2 px-2 py-0.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-[9px] font-bold rounded border border-blue-500/40 transition-colors uppercase tracking-tighter"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 4th Section: 3G Row */}
          {lockedTechs.includes('3G') && (
            <div className="flex items-center px-3 py-2 border-b border-slate-800/50 bg-slate-900/40 transition-opacity duration-300 opacity-100">
              <div className="flex items-center gap-1 w-14 shrink-0">
                <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">3G UMTS</span>
                {isBandLockingEnabled && lockedTechs.includes('3G') && <Lock className="w-2.5 h-2.5 text-amber-500" />}
              </div>
              <div className="flex-1 flex items-center justify-between gap-1 pl-2">
                <CompactParam label="UARFCN" value={wcdmaParams.uarfcn} />
                <CompactParam label="RSCP" value={wcdmaParams.rscp} highlight={wcdmaParams.rscp >= -95 ? 'good' : 'warn'} />
                <CompactParam label="PSC" value={wcdmaParams.psc} />
                <CompactParam label="Ec/Io" value={wcdmaParams.ecio} highlight={wcdmaParams.ecio >= -12 ? 'good' : 'warn'} />
                <RRCStatus state={wcdmaParams.rrcState} />
                <CompactParam label="CellID" value={wcdmaParams.cellId} />
              </div>
            </div>
          )}

          {/* 5th Section: 2G Row */}
          {lockedTechs.includes('2G') && (
            <div className="flex items-center px-3 py-2 bg-slate-900/40 transition-opacity duration-300 opacity-100">
              <div className="flex items-center gap-1 w-14 shrink-0">
                <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">2G GSM</span>
                {isBandLockingEnabled && lockedTechs.includes('2G') && <Lock className="w-2.5 h-2.5 text-amber-500" />}
              </div>
              <div className="flex-1 flex items-center justify-between gap-1 pl-2">
                <CompactParam label="ARFCN" value={gsmParams.arfcn} />
                <CompactParam label="RxLev" value={gsmParams.rxLev} highlight={gsmParams.rxLev >= -85 ? 'good' : 'warn'} />
                <CompactParam label="BSIC" value={gsmParams.bsic} />
                <CompactParam label="TA" value={gsmParams.timingAdvance} />
                <RRCStatus state={gsmParams.rrcState} />
                <CompactParam label="CellID" value={gsmParams.cellId} />
              </div>
            </div>
          )}
        </div>

        {/* --- Sheet Tab Switcher --- */}
        <div className="shrink-0 flex border-b border-slate-800 bg-slate-900/10 relative p-1">
          <div className="absolute inset-x-1 inset-y-1 flex pointer-events-none">
            <motion.div 
              layoutId="tab-active"
              animate={{ 
                x: sheetTab === 'tasks' ? '0%' : sheetTab === 'toolbox' ? '100%' : '200%',
                width: '33.33%' 
              }}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              className={`h-full rounded-lg ${
                sheetTab === 'tasks' ? 'bg-emerald-500/10 border border-emerald-500/20' : 
                sheetTab === 'toolbox' ? 'bg-purple-500/10 border border-purple-500/20' : 
                'bg-orange-500/10 border border-orange-500/20'
              }`}
            />
          </div>
          <button 
            onClick={() => setSheetTab('tasks')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 relative z-10 ${
              sheetTab === 'tasks' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Tests
          </button>
          <button 
            onClick={() => setSheetTab('toolbox')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 relative z-10 ${
              sheetTab === 'toolbox' ? 'text-purple-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Toolkit
          </button>
          <button 
            onClick={() => setSheetTab('frequencies')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 relative z-10 ${
              sheetTab === 'frequencies' ? 'text-orange-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Carrier
          </button>
        </div>

        {sheetTab === 'tasks' ? (
          <>
            {/* --- Middle Section: Task Management --- */}
          <div className="shrink-0 flex flex-col relative bg-slate-950 min-h-fit">
            <div className="shrink-0 p-4 border-b border-slate-800/50">
            <div className="flex items-center justify-end mb-1">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button 
                  onClick={() => setIsLockModalOpen(true)}
                  className="p-1.5 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 transition-colors flex items-center gap-1 shadow-sm shrink-0"
                  title="Advanced Network Configuration"
                >
                  <Settings2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">Config</span>
                </button>
                <button 
                  onClick={() => setIsCreateTaskOpen(!isCreateTaskOpen)}
                  className={`p-1.5 border rounded transition-colors flex items-center gap-1 shadow-sm shrink-0 ${isCreateTaskOpen ? 'bg-amber-600 border-amber-500 text-white' : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500'}`}
                  title={isCreateTaskOpen ? 'Close Search' : 'Create a New Task'}
                >
                  {isCreateTaskOpen ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  <span className="text-[9px] font-bold uppercase tracking-tighter">{isCreateTaskOpen ? 'Close' : 'Create'}</span>
                </button>
                <button 
                  onClick={exportLogData}
                  className="p-1.5 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 transition-colors flex items-center gap-1 shadow-sm shrink-0"
                  title="Export Test Logs to JSON"
                >
                  <ClipboardList className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">JSON</span>
                </button>
                <label className="p-1.5 bg-slate-800 border border-slate-700 rounded cursor-pointer hover:bg-slate-700 transition-colors flex items-center gap-1 shadow-sm shrink-0">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">XLSX</span>
                  <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            </div>

            {/* --- Inline Task Search Bar --- */}
            <AnimatePresence>
              {isCreateTaskOpen && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-inner relative z-30">
                    <div className="flex items-center gap-2 mb-2">
                       <Search className="w-3.5 h-3.5 text-emerald-500" />
                       <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-tight">Quick Site/Cell Search</span>
                    </div>
                    <div className="relative">
                      <input
                        autoFocus
                        type="text"
                        placeholder="Search site name, Site ID, or Cell ID..."
                        value={siteSearchQuery}
                        onChange={(e) => setSiteSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded p-2 outline-none focus:border-emerald-500 transition-colors pr-10"
                      />
                      <Search className="absolute right-3 top-2 w-4 h-4 text-slate-600" />
                    </div>

                    <div className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-md max-h-60 overflow-y-auto flex flex-col custom-scrollbar shadow-inner relative z-50">
                      {siteSearchQuery.length === 0 && (
                        <div className="flex flex-col">
                          {recentSearches.length > 0 && (
                            <div className="flex flex-col border-b border-slate-800">
                              <div className="px-2 py-1 flex justify-between items-center bg-slate-900/50">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Recent Searches</span>
                                <button 
                                  onClick={() => {
                                    setRecentSearches([]);
                                    localStorage.removeItem('recentSiteSearches');
                                  }}
                                  className="text-[9px] text-red-500/70 hover:text-red-400 transition-colors"
                                >
                                  Clear
                                </button>
                              </div>
                              {recentSearches.map((search, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setSiteSearchQuery(search)}
                                  className="px-2 py-1.5 text-[11px] text-slate-400 hover:bg-slate-800 text-left flex items-center gap-2 transition-colors border-b border-slate-800/20 last:border-0"
                                >
                                  <Clock className="w-3 h-3 opacity-50" />
                                  {search}
                                </button>
                              ))}
                            </div>
                          )}
                          
                          <div className="px-2 py-1 flex justify-between items-center bg-slate-900/50">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Available Sites ({groupedSites.length})</span>
                          </div>
                          {groupedSites.slice(0, 10).map((s, i) => (
                            <button 
                              key={`avail-${i}`}
                              onClick={() => {
                                setSelectedSite(s.siteName);
                                setIsCreateTaskOpen(false);
                                setSelectedTestMode('mobility');
                                setToastMessage({ title: 'Site Selected', message: `Stationary Session for ${s.siteName}`, type: 'enter' });
                                setTimeout(() => setToastMessage(null), 3000);
                                if (mapRef.current) {
                                  mapRef.current.flyTo({ center: [s.lng, s.lat], zoom: 16, duration: 1500 });
                                }
                              }}
                              className="w-full text-left px-2 py-1.5 text-[11px] hover:bg-slate-800 transition-colors text-slate-300 border-b border-slate-800/20 last:border-0"
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-200">{s.siteName}</span>
                                  <span className="text-[8px] opacity-60 uppercase">{s.sectors.length} Sectors</span>
                                </div>
                                <ArrowRight className="w-3 h-3 text-slate-600" />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {siteSearchQuery.length > 0 && (
                        groupedSites
                          .filter(s => {
                            const query = siteSearchQuery.toLowerCase();
                            const siteName = (s.siteName || '').toLowerCase();
                            const siteId = (s.siteId || '').toString().toLowerCase();
                            const matchesSector = s.sectors.some((sec: any) => 
                              (sec.pci || '').toString().toLowerCase().includes(query) || 
                              (sec.cellId || '').toString().toLowerCase().includes(query)
                            );
                            return siteName.includes(query) || siteId.includes(query) || matchesSector;
                          })
                          .length === 0 ? (
                            <div className="p-3 text-[11px] text-slate-500 text-center italic">No matching sites found.</div>
                          ) : (
                            groupedSites
                              .filter(s => {
                                const query = siteSearchQuery.toLowerCase();
                                const siteName = (s.siteName || '').toLowerCase();
                                const siteId = (s.siteId || '').toString().toLowerCase();
                                const matchesSector = s.sectors.some((sec: any) => 
                                  (sec.pci || '').toString().toLowerCase().includes(query) || 
                                  (sec.cellId || '').toString().toLowerCase().includes(query)
                                );
                                return siteName.includes(query) || siteId.includes(query) || matchesSector;
                              })
                              .map((s, i) => (
                                <div key={i} className="border-b border-slate-800/50 last:border-0">
                                  <button 
                                    onClick={() => {
                                      setSelectedSite(s.siteName);
                                      setIsCreateTaskOpen(false);
                                      setSelectedTestMode('mobility');
                                      setToastMessage({ title: 'Task Created', message: `Stationary Session for ${s.siteName}`, type: 'enter' });
                                      setTimeout(() => setToastMessage(null), 3000);
                                      addRecentSearch(siteSearchQuery);
                                      if (mapRef.current) {
                                        mapRef.current.flyTo({ center: [s.lng, s.lat], zoom: 16, duration: 1500 });
                                      }
                                    }}
                                    className="w-full text-left px-2 py-1.5 text-[11px] hover:bg-slate-800 transition-colors text-slate-300"
                                  >
                                    <div className="flex justify-between items-center">
                                      <div className="flex flex-col">
                                        <span className="font-bold text-slate-200">{s.siteName}</span>
                                        <div className="flex gap-2 items-center opacity-60">
                                          <span className="text-[9px] uppercase">{s.sectors.length} Sectors</span>
                                          {s.siteId && <span className="text-[9px]">ID: {s.siteId}</span>}
                                        </div>
                                      </div>
                                      <ArrowRight className="w-3 h-3 text-slate-600" />
                                    </div>
                                  </button>
                                </div>
                              ))
                          )
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

            <div className="p-4 pb-32 flex flex-col gap-4">
            {!selectedSite && (
              <div className="flex flex-col gap-6">
                {/* Information Header */}
                <div className="flex flex-col gap-1 items-center justify-center py-8 text-center bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                   <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mb-2 border border-emerald-500/20">
                      <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                   </div>
                   <h3 className="text-sm font-bold text-slate-200">No Target Selected</h3>
                   <p className="text-[10px] text-slate-500 max-w-[200px]">Import an Engineering Parameters file or search for a site to begin testing.</p>
                   {!sites.length && (
                     <label className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer shadow-lg shadow-emerald-900/20">
                        Import XLSX Database
                        <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
                     </label>
                   )}
                </div>

                {/* Database Sites List */}
                {groupedSites.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center px-1">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Imported Sites ({groupedSites.length})</h4>
                      <button 
                        onClick={() => setIsCreateTaskOpen(true)}
                        className="text-[9px] font-bold text-blue-400 uppercase hover:text-blue-300 transition-colors"
                      >
                        Global Search
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2">
                       {groupedSites.slice(0, 15).map((s, idx) => (
                         <button 
                          key={`site-list-${idx}`}
                          onClick={() => {
                            setSelectedSite(s.siteName);
                            setSelectedTestMode('mobility');
                            if (mapRef.current) {
                              mapRef.current.flyTo({ center: [s.lng, s.lat], zoom: 16, duration: 1500 });
                            }
                          }}
                          className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-emerald-500/50 hover:bg-slate-900 transition-all text-left group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700/50 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-colors">
                            <MapPin className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <h5 className="text-[11px] font-bold text-slate-200 truncate">{s.siteName}</h5>
                              <span className="text-[9px] text-slate-500 font-mono">{s.siteId}</span>
                            </div>
                            <div className="flex gap-2 items-center mt-0.5">
                              <span className="text-[9px] text-slate-400 uppercase">{s.sectors.length} Sectors</span>
                              <div className="w-1 h-1 rounded-full bg-slate-700" />
                              <span className="text-[9px] text-slate-400">Lat: {s.lat.toFixed(4)}</span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                        </button>
                       ))}
                       {groupedSites.length > 15 && (
                         <button 
                           onClick={() => setIsCreateTaskOpen(true)}
                           className="py-3 text-center text-[10px] text-slate-500 hover:text-slate-300 font-bold uppercase border border-dashed border-slate-800 rounded-xl transition-colors"
                         >
                           + {groupedSites.length - 15} more sites (Search to find)
                         </button>
                       )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedSite && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400">Selected Target</span>
                      <h3 className="text-sm font-bold text-slate-200">{selectedSite}</h3>
                    </div>
                    <button 
                      onClick={() => setIsCreateTaskOpen(true)}
                      className="p-1.5 px-3 bg-emerald-600 border border-emerald-500 rounded hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5 shadow-sm"
                      title="Create a New Task"
                    >
                      <Plus className="w-3.5 h-3.5 text-white" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white">Create Task</span>
                    </button>
                  </div>
                  {/* Real-time Signal Graph */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Real-time Signal Graph</h4>
                      
                      <div className="flex bg-slate-950 rounded p-1">
                        {['Signal', 'Throughput', 'Latency', 'Events'].map(mode => (
                          <button
                            key={mode}
                            onClick={() => setGraphMode(mode as any)}
                            className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded ${
                              graphMode === mode ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 relative">
                      {(() => {
                        const calcStats = (vals: number[]) => {
                          const validVals = vals.filter(v => v !== undefined && v !== null && !isNaN(v));
                          return validVals.length ? { min: Math.min(...validVals).toFixed(1), max: Math.max(...validVals).toFixed(1), avg: (validVals.reduce((a,b)=>a+b,0)/validVals.length).toFixed(1) } : { min: '-', max: '-', avg: '-' };
                        };
                        
                        if (graphMode === 'Signal') {
                          const rsrpStats = calcStats(testResults.map(r => r.ssRsrp));
                          const sinrStats = calcStats(testResults.map(r => r.ssSinr));
                          return (
                            <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-wider">
                              <div className="bg-slate-950 p-2 rounded border border-blue-500/20 text-center flex justify-between">
                                <div className="flex flex-col"><span className="text-slate-500">Min RSRP</span><span className="text-blue-400 font-bold">{rsrpStats.min}</span></div>
                                <div className="flex flex-col"><span className="text-slate-500">Avg RSRP</span><span className="text-blue-400 font-bold">{rsrpStats.avg}</span></div>
                                <div className="flex flex-col"><span className="text-slate-500">Max RSRP</span><span className="text-blue-400 font-bold">{rsrpStats.max}</span></div>
                              </div>
                              <div className="bg-slate-950 p-2 rounded border border-emerald-500/20 text-center flex justify-between">
                                <div className="flex flex-col"><span className="text-slate-500">Min SINR</span><span className="text-emerald-400 font-bold">{sinrStats.min}</span></div>
                                <div className="flex flex-col"><span className="text-slate-500">Avg SINR</span><span className="text-emerald-400 font-bold">{sinrStats.avg}</span></div>
                                <div className="flex flex-col"><span className="text-slate-500">Max SINR</span><span className="text-emerald-400 font-bold">{sinrStats.max}</span></div>
                              </div>
                            </div>
                          );
                        } else if (graphMode === 'Throughput') {
                          const dlStats = calcStats(testResults.map(r => r.dl));
                          const ulStats = calcStats(testResults.map(r => r.ul));
                          return (
                            <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-wider">
                              <div className="bg-slate-950 p-2 rounded border border-purple-500/20 text-center flex justify-between">
                                <div className="flex flex-col"><span className="text-slate-500">Min DL</span><span className="text-purple-400 font-bold">{dlStats.min}</span></div>
                                <div className="flex flex-col"><span className="text-slate-500">Avg DL</span><span className="text-purple-400 font-bold">{dlStats.avg}</span></div>
                                <div className="flex flex-col"><span className="text-slate-500">Max DL</span><span className="text-purple-400 font-bold">{dlStats.max}</span></div>
                              </div>
                              <div className="bg-slate-950 p-2 rounded border border-pink-500/20 text-center flex justify-between">
                                <div className="flex flex-col"><span className="text-slate-500">Min UL</span><span className="text-pink-400 font-bold">{ulStats.min}</span></div>
                                <div className="flex flex-col"><span className="text-slate-500">Avg UL</span><span className="text-pink-400 font-bold">{ulStats.avg}</span></div>
                                <div className="flex flex-col"><span className="text-slate-500">Max UL</span><span className="text-pink-400 font-bold">{ulStats.max}</span></div>
                              </div>
                            </div>
                          );
                        } else if (graphMode === 'Latency') {
                          const pingStats = calcStats(testResults.map(r => r.ping));
                          return (
                            <div className="grid grid-cols-1 gap-2 text-[10px] uppercase tracking-wider">
                              <div className="bg-slate-950 p-2 rounded border border-amber-500/20 text-center flex justify-around">
                                <div className="flex flex-col"><span className="text-slate-500">Min Ping</span><span className="text-amber-400 font-bold">{pingStats.min} ms</span></div>
                                <div className="flex flex-col"><span className="text-slate-500">Avg Ping</span><span className="text-amber-400 font-bold">{pingStats.avg} ms</span></div>
                                <div className="flex flex-col"><span className="text-slate-500">Max Ping</span><span className="text-amber-400 font-bold">{pingStats.max} ms</span></div>
                              </div>
                            </div>
                          );
                        } else if (graphMode === 'Events') {
                          const lastEvent = testResults[testResults.length - 1];
                          return (
                            <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-wider">
                              <div className="bg-slate-950 p-2 rounded border border-indigo-500/20 text-center flex justify-around">
                                <div className="flex flex-col"><span className="text-slate-500">Voice State</span><span className="text-indigo-400 font-bold">{lastEvent?.voiceEvent || 'Idle'}</span></div>
                              </div>
                              <div className="bg-slate-950 p-2 rounded border border-rose-500/20 text-center flex justify-around">
                                <div className="flex flex-col"><span className="text-slate-500">Data State</span><span className="text-rose-400 font-bold">{lastEvent?.detachEvent || 'Idle'}</span></div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {testResults.length > 0 && (
                        <div className="flex justify-between items-center text-[10px] uppercase tracking-wider px-1">
                          <span className="text-slate-500">
                            {zoomDomainLeft && zoomDomainRight ? 'Zoomed View' : 'Live Data'}
                          </span>
                          {(zoomDomainLeft && zoomDomainRight) && (
                            <button 
                              onClick={() => {
                                setZoomLeft(null); setZoomRight(null);
                                setZoomDomainLeft(null); setZoomDomainRight(null);
                              }}
                              className="text-blue-400 font-bold hover:text-blue-300"
                            >
                              Reset Zoom
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {testResults.length > 0 ? (
                      <div className="h-44 w-full cursor-crosshair">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart 
                            data={testResults.map(r => ({
                              ...r,
                              voiceNum: r.voiceEvent === 'In Call' ? 3 : r.voiceEvent === 'Call Setup' ? 2 : r.voiceEvent === 'Call Drop' ? 0 : 1,
                              detachNum: r.detachEvent === 'Attached' ? 3 : r.detachEvent === 'Attach Req' ? 2 : r.detachEvent === 'Detach Req' ? 0 : 1
                            }))} 
                            margin={{ top: 5, right: 0, left: -10, bottom: 0 }}
                            onMouseDown={(e) => e && setZoomLeft(e.activeLabel as string)}
                            onMouseMove={(e) => zoomLeft && e && setZoomRight(e.activeLabel as string)}
                            onMouseUp={() => {
                              if (zoomLeft && zoomRight && zoomLeft !== zoomRight) {
                                // Simplified zoom - set domain
                                let [min, max] = [zoomLeft, zoomRight].sort();
                                setZoomDomainLeft(min); setZoomDomainRight(max);
                              }
                              setZoomLeft(null); setZoomRight(null);
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis 
                              dataKey="timestamp" 
                              tick={{ fontSize: 9, fill: '#475569' }} 
                              stroke="#334155" 
                              minTickGap={20}
                              domain={zoomDomainLeft && zoomDomainRight ? [zoomDomainLeft, zoomDomainRight] : ['auto', 'auto']}
                              allowDataOverflow
                            />
                            
                            {graphMode === 'Signal' && (
                              <>
                                <YAxis yAxisId="left" tick={{ fontSize: 9, fill: '#60a5fa' }} stroke="#334155" domain={[-140, -40]} hide={false} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#34d399' }} stroke="#334155" domain={[-20, 40]} hide={false} />
                                <Line yAxisId="left" type="monotone" dataKey="ssRsrp" name="RSRP" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                                <Line yAxisId="right" type="monotone" dataKey="ssSinr" name="SINR" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                              </>
                            )}

                            {graphMode === 'Throughput' && (
                              <>
                                <YAxis yAxisId="left" tick={{ fontSize: 9, fill: '#8b5cf6' }} stroke="#334155" hide={false} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#ec4899' }} stroke="#334155" hide={false} />
                                <Line yAxisId="left" type="monotone" dataKey="dl" name="DL (Mbps)" stroke="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive={false} />
                                <Line yAxisId="right" type="monotone" dataKey="ul" name="UL (Mbps)" stroke="#ec4899" strokeWidth={2} dot={false} isAnimationActive={false} />
                              </>
                            )}

                            {graphMode === 'Latency' && (
                              <>
                                <YAxis yAxisId="left" tick={{ fontSize: 9, fill: '#f59e0b' }} stroke="#334155" hide={false} />
                                <Line yAxisId="left" type="monotone" dataKey="ping" name="Ping (ms)" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                              </>
                            )}

                            {graphMode === 'Events' && (
                              <>
                                <YAxis yAxisId="left" tick={{ fontSize: 9, fill: '#818cf8' }} stroke="#334155" domain={[0, 4]} hide={false} tickFormatter={(val) => ["Drop", "Idle", "Setup", "Active"][val] || ""} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#fb7185' }} stroke="#334155" domain={[0, 4]} hide={false} tickFormatter={(val) => ["D-Req", "Idle", "A-Req", "Attach"][val] || ""} />
                                <Line yAxisId="left" type="stepAfter" dataKey="voiceNum" name="Voice Event" stroke="#818cf8" strokeWidth={2} dot={false} isAnimationActive={false} />
                                <Line yAxisId="right" type="stepAfter" dataKey="detachNum" name="Data Event" stroke="#fb7185" strokeWidth={2} dot={false} isAnimationActive={false} />
                              </>
                            )}

                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', fontSize: '10px', borderRadius: '8px' }}
                              itemStyle={{ padding: '2px 0', fontSize: '11px', fontWeight: 'bold' }}
                              labelStyle={{ color: '#94a3b8', marginBottom: '6px' }}
                              cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '3 3' }}
                              formatter={(value: any, name: any, props: any) => {
                                if (name === 'Voice Event') return [props.payload.voiceEvent, name];
                                if (name === 'Data Event') return [props.payload.detachEvent, name];
                                if (name === 'RSRP') return [`${value} dBm`, name];
                                if (name === 'SINR') return [`${value} dB`, name];
                                if (name === 'DL (Mbps)') return [`${value} Mbps`, 'Download'];
                                if (name === 'UL (Mbps)') return [`${value} Mbps`, 'Upload'];
                                if (name === 'Ping (ms)') return [`${value} ms`, 'Ping'];
                                return [value, name];
                              }}
                            />

                            {/* Temporarily disabled due to linting constraints on specific Recharts versions */}
                            {/* {zoomLeft && zoomRight ? (
                              <ReferenceArea x1={zoomLeft} x2={zoomRight} fill="#3b82f6" fillOpacity={0.1} />
                            ) : null} */}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-44 flex items-center justify-center border border-dashed border-slate-700/50 rounded-lg">
                        <span className="text-xs text-slate-500">No test data available</span>
                      </div>
                    )}
                  </div>
{/* New Test Selection Cards */}
                <div className="flex flex-col gap-3">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Test Selection</h4>
                  
                  {/* Mobility Card */}
                  <button 
                    onClick={() => setSelectedTestMode('mobility')}
                    className={`w-full p-3 rounded-xl border transition-all flex items-center gap-4 ${
                      selectedTestMode === 'mobility' 
                        ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/20' 
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${selectedTestMode === 'mobility' ? 'bg-white/20' : 'bg-blue-500/20'}`}>
                      <AzureDevOpsIcon className={`w-6 h-6 ${selectedTestMode === 'mobility' ? 'text-white' : 'text-blue-400'}`} />
                    </div>
                    <div className="text-left">
                      <h4 className={`text-sm font-bold ${selectedTestMode === 'mobility' ? 'text-white' : 'text-slate-200'}`}>Mobility Tests</h4>
                      <p className={`text-[10px] ${selectedTestMode === 'mobility' ? 'text-blue-100' : 'text-slate-500'}`}>Cluster & Handover scenarios</p>
                    </div>
                  </button>

                  {/* Sector Cards Row */}
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((num) => {
                      const mode = `sector-${num}` as any;
                      const isSelected = selectedTestMode === mode;
                      return (
                        <button 
                          key={num}
                          onClick={() => setSelectedTestMode(mode)}
                          className={`p-2 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                            isSelected 
                              ? 'bg-emerald-600 border-emerald-500 shadow-lg shadow-emerald-900/20' 
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-emerald-500/20'}`}>
                            <MapPin className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-emerald-400'}`} />
                          </div>
                          <span className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>Sector {num}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Inline Test Plans Section */}
                  <AnimatePresence>
                    {selectedTestMode && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-lg mt-2">
                          <div className="bg-slate-950/50 px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {selectedTestMode === 'mobility' ? (
                                <AzureDevOpsIcon className="w-3.5 h-3.5 text-blue-400" />
                              ) : (
                                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                              )}
                              <h3 className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">
                                {selectedTestMode === 'mobility' ? 'Mobility' : `Sector ${selectedTestMode.split('-')[1]}`} Test Plans
                              </h3>
                            </div>
                            <button 
                              onClick={() => setSelectedTestMode(null)}
                              className="text-slate-500 hover:text-white transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="p-2 space-y-1.5">
                            {(selectedTestMode === 'mobility' ? mobilityScripts : stationaryScripts).map((script) => (
                              <div key={script.id} className="flex items-center justify-between bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                                <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                                  <div className={`p-1 rounded-md ${
                                    script.id.includes('dl') ? 'bg-blue-500/10' : 
                                    script.id.includes('ul') ? 'bg-purple-500/10' : 
                                    script.id.includes('voice') ? 'bg-emerald-500/10' : 'bg-amber-500/10'
                                  }`}>
                                    {script.id.includes('dl') ? <Download className="w-3 h-3 text-blue-400" /> :
                                     script.id.includes('ul') ? <Upload className="w-3 h-3 text-purple-400" /> :
                                     script.id.includes('voice') ? <Smartphone className="w-3 h-3 text-emerald-400" /> :
                                     <Activity className="w-3 h-3 text-amber-400" />}
                                  </div>
                                  <div className="flex-1 w-full flex flex-col">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-semibold text-slate-200">{script.label}</span>
                                      {scriptStatuses[script.id] && scriptStatuses[script.id] !== 'Idle' && (
                                        <span className={`text-[7px] px-1 py-0.5 rounded-full font-bold uppercase ${
                                          scriptStatuses[script.id] === 'Running' ? 'bg-blue-500/20 text-blue-400 animate-pulse' :
                                          scriptStatuses[script.id] === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                          'bg-red-500/20 text-red-400'
                                        }`}>
                                          {scriptStatuses[script.id]}
                                        </span>
                                      )}
                                    </div>
                                    {scriptStatuses[script.id] === 'Running' && (
                                      <div className="flex flex-col gap-1 mt-1.5 w-full pr-2">
                                        <div className="flex justify-between items-center text-[8px] text-slate-400 font-mono tracking-tighter">
                                          <span>
                                            {script.id.includes('ul') 
                                              ? `Upload Progress: ${testProgress}%` 
                                              : testMode === 'stationary' 
                                                ? `Sec ${currentSectorIdx + 1}/${stationarySectors.length} - ${testProgress}%`
                                                : `${testProgress}%`}
                                          </span>
                                          <span className={`${script.id.includes('ul') ? 'text-purple-400' : 'text-blue-400'} font-bold`}>
                                            ETA: {(() => {
                                              const totalRemainingSectors = testMode === 'stationary' ? (stationarySectors.length - currentSectorIdx - 1) : 0;
                                              const remainingProgressInCurrent = 100 - testProgress;
                                              const remainingMs = (remainingProgressInCurrent * 50) + (totalRemainingSectors * 100 * 50);
                                              return (remainingMs / 1000).toFixed(1) + 's';
                                            })()}
                                          </span>
                                        </div>
                                        <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                          <div 
                                            className={`h-full transition-all duration-100 ease-linear ${script.id.includes('ul') ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'}`}
                                            style={{ 
                                              width: `${testMode === 'stationary' 
                                                ? ((currentSectorIdx + (testProgress/100)) / stationarySectors.length) * 100 
                                                : testProgress}%` 
                                            }}
                                          />
                                        </div>
                                        {script.id.includes('dl') && testResults.length > 0 && (
                                          <div className="h-12 w-full mt-2 bg-slate-900/50 rounded border border-slate-800/30 overflow-hidden relative group">
                                            <div className="absolute top-1 left-2 z-10 text-[7px] font-bold text-blue-400/70 uppercase tracking-widest">
                                              Throughput (Mbps)
                                            </div>
                                            <div className="absolute top-1 right-2 z-10 text-[9px] font-mono font-bold text-blue-400">
                                              {testResults[testResults.length - 1]?.dl || 0}
                                            </div>
                                            <div className="absolute inset-0">
                                              <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={testResults.slice(-40)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                                  <defs>
                                                    <linearGradient id="dlGradient" x1="0" y1="0" x2="0" y2="1">
                                                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                    </linearGradient>
                                                  </defs>
                                                  <Area 
                                                    type="monotone" 
                                                    dataKey="dl" 
                                                    stroke="#3b82f6" 
                                                    strokeWidth={2} 
                                                    fillOpacity={1}
                                                    fill="url(#dlGradient)"
                                                    isAnimationActive={false}
                                                  />
                                                  <YAxis hide domain={[0, 'auto']} />
                                                  <XAxis hide dataKey="timestamp" />
                                                </AreaChart>
                                              </ResponsiveContainer>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => setEditingScriptConfigId(script.id)}
                                    className="p-1 text-slate-500 hover:text-blue-400 transition-colors"
                                    title="Configure Parameters"
                                  >
                                    <Settings2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const isRunning = scriptStatuses[script.id] === 'Running';
                                      toggleTest(isRunning, script.id, script.label, testMode);
                                    }}
                                    className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase transition-colors ${
                                      scriptStatuses[script.id] === 'Running' 
                                        ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' 
                                        : 'bg-emerald-600 text-white hover:bg-emerald-500'
                                    }`}
                                  >
                                    {scriptStatuses[script.id] === 'Running' ? 'Stop' : 'Start'}
                                  </button>
                                  {scriptStatuses[script.id] === 'Completed' && (
                                    <>
                                      <button 
                                        onClick={() => setIsResultsModalOpen(true)}
                                        className="p-1 text-blue-500 hover:text-blue-400 transition-colors"
                                        title="View Results Table"
                                      >
                                        <TableIcon className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => exportToExcel(script.id)}
                                      className="p-1 text-emerald-500 hover:text-emerald-400 transition-colors"
                                      title="Download Report"
                                    >
                                      <FileSpreadsheet className="w-3.5 h-3.5" />
                                    </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                  
                  {/* Site Details */}

                  {/* Stationary Inputs */}
                  {testMode === 'stationary' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex flex-col gap-2 mt-1 pl-3 border-l-2 border-blue-500/30 ml-2">
                      {stationarySectors.map((sector, idx) => (
                        <div key={idx} className="flex flex-col gap-2 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60">
                          <div className="flex gap-2 items-center">
                            <input 
                              placeholder={`Sector ${idx + 1} ID (e.g. Alpha)`} 
                              value={sector.id}
                              onChange={e => {
                                const newSectors = [...stationarySectors];
                                newSectors[idx] = { ...newSectors[idx], id: e.target.value };
                                setStationarySectors(newSectors);
                              }}
                              className="flex-1 bg-slate-950 border border-slate-800 text-xs text-slate-200 p-2 rounded-md focus:border-blue-500 outline-none transition-colors"
                            />
                            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-md p-1 focus-within:border-blue-500 transition-colors w-24">
                              <Navigation 
                                className="w-3.5 h-3.5 text-blue-400 ml-1 transition-transform duration-200" 
                                style={{ transform: `rotate(${sector.azimuth || 0}deg)` }} 
                              />
                              <input 
                                placeholder={`0`} 
                                type="number"
                                min="0"
                                max="359"
                                value={sector.azimuth}
                                onChange={e => {
                                  const newSectors = [...stationarySectors];
                                  newSectors[idx] = { ...newSectors[idx], azimuth: e.target.value };
                                  setStationarySectors(newSectors);
                                }}
                                className="w-full bg-transparent text-xs text-slate-200 p-1 outline-none text-right appearance-none"
                              />
                              <span className="text-[10px] text-slate-500 mr-1">°</span>
                            </div>
                            <button 
                              onClick={() => setEditingSectorIdx(idx)} 
                              className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            {stationarySectors.length > 1 && (
                              <button 
                                onClick={() => {
                                  const newSectors = stationarySectors.filter((_, i) => i !== idx);
                                  setStationarySectors(newSectors);
                                }}
                                className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2 px-1">
                            <span className="text-[9px] text-slate-500 font-mono">0°</span>
                            <input 
                              type="range" 
                              min="0" 
                              max="359" 
                              value={sector.azimuth || 0}
                              onChange={e => {
                                const newSectors = [...stationarySectors];
                                newSectors[idx] = { ...newSectors[idx], azimuth: e.target.value };
                                setStationarySectors(newSectors);
                              }}
                              className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <span className="text-[9px] text-slate-500 font-mono">359°</span>
                          </div>
                          {/* Visual Indicators */}
                          <div className="flex gap-2 px-1 mt-1 justify-between flex-wrap">
                            <div className="flex gap-2">
                              <div className="flex items-center gap-1.5 bg-slate-950/50 px-2 py-1 rounded border border-slate-800/50">
                                <Signal className="w-3 h-3 text-blue-400" />
                                <span className="text-[10px] text-slate-400">NR: {sector.nrRsrpThreshold}/{sector.nrSinrThreshold}</span>
                              </div>
                              <div className="flex items-center gap-1.5 bg-slate-950/50 px-2 py-1 rounded border border-slate-800/50">
                                <Signal className="w-3 h-3 text-emerald-400" />
                                <span className="text-[10px] text-slate-400">LTE: {sector.lteRsrpThreshold}/{sector.lteSinrThreshold}</span>
                              </div>
                              <div className="flex items-center gap-1.5 bg-slate-950/50 px-2 py-1 rounded border border-slate-800/50">
                                <Database className="w-3 h-3 text-purple-400" />
                                <span className="text-[10px] text-slate-400">PCI: {sector.pci} | ID: {sector.cellId}</span>
                              </div>
                            </div>
                            
                            {isTestRunning && activeTask && currentSectorIdx <= idx && (
                              <div className="flex items-center mt-1">
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${activeTask.id.includes('ul') ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' : 'text-blue-400 bg-blue-500/10 border-blue-500/20'}`}>
                                  {idx === currentSectorIdx ? (
                                    <>{activeTask.id.includes('ul') ? 'Upload Progress:' : 'Progress:'} {testProgress}% | ETA: {((100 - testProgress) * 50 / 1000).toFixed(1)}s</>
                                  ) : (
                                    <>Queued ETA: {((((idx - currentSectorIdx) * 100) + (100 - testProgress)) * 50 / 1000).toFixed(1)}s</>
                                  )}
                                </span>
                              </div>
                            )}
                            {isTestRunning && activeTask && currentSectorIdx > idx && (
                               <div className="flex items-center mt-1">
                                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                  Completed
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {stationarySectors.length < 5 && (
                        <button 
                          onClick={() => {
                            const defaultIds = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];
                            const nextId = defaultIds[stationarySectors.length] || `Sector ${stationarySectors.length + 1}`;
                            const nextAzimuth = (stationarySectors.length * 120) % 360;
                            setStationarySectors([...stationarySectors, { 
                              id: nextId, 
                              azimuth: nextAzimuth.toString(), 
                              uid: `sec-${Date.now()}`,
                              duration: 60,
                              frequency: 3500,
                              bandwidth: 100,
                              nrRsrpThreshold: -90,
                              nrSinrThreshold: 15,
                              lteRsrpThreshold: -100,
                              lteSinrThreshold: 10,
                              nrArfcn: 633334,
                              earfcn: 1650,
                              pci: 100 + stationarySectors.length + 1,
                              cellId: stationarySectors.length + 1
                            }]);
                          }}
                          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1 py-1"
                        >
                          <Plus className="w-3 h-3" /> Add Sector
                        </button>
                      )}
                    </motion.div>
                  )}

                  {/* Edit Task Script Button */}
                  {testMode && (
                    <motion.button
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => openScriptEditor(`task_${testMode}`, `${testMode === 'mobility' ? 'Mobility' : 'Stationary'} Task Script`)}
                      className="mt-2 w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-slate-300 transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      Edit {testMode === 'mobility' ? 'Mobility' : 'Stationary'} Task Script
                    </motion.button>
                  )}
                </div>
              )}
            </div>
          </div>
          </>
        ) : sheetTab === 'toolbox' ? (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-4 flex flex-col gap-8 pb-40 overflow-y-auto max-h-full"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Settings2 className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Engineering Toolkit</h2>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed px-1">
                Advanced diagnostic tools for network optimization, protocol analysis, and hardware level modem control. Use with caution during live drive tests.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <section className="space-y-2">
                <CarrierStatus />
              </section>

              <section className="space-y-2">
                <BandLockPanel />
              </section>

              <section className="space-y-2">
                <VoiceQualityTester />
              </section>

              <section className="space-y-2">
                <ProtocolLogViewer />
              </section>
            </div>
            
            <div className="mt-8 p-4 bg-purple-500/5 rounded-xl border border-purple-500/10 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[10px] font-bold text-purple-300 uppercase tracking-widest">
                <ShieldAlert className="w-3.5 h-3.5" />
                Hardware Requirements
              </div>
              <p className="text-[9px] text-slate-500 leading-normal">
                Band locking and protocol decoding require a device with a Qualcomm Snapdragon or Google Tensor modem. Root access is not required but some carrier-locked devices may restrict modem control.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-3 flex flex-col gap-4 pb-32 overflow-y-auto h-full scrollbar-hide"
          >
            <div className="shrink-0 space-y-2 px-1">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-orange-400" />
                <h2 className="text-sm font-black text-white uppercase tracking-[0.1em]">Frequency Layering</h2>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                Analysis of detected carrier components and signal quality across available bands.
              </p>
            </div>

            <div className="shrink-0">
              <CarrierFrequencies />
            </div>
          </motion.div>
        )}
        </div>
      </motion.div>
    </div>

    {/* Test Completion Modal */}
    <AnimatePresence>
      {showTestCompletionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm pointer-events-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500" />
            
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                <FileText className="w-8 h-8 text-blue-400" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Test Completed</h3>
                <p className="text-slate-400 text-sm">
                  The test "{completedTestInfo?.name}" has finished. What would you like to do with the logs?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full mt-4">
                <button 
                  onClick={() => {
                    exportLogData();
                    setShowTestCompletionModal(false);
                  }}
                  className="flex flex-col items-center gap-2 p-4 bg-slate-800/50 hover:bg-emerald-500/20 border border-slate-700 hover:border-emerald-500/50 rounded-xl transition-all group"
                >
                  <Save className="w-6 h-6 text-slate-400 group-hover:text-emerald-400" />
                  <span className="text-xs font-bold text-slate-300 group-hover:text-emerald-100 uppercase tracking-wider">Save Log</span>
                </button>

                <button 
                  onClick={() => {
                    setShowTestCompletionModal(false);
                    setShowDeleteConfirmModal(true);
                    setIsDeleteConfirmed(false);
                  }}
                  className="flex flex-col items-center gap-2 p-4 bg-slate-800/50 hover:bg-red-500/20 border border-slate-700 hover:border-red-500/50 rounded-xl transition-all group"
                >
                  <Trash2 className="w-6 h-6 text-slate-400 group-hover:text-red-400" />
                  <span className="text-xs font-bold text-slate-300 group-hover:text-red-100 uppercase tracking-wider">Delete</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Delete Confirmation Modal */}
    <AnimatePresence>
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md pointer-events-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-sm bg-slate-900 border border-red-500/30 rounded-2xl shadow-2xl p-6"
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Delete Log?</h3>
                <p className="text-slate-400 text-sm">
                  Are you sure you want to permanently delete the logs for "{completedTestInfo?.name}"? This action cannot be undone.
                </p>
              </div>

              <div className="w-full p-4 bg-slate-950/50 rounded-xl border border-slate-800 flex items-center gap-3 cursor-pointer select-none"
                onClick={() => setIsDeleteConfirmed(!isDeleteConfirmed)}
              >
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isDeleteConfirmed ? 'bg-red-500 border-red-500' : 'bg-slate-900 border-slate-700'}`}>
                  {isDeleteConfirmed && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className="text-xs font-medium text-slate-300">Yes, I am sure I want to delete it.</span>
              </div>

              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="flex-1 py-3 bg-slate-800 text-white text-xs font-bold uppercase rounded-xl border border-slate-700"
                >
                  Cancel
                </button>
                <button 
                  disabled={!isDeleteConfirmed}
                  onClick={() => {
                    setTestResults([]);
                    logDataRef.current = [];
                    setShowDeleteConfirmModal(false);
                  }}
                  className={`flex-1 py-3 text-white text-xs font-bold uppercase rounded-xl transition-all ${isDeleteConfirmed ? 'bg-red-600 shadow-lg shadow-red-600/20' : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'}`}
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

        {/* Cell Infos Modal */}

        {/* Sector Settings Modal */}
        {editingSectorIdx !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-slate-200">Sector Settings</h3>
                </div>
                <button onClick={() => setEditingSectorIdx(null)} className="text-slate-400 hover:text-slate-200 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-4 pt-4 pb-0">
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                   <div className="flex justify-between items-center mb-1.5">
                     <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3 text-emerald-500" /> Sector Test ETA</span>
                     <span className="text-xs font-mono font-bold text-blue-400">
                       {isTestRunning && currentSectorIdx === editingSectorIdx 
                         ? (((100 - testProgress) / 100) * (stationarySectors[editingSectorIdx].duration || 0)).toFixed(1) + 's' 
                         : (stationarySectors[editingSectorIdx].duration || 0).toFixed(1) + 's'}
                     </span>
                   </div>
                   <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                     <div 
                       className={`h-full transition-all duration-100 ease-linear ${isTestRunning && currentSectorIdx === editingSectorIdx ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-slate-700'}`}
                       style={{ width: `${isTestRunning && currentSectorIdx === editingSectorIdx ? testProgress : 0}%` }}
                     />
                   </div>
                   {isTestRunning && currentSectorIdx === editingSectorIdx && (
                     <div className="flex items-center gap-1.5 mt-2">
                       <span className="relative flex h-2 w-2">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                       </span>
                       <p className="text-[9px] text-emerald-400 font-medium tracking-tight">Actively running sector payload...</p>
                     </div>
                   )}
                </div>
              </div>

              <div className="p-4 space-y-5">
                {/* Unified Test Plan Template Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <ClipboardList className="w-3 h-3" />
                    Test Plan Template
                  </label>
                  <select
                    value={stationarySectors[editingSectorIdx].testPlan?.type || ''}
                    onChange={e => {
                      const type = e.target.value;
                      if (!type) return;
                      
                      let selectedPlan = DEFAULT_TEST_PLANS[type];
                      if (!selectedPlan && customTestPlans[type]) {
                        selectedPlan = customTestPlans[type];
                      }
                      
                      if (selectedPlan) {
                        const newSectors = [...stationarySectors];
                        newSectors[editingSectorIdx] = { 
                          ...newSectors[editingSectorIdx], 
                          testPlan: { ...selectedPlan } 
                        };
                        setStationarySectors(newSectors);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 p-2 rounded-md focus:border-blue-500 outline-none transition-colors appearance-none"
                  >
                    <option value="" disabled>Select a plan to pre-fill...</option>
                    
                    <optgroup label="Predefined Plans">
                      {Object.keys(DEFAULT_TEST_PLANS).map(planType => (
                        <option key={`default-${planType}`} value={planType}>{planType}</option>
                      ))}
                    </optgroup>

                    {Object.keys(customTestPlans).length > 0 && (
                      <optgroup label="Saved Custom Configurations">
                        {Object.entries(customTestPlans).map(([name, plan]) => (
                          <option key={`custom-${name}`} value={name}>{name} ({(plan as any).type})</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      Duration (s)
                    </label>
                    <input 
                      type="number" 
                      value={stationarySectors[editingSectorIdx].duration}
                      onChange={e => {
                        const newSectors = [...stationarySectors];
                        newSectors[editingSectorIdx] = { ...newSectors[editingSectorIdx], duration: Number(e.target.value) };
                        setStationarySectors(newSectors);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 p-2 rounded-md focus:border-blue-500 outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Signal className="w-3 h-3" />
                      Freq (MHz)
                    </label>
                    <input 
                      type="number" 
                      value={stationarySectors[editingSectorIdx].frequency}
                      onChange={e => {
                        const newSectors = [...stationarySectors];
                        newSectors[editingSectorIdx] = { ...newSectors[editingSectorIdx], frequency: Number(e.target.value) };
                        setStationarySectors(newSectors);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 p-2 rounded-md focus:border-blue-500 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3 h-3" />
                    Bandwidth (MHz)
                  </label>
                  <input 
                    type="number" 
                    value={stationarySectors[editingSectorIdx].bandwidth}
                    onChange={e => {
                      const newSectors = [...stationarySectors];
                      newSectors[editingSectorIdx] = { ...newSectors[editingSectorIdx], bandwidth: Number(e.target.value) };
                      setStationarySectors(newSectors);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 p-2 rounded-md focus:border-blue-500 outline-none transition-colors"
                  />
                </div>

                <div className="pt-2 border-t border-slate-800/50">
                  <h4 className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-3">5G NR Thresholds</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-500 font-medium">SS-RSRP (Good &ge;)</label>
                      <input 
                        type="number" 
                        value={stationarySectors[editingSectorIdx].nrRsrpThreshold}
                        onChange={e => {
                          const newSectors = [...stationarySectors];
                          newSectors[editingSectorIdx] = { ...newSectors[editingSectorIdx], nrRsrpThreshold: Number(e.target.value) };
                          setStationarySectors(newSectors);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 p-2 rounded-md focus:border-blue-500 outline-none transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-500 font-medium">SS-SINR (Good &ge;)</label>
                      <input 
                        type="number" 
                        value={stationarySectors[editingSectorIdx].nrSinrThreshold}
                        onChange={e => {
                          const newSectors = [...stationarySectors];
                          newSectors[editingSectorIdx] = { ...newSectors[editingSectorIdx], nrSinrThreshold: Number(e.target.value) };
                          setStationarySectors(newSectors);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 p-2 rounded-md focus:border-blue-500 outline-none transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-500 font-medium">NR ARFCN</label>
                      <input 
                        type="number" 
                        value={stationarySectors[editingSectorIdx].nrArfcn || ''}
                        onChange={e => {
                          const newSectors = [...stationarySectors];
                          newSectors[editingSectorIdx] = { ...newSectors[editingSectorIdx], nrArfcn: Number(e.target.value) };
                          setStationarySectors(newSectors);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 p-2 rounded-md focus:border-blue-500 outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/50">
                  <h4 className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-3">4G LTE Thresholds</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-500 font-medium">RSRP (Good &ge;)</label>
                      <input 
                        type="number" 
                        value={stationarySectors[editingSectorIdx].lteRsrpThreshold}
                        onChange={e => {
                          const newSectors = [...stationarySectors];
                          newSectors[editingSectorIdx] = { ...newSectors[editingSectorIdx], lteRsrpThreshold: Number(e.target.value) };
                          setStationarySectors(newSectors);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 p-2 rounded-md focus:border-emerald-500 outline-none transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-500 font-medium">SINR (Good &ge;)</label>
                      <input 
                        type="number" 
                        value={stationarySectors[editingSectorIdx].lteSinrThreshold}
                        onChange={e => {
                          const newSectors = [...stationarySectors];
                          newSectors[editingSectorIdx] = { ...newSectors[editingSectorIdx], lteSinrThreshold: Number(e.target.value) };
                          setStationarySectors(newSectors);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 p-2 rounded-md focus:border-emerald-500 outline-none transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-500 font-medium">EARFCN</label>
                      <input 
                        type="number" 
                        value={stationarySectors[editingSectorIdx].earfcn || ''}
                        onChange={e => {
                          const newSectors = [...stationarySectors];
                          newSectors[editingSectorIdx] = { ...newSectors[editingSectorIdx], earfcn: Number(e.target.value) };
                          setStationarySectors(newSectors);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 p-2 rounded-md focus:border-emerald-500 outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/50">
                  <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Cell Identity</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-500 font-medium">PCI</label>
                      <input 
                        type="number" 
                        value={stationarySectors[editingSectorIdx].pci || ''}
                        onChange={e => {
                          const newSectors = [...stationarySectors];
                          newSectors[editingSectorIdx] = { ...newSectors[editingSectorIdx], pci: Number(e.target.value) };
                          setStationarySectors(newSectors);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 p-2 rounded-md focus:border-blue-500 outline-none transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-500 font-medium">Cell ID</label>
                      <input 
                        type="number" 
                        value={stationarySectors[editingSectorIdx].cellId || ''}
                        onChange={e => {
                          const newSectors = [...stationarySectors];
                          newSectors[editingSectorIdx] = { ...newSectors[editingSectorIdx], cellId: Number(e.target.value) };
                          setStationarySectors(newSectors);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 p-2 rounded-md focus:border-blue-500 outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/50">
                  <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800/50">
                    <h4 className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-2">Threshold Visualization</h4>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[8px] font-mono">
                          <span className="text-blue-400">NR RSRP: {stationarySectors[editingSectorIdx].nrRsrpThreshold} dBm</span>
                          <span className="text-slate-600">-140 to -40</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500/40" style={{ width: `${Math.min(100, Math.max(0, (stationarySectors[editingSectorIdx].nrRsrpThreshold + 140) / 100 * 100))}%` }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[8px] font-mono">
                          <span className="text-emerald-400">LTE RSRP: {stationarySectors[editingSectorIdx].lteRsrpThreshold} dBm</span>
                          <span className="text-slate-600">-140 to -40</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500/40" style={{ width: `${Math.min(100, Math.max(0, (stationarySectors[editingSectorIdx].lteRsrpThreshold + 140) / 100 * 100))}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex flex-col gap-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingTestPlanIdx(editingSectorIdx);
                      if (!stationarySectors[editingSectorIdx].testPlan) {
                        const newSectors = [...stationarySectors];
                        newSectors[editingSectorIdx] = { ...newSectors[editingSectorIdx], testPlan: DEFAULT_TEST_PLANS['FTP Download'] };
                        setStationarySectors(newSectors);
                      }
                    }}
                    className="flex-2 w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <ClipboardList className="w-4 h-4" />
                    Configure Test Plan
                  </button>
                  <button
                    title="Manage Saved Templates"
                    onClick={() => setIsLoadTemplateModalOpen(true)}
                    className="flex-1 w-full py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Templates
                  </button>
                </div>
                <button 
                  onClick={() => setEditingSectorIdx(null)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* --- Script Editor Modal --- */}

        {/* --- Script Editor Modal --- */}
        {editingScriptId && (
          <div className="absolute inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <h3 className="text-sm font-bold text-slate-200">Edit Script: {editingScriptTitle}</h3>
                <button onClick={() => setEditingScriptId(null)} className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 flex-1">
                <textarea
                  value={tempScriptContent}
                  onChange={(e) => setTempScriptContent(e.target.value)}
                  className="w-full h-48 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-emerald-400 focus:border-emerald-500 outline-none resize-none"
                  placeholder="Enter script parameters here..."
                />
              </div>
              <div className="p-4 border-t border-slate-800 flex justify-end gap-2">
                <button 
                  onClick={() => setEditingScriptId(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveScript}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Save Script
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* --- Test Plan Modal --- */}
        {(editingTestPlanIdx !== null || editingScriptConfigId !== null) && activeTestPlanObj && (
          <div className="fixed inset-0 z-[100] bg-white flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <button onClick={closeTestPlanModal} className="p-1 text-slate-600">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="font-semibold text-slate-800">{activeTestPlanObj?.customName ? `${activeTestPlanObj.customName} (${activeTestPlanType})` : activeTestPlanType}</h3>
              </div>
              <div className="flex items-center gap-3">
                {editingTestPlanIdx !== null && (
                  <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-mono text-slate-600">EARFCN: {stationarySectors[editingTestPlanIdx]?.earfcn || 1650}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50">
              {/* Template Actions */}
              {(editingTestPlanIdx !== null || editingScriptConfigId !== null) && <div className="bg-slate-50 border-b border-slate-200 p-3 flex gap-3 shrink-0">
                <button 
                  onClick={() => {
                    setTemplateNameInput(activeTestPlanObj?.customName || '');
                    setIsSaveTemplateModalOpen(true);
                  }}
                  className="flex-1 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <DownloadCloud className="w-4 h-4 text-emerald-500" /> Save Template
                </button>
                <button 
                  onClick={() => setIsLoadTemplateModalOpen(true)}
                  className="flex-1 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4 text-blue-500" /> Load Template
                </button>
              </div>}
              <div className="flex flex-col bg-white">
                <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                  <span className="text-sm font-medium text-slate-700">Custom Name</span>
                  <input 
                    type="text"
                    placeholder="e.g. My Custom Plan"
                    value={activeTestPlanObj?.customName || ''}
                    onChange={(e) => updateActiveTestPlan({ customName: e.target.value })}
                    className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500 w-2/3"
                  />
                </div>
                <div 
                  className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white active:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setIsTestTypeSelectorOpen(true)}
                >
                  <span className="text-sm font-medium text-slate-700">Test Type</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-blue-500 font-bold">{activeTestPlanObj?.customName || activeTestPlanType}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>

                {activeTestPlanObj.type === 'FTP Download' && (
                  <>
                    <div 
                      className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white active:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setIsProtocolSelectorOpen(true)}
                    >
                      <span className="text-sm font-medium text-slate-700">Protocol Type</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-slate-500">{activeTestPlanObj.protocolType?.join(', ')}</span>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                    <div 
                      className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white active:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setIsDisconnectionModeSelectorOpen(true)}
                    >
                      <span className="text-sm font-medium text-slate-700">Disconnection Mode</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-slate-500">{activeTestPlanObj.disconnectionMode}</span>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Server IP</span>
                      <input 
                        type="text"
                        value={activeTestPlanObj.serverIp}
                        onChange={(e) => {
                          updateActiveTestPlan({ serverIp: e.target.value })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Port[0, 65535]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.port}
                        onChange={(e) => {
                          updateActiveTestPlan({ port: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">User</span>
                      <input 
                        type="text"
                        value={activeTestPlanObj.user}
                        onChange={(e) => {
                          updateActiveTestPlan({ user: e.target.value })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Password</span>
                      <input 
                        type="password"
                        value={activeTestPlanObj.password}
                        onChange={(e) => {
                          updateActiveTestPlan({ password: e.target.value })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Connect Timeout(s)[5, 60]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.connectTimeout}
                        onChange={(e) => {
                          updateActiveTestPlan({ connectTimeout: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Test Timeout(s)[5, 120]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.testTimeout}
                        onChange={(e) => {
                          updateActiveTestPlan({ testTimeout: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Download URL / Remote File</span>
                      <input 
                        type="text"
                        value={activeTestPlanObj.remoteFile}
                        onChange={(e) => {
                          updateActiveTestPlan({ remoteFile: e.target.value })
                        }}
                        placeholder="e.g. /test/file.bin"
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">File Size(KB)[1, 2097152]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.fileSize || 1024}
                        onChange={(e) => {
                          updateActiveTestPlan({ fileSize: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Thread Count[1, 30]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.threadCount}
                        onChange={(e) => {
                          updateActiveTestPlan({ threadCount: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Test Interval(s)[1, 900]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.testInterval}
                        onChange={(e) => {
                          updateActiveTestPlan({ testInterval: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Test Count[1, 9999]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.testCount}
                        onChange={(e) => {
                          updateActiveTestPlan({ testCount: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                  </>
                )}

                {['HTTP Download', 'HTTPS Download'].includes(activeTestPlanObj.type || '') && (
                  <>
                    <div 
                      className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white active:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setIsDisconnectionModeSelectorOpen(true)}
                    >
                      <span className="text-sm font-medium text-slate-700">Disconnection Mode</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-slate-500">{activeTestPlanObj.disconnectionMode}</span>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Download URL</span>
                      <input 
                        type="text"
                        value={activeTestPlanObj.downloadUrl || ''}
                        onChange={(e) => {
                          updateActiveTestPlan({ downloadUrl: e.target.value })
                        }}
                        placeholder="http://..."
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500 w-2/3"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Connect Timeout(s)[5, 60]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.connectTimeout || 60}
                        onChange={(e) => {
                          updateActiveTestPlan({ connectTimeout: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Test Timeout(s)[5, 120]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.testTimeout || 60}
                        onChange={(e) => {
                          updateActiveTestPlan({ testTimeout: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Thread Count[1, 30]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.threadCount || 5}
                        onChange={(e) => {
                          updateActiveTestPlan({ threadCount: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Test Interval(s)[1, 900]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.testInterval || 10}
                        onChange={(e) => {
                          updateActiveTestPlan({ testInterval: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Test Count[1, 9999]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.testCount || 1}
                        onChange={(e) => {
                          updateActiveTestPlan({ testCount: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                  </>
                )}

                {activeTestPlanObj.type === 'FTP Upload' && (
                  <>
                    <div 
                      className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white active:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setIsProtocolSelectorOpen(true)}
                    >
                      <span className="text-sm font-medium text-slate-700">Protocol Type</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-slate-500">{activeTestPlanObj.protocolType?.join(', ')}</span>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                    <div 
                      className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white active:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setIsDisconnectionModeSelectorOpen(true)}
                    >
                      <span className="text-sm font-medium text-slate-700">Disconnection Mode</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-slate-500">{activeTestPlanObj.disconnectionMode}</span>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Server IP</span>
                      <input 
                        type="text"
                        value={activeTestPlanObj.serverIp}
                        onChange={(e) => {
                          updateActiveTestPlan({ serverIp: e.target.value })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Port[0, 65535]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.port}
                        onChange={(e) => {
                          updateActiveTestPlan({ port: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">User</span>
                      <input 
                        type="text"
                        value={activeTestPlanObj.user}
                        onChange={(e) => {
                          updateActiveTestPlan({ user: e.target.value })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Password</span>
                      <input 
                        type="password"
                        value={activeTestPlanObj.password}
                        onChange={(e) => {
                          updateActiveTestPlan({ password: e.target.value })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Auto Delete</span>
                      <button 
                        onClick={() => {
                          updateActiveTestPlan({ autoDelete: !activeTestPlanObj.autoDelete })
                        }}
                        className={`w-10 h-5 rounded-full relative transition-colors ${activeTestPlanObj.autoDelete ? 'bg-blue-500' : 'bg-slate-200'}`}
                      >
                        <motion.div 
                          animate={{ x: activeTestPlanObj.autoDelete ? 22 : 2 }}
                          className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Connect Timeout(s)[5, 60]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.connectTimeout}
                        onChange={(e) => {
                          updateActiveTestPlan({ connectTimeout: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Test Timeout(s)[5, 120]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.testTimeout}
                        onChange={(e) => {
                          updateActiveTestPlan({ testTimeout: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Upload URL</span>
                      <input 
                        type="text"
                        value={activeTestPlanObj.uploadUrl}
                        onChange={(e) => {
                          updateActiveTestPlan({ uploadUrl: e.target.value })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">File Size(KB)[1, 2097152]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.fileSize}
                        onChange={(e) => {
                          updateActiveTestPlan({ fileSize: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Thread Count[1, 30]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.threadCount}
                        onChange={(e) => {
                          updateActiveTestPlan({ threadCount: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Test Interval(s)[1, 900]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.testInterval}
                        onChange={(e) => {
                          updateActiveTestPlan({ testInterval: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                  </>
                )}

                {['HTTP Upload', 'HTTPS Upload'].includes(activeTestPlanObj.type || '') && (
                  <>
                    <div 
                      className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white active:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setIsDisconnectionModeSelectorOpen(true)}
                    >
                      <span className="text-sm font-medium text-slate-700">Disconnection Mode</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-slate-500">{activeTestPlanObj.disconnectionMode}</span>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Upload URL</span>
                      <input 
                        type="text"
                        value={activeTestPlanObj.uploadUrl || ''}
                        onChange={(e) => {
                          updateActiveTestPlan({ uploadUrl: e.target.value })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500 w-2/3"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">File Size(KB)[1, 2097152]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.fileSize || 1024}
                        onChange={(e) => {
                          updateActiveTestPlan({ fileSize: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Connect Timeout(s)[5, 60]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.connectTimeout || 60}
                        onChange={(e) => {
                          updateActiveTestPlan({ connectTimeout: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Test Timeout(s)[5, 120]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.testTimeout || 60}
                        onChange={(e) => {
                          updateActiveTestPlan({ testTimeout: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Thread Count[1, 30]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.threadCount || 5}
                        onChange={(e) => {
                          updateActiveTestPlan({ threadCount: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Test Interval(s)[1, 900]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.testInterval || 10}
                        onChange={(e) => {
                          updateActiveTestPlan({ testInterval: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                  </>
                )}

                {activeTestPlanObj.type === 'Ping' && (
                  <>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Service Tag</span>
                      <input 
                        type="text"
                        placeholder="Please input"
                        value={activeTestPlanObj.serviceTag}
                        onChange={(e) => {
                          updateActiveTestPlan({ serviceTag: e.target.value })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Protocol Type</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-slate-500">{activeTestPlanObj.protocolType?.join(', ')}</span>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Destination</span>
                      <input 
                        type="text"
                        value={activeTestPlanObj.destination}
                        onChange={(e) => {
                          updateActiveTestPlan({ destination: e.target.value })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Packet Size[0, 65507]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.packetSize}
                        onChange={(e) => {
                          updateActiveTestPlan({ packetSize: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Fragment Flag</span>
                      <button 
                        onClick={() => {
                          updateActiveTestPlan({ fragmentFlag: !activeTestPlanObj.fragmentFlag })
                        }}
                        className={`w-10 h-5 rounded-full relative transition-colors ${activeTestPlanObj.fragmentFlag ? 'bg-blue-500' : 'bg-slate-200'}`}
                      >
                        <motion.div 
                          animate={{ x: activeTestPlanObj.fragmentFlag ? 22 : 2 }}
                          className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Test Timeout(s)[1, 60]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.testTimeout}
                        onChange={(e) => {
                          updateActiveTestPlan({ testTimeout: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Test Interval(ms)[1, 60000]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.testInterval}
                        onChange={(e) => {
                          updateActiveTestPlan({ testInterval: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Test Count[1, 9999]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.testCount}
                        onChange={(e) => {
                          updateActiveTestPlan({ testCount: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Auto Screenshot</span>
                      <button 
                        onClick={() => {
                          updateActiveTestPlan({ autoScreenshot: !activeTestPlanObj.autoScreenshot })
                        }}
                        className={`w-10 h-5 rounded-full relative transition-colors ${activeTestPlanObj.autoScreenshot ? 'bg-blue-500' : 'bg-slate-200'}`}
                      >
                        <motion.div 
                          animate={{ x: activeTestPlanObj.autoScreenshot ? 22 : 2 }}
                          className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Initiate Network Service Access</span>
                      <button 
                        onClick={() => {
                          updateActiveTestPlan({ initiateNetworkServiceAccess: !activeTestPlanObj.initiateNetworkServiceAccess })
                        }}
                        className={`w-10 h-5 rounded-full relative transition-colors ${activeTestPlanObj.initiateNetworkServiceAccess ? 'bg-blue-500' : 'bg-slate-200'}`}
                      >
                        <motion.div 
                          animate={{ x: activeTestPlanObj.initiateNetworkServiceAccess ? 22 : 2 }}
                          className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                        />
                      </button>
                    </div>
                  </>
                )}

                {activeTestPlanObj.type === 'Voice Call MOC' && (
                  <>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Service Tag</span>
                      <input 
                        type="text"
                        placeholder="Please input"
                        value={activeTestPlanObj.serviceTag}
                        onChange={(e) => {
                          updateActiveTestPlan({ serviceTag: e.target.value })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Destination Number</span>
                      <input 
                        type="text"
                        value={activeTestPlanObj.destinationNumber}
                        onChange={(e) => {
                          updateActiveTestPlan({ destinationNumber: e.target.value })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div 
                      className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white active:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setIsOriginateModeSelectorOpen(true)}
                    >
                      <span className="text-sm font-medium text-slate-700">Originate Mode</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-slate-500">{activeTestPlanObj.originateMode}</span>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                    <div 
                      className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white active:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setIsCallTypeSelectorOpen(true)}
                    >
                      <span className="text-sm font-medium text-slate-700">Call Type</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-slate-500">{activeTestPlanObj.callType}</span>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Setup Timeout(s)[1, 120]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.setupTimeout}
                        onChange={(e) => {
                          updateActiveTestPlan({ setupTimeout: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Call Duration(s)[1, 3600]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.callDuration}
                        onChange={(e) => {
                          updateActiveTestPlan({ callDuration: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Test Interval(s)[1, 900]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.testInterval}
                        onChange={(e) => {
                          updateActiveTestPlan({ testInterval: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Exceptional Interval(s)[1, 900]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.exceptionalInterval}
                        onChange={(e) => {
                          updateActiveTestPlan({ exceptionalInterval: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div 
                      className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white active:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setIsCallModeSelectorOpen(true)}
                    >
                      <span className="text-sm font-medium text-slate-700">Call Mode</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-slate-500">{activeTestPlanObj.callMode}</span>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Test Count[1, 9999]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.testCount}
                        onChange={(e) => {
                          updateActiveTestPlan({ testCount: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                  </>
                )}

                {activeTestPlanObj.type === 'Detach & Attach' && (
                  <>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Service Tag</span>
                      <input 
                        type="text"
                        placeholder="Please input"
                        value={activeTestPlanObj.serviceTag}
                        onChange={(e) => {
                          updateActiveTestPlan({ serviceTag: e.target.value })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Test Interval(s)[1, 900]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.testInterval}
                        onChange={(e) => {
                          updateActiveTestPlan({ testInterval: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Test Count[1, 9999]</span>
                      <input 
                        type="number"
                        value={activeTestPlanObj.testCount}
                        onChange={(e) => {
                          updateActiveTestPlan({ testCount: Number(e.target.value) })
                        }}
                        className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                      <span className="text-sm font-medium text-slate-700">Auto Screenshot</span>
                      <button 
                        onClick={() => {
                          updateActiveTestPlan({ autoScreenshot: !activeTestPlanObj.autoScreenshot })
                        }}
                        className={`w-10 h-5 rounded-full relative transition-colors ${activeTestPlanObj.autoScreenshot ? 'bg-blue-500' : 'bg-slate-200'}`}
                      >
                        <motion.div 
                          animate={{ x: activeTestPlanObj.autoScreenshot ? 22 : 2 }}
                          className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                        />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-white flex items-center gap-3 shrink-0">
              <button 
                onClick={closeTestPlanModal}
                className="flex-1 py-3 border border-slate-200 rounded-full text-slate-600 font-semibold active:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  const errors = validateTestPlan(activeTestPlanObj);
                  if (errors.length > 0) {
                    setToastMessage({ title: 'Validation Error', message: errors[0], type: 'exit' });
                    setTimeout(() => setToastMessage(null), 3000);
                    return;
                  }
                  closeTestPlanModal();
                }}
                className="flex-2 py-3 bg-blue-500 text-white rounded-full font-semibold shadow-lg shadow-blue-200 active:bg-blue-600 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        )}

            {/* Protocol Selector Bottom Sheet */}
            <AnimatePresence>
              {isProtocolSelectorOpen && (
                <div className="fixed inset-0 z-[110] flex flex-col justify-end">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsProtocolSelectorOpen(false)}
                    className="absolute inset-0 bg-black/40"
                  />
                  <motion.div 
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="relative bg-white rounded-t-2xl overflow-hidden flex flex-col max-h-[60vh]"
                  >
                                  <div className="p-4 border-b border-slate-100 flex items-center justify-between shadow-sm relative z-10">
                <h3 className="font-bold text-slate-800">Load Test Plan Template</h3>
                <button onClick={() => setIsLoadTemplateModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto">
                {/* Default Plans Section */}
                <div className="px-4 py-2 bg-slate-50/80 backdrop-blur border-b border-slate-100 flex items-center sticky top-0 z-10">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Default Plans</span>
                </div>
                <div className="p-2 space-y-1">
                  {Object.keys(DEFAULT_TEST_PLANS).map(type => (
                    <div 
                      key={type} 
                      className="flex items-center p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors cursor-pointer group"
                      onClick={() => {
                        if (editingTestPlanIdx !== null || editingScriptConfigId !== null) {
                          const plan = DEFAULT_TEST_PLANS[type];
                          const errors = validateTestPlan(plan);
                          if (errors.length > 0) {
                            setToastMessage({ title: 'Validation Error', message: errors[0], type: 'exit' });
                            setTimeout(() => setToastMessage(null), 3000);
                            return;
                          }
                          updateActiveTestPlan(plan);
                          setIsLoadTemplateModalOpen(false);
                        }
                      }}
                    >
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-slate-800">{type}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Custom Templates Section */}
                <div className="px-4 py-2 bg-slate-50/80 backdrop-blur border-y border-slate-100 flex items-center sticky top-0 z-10 mt-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Custom Templates</span>
                </div>
                <div className="p-2 space-y-1">
                  {Object.keys(customTestPlans).length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500 italic">
                      No custom templates saved yet.
                    </div>
                  ) : (
                    Object.entries(customTestPlans).map(([name, plan]) => {
                      const testPlan = plan as TestPlanConfig;
                      return (
                        <div key={name} className="flex items-center p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors cursor-pointer group">
                          <div 
                            className="flex-1"
                            onClick={() => {
                              if (editingTestPlanIdx !== null || editingScriptConfigId !== null) {
                                const errors = validateTestPlan(testPlan);
                                if (errors.length > 0) {
                                  setToastMessage({ title: 'Validation Error', message: errors[0], type: 'exit' });
                                  setTimeout(() => setToastMessage(null), 3000);
                                  return;
                                }
                                updateActiveTestPlan({ ...testPlan });
                                setIsLoadTemplateModalOpen(false);
                              }
                            }}
                          >
                            <span className="text-sm font-semibold text-slate-800">{name}</span>
                            <span className="text-xs text-slate-500 ml-2 border border-slate-200 px-1.5 py-0.5 rounded bg-white">
                              {testPlan.type}
                            </span>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Are you sure you want to delete the template '${name}'?`)) {
                                setCustomTestPlans(prev => {
                                  const newData = { ...prev };
                                  delete newData[name];
                                  return newData;
                                });
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-md transition-all ml-2"
                            title="Delete template"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Disconnection Mode Selector Bottom Sheet */}
            <AnimatePresence>
              {isDisconnectionModeSelectorOpen && (
                <div className="fixed inset-0 z-[110] flex flex-col justify-end">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsDisconnectionModeSelectorOpen(false)}
                    className="absolute inset-0 bg-black/40"
                  />
                  <motion.div 
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="relative bg-white rounded-t-2xl overflow-hidden flex flex-col max-h-[60vh]"
                  >
                                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-bold text-slate-800">Select Test Type or Template</h4>
                  <button onClick={() => setIsTestTypeSelectorOpen(false)} className="text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="overflow-y-auto pb-4">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center sticky top-0">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Default Test Plans</span>
                  </div>
                  {Object.keys(DEFAULT_TEST_PLANS).map(type => (
                    <div 
                      key={type}
                      onClick={() => {
                        const plan = DEFAULT_TEST_PLANS[type];
                        const errors = validateTestPlan(plan);
                        if (errors.length > 0) {
                          setToastMessage({ title: 'Validation Error', message: errors[0], type: 'exit' });
                          setTimeout(() => setToastMessage(null), 3000);
                          return;
                        }
                        updateActiveTestPlan(plan)
                        setIsTestTypeSelectorOpen(false);
                      }}
                      className="flex items-center justify-between px-4 py-4 border-b border-slate-50 active:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <span className={`text-sm ${
                        activeTestPlanType === type && !activeTestPlanObj?.isCustom
                          ? 'text-blue-500 font-bold' : 'text-slate-700'
                      }`}>
                        {type}
                      </span>
                      {activeTestPlanType === type && !activeTestPlanObj?.isCustom && (
                        <Check className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                  ))}

                  {Object.keys(customTestPlans).length > 0 && (
                    <>
                      <div className="px-4 py-2 bg-slate-50 border-y border-slate-100 flex items-center sticky top-0 mt-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Custom Templates</span>
                      </div>
                      {Object.entries(customTestPlans).map(([name, plan]) => {
                        const testPlan = plan as TestPlanConfig;
                        // Let's add a pseudo field to let us track custom vs default selection easily if we wanted,
                        // or just compare by deep equality. For now, since the actual type matches the default, it's fine.
                        return (
                          <div 
                            key={name}
                            onClick={() => {
                              const errors = validateTestPlan(testPlan);
                              if (errors.length > 0) {
                                setToastMessage({ title: 'Validation Error', message: errors[0], type: 'exit' });
                                setTimeout(() => setToastMessage(null), 3000);
                                return;
                              }
                              updateActiveTestPlan({ ...testPlan, isCustom: true, customName: name })
                              setIsTestTypeSelectorOpen(false);
                            }}
                            className="flex items-center justify-between px-4 py-4 border-b border-slate-50 active:bg-slate-50 transition-colors cursor-pointer group"
                          >
                            <div className="flex flex-col gap-1">
                              <span className={`text-sm font-semibold ${
                                activeTestPlanObj?.customName === name 
                                  ? 'text-blue-600' : 'text-slate-800'
                              }`}>
                                {name}
                              </span>
                              <span className="text-xs text-slate-500">Base: {testPlan.type}</span>
                            </div>
                            {activeTestPlanObj?.customName === name && (
                              <Check className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isProtocolSelectorOpen && (
            <div className="fixed inset-0 z-[110] flex flex-col justify-end">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsProtocolSelectorOpen(false)}
                className="absolute inset-0 bg-black/40"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative bg-white rounded-t-2xl overflow-hidden flex flex-col max-h-[60vh]"
              >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-bold text-slate-800">Select Protocol</h4>
                  <button onClick={() => setIsProtocolSelectorOpen(false)} className="text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="overflow-y-auto">
                  {['FTP', 'FTPS', 'FTPES', 'SFTP', 'HTTP', 'HTTPS'].map(proto => (
                    <div 
                      key={proto}
                      onClick={() => {
                        updateActiveTestPlan({ protocolType: proto })
                        setIsProtocolSelectorOpen(false);
                      }}
                      className="flex items-center justify-between px-4 py-4 border-b border-slate-50 active:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          activeTestPlanObj?.protocolType === proto 
                            ? 'bg-blue-500 border-blue-500' : 'border-slate-300 bg-white'
                        }`}>
                          {activeTestPlanObj?.protocolType === proto && (
                            <Check className="w-3.5 h-3.5 text-white" />
                          )}
                        </div>
                        <span className={`text-sm ${
                          activeTestPlanObj?.protocolType === proto 
                            ? 'text-blue-500 font-bold' : 'text-slate-700'
                        }`}>
                          {proto}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isDisconnectionModeSelectorOpen && (
            <div className="fixed inset-0 z-[110] flex flex-col justify-end">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsDisconnectionModeSelectorOpen(false)}
                className="absolute inset-0 bg-black/40"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative bg-white rounded-t-2xl overflow-hidden flex flex-col max-h-[60vh]"
              >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-bold text-slate-800">Select Disconnection Mode</h4>
                  <button onClick={() => setIsDisconnectionModeSelectorOpen(false)} className="text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="overflow-y-auto">
                  {['Never', 'Each Test', 'Each File'].map(mode => (
                    <div 
                      key={mode}
                      onClick={() => {
                        updateActiveTestPlan({ disconnectionMode: mode })
                        setIsDisconnectionModeSelectorOpen(false);
                      }}
                      className="flex items-center justify-between px-4 py-4 border-b border-slate-50 active:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <span className={`text-sm ${
                        activeTestPlanObj?.disconnectionMode === mode 
                          ? 'text-blue-500 font-bold' : 'text-slate-700'
                      }`}>
                        {mode}
                      </span>
                      {activeTestPlanObj?.disconnectionMode === mode && (
                        <Check className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isOriginateModeSelectorOpen && (
            <div className="fixed inset-0 z-[110] flex flex-col justify-end">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOriginateModeSelectorOpen(false)}
                className="absolute inset-0 bg-black/40"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative bg-white rounded-t-2xl overflow-hidden flex flex-col max-h-[60vh]"
              >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-bold text-slate-800">Select Originate Mode</h4>
                  <button onClick={() => setIsOriginateModeSelectorOpen(false)} className="text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="overflow-y-auto">
                  {['Normal', 'Auto'].map(mode => (
                    <div 
                      key={mode}
                      onClick={() => {
                        updateActiveTestPlan({ originateMode: mode })
                        setIsOriginateModeSelectorOpen(false);
                      }}
                      className="flex items-center justify-between px-4 py-4 border-b border-slate-50 active:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <span className={`text-sm ${
                        activeTestPlanObj?.originateMode === mode 
                          ? 'text-blue-500 font-bold' : 'text-slate-700'
                      }`}>
                        {mode}
                      </span>
                      {activeTestPlanObj?.originateMode === mode && (
                        <Check className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isCallTypeSelectorOpen && (
            <div className="fixed inset-0 z-[110] flex flex-col justify-end">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCallTypeSelectorOpen(false)}
                className="absolute inset-0 bg-black/40"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative bg-white rounded-t-2xl overflow-hidden flex flex-col max-h-[60vh]"
              >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-bold text-slate-800">Select Call Type</h4>
                  <button onClick={() => setIsCallTypeSelectorOpen(false)} className="text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="overflow-y-auto">
                  {['Voice', 'Video'].map(type => (
                    <div 
                      key={type}
                      onClick={() => {
                        updateActiveTestPlan({ callType: type })
                        setIsCallTypeSelectorOpen(false);
                      }}
                      className="flex items-center justify-between px-4 py-4 border-b border-slate-50 active:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <span className={`text-sm ${
                        activeTestPlanObj?.callType === type 
                          ? 'text-blue-500 font-bold' : 'text-slate-700'
                      }`}>
                        {type}
                      </span>
                      {activeTestPlanObj?.callType === type && (
                        <Check className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isCallModeSelectorOpen && (
            <div className="fixed inset-0 z-[110] flex flex-col justify-end">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCallModeSelectorOpen(false)}
                className="absolute inset-0 bg-black/40"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative bg-white rounded-t-2xl overflow-hidden flex flex-col max-h-[60vh]"
              >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-bold text-slate-800">Select Call Mode</h4>
                  <button onClick={() => setIsCallModeSelectorOpen(false)} className="text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="overflow-y-auto">
                  {['CS', 'VoLTE', 'VoNR'].map(mode => (
                    <div 
                      key={mode}
                      onClick={() => {
                        updateActiveTestPlan({ callMode: mode })
                        setIsCallModeSelectorOpen(false);
                      }}
                      className="flex items-center justify-between px-4 py-4 border-b border-slate-50 active:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <span className={`text-sm ${
                        activeTestPlanObj?.callMode === mode 
                          ? 'text-blue-500 font-bold' : 'text-slate-700'
                      }`}>
                        {mode}
                      </span>
                      {activeTestPlanObj?.callMode === mode && (
                        <Check className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {isLockModalOpen && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-[340px] overflow-hidden flex flex-col"
            >
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-semibold text-slate-200">Network Configuration</h3>
                </div>
                <button onClick={() => setIsLockModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col max-h-[70vh] overflow-y-auto scrollbar-hide">
                {/* Target Device Interface */}
                <div className="p-4 border-b border-slate-800">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2 block">Target Device Interface</label>
                  <select 
                    value={tempDeviceInterface}
                    onChange={(e) => setTempDeviceInterface(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option>Android (ADB/Intent)</option>
                    <option>Modem (Serial AT)</option>
                  </select>
                </div>
                {/* Preferred Network Type */}
                <div className="p-4 border-b border-slate-800">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2 block">Preferred Network Type</label>
                  <select 
                    value={tempNetworkType}
                    onChange={(e) => setTempNetworkType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option>5G (Recommended)</option>
                    <option>4G/3G/2G (Auto)</option>
                    <option>3G/2G (Auto)</option>
                    <option>3G Only</option>
                    <option>2G Only</option>
                  </select>
                </div>

                {/* Data Roaming */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-200">Data Roaming</p>
                    <p className="text-[10px] text-slate-500">Connect to data services when roaming</p>
                  </div>
                  <button 
                    onClick={() => setTempRoaming(!tempRoaming)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${tempRoaming ? 'bg-emerald-600' : 'bg-slate-700'}`}
                  >
                    <motion.div 
                      animate={{ x: tempRoaming ? 22 : 2 }}
                      className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>

                {/* Band Locking Toggle */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-200">Band Locking</p>
                    <p className="text-[10px] text-slate-500">Enable manual band selection</p>
                  </div>
                  <button 
                    onClick={() => setTempBandLockingEnabled(!tempBandLockingEnabled)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${tempBandLockingEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
                  >
                    <motion.div 
                      animate={{ x: tempBandLockingEnabled ? 22 : 2 }}
                      className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>

                {/* Technology Tabs */}
                {tempBandLockingEnabled && (
                <div className="p-4 bg-slate-950/30 transition-opacity duration-300 opacity-100">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Technology & Band Lock</label>
                    {tempBandLockingEnabled && tempBands.length > 0 && (
                      <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30 font-bold">
                        {tempBands.length} SELECTED
                      </span>
                    )}
                  </div>
                  <div className="flex overflow-x-auto scrollbar-hide gap-1 mb-4">
                    {Object.keys(MOCK_BANDS).map((tech) => (
                      <button
                        key={tech}
                        onClick={() => {
                          setTempTechs(prev => 
                            prev.includes(tech) 
                              ? prev.filter(t => t !== tech)
                              : [...prev, tech]
                          );
                        }}
                        className={`px-3 py-1.5 text-[10px] font-mono rounded-md whitespace-nowrap transition-colors border ${
                          tempTechs.includes(tech)
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-transparent'
                        }`}
                      >
                        {tech}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mb-3 mt-4">
                    <div className="flex items-center gap-1.5">
                      <Filter className="w-3 h-3 text-emerald-500" />
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-tight">Available Bands</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const currentlyVisibleBands = tempTechs.flatMap(t => (MOCK_BANDS[t] || []))
                            .filter(b => b.toLowerCase().includes(bandSearchQuery.toLowerCase()));
                          setTempBands(prev => Array.from(new Set([...prev, ...currentlyVisibleBands])));
                        }}
                        className="text-[10px] text-blue-500 hover:text-blue-400 font-bold uppercase tracking-wider"
                      >
                        Select All
                      </button>
                      <button 
                        onClick={() => {
                          const currentlyVisibleBands = tempTechs.flatMap(t => (MOCK_BANDS[t] || []))
                            .filter(b => b.toLowerCase().includes(bandSearchQuery.toLowerCase()));
                          setTempBands(prev => prev.filter(b => !currentlyVisibleBands.includes(b)));
                        }}
                        className="text-[10px] text-slate-500 hover:text-slate-400 font-bold uppercase tracking-wider"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                  
                  {/* Band Search Input */}
                  <div className="mb-3 relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      placeholder={tempTechs.length > 0 ? `Search bands in ${tempTechs.join(', ')}...` : "Search bands..."}
                      value={bandSearchQuery}
                      onChange={(e) => setBandSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {tempTechs.length === 0 ? (
                      <div className="col-span-3 py-8 text-center bg-slate-900/50 rounded-lg border border-dashed border-slate-800">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest px-4">
                          Select a technology above to view available bands
                        </p>
                      </div>
                    ) : (
                      tempTechs.flatMap(t => (MOCK_BANDS[t] || []).map(b => ({ name: b, tech: t })))
                        .filter(item => item.name.toLowerCase().includes(bandSearchQuery.toLowerCase()))
                        .map(item => {
                          const isSelected = tempBands.includes(item.name);
                          return (
                            <button
                              key={`${item.tech}-${item.name}`}
                              onClick={() => {
                                setTempBands(prev => 
                                  prev.includes(item.name) 
                                    ? prev.filter(b => b !== item.name)
                                    : [...prev, item.name]
                                );
                              }}
                              className={`relative px-2 py-2 text-[10px] font-mono rounded border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                                isSelected
                                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                              }`}
                            >
                              {isSelected && (
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border border-slate-900" />
                              )}
                              <span className={`text-[7px] px-1 rounded-sm border uppercase font-black tracking-tighter ${
                                item.tech === '5G' ? 'text-purple-400 border-purple-500/30 bg-purple-500/5' :
                                item.tech === '4G' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' :
                                item.tech === '3G' ? 'text-blue-400 border-blue-500/30 bg-blue-500/5' :
                                'text-amber-400 border-amber-500/30 bg-amber-500/5'
                              }`}>
                                {item.tech}
                              </span>
                              <span className="font-bold">{item.name}</span>
                            </button>
                          );
                        })
                    )}
                  </div>

                  {/* Network Scan Button */}
                  <div className="mb-4">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        handleManualAtCommand(undefined, 'AT+COPS=?');
                      }}
                      disabled={isSendingCommand}
                      className={`w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                        isSendingCommand 
                          ? 'bg-blue-600/10 border border-blue-500/20 text-blue-500/50 cursor-not-allowed'
                          : 'bg-blue-600/20 border border-blue-500/50 text-blue-400 hover:bg-blue-600/30 shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_20px_rgba(59,130,246,0.25)]'
                      }`}
                    >
                      {isSendingCommand ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                          Scanning (+COPS=?)
                        </>
                      ) : (
                        <>
                          <Search className="w-3.5 h-3.5" />
                          Scan Available Networks (+COPS=?)
                        </>
                      )}
                    </button>
                  </div>

                  {/* AT Command Terminal Simulation */}
                  <div className="mt-4 bg-black rounded-lg border border-slate-800 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-900/50">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-3 h-3 text-emerald-500" />
                        <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Modem Terminal</span>
                      </div>
                      <button 
                        onClick={() => setTerminalLogs(['Modem connected on /dev/ttyUSB2', 'READY'])}
                        className="text-[9px] text-slate-500 hover:text-slate-300 uppercase font-bold"
                      >
                        Clear
                      </button>
                    </div>
                    
                    <div 
                      ref={terminalRef}
                      className="p-3 font-mono text-[9px] h-32 overflow-y-auto scrollbar-hide flex flex-col gap-1 bg-black/80"
                    >
                      {terminalLogs.map((log, i) => (
                        <div key={i} className={log.startsWith('>') ? 'text-emerald-400' : log === 'ERROR' ? 'text-red-400' : 'text-slate-400'}>
                          {log}
                        </div>
                      ))}
                      {isSendingCommand && (
                        <div className="flex items-center gap-1 text-emerald-500">
                          <span className="animate-pulse">_</span>
                        </div>
                      )}
                    </div>

                    <form 
                      onSubmit={handleManualAtCommand}
                      className="flex items-center border-t border-slate-800 bg-slate-950 px-2 py-1.5"
                    >
                      <span className="text-emerald-500 text-[10px] mr-1.5 font-mono font-bold">{'>'}</span>
                      <input 
                        type="text"
                        value={manualAtCommand}
                        onChange={(e) => setManualAtCommand(e.target.value)}
                        placeholder="Enter AT command..."
                        disabled={isSendingCommand}
                        className="flex-1 bg-transparent border-none text-[10px] text-emerald-400 font-mono outline-none placeholder:text-slate-700"
                      />
                    </form>
                  </div>
                </div>
                )}
              </div>

              <div className="px-4 py-3 border-t border-slate-800 bg-slate-950 flex justify-end gap-2 shrink-0">
                <button
                  onClick={() => {
                    setTempTechs(lockedTechs);
                    setTempBands(lockedBands);
                    setTempRoaming(isDataRoamingEnabled);
                    setTempBandLockingEnabled(isBandLockingEnabled);
                    setTempNetworkType(preferredNetworkType);
                    setTempDeviceInterface(deviceInterface);
                    setTerminalLogs(tempDeviceInterface === 'Android (ADB/Intent)' 
                      ? ['ADB service ready', 'Device connected: SN-X9202301', 'READY']
                      : ['Modem connected on /dev/ttyUSB2', 'READY']
                    );
                    setBandSearchQuery('');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  Reset
                </button>
                <button
                  disabled={isSendingCommand}
                  onClick={async () => {
                    setIsSendingCommand(true);
                    const logs = [];
                    
                    if (tempDeviceInterface === 'Android (ADB/Intent)') {
                      logs.push('> Initialize ADB root context...');
                      setTerminalLogs([...logs]);
                      await new Promise(r => setTimeout(r, 400));
                      logs.push('OK');
                      
                      const networkTypeMode = tempNetworkType.includes('5G') ? 11 : 9;
                      logs.push(`> adb shell settings put global preferred_network_mode ${networkTypeMode}`);
                      setTerminalLogs([...logs]);
                      await new Promise(r => setTimeout(r, 500));
                      logs.push('OK');

                      if (tempBandLockingEnabled && tempBands.length > 0) {
                        for (const tech of tempTechs) {
                          const bandsByTech = tempBands.filter(b => MOCK_BANDS[tech].includes(b));
                          if (bandsByTech.length > 0) {
                            const bandStr = bandsByTech.join(',');
                            const getTechName = (t: string) => t === '2G' ? 'GSM' : t === '3G' ? 'WCDMA' : t === '4G' ? 'LTE' : 'NR';
                            logs.push(`> adb shell am broadcast -a com.engineering.lock -e tech ${getTechName(tech)} -e bands "${bandStr}"`);
                            setTerminalLogs([...logs]);
                            await new Promise(r => setTimeout(r, 600));
                          }
                        }
                        logs.push('Broadcast sequence completed');
                        setTerminalLogs([...logs]);
                      } else if (!tempBandLockingEnabled && isBandLockingEnabled) {
                        logs.push(`> adb shell am broadcast -a com.engineering.unlock_all`);
                        setTerminalLogs([...logs]);
                        await new Promise(r => setTimeout(r, 600));
                        logs.push('Broadcast completed: result=1');
                        setTerminalLogs([...logs]);
                      }

                      logs.push('> adb shell svc data disable && sleep 1 && svc data enable');
                      setTerminalLogs([...logs]);
                      await new Promise(r => setTimeout(r, 1200));
                      logs.push('RADIO RESTARTED...');
                    } else {
                      logs.push(`> AT+QNWPREFCFG="mode_pref",${tempNetworkType.includes('5G') ? 'NR5G' : 'LTE'}`);
                      setTerminalLogs([...logs]);
                      await new Promise(r => setTimeout(r, 600));
                      logs.push('OK');
                      setTerminalLogs([...logs]);
                      
                      if (tempBandLockingEnabled && tempBands.length > 0) {
                        for (const tech of tempTechs) {
                          const bandsByTech = tempBands.filter(b => MOCK_BANDS[tech].includes(b));
                          if (bandsByTech.length > 0) {
                            const bandStr = bandsByTech.join(':');
                            const getTechName = (t: string) => t === '2G' ? 'GSM' : t === '3G' ? 'WCDMA' : t === '4G' ? 'LTE' : 'NR';
                            logs.push(`> AT+QNWLOCK="attr",${getTechName(tech)},${bandStr}`);
                            setTerminalLogs([...logs]);
                            await new Promise(r => setTimeout(r, 600));
                            logs.push('OK');
                          }
                        }
                        setTerminalLogs([...logs]);
                      } else if (!tempBandLockingEnabled && isBandLockingEnabled) {
                        logs.push(`> AT+QNWLOCK="attr","clear"`);
                        setTerminalLogs([...logs]);
                        await new Promise(r => setTimeout(r, 600));
                        logs.push('OK');
                        setTerminalLogs([...logs]);
                      }

                      logs.push('> AT+CFUN=1,1');
                      setTerminalLogs([...logs]);
                      await new Promise(r => setTimeout(r, 1000));
                      logs.push('MODEM REBOOTING...');
                    }
                    
                    setTerminalLogs([...logs]);
                    await new Promise(r => setTimeout(r, 500));
                    
                    setDeviceInterface(tempDeviceInterface);
                    setLockedTechs(tempBandLockingEnabled ? tempTechs : []);
                    setLockedBands(tempBandLockingEnabled ? tempBands : []);
                    setIsBandLockingEnabled(tempBandLockingEnabled);
                    setIsDataRoamingEnabled(tempRoaming);
                    setPreferredNetworkType(tempNetworkType);
                    setIsSendingCommand(false);
                    
                    setToastMessage({ 
                      title: 'Network Config',
                      message: tempBandLockingEnabled ? `Network locked to ${tempTechs.join(', ')}` : 'Network lock disabled', 
                      type: 'enter' 
                    });
                    setTimeout(() => {
                      setToastMessage(null);
                      setIsLockModalOpen(false);
                      setTerminalLogs(tempDeviceInterface === 'Android (ADB/Intent)' 
                        ? ['ADB service ready', 'Device connected: SN-X9202301', 'READY']
                        : ['Modem connected on /dev/ttyUSB2', 'READY']
                      );
                    }, 2000);
                  }}
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-500 text-slate-950 rounded-md hover:bg-emerald-400 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSendingCommand ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  {isSendingCommand ? (tempDeviceInterface === 'Android (ADB/Intent)' ? 'Sending ADB...' : 'Sending AT...') : 'Apply & Lock'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
        
        {/* Results Modal */}
        {isResultsModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between shadow-sm relative z-10">
                <div className="flex items-center gap-2">
                  <TableIcon className="w-5 h-5 text-blue-500" />
                  <h3 className="font-bold text-slate-800">Test Results</h3>
                </div>
                <button onClick={() => setIsResultsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-auto bg-slate-50 p-2">
                {testResults.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    No test data available.
                  </div>
                ) : (
                  <div className="bg-white border text-left border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-100/50 border-b border-gray-200 text-xs font-semibold text-slate-600 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                          {[
                            { key: 'timestamp', label: 'Timestamp' },
                            { key: 'phase', label: 'Phase' },
                            { key: 'ssRsrp', label: 'RSRP (dBm)' },
                            { key: 'ssSinr', label: 'SINR (dB)' },
                            { key: 'dl', label: 'DL Speed (Mbps)' },
                            { key: 'ul', label: 'UL Speed (Mbps)' },
                            { key: 'ping', label: 'Ping (ms)' }
                          ].map(col => (
                            <th 
                              key={col.key}
                              onClick={() => requestSort(col.key)}
                              className={`px-4 py-3 cursor-pointer transition-colors select-none group ${sortConfig?.key === col.key ? 'bg-blue-50/50' : 'hover:bg-slate-100'}`}
                            >
                              <div className="flex items-center gap-1.5">
                                {col.label}
                                {sortConfig?.key === col.key ? (
                                  sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-slate-600">
                        {sortedTestResults.map((result, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-2 font-mono text-xs text-slate-500">{result.timestamp}</td>
                            <td className="px-4 py-2">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                                {result.phase?.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-2 font-mono">{result.ssRsrp ?? result.rsrp ?? '-'}</td>
                            <td className="px-4 py-2 font-mono">{result.ssSinr ?? result.sinr ?? '-'}</td>
                            <td className="px-4 py-2 font-mono text-emerald-600">{result.dl?.toFixed(2) || '-'}</td>
                            <td className="px-4 py-2 font-mono text-emerald-600">{result.ul?.toFixed(2) || '-'}</td>
                            <td className="px-4 py-2 font-mono">{result.ping || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Historical Graph Modal */}
        {isHistoricalGraphOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-slate-100">7-Day Historical Trends</h3>
                </div>
                <button onClick={() => setIsHistoricalGraphOpen(false)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto flex-1 space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-2">RSRP Trend (dBm)</h4>
                  <div className="h-48 w-full bg-slate-950 rounded-lg border border-slate-800 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[
                        { date: 'Mon', nrRsrp: -85, lteRsrp: -90 },
                        { date: 'Tue', nrRsrp: -82, lteRsrp: -88 },
                        { date: 'Wed', nrRsrp: -88, lteRsrp: -92 },
                        { date: 'Thu', nrRsrp: -80, lteRsrp: -85 },
                        { date: 'Fri', nrRsrp: -78, lteRsrp: -84 },
                        { date: 'Sat', nrRsrp: -85, lteRsrp: -89 },
                        { date: 'Sun', nrRsrp: -83, lteRsrp: -87 },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={[-120, -60]} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px' }}
                          itemStyle={{ color: '#e2e8f0' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        <Line type="monotone" dataKey="nrRsrp" name="NR RSRP" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="lteRsrp" name="LTE RSRP" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-2">SINR Trend (dB)</h4>
                  <div className="h-48 w-full bg-slate-950 rounded-lg border border-slate-800 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[
                        { date: 'Mon', nrSinr: 15, lteSinr: 12 },
                        { date: 'Tue', nrSinr: 18, lteSinr: 14 },
                        { date: 'Wed', nrSinr: 12, lteSinr: 10 },
                        { date: 'Thu', nrSinr: 20, lteSinr: 16 },
                        { date: 'Fri', nrSinr: 22, lteSinr: 18 },
                        { date: 'Sat', nrSinr: 16, lteSinr: 13 },
                        { date: 'Sun', nrSinr: 17, lteSinr: 15 },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={[0, 30]} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px' }}
                          itemStyle={{ color: '#e2e8f0' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        <Line type="monotone" dataKey="nrSinr" name="NR SINR" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="lteSinr" name="LTE SINR" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Map Trace Config Modal */}
        {isTraceConfigOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  <h3 className="font-bold text-slate-100">Map Trace Settings</h3>
                </div>
                <button onClick={() => setIsTraceConfigOpen(false)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2 block">Trace Parameter</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['NR RSRP', 'NR SINR', 'NR PCI', 'LTE RSRP', 'LTE SINR', 'LTE PCI'] as const).map(param => (
                      <button
                        key={param}
                        onClick={() => {
                          setTraceParameter(param);
                          setTraceHistory([]); // Clear history when changing parameter
                        }}
                        className={`px-3 py-2 text-xs font-mono rounded-lg border transition-all ${
                          traceParameter === param 
                            ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {param}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-3">Live Color Legend</p>
                  <div className="space-y-2">
                    {traceParameter.includes('RSRP') ? (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#10b981]" /><span className="text-[11px] text-slate-300">Excellent</span></div>
                          <span className="text-[10px] font-mono text-slate-500">{'>'} -80 dBm</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#22c55e]" /><span className="text-[11px] text-slate-300">Good</span></div>
                          <span className="text-[10px] font-mono text-slate-500">-80 to -95</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#eab308]" /><span className="text-[11px] text-slate-300">Fair</span></div>
                          <span className="text-[10px] font-mono text-slate-500">-95 to -110</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ef4444]" /><span className="text-[11px] text-slate-300">Bad</span></div>
                          <span className="text-[10px] font-mono text-slate-500">{'<'} -110 dBm</span>
                        </div>
                      </>
                    ) : traceParameter.includes('SINR') ? (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#10b981]" /><span className="text-[11px] text-slate-300">Excellent</span></div>
                          <span className="text-[10px] font-mono text-slate-500">{'>'} 15 dB</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#22c55e]" /><span className="text-[11px] text-slate-300">Good</span></div>
                          <span className="text-[10px] font-mono text-slate-500">10 to 15</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#eab308]" /><span className="text-[11px] text-slate-300">Fair</span></div>
                          <span className="text-[10px] font-mono text-slate-500">5 to 10</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ef4444]" /><span className="text-[11px] text-slate-300">Bad</span></div>
                          <span className="text-[10px] font-mono text-slate-500">{'<'} 5 dB</span>
                        </div>
                      </>
                    ) : (
                      <div className="py-4 text-center">
                        <p className="text-[11px] text-slate-400">PCI values are color-coded uniquely for visualization</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setTraceHistory([])}
                    className="flex-1 py-2 text-xs font-bold text-slate-400 bg-slate-950 border border-slate-800 rounded-lg hover:bg-slate-900 transition-colors"
                  >
                    Clear Path
                  </button>
                  <button 
                    onClick={() => setIsTraceConfigOpen(false)}
                    className="flex-1 py-2 text-xs font-bold text-slate-950 bg-blue-500 rounded-lg hover:bg-blue-400 transition-colors"
                  >
                    Apply Settings
                  </button>
                </div>
              </div>

              <div className="px-4 py-3 bg-blue-500/5 border-t border-blue-500/10">
                <div className="flex items-start gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-tight">Android Installation (PWA)</p>
                    <p className="text-[9px] text-slate-500 leading-normal mt-1">To test on your phone: Open this URL in Chrome/Samsung Internet, tap the menu/threedots, and select "Install" or "Add to Home Screen".</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* License Block Overlay */}
        {!isLicenseValid && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[200] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6">
              <ShieldCheck className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter italic">License Required</h2>
            <p className="text-slate-400 text-sm max-w-xs mb-8">
              This terminal is locked. Please provide a valid license key tied to your unique device identity.
            </p>
            
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl">
              <div className="flex flex-col items-center gap-4">
                <div className="w-full text-left">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 shadow-sm block">Your Device ID</label>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-blue-400 font-mono text-sm leading-none flex items-center truncate">
                      {deviceId}
                    </code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(deviceId);
                        setToastMessage({ title: 'Copied', message: 'ID copied to clipboard', type: 'enter' });
                        setTimeout(() => setToastMessage(null), 3000);
                      }}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-slate-300 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="w-full text-left">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 shadow-sm block">License key</label>
                  <input 
                    type="text" 
                    placeholder="Provide serial key from admin"
                    value={licenseKey}
                    onChange={(e) => {
                      setLicenseKey(e.target.value);
                      validateLicense(e.target.value, deviceId);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white font-mono text-xs outline-none focus:border-red-500 transition-colors"
                  />
                </div>

                <button 
                   onClick={() => window.location.reload()}
                   className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black uppercase text-sm rounded shadow-lg shadow-red-600/20 transition-all active:scale-95"
                >
                   Verify License
                </button>
              </div>
            </div>
            
            <div className="mt-8 flex items-center gap-2 text-slate-500">
              <Fingerprint className="w-4 h-4" />
              <span className="text-[10px] font-mono">SECURE HARDWARE BINDING v2.0.4</span>
            </div>
          </div>
        )}

        {/* Help & License Modal */}
        {isHelpModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                    <HelpCircle className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-100 uppercase tracking-tight text-lg">System Guidance</h3>
                    <p className="text-[10px] text-slate-500 font-mono">Terminal Protocol v1.52.0-PRO</p>
                  </div>
                </div>
                <button onClick={() => setIsHelpModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-8">
                {/* Hardware Guidance */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-blue-400" />
                    <h4 className="text-sm font-black text-slate-200 uppercase tracking-widest">Hardware Requirements</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 hover:border-blue-500/30 transition-all">
                      <p className="text-[11px] font-bold text-slate-300 mb-1">Qualcomm Chipset</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed">Recommended for optimal AT command compatibility and band locking reliability.</p>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 hover:border-blue-500/30 transition-all">
                      <p className="text-[11px] font-bold text-slate-300 mb-1">Root Access</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed">Required if running natively to interface with Radio Interface Layer (RIL) via sysfs.</p>
                    </div>
                  </div>
                </section>

                {/* License Information */}
                <section className="space-y-4 pt-6 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <h4 className="text-sm font-black text-slate-200 uppercase tracking-widest">Cloud Account & License</h4>
                  </div>
                  
                  <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-inner space-y-5">
                    {/* Auth Status */}
                    <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/50">
                      {!user ? (
                        <div className="flex flex-col gap-3">
                          <p className="text-[10px] text-slate-500 font-mono text-center">To enable Cloud Sync, please sign in with your authorized Google account.</p>
                          <button 
                            onClick={async () => {
                              try {
                                await loginWithGoogle();
                                setToastMessage({ title: 'Success', message: 'Logged in successfully', type: 'enter' });
                              } catch (e: any) {
                                setToastMessage({ title: 'Error', message: e.message, type: 'exit' });
                              }
                              setTimeout(() => setToastMessage(null), 3000);
                            }}
                            className="w-full py-2 bg-white text-black font-bold rounded-lg text-xs flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            Sign in with Google
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {user.photoURL ? (
                                <img src={user.photoURL} className="w-7 h-7 rounded-full border border-blue-500/30" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                  <UserIcon className="w-3.5 h-3.5 text-blue-400" />
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-white truncate max-w-[120px]">{user.displayName}</span>
                                <span className="text-[8px] text-slate-500 truncate max-w-[120px] font-mono">{user.email}</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => auth.signOut()}
                              className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all border border-red-500/20"
                              title="Sign Out"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {isAdmin && (
                            <button 
                              onClick={() => {
                                setIsAdminDashboardOpen(true);
                                setIsHelpModalOpen(false);
                              }}
                              className="w-full py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold rounded-lg text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600/30 transition-all"
                            >
                              <Layout className="w-3.5 h-3.5" />
                              Open Admin Dashboard
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Device ID</span>
                        <code className="text-xs font-mono text-blue-400 select-all">{deviceId}</code>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Status</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          isLicenseValid ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}>
                          {isLicenseValid ? 'Activated' : 'Unauthorized'}
                        </span>
                      </div>

                      {licenseExpiry && (
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Expires On</span>
                          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(licenseExpiry).toLocaleDateString()}
                          </div>
                        </div>
                      )}

                      <div className="pt-2">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 block">Update Serial Key</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={licenseKey}
                            onChange={(e) => setLicenseKey(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-blue-500 outline-none transition-all"
                            placeholder="Enter new license key..."
                          />
                          <button 
                            onClick={() => {
                              if (validateLicense(licenseKey, deviceId)) {
                                setToastMessage({ title: 'Success', message: 'License updated successfully', type: 'enter' });
                              } else {
                                setToastMessage({ title: 'Invalid', message: 'License key is incorrect or expired', type: 'exit' });
                              }
                              setTimeout(() => setToastMessage(null), 3000);
                            }}
                            className="px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs uppercase"
                          >
                            Update
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Operations Guidance */}
                <section className="space-y-4 pt-6 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-purple-400" />
                    <h4 className="text-sm font-black text-slate-200 uppercase tracking-widest">Operation Workflow</h4>
                  </div>
                  <ul className="space-y-3">
                    {[
                      { step: '01', title: 'Connect Hardware', desc: 'Plug in Qualcomm-based UE or use internal Radio RIL bridge.' },
                      { step: '02', title: 'Frequency Lock', desc: 'Use AT+QNWPREFCFG for NR/LTE band management if enabled.' },
                      { step: '03', title: 'Task Execution', desc: 'Initiate tests via the Stationary Lab or Mobility modules.' },
                    ].map((item, idx) => (
                      <li key={idx} className="flex gap-4 p-3 bg-white/5 rounded-xl border border-white/5 group hover:bg-white/10 transition-colors">
                        <span className="text-xl font-black text-white/20 group-hover:text-blue-500/50 transition-colors leading-none">{item.step}.</span>
                        <div>
                          <p className="text-[11px] font-bold text-slate-200 uppercase">{item.title}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{item.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
                
                <div className="pt-6 border-t border-slate-800">
                  <button 
                    onClick={() => {
                      setIsHelpModalOpen(false);
                      setIsSettingsOpen(true);
                    }}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Access Advanced System Settings
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-900/50 border-t border-white/5 flex justify-between items-center">
                <span className="text-[9px] text-slate-500 font-mono uppercase">Node ID: {deviceId}</span>
                <button onClick={() => setIsHelpModalOpen(false)} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg uppercase transition-all shadow-lg shadow-blue-600/20">
                  Close Guidance
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Settings Modal */}
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
                <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-emerald-500" />
                  Threshold Settings
                </h3>
                <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 flex flex-col gap-5">
                <div>
                  <h4 className="text-xs font-bold text-blue-400 mb-3 uppercase tracking-wider">5G NR Thresholds</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">SS-RSRP (Good &ge;)</label>
                      <input type="number" value={thresholds.nrRsrp} onChange={e => setThresholds({...thresholds, nrRsrp: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">SS-SINR (Good &ge;)</label>
                      <input type="number" value={thresholds.nrSinr} onChange={e => setThresholds({...thresholds, nrSinr: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 outline-none focus:border-blue-500" />
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-400 mb-3 uppercase tracking-wider">4G LTE Thresholds</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">RSRP (Good &ge;)</label>
                      <input type="number" value={thresholds.lteRsrp} onChange={e => setThresholds({...thresholds, lteRsrp: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">SINR (Good &ge;)</label>
                      <input type="number" value={thresholds.lteSinr} onChange={e => setThresholds({...thresholds, lteSinr: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 outline-none focus:border-emerald-500" />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <h4 className="text-xs font-bold text-blue-400 mb-3 uppercase tracking-wider">Network & Connectivity</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-slate-950/50 p-2 rounded border border-slate-800">
                      <div>
                        <p className="text-xs font-medium text-slate-200">Band Locking</p>
                        <p className="text-[9px] text-slate-500">Manual frequency selection</p>
                      </div>
                      <button 
                        onClick={() => {
                          setIsBandLockingEnabled(!isBandLockingEnabled);
                          setTempBandLockingEnabled(!isBandLockingEnabled);
                        }}
                        className={`w-8 h-4 rounded-full relative transition-colors ${isBandLockingEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
                      >
                        <motion.div 
                          animate={{ x: isBandLockingEnabled ? 18 : 2 }}
                          className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"
                        />
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => {
                        setIsSettingsOpen(false);
                        setIsLockModalOpen(true);
                      }}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded border border-slate-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Settings2 className="w-3.5 h-3.5 text-emerald-400" />
                      Configure Bands & Tech
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <h4 className="text-xs font-bold text-amber-400 mb-3 uppercase tracking-wider">Test Automation</h4>
                  <div className="space-y-3">
                    <button 
                      onClick={() => {
                        setIsSettingsOpen(false);
                        setIsLoadTemplateModalOpen(true);
                      }}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded border border-slate-700 transition-all flex items-center justify-center gap-2"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                      Manage Test Plans (Templates)
                    </button>
                    <p className="text-[9px] text-slate-500 text-center leading-relaxed">
                      Custom Test Plans can be edited dynamically while configuring any Stationary Sector parameter set, and subsequently saved or deleted within the interface.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-3 border-t border-slate-800 bg-slate-950 flex justify-end">
                <button onClick={() => setIsSettingsOpen(false)} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded transition-colors">
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Save Template Modal */}
        {isSaveTemplateModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Save Test Plan Template</h3>
                <button onClick={() => setIsSaveTemplateModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Template Name</label>
                <input 
                  type="text"
                  placeholder="e.g. My Custom FTP Download"
                  value={templateNameInput}
                  onChange={e => setTemplateNameInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                <button 
                  onClick={() => setIsSaveTemplateModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (templateNameInput.trim() && (editingTestPlanIdx !== null || editingScriptConfigId !== null)) {
                      const trimmedName = templateNameInput.trim();
                      
                      // Validate before saving template
                      const errors = validateTestPlan(activeTestPlanObj);
                      if (errors.length > 0) {
                        setToastMessage({ title: 'Validation Error', message: errors[0], type: 'exit' });
                        setTimeout(() => setToastMessage(null), 3000);
                        return;
                      }

                      if (customTestPlans[trimmedName] && !window.confirm(`A template named "${trimmedName}" already exists. Overwrite it?`)) {
                        return;
                      }
                      const newCustomPlan = { ...activeTestPlanObj!, customName: trimmedName, isCustom: true };
                      setCustomTestPlans(prev => ({
                        ...prev,
                        [trimmedName]: newCustomPlan
                      }));
                      updateActiveTestPlan({ customName: trimmedName, isCustom: true });
                      setIsSaveTemplateModalOpen(false);
                      setToastMessage({ title: 'Template Saved', message: `Template '${trimmedName}' has been saved.`, type: 'enter' });
                      setTimeout(() => setToastMessage(null), 3000);
                    }
                  }}
                  disabled={!templateNameInput.trim() || (editingTestPlanIdx === null && editingScriptConfigId === null)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Load Template Modal */}
        {isLoadTemplateModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Load Test Plan Template</h3>
                <button onClick={() => setIsLoadTemplateModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto p-2">
                {Object.keys(customTestPlans).length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">
                    No custom templates saved yet.
                  </div>
                ) : (
                  Object.entries(customTestPlans).map(([name, plan]) => {
                    const testPlan = plan as TestPlanConfig;
                    return (
                    <div key={name} className="flex flex-col gap-1 p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors cursor-pointer group">
                      <div className="flex items-center justify-between">
                        <div 
                          className="flex-1"
                          onClick={() => {
                            if (editingTestPlanIdx !== null || editingScriptConfigId !== null) {
                              updateActiveTestPlan({ ...testPlan });
                              setIsLoadTemplateModalOpen(false);
                            }
                          }}
                        >
                          <span className="text-sm font-semibold text-slate-800">{name}</span>
                          <span className="text-xs text-slate-500 ml-2">({testPlan.type})</span>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Are you sure you want to delete the template '${name}'?`)) {
                              setCustomTestPlans(prev => {
                                const newData = { ...prev };
                                delete newData[name];
                                return newData;
                              });
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )})
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Cell Infos Modal */}
        {isCellInfosOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-xs overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950 shrink-0">
                <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                  <Signal className="w-4 h-4 text-blue-500" />
                  Cell Isolation
                </h3>
                <button onClick={() => setIsCellInfosOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-4 flex flex-col gap-3 overflow-y-auto flex-1 custom-scrollbar">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 font-bold uppercase">PCI</label>
                        <input 
                          type="text"
                          placeholder="e.g. 245"
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-pink-500"
                          value={isolatedCell?.pci || ''}
                          onChange={(e) => setIsolatedCell(prev => ({
                            pci: e.target.value,
                            cellId: prev?.cellId || '',
                            siteName: prev?.siteName || 'Manual Isolation',
                            tech: prev?.tech || 'NR'
                          }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 font-bold uppercase">Cell ID</label>
                        <input 
                          type="text"
                          placeholder="e.g. 10293"
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-blue-500"
                          value={isolatedCell?.cellId || ''}
                          onChange={(e) => setIsolatedCell(prev => ({
                            pci: prev?.pci || '',
                            cellId: e.target.value,
                            siteName: prev?.siteName || 'Manual Isolation',
                            tech: prev?.tech || 'NR'
                          }))}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setIsolatedCell(prev => ({ ...prev!, tech: 'NR', siteName: prev?.siteName || 'Manual Isolation' }))}
                        className={`flex-1 py-1.5 rounded text-[10px] font-bold border transition-colors ${
                          isolatedCell?.tech === 'NR' 
                            ? 'bg-pink-500/20 border-pink-500/50 text-pink-400' 
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        5G NR
                      </button>
                      <button 
                        onClick={() => setIsolatedCell(prev => ({ ...prev!, tech: 'LTE', siteName: prev?.siteName || 'Manual Isolation' }))}
                        className={`flex-1 py-1.5 rounded text-[10px] font-bold border transition-colors ${
                          isolatedCell?.tech === 'LTE' 
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' 
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        4G LTE
                      </button>
                    </div>
                    {isolatedCell && (
                      <button 
                        onClick={() => setIsolatedCell(null)}
                        className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
                      >
                        Clear Isolation
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}

        {/* Geofences Modal */}
        {isGeofencesOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950 shrink-0">
                <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  Geofences
                </h3>
                <button onClick={() => setIsGeofencesOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4">
                {/* Add New Geofence */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Add New Boundary</h4>
                  <input 
                    placeholder="Name (e.g. Downtown Area)" 
                    value={newGeofence.name}
                    onChange={e => setNewGeofence({...newGeofence, name: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200 outline-none focus:border-blue-500"
                  />
                  <div className="h-64 w-full rounded-lg overflow-hidden border border-slate-700 relative">
                    {mapError ? (
                      <div className="flex flex-col items-center justify-center text-slate-500 gap-2 p-4 text-center h-full">
                        <MapPin className="w-6 h-6 opacity-50" />
                        <p className="text-xs">Map display is temporarily unavailable.</p>
                        <button 
                          onClick={() => {
                            setMapError(false);
                            setUseBasicMap(true);
                          }}
                          className="mt-2 px-2 py-1 bg-slate-800 rounded border border-slate-700 text-[10px] text-slate-300 font-bold uppercase transition-colors"
                        >
                          Use Basic Map
                        </button>
                      </div>
                    ) : useBasicMap ? (
                      <div className="w-full h-full relative">
                        <MapContainer 
                          center={[currentLocation.lat, currentLocation.lng]} 
                          zoom={13} 
                          style={{ height: '100%', width: '100%', background: '#0f172a' }}
                          zoomControl={false}
                        >
                           <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                           {newGeofence.lat && newGeofence.lng && (
                             <LeafletCircle 
                               center={[parseFloat(newGeofence.lat), parseFloat(newGeofence.lng)]}
                               radius={parseFloat(newGeofence.radius || '100')}
                               pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.2 }}
                             />
                           )}
                        </MapContainer>
                        <div className="absolute top-2 left-2 z-[1000] bg-slate-900/80 backdrop-blur px-2 py-1 rounded text-[10px] text-slate-300 pointer-events-none border border-slate-700">
                          Click map to set center (Disabled in Basic Mode)
                        </div>
                      </div>
                    ) : (
                      <MapGL
                        initialViewState={{
                          longitude: newGeofence.lng ? parseFloat(newGeofence.lng) : currentLocation.lng,
                          latitude: newGeofence.lat ? parseFloat(newGeofence.lat) : currentLocation.lat,
                          zoom: 13
                        }}
                        onError={(e) => {
                          console.warn("MapGL Error caught:", e);
                          if (e && e.error && e.error.message && e.error.message.includes('WebGL')) {
                            setMapError(true);
                          } else if (e && e.type === 'webglcontextcreationerror') {
                            setMapError(true);
                          }
                        }}
                        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
                        glOptions={{ failIfMajorPerformanceCaveat: false, preserveDrawingBuffer: true }}
                        onClick={(e) => {
                          setNewGeofence({
                            ...newGeofence,
                            lat: e.lngLat.lat.toFixed(6),
                            lng: e.lngLat.lng.toFixed(6)
                          });
                        }}
                      >
                      {newGeofence.lat && newGeofence.lng && !isNaN(parseFloat(newGeofence.lat)) && !isNaN(parseFloat(newGeofence.lng)) && (
                        <>
                          <Marker longitude={parseFloat(newGeofence.lng)} latitude={parseFloat(newGeofence.lat)}>
                            <div className="w-3 h-3 bg-blue-500 rounded-full border border-white shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                          </Marker>
                          <Source id="new-geofence" type="geojson" data={circle([parseFloat(newGeofence.lng), parseFloat(newGeofence.lat)], Math.max(10, parseFloat(newGeofence.radius || '100')) / 1000, { steps: 64, units: 'kilometers' }) as any}>
                            <Layer id="new-geofence-fill" type="fill" paint={{ 'fill-color': '#3b82f6', 'fill-opacity': 0.2 }} />
                            <Layer id="new-geofence-line" type="line" paint={{ 'line-color': '#3b82f6', 'line-width': 2 }} />
                          </Source>
                        </>
                      )}
                    </MapGL>
                    )}
                    <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur px-2 py-1 rounded text-[10px] text-slate-300 pointer-events-none border border-slate-700">
                      Click map to set center
                    </div>
                    <button 
                      onClick={() => {
                        setNewGeofence({
                          ...newGeofence,
                          lat: currentLocation.lat.toFixed(6),
                          lng: currentLocation.lng.toFixed(6)
                        });
                      }}
                      className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur p-1.5 rounded text-blue-400 hover:text-blue-300 border border-slate-700 transition-colors"
                      title="Use Current Location"
                    >
                      <LocateFixed className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-slate-400">Radius (meters)</label>
                      <span className="text-xs font-mono text-blue-400">{newGeofence.radius}m</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="range"
                        min="50"
                        max="5000"
                        step="50"
                        value={newGeofence.radius}
                        onChange={e => setNewGeofence({...newGeofence, radius: e.target.value})}
                        className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                      <button 
                        onClick={() => {
                          if (newGeofence.name && newGeofence.lat && newGeofence.lng && newGeofence.radius) {
                            setGeofences([...geofences, {
                              id: Math.random().toString(36).substr(2, 9),
                              name: newGeofence.name,
                              lat: parseFloat(newGeofence.lat),
                              lng: parseFloat(newGeofence.lng),
                              radius: parseFloat(newGeofence.radius)
                            }]);
                            setNewGeofence({ name: '', lat: '', lng: '', radius: '100' });
                          }
                        }}
                        disabled={!newGeofence.name || !newGeofence.lat || !newGeofence.lng}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-medium rounded transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Existing Geofences */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Boundaries</h4>
                  {geofences.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No geofences defined.</p>
                  ) : (
                    geofences.map(fence => (
                      <div key={fence.id} className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded p-2">
                        <div>
                          <p className="text-sm font-medium text-slate-200">{fence.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {fence.lat.toFixed(4)}, {fence.lng.toFixed(4)} • {fence.radius}m
                          </p>
                        </div>
                        <button 
                          onClick={() => setGeofences(geofences.filter(f => f.id !== fence.id))}
                          className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Event Logs */}
                <div className="flex flex-col gap-2 mt-2 border-t border-slate-800 pt-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Event Logs</h4>
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 h-32 overflow-y-auto flex flex-col gap-1">
                    {geofenceLogs.length === 0 ? (
                      <p className="text-xs text-slate-500 italic p-1">No events yet.</p>
                    ) : (
                      geofenceLogs.map((log, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="text-slate-500 font-mono shrink-0">{log.time}</span>
                          <span className={log.event === 'entered' ? 'text-emerald-400' : 'text-amber-400'}>
                            {log.event === 'entered' ? 'Entered' : 'Exited'}
                          </span>
                          <span className="text-slate-300 truncate">{log.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* --- Admin Dashboard Modal --- */}
        {isAdminDashboardOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
             <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
             >
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center">
                      <Layout className="w-6 h-6 text-orange-400" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-100 uppercase tracking-tight text-lg">Admin Control Panel</h3>
                      <p className="text-[10px] text-slate-500 font-mono">Centralized License & User Management</p>
                    </div>
                  </div>
                  <button onClick={() => setIsAdminDashboardOpen(false)} className="text-slate-500 hover:text-white transition-colors p-2">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 overflow-hidden flex">
                  <AdminDashboard />
                </div>
              </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Admin Dashboard Sub-Component ---

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'users' | 'licenses'>('users');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [licensesList, setLicensesList] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Real-time listener for users
    const usersQuery = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      const u = snapshot.docs.map(doc => doc.data());
      setUsersList(u.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0)));
    });

    // Real-time listener for licenses
    const licensesQuery = query(collection(db, 'licenses'));
    const unsubLicenses = onSnapshot(licensesQuery, (snapshot) => {
      const l = snapshot.docs.map(doc => doc.data());
      setLicensesList(l.sort((a, b) => b.issuedAt - a.issuedAt));
    });

    return () => {
      unsubUsers();
      unsubLicenses();
    };
  }, []);
  const filteredUsers = usersList.filter(u => 
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.uid || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLicenses = licensesList.filter(l => 
    (l.key || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.deviceId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.userEmail || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleIssueLicense = async (deviceId: string, days: number, email?: string) => {
    if (!deviceId) return;
    setIsGenerating(true);
    try {
      await issueLicense(deviceId, days, email, auth.currentUser?.email || '');
    } catch (e) {
      console.error(e);
    }
    setIsGenerating(false);
  };

  return (
    <div className="flex flex-col w-full h-full bg-slate-950">
      {/* Sidebar / Tabs */}
      <div className="flex border-b border-slate-800 shrink-0">
        <button 
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
            activeTab === 'users' ? 'bg-orange-600/10 text-orange-400 border-b-2 border-orange-500' : 'text-slate-500 hover:text-slate-300 bg-slate-900/20'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          User Tracking
        </button>
        <button 
          onClick={() => setActiveTab('licenses')}
          className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
            activeTab === 'licenses' ? 'bg-orange-600/10 text-orange-400 border-b-2 border-orange-500' : 'text-slate-500 hover:text-slate-300 bg-slate-900/20'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          License Management
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === 'users' ? (
          <div className="space-y-3">
             <div className="flex items-center justify-between px-2 mb-4 gap-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] shrink-0">Live Connections ({filteredUsers.length})</h4>
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search users..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-orange-500/50 transition-all font-mono"
                  />
                </div>
             </div>
             {filteredUsers.length === 0 ? (
               <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
                 <p className="text-xs text-slate-500">No users matching your criteria.</p>
               </div>
             ) : (
               filteredUsers.map((user) => (
                  <div key={user.uid} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center justify-between group hover:border-orange-500/30 transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${user.isDisabled ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                        {user.isDisabled ? <ShieldAlert className="w-5 h-5 text-red-400" /> : <ShieldCheck className="w-5 h-5 text-emerald-400" />}
                      </div>
                      <div>
                        <p className="text-xs font-black text-white">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${user.isAdmin ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                            {user.isAdmin ? 'Admin' : 'Operator'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">Last Seen: {user.lastSeen ? new Date(user.lastSeen).toLocaleTimeString() : 'Never'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleUserStatus(user.uid, !user.isDisabled)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                          user.isDisabled ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20' : 'bg-red-600/10 text-red-400 border border-red-500/20 hover:bg-red-600 hover:text-white'
                        }`}
                      >
                        {user.isDisabled ? 'Enable User' : 'Disable User'}
                      </button>
                      {user.email !== 'a.essalih.org@gmail.com' && (
                        <button 
                          onClick={async () => {
                            const userRef = doc(db, 'users', user.uid);
                            await setDoc(userRef, { isAdmin: !user.isAdmin }, { merge: true });
                          }}
                          className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 hover:bg-blue-500/20"
                          title={user.isAdmin ? "Remove Admin" : "Make Admin"}
                        >
                          <Zap className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
               ))
             )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-orange-600/5 border border-orange-500/20 rounded-2xl p-6">
               <h4 className="text-xs font-black text-orange-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <Plus className="w-4 h-4" />
                 Generate Automated license
               </h4>
               <LicenseGenerator onIssue={handleIssueLicense} isGenerating={isGenerating} />
            </div>

            <div className="space-y-3">
               <div className="flex items-center justify-between px-2 mb-4 gap-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] shrink-0">Recent Licenses ({filteredLicenses.length})</h4>
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="Search licenses / devices..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-orange-500/50 transition-all font-mono"
                    />
                  </div>
               </div>
               <div className="grid grid-cols-1 gap-2">
                 {filteredLicenses.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
                      <p className="text-xs text-slate-500">No licenses found.</p>
                    </div>
                 ) : (
                    filteredLicenses.map((lic) => (
                      <div key={lic.key} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 group hover:border-blue-500/30 transition-all">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <code className="text-xs font-mono text-orange-400 font-bold">{lic.key}</code>
                              <button onClick={() => { 
                                navigator.clipboard.writeText(lic.key);
                              }} className="p-1 text-slate-500 hover:text-white transition-colors active:scale-95">
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                            <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${
                              lic.status === 'revoked' ? 'bg-red-500/20 text-red-500' : 
                              lic.expiry < Date.now() ? 'bg-amber-500/20 text-amber-500' : 
                              'bg-emerald-500/20 text-emerald-500'
                            }`}>
                              {lic.status === 'revoked' ? 'Revoked' : lic.expiry < Date.now() ? 'Expired' : 'Active'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-[10px]">
                            <div>
                              <p className="text-slate-500 uppercase font-black tracking-tighter mb-1">Device ID</p>
                              <p className="text-slate-300 font-mono truncate">{lic.deviceId}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 uppercase font-black tracking-tighter mb-1">User / Assigned To</p>
                              <p className="text-slate-300 truncate">{lic.userEmail || 'Unassigned'}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 uppercase font-black tracking-tighter mb-1">Expires</p>
                              <p className="text-slate-300">{new Date(lic.expiry).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-end justify-end">
                              {lic.status !== 'revoked' && (
                                <button 
                                  onClick={() => revokeLicense(lic.key)}
                                  className="text-red-400 hover:text-red-300 font-bold uppercase tracking-widest flex items-center gap-1"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                  Revoke
                                </button>
                              )}
                            </div>
                          </div>
                      </div>
                    ))
                 )}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LicenseGenerator({ onIssue, isGenerating }: { onIssue: (id: string, days: number, email?: string) => void, isGenerating: boolean }) {
  const [deviceId, setDeviceId] = useState('');
  const [email, setEmail] = useState('');
  const [days, setDays] = useState(30);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
      <div className="sm:col-span-5">
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Target Device ID</label>
        <input 
          type="text" 
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value.toUpperCase())}
          placeholder="NT-XXXX-XXXX"
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs font-mono outline-none focus:border-orange-500 transition-colors"
        />
      </div>
      <div className="sm:col-span-4">
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Duration</label>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setDays(7)} className={`py-2 rounded-lg text-[10px] font-black border transition-all ${days === 7 ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>7 DAYS</button>
          <button onClick={() => setDays(30)} className={`py-2 rounded-lg text-[10px] font-black border transition-all ${days === 30 ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>30 DAYS</button>
        </div>
      </div>
      <div className="sm:col-span-3 flex items-end">
        <button 
           onClick={() => onIssue(deviceId, days, email)}
           disabled={!deviceId || isGenerating}
           className="w-full py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase text-xs rounded-lg shadow-lg shadow-orange-900/40 transition-all flex items-center justify-center gap-2"
        >
          {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          Issue Key
        </button>
      </div>
      <div className="sm:col-span-12">
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Associate Email (Optional)</label>
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-orange-500 transition-colors"
        />
      </div>
    </div>
  );
}

// --- Helper Components ---

function RRCStatus({ state }: { state: string }) {
  let color = 'text-slate-400 bg-slate-800/50 border-slate-700';
  let dot = 'bg-slate-500';
  
  if (state === 'CONNECTED') {
    color = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    dot = 'bg-emerald-500';
  } else if (state === 'INACTIVE') {
    color = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    dot = 'bg-amber-500';
  }

  return (
    <div className={`flex flex-col items-center justify-center`}>
      <span className="text-[8px] text-slate-500 uppercase tracking-wider mb-0.5">RRC</span>
      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${color} font-mono text-[9px] font-bold`}>
        <div className={`w-1 h-1 rounded-full ${dot} ${state === 'CONNECTED' ? 'animate-pulse' : ''}`} />
        {state}
      </div>
    </div>
  );
}

function CompactParam({ 
  label, 
  value, 
  highlight = 'none'
}: { 
  label: string; 
  value: string | number; 
  highlight?: 'none' | 'good' | 'warn' | 'bad';
}) {
  let valueColor = 'text-slate-200';
  let dotColor = '';
  if (highlight === 'good') {
    valueColor = 'text-emerald-400';
    dotColor = 'bg-emerald-500';
  }
  if (highlight === 'warn') {
    valueColor = 'text-amber-400';
    dotColor = 'bg-amber-500';
  }
  if (highlight === 'bad') {
    valueColor = 'text-red-400';
    dotColor = 'bg-red-500';
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <span className="text-[8px] text-slate-500 uppercase tracking-wider mb-0.5">{label}</span>
      <div className="flex items-center gap-1">
        {dotColor && <div className={`w-1.5 h-1.5 rounded-full ${dotColor} shadow-[0_0_4px_rgba(0,0,0,0.3)]`} />}
        <span className={`text-[11px] font-mono font-semibold ${valueColor}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

function UserTrackingTab({ users, searchQuery, onSearchChange }: { users: any[], searchQuery: string, onSearchChange: (q: string) => void }) {
  const filteredUsers = users.filter(u => 
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.uid || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between px-2 mb-4 gap-4">
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] shrink-0">Live Connections ({filteredUsers.length})</h4>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search users..." 
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-orange-500/50 transition-all font-mono"
          />
        </div>
      </div>
      {filteredUsers.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
          <p className="text-xs text-slate-500">No users matching your criteria.</p>
        </div>
      ) : (
        filteredUsers.map((user) => (
          <div key={user.uid} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center justify-between group hover:border-orange-500/30 transition-all">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${user.isDisabled ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                {user.isDisabled ? <ShieldAlert className="w-5 h-5 text-red-400" /> : <ShieldCheck className="w-5 h-5 text-emerald-400" />}
              </div>
              <div>
                <p className="text-xs font-black text-white">{user.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${user.isAdmin ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                    {user.isAdmin ? 'Admin' : 'Operator'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Last Seen: {user.lastSeen ? new Date(user.lastSeen).toLocaleTimeString() : 'Never'}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => toggleUserStatus(user.uid, !user.isDisabled)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                  user.isDisabled ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20' : 'bg-red-600/10 text-red-400 border border-red-500/20 hover:bg-red-600 hover:text-white'
                }`}
              >
                {user.isDisabled ? 'Enable User' : 'Disable User'}
              </button>
              {user.email !== 'a.essalih.org@gmail.com' && (
                <button 
                  onClick={async () => {
                    const userRef = doc(db, 'users', user.uid);
                    await setDoc(userRef, { isAdmin: !user.isAdmin }, { merge: true });
                  }}
                  className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 hover:bg-blue-500/20"
                  title={user.isAdmin ? "Remove Admin" : "Make Admin"}
                >
                  <Zap className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function LicenseManagementTab({ 
  licenses, 
  searchQuery, 
  onSearchChange, 
  onIssue, 
  isGenerating 
}: { 
  licenses: any[], 
  searchQuery: string, 
  onSearchChange: (q: string) => void,
  onIssue: (deviceId: string, days: number, email?: string) => void,
  isGenerating: boolean
}) {
  const filteredLicenses = licenses.filter(l => 
    (l.key || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.deviceId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.userEmail || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 space-y-6">
      <div className="bg-orange-600/5 border border-orange-500/20 rounded-2xl p-6">
        <h4 className="text-xs font-black text-orange-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Generate Automated license
        </h4>
        <LicenseGenerator onIssue={onIssue} isGenerating={isGenerating} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-2 mb-4 gap-4">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] shrink-0">Recent Licenses ({filteredLicenses.length})</h4>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search licenses / devices..." 
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-orange-500/50 transition-all font-mono"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {filteredLicenses.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
              <p className="text-xs text-slate-500">No licenses found.</p>
            </div>
          ) : (
            filteredLicenses.map((lic) => (
              <div key={lic.key} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 group hover:border-blue-500/30 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-orange-400 font-bold">{lic.key}</code>
                    <button onClick={() => { 
                      navigator.clipboard.writeText(lic.key);
                    }} className="p-1 text-slate-500 hover:text-white transition-colors active:scale-95">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${
                    lic.status === 'revoked' ? 'bg-red-500/20 text-red-500' : 
                    lic.expiry < Date.now() ? 'bg-amber-500/20 text-amber-500' : 
                    'bg-emerald-500/20 text-emerald-500'
                  }`}>
                    {lic.status === 'revoked' ? 'Revoked' : lic.expiry < Date.now() ? 'Expired' : 'Active'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-[10px]">
                  <div>
                    <p className="text-slate-500 uppercase font-black tracking-tighter mb-1">Device ID</p>
                    <p className="text-slate-300 font-mono truncate">{lic.deviceId}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 uppercase font-black tracking-tighter mb-1">User / Assigned To</p>
                    <p className="text-slate-300 truncate">{lic.userEmail || 'Unassigned'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 uppercase font-black tracking-tighter mb-1">Expires</p>
                    <p className="text-slate-300">{new Date(lic.expiry).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-end justify-end">
                    {lic.status !== 'revoked' && (
                      <button 
                        onClick={() => revokeLicense(lic.key)}
                        className="text-red-400 hover:text-red-300 font-bold uppercase tracking-widest flex items-center gap-1"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
