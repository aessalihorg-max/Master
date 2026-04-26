const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Change MOCK_BANDS
const mockBandsTarget = `const MOCK_BANDS: Record<string, string[]> = {
  'GSM-2G': ['GSM 850', 'GSM 900', 'DCS 1800', 'PCS 1900'],
  'WCDMA-3G': ['B1 (2100)', 'B2 (1900)', 'B5 (850)', 'B8 (900)'],
  'LTE-4G': ['B1', 'B3', 'B7', 'B20', 'B28', 'B38', 'B40'],
  'NR-5G': ['n1', 'n3', 'n28', 'n77', 'n78']
};`;

const mockBandsReplacement = `const MOCK_BANDS: Record<string, string[]> = {
  '2G': ['GSM 850', 'GSM 900', 'DCS 1800', 'PCS 1900'],
  '3G': ['B1 (2100)', 'B2 (1900)', 'B5 (850)', 'B8 (900)'],
  '4G': ['B1', 'B3', 'B7', 'B20', 'B28', 'B38', 'B40'],
  '5G': ['n1', 'n3', 'n28', 'n77', 'n78']
};`;

code = code.replace(mockBandsTarget, mockBandsReplacement);

const openLockTarget = `    setTempTech(lockedTech || 'LTE-4G');`;
const openLockReplacement = `    setTempTech(lockedTech || '4G');`;

code = code.replace(openLockTarget, openLockReplacement);

// 3. Conditional render for Band Locking
const bandLockingTarget = `                {/* Technology Tabs */}
                <div className={\`p-4 bg-slate-950/30 transition-opacity duration-300 \${!tempBandLockingEnabled ? 'opacity-40 pointer-events-none grayscale-[0.5]' : 'opacity-100'}\`}>`;

const bandLockingReplacement = `                {/* Technology Tabs */}
                {tempBandLockingEnabled && (
                <div className="p-4 bg-slate-950/30 transition-opacity duration-300 opacity-100">`;

code = code.replace(bandLockingTarget, bandLockingReplacement);

const searchBarDivCloseTarget = `                        </button>
                      );
                    })}
                  </div>
                </div>`;

const searchBarDivCloseReplacement = `                        </button>
                      );
                    })}
                  </div>
                </div>
                )}`;

// We need a more reliable regex replace for closing div
code = code.replace(/<\/div>\s*<\/div>\s*\{\/\* Command Actions \*\/\}/, '</div></div>)}{/* Command Actions */}');

// 4. Update the submit logic
const submitLogicOld1 = `logs.push(\`> adb shell am broadcast -a com.engineering.lock -e tech \${tempTech.split('-')[0]} -e bands "\${bandStr}"\`);`;
const submitLogicNew1 = `const getTechName = (t) => t === '2G' ? 'GSM' : t === '3G' ? 'WCDMA' : t === '4G' ? 'LTE' : 'NR';
                        logs.push(\`> adb shell am broadcast -a com.engineering.lock -e tech \${getTechName(tempTech)} -e bands "\${bandStr}"\`);`;

code = code.replace(submitLogicOld1, submitLogicNew1);

const submitLogicOld2 = `logs.push(\`> AT+QNWLOCK="attr",\${tempTech.split('-')[0]},\${bandStr}\`);`;
const submitLogicNew2 = `const getTechName = (t) => t === '2G' ? 'GSM' : t === '3G' ? 'WCDMA' : t === '4G' ? 'LTE' : 'NR';
                        logs.push(\`> AT+QNWLOCK="attr",\${getTechName(tempTech)},\${bandStr}\`);`;

code = code.replace(submitLogicOld2, submitLogicNew2);

fs.writeFileSync('src/App.tsx', code);
