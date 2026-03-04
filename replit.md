# AI Chat Assistant

## Overview
An AI-powered chat assistant web app built with a vanilla JS frontend and Express.js backend. Uses OpenAI via Replit's built-in AI Integrations for streaming chat responses.

## Architecture
- **Frontend**: Vanilla HTML/CSS/JS served as static files from `public/` directory
- **Backend**: Express.js with TypeScript (port 5000)
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI integration via Replit AI Integrations (`AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`)
- **Auth**: Replit Auth (x-replit-user-* headers)

## Key Files
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
- **Start application**: `npm run server:dev` (webview output, serves both frontend and API on port 5000)

## Design
- Indigo (#6366f1) accent color
- White/gray bubbles for assistant, indigo bubbles for user
- Custom header with star icon, new chat button, user avatar
- Streaming responses with typing indicator
- Replit Auth login with orange "Sign in with Replit" button

## Known Issues
- Chat routes are not protected by auth middleware (conversations not scoped to users)
