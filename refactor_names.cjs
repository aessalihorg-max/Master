const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Update modal header to reflect custom name if present
code = code.replace(
  /<h3 className="font-semibold text-slate-800">\{activeTestPlanType\}<\/h3>/,
  '<h3 className="font-semibold text-slate-800">{activeTestPlanObj?.customName ? `${activeTestPlanObj.customName} (${activeTestPlanType})` : activeTestPlanType}</h3>'
);

// Update Test Type row value to show custom name
code = code.replace(
  '<span className="text-sm text-blue-500 font-bold">{activeTestPlanType}</span>',
  '<span className="text-sm text-blue-500 font-bold">{activeTestPlanObj?.customName || activeTestPlanType}</span>'
);

fs.writeFileSync('src/App.tsx', code);
console.log("Updated active custom names");
