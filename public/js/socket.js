import { appState } from './state.js';

let socket = null;
const listeners = new Set();

function getOrCreateClientId() {
  const KEY = 'cinematch_client_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
    localStorage.setItem(KEY, id);
  }
  return id;
}

export const CLIENT_ID = getOrCreateClientId();

export function getSocket() {
  if (!socket) {
    socket = io({ transports: ['websocket', 'polling'] });
    socket.on('connect', () => {
      // A dropped connection (Wi‑Fi blip, backgrounded tab) reconnects the socket
      // automatically; re-announce ourselves so the server restores our seat.
      if (appState.room?.id) {
        socket.emit('room:join', { code: appState.room.id, name: appState.playerName, clientId: CLIENT_ID });
      }
    });
    socket.on('room:state', (room) => {
      const previousHostId = appState.room?.hostId;
      appState.room = room;
      appState.localVoteCast = room.hasVoted ?? false;
      if (previousHostId && room.hostId && previousHostId !== room.hostId) {
        const newHost = room.players.find((p) => p.id === room.hostId);
        showToast(newHost ? `${newHost.name} è ora host della stanza` : 'L\'host della stanza è cambiato');
      }
      listeners.forEach((fn) => fn(room));
    });
    socket.on('room:error', ({ message }) => {
      showToast(message);
    });
  }
  return socket;
}

export function onRoomState(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function createRoom(name, persistent = false) {
  getSocket().emit('room:create', { name, clientId: CLIENT_ID, persistent });
}

export function joinRoom(code, name) {
  getSocket().emit('room:join', { code, name, clientId: CLIENT_ID });
}

export function leaveRoom() {
  getSocket().emit('room:leave');
  appState.room = null;
}

export function setFilters(filters) {
  getSocket().emit('room:set-filters', { filters });
}

export function startSession() {
  getSocket().emit('room:start');
}

export function castVote(vote) {
  getSocket().emit('vote:cast', { vote });
  appState.localVoteCast = true;
}

export function restartRoom() {
  getSocket().emit('room:restart');
  appState.localVoteCast = false;
}

export function showToast(message, ms = 3500) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add('hidden'), ms);
}

export async function fetchConfig() {
  const res = await fetch('/api/config');
  const data = await res.json();
  appState.useMockData = data.useMockData;
  appState.lanAddresses = data.lanAddresses || [];
  appState.port = data.port || window.location.port;
}

export function getJoinUrl(roomCode) {
  const ip = appState.lanAddresses[0] || window.location.hostname;
  const port = appState.port || window.location.port;
  const portPart = port ? `:${port}` : '';
  return `http://${ip}${portPart}/?room=${roomCode}`;
}
