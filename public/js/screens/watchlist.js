import { mountScreen, setHeaderBadge } from '../utils/dom.js';
import { getWatchlist, removeFromWatchlist, updateWatchlistItem } from '../watchlist.js';
import { openDetails } from './details.js';
import { showToast } from '../socket.js';
import { exportAsMarkdown, exportAsJSON, exportAsImage } from '../utils/export.js';

let sortMode = 'added';
let typeFilter = 'all';
let statusFilter = 'all';
let tagFilter = null;
let searchQuery = '';
let addingTagFor = null;

export function renderWatchlist(onNavigate) {
  const screen = mountScreen('screen-watchlist', `
    <div class="flex-grow flex flex-col overflow-hidden">
      <div class="p-6 pb-3 flex items-center justify-between gap-3">
        <div><h2 class="text-2xl font-extrabold">Your Watchlist</h2><p class="text-sm text-slate-400 mt-1">Titles you've saved.</p></div>
        <select id="sort-select" class="bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold rounded-lg px-2 py-2">
          <option value="added">Date added</option>
          <option value="rating-desc">Rating ↓</option>
          <option value="rating-asc">Rating ↑</option>
        </select>
      </div>
      <div class="px-6 pb-3 flex-shrink-0">
        <div class="relative mb-3">
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
          <input id="watchlist-search" type="search" placeholder="Search your Watchlist..." class="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500">
        </div>
        <div class="flex items-center gap-2 mb-2">
          <div id="type-filters" class="flex gap-2 flex-1"></div>
          <button id="btn-surprise" class="flex items-center gap-1.5 bg-primary/15 text-primary border border-primary/40 text-xs font-bold px-3 py-2 rounded-lg flex-shrink-0"><i class="fa-solid fa-shuffle"></i> Surprise me</button>
        </div>
        <div class="flex items-center gap-2">
          <div id="status-filters" class="flex gap-2 flex-1"></div>
          <div class="relative flex-shrink-0">
            <button id="btn-export" class="flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold px-3 py-2 rounded-lg"><i class="fa-solid fa-file-export"></i> Export <i class="fa-solid fa-chevron-down text-[9px] opacity-60"></i></button>
            <div id="export-menu" class="hidden absolute right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-10 overflow-hidden w-52">
              <button data-fmt="md" class="w-full text-left px-4 py-3 text-sm hover:bg-slate-700 flex items-center gap-2"><i class="fa-solid fa-copy w-4"></i>Copy as text</button>
              <button data-fmt="json" class="w-full text-left px-4 py-3 text-sm hover:bg-slate-700 flex items-center gap-2"><i class="fa-solid fa-file-code w-4"></i>Download JSON</button>
              <button data-fmt="png" class="w-full text-left px-4 py-3 text-sm hover:bg-slate-700 flex items-center gap-2"><i class="fa-solid fa-image w-4"></i>Download image</button>
            </div>
          </div>
        </div>
        <div id="tag-filters" class="flex gap-2 flex-wrap mt-2"></div>
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
  wireExportMenu(screen);

  renderTypeFilters(screen);
  renderStatusFilters(screen);
  renderTagFilters(screen);
  renderItems(screen);
}

function refresh(screen) {
  renderTypeFilters(screen);
  renderStatusFilters(screen);
  renderTagFilters(screen);
  renderItems(screen);
}

function wireExportMenu(screen) {
  const btn = screen.querySelector('#btn-export');
  const menu = screen.querySelector('#export-menu');
  btn.onclick = () => menu.classList.toggle('hidden');
  menu.querySelectorAll('[data-fmt]').forEach((item) => {
    item.onclick = async () => {
      menu.classList.add('hidden');
      const all = getWatchlist();
      if (!all.length) { showToast('Your Watchlist is empty'); return; }
      const fmt = item.dataset.fmt;
      if (fmt === 'md') {
        const r = await exportAsMarkdown(all);
        showToast(r.copied ? 'Watchlist copied to clipboard!' : '.md file downloaded');
      } else if (fmt === 'json') {
        exportAsJSON(all);
        showToast('JSON file downloaded');
      } else if (fmt === 'png') {
        showToast('Generating image...');
        const r = await exportAsImage(all);
        showToast(r.ok ? 'Image downloaded!' : 'Image export failed, try another format.');
      }
    };
  });
}

function renderTypeFilters(screen) {
  const container = screen.querySelector('#type-filters');
  const all = getWatchlist();
  const counts = { all: all.length, movie: 0, tv: 0 };
  all.forEach((m) => { counts[m.mediaType === 'tv' ? 'tv' : 'movie']++; });
  const options = [['all', 'All', counts.all], ['movie', 'Movies', counts.movie], ['tv', 'TV Shows', counts.tv]];
  container.innerHTML = options.map(([id, label, count]) => `
    <button data-type="${id}" class="type-chip flex-shrink-0 text-xs font-bold px-3 py-2 rounded-lg border ${typeFilter === id ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-slate-800 border-slate-700 text-slate-400'}">${label} <span class="opacity-70">${count}</span></button>
  `).join('');
  container.querySelectorAll('[data-type]').forEach((btn) => {
    btn.onclick = () => { typeFilter = btn.dataset.type; refresh(screen); };
  });
}

function renderStatusFilters(screen) {
  const container = screen.querySelector('#status-filters');
  const all = getWatchlist();
  const watchedCount = all.filter((m) => m.watched).length;
  const options = [['all', 'All'], ['towatch', `To watch (${all.length - watchedCount})`], ['watched', `Watched (${watchedCount})`]];
  container.innerHTML = options.map(([id, label]) => `
    <button data-status="${id}" class="status-chip flex-shrink-0 text-xs font-bold px-3 py-2 rounded-lg border ${statusFilter === id ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-slate-800 border-slate-700 text-slate-400'}">${label}</button>
  `).join('');
  container.querySelectorAll('[data-status]').forEach((btn) => {
    btn.onclick = () => { statusFilter = btn.dataset.status; refresh(screen); };
  });
}

function renderTagFilters(screen) {
  const container = screen.querySelector('#tag-filters');
  const tags = [...new Set(getWatchlist().flatMap((m) => m.tags || []))].sort();
  if (!tags.length) { container.innerHTML = ''; return; }
  container.innerHTML = tags.map((tag) => `
    <button data-tag="${escapeHTML(tag)}" class="tag-filter-chip text-[11px] font-bold px-2.5 py-1 rounded-full border ${tagFilter === tag ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-slate-800/60 border-slate-700 text-slate-400'}"><i class="fa-solid fa-tag text-[9px] mr-1"></i>${escapeHTML(tag)}</button>
  `).join('');
  container.querySelectorAll('[data-tag]').forEach((btn) => {
    btn.onclick = () => { tagFilter = tagFilter === btn.dataset.tag ? null : btn.dataset.tag; refresh(screen); };
  });
}

function filteredMovies() {
  const q = searchQuery.trim().toLowerCase();
  return getWatchlist().filter((movie) => {
    const matchesType = typeFilter === 'all' || (movie.mediaType === 'tv' ? 'tv' : 'movie') === typeFilter;
    const matchesQuery = !q || (movie.title || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'watched' ? !!movie.watched : !movie.watched);
    const matchesTag = !tagFilter || (movie.tags || []).includes(tagFilter);
    return matchesType && matchesQuery && matchesStatus && matchesTag;
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
  statsEl.innerHTML = `<span class="font-bold text-slate-300">${shown}</span> title${shown === 1 ? '' : 's'}${shown !== total ? ` of ${total}` : ''} · avg rating <span class="font-bold text-slate-300">⭐ ${avg}</span>`;
}

function renderItems(screen) {
  const container = screen.querySelector('#watchlist-content');
  const movies = sortMovies(filteredMovies());
  renderStats(screen, movies);

  if (!getWatchlist().length) {
    container.innerHTML = '<div class="h-full flex flex-col items-center justify-center text-center text-slate-500 p-8"><i class="fa-solid fa-bookmark text-4xl mb-4"></i><p class="font-semibold">Your Watchlist is empty.</p><p class="text-sm mt-2">Like something in Solo or save a suggestion.</p></div>';
    return;
  }
  if (!movies.length) {
    container.innerHTML = '<div class="h-full flex flex-col items-center justify-center text-center text-slate-500 p-8"><i class="fa-solid fa-magnifying-glass text-4xl mb-4"></i><p class="font-semibold">No results.</p><p class="text-sm mt-2">Try changing your search or filter.</p></div>';
    return;
  }

  container.innerHTML = '';
  movies.forEach((movie) => {
    const tags = movie.tags || [];
    const isAddingTag = String(addingTagFor) === String(movie.id);
    const tagsHTML = `
      <div class="flex flex-wrap items-center gap-1.5 mt-2">
        ${tags.map((tag) => `<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300"><i class="fa-solid fa-tag text-[8px]"></i>${escapeHTML(tag)}<button data-remove-tag="${escapeHTML(tag)}" class="opacity-60 hover:opacity-100 hover:text-rose-400">×</button></span>`).join('')}
        ${isAddingTag
          ? '<input class="tag-input bg-slate-900 border border-primary/50 rounded-full px-2 py-0.5 text-[11px] text-white w-24" maxlength="16" placeholder="new tag">'
          : '<button class="add-tag-btn text-[10px] font-bold text-slate-500 border border-dashed border-slate-600 rounded-full px-2 py-0.5 hover:text-slate-300 hover:border-slate-400">+ tag</button>'}
      </div>
    `;

    const item = document.createElement('article');
    item.className = 'flex gap-3 p-3 mb-3 rounded-xl bg-slate-800 border border-slate-700 transition-colors';
    item.innerHTML = `
      <button class="open-details flex gap-3 text-left flex-1 min-w-0">
        <img src="${movie.poster_path}" class="w-16 h-24 object-cover rounded-lg flex-shrink-0 ${movie.watched ? 'opacity-50' : ''}">
        <div class="min-w-0">
          <h3 class="font-bold truncate ${movie.watched ? 'text-slate-400' : ''}">${escapeHTML(movie.title)}</h3>
          <div class="flex items-center gap-2 mt-1.5 flex-wrap">
            <span class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-700 text-slate-300"><i class="fa-solid ${movie.mediaType === 'tv' ? 'fa-tv' : 'fa-film'} text-[9px]"></i>${movie.mediaType === 'tv' ? 'TV Show' : 'Movie'}</span>
            <span class="text-xs text-slate-400">${movie.release_date?.substring(0, 4) || 'N/A'}</span>
            ${movie.watched ? '<span class="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600/20 text-emerald-400"><i class="fa-solid fa-check"></i>Watched</span>' : ''}
          </div>
          <p class="text-xs text-yellow-400 font-semibold mt-2">⭐ ${movie.vote_average}</p>
          ${tagsHTML}
        </div>
      </button>
      <div class="flex flex-col items-center gap-3 flex-shrink-0">
        <button class="toggle-watched text-slate-500 hover:text-emerald-400 px-2" title="${movie.watched ? 'Mark as to watch' : 'Mark as watched'}" aria-label="Toggle watched status"><i class="fa-solid ${movie.watched ? 'fa-rotate-left' : 'fa-eye'}"></i></button>
        <button class="remove text-slate-500 hover:text-rose-400 px-2" aria-label="Remove"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;

    item.querySelector('.open-details').onclick = () => openDetails(movie);
    item.querySelector('.toggle-watched').onclick = (e) => {
      e.stopPropagation();
      updateWatchlistItem(movie.id, { watched: !movie.watched });
      refresh(screen);
    };
    item.querySelector('.remove').onclick = (e) => {
      e.stopPropagation();
      removeFromWatchlist(movie.id);
      showToast('Removed from Watchlist');
      refresh(screen);
      setHeaderBadge(`${getWatchlist().length}`);
    };
    item.querySelectorAll('[data-remove-tag]').forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        updateWatchlistItem(movie.id, { tags: tags.filter((t) => t !== btn.dataset.removeTag) });
        refresh(screen);
      };
    });
    const addTagBtn = item.querySelector('.add-tag-btn');
    if (addTagBtn) {
      addTagBtn.onclick = (e) => { e.stopPropagation(); addingTagFor = movie.id; refresh(screen); };
    }
    wireTagInput(item, movie, tags, screen);

    container.appendChild(item);
  });
}

