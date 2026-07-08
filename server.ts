import "express-async-errors";
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createServer as createViteServer } from "vite";
import { db } from "./server/db.js";
import { User } from "./server/db.js";

// Extend Express Request type to include user information
declare global {
  namespace Express {
    interface Request {
      user?: Omit<User, "passwordHash">;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "mdr_pos_secret_key_2026";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Database initialized
  await db.init();
  // Set high limit for body parsing to support Base64 images
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // --- Middleware ---

  // Authentication Middleware
  const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      res.status(401).json({ error: "Access token required" });
      return;
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        res.status(403).json({ error: "Invalid or expired token" });
        return;
      }
      req.user = decoded as Omit<User, "passwordHash">;
      next();
    });
  };

  // Role Authorization Middleware
  const requireRoles = (roles: ("admin" | "manager" | "cashier")[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      if (!roles.includes(req.user.role)) {
        res.status(403).json({ error: "You do not have permission to perform this action" });
        return;
      }
      next();
    };
  };

  // --- API Routes ---

  // Health check with detailed status
  app.get("/api/health", async (req: Request, res: Response) => {
    try {
      console.log("Checking DB connection...");
      const result = await pool.query("SELECT 1 as connected");
      res.json({ 
        status: "ok", 
        database: "connected", 
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV
      });
    } catch (err: any) {
      console.error("Health check DB error:", err.message);
      res.status(500).json({ 
        status: "error", 
        database: "disconnected", 
        message: err.message 
      });
    }
  });

  // Auth Endpoint
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const user = await db.getUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = bcrypt.compareSync(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "12h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  });

  // Get Current User Profile (for persistent sessions)
  app.get("/api/auth/me", authenticateToken, (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: "Not logged in" });
      return;
    }
    res.json({ user: req.user });
  });

  // --- Products Endpoints ---
  app.get("/api/products", authenticateToken, async (req: Request, res: Response) => {
    res.json(await db.getProducts());
  });

  app.post(
    "/api/products",
    authenticateToken,
    requireRoles(["admin", "manager"]),
    async (req: Request, res: Response) => {
      try {
        const prod = await db.addProduct(req.body);
        res.status(201).json(prod);
      } catch (err: any) {
        res.status(400).json({ error: err.message });
      }
    }
  );

  app.put(
    "/api/products/:id",
    authenticateToken,
    requireRoles(["admin", "manager"]),
    async (req: Request, res: Response) => {
      try {
        const updated = await db.updateProduct(req.params.id, req.body);
        res.json(updated);
      } catch (err: any) {
        res.status(400).json({ error: err.message });
      }
    }
  );

  app.delete(
    "/api/products/:id",
    authenticateToken,
    requireRoles(["admin"]),
    async (req: Request, res: Response) => {
      try {
        await db.deleteProduct(req.params.id);
        res.json({ success: true, message: "Product deleted successfully" });
      } catch (err: any) {
        res.status(400).json({ error: err.message });
      }
    }
  );

  // --- Customers Endpoints ---
  app.get("/api/customers", authenticateToken, async (req: Request, res: Response) => {
    res.json(await db.getCustomers());
  });

  app.post("/api/customers", authenticateToken, async (req: Request, res: Response) => {
    const { name, phone, address } = req.body;
    if (!phone) {
      res.status(400).json({ error: "Phone number is required" });
      return;
    }
    const customer = await db.getOrCreateCustomer(name, phone, address);
    res.status(201).json(customer);
  });

  // --- Sales / Billing Endpoints ---
  app.get("/api/bills", authenticateToken, async (req: Request, res: Response) => {
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
  });

  app.get("/api/bills/:id", authenticateToken, async (req: Request, res: Response) => {
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
  });

  app.post("/api/bills", authenticateToken, async (req: Request, res: Response) => {
    try {
      const sale = await db.createSale(req.body);
      res.status(201).json(sale);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- Exchange Endpoints ---
  app.get("/api/exchange", authenticateToken, async (req: Request, res: Response) => {
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
        oldItemName: oldProduct ? `${oldProduct.name} (${oldProduct.size}/${oldProduct.color})` : "Unknown Product",
        newItemName: newProduct ? `${newProduct.name} (${newProduct.size}/${newProduct.color})` : "Unknown Product",
        originalBillNumber: originalSale ? originalSale.billNumber : "N/A",
        customerName: customer ? customer.name : "Walk-In Customer",
      };
    });

    res.json(formatted);
  });

  app.post("/api/exchange", authenticateToken, async (req: Request, res: Response) => {
    try {
      const exchange = await db.createExchange(req.body);
      res.status(201).json(exchange);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- Return Endpoints ---
  app.get("/api/returns", authenticateToken, async (req: Request, res: Response) => {
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
        productName: product ? `${product.name} (${product.size}/${product.color})` : "Unknown Product",
        originalBillNumber: originalSale ? originalSale.billNumber : "N/A",
        customerName: customer ? customer.name : "Walk-In Customer",
      };
    });

    res.json(formatted);
  });

  app.post("/api/returns", authenticateToken, async (req: Request, res: Response) => {
    try {
      const ret = await db.createReturn(req.body);
      res.status(201).json(ret);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- Settings Endpoints ---
  app.get("/api/settings", authenticateToken, async (req: Request, res: Response) => {
    res.json(await db.getSettings());
  });

  app.put(
    "/api/settings",
    authenticateToken,
    requireRoles(["admin", "manager"]),
    async (req: Request, res: Response) => {
      res.json(await db.updateSettings(req.body));
    }
  );

  // --- User Management Endpoints (for Settings View) ---
  app.get("/api/users", authenticateToken, requireRoles(["admin"]), async (req: Request, res: Response) => {
    const allUsers = await db.getUsers();
    const users = allUsers.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt
    }));
    res.json(users);
  });

  app.post("/api/users", authenticateToken, requireRoles(["admin"]), async (req: Request, res: Response) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    if (await db.getUserByEmail(email)) {
      res.status(400).json({ error: "Email is already registered" });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    try {
      const newUser = await db.addUser({
        name,
        email,
        passwordHash,
        role
      });
      res.status(201).json({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/users/:id", authenticateToken, requireRoles(["admin"]), async (req: Request, res: Response) => {
    const { id } = req.params;
    if (id === "u_admin" || id === req.user?.id) {
      res.status(400).json({ error: "Cannot delete the master admin or currently logged in user." });
      return;
    }

    try {
      await db.deleteUser(id);
      res.json({ success: true, message: "User deleted successfully" });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- Reports & Analytics Endpoint ---
  app.get("/api/reports", authenticateToken, async (req: Request, res: Response) => {
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
            name: prod.name + ` (${prod.size}/${prod.color})`,
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
  });

  // --- Serve Client in Production & Vite Dev Middleware ---
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  });

  // ONLY listen if not running in Vercel environment
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }

  return app;
}

const appPromise = startServer();

export default async function (req: Request, res: Response) {
  try {
    const app = await appPromise;
    // Handle Vercel's request
    return app(req, res);
  } catch (err: any) {
    console.error("CRITICAL: Vercel Serverless Function Failed to Start:", err);
    res.status(500).json({ 
      error: "Server Startup Error", 
      message: err.message,
      hint: "Check if firebase-applet-config.json exists or check Firebase Environment Variables (FIREBASE_PROJECT_ID, etc.)"
    });
  }
}

