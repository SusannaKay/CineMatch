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
app.use(express.json());
app.use(express.static(publicDir));

function getLanAddresses() {
  const nets = networkInterfaces();
  const addrs = [];
  for (const iface of Object.values(nets)) for (const net of iface ?? []) {
    if (net.family === 'IPv4' && !net.internal) addrs.push(net.address);
  }
  return addrs;
}

app.get('/api/config', (_req, res) => res.json({ useMockData: tmdbConfig.useMockData, port: config.port, lanAddresses: getLanAddresses() }));

app.get('/api/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json([]);
  try { res.json(await searchMulti(q)); } catch { res.status(500).json({ error: 'search_failed' }); }
});

app.get('/api/recommendations', async (req, res) => {
  const id = Number(req.query.id);
  const mediaType = String(req.query.mediaType || 'movie');
  if (!Number.isInteger(id) || id <= 0 || !['movie', 'tv'].includes(mediaType)) return res.status(400).json({ error: 'invalid_title' });
  try { res.json(await getRecommendations(id, mediaType)); } catch (err) { console.error(err); res.status(500).json({ error: 'recommendations_failed' }); }
});

app.post('/api/discover', async (req, res) => {
  try {
    const { page, ...filters } = req.body || {};
    if (!filters.type) return res.status(400).json({ error: 'missing_type' });
    res.json(await buildDeck(filters, config.deckSize, page));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'discover_failed' });
  }
});

function emitRoom(room) { for (const player of room.players.values()) { const sock = io.sockets.sockets.get(player.socketId); if (sock) sock.emit('room:state', room.toClient(player.id)); } }
function clearVoteTimer(room) { if (room.voteTimer) { clearTimeout(room.voteTimer); room.voteTimer = null; } room.voteDeadline = null; }
function startVoteTimer(room) { clearVoteTimer(room); room.voteDeadline = Date.now() + config.voteTimeoutSec * 1000; room.voteTimer = setTimeout(() => autoAdvance(room), config.voteTimeoutSec * 1000); }
function autoAdvance(room) {
  const movie = room.currentMovie(); if (!movie || room.status !== 'swiping') return;
  for (const player of room.connectedPlayers()) { if (!room.votes.get(movie.id)?.has(player.id)) { if (!room.votes.has(movie.id)) room.votes.set(movie.id, new Map()); room.votes.get(movie.id).set(player.id, 'nope'); } }
  advanceOrFinish(room);
}
function removePlayerFully(room, clientId) {
  const player = room.players.get(clientId);
  if (player?.disconnectTimer) clearTimeout(player.disconnectTimer);
  room.removePlayer(clientId);
  if (room.players.size === 0) {
    clearVoteTimer(room);
    if (room.persistent) room.resetToDormantLobby();
    else rooms.deleteRoom(room.id);
  }
}
async function loadNextBatch(room) {
  room.status = 'loading';
  emitRoom(room);
  try {
    const deck = await buildDeck(room.filters, config.deckSize, room.nextPage);
    if (!deck.length) {
      if (room.bestCandidate && room.bestCandidate.likes > 0) room.decidedForYou = true;
      room.status = 'results';
      emitRoom(room);
      return;
    }
    room.nextPage += 1;
    room.deck = deck;
    room.currentIndex = 0;
    room.votes.clear();
    room.status = 'swiping';
    startVoteTimer(room);
    emitRoom(room);
  } catch (err) {
    console.error(err);
    room.status = 'results';
    emitRoom(room);
  }
}
function advanceOrFinish(room) {
  room.finalizeCard(room.currentMovie());
  clearVoteTimer(room);
  const hasMore = room.advanceCard();
  if (hasMore) {
    room.status = 'swiping';
    startVoteTimer(room);
    emitRoom(room);
    return;
  }
  const results = room.computeResults();
  if (results.length === 0) {
    room.noMatchBatches += 1;
    const canDecideForYou = room.bestCandidate && room.bestCandidate.likes > 0 && room.noMatchBatches >= config.maxNoMatchBatches;
    if (canDecideForYou) {
      room.decidedForYou = true;
      room.status = 'results';
      emitRoom(room);
      return;
    }
    loadNextBatch(room);
    return;
  }
  room.stats.matches += results.length;
  room.status = 'results';
  emitRoom(room);
}

