import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, CheckCircle2, AlertCircle, Play, Square, Download, Scale, Zap, Activity } from 'lucide-react';
import { startRecording, isRecordingSupported } from '../../utils/audioCapture';
import { calculatePESQ, PESQResult } from '../../utils/pesqCalculator';

export function VoiceQualityTester() {
  const [isRecording, setIsRecording] = useState(false);
  const [results, setResults] = useState<PESQResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [analyserData, setAnalyserData] = useState<number[]>(new Array(20).fill(10));
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const duration = 5000;

  const runTest = async () => {
    if (!isRecordingSupported()) {
      setError('Browser environment does not support audio capture');
      return;
    }

    setError(null);
    setResults(null);
    setIsRecording(true);
    setElapsed(0);

    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
      // Fake wave data
      setAnalyserData(new Array(20).fill(0).map(() => Math.random() * 80 + 20));
    }, 100);

    try {
      const audioData = await startRecording(duration);
      const res = calculatePESQ(audioData);
      setResults(res);
    } catch (err: any) {
      setError(err.message || 'Capture failed');
    } finally {
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setAnalyserData(new Array(20).fill(10));
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-emerald-400';
    if (score >= 4.0) return 'text-emerald-500';
    if (score >= 3.0) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Voice Quality (PESQ)</h3>
        </div>
        {isRecording && (
          <div className="flex items-center gap-1.5">
            <motion.div 
              animate={{ opacity: [1, 0, 1] }} 
              transition={{ repeat: Infinity, duration: 1 }}
              className="w-2 h-2 bg-red-500 rounded-full" 
            />
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-tighter">Rec</span>
          </div>
        )}
      </div>

      {!results && !isRecording && (
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20">
            <Scale className="w-8 h-8 text-blue-400/50" />
          </div>
          <p className="text-[10px] text-slate-500 uppercase font-medium tracking-widest text-center">
            Ready to compute Perceptual Evaluation of Speech Quality
          </p>
          <button 
            onClick={runTest}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold uppercase rounded-full transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Start Voice Test
          </button>
        </div>
      )}

      {isRecording && (
        <div className="flex flex-col items-center gap-6 py-6 font-mono text-slate-300">
          <div className="text-3xl font-bold tracking-tighter">
            {(elapsed / 10).toFixed(1)}s
          </div>
          <div className="flex items-end gap-1 h-12">
            {analyserData.map((val, i) => (
              <motion.div 
                key={i}
                animate={{ height: `${val}%` }}
                className="w-1 bg-blue-500/50 rounded-t-sm"
              />
            ))}
          </div>
          <p className="text-[9px] text-slate-500 uppercase tracking-widest animate-pulse">
            Capturing 16kHz Audio Samples...
          </p>
        </div>
      )}

      {results && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div>
              <div className={`text-4xl font-black ${getScoreColor(results.mosScore)}`}>
                {results.mosScore.toFixed(2)}
              </div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                MOS Score: {results.quality}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-bold text-slate-300 flex items-center justify-end gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Validated
              </div>
              <div className="text-[9px] text-slate-500 uppercase tracking-tighter mt-1">
                {results.timestamp.split('T')[1].split('.')[0]} • {results.duration}s
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <MetricBox icon={<Zap className="w-3 h-3" />} label="SNR Ratio" value={`${results.signalNoiseRatio} dB`} status={results.noise === 'Low' ? 'Good' : 'Avg'} />
            <MetricBox icon={<Activity className="w-3 h-3" />} label="Jitter" value={`${results.jitter} ms`} status={results.jitter < 20 ? 'Good' : 'Warning'} />
          </div>

          <button 
            onClick={runTest}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold uppercase rounded border border-slate-700 transition-colors"
          >
            Run New Test
          </button>
        </motion.div>
      )}

      {error && (
        <div className="bg-red-950/20 border border-red-900/30 p-3 rounded flex gap-2 items-start">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-red-300 leading-tight font-medium">{error}</p>
        </div>
      )}
    </div>
  );
}

function MetricBox({ icon, label, value, status }: { icon: React.ReactNode, label: string, value: string, status: 'Good' | 'Avg' | 'Warning' }) {
  const statusColors = {
    Good: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
    Avg: 'bg-amber-500/20 text-amber-400 border-amber-500/20',
    Warning: 'bg-red-500/20 text-red-400 border-red-500/20',
  };

  return (
    <div className="bg-slate-950/40 border border-slate-800 p-2 rounded-lg flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-slate-500 uppercase text-[9px] font-bold tracking-tighter truncate">{label}</span>
        {icon}
      </div>
      <div className="text-[11px] font-mono text-slate-300 font-bold">{value}</div>
      <div className={`text-[8px] font-bold uppercase px-1 rounded border self-start ${statusColors[status]}`}>
        {status}
      </div>
    </div>
  );
}
