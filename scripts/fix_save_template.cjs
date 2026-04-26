const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `                      setCustomTestPlans(prev => ({
                        ...prev,
                        [templateNameInput.trim()]: activeTestPlanObj!
                      }));`;

const replacementStr = `                      const newCustomPlan = { ...activeTestPlanObj!, customName: templateNameInput.trim(), isCustom: true };
                      setCustomTestPlans(prev => ({
                        ...prev,
                        [templateNameInput.trim()]: newCustomPlan
                      }));
                      updateActiveTestPlan({ customName: templateNameInput.trim(), isCustom: true });`;

code = code.replace(targetStr, replacementStr);

fs.writeFileSync('src/App.tsx', code);
console.log("Improved template save logic");