io.on('connection', (socket) => {
  function currentRoomAndClient() {
    const clientId = rooms.getClientBySocket(socket.id);
    const room = rooms.getRoomBySocket(socket.id);
    return { room, clientId };
  }

  socket.on('room:create', ({ name, clientId, persistent }) => {
    if (!clientId) return socket.emit('room:error', { message: 'Sessione non valida, ricarica la pagina.' });
    const displayName = String(name || 'Host').trim().slice(0, 20) || 'Host';
    const room = rooms.createRoom(!!persistent);
    room.addPlayer(clientId, socket.id, displayName);
    rooms.bindSocket(socket.id, room.id, clientId);
    socket.join(room.id);
    socket.emit('room:state', room.toClient(clientId));
  });

  socket.on('room:join', ({ code, name, clientId }) => {
    if (!clientId) return socket.emit('room:error', { message: 'Sessione non valida, ricarica la pagina.' });
    const room = rooms.getRoom(code);
    const displayName = String(name || 'Ospite').trim().slice(0, 20) || 'Ospite';
    if (!room) return socket.emit('room:error', { message: 'Stanza non trovata. Controlla il codice.' });

    const existing = room.players.get(clientId);
    if (existing) {
      // Reconnection: welcome back regardless of room status (mid-game included).
      if (existing.disconnectTimer) { clearTimeout(existing.disconnectTimer); existing.disconnectTimer = null; }
      room.addPlayer(clientId, socket.id, displayName);
      rooms.bindSocket(socket.id, room.id, clientId);
      socket.join(room.id);
      emitRoom(room);
      return;
    }

    if (room.status !== 'lobby') return socket.emit('room:error', { message: 'La sessione è già iniziata.' });
    if (room.playerCount() >= 8) return socket.emit('room:error', { message: 'Stanza piena (max 8 giocatori).' });
    room.addPlayer(clientId, socket.id, displayName);
    rooms.bindSocket(socket.id, room.id, clientId);
    socket.join(room.id);
    emitRoom(room);
  });

  socket.on('room:leave', () => {
    const { room, clientId } = currentRoomAndClient();
    if (!room || !clientId) return;
    socket.leave(room.id);
    rooms.unbindSocket(socket.id);
    removePlayerFully(room, clientId);
    if (rooms.rooms.has(room.id)) emitRoom(room);
  });

  socket.on('room:set-filters', ({ filters }) => {
    const { room, clientId } = currentRoomAndClient();
    if (!room || !clientId || !room.isHost(clientId) || room.status !== 'lobby') return;
    room.filters = filters;
    room.touch();
    emitRoom(room);
  });

  socket.on('room:start', async () => {
    const { room, clientId } = currentRoomAndClient();
    if (!room || !clientId || !room.isHost(clientId)) return;
    if (room.playerCount() < 2) return socket.emit('room:error', { message: 'Servono almeno 2 giocatori per iniziare.' });
    if (!room.filters?.type) return socket.emit('room:error', { message: 'Configura prima i filtri di ricerca.' });
    room.resetSession();
    room.status = 'loading'; emitRoom(room);
    try {
      room.nextPage = 1;
      room.deck = await buildDeck(room.filters, config.deckSize, room.nextPage);
      room.nextPage += 1;
      room.currentIndex = 0;
      room.votes.clear();
      if (!room.deck.length) { room.status = 'lobby'; socket.emit('room:error', { message: 'Nessun titolo trovato. Prova filtri diversi.' }); emitRoom(room); return; }
      room.status = 'swiping'; startVoteTimer(room); emitRoom(room);
    } catch (err) { console.error(err); room.status = 'lobby'; socket.emit('room:error', { message: 'Errore nel caricamento dei titoli.' }); emitRoom(room); }
  });

  socket.on('vote:cast', ({ vote }) => {
    const { room, clientId } = currentRoomAndClient();
    if (!room || !clientId) return;
    const result = room.castVote(clientId, vote === 'like' ? 'like' : 'nope');
    if (!result.ok) return;
    emitRoom(room);
    if (result.allVoted) advanceOrFinish(room);
  });

  socket.on('room:restart', () => {
    const { room, clientId } = currentRoomAndClient();
    if (!room || !clientId || !room.isHost(clientId)) return;
    clearVoteTimer(room);
    room.status = 'lobby'; room.deck = []; room.currentIndex = 0; room.nextPage = 1; room.votes.clear(); room.filters = null;
    room.decidedForYou = false; room.bestCandidate = null;
    emitRoom(room);
  });

  socket.on('disconnect', () => {
    const { room, clientId } = currentRoomAndClient();
    if (!room || !clientId) return;
    rooms.unbindSocket(socket.id);
    room.markDisconnected(clientId);
    const player = room.players.get(clientId);
    if (player) player.disconnectTimer = setTimeout(() => { removePlayerFully(room, clientId); if (rooms.rooms.has(room.id)) emitRoom(room); }, config.reconnectGraceMs);
    if (room.status === 'swiping' && room.currentMovie() && room.activePlayerCount() > 0) {
      const status = room.votesForCurrent();
      if (status.voted >= status.total) advanceOrFinish(room);
      else emitRoom(room);
    } else emitRoom(room);
  });
});

setInterval(() => rooms.cleanupExpired(), 10 * 60 * 1000);
httpServer.listen(config.port, '0.0.0.0', () => { console.log(`\nCineMatch avviato`); console.log(`  Locale:  http://localhost:${config.port}`); for (const ip of getLanAddresses()) console.log(`  Rete:    http://${ip}:${config.port}  ← usa questo dal telefono`); console.log(`  Dati:    ${config.useMockData ? 'DEMO (mock)' : 'TMDB live'}\n`); });
