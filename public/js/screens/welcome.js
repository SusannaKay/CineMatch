import { mountScreen, setHeaderBadge } from '../utils/dom.js';
import { appState } from '../state.js';
import { createRoom, joinRoom } from '../socket.js';

export function renderWelcome(onNavigate) {
  const screen = mountScreen('screen-welcome', `
    <div class="flex-grow flex flex-col justify-center items-center p-6 text-center">
      <i class="fa-solid fa-film text-6xl text-primary mb-4 animate-pulse-fast"></i>
      <h1 class="text-4xl font-extrabold mb-2 tracking-tight">CineMatch</h1>
      <p class="text-slate-400 mb-8 text-lg">Trova il film perfetto per stasera.</p>

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

      <p id="demo-hint" class="text-xs text-slate-500 mt-6"></p>
    </div>
  `);

  setHeaderBadge('');
  document.getElementById('demo-hint').textContent = appState.useMockData
    ? 'Modalità demo attiva — titoli di esempio'
    : 'Connesso a TMDB';

  const savedName = localStorage.getItem('cinematch_nickname');
  if (savedName) document.getElementById('input-name').value = savedName;

  screen.querySelector('#btn-create-room').onclick = () => {
    const name = document.getElementById('input-name').value.trim() || 'Host';
    appState.playerName = name;
    localStorage.setItem('cinematch_nickname', name);
    createRoom(name);
    onNavigate('lobby');
  };

  screen.querySelector('#btn-goto-join').onclick = () => onNavigate('join');
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

      <button id="btn-join" class="w-full bg-primary hover:bg-rose-700 text-white font-bold py-4 rounded-full text-lg shadow-lg shadow-primary/30">
        Entra
      </button>
    </div>
  `);

  const nameInput = screen.querySelector('#input-name-join');
  nameInput.value = appState.playerName || localStorage.getItem('cinematch_nickname') || '';

  screen.querySelector('#input-code').addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });

  screen.querySelector('#btn-back').onclick = () => onNavigate('welcome');
  screen.querySelector('#btn-join').onclick = () => {
    const code = screen.querySelector('#input-code').value.trim();
    const name = nameInput.value.trim() || 'Ospite';
    if (code.length !== 4) return;
    appState.playerName = name;
    localStorage.setItem('cinematch_nickname', name);
    joinRoom(code, name);
    onNavigate('lobby');
  };
}
