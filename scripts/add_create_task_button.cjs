const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `            {selectedSite && (
                <div className="flex flex-col gap-4">
                  {/* Real-time Signal Graph */}`;

const replacement1 = `            {selectedSite && (
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
                  {/* Real-time Signal Graph */}`;

code = code.replace(target1, replacement1);

const target2 = `                    {siteSearchQuery.length > 0 && groupedSites.length === 0 && (
                      <div className="p-3 text-sm text-slate-500 text-center">No sites loaded. Please import .xlsx</div>
                    )}`;

const replacement2 = `                    {siteSearchQuery.length > 0 && groupedSites.length === 0 && (
                      <div className="p-3 text-sm text-slate-500 text-center">No sites loaded. Custom task initialization allowed below.</div>
                    )}`;

code = code.replace(target2, replacement2);

const regexTarget3 = /\{\/\* Show matching sectors for quick access \*\/\}([\s\S]*?)<\/div>\s*\);\s*\}\)\}\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/motion.div>\s*<\/div>\s*\)\}/;

const replacement3Match = code.match(regexTarget3);

if (replacement3Match) {
  const replacement3 = `{/* Show matching sectors for quick access */}
${replacement3Match[1]}
                          </div>
                        );
                      })}
                      {siteSearchQuery.length > 0 && (
                        <div className="p-3 border-t border-slate-800 bg-slate-900/50 mt-1 sticky bottom-0 z-20">
                          <button
                            onClick={() => {
                              setSelectedSite(siteSearchQuery);
                              setIsCreateTaskOpen(false);
                              setSelectedTestMode('mobility');
                              setToastMessage({ title: 'Manual Task Created', message: \`Storage folder initialized for \${siteSearchQuery}\`, type: 'enter' });
                              setTimeout(() => setToastMessage(null), 3000);
                              addRecentSearch(siteSearchQuery);
                            }}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold text-xs transition-colors flex justify-center items-center gap-2 shadow"
                          >
                            <Plus className="w-3.5 h-3.5" /> Force Create Task for "{siteSearchQuery}"
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}`;

  code = code.replace(regexTarget3, replacement3);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Updated Modal structure perfectly!");
} else {
  console.log("Failed to match RegexTarget3");
}