function wireTagInput(item, movie, tags, screen) {
  const input = item.querySelector('.tag-input');
  if (!input) return;
  input.addEventListener('click', (e) => e.stopPropagation());
  let done = false;
  const commit = () => {
    if (done) return; done = true;
    const value = input.value.trim();
    addingTagFor = null;
    if (value) {
      const nextTags = [...new Set([...tags, value])].slice(0, 8);
      updateWatchlistItem(movie.id, { tags: nextTags });
    }
    refresh(screen);
  };
  const cancel = () => { if (done) return; done = true; addingTagFor = null; refresh(screen); };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  });
  input.addEventListener('blur', () => commit());
  requestAnimationFrame(() => input.focus());
}

function surpriseMe(screen) {
  const pool = filteredMovies();
  if (!pool.length) { showToast('No titles to choose from'); return; }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  openDetails(pick);
  showToast(`Tonight you're watching: "${pick.title}"?`);
}

function renderNav(screen, onNavigate, active) { const nav = screen.querySelector('#mode-nav'); const items = [['solo', 'Solo', 'fa-user'], ['suggestion', 'Suggestion', 'fa-wand-magic-sparkles'], ['multiplayer', 'Multiplayer', 'fa-users'], ['watchlist', 'Watchlist', 'fa-bookmark']]; nav.innerHTML = items.map(([id, l, i]) => `<button data-mode="${id}" class="flex-1 flex flex-col items-center justify-center gap-1 ${active === id ? 'text-primary' : 'text-slate-500'}"><i class="fa-solid ${i}"></i><span class="text-[10px] font-bold">${l}</span></button>`).join(''); nav.querySelectorAll('[data-mode]').forEach((b) => b.onclick = () => onNavigate(b.dataset.mode === 'solo' ? 'filters' : b.dataset.mode)); }
function escapeHTML(v = '') { const d = document.createElement('div'); d.textContent = v; return d.innerHTML; }
