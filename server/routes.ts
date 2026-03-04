import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { registerChatRoutes } from "./replit_integrations/chat/routes";
import { registerAuthRoutes } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  registerAuthRoutes(app);
  registerChatRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
