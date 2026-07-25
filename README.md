# SyncRoom

Collaborative music listening — create a room, share a code, listen in sync.

## Stack

- **Frontend:** Next.js, React, TypeScript, TailwindCSS, shadcn/ui, Zustand, Socket.IO Client, React Query
- **Backend:** NestJS, Socket.IO, Redis, YouTube Data API, Zod, ioredis

## Getting Started

### Prerequisites

- Node.js 20+
- Redis (local or [Upstash](https://upstash.com/))
- YouTube Data API key (optional — mock results used without it)

### Install

```bash
npm install
npm run build:shared
```

### Environment

Copy env examples and configure:

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env.local
```

**Server (`apps/server/.env`):**

| Variable | Description |
|----------|-------------|
| `PORT` | API port (default `3001`) |
| `CORS_ORIGIN` | Frontend URL |
| `REDIS_URL` | Redis connection string |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key |

**Web (`apps/web/.env.local`):**

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend REST URL |
| `NEXT_PUBLIC_SOCKET_URL` | Backend Socket.IO URL |

### Run

```bash
# Start Redis locally, then:
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Project Structure

```
apps/
  web/          Next.js frontend
  server/       NestJS backend
packages/
  shared/       Shared types & socket events
```

## Features

- Create/join rooms with 6-character codes
- In-app YouTube search with caching & ranking
- Synchronized playback (play, pause, seek, skip)
- Shared queue with auto-advance
- Real-time presence & host transfer
- Keyboard shortcuts: `/` search, `Space` play/pause, `Esc` close search

## Deployment

- **Frontend:** Vercel — set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL`
- **Backend:** Railway — set `REDIS_URL`, `CORS_ORIGIN`, `YOUTUBE_API_KEY`
- **Redis:** Upstash
