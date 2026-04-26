const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  '              {/* Template Actions */}\n              {editingTestPlanIdx !== null && <div className="bg-slate-50 border-b border-slate-200 p-3 flex gap-3 shrink-0">',
  '              {/* Template Actions */}\n              {(editingTestPlanIdx !== null || editingScriptConfigId !== null) && <div className="bg-slate-50 border-b border-slate-200 p-3 flex gap-3 shrink-0">'
);

fs.writeFileSync('src/App.tsx', code);
console.log("Updated conditional for action buttons");
