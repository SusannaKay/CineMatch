# 🎬 CineMatch

> **Stop arguing about what to watch. Swipe, match, and start the movie night. 🍿**

CineMatch is a Tinder-style web app for discovering **movies, TV shows, and anime**. Swipe through a curated deck of titles and, in multiplayer mode, find the titles that **everyone in the group likes**.

It is designed for one simple problem: *"What should we watch tonight?"*

## ✨ Features

- 🎞️ **Swipe-based discovery** — like or skip titles with a simple Tinder-style interface.
- 👤 **Solo mode** — browse a personalized deck on your own.
- 👥 **Multiplayer mode** — create a room and invite friends with a room code.
- 💚 **Group matching** — when everyone votes, CineMatch finds the titles everyone liked.
- 🎯 **Filters** — narrow the deck by content type, genre, language, era, runtime, and streaming platform.
- 🔎 **Search** — search for movies and TV shows directly through TMDB.
- 📺 **Streaming information** — when available, titles include Italian streaming providers.
- ▶️ **Trailers** — available trailers can be opened directly from title details.
- ⏱️ **Vote timeout** — inactive players are automatically treated as skipping a title after the configured timeout.
- 📱 **LAN support** — the app exposes its local network address, making it easy to play together from phones on the same Wi-Fi network.
- 🧪 **Mock data mode** — the app can run without a TMDB API key using local demo data.

## 🖥️ How It Works

### Solo

1. Choose what you want to watch.
2. Configure your filters.
3. Swipe through the generated deck.
4. Discover your matches.

### Multiplayer

1. One player creates a room.
2. Friends join using the room code.
3. The host chooses the filters and starts the session.
4. Everyone votes independently on the same titles.
5. When all players have voted, CineMatch moves to the next title.
6. At the end, the group gets the titles that received a **like from everyone**.

Rooms support up to **8 players** and automatically expire after a period of inactivity.

## 🏗️ Architecture

CineMatch uses a lightweight Node.js backend that serves the frontend and manages real-time multiplayer sessions.

```text
                         ┌──────────────────┐
                         │     Browser      │
                         │  HTML / CSS / JS │
                         └────────┬─────────┘
                                  │
                         HTTP + Socket.IO
                                  │
                         ┌────────▼─────────┐
                         │   Express /      │
                         │   Node.js Server │
                         └──────┬─────┬──────┘
                                │     │
                    ┌───────────┘     └────────────┐
                    │                              │
             ┌──────▼──────┐                ┌──────▼──────┐
             │ RoomManager │                │ TMDB Service│
             │   + Rooms   │                │             │
             └─────────────┘                └──────┬──────┘
                                                    │
                                             ┌──────▼──────┐
                                             │  TMDB API   │
                                             └─────────────┘
```

### Main components

- **Express** serves the static frontend and exposes HTTP endpoints.
- **Socket.IO** handles room state, player connections, voting, and real-time synchronization.
- **RoomManager** manages multiplayer rooms and their lifecycle.
- **TMDB service** builds the movie/TV deck and enriches titles with providers and trailers.
- **Mock data** provides a local fallback when TMDB is not configured.

## 🛠️ Tech Stack

| Technology | Purpose |
| --- | --- |
| **Node.js** | Runtime |
| **Express** | HTTP server and static file serving |
| **Socket.IO** | Real-time multiplayer communication |
| **TMDB API** | Movie and TV data, search, providers and trailers |
| **JavaScript (ES Modules)** | Application logic |
| **HTML / CSS / JavaScript** | Frontend |
| **dotenv** | Environment variable management |

The server currently requires **Node.js 18+**. fileciteturn0file0

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

If `TMDB_API_KEY` is missing, CineMatch automatically falls back to mock data. fileciteturn2file0

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

## 🔌 API

### `GET /api/config`

Returns basic runtime configuration, including whether mock data is enabled and the server's LAN addresses.

### `GET /api/search?q=<query>`

Searches TMDB for movies and TV shows matching the query.

Example:

```text
GET /api/search?q=interstellar
```

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

The current server configuration includes:

- **Port:** `3000` by default
- **Maximum players:** `8`
- **Room lifetime:** `2 hours`
- **Vote timeout:** `45 seconds`
- **Deck size:** `20 titles`
- **Mock data:** enabled automatically when no TMDB API key is available

These values are defined in the server configuration. fileciteturn2file0

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
- [ ] Watchlist and saved matches
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
