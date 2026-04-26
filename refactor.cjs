const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const helpers = `  const updateActiveTestPlan = (updates: any) => {
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
`;

code = code.replace("  const openLockModal = () => {", helpers + "\n  const openLockModal = () => {");

const start1 = code.indexOf("{/* --- Test Plan Modal --- */}");
const end1 = code.indexOf("{/* --- Script Configuration Modal --- */}");
const end2 = code.indexOf("{/* --- Bottom Sheets (Shared) --- */}");

let modalCode = code.slice(start1, end1);

// Replace conditions and close logic
modalCode = modalCode.replace("{editingTestPlanIdx !== null && (", "{(editingTestPlanIdx !== null || editingScriptConfigId !== null) && activeTestPlanObj && (");
modalCode = modalCode.replace(/onClick=\{\(\) => setEditingTestPlanIdx\(null\)\}/g, "onClick={closeTestPlanModal}");
modalCode = modalCode.replace(/\{stationarySectors\[editingTestPlanIdx\]\.testPlan\?\.type\}/g, "{activeTestPlanType}");

// Replace EARFCN Header with safe null check
modalCode = modalCode.replace(
  /<div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded border border-slate-100">[\s\S]*?<\/div>/,
  `{editingTestPlanIdx !== null && (
                  <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-mono text-slate-600">EARFCN: {stationarySectors[editingTestPlanIdx]?.earfcn || 1650}</span>
                  </div>
                )}`
);

// Conditionally show Templates
modalCode = modalCode.replace(/<div className="bg-slate-50 border-b border-slate-200 p-3 flex gap-3 shrink-0">/, "{editingTestPlanIdx !== null && <div className=\"bg-slate-50 border-b border-slate-200 p-3 flex gap-3 shrink-0\">");
// Using regex to find the closing tag safely
modalCode = modalCode.replace("                </button>\n              </div>\n              <div className=\"flex flex-col bg-white\">", "                </button>\n              </div>}\n              <div className=\"flex flex-col bg-white\">");

// Replace config object reads
modalCode = modalCode.replace(/stationarySectors\[editingTestPlanIdx\]\.testPlan\?/g, "activeTestPlanObj");
modalCode = modalCode.replace(/stationarySectors\[editingTestPlanIdx\]\.testPlan!/g, "activeTestPlanObj");

// Replace onChange event closures
modalCode = modalCode.replace(
  /const newSectors = \[\.\.\.stationarySectors\];\s*newSectors\[editingTestPlanIdx\]\.testPlan = \{ \.\.\.newSectors\[editingTestPlanIdx\]\.testPlan!, ([a-zA-Z0-9_]+): ([^\}]+) \};\s*setStationarySectors\(newSectors\);/g,
  "updateActiveTestPlan({ $1: $2 })"
);

// We should also replace standard direct sets safely:
modalCode = modalCode.replace(
  /newSectors\[editingTestPlanIdx\]\.testPlan!/g,
  "activeTestPlanObj"
);


let bottomSheets = code.slice(end2, code.indexOf("{/* --- Settings Modal --- */}"));

bottomSheets = bottomSheets.replace(/\(editingTestPlanIdx !== null \? stationarySectors\[editingTestPlanIdx\]\.testPlan\?\.type : scriptConfigs\[editingScriptConfigId!\]\?\.type\)/g, "activeTestPlanType");

// We might have logic using ! instead of ?
bottomSheets = bottomSheets.replace(/stationarySectors\[editingTestPlanIdx\]\.testPlan\?\.protocolType/g, "activeTestPlanObj?.protocolType");
bottomSheets = bottomSheets.replace(/scriptConfigs\[editingScriptConfigId!\]\?\.protocolType/g, "activeTestPlanObj?.protocolType");

bottomSheets = bottomSheets.replace(/stationarySectors\[editingTestPlanIdx\]\.testPlan\?\.disconnectionMode/g, "activeTestPlanObj?.disconnectionMode");
bottomSheets = bottomSheets.replace(/scriptConfigs\[editingScriptConfigId!\]\?\.disconnectionMode/g, "activeTestPlanObj?.disconnectionMode");

bottomSheets = bottomSheets.replace(/stationarySectors\[editingTestPlanIdx\]\.testPlan\?\.originateMode/g, "activeTestPlanObj?.originateMode");
bottomSheets = bottomSheets.replace(/scriptConfigs\[editingScriptConfigId!\]\?\.originateMode/g, "activeTestPlanObj?.originateMode");

bottomSheets = bottomSheets.replace(/stationarySectors\[editingTestPlanIdx\]\.testPlan\?\.callType/g, "activeTestPlanObj?.callType");
bottomSheets = bottomSheets.replace(/scriptConfigs\[editingScriptConfigId!\]\?\.callType/g, "activeTestPlanObj?.callType");

bottomSheets = bottomSheets.replace(/stationarySectors\[editingTestPlanIdx\]\.testPlan\?\.callMode/g, "activeTestPlanObj?.callMode");
bottomSheets = bottomSheets.replace(/scriptConfigs\[editingScriptConfigId!\]\?\.callMode/g, "activeTestPlanObj?.callMode");

// Fix onClick updates:
bottomSheets = bottomSheets.replace(
  /if \(editingTestPlanIdx !== null\) \{\s*const newSectors = \[\.\.\.stationarySectors\];\s*newSectors\[editingTestPlanIdx\]\.testPlan = \{ \.\.\.([^\}]+) \};\s*setStationarySectors\(newSectors\);\s*\} else if \(editingScriptConfigId\) \{\s*setScriptConfigs\(prev => \(\{\s*\.\.\.prev,\s*\[editingScriptConfigId\]: \{ \.\.\.([^\}]+) \}\s*\}\)\);\s*\}/g,
  "updateActiveTestPlan($1)"
);

bottomSheets = bottomSheets.replace(
  /if \(editingTestPlanIdx !== null\) \{\s*const newSectors = \[\.\.\.stationarySectors\];\s*newSectors\[editingTestPlanIdx\]\.testPlan = \{ \.\.\.newSectors\[editingTestPlanIdx\]\.testPlan!, ([a-zA-Z0-9_]+): ([^\}]+) \};\s*setStationarySectors\(newSectors\);\s*\} else if \(editingScriptConfigId\) \{\s*setScriptConfigs\(prev => \(\{\s*\.\.\.prev,\s*\[editingScriptConfigId\]: \{ \.\.\.prev\[editingScriptConfigId\], ([a-zA-Z0-9_]+): ([^\}]+) \}\s*\}\)\);\s*\}/g,
  "updateActiveTestPlan({ $1: $2 })"
);

const newCode = code.slice(0, start1) + modalCode + bottomSheets + code.slice(code.indexOf("{/* --- Settings Modal --- */}"));
fs.writeFileSync('src/App.tsx', newCode);
console.log("Done.");
