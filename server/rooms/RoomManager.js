import { config } from '../config.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode() {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export class Room {
  constructor(id, persistent = false) {
    this.id = id;
    this.persistent = persistent;
    this.hostClientId = null;
    this.status = 'lobby';
    /** @type {Map<string, {id:string, socketId:string, name:string, color:string, connected:boolean, disconnectTimer:any}>} */
    this.players = new Map();
    this.filters = null;
    this.deck = [];
    this.currentIndex = 0;
    this.nextPage = 1;
    /** @type {Map<number, Map<string, 'like'|'nope'>>} */
    this.votes = new Map();
    this.createdAt = Date.now();
    this.lastActivityAt = Date.now();
    this.voteTimer = null;
    this.voteDeadline = null;
    this.colorIndex = 0;
    this.noMatchBatches = 0;
    this.bestCandidate = null;
    this.decidedForYou = false;
    this.stats = { sessions: 0, titlesSeen: 0, matches: 0, genreCounts: {}, likesByPlayer: {} };
  }

  touch() {
    this.lastActivityAt = Date.now();
  }

  /** Adds a brand-new player, or reconnects one already known to this room (same clientId). */
  addPlayer(clientId, socketId, name) {
    this.touch();
    const existing = this.players.get(clientId);
    if (existing) {
      existing.socketId = socketId;
      existing.connected = true;
      if (name) existing.name = name;
      return existing;
    }
    const color = config.playerColors[this.colorIndex % config.playerColors.length];
    this.colorIndex++;
    const player = { id: clientId, socketId, name, color, connected: true, disconnectTimer: null };
    this.players.set(clientId, player);
    if (this.players.size === 1 || !this.hostClientId) this.hostClientId = clientId;
    return player;
  }

  markDisconnected(clientId) {
    const player = this.players.get(clientId);
    if (!player) return { hostChanged: false };
    player.connected = false;
    let hostChanged = false;
    if (clientId === this.hostClientId) {
      const nextHost = this.connectedPlayers().find((p) => p.id !== clientId);
      if (nextHost) {
        this.hostClientId = nextHost.id;
        hostChanged = true;
      }
    }
    return { hostChanged };
  }

  removePlayer(clientId) {
    this.players.delete(clientId);
    if (this.players.size > 0 && clientId === this.hostClientId) {
      const next = this.connectedPlayers()[0] || this.playerList()[0];
      this.hostClientId = next ? next.id : null;
    } else if (this.players.size === 0) {
      this.hostClientId = null;
    }
  }

  /** Resets a persistent room to a clean lobby once everyone has left, instead of deleting it. */
  resetToDormantLobby() {
    this.status = 'lobby';
    this.deck = [];
    this.currentIndex = 0;
    this.nextPage = 1;
    this.votes.clear();
    this.voteDeadline = null;
    this.noMatchBatches = 0;
    this.bestCandidate = null;
    this.decidedForYou = false;
  }

  resetSession() {
    this.noMatchBatches = 0;
    this.bestCandidate = null;
    this.decidedForYou = false;
    this.stats.sessions += 1;
  }

  get hostId() {
    return this.hostClientId;
  }

  isHost(clientId) {
    return clientId === this.hostClientId;
  }

  playerBySocket(socketId) {
    for (const player of this.players.values()) {
      if (player.socketId === socketId) return player;
    }
    return null;
  }

  playerList() {
    return [...this.players.values()].map((p) => ({ id: p.id, name: p.name, color: p.color, connected: p.connected }));
  }

  connectedPlayers() {
    return [...this.players.values()].filter((p) => p.connected);
  }

  /** Total players including ones mid-reconnect grace period; used for majority math. */
  playerCount() {
    return this.players.size;
  }

  /** Only currently-connected players; used to decide whether to advance without waiting on a dropped player. */
  activePlayerCount() {
    return this.connectedPlayers().length;
  }

  currentMovie() {
    return this.deck[this.currentIndex] ?? null;
  }

  castVote(clientId, vote) {
    const movie = this.currentMovie();
    if (!movie || this.status !== 'swiping') return { ok: false, reason: 'not_swiping' };
    if (!this.players.has(clientId)) return { ok: false, reason: 'not_in_room' };

    if (!this.votes.has(movie.id)) this.votes.set(movie.id, new Map());
    this.votes.get(movie.id).set(clientId, vote);
    this.touch();

    const voted = this.votes.get(movie.id).size;
    const total = this.activePlayerCount();
    const allVoted = voted >= total;

    return { ok: true, allVoted, voted, total };
  }

  votesForCurrent() {
    const movie = this.currentMovie();
    if (!movie) return { voted: 0, total: this.activePlayerCount(), playerIds: [] };
    const movieVotes = this.votes.get(movie.id);
    if (!movieVotes) return { voted: 0, total: this.activePlayerCount(), playerIds: [] };
    return {
      voted: movieVotes.size,
      total: this.activePlayerCount(),
      playerIds: [...movieVotes.keys()],
    };
  }

  hasPlayerVoted(clientId) {
    const movie = this.currentMovie();
    if (!movie) return false;
    return this.votes.get(movie.id)?.has(clientId) ?? false;
  }

  advanceCard() {
    this.currentIndex++;
    return this.currentIndex < this.deck.length;
  }

  /** Maggioranza: strictly more than half */
  majorityThreshold(count = this.playerCount()) {
    return Math.floor(count / 2) + 1;
  }

  /** Folds the votes for a card that's about to be left behind into the room's running stats
   *  and tracks the best-liked title even when it never reaches a majority (used by "decidi tu"). */
  finalizeCard(movie) {
    if (!movie) return;
    const movieVotes = this.votes.get(movie.id);
    let likes = 0;
    if (movieVotes) {
      for (const [clientId, vote] of movieVotes) {
        if (!this.players.has(clientId)) continue;
        if (vote === 'like') {
          likes++;
          this.stats.likesByPlayer[clientId] = (this.stats.likesByPlayer[clientId] || 0) + 1;
        }
      }
    }
    this.stats.titlesSeen++;
    for (const genre of movie.genres || []) {
      this.stats.genreCounts[genre] = (this.stats.genreCounts[genre] || 0) + 1;
    }
    const total = this.playerCount();
    const consensus = total ? Math.round((likes / total) * 100) : 0;
    if (!this.bestCandidate || likes > this.bestCandidate.likes) {
      this.bestCandidate = { movie, likes, total, consensus };
    }
  }

  computeResults() {
    const threshold = this.majorityThreshold();
    const results = [];

    for (const movie of this.deck) {
      const movieVotes = this.votes.get(movie.id);
      if (!movieVotes) continue;

      let likes = 0;
      let nopes = 0;
      const voters = [];

      for (const [playerId, vote] of movieVotes) {
        const player = this.players.get(playerId);
        if (!player) continue;
        voters.push({ name: player.name, color: player.color, vote });
        if (vote === 'like') likes++;
        else nopes++;
      }

      if (likes >= threshold) {
        results.push({
          movie,
          likes,
          nopes,
          total: this.playerCount(),
          threshold,
          voters,
          consensus: Math.round((likes / this.playerCount()) * 100),
        });
      }
    }

    results.sort((a, b) => b.likes - a.likes || b.consensus - a.consensus);
    return results;
  }

  decidedForYouResult() {
    if (!this.bestCandidate) return null;
    const { movie, likes, total, consensus } = this.bestCandidate;
    return { movie, likes, nopes: total - likes, total, threshold: this.majorityThreshold(), voters: [], consensus, decided: true };
  }

  statsSummary() {
    const genres = Object.entries(this.stats.genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
    const likeEntries = Object.entries(this.stats.likesByPlayer)
      .map(([clientId, count]) => ({ name: this.players.get(clientId)?.name || 'Former player', count }))
      .sort((a, b) => b.count - a.count);
    return {
      sessions: this.stats.sessions,
      titlesSeen: this.stats.titlesSeen,
      matches: this.stats.matches,
      topGenres: genres,
      topLiker: likeEntries[0] || null,
    };
  }

  toClient(clientId) {
    const movie = this.currentMovie();
    const voteStatus = this.votesForCurrent();
    return {
      id: this.id,
      persistent: this.persistent,
      status: this.status,
      isHost: this.isHost(clientId),
      hostId: this.hostClientId,
      players: this.playerList(),
      filters: this.filters,
      currentIndex: this.currentIndex,
      deckLength: this.deck.length,
      currentMovie: movie,
      voteStatus,
      hasVoted: this.hasPlayerVoted(clientId),
      voteDeadline: this.voteDeadline || null,
      decidedForYou: this.decidedForYou,
      results: this.status === 'results' ? (this.decidedForYou ? [this.decidedForYouResult()].filter(Boolean) : this.computeResults()) : null,
      stats: this.statsSummary(),
    };
  }
}

