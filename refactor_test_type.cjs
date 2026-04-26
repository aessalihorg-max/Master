const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetSheet = `                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-bold text-slate-800">Select Test Type or Template</h4>
                  <button onClick={() => setIsTestTypeSelectorOpen(false)} className="text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="overflow-y-auto pb-4">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center sticky top-0">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Default Test Plans</span>
                  </div>
                  {Object.keys(DEFAULT_TEST_PLANS).map(type => (
                    <div 
                      key={type}
                      onClick={() => {
                        updateActiveTestPlan(DEFAULT_TEST_PLANS[type])
                        setIsTestTypeSelectorOpen(false);
                      }}
                      className="flex items-center justify-between px-4 py-4 border-b border-slate-50 active:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <span className={\`text-sm \${
                        activeTestPlanType === type && !activeTestPlanObj?.isCustom
                          ? 'text-blue-500 font-bold' : 'text-slate-700'
                      }\`}>
                        {type}
                      </span>
                      {activeTestPlanType === type && !activeTestPlanObj?.isCustom && (
                        <Check className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                  ))}

                  {Object.keys(customTestPlans).length > 0 && (
                    <>
                      <div className="px-4 py-2 bg-slate-50 border-y border-slate-100 flex items-center sticky top-0 mt-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Custom Templates</span>
                      </div>
                      {Object.entries(customTestPlans).map(([name, plan]) => {
                        const testPlan = plan as TestPlanConfig;
                        // Let's add a pseudo field to let us track custom vs default selection easily if we wanted,
                        // or just compare by deep equality. For now, since the actual type matches the default, it's fine.
                        return (
                          <div 
                            key={name}
                            onClick={() => {
                              updateActiveTestPlan({ ...testPlan, isCustom: true, customName: name })
                              setIsTestTypeSelectorOpen(false);
                            }}
                            className="flex items-center justify-between px-4 py-4 border-b border-slate-50 active:bg-slate-50 transition-colors cursor-pointer group"
                          >
                            <div className="flex flex-col gap-1">
                              <span className={\`text-sm font-semibold \${
                                activeTestPlanObj?.customName === name 
                                  ? 'text-blue-600' : 'text-slate-800'
                              }\`}>
                                {name}
                              </span>
                              <span className="text-xs text-slate-500">Base: {testPlan.type}</span>
                            </div>
                            {activeTestPlanObj?.customName === name && (
                              <Check className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>`;

const startPattern = '<div className="p-4 border-b border-slate-100 flex items-center justify-between">';
// We know it stops right before </motion.div> then </div> then )} then </AnimatePresence>
const endPattern = '</motion.div>\n            </div>\n          )}\n        </AnimatePresence>\n\n        <AnimatePresence>\n          {isProtocolSelectorOpen && (';

const startIndex = code.indexOf(startPattern);
const endIndex = code.indexOf(endPattern, startIndex);

code = code.slice(0, startIndex) + targetSheet + "\n              " + code.slice(endIndex);

fs.writeFileSync('src/App.tsx', code);
console.log("Updated test type selector");
