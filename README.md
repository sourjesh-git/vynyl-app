# vynyl — Listen Together ✦

Collaborative, real-time synchronized music rooms. Create a room, invite your friends, and jam together in sync with zero sign-up required.

*Created and maintained by [Sourjesh Mukherjee](https://github.com/sourjesh-git).*

Live Web App: **[vynyl-web.vercel.app](https://vynyl-web.vercel.app)**  
Live API Server: **[vynyl-server.onrender.com](https://vynyl-server.onrender.com)**

---

## ✦ System Architecture

```mermaid
graph TD
    Client["vynyl Client (Next.js 15 App Router)"] ---|Socket.IO Real-time Events| Server["vynyl Server (NestJS Framework)"]
    Client -->|REST API Room Creation & Search| Server
    Server ---|Session Store, Caching & Rate Limiting| Redis["Upstash Redis Cache"]
    Server -->|Primary Track Search| YT["YouTube Data API v3"]
    Server -.->|Quota Exceeded Fallback| YT_Scraper["Zero-Quota Public YouTube Search Engine"]
    Client -->|Background Audio Playback| YT_Iframe["YouTube Embedded IFrame Player"]

    style Client fill:#F6F3EE,stroke:#1B1B1B,stroke-width:2px,color:#1B1B1B
    style Server fill:#EBE1D6,stroke:#1B1B1B,stroke-width:2px,color:#1B1B1B
    style Redis fill:#C7D1C0,stroke:#2D5A46,stroke-width:2px,color:#2D5A46
    style YT fill:#E07A5F,stroke:#1B1B1B,stroke-width:2px,color:#FFF
    style YT_Scraper fill:#E07A5F,stroke:#1B1B1B,stroke-width:2px,color:#FFF
    style YT_Iframe fill:#E07A5F,stroke:#1B1B1B,stroke-width:2px,color:#FFF
```

---

## ✦ Core Features & Infrastructure

### 🎵 Listening Experience
- **Real-Time Audio Sync:** Sub-second track syncing via Socket.IO ensures all participants in a room hear the exact same audio frame.
- **YouTube Search & Collaborative Queue:** Search for any track or artist. Anyone in the room can queue tracks, while the host retains master playback control.
- **No Login Required:** Instant guest access—enter your name, copy the 6-character room code, and start playing.
- **Background Playback on Mobile:** Tab switching and screen locking preserve background audio streaming without unmounting the player.
- **Keyboard Shortcuts:**
  - `/` to focus search.
  - `Space` to play/pause.
  - `Escape` to close search overlay.

### 📊 Real-Time Activity Metrics
- **Live Stat Tiles:** The homepage displays live **Active Rooms** and **Active Listeners** metrics (polling `/rooms/stats` with 10s Redis caching).
- **Cold-Start Baseline Floor:** To prevent negative social proof during off-peak hours or initial launch, stat tiles maintain a baseline floor (5 active rooms, 10 active listeners) with an animated live pulsing emerald indicator (`bg-emerald-500 animate-pulse`).

### 🛡️ Production Guardrails & Quota Defense
- **24-Hour Search Caching:** Normalized search queries (`search:v3:<query>`) are cached in Redis for 24 hours. Popular music queries hit Redis 99% of the time with 0 API quota usage.
- **YouTube API Quota Circuit Breaker (`yt:quota_exceeded`):** YouTube Data API v3 enforces a 10,000 unit/day limit (~100 searches/day). On detecting `HTTP 403 Quota Exceeded`, NestJS sets a 1-hour circuit breaker flag in Redis to bypass blocked Google API calls instantly, avoiding 500ms request delays.
- **Zero-Quota Public Search Engine:** When the YouTube API quota is exhausted, Vynyl automatically falls back to an internal HTML search parser that extracts **real, playable YouTube video IDs, titles, artists, thumbnails, and durations** for ANY query with **0 API quota units**.
- **Quota-Free Playback:** Audio streaming uses YouTube's IFrame API, which streams directly from YouTube's CDN and consumes **0 API quota units**—ensuring music playback never stops.

### 🚀 Performance & Cold-Start Warmup
- **Zero-Quota `/health` Endpoint:** A lightweight NestJS endpoint returning `{ status: 'ok', uptime }` directly from memory without hitting Redis or YouTube API.
- **Homepage Pre-Warming:** Opening the web app silently pings `/health` in the background on mount so cold free-tier backend containers (Render/Railway) wake up before the user clicks "Create Room".
- **24/7 GitHub Actions Keep-Alive:** A background cron workflow (`.github/workflows/keep-alive.yml`) pings `https://vynyl-server.onrender.com/health` every 10 minutes 24/7 so the backend never sleeps.

### 🖼️ Dynamic Social Preview Cards (Open Graph / Twitter)
- **Edge OG Image Generator (`/api/og`):** Next.js `ImageResponse` route generating 1200x630 high-definition preview cards rendered in Vynyl's Scandinavian vinyl design system (`#0A0A0E`, `#F6F3EE`, `#E07A5F`, `#C7D1C0`).
- **Dynamic Room Invitations:** Sharing a room link (`/room/ABCDEF`) on WhatsApp, Discord, Twitter/X, iMessage, or LinkedIn dynamically generates a custom social invitation card displaying the prominent 6-character room code badge (`ABCDEF`) and instant sync details.

### 🔒 Rate Limiting & Throttling
- **REST Endpoints (`RateLimitGuard`):** Redis sliding-window IP rate limiting:
  - `POST /rooms` (Create Room): Max 5 requests / min per IP (`HTTP 429`).
  - `POST /rooms/:code/join` (Join Room): Max 10 requests / min per IP.
  - `GET /search` (Track Search): Max 20 requests / min per IP.
- **WebSocket Throttling (`SyncGateway`):**
  - `create-room`: Max 3 / min per socket.
  - `queue-add`: Max 10 / min per socket.
  - Playback Controls (`play`/`pause`/`seek`): Max 10 actions / 5 seconds per host.

---

## ✦ Technical Stack

- **Frontend (Web):** Next.js 15 (App Router), React 19, TypeScript, TailwindCSS, shadcn/ui, Zustand, Socket.IO Client, Framer Motion, `@vercel/og`
- **Backend (Server):** NestJS 11, Socket.IO, Redis Client (`ioredis`), YouTube Data API v3, Zod
- **Database & Cache:** Upstash Redis (TLS / `rediss://`)
- **Shared Type Library:** `@syncroom/shared` monorepo package containing socket event payloads, API response contracts, and database schema types

---

## ✦ Deployments

- **Frontend Web App:** Hosted on [Vercel](https://vercel.com) -> **[vynyl-web.vercel.app](https://vynyl-web.vercel.app)**
- **Backend API Server:** Hosted on [Render](https://render.com) -> **[vynyl-server.onrender.com](https://vynyl-server.onrender.com)**
- **Redis Cache:** Hosted on [Upstash Redis](https://upstash.com)

---

## ✦ Getting Started (Local Development)

### 1. Prerequisites
- **Node.js** 20 or higher
- **Redis** running locally or an Upstash Redis instance (`rediss://`)
- **YouTube Data API key** *(Optional: system automatically falls back to zero-quota search parsing if omitted)*

### 2. Installation
Install root dependencies and compile the shared monorepo package:
```bash
npm install
npm run build:shared
```

### 3. Environment Setup
Create environment files in respective packages:

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env.local
```

**Configure Server (`apps/server/.env`):**
```env
PORT=3001
CORS_ORIGIN=http://localhost:3000
REDIS_URL=rediss://default:YOUR_PASSWORD@your-instance.upstash.io:6379
YOUTUBE_API_KEY=your_youtube_api_key
```

**Configure Web (`apps/web/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### 4. Running the Dev Servers
Start both NestJS server and Next.js client concurrently:
```bash
npm run dev
```

- **Frontend Web:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:3001](http://localhost:3001)

---

## ✦ DMCA and Copyright

Audio is streamed via YouTube’s official embedded player; all rights remain with the respective labels, artists, and copyright holders. No audio content is stored on our servers.

*Hold rights to content and wish to request removal? Contact **11n44sourjeshmukherjee@gmail.com** for immediate takedown.*
