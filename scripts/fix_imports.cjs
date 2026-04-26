const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "import {\n  Table as TableIcon, motion, animate, AnimatePresence } from 'motion/react';",
  "import { motion, animate, AnimatePresence } from 'motion/react';"
);

code = code.replace(
  "import { \n  Settings,",
  "import { \n  Table as TableIcon,\n  Settings,"
);

fs.writeFileSync('src/App.tsx', code);
console.log("Fixed imports");
