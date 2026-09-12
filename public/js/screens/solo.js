import { mountScreen, setHeaderBadge } from '../utils/dom.js';
import { appState } from '../state.js';
import { addToWatchlist, watchlistCount } from '../watchlist.js';
import { openDetails } from './details.js';
import { showToast } from '../socket.js';
import { isIgnored, addToIgnored } from '../utils/banlist.js';

let movies = [];
let index = 0;
let handlers = null;
let currentPage = 1;
let likesInBatch = 0;
let loadingNextBatch = false;

export function renderSolo(moviesList, onNavigate) {
  movies = (moviesList || []).filter((m) => !isIgnored(m.id));
  index = 0;
  currentPage = 1;
  likesInBatch = 0;
  loadingNextBatch = false;
  const screen = mountScreen('screen-solo', `
    <div class="flex-grow flex flex-col overflow-hidden">
      <div class="px-4 py-3 flex justify-between items-center border-b border-slate-800 flex-shrink-0">
        <span id="solo-progress" class="text-sm font-bold text-slate-400"></span>
        <button id="solo-watchlist" class="text-sm font-bold text-slate-400"><i class="fa-solid fa-bookmark mr-1"></i><span></span></button>
      </div>
      <div id="solo-card-container"></div>
      <div class="text-center pb-8 pt-2 px-6 flex-shrink-0">
        <div class="flex justify-between items-center bg-[#1e293b] border border-indigo-500/40 rounded-2xl w-full max-w-[300px] mx-auto px-2 py-1">
          <button id="solo-nope" class="flex flex-col items-center py-2 w-1/3 text-slate-400"><i class="fa-solid fa-xmark text-lg mb-1"></i><span class="text-xs">Nope</span></button>
          <button id="solo-details" class="flex flex-col items-center py-2 w-1/3 text-rose-500 border-x border-slate-700"><i class="fa-solid fa-info text-lg mb-1"></i><span class="text-xs">Dettagli</span></button>
          <button id="solo-like" class="flex flex-col items-center py-2 w-1/3 text-emerald-500"><i class="fa-solid fa-heart text-lg mb-1"></i><span class="text-xs">Mi piace</span></button>
        </div>
      </div>
      <nav id="mode-nav" class="mode-nav flex-shrink-0 h-16 border-t border-slate-800 bg-slate-900/95"></nav>
    </div>
  `);
  setHeaderBadge('Solo');
  renderNav(screen, onNavigate, 'solo');
  screen.querySelector('#solo-watchlist').onclick = () => onNavigate('watchlist');
  screen.querySelector('#solo-nope').onclick = () => vote(false, onNavigate);
  screen.querySelector('#solo-like').onclick = () => vote(true, onNavigate);
  screen.querySelector('#solo-details').onclick = () => { if (movies[index]) openDetails(movies[index]); };
  renderCard(screen, onNavigate);
}

function renderCard(screen, onNavigate) {
  const container = screen.querySelector('#solo-card-container');
  if (!container) return;
  const movie = movies[index];
  screen.querySelector('#solo-progress').textContent = movies.length ? `${index + 1} / ${movies.length}` : '0 titoli';
  screen.querySelector('#solo-watchlist span').textContent = watchlistCount();
  container.innerHTML = '';
  if (!movie) {
    container.innerHTML = loadingNextBatch
      ? '<div class="flex items-center justify-center h-full p-8 text-center text-slate-400">Nessun like in questa selezione.<br>Carico altri titoli...</div>'
      : '<div class="flex items-center justify-center h-full p-8 text-center text-slate-400">Non ci sono altri titoli.<br>Prova una nuova ricerca.</div>';
    return;
  }
  const card = document.createElement('div'); card.className = 'movie-card shadow-2xl'; card.style.backgroundImage = `url('${movie.poster_path}')`;
  card.innerHTML = `<div class="badge badge-like">SÌ</div><div class="badge badge-nope">NO</div><button class="btn-ignore absolute top-3 right-3 z-[110] w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-rose-400 active:scale-90 transition-all" title="Non mostrare più questo titolo"><i class="fa-solid fa-eye-slash"></i></button><div class="card-overlay"><h2 class="text-3xl font-extrabold leading-tight">${escapeHTML(movie.title)}</h2><div class="flex items-center text-sm font-semibold gap-3 text-slate-300 mt-2"><span>📅 ${movie.release_date?.substring(0,4)||'N/A'}</span><span>⭐ ${movie.vote_average}</span></div></div>`;
  container.appendChild(card);
  setupSwipe(card, movie, screen, onNavigate);
  wireIgnoreButton(card, movie, screen, onNavigate);
}

