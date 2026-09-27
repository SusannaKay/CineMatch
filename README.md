# 🎬 CineMatch

> **Stop arguing about what to watch. Swipe, save, and find something you'll actually want to watch. 🍿**

CineMatch is a Tinder-style web app for discovering **movies, TV shows, and anime**. It combines personalized discovery, title-based recommendations, a personal watchlist, and real-time multiplayer matching.

It is designed for one simple problem: *"What should we watch tonight?"*

## 📖 Table of Contents

- [Features](#-features)
- [How It Works](#️-how-it-works)
- [Architecture](#️-architecture)
- [Tech Stack](#️-tech-stack)
- [Getting Started](#-getting-started)
- [Running with Docker](#-running-with-docker)
- [Configuration](#️-configuration)
- [API Usage Limits](#-api-usage-limits)
- [HTTP API](#-http-api)
- [Multiplayer Events](#-multiplayer-events)
- [Roadmap](#️-roadmap)
- [Contributing](#-contributing)
- [Credits](#-credits)
- [License](#-license)

## ✨ Features

### 🎞️ Solo discovery

- Configure your tastes (content type, genre, language, era, runtime, streaming platform) and swipe through a personalized deck.
- Swiping right, or pressing **Like**, automatically saves a title to your Watchlist.
- Swipe up, or tap **Details**, to open a title's full details; swipe down to close them.
- Hide a title permanently from a swipe card so it never appears again on that device.
- **Endless discovery**: if you swipe through a whole batch without liking anything, CineMatch automatically fetches the next page of results with the same filters.

### ✨ Suggestion mode

- Search TMDB for a movie or TV show you already love and use it as a seed.
- Get a list of similar titles presented directly as a grid, without entering swipe mode.
- Save individual recommendations straight to your Watchlist.

### 👥 Multiplayer mode

- Create a room and invite friends with a room code, a shareable link, or a QR code.
- Rooms support up to **8 players** and expire automatically after a period of inactivity — unless created as a **persistent room** (see below).
- Everyone votes independently on the same titles; a per-title timeout auto-skips players who don't vote in time.
- **Group matching**: once everyone has voted, CineMatch keeps every title that reached a **majority** of likes (strictly more than half the players), ranked by number of likes and consensus % — with the top match highlighted.
- If a whole batch is swiped without any title reaching a majority, CineMatch automatically loads the next batch.
- **Auto-pick fallback**: if the group repeatedly fails to reach a majority after several batches in a row, CineMatch picks the best-liked title found so far instead of swiping forever.
- **Resilient to disconnects**: a dropped connection (Wi‑Fi blip, backgrounded tab) doesn't stall or end the session — voting continues among whoever's still connected, and a reconnecting player is seamlessly restored to their exact seat instead of being treated as a new player.
- **Automatic host handover**: if the host disconnects, another connected player is instantly promoted so the room is never stuck.
- **Persistent rooms**: optionally make a room "fixed" for your regular group — the same code keeps working across movie nights and the room stays alive much longer than the default, going dormant instead of being deleted once everyone leaves.
- **Group stats**: each room tracks sessions played, titles seen, matches found, favorite genres, and who's liked the most titles, shown in the lobby and results screen.

### 🔖 Watchlist

- Keep, inspect, sort, and remove titles you've saved from Solo or Suggestion mode — persisted locally across sessions.
- Sort saved titles by the order you added them or by rating (ascending/descending).
- Search saved titles by name and filter by content type (All / Movies / TV Shows) or watched status, with a live count and average rating.
- **Add a title directly**: someone recommended a movie or show? Tap **+ Add** in the Watchlist, search it by name and save it — no swiping needed.
- **Mark as watched**: track which saved titles you've already watched instead of just deleting them.
- **Export**: copy the whole Watchlist as Markdown text, or download it as JSON (backup/reuse) or as a shareable PNG image card.
- **Surprise me**: still can't decide? Pick a random title from your (filtered) Watchlist and jump straight to its details.
- **Server sync (opt-in)**: turn it on in Settings on your own devices to share one Watchlist between phone and computer; it keeps working offline and is exposed read-only at `GET /api/watchlist` (e.g. for a home dashboard).

### 🎬 Title details & data

- **TMDB search** as the starting point for recommendations.
- **Genres, runtime & credits**: each title shows its genres, runtime (per-episode for TV), director (creator for TV shows), and top-billed cast.
- **Aggregated ratings**: TMDB rating always shown; IMDb, Rotten Tomatoes, and Metacritic scores are added automatically when an `OMDB_API_KEY` is configured.
- **Streaming information**: streaming providers for your selected region, when available.
- **Trailers**: available trailers can be opened from a title's details.

### ⚙️ Settings & region

- **Region** — pick your country (US, UK, Canada, Australia, Italy, France, Germany, Spain) from Settings or during onboarding; it drives TMDB's content language and which streaming providers show up.
- **Settings screen** — open it from the gear icon in the header, from anywhere in the app, to change your region or clear your hidden-titles list.

### ⚙️ Cross-cutting

- 👆 **Swipe gestures** — swipe right/left to like/skip, swipe up (or tap "Details") to open a title's details, swipe down to close the details sheet.
- 📱 **LAN support** — play together from phones connected to the same Wi-Fi network.
- 📲 **Installable app (PWA)** — install CineMatch to your phone or desktop home screen; the app shell keeps working offline once you've visited it (live data still needs a connection).
- 🙋 **Remembered nickname** — your multiplayer nickname is saved locally and pre-filled next time.
- 🧪 **Mock data mode** — run the app without a TMDB API key using local demo data, with zero external API calls.
- 👋 **Quick onboarding** — a short, skippable 4-step intro shown on first visit explaining Solo/Suggestion/Multiplayer, picking your region, and a few tips; revisit it anytime from "How does CineMatch work?" on the mode-selection screen.

## 🖥️ How It Works

### Solo

1. Choose **Solo** from the bottom navigation.
2. Configure your filters.
3. Swipe through the generated deck.
4. Swipe right or press **Like** to save a title automatically to your Watchlist.
5. Swipe up, or press **Details**, to see the overview, genres, runtime, director/cast, ratings, streaming providers, and trailer for a title.
6. Tap the eye-slash icon on a card to permanently hide that title from future decks.
7. If you reach the end of a batch without liking anything, CineMatch automatically loads the next batch of titles with the same filters.
8. Open the Watchlist whenever you want to review, sort, search, or remove your saved titles.

### Suggestion

1. Choose **Suggestion** from the bottom navigation.
2. Search for a movie or TV show you already love.
3. Select it as your starting point.
4. CineMatch fetches similar titles from TMDB.
5. Save individual recommendations to your Watchlist.

Suggestion mode is intentionally separate from Solo discovery: **recommendations are presented directly as a list rather than as another swipe session.**

### Multiplayer

1. Choose **Multiplayer** from the bottom navigation.
2. One player creates a room.
3. Friends join using the room code, a shared link, or by scanning the lobby's QR code.
4. The host chooses the filters and starts the session.
5. Everyone votes independently on the same titles (a per-title timeout auto-skips players who don't vote in time).
6. When all players have voted, CineMatch moves to the next title.
7. If the whole batch is swiped without any title reaching a majority, CineMatch automatically fetches the next batch of titles.
8. At the end, the group sees every title that got a **majority of likes** (strictly more than half the players), ranked by number of likes and consensus percentage — with the top match highlighted.
9. If the group still can't agree after several batches in a row, CineMatch's auto-pick fallback steps in and picks the best-liked title found so far, so the night doesn't end in an endless swipe loop.

A session needs at least **2 players** to start. Rooms support up to **8 players** and automatically expire after a period of inactivity — unless created as a **persistent room** (see below), which stays alive much longer and can go dormant and be reused later under the same code.

If a player's connection drops mid-session (Wi‑Fi hiccup, phone lock, backgrounded tab), the room doesn't wait for them: voting continues among everyone still connected, and if the dropped player reconnects within the reconnect grace period (see [Configuration](#️-configuration)) they're restored to their exact seat — same votes, same color, no duplicate entry. If the disconnected player was the host, another connected player is instantly promoted so the room is never stuck.

#### Persistent rooms

When creating a room, the host can check **"Fixed room for the group"**. A persistent room:

- Keeps its 4-letter code reusable across separate movie nights — no need to create a new room each time.
- Stays alive in memory far longer than a regular room (see [Configuration](#️-configuration)), though it does **not** survive a server restart.
- Goes dormant (back to an empty lobby) instead of being deleted once everyone leaves; whoever rejoins first with the same code becomes the new host.
- Accumulates **group stats** (see below) across every session played in that room, for as long as the server keeps running.

#### Group stats

Every room tracks how many sessions it has hosted, how many titles were swiped, how many majority matches were found, the group's favorite genres, and who's liked the most titles. These stats are shown as a small teaser in the lobby and in full on the results screen after each session.

### Watchlist

The Watchlist is local to the browser and persists between sessions using `localStorage`. Titles can be saved from Solo or Suggestion mode and removed at any time.

- **Search & filter** — use the search box, the type chips (All / Movies / TV Shows), and the "To watch / Watched" status chips to narrow down a long list.
- **Add a title** — tap **+ Add** at the top of the Watchlist, type a movie or TV show name and hit **Add** next to the right result. CineMatch fetches its full details (poster, overview, genres, runtime, rating, streaming providers) and saves it, exactly like a title liked in Solo; titles already saved show **Saved**. If the details can't be loaded right then, the title is still saved with its name, year and poster.
- **Mark as watched** — toggle a title as watched instead of removing it, so you keep a record of what you've already seen.
- **Export** — the "Export" menu lets you copy the whole Watchlist as Markdown text (handy to paste in a chat), download it as JSON (for backup or reuse), or download a shareable PNG image card.
- **Surprise me** — still can't decide? Hit **Surprise me** to have CineMatch pick a random title from your current filter for you.
- The stats line always shows a quick count and average rating for whatever's currently in view.

#### Syncing the Watchlist with the server (opt-in)

CineMatch is a group app, so by default every device keeps its **own** local Watchlist and the server knows nothing about it. The server owner can turn on **Settings → Watchlist sync → Sync this device** on their own devices to share **one** Watchlist, stored on the server, between all of them. Guests should leave it off: every synced device writes into the same list.

- **Off (default)** — nothing changes: the list lives only in `localStorage` and no request is ever sent.
- **Turning it on** — the list already on the device is merged into the server's list: same title (same TMDB id and type) means the same entry, so there are no duplicates; a title stays "watched" if it was marked on either side. Nothing is deleted on either side.
- **While on** — adding (from Solo, Suggestion or **+ Add**), removing and marking as watched/to watch are all sent to the server. `localStorage` stays the working copy, so the app responds instantly. Other synced devices get the change within a second (the server pushes a `watchlist:changed` Socket.IO event; they also resync when the app regains focus, on reconnect, and every 60 seconds).
- **Offline** — if the server can't be reached the app keeps working on the local copy. Changes are queued (also in `localStorage`, so they survive a reload) and sent automatically as soon as the server is back (retried with backoff, on reconnect, and on focus). The Watchlist header shows *Offline · N pending* in the meantime.
- **Conflicts** — each change carries its timestamp and the latest change wins, per title (and for the `watched` flag). A title removed on one device isn't brought back by an older, still-queued change from another, and vice versa.
- **Turning it off** — the current list stays on the device as a local-only list; the server copy is not touched.
- **Storage** — the server keeps the list in `data/watchlist.json` (`DATA_DIR`, bind-mounted in Docker; see [Running with Docker](#-running-with-docker)). Writes are validated (unknown fields dropped, strings and lists size-capped, max 2,000 titles), serialized, and atomic (temp file + rename). A corrupt file is set aside as `watchlist.json.corrupt-<timestamp>` and the app starts with an empty synced list instead of crashing.

### Settings

Tap the gear icon in the header from anywhere in the app to open Settings:

- **Region** — pick your country to match streaming availability and content language to where you live.
- **Hidden titles** — see how many titles you've hidden from swipe decks and clear that list in one tap, so they can show up again.

### Installing CineMatch (PWA)

CineMatch ships a web app manifest and a service worker, so supported browsers (Chrome/Edge on Android and desktop, Safari on iOS) can install it like a native app:

1. Open CineMatch in your browser.
2. Look for an "Install app" / "Add to Home Screen" option (or tap the install button that appears in-app when your browser supports it).
3. Once installed, the app shell (HTML/CSS/JS) is cached and keeps loading even with a flaky or offline connection — live data (search, discovery, multiplayer) still requires a network connection.

## 🏗️ Architecture

CineMatch uses a lightweight Node.js backend that serves the frontend, proxies TMDB/OMDB requests, and manages real-time multiplayer sessions.

```text
                         ┌──────────────────────┐
                         │       Browser        │
                         │    HTML / CSS / JS   │
                         └──────────┬───────────┘
                                    │
                              HTTP + Socket.IO
                                    │
                         ┌──────────▼───────────┐
                         │ Express / Node.js    │
                         │     Server           │
                         └──────┬────────┬──────┘
                                │        │
                 ┌──────────────┘        └──────────────┐
                 │                                      │
          ┌──────▼──────┐                       ┌───────▼────────┐
          │ RoomManager │                       │   TMDB Service │
          │   + Rooms   │                       │                │
          └─────────────┘                       └───────┬────────┘
                                                        │
                                          ┌──────────────┼──────────────┐
                                          │                             │
                                   ┌──────▼──────┐              ┌───────▼───────┐
                                   │   TMDB API  │              │   OMDB API    │
                                   │             │              │  (optional)   │
                                   └─────────────┘              └───────────────┘

        Browser-only persistence
                 │
     ┌───────────┼───────────┐
     │           │           │
┌────▼────┐ ┌────▼─────┐ ┌───▼────┐
│Watchlist│ │ Ignored  │ │Nickname│
│         │ │ titles   │ │        │
└─────────┘ └──────────┘ └────────┘
        (all localStorage)
```

### Main components

- **Express** serves the static frontend and exposes HTTP endpoints.
- **Socket.IO** handles room state, player connections, voting, and real-time synchronization.
- **RoomManager** manages multiplayer rooms and their lifecycle, including persistent rooms, reconnect grace periods, host handover, and group stats.
- **TMDB service** builds discovery decks, searches titles, fetches recommendations, and enriches titles with providers, trailers, and (via OMDB, when configured) IMDb/Rotten Tomatoes/Metacritic ratings — all localized to the caller's selected region.
- **Watchlist module** stores saved titles and their watched status locally in the browser (optionally synced with the server).
- **Ignored-titles module** stores permanently hidden title IDs locally in the browser.
- **Mock data** provides a local fallback when TMDB is not configured.

## 🛠️ Tech Stack

**Backend**

| Technology | Purpose |
| --- | --- |
| **Node.js** | Runtime |
| **Express** | HTTP server and static file serving |
| **Socket.IO** | Real-time multiplayer communication |
| **dotenv** | Environment variable management |
| **Docker / Docker Compose** *(optional)* | Containerized self-hosting |

**Frontend**

| Technology | Purpose |
| --- | --- |
| **JavaScript (ES Modules)** | Application logic |
| **HTML / CSS / JavaScript** | Frontend |
| **Tailwind CSS** *(CDN)* | Styling |
| **Font Awesome** *(CDN)* | Icons |
| **qrcodejs** *(CDN)* | QR code generation for multiplayer room invites |
| **Web App Manifest + Service Worker** | Installable app (PWA) with offline-capable app shell |
| **localStorage** | Local Watchlist (with watched status), ignored-titles list, region, and nickname persistence |

**External APIs**

| Technology | Purpose |
| --- | --- |
| **TMDB API** | Movie/TV data, search, recommendations, providers and trailers |
| **OMDB API** *(optional)* | IMDb, Rotten Tomatoes, and Metacritic ratings |

## 🚀 Getting Started

### Prerequisites

- Node.js **18 or newer**
- npm
- A TMDB API key *(optional — mock data is used when no key is configured)*
- An OMDB API key *(optional — enables IMDb/Rotten Tomatoes/Metacritic ratings)*

### 1. Clone the repository

```bash
git clone https://github.com/SusannaKay/CineMatch.git
cd CineMatch
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example file and fill in your keys:

```bash
cp .env.example .env
```

```env
TMDB_API_KEY=your_tmdb_api_key
OMDB_API_KEY=your_omdb_api_key
USE_MOCK_DATA=false
PORT=3000
HOST_PORT=8086
```

If `TMDB_API_KEY` is empty, CineMatch automatically falls back to mock data, so the defaults work out of the box. Once you add a real key, live TMDB data is used — unless `USE_MOCK_DATA=true`, which forces mock data regardless. `OMDB_API_KEY` is optional: without it, titles simply show the TMDB rating without IMDb/Rotten Tomatoes/Metacritic badges.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `TMDB_API_KEY` | No* | — | API key used to fetch live movie and TV data ([get one](https://www.themoviedb.org/settings/api)). |
| `OMDB_API_KEY` | No | — | API key used to add IMDb, Rotten Tomatoes, and Metacritic ratings ([get one](https://www.omdbapi.com/apikey.aspx)). Ratings are silently skipped if omitted. |
| `USE_MOCK_DATA` | No | `false` | Set to `true` to force local mock data even when a TMDB key is set. |
| `PORT` | No | `3000` | Port the Node server listens on when run directly. Ignored in Docker (the container always listens on `3000`). |
| `HOST_PORT` | No | `8086` | Docker only: host port mapped to the container's port `3000`. |

\* If no TMDB API key is provided, CineMatch automatically uses mock data.

### 4. Start the development server

```bash
npm run dev
```

The server will be available at:

```text
http://localhost:3000
```

For a production-style start:

```bash
npm start
```

### 5. Play from your phone (optional)

CineMatch can be played from other devices connected to the same local network. Start the server and look at the terminal output — CineMatch detects the machine's local IPv4 addresses and prints a URL such as:

```text
Network: http://192.168.1.42:3000
```

Open that address from your phone or another device connected to the same Wi-Fi network.

## 🐳 Running with Docker

CineMatch ships a `Dockerfile` (Node 24 Alpine, production dependencies only, runs as the unprivileged `node` user) and a `docker-compose.yml`, handy for hosting it on a home server.

```bash
cp .env.example .env      # then add your API keys
docker compose up -d --build
```

The app is then available at `http://<host>:8086` (change the host port with `HOST_PORT` in `.env`). The compose file reads all variables from `.env`, restarts the container automatically (`unless-stopped`), and a built-in healthcheck polls `/api/config` every 30 seconds — `docker compose ps` shows the health status.

Useful commands:

```bash
docker compose logs -f          # follow logs
docker compose up -d --force-recreate   # apply .env changes
git pull && docker compose up -d --build  # update to the latest version
docker compose down             # stop and remove the container
```

> **PWA install over the network:** browsers only allow installing the app (and registering the service worker) on `localhost` or over **HTTPS**. When self-hosting, put CineMatch behind an HTTPS reverse proxy — for a private setup, `tailscale serve --bg --https=<port> http://127.0.0.1:8086` works well.

> Rooms live in memory only, so restarting or updating the container clears every room, persistent ones included.

**Persistent data.** The only data CineMatch writes to disk is the synced Watchlist, `watchlist.json`. The compose file bind-mounts `./data` (next to `docker-compose.yml`, ignored by git) to `/app/data` in the container, so it survives restarts, rebuilds and `git pull` updates. The container runs as the `node` user (uid 1000), so the folder must be writable by that uid:

```bash
mkdir -p data && sudo chown 1000:1000 data
```

If it isn't writable the app still starts and serves everything, including `GET /api/watchlist`; only sync writes fail (HTTP 503), and devices keep their changes queued until the permissions are fixed. Back up the Watchlist by copying `data/watchlist.json`.

## ⚙️ Configuration

The main server configuration includes:

- **Port:** `3000` by default
- **Players per room:** at least `2` to start, up to `8`
- **Room lifetime:** `2 hours` of inactivity for regular rooms, `30 days` for persistent rooms (expired rooms are cleaned up every 10 minutes; both are in-memory only and reset on server restart)
- **Reconnect grace period:** `30 seconds` — a disconnected player can rejoin their exact seat within this window before being removed
- **Vote timeout:** `45 seconds`
- **Auto-pick threshold:** after `3` batches in a row with no majority match, CineMatch picks the best-liked title found so far
- **Deck size:** `10 titles` per batch (Solo and Multiplayer automatically load another batch when needed)
- **Mock data:** enabled automatically when no TMDB API key is available
- **Default region:** `US` (changeable anytime in Settings or onboarding); supported regions are US, GB, CA, AU, IT, FR, DE, ES

## 🚦 API Usage Limits

CineMatch is a thin proxy over two third-party APIs, so its own limits are theirs:

- **TMDB** — free API keys are subject to TMDB's fair-use rate limiting. TMDB no longer publishes a hard cap, but excessive or abusive traffic from an IP can be throttled. Keep in mind that building **one** discovery deck (`deckSize`, `10` titles by default) costs roughly `1 + 10` TMDB requests (one `/discover` call plus one detail call per title to fetch providers, videos, and external IDs), and Suggestion mode costs `1 + up to 12` requests per search. Continuous swiping without liking anything triggers another full batch of requests automatically.
- **OMDB** — the free tier is capped at **1,000 requests/day**. CineMatch makes one OMDB request per enriched title (when it has a known IMDb ID), so a busy Solo/Multiplayer session or several people using the same key can exhaust the daily quota quickly; paid OMDB plans raise this limit. When the quota is hit (or no key is set), CineMatch degrades gracefully and just omits the IMDb/Rotten Tomatoes/Metacritic badges.
- **Mock data mode** makes zero external API calls, so it has no rate limits — useful for local development or demos without API keys.

## 🔌 HTTP API

### `GET /api/config`

Returns basic runtime configuration, including whether mock data is enabled and the server's LAN addresses.

### `GET /api/search?q=<query>&region=<US|GB|IT|...>`

Searches TMDB for movies and TV shows matching the query, localized to the given region (defaults to `US`).

### `GET /api/recommendations?id=<id>&mediaType=<movie|tv>&region=<US|GB|IT|...>`

Returns similar titles for a selected movie or TV show. This powers Suggestion mode while keeping the TMDB API key on the server.

### `POST /api/discover`

Builds a personalized discovery deck from the selected filters, including a `region` field. This powers Solo mode.

### `GET /api/title?id=<id>&mediaType=<movie|tv>&region=<US|GB|IT|...>`

Returns the full details of one title (same shape as a discovery deck item: poster, overview, genres, runtime, rating, cast, providers, trailer…). Powers **+ Add** in the Watchlist, which searches with `/api/search` and then fetches the chosen title here. `404 {"error":"not_found"}` if TMDB doesn't know the title.

### `GET /api/watchlist?limit=<n>`

Read-only, unauthenticated JSON view of the **synced** Watchlist (the one shared by devices with sync turned on — see [Syncing the Watchlist](#syncing-the-watchlist-with-the-server-opt-in)). Meant for server-side consumers such as a home dashboard, e.g. `http://<host>:8086/api/watchlist?limit=10`. It never includes API keys and sends `Cache-Control: no-store`.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `limit`   | no       | Positive integer: return at most this many titles (the most recent ones). Values above `500` are capped to `500`. Anything else → `400 {"error":"invalid_limit"}`. Default: all titles. |

Items are sorted by `addedAt`, **newest first**.

**Response contract (version 1).** The shape is stable: fields won't be renamed, removed or change type while `version` is `1`; new fields may be added, so ignore those you don't know. (The early `tags` field was dropped together with the tagging feature, before any consumer used it.)

| Field | Type | Description |
|-------|------|-------------|
| `version` | number | Contract version, currently `1`. |
| `updatedAt` | string \| null | ISO 8601 time of the last change to the synced list (`null` if never written). |
| `total` | number | Number of titles in the synced list. |
| `count` | number | Number of titles in `items` (≤ `total` when `limit` is used). |
| `items[].tmdbId` | number | TMDB id. Together with `type` it identifies the title. |
| `items[].type` | `"movie"` \| `"tv"` | Movie or TV show (anime and documentaries are one of the two). |
| `items[].title` | string | Title, in the language of the region it was saved from. |
| `items[].year` | number \| null | Release year (first air year for TV). |
| `items[].posterUrl` | string \| null | Full HTTPS poster URL, ready for an `<img src>` (a placeholder image URL if TMDB has no poster; `null` only if the client sent none). |
| `items[].addedAt` | string | ISO 8601 time the title was added to the list. For titles saved before sync was turned on, the time they were first synced. |
| `items[].releaseDate` | string \| null | `YYYY-MM-DD` release / first air date. |
| `items[].overview` | string \| null | Plot summary. |
| `items[].genres` | string[] | Genre names (may be empty). |
| `items[].runtime` | number \| null | Runtime in minutes (episode runtime for TV). |
| `items[].rating` | number \| null | TMDB average rating, 0–10. |
| `items[].director` | string \| null | Director (creator for TV). |
| `items[].backdropUrl` | string \| null | Full HTTPS backdrop image URL. |
| `items[].watched` | boolean | Marked as watched. |
| `items[].tmdbUrl` | string | Link to the title's TMDB page. |

Example — `curl -s 'http://192.168.1.177:8086/api/watchlist?limit=2'` (real output, captured from a server running in mock-data mode, so ids are the demo ones; with TMDB enabled `tmdbId`, titles, posters and genres are TMDB's, localized to the region the title was saved from):

```json
{
  "version": 1,
  "updatedAt": "2026-09-27T15:04:45.696Z",
  "total": 2,
  "count": 2,
  "items": [
    {
      "tmdbId": 9,
      "type": "movie",
      "title": "Pulp Fiction",
      "year": 1994,
      "posterUrl": "https://image.tmdb.org/t/p/w600_and_h900_bestv2/d5iIlFn5s0ImszYzBPb8SPCPb1s.jpg",
      "addedAt": "2026-09-27T15:04:45.693Z",
      "releaseDate": "1994-09-10",
      "overview": "Four intersecting tales of violence and redemption across Los Angeles.",
      "genres": ["Crime", "Drama"],
      "runtime": 154,
      "rating": 8.9,
      "director": "Quentin Tarantino",
      "backdropUrl": "https://image.tmdb.org/t/p/w780/d5iIlFn5s0ImszYzBPb8SPCPb1s.jpg",
      "watched": false,
      "tmdbUrl": "https://www.themoviedb.org/movie/9"
    },
    {
      "tmdbId": 1,
      "type": "movie",
      "title": "Inception",
      "year": 2010,
      "posterUrl": "https://image.tmdb.org/t/p/w600_and_h900_bestv2/edv5CZvWj09upOsy2Y6IwObsVNl.jpg",
      "addedAt": "2026-09-20T15:04:45.693Z",
      "releaseDate": "2010-07-15",
      "overview": "A skilled thief who steals secrets from people's minds while they dream takes on one impossible job.",
      "genres": ["Science Fiction", "Action", "Thriller"],
      "runtime": 148,
      "rating": 8.8,
      "director": "Christopher Nolan",
      "backdropUrl": "https://image.tmdb.org/t/p/w780/edv5CZvWj09upOsy2Y6IwObsVNl.jpg",
      "watched": true,
      "tmdbUrl": "https://www.themoviedb.org/movie/1"
    }
  ]
}
```

### `POST /api/watchlist/sync`

Internal endpoint used by devices with sync turned on: the body `{ "ops": [...] }` carries up to 200 queued changes (`add`, `remove`, `update`), the response is the full synced list. Not part of the public contract.

## 🎮 Multiplayer Events

Multiplayer communication is handled through Socket.IO.

| Event | Description |
| --- | --- |
| `room:create` | Create a new room |
| `room:join` | Join an existing room |
| `room:leave` | Leave the current room |
| `room:set-filters` | Update the room filters |
| `room:start` | Start the voting session |
| `vote:cast` | Cast a like/nope vote |
| `room:restart` | Return the room to the lobby |
| `room:state` | Synchronize room state with clients |
| `room:error` | Report a room/session error |

## 🗺️ Roadmap

Some ideas for future iterations:

- [ ] Persistent user profiles and preferences
- [ ] Shareable result pages
- [ ] More sophisticated recommendation algorithms
- [x] Regional support *(8 regions for content language & streaming availability; still flatrate-only, no rental/purchase providers)*
- [x] Improved mobile UX / PWA support
- [x] Persistent multiplayer rooms *(in-memory; doesn't yet survive a server restart)*
- [ ] Cross-device Watchlist sync
- [ ] Session history

## 🤝 Contributing

Contributions, ideas, and bug reports are welcome.

1. Fork the repository.
2. Create a feature branch:

```bash
git checkout -b feature/my-feature
```

3. Commit your changes:

```bash
git commit -m "Add my feature"
```

4. Push the branch:

```bash
git push origin feature/my-feature
```

5. Open a Pull Request.

## 📚 Credits

Movie and TV metadata is provided by **TMDB** (The Movie Database). Streaming availability and trailer data are retrieved through TMDB's available API data. IMDb, Rotten Tomatoes, and Metacritic ratings, when shown, are retrieved through the **OMDB API**.

This project is not affiliated with or endorsed by TMDB or OMDB.

## 📄 License

Released under the [MIT License](LICENSE).

---

Made with 🍿 for people who spend way too long deciding what to watch.
