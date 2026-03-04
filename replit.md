# AI Chat Assistant

## Overview
An AI-powered chat assistant mobile app built with Expo/React Native frontend and Express.js backend. Uses OpenAI via Replit's built-in AI Integrations for streaming chat responses.

## Architecture
- **Frontend**: Expo/React Native (port 8081) with file-based routing via expo-router
- **Backend**: Express.js with TypeScript (port 5000)
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI integration via Replit AI Integrations (`AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`)
- **Auth**: Replit Auth (x-replit-user-* headers)

## Key Files
- `app/(tabs)/index.tsx` - Main chat UI with streaming, inverted FlatList, keyboard handling
- `server/replit_integrations/chat/routes.ts` - Chat API routes (CRUD conversations, streaming SSE messages)
- `server/replit_integrations/chat/storage.ts` - Database operations for conversations/messages
- `server/auth.ts` - Replit Auth middleware and user extraction
- `server/db.ts` - Drizzle ORM database connection
- `shared/schema.ts` - Database schema (conversations, messages tables)
- `context/AuthContext.tsx` - React context for auth state
- `lib/query-client.ts` - API client with React Query setup

## Workflows
- **Start Backend**: `npm run server:dev` (console output, no port detection)
- **Start Frontend**: Expo dev server with HMR

## Design
- Indigo (#6366f1) accent color
- White/gray bubbles for assistant, indigo bubbles for user
- Custom header with sparkles icon, new chat button, user avatar
- Streaming responses with typing indicator

## Known Issues
- Chat routes are not protected by auth middleware (conversations not scoped to users)
- Backend workflow shows console output type (no port detection needed)
