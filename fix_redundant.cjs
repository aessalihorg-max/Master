const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/\(editingTestPlanIdx !== null \? activeTestPlanObj\?\.([a-zA-Z0-9]+) : activeTestPlanObj\?\.\1\) === /g, "activeTestPlanObj?.$1 === ");
code = code.replace(/\(editingTestPlanIdx !== null \? activeTestPlanObj\.([a-zA-Z0-9]+) : scriptConfigs\[editingScriptConfigId!\]\?\.([a-zA-Z0-9]+)\) === /g, "activeTestPlanObj?.$1 === ");

fs.writeFileSync('src/App.tsx', code);
console.log("Cleaned redundancies.");
