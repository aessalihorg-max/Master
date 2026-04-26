import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radio, Layers, CheckCircle2, AlertCircle, XCircle, Info, RefreshCw } from 'lucide-react';
import { RAT_OPTIONS, BANDS, setRatLockSimulation, setBandLockSimulation } from '../../utils/bandLock';

export function BandLockPanel() {
  const [selectedRat, setSelectedRat] = useState('auto');
  const [selectedBand, setSelectedBand] = useState('band3');
  const [currentRat, setCurrentRat] = useState('auto');
  const [currentBand, setCurrentBand] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleApplyRat = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const result = await setRatLockSimulation(selectedRat);
      if (result.success) {
        setCurrentRat(selectedRat);
        setStatus({ type: 'success', text: result.message });
      }
    } catch (err) {
      setStatus({ type: 'error', text: 'Hardware communication failure' });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyBand = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const result = await setBandLockSimulation(selectedBand);
      if (result.success) {
        setCurrentBand(selectedBand);
        setStatus({ type: 'success', text: result.message });
      }
    } catch (err) {
      setStatus({ type: 'error', text: 'Modem command rejected' });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setCurrentRat('auto');
    setCurrentBand(null);
    setStatus({ type: 'success', text: 'All locks cleared' });
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col gap-6">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <Radio className="w-4 h-4 text-emerald-400" />
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Band Lock Controller</h3>
      </div>

      {/* RAT Lock */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
          <span>RAT Technology Lock</span>
          <span className={currentRat !== 'auto' ? 'text-emerald-400' : ''}>
            Status: {currentRat === 'auto' ? 'Auto' : currentRat}
          </span>
        </div>
        <div className="flex gap-2">
          <select 
            value={selectedRat}
            onChange={(e) => setSelectedRat(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-emerald-500/50"
          >
            {RAT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button 
            disabled={loading}
            onClick={handleApplyRat}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[10px] font-bold uppercase rounded transition-colors"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Band Lock */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
          <span>Frequency Band Lock</span>
          <span className={currentBand ? 'text-emerald-400' : ''}>
            Status: {currentBand || 'None'}
          </span>
        </div>
        <div className="flex gap-2">
          <select 
            value={selectedBand}
            onChange={(e) => setSelectedBand(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-emerald-500/50"
          >
            {BANDS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button 
            disabled={loading}
            onClick={handleApplyBand}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[10px] font-bold uppercase rounded transition-colors"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Actions & Feedback */}
      <div className="pt-2 border-t border-slate-800 flex flex-col gap-3">
        <button 
          onClick={handleClear}
          className="w-full py-2 bg-red-950/20 text-red-500 hover:bg-red-950/40 border border-red-900/30 text-[10px] font-bold uppercase rounded transition-all"
        >
          Clear All Locks
        </button>

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 text-[10px] text-emerald-400 font-bold uppercase py-2"
            >
              <RefreshCw className="w-3 h-3 animate-spin" />
              Applying Modem Command...
            </motion.div>
          )}

          {status && !loading && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex items-center gap-2 text-[10px] font-bold uppercase p-2 rounded ${
                status.type === 'success' ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-950' : 'bg-red-950/30 text-red-400 border border-red-950'
              }`}
            >
              {status.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {status.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-slate-950/50 p-2 rounded border border-slate-800 flex gap-2">
        <Info className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-[9px] text-slate-500 leading-tight">
          Band locking requires Android 12+ and compatible Snapdragon hardware. Simulation mode active in this preview.
        </p>
      </div>
    </div>
  );
}
