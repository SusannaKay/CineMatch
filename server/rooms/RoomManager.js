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
  constructor(id, hostSocketId) {
    this.id = id;
    this.hostSocketId = hostSocketId;
    this.status = 'lobby';
    this.players = new Map();
    this.filters = null;
    this.deck = [];
    this.currentIndex = 0;
    /** @type {Map<number, Map<string, 'like'|'nope'>>} */
    this.votes = new Map();
    this.createdAt = Date.now();
    this.voteTimer = null;
    this.colorIndex = 0;
  }

  addPlayer(socketId, name) {
    const color = config.playerColors[this.colorIndex % config.playerColors.length];
    this.colorIndex++;
    this.players.set(socketId, { id: socketId, name, color, connected: true });
    if (this.players.size === 1) this.hostSocketId = socketId;
    return this.players.get(socketId);
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    if (this.players.size > 0 && socketId === this.hostSocketId) {
      this.hostSocketId = this.players.keys().next().value;
    }
  }

  get hostId() {
    return this.hostSocketId;
  }

  isHost(socketId) {
    return socketId === this.hostSocketId;
  }

  playerList() {
    return [...this.players.values()];
  }

  playerCount() {
    return this.players.size;
  }

  currentMovie() {
    return this.deck[this.currentIndex] ?? null;
  }

  castVote(socketId, vote) {
    const movie = this.currentMovie();
    if (!movie || this.status !== 'swiping') return { ok: false, reason: 'not_swiping' };
    if (!this.players.has(socketId)) return { ok: false, reason: 'not_in_room' };

    if (!this.votes.has(movie.id)) this.votes.set(movie.id, new Map());
    this.votes.get(movie.id).set(socketId, vote);

    const voted = this.votes.get(movie.id).size;
    const total = this.playerCount();
    const allVoted = voted >= total;

    return { ok: true, allVoted, voted, total };
  }

  votesForCurrent() {
    const movie = this.currentMovie();
    if (!movie) return { voted: 0, total: this.playerCount(), playerIds: [] };
    const movieVotes = this.votes.get(movie.id);
    if (!movieVotes) return { voted: 0, total: this.playerCount(), playerIds: [] };
    return {
      voted: movieVotes.size,
      total: this.playerCount(),
      playerIds: [...movieVotes.keys()],
    };
  }

  hasPlayerVoted(socketId) {
    const movie = this.currentMovie();
    if (!movie) return false;
    return this.votes.get(movie.id)?.has(socketId) ?? false;
  }

  advanceCard() {
    this.currentIndex++;
    return this.currentIndex < this.deck.length;
  }

  /** Maggioranza: strictly more than half */
  majorityThreshold(count = this.playerCount()) {
    return Math.floor(count / 2) + 1;
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

  toClient(socketId) {
    const movie = this.currentMovie();
    const voteStatus = this.votesForCurrent();
    return {
      id: this.id,
      status: this.status,
      isHost: this.isHost(socketId),
      hostId: this.hostSocketId,
      players: this.playerList(),
      filters: this.filters,
      currentIndex: this.currentIndex,
      deckLength: this.deck.length,
      currentMovie: movie,
      voteStatus,
      hasVoted: this.hasPlayerVoted(socketId),
      results: this.status === 'results' ? this.computeResults() : null,
    };
  }
}

export class RoomManager {
  constructor() {
    /** @type {Map<string, Room>} */
    this.rooms = new Map();
    /** @type {Map<string, string>} socketId -> roomId */
    this.socketToRoom = new Map();
  }

  createRoom(hostSocketId) {
    let id;
    do {
      id = generateRoomCode();
    } while (this.rooms.has(id));

    const room = new Room(id, hostSocketId);
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

  bindSocket(socketId, roomId) {
    this.socketToRoom.set(socketId, roomId);
  }

  unbindSocket(socketId) {
    this.socketToRoom.delete(socketId);
  }

  deleteRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    for (const pid of room.players.keys()) this.unbindSocket(pid);
    this.rooms.delete(roomId);
  }

  cleanupExpired() {
    const now = Date.now();
    for (const [id, room] of this.rooms) {
      if (now - room.createdAt > config.roomTtlMs) this.deleteRoom(id);
    }
  }
}
