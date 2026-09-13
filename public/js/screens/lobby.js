import { mountScreen, setHeaderBadge } from '../utils/dom.js';
import { leaveRoom, startSession, getJoinUrl, showToast } from '../socket.js';
import { appState, resetFiltersDraft } from '../state.js';
import { renderFilters } from './filters.js';

function playerChips(players, hostId) {
  return players.map((p) => `
    <span class="player-chip ${p.connected === false ? 'opacity-50' : ''}">
      <span class="player-dot" style="background:${p.color}"></span>
      ${p.name}${p.id === hostId ? ' <span class="text-slate-500 text-xs">(host)</span>' : ''}${p.connected === false ? ' <span class="text-amber-400 text-xs">(reconnecting…)</span>' : ''}
    </span>
  `).join('');
}

export function renderLobby(room, onNavigate) {
  const isHost = room.isHost;
  const filtersReady = Boolean(room.filters?.type);

  mountScreen('screen-lobby', `
    <div class="flex-grow flex flex-col p-6 overflow-y-auto">
      <div class="text-center mb-6">
        <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Room code</p>
        <div class="room-code">${room.id}</div>
        <p class="text-slate-400 text-sm mt-3">Share this code with friends on the same Wi‑Fi network.</p>
        ${room.persistent ? '<p class="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-full px-3 py-1 mt-3"><i class="fa-solid fa-thumbtack"></i>Fixed room: reuse this code anytime</p>' : ''}
      </div>

      ${room.stats?.sessions > 0 ? `
        <div class="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 mb-6 text-sm text-slate-300">
          <i class="fa-solid fa-chart-simple text-primary mr-2"></i>This group has already played <span class="font-bold text-white">${room.stats.sessions}</span> session${room.stats.sessions === 1 ? '' : 's'} together
          ${room.stats.topGenres?.[0] ? ` and loves <span class="font-bold text-white">${room.stats.topGenres[0].name}</span> most` : ''}.
        </div>
      ` : ''}

      ${isHost ? `
        <div class="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-6 flex flex-col items-center">
          <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
            <i class="fa-solid fa-qrcode text-primary mr-1"></i>Scan to join
          </p>
          <div id="qr-box" class="bg-white p-2 rounded-xl"></div>
          <button id="btn-copy-link" class="mt-3 text-xs text-slate-400 hover:text-white flex items-center gap-1">
            <i class="fa-solid fa-link"></i> Copy direct link
          </button>
        </div>
      ` : ''}

      <div class="mb-6">
        <p class="text-sm font-bold text-slate-400 mb-3">In the room (${room.players.length})</p>
        <div class="flex flex-wrap gap-2">${playerChips(room.players, room.hostId)}</div>
      </div>

      ${isHost ? `
        <div class="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-4">
          <h3 class="font-bold mb-2"><i class="fa-solid fa-sliders text-primary mr-2"></i>Search filters</h3>
          <p class="text-sm text-slate-400 mb-3">${filtersReady ? 'Filters set ✓' : 'Set up what to look for before starting.'}</p>
          <button id="btn-configure" class="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl text-sm">
            ${filtersReady ? 'Edit filters' : 'Set up filters'}
          </button>
        </div>
      ` : `
        <div class="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 mb-4 text-center">
          <i class="fa-solid fa-hourglass-half text-2xl text-slate-500 mb-2"></i>
          <p class="text-sm text-slate-400">Waiting for the host to set up filters and start the session…</p>
        </div>
      `}

      <div class="mt-auto space-y-3 pt-4">
        ${isHost ? `
          <button id="btn-start" class="w-full bg-primary hover:bg-rose-700 disabled:opacity-40 disabled:pointer-events-none text-white font-bold py-4 rounded-full text-lg shadow-lg shadow-primary/30"
            ${room.players.length < 2 || !filtersReady ? 'disabled' : ''}>
            <i class="fa-solid fa-play mr-2"></i>Start swiping
          </button>
          ${room.players.length < 2 ? '<p class="text-xs text-center text-slate-500">Need at least 2 players</p>' : ''}
        ` : ''}
        <button id="btn-leave" class="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold py-3 rounded-full text-sm">
          Leave room
        </button>
      </div>
    </div>
  `);

  setHeaderBadge(`Room ${room.id}`);

  document.getElementById('btn-leave').onclick = () => {
    leaveRoom();
    onNavigate('welcome');
  };

  if (isHost) {
    document.getElementById('btn-configure').onclick = () => {
      if (room.filters?.type) appState.filtersDraft = { ...room.filters };
      else resetFiltersDraft();
      onNavigate('filters');
    };
    document.getElementById('btn-start').onclick = () => startSession();

    const joinUrl = getJoinUrl(room.id);
    const qrBox = document.getElementById('qr-box');
    if (qrBox && window.QRCode) {
      // eslint-disable-next-line no-new
      new QRCode(qrBox, {
        text: joinUrl,
        width: 150,
        height: 150,
        colorDark: '#0f172a',
        colorLight: '#ffffff',
      });
    } else if (qrBox) {
      qrBox.innerHTML = `<p class="text-slate-800 text-xs p-4 max-w-[150px]">QR not available: use the code or the link.</p>`;
    }

    document.getElementById('btn-copy-link').onclick = async () => {
      try {
        await navigator.clipboard.writeText(joinUrl);
        showToast('Link copied to clipboard!');
      } catch {
        showToast(joinUrl);
      }
    };
  }
}

export function renderLoading(room) {
  mountScreen('screen-loading', `
    <div class="flex-grow flex flex-col justify-center items-center p-6 text-center">
      <div class="w-16 h-16 border-4 border-slate-700 border-t-primary rounded-full animate-spin mb-4"></div>
      <h2 class="text-xl font-bold">Preparing titles…</h2>
      <p class="text-slate-400 text-sm mt-2">${room.players.length} players waiting</p>
    </div>
  `);
  setHeaderBadge(`Room ${room.id}`);
}

export { renderFilters };
