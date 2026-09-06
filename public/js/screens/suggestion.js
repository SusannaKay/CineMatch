import { mountScreen, setHeaderBadge } from '../utils/dom.js';
import { addToWatchlist, hasInWatchlist } from '../watchlist.js';
import { openDetails } from './details.js';
import { showToast } from '../socket.js';

export function renderSuggestion(onNavigate) {
  const screen = mountScreen('screen-suggestion', `
    <div class="flex-grow flex flex-col overflow-hidden">
      <div class="p-6 pb-3 flex-shrink-0">
        <h2 class="text-2xl font-extrabold text-center">Trova titoli simili</h2>
        <p class="text-slate-400 text-sm text-center mt-2">Parti da un film o una serie che ami.</p>
        <div class="relative mt-5">
          <i class="fa-solid fa-search absolute left-4 top-4 text-slate-500"></i>
          <input id="seed-input" type="text" placeholder="Es. Inception, Breaking Bad..." autocomplete="off"
            class="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary">
        </div>
      </div>
      <div id="seed-results" class="px-6 overflow-y-auto flex-grow pb-4"></div>
      <nav id="mode-nav" class="mode-nav flex-shrink-0 h-16 border-t border-slate-800 bg-slate-900/95 backdrop-blur"></nav>
    </div>
  `);

  setHeaderBadge('Suggestion');
  renderNav(screen, onNavigate, 'suggestion');

  const input = screen.querySelector('#seed-input');
  const results = screen.querySelector('#seed-results');
  let timer;

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) { results.innerHTML = ''; return; }
    results.innerHTML = '<div class="text-center py-8 text-slate-500"><i class="fa-solid fa-circle-notch fa-spin text-xl"></i></div>';
    timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!response.ok) throw new Error();
        renderSeeds(results, await response.json(), onSelectSeed);
      } catch { results.innerHTML = '<p class="text-center text-rose-400 py-8">Errore durante la ricerca.</p>'; }
    }, 500);
  });

  async function onSelectSeed(seed) {
    results.innerHTML = '<div class="text-center py-12 text-slate-500"><i class="fa-solid fa-circle-notch fa-spin text-2xl"></i><p class="mt-3">Cerco titoli simili…</p></div>';
    try {
      const response = await fetch(`/api/recommendations?id=${seed.id}&mediaType=${seed.mediaType}`);
      if (!response.ok) throw new Error();
      const recommendations = await response.json();
      renderRecommendations(results, seed.title, recommendations);
    } catch { results.innerHTML = '<p class="text-center text-rose-400 py-8">Impossibile caricare le raccomandazioni.</p>'; }
  }

  function renderRecommendations(container, seedTitle, movies) {
    if (!movies.length) { container.innerHTML = `<p class="text-center text-slate-500 py-8">Nessun titolo simile trovato per ${escapeHTML(seedTitle)}.</p>`; return; }
    container.innerHTML = `<div class="mb-4"><button id="back-seeds" class="text-sm text-slate-400 hover:text-white"><i class="fa-solid fa-arrow-left mr-2"></i>Nuova ricerca</button><h3 class="text-xl font-extrabold mt-3">Simili a ${escapeHTML(seedTitle)}</h3></div>`;
    const grid = document.createElement('div'); grid.className = 'grid grid-cols-2 gap-3'; container.appendChild(grid);
    movies.forEach((movie) => {
      const card = document.createElement('article'); card.className = 'match-card relative';
      card.innerHTML = `<button class="w-full text-left"><img src="${movie.poster_path}" alt="${escapeHTML(movie.title)}" class="w-full aspect-[2/3] object-cover"><div class="p-3"><h4 class="font-bold text-sm truncate">${escapeHTML(movie.title)}</h4><p class="text-xs text-slate-500 mt-1">${movie.release_date?.substring(0,4) || 'N/A'} · ⭐ ${movie.vote_average}</p></div></button><button class="save-btn absolute top-2 right-2 w-9 h-9 rounded-full bg-slate-900/90 border border-slate-700">${hasInWatchlist(movie.id) ? '♥' : '♡'}</button>`;
      card.querySelector('article > button');
      card.querySelector('.w-full').onclick = () => openDetails(movie);
      card.querySelector('.save-btn').onclick = (e) => { e.stopPropagation(); if (addToWatchlist(movie)) { e.currentTarget.textContent = '♥'; showToast('Salvato nella Watchlist'); } else showToast('Già nella Watchlist'); };
      grid.appendChild(card);
    });
    container.querySelector('#back-seeds').onclick = () => { input.value = ''; container.innerHTML = ''; input.focus(); };
  }
}

function renderSeeds(container, seeds, onSelect) {
  if (!seeds.length) { container.innerHTML = '<p class="text-center text-slate-500 py-8">Nessun risultato trovato.</p>'; return; }
  container.innerHTML = '';
  seeds.forEach((seed) => {
    const button = document.createElement('button'); button.className = 'w-full flex items-center gap-4 p-3 mb-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-left';
    button.innerHTML = `${seed.poster_path ? `<img src="${seed.poster_path}" class="w-12 h-16 object-cover rounded">` : '<div class="w-12 h-16 rounded bg-slate-700"></div>'}<div class="min-w-0"><h4 class="font-bold truncate">${escapeHTML(seed.title)}</h4><p class="text-xs text-slate-400">${seed.mediaType === 'movie' ? 'Film' : 'Serie TV'} · ${seed.year || 'N/A'}</p></div>`;
    button.onclick = () => onSelect(seed); container.appendChild(button);
  });
}

function renderNav(screen, onNavigate, active) {
  const nav = screen.querySelector('#mode-nav');
  const items = [
    ['solo', 'Solo', 'fa-user'], ['suggestion', 'Suggestion', 'fa-wand-magic-sparkles'], ['multiplayer', 'Multiplayer', 'fa-users'], ['watchlist', 'Watchlist', 'fa-bookmark']
  ];
  nav.innerHTML = items.map(([id,label,icon]) => `<button data-mode="${id}" class="flex-1 flex flex-col items-center justify-center gap-1 ${active===id?'text-primary':'text-slate-500'}"><i class="fa-solid ${icon}"></i><span class="text-[10px] font-bold">${label}</span></button>`).join('');
  nav.querySelectorAll('[data-mode]').forEach((btn) => btn.onclick = () => onNavigate(btn.dataset.mode === 'solo' ? 'filters' : btn.dataset.mode));
}

function escapeHTML(value = '') { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }
