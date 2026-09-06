import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import path from 'path';
import { networkInterfaces } from 'os';
import { Server } from 'socket.io';
import { config } from './config.js';
import { RoomManager } from './rooms/RoomManager.js';
import { buildDeck, searchMulti, getRecommendations, tmdbConfig } from './services/tmdb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
const rooms = new RoomManager();

app.use(express.static(publicDir));

function getLanAddresses() {
  const nets = networkInterfaces();
  const addrs = [];
  for (const iface of Object.values(nets)) {
    for (const net of iface ?? []) {
      if (net.family === 'IPv4' && !net.internal) addrs.push(net.address);
    }
  }
  return addrs;
}

app.get('/api/config', (_req, res) => {
  res.json({
    useMockData: tmdbConfig.useMockData,
    port: config.port,
    lanAddresses: getLanAddresses(),
  });
});

app.get('/api/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json([]);
  try {
    const results = await searchMulti(q);
    res.json(results);
  } catch {
    res.status(500).json({ error: 'search_failed' });
  }
});

app.get('/api/recommendations', async (req, res) => {
  const id = Number(req.query.id);
  const mediaType = String(req.query.mediaType || 'movie');
  if (!Number.isInteger(id) || id <= 0 || !['movie', 'tv'].includes(mediaType)) {
    return res.status(400).json({ error: 'invalid_title' });
  }
  try {
    const results = await getRecommendations(id, mediaType);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'recommendations_failed' });
  }
});

function emitRoom(room) {
  for (const [socketId] of room.players) {
    const sock = io.sockets.sockets.get(socketId);
    if (sock) sock.emit('room:state', room.toClient(socketId));
  }
}

function clearVoteTimer(room) {
  if (room.voteTimer) {
    clearTimeout(room.voteTimer);
    room.voteTimer = null;
  }
  room.voteDeadline = null;
}

function startVoteTimer(room) {
  clearVoteTimer(room);
  room.voteDeadline = Date.now() + config.voteTimeoutSec * 1000;
  room.voteTimer = setTimeout(() => {
    autoAdvance(room);
  }, config.voteTimeoutSec * 1000);
}

function autoAdvance(room) {
  const movie = room.currentMovie();
  if (!movie || room.status !== 'swiping') return;

  for (const [pid] of room.players) {
    if (!room.votes.get(movie.id)?.has(pid)) {
      if (!room.votes.has(movie.id)) room.votes.set(movie.id, new Map());
      room.votes.get(movie.id).set(pid, 'nope');
    }
  }
  advanceOrFinish(room);
}

function advanceOrFinish(room) {
  clearVoteTimer(room);
  const hasMore = room.advanceCard();

  if (hasMore) {
    room.status = 'swiping';
    startVoteTimer(room);
    emitRoom(room);
    return;
  }

  room.status = 'results';
  emitRoom(room);
}

io.on('connection', (socket) => {
  socket.on('room:create', ({ name }) => {
    const displayName = String(name || 'Host').trim().slice(0, 20) || 'Host';
    const room = rooms.createRoom(socket.id);
    room.addPlayer(socket.id, displayName);
    rooms.bindSocket(socket.id, room.id);
    socket.join(room.id);
    socket.emit('room:state', room.toClient(socket.id));
  });

  socket.on('room:join', ({ code, name }) => {
    const room = rooms.getRoom(code);
    const displayName = String(name || 'Ospite').trim().slice(0, 20) || 'Ospite';

    if (!room) {
      socket.emit('room:error', { message: 'Stanza non trovata. Controlla il codice.' });
      return;
    }
    if (room.status !== 'lobby') {
      socket.emit('room:error', { message: 'La sessione è già iniziata.' });
      return;
    }
    if (room.playerCount() >= 8) {
      socket.emit('room:error', { message: 'Stanza piena (max 8 giocatori).' });
      return;
    }

    room.addPlayer(socket.id, displayName);
    rooms.bindSocket(socket.id, room.id);
    socket.join(room.id);
    emitRoom(room);
  });

  socket.on('room:leave', () => {
    handleDisconnect(socket);
  });

  socket.on('room:set-filters', ({ filters }) => {
    const room = rooms.getRoomBySocket(socket.id);
    if (!room || !room.isHost(socket.id) || room.status !== 'lobby') return;
    room.filters = filters;
    emitRoom(room);
  });

  socket.on('room:start', async () => {
    const room = rooms.getRoomBySocket(socket.id);
    if (!room || !room.isHost(socket.id)) return;
    if (room.playerCount() < 2) {
      socket.emit('room:error', { message: 'Servono almeno 2 giocatori per iniziare.' });
      return;
    }
    if (!room.filters?.type) {
      socket.emit('room:error', { message: 'Configura prima i filtri di ricerca.' });
      return;
    }

    room.status = 'loading';
    emitRoom(room);

    try {
      room.deck = await buildDeck(room.filters);
      room.currentIndex = 0;
      room.votes.clear();

      if (room.deck.length === 0) {
        room.status = 'lobby';
        socket.emit('room:error', { message: 'Nessun titolo trovato. Prova filtri diversi.' });
        emitRoom(room);
        return;
      }

      room.status = 'swiping';
      startVoteTimer(room);
      emitRoom(room);
    } catch (err) {
      console.error(err);
      room.status = 'lobby';
      socket.emit('room:error', { message: 'Errore nel caricamento dei titoli.' });
      emitRoom(room);
    }
  });

  socket.on('vote:cast', ({ vote }) => {
    const room = rooms.getRoomBySocket(socket.id);
    if (!room) return;

    const result = room.castVote(socket.id, vote === 'like' ? 'like' : 'nope');
    if (!result.ok) return;

    emitRoom(room);

    if (result.allVoted) {
      advanceOrFinish(room);
    }
  });

  socket.on('room:restart', () => {
    const room = rooms.getRoomBySocket(socket.id);
    if (!room || !room.isHost(socket.id)) return;

    clearVoteTimer(room);
    room.status = 'lobby';
    room.deck = [];
    room.currentIndex = 0;
    room.votes.clear();
    room.filters = null;
    emitRoom(room);
  });

  socket.on('disconnect', () => {
    handleDisconnect(socket);
  });

  function handleDisconnect(sock) {
    const room = rooms.getRoomBySocket(sock.id);
    if (!room) return;

    sock.leave(room.id);
    room.removePlayer(sock.id);
    rooms.unbindSocket(sock.id);

    if (room.playerCount() === 0) {
      clearVoteTimer(room);
      rooms.deleteRoom(room.id);
      return;
    }

    if (room.status === 'swiping' && room.currentMovie()) {
      const status = room.votesForCurrent();
      if (status.voted >= room.playerCount()) {
        advanceOrFinish(room);
      } else {
        emitRoom(room);
      }
    } else {
      emitRoom(room);
    }
  }
});

setInterval(() => rooms.cleanupExpired(), 10 * 60 * 1000);

httpServer.listen(config.port, '0.0.0.0', () => {
  console.log(`\nCineMatch avviato`);
  console.log(`  Locale:  http://localhost:${config.port}`);
  for (const ip of getLanAddresses()) {
    console.log(`  Rete:    http://${ip}:${config.port}  ← usa questo dal telefono`);
  }
  console.log(`  Dati:    ${config.useMockData ? 'DEMO (mock)' : 'TMDB live'}\n`);
});
