import { appState } from './state.js';

let socket = null;
const listeners = new Set();

export function getSocket() {
  if (!socket) {
    socket = io({ transports: ['websocket', 'polling'] });
    socket.on('room:state', (room) => {
      appState.room = room;
      appState.localVoteCast = room.hasVoted ?? false;
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

export function createRoom(name) {
  getSocket().emit('room:create', { name });
}

export function joinRoom(code, name) {
  getSocket().emit('room:join', { code, name });
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
}
