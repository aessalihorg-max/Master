import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BarChart3, Signal, Zap, Activity, Info } from 'lucide-react';

interface FreqData {
  type: 'LTE' | 'NR';
  band: string;
  freq: string;
  earfcn: number;
  rsrp: number;
  rsrq: number;
  sinr: number;
  pci: number;
  bandwidth: string;
  rrcState: 'IDLE' | 'CONNECTED';
}

export function CarrierFrequencies() {
  const [data, setData] = useState<FreqData[]>([]);
  const [visibleTypes, setVisibleTypes] = useState<Set<'LTE' | 'NR'>>(new Set(['LTE', 'NR']));
  const [activeOnly, setActiveOnly] = useState(false);

  const toggleType = (type: 'LTE' | 'NR') => {
    const next = new Set(visibleTypes);
    if (next.has(type)) {
      if (next.size > 1) next.delete(type);
    } else {
      next.add(type);
    }
    setVisibleTypes(next);
  };

  // Simulation of frequency parameters updates
  useEffect(() => {
    const generateData = () => [
      { type: 'LTE' as const, band: 'L1800 (B3)', freq: '1842.5', earfcn: 1575, rsrp: -92 - Math.floor(Math.random() * 5), rsrq: -12 - Math.floor(Math.random() * 3), sinr: 15 + Math.floor(Math.random() * 5), pci: 124, bandwidth: '20', rrcState: Math.random() > 0.3 ? 'CONNECTED' : 'IDLE' as const },
      { type: 'LTE' as const, band: 'L2600 (B7)', freq: '2655.0', earfcn: 3100, rsrp: -98 - Math.floor(Math.random() * 8), rsrq: -14 - Math.floor(Math.random() * 4), sinr: 8 + Math.floor(Math.random() * 6), pci: 125, bandwidth: '20', rrcState: Math.random() > 0.5 ? 'CONNECTED' : 'IDLE' as const },
      { type: 'LTE' as const, band: 'L2100 (B1)', freq: '2145.0', earfcn: 100, rsrp: -95 - Math.floor(Math.random() * 6), rsrq: -13 - Math.floor(Math.random() * 3), sinr: 12 + Math.floor(Math.random() * 4), pci: 126, bandwidth: '15', rrcState: Math.random() > 0.4 ? 'CONNECTED' : 'IDLE' as const },
      { type: 'LTE' as const, band: 'L800 (B20)', freq: '806.0', earfcn: 6300, rsrp: -85 - Math.floor(Math.random() * 4), rsrq: -9 - Math.floor(Math.random() * 2), sinr: 18 + Math.floor(Math.random() * 3), pci: 127, bandwidth: '10', rrcState: 'CONNECTED' as const },
      { type: 'LTE' as const, band: 'L700 (B28)', freq: '773.0', earfcn: 9460, rsrp: -82 - Math.floor(Math.random() * 3), rsrq: -8 - Math.floor(Math.random() * 2), sinr: 20 + Math.floor(Math.random() * 4), pci: 128, bandwidth: '10', rrcState: 'IDLE' as const },
      { type: 'LTE' as const, band: 'L900 (B8)', freq: '942.5', earfcn: 3700, rsrp: -88 - Math.floor(Math.random() * 5), rsrq: -10 - Math.floor(Math.random() * 3), sinr: 16 + Math.floor(Math.random() * 5), pci: 129, bandwidth: '10', rrcState: 'IDLE' as const },
      { type: 'LTE' as const, band: 'L1500 (B32)', freq: '1475.0', earfcn: 10100, rsrp: -102 - Math.floor(Math.random() * 7), rsrq: -16 - Math.floor(Math.random() * 4), sinr: 5 + Math.floor(Math.random() * 6), pci: 130, bandwidth: '20', rrcState: 'IDLE' as const },
      { type: 'LTE' as const, band: 'L2300 (B40)', freq: '2350.0', earfcn: 39150, rsrp: -94 - Math.floor(Math.random() * 6), rsrq: -13 - Math.floor(Math.random() * 3), sinr: 11 + Math.floor(Math.random() * 4), pci: 131, bandwidth: '20', rrcState: 'CONNECTED' as const },
      { type: 'NR' as const, band: 'N78 (3.5G)', freq: '3500.0', earfcn: 630000, rsrp: -90 - Math.floor(Math.random() * 5), rsrq: -11 - Math.floor(Math.random() * 2), sinr: 22 + Math.floor(Math.random() * 4), pci: 501, bandwidth: '100', rrcState: 'CONNECTED' as const },
      { type: 'NR' as const, band: 'N28 (700)', freq: '773.0', earfcn: 154600, rsrp: -80 - Math.floor(Math.random() * 3), rsrq: -8 - Math.floor(Math.random() * 1), sinr: 25 + Math.floor(Math.random() * 3), pci: 502, bandwidth: '20', rrcState: 'CONNECTED' as const },
      { type: 'NR' as const, band: 'N1 (2100)', freq: '2150.0', earfcn: 428000, rsrp: -96 - Math.floor(Math.random() * 6), rsrq: -14 - Math.floor(Math.random() * 3), sinr: 10 + Math.floor(Math.random() * 5), pci: 503, bandwidth: '20', rrcState: 'IDLE' as const },
    ];

    setData(generateData());
    const interval = setInterval(() => setData(generateData()), 2000);
    return () => clearInterval(interval);
  }, []);

  const filteredData = data.filter(item => {
    if (!visibleTypes.has(item.type)) return false;
    if (activeOnly && item.rrcState !== 'CONNECTED') return false;
    return true;
  });

  return (
    <div className="flex flex-col bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shrink-0">
      <div className="p-3 border-b border-slate-800 flex flex-col gap-3 bg-slate-900/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-orange-400" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Carrier Configuration</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setActiveOnly(!activeOnly)}
              className={`px-2 py-1 rounded text-[8px] font-black tracking-tighter uppercase transition-all mr-2 ${activeOnly ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' : 'bg-slate-800 text-slate-500 border border-transparent'}`}
            >
              Active Only
            </button>
            <div className="h-4 w-px bg-slate-800 mx-1" />
            <button 
              onClick={() => toggleType('LTE')}
              className={`px-2 py-0.5 rounded text-[9px] font-black transition-all ${visibleTypes.has('LTE') ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-slate-800 text-slate-500 border border-transparent'}`}
            >
              LTE
            </button>
            <button 
              onClick={() => toggleType('NR')}
              className={`px-2 py-0.5 rounded text-[9px] font-black transition-all ${visibleTypes.has('NR') ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-500 border border-transparent'}`}
            >
              NR
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-slate-950/50 border-b border-slate-800">
              <th className="p-1 px-2 text-[8px] font-black text-slate-500 uppercase tracking-tighter w-20">Band Info</th>
              <th className="p-1 px-2 text-[8px] font-black text-slate-500 uppercase tracking-tighter text-center w-12">State</th>
              <th className="p-1 px-2 text-[8px] font-black text-slate-500 uppercase tracking-tighter text-center w-12">PCI</th>
              <th className="p-1 px-2 text-[8px] font-black text-slate-500 uppercase tracking-tighter text-center w-12">BW</th>
              <th className="p-1 text-[8px] font-black text-slate-500 uppercase tracking-tighter text-center">RSRP</th>
              <th className="p-1 text-[8px] font-black text-slate-500 uppercase tracking-tighter text-center">SINR</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item, i) => (
              <tr key={i} className={`border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors ${item.rrcState === 'CONNECTED' ? 'bg-orange-500/5' : ''}`}>
                <td className="p-1.5 px-2">
                  <div className="flex flex-col leading-none">
                    <div className="flex items-center gap-1">
                      <span className={`w-1 h-1 rounded-full ${item.type === 'NR' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                      <span className="text-[10px] font-black text-slate-200 truncate">{item.band.split(' ')[0]}</span>
                      <span className="text-[8px] font-bold text-slate-500">[{item.type}]</span>
                    </div>
                    <span className="text-[7px] text-slate-500 font-mono italic mt-0.5">{item.freq} MHz</span>
                  </div>
                </td>
                <td className="p-1.5 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {item.rrcState === 'CONNECTED' && (
                      <motion.div 
                        animate={{ opacity: [1, 0.4, 1] }} 
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-1 h-1 rounded-full bg-orange-400" 
                      />
                    )}
                    <span className={`text-[8px] font-black px-1 py-0.5 rounded uppercase tracking-tighter ${item.rrcState === 'CONNECTED' ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-slate-500'}`}>
                      {item.rrcState === 'CONNECTED' ? 'CONN' : 'IDLE'}
                    </span>
                  </div>
                </td>
                <td className="p-1.5 text-center text-[9px] font-mono font-bold text-slate-300">{item.pci}</td>
                <td className="p-1.5 text-center text-[9px] font-mono font-bold text-slate-400">{item.bandwidth}M</td>
                <td className="p-1.5 text-center">
                  <div className={`text-[10px] font-black font-mono ${item.rsrp > -90 ? 'text-emerald-400' : item.rsrp > -105 ? 'text-amber-400' : 'text-red-400'}`}>
                    {item.rsrp} <span className="text-[7px] opacity-50">dBm</span>
                  </div>
                </td>
                <td className="p-1.5 text-center">
                  <div className={`text-[10px] font-black font-mono ${item.sinr > 10 ? 'text-emerald-400' : item.sinr > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                    {item.sinr}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-slate-950/50 border-t border-slate-800/50 flex gap-2">
        <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-[9px] text-slate-500 leading-tight">
          Current layer shows available LTE carrier components detected during Idle mode. Registration is maintained on {data[0]?.band || 'Primary Cell'}. Frequency availability depends on local site configuration.
        </p>
      </div>
    </div>
  );
}
