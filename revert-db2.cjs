const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// Remove `db.init();`
code = code.replace(/db\.init\(\);\n?/g, '');

fs.writeFileSync('server.ts', code);
