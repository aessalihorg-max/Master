const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const inputOriginal = `                  <input
                    type="text"
                    placeholder="Search site name, Site ID, or Cell ID..."
                    value={siteSearchQuery}
                    onChange={(e) => setSiteSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 outline-none focus:border-emerald-500 transition-colors"
                  />`;

const inputReplacement = `                  <input
                    type="text"
                    placeholder="Search site name, Site ID, or Cell ID..."
                    value={siteSearchQuery}
                    onChange={(e) => setSiteSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && siteSearchQuery.length > 0) {
                        e.preventDefault();
                        const query = siteSearchQuery.toLowerCase();
                        const firstMatch = groupedSites.find(s => {
                          const siteName = (s.siteName || '').toLowerCase();
                          const siteId = (s.siteId || '').toString().toLowerCase();
                          const matchesSector = s.sectors.some((sec: any) => 
                            (sec.pci || '').toString().toLowerCase().includes(query) || 
                            (sec.cellId || '').toString().toLowerCase().includes(query)
                          );
                          return siteName.includes(query) || siteId.includes(query) || matchesSector;
                        });
                        
                        const finalSite = firstMatch ? firstMatch.siteName : siteSearchQuery;
                        
                        setSelectedSite(finalSite);
                        setIsCreateTaskOpen(false);
                        setSelectedTestMode('mobility');
                        setToastMessage({ title: 'Task Created', message: \`Storage folder initialized for \${finalSite}\`, type: 'enter' });
                        setTimeout(() => setToastMessage(null), 3000);
                        addRecentSearch(finalSite);
                        
                        if (firstMatch && mapRef.current) {
                          mapRef.current.flyTo({
                            center: [firstMatch.lng, firstMatch.lat],
                            zoom: 16,
                            duration: 1500
                          });
                        }
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 outline-none focus:border-emerald-500 transition-colors"
                  />`;

code = code.replace(inputOriginal, inputReplacement);
fs.writeFileSync('src/App.tsx', code);
console.log("Updated input with onKeyDown.");
