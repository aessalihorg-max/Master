const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Remove Task Management text
code = code.replace(
  '<h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Task Management</h2>',
  '<h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider"></h2>'
);

// 2. Remove Export GPS button, and replace new task button
const exportGPSButton = `              <button 
                onClick={exportGPSData}
                className="p-1.5 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 transition-colors flex items-center gap-1 shadow-sm"
                title="Export GPS Coordinates to JSON"
              >
                <Navigation className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] font-semibold text-slate-300">Export GPS</span>
              </button>`;

const createTaskButton = `              <button 
                onClick={() => setIsCreateTaskOpen(true)}
                className="p-1.5 bg-emerald-600 border border-emerald-500 rounded hover:bg-emerald-500 text-white transition-colors flex items-center gap-1 shadow-sm"
                title="Create a New Task"
              >
                <Plus className="w-4 h-4 text-white" />
                <span className="text-[10px] font-semibold text-white">Create Task</span>
              </button>`;

code = code.replace(exportGPSButton, createTaskButton);

// 3. Remove the old "New Task" button block
const oldNewTaskButton = `              <button 
                onClick={() => setIsCreateTaskOpen(!isCreateTaskOpen)} 
                className={\`px-2 py-1.5 border rounded flex items-center gap-1 transition-colors shadow-sm \${
                  isCreateTaskOpen 
                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
                    : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500'
                }\`}
              >
                {isCreateTaskOpen ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span className="text-[10px] font-semibold">{isCreateTaskOpen ? 'Cancel' : 'New Task'}</span>
              </button>`;

code = code.replace(oldNewTaskButton, "");

// 4. Change isCreateTaskOpen logic to a modal
// We need to find the start of `isCreateTaskOpen && (` and replace the wrapper.

const createModalLogic = `
        {/* Create Task Modal */}
        {isCreateTaskOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-4 border-b border-slate-800 flex items-center justify-between shadow-sm relative z-10 bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-slate-100">Create Task</h3>
                </div>
                <button onClick={() => setIsCreateTaskOpen(false)} className="text-slate-400 hover:text-slate-200 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Search Site Name or Cell ID</label>
                  <div className="relative flex flex-col gap-2">
`;

// Replace `          {isCreateTaskOpen && (` ... up to `<div className="relative flex flex-col gap-2">`
// Carefully match this.
const oldModalTop = `          {isCreateTaskOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-col gap-4 shadow-lg"
            >
              {!selectedTestMode && (
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Search Site from Engineering Params</label>
                <div className="relative flex flex-col gap-2">`;

code = code.replace(oldModalTop, createModalLogic);

// Notice `setSelectedSite` calls inside `siteSearchQuery.length > 0 && groupedSites.filter(...)`
// I need to add `setIsCreateTaskOpen(false);` when a site is clicked.
// Also add simple toast to say directory created.

const setSelectedSiteSearch = `setSelectedSite(s.siteName);`;
const modifiedSetSelectedSiteSearch = `setSelectedSite(s.siteName);
                              setIsCreateTaskOpen(false);
                              setSelectedTestMode('mobility');
                              setToastMessage({ title: 'Task Created', message: \`Storage folder initialized for \${s.siteName}\`, type: 'enter' });
                              setTimeout(() => setToastMessage(null), 3000);`;

code = code.replaceAll(setSelectedSiteSearch, modifiedSetSelectedSiteSearch);


// We also need to remove the closing tags of the old `!selectedTestMode &&` and `isCreateTaskOpen`.
// Let's rely on string replacement of the specific bottom parts.
const bottomCardsToRipOut = `              {/* New Test Selection Cards */}
                <div className="flex flex-col gap-3">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Test Selection</h4>
                  
                  {/* Mobility Card */}
                  <button 
                    onClick={() => setSelectedTestMode('mobility')}
                    className={\`w-full p-3 rounded-xl border transition-all flex items-center gap-4 \${
                      selectedTestMode === 'mobility' 
                        ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/20' 
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }\`}
                  >
                    <div className={\`p-2 rounded-lg \${selectedTestMode === 'mobility' ? 'bg-white/20' : 'bg-blue-500/20'}\`}>
                      <AzureDevOpsIcon className={\`w-6 h-6 \${selectedTestMode === 'mobility' ? 'text-white' : 'text-blue-400'}\`} />
                    </div>
                    <div className="text-left">
                      <h4 className={\`text-sm font-bold \${selectedTestMode === 'mobility' ? 'text-white' : 'text-slate-200'}\`}>Mobility Tests</h4>
                      <p className={\`text-[10px] \${selectedTestMode === 'mobility' ? 'text-blue-100' : 'text-slate-500'}\`}>Cluster & Handover scenarios</p>
                    </div>
                  </button>

                  {/* Sector Cards Row */}
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((num) => {
                      const mode = \`sector-\${num}\` as any;
                      const isSelected = selectedTestMode === mode;
                      return (
                        <button
                          key={num}
                          onClick={() => setSelectedTestMode(mode)}
                          className={\`p-2 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all border \${
                            isSelected 
                              ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                              : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800'
                          }\`}
                        >
                          <MapPin className={\`w-4 h-4 \${isSelected ? 'text-emerald-400 animate-bounce' : 'text-slate-500'}\`} />
                          <span className="text-[10px] font-bold tracking-wider">Sector {num}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
            </motion.div>
          )}`;

const correctModalBottom = `                </div>
              </div>
            </motion.div>
          </div>
        )}`;

// Carefully replace the bottom parts. Wait! I notice that `{!selectedTestMode && (` logic wraps `<div> <label> ... </div>` so I need to make sure I don't leave `)}` dangling since I removed `{!selectedTestMode && (` at the top!
// Actually, `oldModalTop` included `{!selectedTestMode && (` removal! So I need to remove the matching `)}` that closed `!selectedTestMode`. 

fs.writeFileSync('src/App.tsx', code);
console.log("Written phase 1");
