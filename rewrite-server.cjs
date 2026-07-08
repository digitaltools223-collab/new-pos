const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

// Replace synchronous db calls with async await calls
const replacements = [
  { match: /db\.getProducts\(\)/g, replace: "await db.getProducts()" },
  { match: /db\.addProduct\(/g, replace: "await db.addProduct(" },
  { match: /db\.updateProduct\(/g, replace: "await db.updateProduct(" },
  { match: /db\.deleteProduct\(/g, replace: "await db.deleteProduct(" },
  { match: /db\.getCustomers\(\)/g, replace: "await db.getCustomers()" },
  { match: /db\.getOrCreateCustomer\(/g, replace: "await db.getOrCreateCustomer(" },
  { match: /db\.getSales\(\)/g, replace: "await db.getSales()" },
  { match: /db\.getSaleItems\(/g, replace: "await db.getSaleItems(" },
  { match: /db\.createSale\(/g, replace: "await db.createSale(" },
  { match: /db\.getExchanges\(\)/g, replace: "await db.getExchanges()" },
  { match: /db\.createExchange\(/g, replace: "await db.createExchange(" },
  { match: /db\.getReturns\(\)/g, replace: "await db.getReturns()" },
  { match: /db\.createReturn\(/g, replace: "await db.createReturn(" },
  { match: /db\.getSettings\(\)/g, replace: "await db.getSettings()" },
  { match: /db\.updateSettings\(/g, replace: "await db.updateSettings(" },
  { match: /db\.getUsers\(\)/g, replace: "await db.getUsers()" },
  { match: /db\.getUserByEmail\(/g, replace: "await db.getUserByEmail(" },
  { match: /db\.addUser\(/g, replace: "await db.addUser(" },
  { match: /db\.deleteUser\(/g, replace: "await db.deleteUser(" },
  { match: /db\.getProductById\(/g, replace: "await db.getProductById(" },
  
  // Update route handlers to be async
  { match: /\(req: Request, res: Response\) => {/g, replace: "async (req: Request, res: Response) => {" },
  { match: /\(req: Request, res: Response, next: NextFunction\): void => {/g, replace: "async (req: Request, res: Response, next: NextFunction): Promise<void> => {" },

  // Change import
  { match: /from "\.\/server\/db";/g, replace: "from \"./server/db_firebase\";\nimport { User } from \"./server/db\";" }
];

for (const r of replacements) {
  serverCode = serverCode.replace(r.match, r.replace);
}

// Ensure init is called
serverCode = serverCode.replace("const PORT = 3000;", "const PORT = 3000;\n\n  // Initialize DB\n  await db.init();");

fs.writeFileSync('server_firebase.ts', serverCode);
