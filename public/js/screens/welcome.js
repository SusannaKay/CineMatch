import { mountScreen, setHeaderBadge } from '../utils/dom.js';
import { appState } from '../state.js';
import { createRoom, joinRoom, showToast } from '../socket.js';

const modes = [
  { id: 'solo', label: 'Solo', icon: 'fa-user' },
  { id: 'suggestion', label: 'Suggestion', icon: 'fa-wand-magic-sparkles' },
  { id: 'multiplayer', label: 'Multiplayer', icon: 'fa-users' },
];

function renderModeNav(screen, onNavigate, activeMode = '') {
  const nav = screen.querySelector('#mode-nav');
  nav.innerHTML = modes.map((mode) => `
    <button data-mode="${mode.id}" class="mode-nav-btn flex-1 flex flex-col items-center justify-center gap-1 py-2 ${activeMode === mode.id ? 'text-primary' : 'text-slate-500'}">
      <i class="fa-solid ${mode.icon} text-lg"></i>
      <span class="text-[10px] font-bold">${mode.label}</span>
    </button>
  `).join('');

  nav.querySelectorAll('[data-mode]').forEach((button) => {
    button.onclick = () => {
      const mode = button.dataset.mode;
      appState.mode = mode;
      if (mode === 'multiplayer') {
        renderWelcome(onNavigate, 'multiplayer');
        return;
      }
      showToast(`${mode === 'solo' ? 'Solo' : 'Suggestion'} verrà ricollegato appena recuperiamo la vecchia implementazione.`);
      renderWelcome(onNavigate, mode);
    };
  });
}

export function renderWelcome(onNavigate, selectedMode = '') {
  const mode = selectedMode || appState.mode || '';
  const isMultiplayer = mode === 'multiplayer';
  const screen = mountScreen('screen-welcome', `
    <div class="flex-grow flex flex-col overflow-hidden">
      <div class="flex-grow flex flex-col justify-center items-center p-6 text-center overflow-y-auto">
        <i class="fa-solid ${isMultiplayer ? 'fa-users' : 'fa-film'} text-6xl text-primary mb-4 animate-pulse-fast"></i>
        <h1 class="text-4xl font-extrabold mb-2 tracking-tight">CineMatch</h1>
        <p class="text-slate-400 mb-8 text-lg">
          ${isMultiplayer ? 'Trova il film perfetto insieme ai tuoi amici.' : 'Trova il film perfetto per stasera.'}
        </p>

        ${isMultiplayer ? `
          <div class="w-full space-y-3 mb-6">
            <label class="block text-left text-xs text-slate-400 mb-1">Il tuo nickname</label>
            <input id="input-name" type="text" maxlength="20" placeholder="Es. Marco"
              class="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary">
          </div>
          <button id="btn-create-room" class="w-full bg-primary hover:bg-rose-700 text-white font-bold py-4 rounded-full text-lg shadow-lg shadow-primary/30 mb-3">
            <i class="fa-solid fa-plus mr-2"></i>Crea stanza
          </button>
          <button id="btn-goto-join" class="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-4 rounded-full text-lg">
            <i class="fa-solid fa-door-open mr-2"></i>Entra in stanza
          </button>
          <button id="btn-back-home" class="mt-5 text-sm font-semibold text-slate-400 hover:text-white">
            <i class="fa-solid fa-arrow-left mr-2"></i>Torna alle modalità
          </button>
        ` : `
          <div class="w-full bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
            <i class="fa-solid ${mode === 'solo' ? 'fa-user' : mode === 'suggestion' ? 'fa-wand-magic-sparkles' : 'fa-film'} text-3xl text-primary mb-3"></i>
            <h2 class="text-xl font-extrabold mb-2">${mode === 'solo' ? 'Solo' : mode === 'suggestion' ? 'Suggestion' : 'Scegli una modalità'}</h2>
            <p class="text-sm text-slate-400">
              ${mode ? 'Questa modalità è stata temporaneamente scollegata durante l’introduzione del multiplayer. La struttura è pronta per ripristinarla.' : 'Scegli dal menu in basso come vuoi trovare il tuo prossimo film.'}
            </p>
          </div>
        `}
        <p id="demo-hint" class="text-xs text-slate-500 mt-6"></p>
      </div>
      <nav id="mode-nav" class="flex-shrink-0 h-16 border-t border-slate-800 bg-slate-900/95 backdrop-blur flex items-stretch z-50"></nav>
    </div>
  `);

  setHeaderBadge('');
  screen.querySelector('#demo-hint').textContent = appState.useMockData
    ? 'Modalità demo attiva — titoli di esempio'
    : 'Connesso a TMDB';

  renderModeNav(screen, onNavigate, mode);

  const savedName = localStorage.getItem('cinematch_nickname');
  const nameInput = screen.querySelector('#input-name');
  if (nameInput && savedName) nameInput.value = savedName;

  screen.querySelector('#btn-create-room')?.addEventListener('click', () => {
    const name = screen.querySelector('#input-name').value.trim() || 'Host';
    appState.playerName = name;
    appState.mode = 'multiplayer';
    localStorage.setItem('cinematch_nickname', name);
    createRoom(name);
    onNavigate('lobby');
  });

  screen.querySelector('#btn-goto-join')?.addEventListener('click', () => onNavigate('join'));
  screen.querySelector('#btn-back-home')?.addEventListener('click', () => {
    appState.mode = null;
    renderWelcome(onNavigate, '');
  });
}

export function renderJoin(onNavigate) {
  const screen = mountScreen('screen-join', `
    <div class="flex-grow flex flex-col p-6">
      <button id="btn-back" class="self-start text-slate-400 hover:text-white p-2 mb-4">
        <i class="fa-solid fa-arrow-left text-xl"></i>
      </button>
      <h2 class="text-3xl font-extrabold mb-2">Entra in stanza</h2>
      <p class="text-slate-400 text-sm mb-8">Chiedi il codice a chi ha creato la stanza.</p>
      <label class="block text-left text-xs text-slate-400 mb-1">Codice stanza</label>
      <input id="input-code" type="text" maxlength="4" placeholder="A7K2"
        class="w-full bg-slate-800 border border-slate-700 rounded-xl py-4 px-4 text-white text-center room-code focus:outline-none focus:border-primary uppercase mb-4">
      <label class="block text-left text-xs text-slate-400 mb-1">Nickname</label>
      <input id="input-name-join" type="text" maxlength="20" placeholder="Es. Sara"
        class="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary mb-6">
      <button id="btn-join" class="w-full bg-primary hover:bg-rose-700 text-white font-bold py-4 rounded-full text-lg shadow-lg shadow-primary/30">Entra</button>
    </div>
  `);

  const nameInput = screen.querySelector('#input-name-join');
  nameInput.value = appState.playerName || localStorage.getItem('cinematch_nickname') || '';
  const codeInput = screen.querySelector('#input-code');
  if (appState.prefillRoomCode) {
    codeInput.value = appState.prefillRoomCode;
    appState.prefillRoomCode = '';
    setTimeout(() => nameInput.focus(), 50);
  }
  codeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });
  screen.querySelector('#btn-back').onclick = () => onNavigate('welcome');
  screen.querySelector('#btn-join').onclick = () => {
    const code = codeInput.value.trim();
    const name = nameInput.value.trim() || 'Ospite';
    if (code.length !== 4) return;
    appState.playerName = name;
    appState.mode = 'multiplayer';
    localStorage.setItem('cinematch_nickname', name);
    joinRoom(code, name);
    onNavigate('lobby');
  };
}
