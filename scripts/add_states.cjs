const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Insert new state variables for Results Modal and Sorting
const statesToInsert = `
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
`;
code = code.replace(
  "  const [isTestRunning, setIsTestRunning] = useState(false);",
  "  const [isTestRunning, setIsTestRunning] = useState(false);\n" + statesToInsert
);

fs.writeFileSync('src/App.tsx', code);
console.log("Added states");
