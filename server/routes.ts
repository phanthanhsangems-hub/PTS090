import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { registerChatRoutes } from "./replit_integrations/chat/routes";

export async function registerRoutes(app: Express): Promise<Server> {
  registerChatRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