function wireIgnoreButton(card, movie, screen, onNavigate) {
  const btn = card.querySelector('.btn-ignore');
  ['touchstart', 'touchmove', 'touchend'].forEach((evt) => btn.addEventListener(evt, (e) => e.stopPropagation()));
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    addToIgnored(movie.id);
    showToast(`"${movie.title}" non ti verrà più proposto`);
    vote(false, onNavigate);
  });
}

async function loadNextBatch(onNavigate) {
  loadingNextBatch = true;
  const screen = document.getElementById('screen-solo');
  renderCard(screen, onNavigate);
  try {
    currentPage++;
    const r = await fetch('/api/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...appState.filtersDraft, page: currentPage })
    });
    if (!r.ok) throw new Error();
    const nextMovies = (await r.json()).filter((m) => !isIgnored(m.id));
    if (!nextMovies.length) throw new Error('empty');
    movies = nextMovies;
    index = 0;
    likesInBatch = 0;
  } catch (err) {
    showToast(err.message === 'empty' ? 'Non ci sono altri titoli con questi filtri.' : 'Errore nel caricamento di altri titoli.');
    onNavigate('filters');
  } finally {
    loadingNextBatch = false;
  }
  const currentScreen = document.getElementById('screen-solo');
  if (currentScreen) renderCard(currentScreen, onNavigate);
}

function vote(like, onNavigate) {
  const movie = movies[index]; if (!movie || loadingNextBatch) return;
  if (like) {
    likesInBatch++;
    addToWatchlist(movie);
    showToast('Salvato nella Watchlist');
  }
  index++;
  if (index >= movies.length) {
    if (likesInBatch === 0) {
      loadNextBatch(onNavigate);
      return;
    }
    showToast('Hai finito questa selezione');
    onNavigate('watchlist');
    return;
  }
  renderCard(document.getElementById('screen-solo'), onNavigate);
}

function setupSwipe(card, movie, screen, onNavigate) {
  if (handlers) handlers();
  let sx=0, sy=0, cx=0, cy=0, dragging=false;
  const end=()=>{ if(!dragging)return; dragging=false; card.style.transition='transform .3s ease, opacity .3s ease'; if(cy < -100 && Math.abs(cx)<100){ card.style.transform='translate(0,0)'; openDetails(movie); } else if(cx>100) vote(true, onNavigate); else if(cx<-100) vote(false, onNavigate); else card.style.transform='translate(0,0)'; cx=cy=0; };
  const start=e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY;dragging=true;card.style.transition='none';};
  const move=e=>{if(!dragging)return;cx=e.touches[0].clientX-sx;cy=e.touches[0].clientY-sy;card.style.transform=`translate(${cx}px,${cy}px) rotate(${cx*.05}deg)`;};
  card.addEventListener('touchstart',start); card.addEventListener('touchmove',move); card.addEventListener('touchend',end);
  handlers=()=>{card.removeEventListener('touchstart',start);card.removeEventListener('touchmove',move);card.removeEventListener('touchend',end);};
}

function renderNav(screen,onNavigate,active){const nav=screen.querySelector('#mode-nav');const items=[['solo','Solo','fa-user'],['suggestion','Suggestion','fa-wand-magic-sparkles'],['multiplayer','Multiplayer','fa-users'],['watchlist','Watchlist','fa-bookmark']];nav.innerHTML=items.map(([id,l,i])=>`<button data-mode="${id}" class="flex-1 flex flex-col items-center justify-center gap-1 ${active===id?'text-primary':'text-slate-500'}"><i class="fa-solid ${i}"></i><span class="text-[10px] font-bold">${l}</span></button>`).join('');nav.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>onNavigate(b.dataset.mode==='solo'?'filters':b.dataset.mode));}
function escapeHTML(v=''){const d=document.createElement('div');d.textContent=v;return d.innerHTML;}
