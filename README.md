# 🎬 CineMatch

> **Stop arguing about what to watch. Swipe, save, and find something you'll actually want to watch. 🍿**

CineMatch is a Tinder-style web app for discovering **movies, TV shows, and anime**. It combines personalized discovery, title-based recommendations, a personal watchlist, and real-time multiplayer matching.

It is designed for one simple problem: *"What should we watch tonight?"*

## ✨ Features

- 🎞️ **Solo discovery** — configure your tastes and swipe through a personalized deck.
- 💚 **Like = Watchlist** — every title you like in Solo is automatically saved.
- ✨ **Suggestion mode** — search for a movie or TV show you love and get a list of similar titles, without entering swipe mode.
- 🔖 **Watchlist** — keep, inspect, and remove titles you've saved across sessions.
- 👥 **Multiplayer mode** — create a room and invite friends with a room code.
- 🎯 **Group matching** — when everyone votes, CineMatch finds the titles that everyone liked.
- 🧩 **Filters** — narrow discovery by content type, genre, language, era, runtime, and streaming platform.
- 🔎 **TMDB search** — search for movies and TV shows as the starting point for recommendations.
- 📺 **Streaming information** — when available, titles include Italian streaming providers.
- ▶️ **Trailers** — available trailers can be opened from title details.
- ⏱️ **Vote timeout** — inactive multiplayer players are automatically treated as skipping a title.
- 📱 **LAN support** — play together from phones connected to the same Wi-Fi network.
- 🧪 **Mock data mode** — run the app without a TMDB API key using local demo data.

## 🖥️ How It Works

### Solo

1. Choose **Solo** from the bottom navigation.
2. Configure your filters.
3. Swipe through the generated deck.
4. Swipe right or press **Mi piace** to save a title automatically to your Watchlist.
5. Open the Watchlist whenever you want to review your saved titles.

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
3. Friends join using the room code.
4. The host chooses the filters and starts the session.
5. Everyone votes independently on the same titles.
6. When all players have voted, CineMatch moves to the next title.
7. At the end, the group gets the titles that received a **like from everyone**.

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
- **TMDB service** builds discovery decks, searches titles, fetches recommendations, and enriches titles with providers and trailers.
- **Watchlist module** stores saved titles locally in the browser.
- **Mock data** provides a local fallback when TMDB is not configured.

## 🛠️ Tech Stack

| Technology | Purpose |
| --- | --- |
| **Node.js** | Runtime |
| **Express** | HTTP server and static file serving |
| **Socket.IO** | Real-time multiplayer communication |
| **TMDB API** | Movie/TV data, search, recommendations, providers and trailers |
| **JavaScript (ES Modules)** | Application logic |
| **HTML / CSS / JavaScript** | Frontend |
| **localStorage** | Local Watchlist persistence |
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

Create a `.env` file in the project root:

```env
PORT=3000
TMDB_API_KEY=your_tmdb_api_key
USE_MOCK_DATA=false
```

If `TMDB_API_KEY` is missing, CineMatch automatically falls back to mock data.

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
- **Room lifetime:** `2 hours`
- **Vote timeout:** `45 seconds`
- **Deck size:** `20 titles`
- **Mock data:** enabled automatically when no TMDB API key is available

## 🔐 Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | Port used by the server. Defaults to `3000`. |
| `TMDB_API_KEY` | No* | API key used to fetch live movie and TV data. |
| `USE_MOCK_DATA` | No | Set to `true` to explicitly use local mock data. |

\* If no TMDB API key is provided, CineMatch automatically uses mock data.

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

Movie and TV metadata is provided by **TMDB** (The Movie Database). Streaming availability and trailer data are retrieved through TMDB's available API data.

This project is not affiliated with or endorsed by TMDB.

## 📄 License

No license has been specified for this repository yet.

---

Made with 🍿 for people who spend way too long deciding what to watch.
