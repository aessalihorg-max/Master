const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `              <div className="flex flex-col bg-white">
                <div 
                  className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white active:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setIsTestTypeSelectorOpen(true)}
                >`;

const replacement1 = `              <div className="flex flex-col bg-white">
                <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white">
                  <span className="text-sm font-medium text-slate-700">Custom Name</span>
                  <input 
                    type="text"
                    placeholder="e.g. My Custom Plan"
                    value={activeTestPlanObj?.customName || ''}
                    onChange={(e) => updateActiveTestPlan({ customName: e.target.value })}
                    className="text-right text-sm text-slate-500 bg-transparent outline-none border-none focus:text-blue-500 w-2/3"
                  />
                </div>
                <div 
                  className="flex items-center justify-between py-3 px-4 border-b border-slate-100 bg-white active:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setIsTestTypeSelectorOpen(true)}
                >`;

code = code.replace(target1, replacement1);

const target2 = `                <button 
                  onClick={() => {
                    setTemplateNameInput('');
                    setIsSaveTemplateModalOpen(true);
                  }}`;

const replacement2 = `                <button 
                  onClick={() => {
                    setTemplateNameInput(activeTestPlanObj?.customName || '');
                    setIsSaveTemplateModalOpen(true);
                  }}`;

code = code.replace(target2, replacement2);

fs.writeFileSync('src/App.tsx', code);
