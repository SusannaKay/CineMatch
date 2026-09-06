import { mountScreen, setHeaderBadge } from '../utils/dom.js';
import { getWatchlist, removeFromWatchlist } from '../watchlist.js';
import { openDetails } from './details.js';
import { showToast } from '../socket.js';

export function renderWatchlist(onNavigate) {
  const screen = mountScreen('screen-watchlist', `
    <div class="flex-grow flex flex-col overflow-hidden">
      <div class="p-6 pb-3"><h2 class="text-2xl font-extrabold">La tua Watchlist</h2><p class="text-sm text-slate-400 mt-1">I titoli che hai salvato.</p></div>
      <div id="watchlist-content" class="px-6 overflow-y-auto flex-grow pb-4"></div>
      <nav id="mode-nav" class="flex-shrink-0 h-16 border-t border-slate-800 bg-slate-900/95"></nav>
    </div>
  `);
  setHeaderBadge(`${getWatchlist().length}`);
  renderNav(screen,onNavigate,'watchlist');
  renderItems(screen.querySelector('#watchlist-content'));
}

function renderItems(container){const movies=getWatchlist();if(!movies.length){container.innerHTML='<div class="h-full flex flex-col items-center justify-center text-center text-slate-500 p-8"><i class="fa-solid fa-bookmark text-4xl mb-4"></i><p class="font-semibold">La Watchlist è vuota.</p><p class="text-sm mt-2">Metti Mi piace in Solo o salva un suggerimento.</p></div>';return;}container.innerHTML='';movies.forEach(movie=>{const item=document.createElement('article');item.className='flex gap-3 p-3 mb-3 rounded-xl bg-slate-800 border border-slate-700';item.innerHTML=`<button class="flex gap-3 text-left flex-1 min-w-0"><img src="${movie.poster_path}" class="w-16 h-24 object-cover rounded-lg"><div class="min-w-0"><h3 class="font-bold truncate">${escapeHTML(movie.title)}</h3><p class="text-xs text-slate-400 mt-1">${movie.release_date?.substring(0,4)||'N/A'} · ⭐ ${movie.vote_average}</p><p class="text-xs text-slate-500 mt-3">Apri dettagli</p></div></button><button class="remove text-slate-500 hover:text-rose-400 px-2" aria-label="Rimuovi"><i class="fa-solid fa-trash"></i></button>`;item.querySelector('.flex-1').onclick=()=>openDetails(movie);item.querySelector('.remove').onclick=()=>{removeFromWatchlist(movie.id);showToast('Rimosso dalla Watchlist');renderItems(container);setHeaderBadge(`${getWatchlist().length}`);};container.appendChild(item);});}
function renderNav(screen,onNavigate,active){const nav=screen.querySelector('#mode-nav');const items=[['solo','Solo','fa-user'],['suggestion','Suggestion','fa-wand-magic-sparkles'],['multiplayer','Multiplayer','fa-users'],['watchlist','Watchlist','fa-bookmark']];nav.innerHTML=items.map(([id,l,i])=>`<button data-mode="${id}" class="flex-1 flex flex-col items-center justify-center gap-1 ${active===id?'text-primary':'text-slate-500'}"><i class="fa-solid ${i}"></i><span class="text-[10px] font-bold">${l}</span></button>`).join('');nav.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>onNavigate(b.dataset.mode==='solo'?'filters':b.dataset.mode));}
function escapeHTML(v=''){const d=document.createElement('div');d.textContent=v;return d.innerHTML;}
