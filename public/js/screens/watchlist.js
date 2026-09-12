import { mountScreen, setHeaderBadge } from '../utils/dom.js';
import { getWatchlist, removeFromWatchlist } from '../watchlist.js';
import { openDetails } from './details.js';
import { showToast } from '../socket.js';

let sortMode = 'added';
let typeFilter = 'all';
let searchQuery = '';

export function renderWatchlist(onNavigate) {
  const screen = mountScreen('screen-watchlist', `
    <div class="flex-grow flex flex-col overflow-hidden">
      <div class="p-6 pb-3 flex items-center justify-between gap-3">
        <div><h2 class="text-2xl font-extrabold">La tua Watchlist</h2><p class="text-sm text-slate-400 mt-1">I titoli che hai salvato.</p></div>
        <select id="sort-select" class="bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold rounded-lg px-2 py-2">
          <option value="added">Ordine aggiunta</option>
          <option value="rating-desc">Rating ↓</option>
          <option value="rating-asc">Rating ↑</option>
        </select>
      </div>
      <div class="px-6 pb-3 flex-shrink-0">
        <div class="relative mb-3">
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
          <input id="watchlist-search" type="search" placeholder="Cerca nella tua Watchlist..." class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500">
        </div>
        <div class="flex items-center gap-2">
          <div id="type-filters" class="flex gap-2 flex-1"></div>
          <button id="btn-surprise" class="flex items-center gap-1.5 bg-primary/15 text-primary border border-primary/40 text-xs font-bold px-3 py-2 rounded-lg flex-shrink-0"><i class="fa-solid fa-shuffle"></i> Sorpresa</button>
        </div>
        <div id="watchlist-stats" class="text-xs text-slate-500 mt-3"></div>
      </div>
      <div id="watchlist-content" class="px-6 overflow-y-auto flex-grow pb-4"></div>
      <nav id="mode-nav" class="mode-nav flex-shrink-0 h-16 border-t border-slate-800 bg-slate-900/95"></nav>
    </div>
  `);
  setHeaderBadge(`${getWatchlist().length}`);
  renderNav(screen, onNavigate, 'watchlist');

  const sortSelect = screen.querySelector('#sort-select');
  sortSelect.value = sortMode;
  sortSelect.onchange = () => { sortMode = sortSelect.value; refresh(screen); };

  const search = screen.querySelector('#watchlist-search');
  search.value = searchQuery;
  search.oninput = () => { searchQuery = search.value; refresh(screen); };

  screen.querySelector('#btn-surprise').onclick = () => surpriseMe(screen);

  renderTypeFilters(screen);
  renderItems(screen);
}

function refresh(screen) {
  renderTypeFilters(screen);
  renderItems(screen);
}

function renderTypeFilters(screen) {
  const container = screen.querySelector('#type-filters');
  const all = getWatchlist();
  const counts = { all: all.length, movie: 0, tv: 0 };
  all.forEach((m) => { counts[m.mediaType === 'tv' ? 'tv' : 'movie']++; });
  const options = [['all', 'Tutti', counts.all], ['movie', 'Film', counts.movie], ['tv', 'Serie TV', counts.tv]];
  container.innerHTML = options.map(([id, label, count]) => `
    <button data-type="${id}" class="type-chip flex-shrink-0 text-xs font-bold px-3 py-2 rounded-lg border ${typeFilter === id ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-slate-800 border-slate-700 text-slate-400'}">${label} <span class="opacity-70">${count}</span></button>
  `).join('');
  container.querySelectorAll('[data-type]').forEach((btn) => {
    btn.onclick = () => { typeFilter = btn.dataset.type; refresh(screen); };
  });
}

function filteredMovies() {
  const q = searchQuery.trim().toLowerCase();
  return getWatchlist().filter((movie) => {
    const matchesType = typeFilter === 'all' || (movie.mediaType === 'tv' ? 'tv' : 'movie') === typeFilter;
    const matchesQuery = !q || (movie.title || '').toLowerCase().includes(q);
    return matchesType && matchesQuery;
  });
}

function sortMovies(movies) {
  if (sortMode === 'rating-desc') return [...movies].sort((a, b) => (parseFloat(b.vote_average) || 0) - (parseFloat(a.vote_average) || 0));
  if (sortMode === 'rating-asc') return [...movies].sort((a, b) => (parseFloat(a.vote_average) || 0) - (parseFloat(b.vote_average) || 0));
  return movies;
}

