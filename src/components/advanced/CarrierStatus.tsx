import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Smartphone, Info, Globe, Signal, Wifi, ShieldCheck, RefreshCcw } from 'lucide-react';
import { getCarrierInfoSimulation, CarrierInfo } from '../../utils/carrierInfo';

export function CarrierStatus() {
  const [data, setData] = useState<CarrierInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const info = await getCarrierInfoSimulation();
      setData(info);
    } catch (err) {
      console.error('Failed to fetch carrier info', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  if (!data) return null;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-orange-400" />
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Carrier & SIM Status</h3>
        </div>
        <button 
          onClick={fetchData}
          disabled={loading}
          className={`p-1 hover:text-white transition-colors ${loading ? 'animate-spin text-orange-400' : 'text-slate-500'}`}
        >
          <RefreshCcw className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatusItem 
          icon={<Globe className="w-3 h-3" />} 
          label="Operator" 
          value={data.operatorName} 
          sub={`${data.mcc}-${data.mnc}`}
        />
        <StatusItem 
          icon={<Signal className="w-3 h-3" />} 
          label="Network" 
          value={data.networkType} 
          sub={data.registrationState}
        />
        <StatusItem 
          icon={<Wifi className="w-3 h-3" />} 
          label="Data State" 
          value={data.dataState} 
          status={data.dataState === 'CONNECTED' ? 'success' : 'warning'}
        />
        <StatusItem 
          icon={<ShieldCheck className="w-3 h-3" />} 
          label="SIM Storage" 
          value={data.simState} 
          status={data.simState === 'READY' ? 'success' : 'error'}
        />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-4 bg-slate-950/40 p-3 rounded-lg border border-slate-800/50">
         <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Signal Integrity</span>
            <div className="flex items-end gap-1">
               <span className="text-lg font-black text-slate-200">{data.signalStrength}</span>
               <span className="text-[10px] text-slate-500 mb-1">dBm</span>
            </div>
         </div>
         <div className="flex flex-col gap-1 border-l border-slate-800/50 pl-4">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Roaming Status</span>
            <span className={`text-[10px] font-black uppercase tracking-widest ${data.roaming ? 'text-amber-400' : 'text-emerald-400'}`}>
               {data.roaming ? 'Active' : 'Home Network'}
            </span>
         </div>
      </div>
    </div>
  );
}

function StatusItem({ icon, label, value, sub, status }: { 
  icon: React.ReactNode, 
  label: string, 
  value: string, 
  sub?: string,
  status?: 'success' | 'warning' | 'error' 
}) {
  const statusColors = {
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    error: 'text-red-400',
    none: 'text-slate-300'
  };

  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-1 text-slate-500">{icon}</div>
      <div className="flex flex-col">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{label}</span>
        <span className={`text-[11px] font-black uppercase truncate ${status ? statusColors[status] : statusColors.none}`}>
          {value}
        </span>
        {sub && <span className="text-[8px] text-slate-600 font-mono tracking-tighter">{sub}</span>}
      </div>
    </div>
  );
}
