const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const sortLogic = `
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
`;

const insertLogicPoint = "export default function App() {";
code = code.replace(insertLogicPoint, insertLogicPoint + sortLogic);

const resultsModal = `
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
                              className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                            >
                              <div className="flex items-center gap-1">
                                {col.label}
                                <span className={\`text-[10px] \${sortConfig?.key === col.key ? 'text-blue-500' : 'text-transparent group-hover:text-slate-300'}\`}>
                                  {sortConfig?.key === col.key ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}
                                </span>
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
`;

const insertModalPoint = "{/* Historical Graph Modal */}";
code = code.replace(insertModalPoint, resultsModal + "\n        " + insertModalPoint);

fs.writeFileSync('src/App.tsx', code);
console.log("Added Results Modal");
