# 🎬 CineMatch

> **Stop arguing about what to watch. Swipe, save, and find something you'll actually want to watch. 🍿**

CineMatch is a Tinder-style web app for discovering **movies, TV shows, and anime**. It combines personalized discovery, title-based recommendations, a personal watchlist, and real-time multiplayer matching.

It is designed for one simple problem: *"What should we watch tonight?"*

## ✨ Features

- 🎞️ **Solo discovery** — configure your tastes and swipe through a personalized deck.
- 💚 **Like = Watchlist** — every title you like in Solo is automatically saved.
- 🔁 **Endless discovery** — if you swipe through a whole batch without liking anything (Solo) or without the group reaching a match (Multiplayer), CineMatch automatically fetches the next page of results from TMDB instead of stopping.
- 🙈 **Hide a title** — permanently ignore a title from a swipe card so it never appears again on that device (stored locally, independent of the Watchlist).
- ✨ **Suggestion mode** — search for a movie or TV show you love and get a list of similar titles, without entering swipe mode.
- 🔖 **Watchlist** — keep, inspect, sort, and remove titles you've saved across sessions.
- 🔀 **Watchlist sorting** — order saved titles by the order you added them or by rating (ascending/descending).
- 👥 **Multiplayer mode** — create a room and invite friends with a room code, a shareable link, or a QR code.
- 🎯 **Group matching** — once everyone has voted on a title, CineMatch keeps the ones that reached a **majority** of likes (strictly more than half of the players), ranked by number of likes and consensus %.
- 🧩 **Filters** — narrow discovery by content type, genre (include or exclude), language, era, runtime, and streaming platform.
- 🔎 **TMDB search** — search for movies and TV shows as the starting point for recommendations.
- ⭐ **Aggregated ratings** — TMDB rating always shown; IMDb, Rotten Tomatoes, and Metacritic scores are added automatically when an `OMDB_API_KEY` is configured.
- 📺 **Streaming information** — when available, titles include Italian streaming providers.
- ▶️ **Trailers** — available trailers can be opened from title details.
- 👆 **Swipe gestures** — swipe right/left to like/skip, swipe up (or tap "Dettagli") to open a title's details, swipe down to close the details sheet.
- ⏱️ **Vote timeout** — inactive multiplayer players are automatically treated as skipping a title.
- 📱 **LAN support** — play together from phones connected to the same Wi-Fi network.
- 🙋 **Remembered nickname** — your multiplayer nickname is saved locally and pre-filled next time.
- 🧪 **Mock data mode** — run the app without a TMDB API key using local demo data (no external API calls at all).

## 🖥️ How It Works

### Solo

1. Choose **Solo** from the bottom navigation.
2. Configure your filters.
3. Swipe through the generated deck.
4. Swipe right or press **Mi piace** to save a title automatically to your Watchlist.
5. Swipe up, or press **Dettagli**, to see the overview, ratings, streaming providers, and trailer for a title.
6. Tap the eye-slash icon on a card to permanently hide that title from future decks.
7. If you reach the end of a batch without liking anything, CineMatch automatically loads the next batch of titles with the same filters.
8. Open the Watchlist whenever you want to review, sort, or remove your saved titles.

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

Rooms support up to **8 players** and automatically expire after a period of inactivity.

### Watchlist

The Watchlist is local to the browser and persists between sessions using `localStorage`. Titles can be saved from Solo or Suggestion mode and removed at any time.

## 🏗️ Architecture

CineMatch uses a lightweight Node.js backend that serves the frontend, proxies TMDB requests, and manages real-time multiplayer sessions.

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
                                                 ┌──────▼──────┐
                                                 │   TMDB API  │
                                                 └─────────────┘

        Browser-only persistence
                 │
          ┌──────▼──────┐
          │  Watchlist  │
          │ localStorage│
          └─────────────┘
