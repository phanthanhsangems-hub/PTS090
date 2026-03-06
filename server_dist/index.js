var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import http from "http";
import express from "express";

// server/replit_integrations/chat/routes.ts
import OpenAI from "openai";

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  conversations: () => conversations,
  insertConversationSchema: () => insertConversationSchema,
  insertMessageSchema: () => insertMessageSchema,
  insertUserSchema: () => insertUserSchema,
  messages: () => messages,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, serial, integer, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true
});
var insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true
});

// server/db.ts
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}
var pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});
var db = drizzle(pool, { schema: schema_exports });

// server/replit_integrations/chat/storage.ts
import { eq, desc } from "drizzle-orm";
var chatStorage = {
  async getConversation(id) {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  },
  async getAllConversations() {
    return db.select().from(conversations).orderBy(desc(conversations.createdAt));
  },
  async createConversation(title) {
    const [conversation] = await db.insert(conversations).values({ title }).returning();
    return conversation;
  },
  async deleteConversation(id) {
    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
  },
  async getMessagesByConversation(conversationId) {
    return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
  },
  async createMessage(conversationId, role, content) {
    const [message] = await db.insert(messages).values({ conversationId, role, content }).returning();
    return message;
  }
};

// server/auth.ts
function getReplitUser(req) {
  const userId = req.headers["x-replit-user-id"];
  const userName = req.headers["x-replit-user-name"];
  if (!userId || !userName || userId === "" || userName === "") {
    return null;
  }
  return {
    id: userId,
    name: userName,
    roles: req.headers["x-replit-user-roles"] || "",
    profileImage: req.headers["x-replit-user-profile-image"] || "",
    bio: req.headers["x-replit-user-bio"] || "",
    url: req.headers["x-replit-user-url"] || ""
  };
}
function requireAuth(req, res, next) {
  const user = getReplitUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
function registerAuthRoutes(app2) {
  app2.get("/api/auth/user", (req, res) => {
    const user = getReplitUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(user);
  });
}

// server/replit_integrations/chat/routes.ts
var openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
});
function registerChatRoutes(app2) {
  app2.use("/api/conversations", requireAuth);
  app2.get("/api/conversations", async (req, res) => {
    try {
      const conversations2 = await chatStorage.getAllConversations();
      res.json(conversations2);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });
  app2.get("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages2 = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages: messages2 });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });
  app2.post("/api/conversations", async (req, res) => {
    try {
      const { title } = req.body;
      const conversation = await chatStorage.createConversation(title || "New Chat");
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });
  app2.delete("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });
  app2.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;
      await chatStorage.createMessage(conversationId, "user", content);
      const messages2 = await chatStorage.getMessagesByConversation(conversationId);
      const chatMessages = messages2.map((m) => ({
        role: m.role,
        content: m.content
      }));
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      const stream = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: chatMessages,
        stream: true,
        max_completion_tokens: 8192
      });
      let fullResponse = "";
      for await (const chunk of stream) {
        const content2 = chunk.choices[0]?.delta?.content || "";
        if (content2) {
          fullResponse += content2;
          res.write(`data: ${JSON.stringify({ content: content2 })}

`);
        }
      }
      await chatStorage.createMessage(conversationId, "assistant", fullResponse);
      res.write(`data: ${JSON.stringify({ done: true })}

`);
      res.end();
    } catch (error) {
      console.error("Error sending message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to send message" })}

`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });
}

// server/routes.ts
async function registerRoutes(app2) {
  registerAuthRoutes(app2);
  registerChatRoutes(app2);
}

// server/index.ts
import * as path from "path";
var app = express();
var log = console.log;
var port = parseInt(process.env.PORT || "5000", 10);
var server = http.createServer(app);
server.listen({ port, host: "0.0.0.0" }, () => {
  log(`express server serving on port ${port}`);
});
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
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
      logLine = logLine.slice(0, 79) + "\u2026";
    }
    log(logLine);
  });
  next();
});
(async () => {
  await registerRoutes(app);
  app.use(express.static(path.resolve(process.cwd(), "public")));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.resolve(process.cwd(), "public", "index.html"));
  });
  app.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
})();
