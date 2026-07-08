const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// Replace standard db calls with await
code = code.replace(/db\.getProducts\(\)/g, "(await db.getProducts())");
code = code.replace(/db\.addProduct\(/g, "await db.addProduct(");
code = code.replace(/db\.updateProduct\(/g, "await db.updateProduct(");
code = code.replace(/db\.deleteProduct\(/g, "await db.deleteProduct(");
code = code.replace(/db\.getCustomers\(\)/g, "(await db.getCustomers())");
code = code.replace(/db\.getOrCreateCustomer\(/g, "await db.getOrCreateCustomer(");
code = code.replace(/db\.getSales\(\)/g, "(await db.getSales())");
code = code.replace(/db\.getSaleItems\(/g, "(await db.getSaleItems(");
code = code.replace(/db\.createSale\(/g, "await db.createSale(");
code = code.replace(/db\.getExchanges\(\)/g, "(await db.getExchanges())");
code = code.replace(/db\.createExchange\(/g, "await db.createExchange(");
code = code.replace(/db\.getReturns\(\)/g, "(await db.getReturns())");
code = code.replace(/db\.createReturn\(/g, "await db.createReturn(");
code = code.replace(/db\.getSettings\(\)/g, "(await db.getSettings())");
code = code.replace(/db\.updateSettings\(/g, "await db.updateSettings(");
code = code.replace(/db\.getUsers\(\)/g, "(await db.getUsers())");
code = code.replace(/db\.getUserByEmail\(/g, "await db.getUserByEmail(");
code = code.replace(/db\.addUser\(/g, "await db.addUser(");
code = code.replace(/db\.deleteUser\(/g, "await db.deleteUser(");
code = code.replace(/db\.getProductById\(/g, "await db.getProductById(");

// Make handlers async
code = code.replace(/\(req: Request, res: Response\) => {/g, "async (req: Request, res: Response) => {");
code = code.replace(/\(req: Request, res: Response, next: NextFunction\): void => {/g, "async (req: Request, res: Response, next: NextFunction): Promise<void> => {");

// We still have some issues where `db.getProductById` is used inside map or forEach synchronously
code = code.replace(/const product = await db\.getProductById\(item\.productId\);/g, "const product = await db.getProductById(item.productId);");

fs.writeFileSync('server.ts', code);
