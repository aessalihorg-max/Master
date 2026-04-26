const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');
lines.splice(3519, 278); // Delete 278 lines starting from index 3519 (line 3520)
fs.writeFileSync('src/App.tsx', lines.join('\n'));
