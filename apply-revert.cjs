const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// Revert import
code = code.replace(
  'import { db } from "./server/db_firebase";\nimport { User } from "./server/db";',
  'import { db, User } from "./server/db";'
);

// Remove all `await ` before `db.` and from `appPromise` usage
code = code.replace(/await db\./g, 'db.');

// There are a few places where we have `const users = allUsers.map` etc., but they don't break.
// We also need to fix `await appPromise` which is for Vercel, that's fine to keep async export if Vercel needs it,
// but let's just make sure Vercel export works without Firebase.

// Also remove `firebase-admin` dependency if possible, but no big deal.

fs.writeFileSync('server.ts', code);
