const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The bottom of the modal currently looks like this because of my previous script:
const badModalBottom = `                    </div>
                  </div>
                </div>
              )}


              </motion.div>
            )}`;

const correctModalBottom = `                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}`;

code = code.replace(badModalBottom, correctModalBottom);

fs.writeFileSync('src/App.tsx', code);
console.log("Fixed right braces");
