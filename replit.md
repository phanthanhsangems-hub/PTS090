# AI Chat Assistant

## Overview
An AI-powered chat assistant web app built with a vanilla JS frontend and Express.js backend. Uses OpenAI via Replit's built-in AI Integrations for streaming chat responses.

## Architecture
- **Frontend**: Vanilla HTML/CSS/JS served as static files from `public/` directory
- **Backend**: Express.js with TypeScript (port 5001 internally)
- **Launcher**: `launcher.js` — Node.js proxy on port 8083 that forwards to Express on 5001. Port 8083 maps to external port 80 via `.replit` config, making the app externally accessible.
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI integration via Replit AI Integrations (`AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`)
- **Auth**: Replit Auth (x-replit-user-* headers)

## Key Files
- `launcher.js` - Port proxy: opens 8083 immediately, forwards to Express on 5001
- `start.sh` - Startup script that runs the launcher
- `public/index.html` - Main HTML page with login and chat screens
- `public/styles.css` - All CSS styles
- `public/app.js` - Frontend JavaScript (auth, chat, streaming SSE)
- `server/index.ts` - Express server setup, static file serving
- `server/routes.ts` - Route registration
- `server/auth.ts` - Replit Auth middleware and user extraction
- `server/replit_integrations/chat/routes.ts` - Chat API routes (CRUD conversations, streaming SSE messages)
- `server/replit_integrations/chat/storage.ts` - Database operations for conversations/messages
- `server/db.ts` - Drizzle ORM database connection
- `shared/schema.ts` - Database schema (conversations, messages tables)

## Workflows
- **Start application**: `bash start.sh` — runs launcher.js which proxies port 8083 → Express on 5001

## Port Mapping (from .replit)
- Port 8083 → external port 80 (main app URL)
- Port 8080 → external port 8080
- Port 8082 → external port 3000
- Port 5000 detection is broken in this environment; avoided via launcher proxy

## Design
- Indigo (#6366f1) accent color
- White/gray bubbles for assistant, indigo bubbles for user
- Custom header with star icon, new chat button, user avatar
- Streaming responses with typing indicator
- Replit Auth login with orange "Sign in with Replit" button

## Notes
- Chat routes are protected by requireAuth middleware
- Conversations are not scoped to individual users (all users share conversations)
