import type { Express } from "express";
import { registerChatRoutes } from "./replit_integrations/chat/routes";
import { registerAuthRoutes } from "./auth";

export async function registerRoutes(app: Express): Promise<void> {
  registerAuthRoutes(app);
  registerChatRoutes(app);
}
