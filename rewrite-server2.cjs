const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// Change import
code = code.replace(
  'import { db, User } from "./server/db";',
  'import { db } from "./server/db_firebase";\nimport { User } from "./server/db";'
);

// Add init
code = code.replace(
  'const PORT = 3000;',
  'const PORT = 3000;\n  await db.init();'
);

// We need to replace all `db.method()` with `await db.method()`
// Let's do it using regex. We only want to prepend `await` where it's not already there.
const methodsToAwait = [
  'getProducts', 'addProduct', 'updateProduct', 'deleteProduct',
  'getCustomers', 'getOrCreateCustomer', 'getSales', 'getSaleItems',
  'createSale', 'getExchanges', 'createExchange', 'getReturns',
  'createReturn', 'getSettings', 'updateSettings', 'getUsers',
  'getUserByEmail', 'addUser', 'deleteUser', 'getProductById'
];

methodsToAwait.forEach(method => {
  const regex = new RegExp(`db\\.${method}\\(`, 'g');
  code = code.replace(regex, `await db.${method}(`);
});

// Since we replaced db.getProductById(...) with await db.getProductById(...),
// some of them are inside `.map` or `.forEach` or `.filter` which are synchronous.
// We must rewrite those blocks manually.

// Fix 1: app.post login
code = code.replace(
  /app\.post\("\/api\/auth\/login", \(req: Request, res: Response\) => {/g,
  'app.post("/api/auth/login", async (req: Request, res: Response) => {'
);

// Fix 2: app.get /api/products
code = code.replace(
  /app\.get\("\/api\/products", authenticateToken, \(req: Request, res: Response\) => {/g,
  'app.get("/api/products", authenticateToken, async (req: Request, res: Response) => {'
);

// Fix 3: app.post /api/products
code = code.replace(
  /requireRoles\(\["admin", "manager"\]\),\n    \(req: Request, res: Response\) => {/g,
  'requireRoles(["admin", "manager"]),\n    async (req: Request, res: Response) => {'
);

// Fix 4: app.delete /api/products/:id
code = code.replace(
  /requireRoles\(\["admin"\]\),\n    \(req: Request, res: Response\) => {/g,
  'requireRoles(["admin"]),\n    async (req: Request, res: Response) => {'
);

// Fix 5: app.get /api/customers
code = code.replace(
  /app\.get\("\/api\/customers", authenticateToken, \(req: Request, res: Response\) => {/g,
  'app.get("/api/customers", authenticateToken, async (req: Request, res: Response) => {'
);

// Fix 6: app.post /api/customers
code = code.replace(
  /app\.post\("\/api\/customers", authenticateToken, \(req: Request, res: Response\) => {/g,
  'app.post("/api/customers", authenticateToken, async (req: Request, res: Response) => {'
);

// Fix 7: app.get /api/bills
code = code.replace(
  /app\.get\("\/api\/bills", authenticateToken, \(req: Request, res: Response\) => {[\s\S]*?res\.json\(formattedSales\);\n  }\);/g,
  `app.get("/api/bills", authenticateToken, async (req: Request, res: Response) => {
    const sales = await db.getSales();
    const customers = await db.getCustomers();
    const items = await db.getSaleItems();

    const formattedSales = sales.map((sale) => {
      const customer = customers.find((c) => c.id === sale.customerId);
      const saleItems = items.filter((item) => item.saleId === sale.id);
      const totalQty = saleItems.reduce((acc, curr) => acc + curr.qty, 0);

      return {
        ...sale,
        customerName: customer ? customer.name : "Unknown",
        customerPhone: customer ? customer.phone : "Unknown",
        itemsCount: saleItems.length,
        totalQty,
      };
    });

    res.json(formattedSales);
  });`
);

// Fix 8: app.get /api/bills/:id
code = code.replace(
  /app\.get\("\/api\/bills\/:id", authenticateToken, \(req: Request, res: Response\) => {[\s\S]*?}\);/g,
  `app.get("/api/bills/:id", authenticateToken, async (req: Request, res: Response) => {
    const sales = await db.getSales();
    const sale = sales.find((s) => s.id === req.params.id);
    if (!sale) {
      res.status(404).json({ error: "Bill not found" });
      return;
    }
    const customers = await db.getCustomers();
    const customer = customers.find((c) => c.id === sale.customerId);
    const saleItems = await db.getSaleItems(sale.id);

    const hydratedItems = [];
    for (const item of saleItems) {
      const product = await db.getProductById(item.productId);
      hydratedItems.push({
        ...item,
        name: product ? product.name : "Deleted Product",
        barcode: product ? product.barcode : "N/A",
        size: product ? product.size : "N/A",
        color: product ? product.color : "N/A",
      });
    }

    res.json({
      sale: {
        ...sale,
        customerName: customer ? customer.name : "Walk-In Customer",
        customerPhone: customer ? customer.phone : "N/A",
        customerAddress: customer ? customer.address : "N/A",
      },
      items: hydratedItems,
    });
  });`
);

// Fix 9: app.post /api/bills
code = code.replace(
  /app\.post\("\/api\/bills", authenticateToken, \(req: Request, res: Response\) => {/g,
  'app.post("/api/bills", authenticateToken, async (req: Request, res: Response) => {'
);

// Fix 10: app.get /api/exchange
code = code.replace(
  /app\.get\("\/api\/exchange", authenticateToken, \(req: Request, res: Response\) => {[\s\S]*?res\.json\(formatted\);\n  }\);/g,
  `app.get("/api/exchange", authenticateToken, async (req: Request, res: Response) => {
    const exchanges = await db.getExchanges();
    const products = await db.getProducts();
    const saleItems = await db.getSaleItems();
    const sales = await db.getSales();
    const customers = await db.getCustomers();

    const formatted = exchanges.map((ex) => {
      const oldItem = saleItems.find((item) => item.id === ex.oldSaleItemId);
      const newProduct = products.find((p) => p.id === ex.newProductId);
      const originalSale = oldItem ? sales.find((s) => s.id === oldItem.saleId) : null;
      const customer = originalSale ? customers.find((c) => c.id === originalSale.customerId) : null;
      const oldProduct = oldItem ? products.find((p) => p.id === oldItem.productId) : null;

      return {
        ...ex,
        oldItemName: oldProduct ? \`\${oldProduct.name} (\${oldProduct.size}/\${oldProduct.color})\` : "Unknown Product",
        newItemName: newProduct ? \`\${newProduct.name} (\${newProduct.size}/\${newProduct.color})\` : "Unknown Product",
        originalBillNumber: originalSale ? originalSale.billNumber : "N/A",
        customerName: customer ? customer.name : "Walk-In Customer",
      };
    });

    res.json(formatted);
  });`
);

// Fix 11: app.post /api/exchange
code = code.replace(
  /app\.post\("\/api\/exchange", authenticateToken, \(req: Request, res: Response\) => {/g,
  'app.post("/api/exchange", authenticateToken, async (req: Request, res: Response) => {'
);

// Fix 12: app.get /api/returns
code = code.replace(
  /app\.get\("\/api\/returns", authenticateToken, \(req: Request, res: Response\) => {[\s\S]*?res\.json\(formatted\);\n  }\);/g,
  `app.get("/api/returns", authenticateToken, async (req: Request, res: Response) => {
    const returns = await db.getReturns();
    const saleItems = await db.getSaleItems();
    const products = await db.getProducts();
    const sales = await db.getSales();
    const customers = await db.getCustomers();

    const formatted = returns.map((ret) => {
      const saleItem = saleItems.find((item) => item.id === ret.saleItemId);
      const product = saleItem ? products.find((p) => p.id === saleItem.productId) : null;
      const originalSale = saleItem ? sales.find((s) => s.id === saleItem.saleId) : null;
      const customer = originalSale ? customers.find((c) => c.id === originalSale.customerId) : null;

      return {
        ...ret,
        productName: product ? \`\${product.name} (\${product.size}/\${product.color})\` : "Unknown Product",
        originalBillNumber: originalSale ? originalSale.billNumber : "N/A",
        customerName: customer ? customer.name : "Walk-In Customer",
      };
    });

    res.json(formatted);
  });`
);

// Fix 13: app.post /api/returns
code = code.replace(
  /app\.post\("\/api\/returns", authenticateToken, \(req: Request, res: Response\) => {/g,
  'app.post("/api/returns", authenticateToken, async (req: Request, res: Response) => {'
);

// Fix 14: app.get /api/settings
code = code.replace(
  /app\.get\("\/api\/settings", authenticateToken, \(req: Request, res: Response\) => {/g,
  'app.get("/api/settings", authenticateToken, async (req: Request, res: Response) => {'
);

// Fix 15: app.get /api/users
code = code.replace(
  /app\.get\("\/api\/users", authenticateToken, requireRoles\(\["admin"\]\), \(req: Request, res: Response\) => {[\s\S]*?res\.json\(users\);\n  }\);/g,
  `app.get("/api/users", authenticateToken, requireRoles(["admin"]), async (req: Request, res: Response) => {
    const allUsers = await db.getUsers();
    const users = allUsers.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt
    }));
    res.json(users);
  });`
);

// Fix 16: app.post /api/users
code = code.replace(
  /app\.post\("\/api\/users", authenticateToken, requireRoles\(\["admin"\]\), \(req: Request, res: Response\) => {/g,
  'app.post("/api/users", authenticateToken, requireRoles(["admin"]), async (req: Request, res: Response) => {'
);

// Fix 17: app.delete /api/users/:id
code = code.replace(
  /app\.delete\("\/api\/users\/:id", authenticateToken, requireRoles\(\["admin"\]\), \(req: Request, res: Response\) => {/g,
  'app.delete("/api/users/:id", authenticateToken, requireRoles(["admin"]), async (req: Request, res: Response) => {'
);

// Fix 18: app.get /api/reports
code = code.replace(
  /app\.get\("\/api\/reports", authenticateToken, \(req: Request, res: Response\) => {[\s\S]*?reasonsBreakdown,\n      },\n    }\);\n  }\);/g,
  `app.get("/api/reports", authenticateToken, async (req: Request, res: Response) => {
    const sales = await db.getSales();
    const items = await db.getSaleItems();
    const products = await db.getProducts();
    const exchanges = await db.getExchanges();
    const returns = await db.getReturns();

    // 1. Sales & Bills Count (for today vs all)
    const todayStr = new Date().toISOString().slice(0, 10);
    const todaySales = sales.filter((s) => s.createdAt.startsWith(todayStr));

    const totalBills = sales.length;
    const todayBills = todaySales.length;

    const grossSales = sales.reduce((acc, curr) => acc + curr.subtotal, 0);
    const todayGrossSales = todaySales.reduce((acc, curr) => acc + curr.subtotal, 0);

    const discount = sales.reduce((acc, curr) => acc + curr.discount, 0);
    const todayDiscount = todaySales.reduce((acc, curr) => acc + curr.discount, 0);

    const netSales = sales.reduce((acc, curr) => acc + curr.total, 0);
    const todayNetSales = todaySales.reduce((acc, curr) => acc + curr.total, 0);

    // 2. Low stock alerts count
    const lowStockCount = products.filter((p) => p.stock <= 3).length;

    // 3. Profit Calculation (sold price - purchase price)
    let totalProfit = 0;
    let todayProfit = 0;

    for (const item of items) {
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        const itemProfit = (item.price - prod.purchasePrice) * item.qty;
        totalProfit += itemProfit;

        // Check if the sale was today
        const sale = sales.find((s) => s.id === item.saleId);
        if (sale && sale.createdAt.startsWith(todayStr)) {
          todayProfit += itemProfit;
        }
      }
    }

    // 4. Product Performance (Top & Least Selling)
    const productSoldQty: Record<string, { qty: number; name: string; barcode: string; salePrice: number }> = {};
    for (const item of items) {
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        if (!productSoldQty[item.productId]) {
          productSoldQty[item.productId] = {
            qty: 0,
            name: prod.name + \` (\${prod.size}/\${prod.color})\`,
            barcode: prod.barcode,
            salePrice: prod.salePrice,
          };
        }
        productSoldQty[item.productId].qty += item.qty;
      }
    }

    const performanceList = Object.values(productSoldQty).sort((a, b) => b.qty - a.qty);
    const topProducts = performanceList.slice(0, 5);
    const leastProducts = performanceList.slice().reverse().slice(0, 5);

    // 5. Exchange Analytics
    const totalExchanges = exchanges.length;
    const exchangePaidDiff = exchanges
      .filter((e) => e.type === "PAY")
      .reduce((acc, curr) => acc + curr.differenceAmount, 0);
    const exchangeRefundDiff = exchanges
      .filter((e) => e.type === "REFUND")
      .reduce((acc, curr) => acc + Math.abs(curr.differenceAmount), 0);

    // 6. Return Analytics
    const totalReturns = returns.length;
    const totalRefunded = returns.reduce((acc, curr) => acc + curr.refundAmount, 0);

    const reasons: Record<string, number> = {};
    returns.forEach((r) => {
      reasons[r.reason] = (reasons[r.reason] || 0) + 1;
    });
    const reasonsBreakdown = Object.entries(reasons).map(([reason, count]) => ({ reason, count }));

    res.json({
      summary: {
        totalBills,
        todayBills,
        grossSales,
        todayGrossSales,
        discount,
        todayDiscount,
        netSales,
        todayNetSales,
        lowStockCount,
        totalProfit,
        todayProfit,
      },
      productPerformance: {
        topSelling: topProducts,
        leastSelling: leastProducts,
      },
      exchangeAnalytics: {
        totalExchanges,
        amountCollected: exchangePaidDiff,
        amountRefunded: exchangeRefundDiff,
      },
      returnAnalytics: {
        totalReturns,
        refundValue: totalRefunded,
        reasonsBreakdown,
      },
    });
  });`
);

// We still have await await db.get... due to my earlier script.
code = code.replace(/await await /g, "await ");

fs.writeFileSync('server.ts', code);
