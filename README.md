# vynyl — Listen Together ✦

Collaborative, real-time synchronized music rooms. Create a room, invite your friends, and jam together in sync. 

*Created and maintained by [Sourjesh Mukherjee](https://github.com/sourjesh-git).*

Live Web App: **[vynyl-web.vercel.app](https://vynyl-web.vercel.app)**

---

## ✦ System Architecture (Simplified)

```mermaid
graph TD
    Client["vynyl Client (Next.js App)"] <-->|Socket.IO (Real-time Events)| Server["vynyl Server (NestJS Framework)"]
    Client -->|REST API (Room Creation/Join)| Server
    Server <-->|Session Store & State Synchronization| Redis["Upstash Redis Cache"]
    Server -->|Track Queries| YT["YouTube Data API v3"]
    Client -->|Background Playback| YT_Iframe["YouTube Embedded IFrame Player"]

    style Client fill:#F6F3EE,stroke:#1B1B1B,stroke-width:2px,color:#1B1B1B
    style Server fill:#EBE1D6,stroke:#1B1B1B,stroke-width:2px,color:#1B1B1B
    style Redis fill:#C7D1C0,stroke:#2D5A46,stroke-width:2px,color:#2D5A46
    style YT fill:#E07A5F,stroke:#1B1B1B,stroke-width:2px,color:#FFF
    style YT_Iframe fill:#E07A5F,stroke:#1B1B1B,stroke-width:2px,color:#FFF
```

---

## ✦ Core Features

- **Real-Time Sync:** Socket.IO handles sub-second track syncing so everyone in the room hears the exact same moment.
- **Works Anywhere:** Clean, responsive design optimized for standard PCs, MacBook Air/Laptops (re-renders only the footer on scroll to prevent subpixel scaling glitches), tablets (polished mobile tabs layout), and mobile devices.
- **Background Playback on Mobile:** Tab switching does not unmount the audio player, preserving background listening.
- **No Login Required:** Enter your name, copy the 6-character room code, and start playing.
- **Concentric Record Spiral Brand Logo:** Visual vinyl spinning assets synced across headers, sidebars, and footers.
- **Totally Free:** 100% free forever with no ads.
- **YouTube Search & Collaborative Queue:** Find tracks dynamically and queue them up.
- **Keyboard Shortcuts:** 
  - `/` to focus the search bar.
  - `Space` to play/pause (from anywhere on the body).
  - `Escape` to blur/close the search autocomplete.

---

## ✦ Technical Stack

- **Frontend (Web):** Next.js (App Router), React 19, TypeScript, TailwindCSS, shadcn/ui, Zustand, Socket.IO Client, Framer Motion
- **Backend (Server):** NestJS, Socket.IO, Redis Client (`ioredis`), YouTube Data API, Zod
- **Shared Type Library:** `@syncroom/shared` monorepo package containing socket event payloads and database schema type contracts

---

## ✦ Deployments

- **Frontend:** Hosted on [Vercel](https://vercel.com) -> **[vynyl-web.vercel.app](https://vynyl-web.vercel.app)**
- **Backend Server:** Hosted on [Railway](https://railway.app)
- **Redis Cache:** Hosted on [Upstash Redis](https://upstash.com)

---

## ✦ Getting Started (Local Development)

### 1. Prerequisites
- **Node.js** 20 or higher
- **Redis** running locally (or Upstash instance)
- **YouTube Data API key** (Optional: fallbacks to mock results if omitted)

### 2. Installation
Install root dependencies and compile the shared libraries:
```bash
npm install
npm run build:shared
```

### 3. Environment Setup
Configure environment files in respective packages:

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env.local
```

**Configure Server (`apps/server/.env`):**
- `PORT=3001`
- `CORS_ORIGIN=http://localhost:3000`
- `REDIS_URL=redis://localhost:6379`
- `YOUTUBE_API_KEY=your_key`

**Configure Web (`apps/web/.env.local`):**
- `NEXT_PUBLIC_API_URL=http://localhost:3001`
- `NEXT_PUBLIC_SOCKET_URL=http://localhost:3001`

### 4. Running the Dev Servers
Start both the NestJS server and Next.js client concurrently:
```bash
npm run dev
```

- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **Backend:** [http://localhost:3001](http://localhost:3001)

---

## ✦ DMCA and Copyright

Audio is streamed through YouTube’s embedded player; all rights remain with the respective labels, composers, and performers. Nothing is hosted on our servers. 

*Hold rights to something here and want it removed? Email **11n44sourjeshmukherjee@gmail.com** and it will be taken down immediately.*
