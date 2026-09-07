import { mountScreen, setHeaderBadge } from '../utils/dom.js';
import { leaveRoom, startSession, getJoinUrl, showToast } from '../socket.js';
import { appState, resetFiltersDraft } from '../state.js';
import { renderFilters } from './filters.js';

function playerChips(players, hostId) {
  return players.map((p) => `
    <span class="player-chip">
      <span class="player-dot" style="background:${p.color}"></span>
      ${p.name}${p.id === hostId ? ' <span class="text-slate-500 text-xs">(host)</span>' : ''}
    </span>
  `).join('');
}

export function renderLobby(room, onNavigate) {
  const isHost = room.isHost;
  const filtersReady = Boolean(room.filters?.type);

  mountScreen('screen-lobby', `
    <div class="flex-grow flex flex-col p-6 overflow-y-auto">
      <div class="text-center mb-6">
        <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Codice stanza</p>
        <div class="room-code">${room.id}</div>
        <p class="text-slate-400 text-sm mt-3">Condividi questo codice con gli amici sulla stessa rete Wi‑Fi.</p>
      </div>

      ${isHost ? `
        <div class="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-6 flex flex-col items-center">
          <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
            <i class="fa-solid fa-qrcode text-primary mr-1"></i>Inquadra per entrare
          </p>
          <div id="qr-box" class="bg-white p-2 rounded-xl"></div>
          <button id="btn-copy-link" class="mt-3 text-xs text-slate-400 hover:text-white flex items-center gap-1">
            <i class="fa-solid fa-link"></i> Copia link diretto
          </button>
        </div>
      ` : ''}

      <div class="mb-6">
        <p class="text-sm font-bold text-slate-400 mb-3">In stanza (${room.players.length})</p>
        <div class="flex flex-wrap gap-2">${playerChips(room.players, room.hostId)}</div>
      </div>

      ${isHost ? `
        <div class="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-4">
          <h3 class="font-bold mb-2"><i class="fa-solid fa-sliders text-primary mr-2"></i>Filtri di ricerca</h3>
          <p class="text-sm text-slate-400 mb-3">${filtersReady ? 'Filtri configurati ✓' : 'Configura cosa cercare prima di iniziare.'}</p>
          <button id="btn-configure" class="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl text-sm">
            ${filtersReady ? 'Modifica filtri' : 'Configura filtri'}
          </button>
        </div>
      ` : `
        <div class="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 mb-4 text-center">
          <i class="fa-solid fa-hourglass-half text-2xl text-slate-500 mb-2"></i>
          <p class="text-sm text-slate-400">In attesa che l'host configuri i filtri e avvii la sessione…</p>
        </div>
      `}

      <div class="mt-auto space-y-3 pt-4">
        ${isHost ? `
          <button id="btn-start" class="w-full bg-primary hover:bg-rose-700 disabled:opacity-40 disabled:pointer-events-none text-white font-bold py-4 rounded-full text-lg shadow-lg shadow-primary/30"
            ${room.players.length < 2 || !filtersReady ? 'disabled' : ''}>
            <i class="fa-solid fa-play mr-2"></i>Inizia lo swipe
          </button>
          ${room.players.length < 2 ? '<p class="text-xs text-center text-slate-500">Servono almeno 2 giocatori</p>' : ''}
        ` : ''}
        <button id="btn-leave" class="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold py-3 rounded-full text-sm">
          Esci dalla stanza
        </button>
      </div>
    </div>
  `);

  setHeaderBadge(`Stanza ${room.id}`);

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
      qrBox.innerHTML = `<p class="text-slate-800 text-xs p-4 max-w-[150px]">QR non disponibile: usa il codice o il link.</p>`;
    }

    document.getElementById('btn-copy-link').onclick = async () => {
      try {
        await navigator.clipboard.writeText(joinUrl);
        showToast('Link copiato negli appunti!');
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
      <h2 class="text-xl font-bold">Preparo i titoli…</h2>
      <p class="text-slate-400 text-sm mt-2">${room.players.length} giocatori in attesa</p>
    </div>
  `);
  setHeaderBadge(`Stanza ${room.id}`);
}

export { renderFilters };
