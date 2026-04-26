const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const importReplacement = `import {
  Table as TableIcon,`;
code = code.replace("import {", importReplacement);

const htmlReplacement = `{scriptStatuses[script.id] === 'Completed' && (
                                    <>
                                      <button 
                                        onClick={() => setIsResultsModalOpen(true)}
                                        className="p-1 text-blue-500 hover:text-blue-400 transition-colors"
                                        title="View Results Table"
                                      >
                                        <TableIcon className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => exportToExcel(script.id)}`;

code = code.replace(
  "{scriptStatuses[script.id] === 'Completed' && (\n                                    <button \n                                      onClick={() => exportToExcel(script.id)}",
  htmlReplacement
);

// We need to also replace the closing part, nope wait we used `<>` fragment.
code = code.replace(
  `                                      <FileSpreadsheet className="w-3.5 h-3.5" />\n                                    </button>\n                                  )}`,
  `                                      <FileSpreadsheet className="w-3.5 h-3.5" />\n                                    </button>\n                                    </>\n                                  )}`
);



fs.writeFileSync('src/App.tsx', code);
console.log("Added button");
