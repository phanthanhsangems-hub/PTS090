"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/index.ts
var import_http = __toESM(require("http"));
var import_express = __toESM(require("express"));

// server/replit_integrations/chat/routes.ts
var import_openai = __toESM(require("openai"));

// server/db.ts
var import_node_postgres = require("drizzle-orm/node-postgres");
var import_pg = __toESM(require("pg"));

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
var import_drizzle_orm = require("drizzle-orm");
var import_pg_core = require("drizzle-orm/pg-core");
var import_drizzle_zod = require("drizzle-zod");
var users = (0, import_pg_core.pgTable)("users", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  username: (0, import_pg_core.text)("username").notNull().unique(),
  password: (0, import_pg_core.text)("password").notNull()
});
var insertUserSchema = (0, import_drizzle_zod.createInsertSchema)(users).pick({
  username: true,
  password: true
});
var conversations = (0, import_pg_core.pgTable)("conversations", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  title: (0, import_pg_core.text)("title").notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").default(import_drizzle_orm.sql`CURRENT_TIMESTAMP`).notNull()
});
var messages = (0, import_pg_core.pgTable)("messages", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  conversationId: (0, import_pg_core.integer)("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: (0, import_pg_core.text)("role").notNull(),
  content: (0, import_pg_core.text)("content").notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").default(import_drizzle_orm.sql`CURRENT_TIMESTAMP`).notNull()
});
var insertConversationSchema = (0, import_drizzle_zod.createInsertSchema)(conversations).omit({
  id: true,
  createdAt: true
});
var insertMessageSchema = (0, import_drizzle_zod.createInsertSchema)(messages).omit({
  id: true,
  createdAt: true
});

// server/db.ts
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}
var pool = new import_pg.default.Pool({
  connectionString: process.env.DATABASE_URL
});
var db = (0, import_node_postgres.drizzle)(pool, { schema: schema_exports });

// server/replit_integrations/chat/storage.ts
var import_drizzle_orm2 = require("drizzle-orm");
var chatStorage = {
  async getConversation(id) {
    const [conversation] = await db.select().from(conversations).where((0, import_drizzle_orm2.eq)(conversations.id, id));
    return conversation;
  },
  async getAllConversations() {
    return db.select().from(conversations).orderBy((0, import_drizzle_orm2.desc)(conversations.createdAt));
  },
  async createConversation(title) {
    const [conversation] = await db.insert(conversations).values({ title }).returning();
    return conversation;
  },
  async deleteConversation(id) {
    await db.delete(messages).where((0, import_drizzle_orm2.eq)(messages.conversationId, id));
    await db.delete(conversations).where((0, import_drizzle_orm2.eq)(conversations.id, id));
  },
  async getMessagesByConversation(conversationId) {
    return db.select().from(messages).where((0, import_drizzle_orm2.eq)(messages.conversationId, conversationId)).orderBy(messages.createdAt);
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
var openai = new import_openai.default({
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
var path = __toESM(require("path"));
var app = (0, import_express.default)();
var log = console.log;
var port = parseInt(process.env.PORT || "5000", 10);
var server = import_http.default.createServer(app);
server.listen({ port, host: "0.0.0.0" }, () => {
  log(`express server serving on port ${port}`);
});
app.use(
  import_express.default.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(import_express.default.urlencoded({ extended: false }));
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
  app.use(import_express.default.static(path.resolve(process.cwd(), "public")));
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
