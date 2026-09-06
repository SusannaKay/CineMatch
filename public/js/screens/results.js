import { mountScreen, setHeaderBadge } from '../utils/dom.js';
import { restartRoom, leaveRoom } from '../socket.js';

function voterList(voters) {
  return voters.map((v) => `
    <span class="inline-flex items-center gap-1 text-xs mr-2">
      <span class="w-2 h-2 rounded-full" style="background:${v.color}"></span>
      ${v.name}
      <i class="fa-solid ${v.vote === 'like' ? 'fa-heart text-emerald-500' : 'fa-xmark text-rose-500'} ml-0.5"></i>
    </span>
  `).join('');
}

export function renderResults(room, onNavigate) {
  const results = room.results || [];
  const threshold = results[0]?.threshold ?? Math.floor(room.players.length / 2) + 1;

  mountScreen('screen-results', `
    <div class="flex-grow flex flex-col overflow-y-auto p-6">
      <div class="text-center mb-6">
        <i class="fa-solid fa-champagne-glasses text-5xl text-primary mb-3"></i>
        <h2 class="text-2xl font-extrabold">Risultati della serata</h2>
        <p class="text-slate-400 text-sm mt-2">
          Match = almeno ${threshold} su ${room.players.length} hanno messo ❤️
        </p>
      </div>

      <div id="results-list" class="space-y-4 flex-grow"></div>

      <div class="space-y-3 pt-6 flex-shrink-0">
        ${room.isHost ? `
          <button id="btn-restart" class="w-full bg-primary hover:bg-rose-700 text-white font-bold py-4 rounded-full">
            Nuova sessione
          </button>
        ` : ''}
        <button id="btn-exit" class="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold py-3 rounded-full text-sm">
          Esci
        </button>
      </div>
    </div>
  `);

  setHeaderBadge(`Stanza ${room.id}`);

  const list = document.getElementById('results-list');

  if (results.length === 0) {
    list.innerHTML = `
      <div class="text-center py-12 text-slate-500">
        <i class="fa-solid fa-ghost text-4xl mb-3"></i>
        <p class="font-semibold text-slate-400">Nessun match in maggioranza</p>
        <p class="text-sm mt-2">Provate con filtri più ampi o ricominciate!</p>
      </div>
    `;
  } else {
    results.forEach((r, i) => {
      const card = document.createElement('div');
      card.className = `match-card ${i === 0 ? 'winner' : ''}`;
      card.innerHTML = `
        <div class="flex gap-3 p-3">
          <img src="${r.movie.poster_path}" alt="${r.movie.title}" class="w-20 h-28 object-cover rounded-lg flex-shrink-0">
          <div class="flex-grow min-w-0">
            ${i === 0 ? '<span class="text-xs font-bold text-primary uppercase tracking-wide">Top match</span>' : ''}
            <h3 class="font-extrabold text-lg leading-tight">${r.movie.title}</h3>
            <p class="text-sm text-emerald-400 font-bold mt-1">
              <i class="fa-solid fa-heart mr-1"></i>${r.likes}/${r.total} · ${r.consensus}% consenso
            </p>
            <div class="mt-2 flex flex-wrap gap-y-1">${voterList(r.voters)}</div>
          </div>
        </div>
        ${r.movie.trailerKey ? `
          <div class="px-3 pb-3">
            <a href="https://www.youtube.com/watch?v=${r.movie.trailerKey}" target="_blank"
              class="block text-center text-sm font-bold text-primary py-2 bg-slate-900 rounded-lg">
              <i class="fa-brands fa-youtube mr-1"></i> Guarda il trailer
            </a>
          </div>
        ` : ''}
      `;
      list.appendChild(card);
    });
  }

  document.getElementById('btn-exit').onclick = () => {
    leaveRoom();
    onNavigate('welcome');
  };

  const restartBtn = document.getElementById('btn-restart');
  if (restartBtn) {
    restartBtn.onclick = () => restartRoom();
  }
}
