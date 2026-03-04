import type { Express, Request, Response } from "express";

export interface ReplitUser {
  id: string;
  name: string;
  roles: string;
  profileImage: string;
  bio: string;
  url: string;
}

export function getReplitUser(req: Request): ReplitUser | null {
  const userId = req.headers["x-replit-user-id"];
  const userName = req.headers["x-replit-user-name"];

  if (!userId || !userName || userId === "" || userName === "") {
    return null;
  }

  return {
    id: userId as string,
    name: userName as string,
    roles: (req.headers["x-replit-user-roles"] as string) || "",
    profileImage: (req.headers["x-replit-user-profile-image"] as string) || "",
    bio: (req.headers["x-replit-user-bio"] as string) || "",
    url: (req.headers["x-replit-user-url"] as string) || "",
  };
}

export function requireAuth(req: Request, res: Response, next: () => void) {
  const user = getReplitUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", (req: Request, res: Response) => {
    const user = getReplitUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(user);
  });
}