function renderStats(screen, movies) {
  const statsEl = screen.querySelector('#watchlist-stats');
  const total = getWatchlist().length;
  if (!total) { statsEl.innerHTML = ''; return; }
  const ratings = movies.map((m) => parseFloat(m.vote_average)).filter((n) => !Number.isNaN(n));
  const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '—';
  const shown = movies.length;
  statsEl.innerHTML = `<span class="font-bold text-slate-300">${shown}</span> titol${shown === 1 ? 'o' : 'i'}${shown !== total ? ` su ${total}` : ''} · rating medio <span class="font-bold text-slate-300">⭐ ${avg}</span>`;
}

function renderItems(screen) {
  const container = screen.querySelector('#watchlist-content');
  const movies = sortMovies(filteredMovies());
  renderStats(screen, movies);

  if (!getWatchlist().length) {
    container.innerHTML = '<div class="h-full flex flex-col items-center justify-center text-center text-slate-500 p-8"><i class="fa-solid fa-bookmark text-4xl mb-4"></i><p class="font-semibold">La Watchlist è vuota.</p><p class="text-sm mt-2">Metti Mi piace in Solo o salva un suggerimento.</p></div>';
    return;
  }
  if (!movies.length) {
    container.innerHTML = '<div class="h-full flex flex-col items-center justify-center text-center text-slate-500 p-8"><i class="fa-solid fa-magnifying-glass text-4xl mb-4"></i><p class="font-semibold">Nessun risultato.</p><p class="text-sm mt-2">Prova a cambiare ricerca o filtro.</p></div>';
    return;
  }

  container.innerHTML = '';
  movies.forEach((movie) => {
    const item = document.createElement('article');
    item.className = 'flex gap-3 p-3 mb-3 rounded-xl bg-slate-800 border border-slate-700 transition-colors';
    item.innerHTML = `
      <button class="flex gap-3 text-left flex-1 min-w-0">
        <img src="${movie.poster_path}" class="w-16 h-24 object-cover rounded-lg flex-shrink-0">
        <div class="min-w-0">
          <h3 class="font-bold truncate">${escapeHTML(movie.title)}</h3>
          <div class="flex items-center gap-2 mt-1.5">
            <span class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-700 text-slate-300"><i class="fa-solid ${movie.mediaType === 'tv' ? 'fa-tv' : 'fa-film'} text-[9px]"></i>${movie.mediaType === 'tv' ? 'Serie TV' : 'Film'}</span>
            <span class="text-xs text-slate-400">${movie.release_date?.substring(0, 4) || 'N/A'}</span>
          </div>
          <p class="text-xs text-yellow-400 font-semibold mt-2">⭐ ${movie.vote_average}</p>
        </div>
      </button>
      <button class="remove text-slate-500 hover:text-rose-400 px-2 flex-shrink-0" aria-label="Rimuovi"><i class="fa-solid fa-trash"></i></button>
    `;
    item.querySelector('.flex-1').onclick = () => openDetails(movie);
    item.querySelector('.remove').onclick = () => {
      removeFromWatchlist(movie.id);
      showToast('Rimosso dalla Watchlist');
      refresh(screen);
      setHeaderBadge(`${getWatchlist().length}`);
    };
    container.appendChild(item);
  });
}

function surpriseMe(screen) {
  const pool = filteredMovies();
  if (!pool.length) { showToast('Nessun titolo tra cui scegliere'); return; }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  openDetails(pick);
  showToast(`Stasera guardate: "${pick.title}"?`);
}

function renderNav(screen, onNavigate, active) { const nav = screen.querySelector('#mode-nav'); const items = [['solo', 'Solo', 'fa-user'], ['suggestion', 'Suggestion', 'fa-wand-magic-sparkles'], ['multiplayer', 'Multiplayer', 'fa-users'], ['watchlist', 'Watchlist', 'fa-bookmark']]; nav.innerHTML = items.map(([id, l, i]) => `<button data-mode="${id}" class="flex-1 flex flex-col items-center justify-center gap-1 ${active === id ? 'text-primary' : 'text-slate-500'}"><i class="fa-solid ${i}"></i><span class="text-[10px] font-bold">${l}</span></button>`).join(''); nav.querySelectorAll('[data-mode]').forEach((b) => b.onclick = () => onNavigate(b.dataset.mode === 'solo' ? 'filters' : b.dataset.mode)); }
function escapeHTML(v = '') { const d = document.createElement('div'); d.textContent = v; return d.innerHTML; }
