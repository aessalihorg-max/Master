const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const siteDetailsRegex = /\s*\{\/\* Site Details \*\/\}\s*<div className="bg-slate-900\/50 border border-slate-800 rounded-lg p-3">[\s\S]*?<\/div>\s*<\/div>\s*(?=\{\/\* New Test Selection Cards \*\/)/;

const newCode = `
                  {/* Real-time Signal Graph */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Real-time Signal Graph</h4>
                      <div className="flex items-center gap-3 text-[10px] uppercase font-bold tracking-wider">
                        <div className="flex items-center gap-1 text-blue-400">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div> RSRP
                        </div>
                        <div className="flex items-center gap-1 text-emerald-400">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div> SINR
                        </div>
                      </div>
                    </div>
                    {testResults.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-wider">
                          {(() => {
                            const rsrpValues = testResults.filter(r => r.ssRsrp !== undefined && r.ssRsrp !== null).map(r => r.ssRsrp);
                            const sinrValues = testResults.filter(r => r.ssSinr !== undefined && r.ssSinr !== null).map(r => r.ssSinr);
                            const calcStats = (vals) => vals.length ? { min: Math.min(...vals), max: Math.max(...vals), avg: (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) } : { min: '-', max: '-', avg: '-' };
                            const rsrpStats = calcStats(rsrpValues);
                            const sinrStats = calcStats(sinrValues);
                            return (
                              <>
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
                              </>
                            );
                          })()}
                        </div>
                        <div className="h-40 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={testResults} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                              <XAxis dataKey="timestamp" tick={{ fontSize: 9, fill: '#475569' }} stroke="#334155" minTickGap={20} />
                              <YAxis yAxisId="left" tick={{ fontSize: 9, fill: '#60a5fa' }} stroke="#334155" domain={[-140, -40]} hide={false} />
                              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#34d399' }} stroke="#334155" domain={[-20, 40]} hide={false} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', fontSize: '10px', borderRadius: '4px' }}
                                itemStyle={{ padding: '2px 0' }}
                                labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                              />
                              <Line yAxisId="left" type="monotone" dataKey="ssRsrp" name="RSRP" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                              <Line yAxisId="right" type="monotone" dataKey="ssSinr" name="SINR" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : (
                      <div className="h-40 flex items-center justify-center border border-dashed border-slate-700/50 rounded-lg">
                        <span className="text-xs text-slate-500">No test data available</span>
                      </div>
                    )}
                  </div>
`;

if (siteDetailsRegex.test(code)) {
  code = code.replace(siteDetailsRegex, newCode);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Successfully replaced Site Details with real-time graph");
} else {
  console.log("Failed to find Site Details block with regex.");
}
