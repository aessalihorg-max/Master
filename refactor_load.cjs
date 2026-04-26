const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetModalContent = `              <div className="p-4 border-b border-slate-100 flex items-center justify-between shadow-sm relative z-10">
                <h3 className="font-bold text-slate-800">Load Test Plan Template</h3>
                <button onClick={() => setIsLoadTemplateModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto">
                {/* Default Plans Section */}
                <div className="px-4 py-2 bg-slate-50/80 backdrop-blur border-b border-slate-100 flex items-center sticky top-0 z-10">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Default Plans</span>
                </div>
                <div className="p-2 space-y-1">
                  {Object.keys(DEFAULT_TEST_PLANS).map(type => (
                    <div 
                      key={type} 
                      className="flex items-center p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors cursor-pointer group"
                      onClick={() => {
                        if (editingTestPlanIdx !== null || editingScriptConfigId !== null) {
                          updateActiveTestPlan(DEFAULT_TEST_PLANS[type]);
                          setIsLoadTemplateModalOpen(false);
                        }
                      }}
                    >
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-slate-800">{type}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Custom Templates Section */}
                <div className="px-4 py-2 bg-slate-50/80 backdrop-blur border-y border-slate-100 flex items-center sticky top-0 z-10 mt-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Custom Templates</span>
                </div>
                <div className="p-2 space-y-1">
                  {Object.keys(customTestPlans).length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500 italic">
                      No custom templates saved yet.
                    </div>
                  ) : (
                    Object.entries(customTestPlans).map(([name, plan]) => {
                      const testPlan = plan as TestPlanConfig;
                      return (
                        <div key={name} className="flex items-center p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors cursor-pointer group">
                          <div 
                            className="flex-1"
                            onClick={() => {
                              if (editingTestPlanIdx !== null || editingScriptConfigId !== null) {
                                updateActiveTestPlan({ ...testPlan });
                                setIsLoadTemplateModalOpen(false);
                              }
                            }}
                          >
                            <span className="text-sm font-semibold text-slate-800">{name}</span>
                            <span className="text-xs text-slate-500 ml-2 border border-slate-200 px-1.5 py-0.5 rounded bg-white">
                              {testPlan.type}
                            </span>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(\`Are you sure you want to delete the template '\${name}'?\`)) {
                                setCustomTestPlans(prev => {
                                  const newData = { ...prev };
                                  delete newData[name];
                                  return newData;
                                });
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-md transition-all ml-2"
                            title="Delete template"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>`;

const modalPatternStart = code.indexOf('<div className="p-4 border-b border-slate-100 flex items-center justify-between">');
const modalPatternEnd = code.indexOf('</motion.div>', modalPatternStart);

code = code.slice(0, modalPatternStart) + targetModalContent + "\n            " + code.slice(modalPatternEnd);

fs.writeFileSync('src/App.tsx', code);
console.log("Replaced Load Template UI");
