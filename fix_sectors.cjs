const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/!newSectors\[editingTestPlanIdx\]\.testPlan\./g, "!activeTestPlanObj.");
code = code.replace(/!newSectors\[editingTestPlanIdx\]\.testPlan\?\./g, "!activeTestPlanObj.");

fs.writeFileSync('src/App.tsx', code);
console.log("Done");
