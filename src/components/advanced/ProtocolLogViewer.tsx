import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Play, Square, Search, Filter, Download, Zap, ChevronRight, Activity, Database } from 'lucide-react';
import { decodeRrcMessage, DecodedRrcMessage } from '../../utils/rrcDecoder';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'RRC_STATE_CHANGE' | 'HANDOVER' | 'MEASUREMENT_REPORT' | 'SECURITY' | 'SIB' | 'ERROR';
  raw: string;
  decoded: DecodedRrcMessage;
}

const MOCK_HEX = [
  '0x00A4B2C1F3', '0x11B3C4D5', '0x22C4D5E6', '0x33D5E6F7', '0x44E6F7A8', 
  '0x55F7A8B9', '0x66A8B9C0', '0x77B9C0D1', '0x88C0D1E2', '0x99D1E2F3'
];

export function ProtocolLogViewer() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ ho: 0, rrc: 0, sib: 0 });
  
  const logContainerRef = useRef<HTMLDivElement>(null);
  const captureInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const startCapture = () => {
    setIsCapturing(true);
    captureInterval.current = setInterval(() => {
      const randomHex = MOCK_HEX[Math.floor(Math.random() * MOCK_HEX.length)];
      const decoded = decodeRrcMessage(randomHex);
      
      const newEntry: LogEntry = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 }),
        type: mapMsgToType(decoded.messageType),
        raw: randomHex,
        decoded
      };

      setLogs(prev => [...prev.slice(-99), newEntry]);
      
      if (newEntry.type === 'HANDOVER') setStats(s => ({ ...s, ho: s.ho + 1 }));
      if (newEntry.type === 'RRC_STATE_CHANGE') setStats(s => ({ ...s, rrc: s.rrc + 1 }));
      if (newEntry.type === 'SIB') setStats(s => ({ ...s, sib: s.sib + 1 }));

    }, 2000);
  };

  const stopCapture = () => {
    setIsCapturing(false);
    if (captureInterval.current) clearInterval(captureInterval.current);
  };

  const mapMsgToType = (msg: string): LogEntry['type'] => {
    if (msg.includes('Setup') || msg.includes('Release') || msg.includes('Reconfiguration')) return 'RRC_STATE_CHANGE';
    if (msg.includes('Handover')) return 'HANDOVER';
    if (msg.includes('Measurement')) return 'MEASUREMENT_REPORT';
    if (msg.includes('Security')) return 'SECURITY';
    if (msg.includes('SystemInformation')) return 'SIB';
    return 'ERROR';
  };

  const getEntryColors = (log: LogEntry) => {
    if (log.type === 'RRC_STATE_CHANGE') {
      if (log.decoded.messageType.includes('Release')) return 'border-l-red-500 text-red-500';
      if (log.decoded.messageType.includes('Setup') || log.decoded.messageType.includes('Reconfiguration')) return 'border-l-emerald-500 text-emerald-400';
      return 'border-l-blue-500 text-blue-400';
    }
    if (log.type === 'HANDOVER') return 'border-l-amber-500 text-amber-500';
    if (log.type === 'MEASUREMENT_REPORT') return 'border-l-blue-400 text-blue-400';
    if (log.type === 'SECURITY') return 'border-l-orange-500 text-orange-400';
    if (log.type === 'SIB') return 'border-l-purple-500 text-purple-400';
    return 'border-l-red-600 text-red-600';
  };

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || mapTypeToFilter(log.type) === filter;
    const matchesSearch = log.decoded.messageType.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.decoded.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  function mapTypeToFilter(type: string) {
    if (type === 'HANDOVER') return 'ho';
    if (type === 'ERROR') return 'err';
    return 'other';
  }

  const exportLogs = () => {
    const data = JSON.stringify(logs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rrc_capture_${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col h-[500px] overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Protocol Decoder (RRC_MESSAGES)</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded border border-slate-800">
            <span className="text-[10px] font-mono text-amber-500">{stats.ho} HO</span>
            <span className="text-slate-800">|</span>
            <span className="text-[10px] font-mono text-blue-500">{stats.rrc} RRC</span>
          </div>
          <button 
            onClick={isCapturing ? stopCapture : startCapture}
            className={`p-1.5 rounded-full transition-colors ${isCapturing ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}
          >
            {isCapturing ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-2 border-b border-slate-800 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1.5 w-3 h-3 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search ASN.1 messages..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-7 py-1 text-[10px] text-slate-300 outline-none focus:border-purple-500/50"
          />
        </div>
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-400 outline-none"
        >
          <option value="all">ALL_MSG</option>
          <option value="ho">HANDOVERS</option>
          <option value="err">ERRORS</option>
        </select>
        <button 
          onClick={exportLogs}
          className="p-1.5 bg-slate-800 border border-slate-700 rounded text-slate-400 hover:text-white"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Log Feed */}
      <div 
        ref={logContainerRef}
        className="flex-1 overflow-y-auto font-mono text-[10px] bg-slate-950 p-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-800"
      >
        {filteredLogs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-20 gap-2">
            <Database className="w-8 h-8" />
            <span className="uppercase tracking-[0.2em] text-[8px]">Waiting for L3 Capture Event</span>
          </div>
        )}
        
        {filteredLogs.map((log) => (
          <div 
            key={log.id} 
            className={`border-l-2 p-1.5 bg-slate-900/30 hover:bg-slate-900/60 rounded-r transition-colors flex flex-col gap-1 ${getEntryColors(log)}`}
          >
            <div className="flex items-center justify-between opacity-80">
              <span className="font-bold flex items-center gap-1">
                <ChevronRight className="w-2.5 h-2.5" />
                {log.decoded.messageType}
              </span>
              <span className="text-[8px] text-slate-600">{log.timestamp}</span>
            </div>
            <div className="text-slate-500 text-[9px] pl-3">
              {log.decoded.description}
            </div>
            <div className="flex gap-2 pl-3 opacity-60">
              {Object.entries(log.decoded.fields).map(([k, v]) => (
                <span key={k} className="text-[8px] flex gap-1">
                  <span className="font-bold">{k}:</span>
                  <span>{v}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Status Bar */}
      <div className="p-1.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-3 text-[9px] font-bold tracking-widest text-slate-500 uppercase">
        <div className="flex items-center gap-2">
          {isCapturing ? (
            <span className="flex items-center gap-1 text-emerald-500">
              <Zap className="w-2.5 h-2.5 animate-pulse" />
              Capture Active
            </span>
          ) : (
            <span>Logger Idle</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span>{logs.length}/100 MSG</span>
          <span>DEC_ASN1_V2.1</span>
        </div>
      </div>
    </div>
  );
}
