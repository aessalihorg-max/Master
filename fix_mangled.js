const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/updateActiveTestPlan\(newSectors\[editingTestPlanIdx\]\.testPlan!, ([a-zA-Z0-9_]+): ([^)]+)\)/g, "updateActiveTestPlan({ $1: $2 })");

fs.writeFileSync('src/App.tsx', code);
console.log("Fixed mangled updates");