```

### Main components

- **Express** serves the static frontend and exposes HTTP endpoints.
- **Socket.IO** handles room state, player connections, voting, and real-time synchronization.
- **RoomManager** manages multiplayer rooms and their lifecycle.
- **TMDB service** builds discovery decks, searches titles, fetches recommendations, and enriches titles with providers, trailers, and (via OMDB, when configured) IMDb/Rotten Tomatoes/Metacritic ratings.
- **Watchlist module** stores saved titles locally in the browser.
- **Ignored-titles module** stores permanently hidden title IDs locally in the browser.
- **Mock data** provides a local fallback when TMDB is not configured.

## 🛠️ Tech Stack

| Technology | Purpose |
| --- | --- |
| **Node.js** | Runtime |
| **Express** | HTTP server and static file serving |
| **Socket.IO** | Real-time multiplayer communication |
| **TMDB API** | Movie/TV data, search, recommendations, providers and trailers |
| **OMDB API** *(optional)* | IMDb, Rotten Tomatoes, and Metacritic ratings |
| **JavaScript (ES Modules)** | Application logic |
| **HTML / CSS / JavaScript** | Frontend |
| **Tailwind CSS** *(CDN)* | Styling |
| **Font Awesome** *(CDN)* | Icons |
| **qrcodejs** *(CDN)* | QR code generation for multiplayer room invites |
| **localStorage** | Local Watchlist, ignored-titles list, and nickname persistence |
| **dotenv** | Environment variable management |

## 🚀 Getting Started

### Prerequisites

- Node.js **18 or newer**
- npm
- A TMDB API key *(optional — mock data is used when no key is configured)*

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

Create a `.env` file in the project root (see [`.env.example`](.env.example)):

```env
PORT=3000
TMDB_API_KEY=your_tmdb_api_key
OMDB_API_KEY=your_omdb_api_key
USE_MOCK_DATA=false
```

If `TMDB_API_KEY` is missing, CineMatch automatically falls back to mock data — remember to also set `USE_MOCK_DATA=false` once you add a real key, otherwise mock data stays on. `OMDB_API_KEY` is optional: without it, titles simply show the TMDB rating without IMDb/Rotten Tomatoes/Metacritic badges.

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

## 📱 Play From Your Phone

CineMatch can be played from other devices connected to the same local network.

Start the server and look at the terminal output. CineMatch detects the machine's local IPv4 addresses and prints a URL such as:

```text
Rete: http://192.168.1.42:3000
```

Open that address from your phone or another device connected to the same Wi-Fi network.

## 🔌 HTTP API

### `GET /api/config`

Returns basic runtime configuration, including whether mock data is enabled and the server's LAN addresses.

### `GET /api/search?q=<query>`

Searches TMDB for movies and TV shows matching the query.

### `GET /api/recommendations?id=<id>&mediaType=<movie|tv>`

Returns similar titles for a selected movie or TV show. This powers Suggestion mode while keeping the TMDB API key on the server.

### `POST /api/discover`

Builds a personalized discovery deck from the selected filters. This powers Solo mode.

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

## ⚙️ Configuration

The main server configuration includes:

- **Port:** `3000` by default
- **Maximum players:** `8`
- **Room lifetime:** `2 hours` (expired rooms are cleaned up every 10 minutes)
- **Vote timeout:** `45 seconds`
- **Deck size:** `10 titles` per batch (Solo and Multiplayer automatically load another batch when needed)
- **Mock data:** enabled automatically when no TMDB API key is available

## 🔐 Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | Port used by the server. Defaults to `3000`. |
| `TMDB_API_KEY` | No* | API key used to fetch live movie and TV data. |
| `OMDB_API_KEY` | No | API key used to add IMDb, Rotten Tomatoes, and Metacritic ratings. Ratings are silently skipped if omitted. |
| `USE_MOCK_DATA` | No | Set to `true` to explicitly use local mock data. |

\* If no TMDB API key is provided, CineMatch automatically uses mock data.

## 🚦 API Usage Limits

CineMatch is a thin proxy over two third-party APIs, so its own limits are theirs:

- **TMDB** — free API keys are subject to TMDB's fair-use rate limiting. TMDB no longer publishes a hard cap, but excessive or abusive traffic from an IP can be throttled. Keep in mind that building **one** discovery deck (`deckSize`, `10` titles by default) costs roughly `1 + 10` TMDB requests (one `/discover` call plus one detail call per title to fetch providers, videos, and external IDs), and Suggestion mode costs `1 + up to 12` requests per search. Continuous swiping without liking anything triggers another full batch of requests automatically.
- **OMDB** — the free tier is capped at **1,000 requests/day**. CineMatch makes one OMDB request per enriched title (when it has a known IMDb ID), so a busy Solo/Multiplayer session or several people using the same key can exhaust the daily quota quickly; paid OMDB plans raise this limit. When the quota is hit (or no key is set), CineMatch degrades gracefully and just omits the IMDb/Rotten Tomatoes/Metacritic badges.
- **Mock data mode** makes zero external API calls, so it has no rate limits — useful for local development or demos without API keys.

## 🗺️ Roadmap

Some ideas for future iterations:

- [ ] Persistent user profiles and preferences
- [ ] Shareable result pages
- [ ] More sophisticated recommendation algorithms
- [ ] Additional streaming providers and regions
- [ ] Improved mobile UX / PWA support
- [ ] Persistent multiplayer rooms
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

No license has been specified for this repository yet.

---

Made with 🍿 for people who spend way too long deciding what to watch.