export class RoomManager {
  constructor() {
    /** @type {Map<string, Room>} */
    this.rooms = new Map();
    /** @type {Map<string, string>} socketId -> roomId */
    this.socketToRoom = new Map();
    /** @type {Map<string, string>} socketId -> clientId */
    this.socketToClient = new Map();
  }

  createRoom(persistent = false) {
    let id;
    do {
      id = generateRoomCode();
    } while (this.rooms.has(id));

    const room = new Room(id, persistent);
    this.rooms.set(id, room);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId?.toUpperCase()) ?? null;
  }

  getRoomBySocket(socketId) {
    const roomId = this.socketToRoom.get(socketId);
    return roomId ? this.rooms.get(roomId) : null;
  }

  getClientBySocket(socketId) {
    return this.socketToClient.get(socketId) ?? null;
  }

  bindSocket(socketId, roomId, clientId) {
    this.socketToRoom.set(socketId, roomId);
    this.socketToClient.set(socketId, clientId);
  }

  unbindSocket(socketId) {
    this.socketToRoom.delete(socketId);
    this.socketToClient.delete(socketId);
  }

  deleteRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    for (const player of room.players.values()) {
      if (player.disconnectTimer) clearTimeout(player.disconnectTimer);
    }
    this.rooms.delete(roomId);
  }

  cleanupExpired() {
    const now = Date.now();
    for (const [id, room] of this.rooms) {
      const ttl = room.persistent ? config.persistentRoomTtlMs : config.roomTtlMs;
      if (now - room.lastActivityAt > ttl) this.deleteRoom(id);
    }
  }
}
