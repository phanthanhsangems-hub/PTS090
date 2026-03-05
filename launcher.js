const net = require("net");
const http = require("http");
const { spawn } = require("child_process");

const EXTERNAL_PORT = 8083;
const BACKEND_PORT = 5001;
let child = null;
let serverReady = false;

const proxy = http.createServer((req, res) => {
  if (serverReady) {
    const opts = {
      hostname: "127.0.0.1",
      port: BACKEND_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers,
    };
    const proxyReq = http.request(opts, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on("error", () => {
      res.writeHead(503);
      res.end("Service starting...");
    });
    req.pipe(proxyReq);
  } else {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end('<!DOCTYPE html><html><head><meta charset="utf-8"><title>AI Assistant</title></head><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif"><p>Starting...</p></body></html><script>setTimeout(()=>location.reload(),2000)</script>');
  }
});

proxy.listen(EXTERNAL_PORT, "0.0.0.0", () => {
  console.log("Proxy ready on port " + EXTERNAL_PORT);

  child = spawn("npx", ["tsx", "server/index.ts"], {
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "development", PORT: String(BACKEND_PORT) },
  });

  const check = () => {
    const sock = net.createConnection({ port: BACKEND_PORT, host: "127.0.0.1" }, () => {
      sock.destroy();
      serverReady = true;
      console.log("Backend ready on port " + BACKEND_PORT + ", proxying through port " + EXTERNAL_PORT);
    });
    sock.on("error", () => setTimeout(check, 500));
  };
  setTimeout(check, 1000);

  child.on("exit", (code) => process.exit(code || 0));
});

process.on("SIGTERM", () => {
  if (child) child.kill("SIGTERM");
  proxy.close();
  setTimeout(() => process.exit(0), 3000);
});
process.on("SIGINT", () => {
  if (child) child.kill("SIGINT");
  process.exit(0);
});
