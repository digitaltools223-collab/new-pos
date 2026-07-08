const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const correctBottom = `  // --- Serve Client in Production & Vite Dev Middleware ---
  if (process.env.NODE_ENV !== "production") {
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on http://0.0.0.0:\${PORT}\`);
  });
}

startServer();
`;

code = code.substring(0, code.indexOf("  // --- Serve Client in Production & Vite Dev Middleware ---")) + correctBottom;
fs.writeFileSync('server.ts', code);
