const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /app\.listen\(PORT, "0\.0\.0\.0", \(\) => {[\s\S]*?}\);/g,
  `if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(\`Server running on http://0.0.0.0:\${PORT}\`);
    });
  }`
);

code = code.replace(
  /startServer\(\);/g,
  `const appPromise = startServer();\nexport default async function (req, res) {\n  const app = await appPromise;\n  return app(req, res);\n}`
);

// We have to change startServer to return the app
code = code.replace(/async function startServer\(\) {/g, "async function startServer() {");
code = code.replace(/if \(process\.env\.NODE_ENV !== "production"\) {/g, "if (process.env.NODE_ENV !== \"production\" && !process.env.VERCEL) {");

code = code.replace(/app\.listen/g, "return app;\n  // app.listen");

fs.writeFileSync('server.ts', code);
