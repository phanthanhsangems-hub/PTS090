import http from "http";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import * as path from "path";

const app = express();
const log = console.log;
const port = parseInt(process.env.PORT || "5000", 10);

const server = http.createServer(app);

server.listen({ port, host: "0.0.0.0" }, () => {
  log(`express server serving on port ${port}`);
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    if (!reqPath.startsWith("/api")) return;

    const duration = Date.now() - start;
    let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
    if (capturedJsonResponse) {
      logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
    }
    if (logLine.length > 80) {
      logLine = logLine.slice(0, 79) + "…";
    }
    log(logLine);
  });

  next();
});

(async () => {
  await registerRoutes(app);

  app.use(express.static(path.resolve(process.cwd(), "public")));

  app.get(/.*/, (_req: Request, res: Response) => {
    res.sendFile(path.resolve(process.cwd(), "public", "index.html"));
  });

  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });
})();
