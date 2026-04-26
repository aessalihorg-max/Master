const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The block to extract
const testSelectionStart = "              {/* New Test Selection Cards */}";
const testSelectionEnd = `                  </AnimatePresence>
                </div>`;

const startIndex = code.indexOf(testSelectionStart);
// Find the end index carefully, offseting for length of the end string.
const tempCode = code.substring(startIndex);
const endIndexOffset = tempCode.indexOf(testSelectionEnd) + testSelectionEnd.length;

const testSelectionBlock = code.substring(startIndex, startIndex + endIndexOffset);

// Remove the block from the original location
code = code.replace(testSelectionBlock, "");

// Insert it into the selectedSite block, right under {/* Dynamic Test Plans Section */}
const insertTarget = "                  {/* Dynamic Test Plans Section */}";
code = code.replace(insertTarget, testSelectionBlock);

// Note: I also need to make sure the closing brace of `isCreateTaskOpen` is handled. We already over-wrote `isCreateTaskOpen` in the previous step using `correctModalBottom`! WAIT!
// In my previous step `update_task_logic.cjs`, I actually didn't replace `correctModalBottom`. Let's double check.
fs.writeFileSync('src/App.tsx', code);
console.log("Moved Test Selection Cards");
