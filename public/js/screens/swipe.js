import { mountScreen, setHeaderBadge } from '../utils/dom.js';
import { castVote, showToast } from '../socket.js';
import { openDetails } from './details.js';
import { isIgnored, addToIgnored } from '../utils/banlist.js';

let swipeHandlers = null;

export function renderSwipe(room) {
  const movie = room.currentMovie;

  // Titolo nella banlist personale: voto automaticamente "nope" senza mostrarlo
  if (movie && !room.hasVoted && isIgnored(movie.id)) {
    castVote('nope');
    mountScreen('screen-swipe-skip', `
      <div class="flex-grow flex flex-col justify-center items-center p-6 text-center text-slate-500">
        <i class="fa-solid fa-eye-slash text-3xl mb-3"></i>
        <p class="text-sm">Titolo escluso automaticamente…</p>
      </div>
    `);
    setHeaderBadge(`Stanza ${room.id}`);
    return;
  }

  const { voted, total } = room.voteStatus;
  const progress = room.deckLength ? `${room.currentIndex + 1} / ${room.deckLength}` : '';

  mountScreen('screen-swipe', `
    <div class="flex-grow flex flex-col overflow-hidden">
      <div class="px-4 py-3 flex justify-between items-center flex-shrink-0 border-b border-slate-800">
        <span class="text-sm font-bold text-slate-400">${progress}</span>
        <div class="vote-progress" id="vote-dots"></div>
      </div>

      <div id="cards-container"></div>

      <div id="waiting-bar" class="hidden text-center py-3 text-sm text-slate-400 border-t border-slate-800">
        <i class="fa-solid fa-hourglass-half mr-1"></i> In attesa degli altri… (${voted}/${total})
      </div>

      <div id="action-bar" class="text-center pb-8 pt-2 px-6 flex-shrink-0">
        <div class="flex justify-between items-center bg-[#1e293b] border border-indigo-500/40 rounded-2xl w-full max-w-[300px] mx-auto px-2 py-1">
          <button id="btn-nope" class="flex flex-col items-center py-2 w-1/3 text-slate-400 hover:text-white active:scale-90 transition-all">
            <i class="fa-solid fa-xmark text-lg mb-1"></i><span class="text-xs font-medium">Nope</span>
          </button>
          <button id="btn-details" class="flex flex-col items-center py-2 w-1/3 text-rose-500 hover:text-rose-400 active:scale-90 transition-all relative">
            <div class="absolute left-0 top-1/4 h-1/2 w-px bg-slate-700"></div>
            <div class="absolute right-0 top-1/4 h-1/2 w-px bg-slate-700"></div>
            <i class="fa-solid fa-info text-lg mb-1"></i><span class="text-xs font-medium">Dettagli</span>
          </button>
          <button id="btn-like" class="flex flex-col items-center py-2 w-1/3 text-emerald-500 hover:text-emerald-400 active:scale-90 transition-all">
            <i class="fa-solid fa-heart text-lg mb-1"></i><span class="text-xs font-medium">Mi piace</span>
          </button>
        </div>
      </div>
    </div>
  `);

  setHeaderBadge(`Stanza ${room.id}`);

  const dotsEl = document.getElementById('vote-dots');
  dotsEl.innerHTML = Array.from({ length: total }, (_, i) =>
    `<span class="vote-dot ${i < voted ? 'done' : ''}"></span>`
  ).join('');

  if (room.hasVoted) {
    document.getElementById('action-bar').classList.add('hidden');
    document.getElementById('waiting-bar').classList.remove('hidden');
  }

  if (movie && !room.hasVoted) {
    renderCard(movie);
  } else if (movie && room.hasVoted) {
    renderCardStatic(movie);
  }

  document.getElementById('btn-like').onclick = () => submitVote('like');
  document.getElementById('btn-nope').onclick = () => submitVote('nope');
  document.getElementById('btn-details').onclick = () => {
    if (movie) openDetails(movie);
  };
}

function renderCard(movie) {
  const container = document.getElementById('cards-container');
  container.innerHTML = '';
  const card = buildCardEl(movie, true);
  container.appendChild(card);
  setupSwipe(card, movie);
  wireIgnoreButton(card, movie);
}

function renderCardStatic(movie) {
  const container = document.getElementById('cards-container');
  container.innerHTML = '';
  container.appendChild(buildCardEl(movie, false));
}

function buildCardEl(movie, interactive) {
  const card = document.createElement('div');
  card.className = 'movie-card shadow-2xl';
  card.style.backgroundImage = `url('${movie.poster_path}')`;
  card.innerHTML = `
    <div class="badge badge-like border-emerald-500 text-emerald-500">SÌ</div>
    <div class="badge badge-nope border-rose-500 text-rose-500">NO</div>
    ${interactive ? `
      <button class="btn-ignore absolute top-3 right-3 z-[110] w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-rose-400 active:scale-90 transition-all" title="Non mostrare più questo titolo">
        <i class="fa-solid fa-eye-slash"></i>
      </button>
    ` : ''}
    <div class="card-overlay">
      <h2 class="text-3xl font-extrabold leading-tight shadow-black drop-shadow-md">${movie.title}</h2>
      <div class="flex items-center text-sm font-semibold gap-3 text-slate-300 drop-shadow-md mt-2">
        <span><i class="fa-solid fa-calendar mr-1"></i> ${movie.release_date?.substring(0, 4) || 'N/A'}</span>
        <span><i class="fa-solid fa-star text-yellow-400 mr-1"></i> ${movie.vote_average}</span>
      </div>
    </div>
  `;
  return card;
}

function wireIgnoreButton(card, movie) {
  const btn = card.querySelector('.btn-ignore');
  if (!btn) return;

  // Evita che il tap sul pulsante venga interpretato come inizio di uno swipe
  ['touchstart', 'touchmove', 'touchend'].forEach((evt) => {
    btn.addEventListener(evt, (e) => e.stopPropagation());
  });

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    addToIgnored(movie.id);
    showToast(`"${movie.title}" non ti verrà più proposto`);
    submitVote('nope');
  });
}

function submitVote(vote) {
  castVote(vote);
  const card = document.querySelector('.movie-card');
  if (card) {
    card.style.transition = 'transform 0.35s ease, opacity 0.35s ease';
    card.style.transform = vote === 'like' ? 'translate(100vw, -30px) rotate(15deg)' : 'translate(-100vw, -30px) rotate(-15deg)';
    card.style.opacity = '0';
  }
  setTimeout(() => {
    document.getElementById('action-bar')?.classList.add('hidden');
    document.getElementById('waiting-bar')?.classList.remove('hidden');
  }, 350);
}

function setupSwipe(card, movie) {
  if (swipeHandlers) swipeHandlers.cleanup();
  let startX = 0, startY = 0, currentX = 0, currentY = 0, dragging = false;
  const threshold = 100;
  const likeBadge = card.querySelector('.badge-like');
  const nopeBadge = card.querySelector('.badge-nope');

  const onStart = (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    dragging = true;
    card.style.transition = 'none';
  };

  const onMove = (e) => {
    if (!dragging) return;
    currentX = e.touches[0].clientX - startX;
    currentY = e.touches[0].clientY - startY;
    const rotate = currentX * 0.05;
    if (currentY < -50 && Math.abs(currentX) < 50) {
      card.style.transform = `translateY(${currentY}px)`;
    } else {
      card.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rotate}deg)`;
    }
    if (currentX > 20) { likeBadge.style.opacity = Math.min(currentX / 100, 1); nopeBadge.style.opacity = 0; }
    else if (currentX < -20) { nopeBadge.style.opacity = Math.min(Math.abs(currentX) / 100, 1); likeBadge.style.opacity = 0; }
  };

  const onEnd = () => {
    if (!dragging) return;
    dragging = false;
    card.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    likeBadge.style.opacity = 0;
    nopeBadge.style.opacity = 0;

    if (currentY < -threshold && Math.abs(currentX) < threshold) {
      card.style.transform = 'translate(0,0) rotate(0)';
      openDetails(movie);
      currentX = 0; currentY = 0;
      return;
    }
    if (currentX > threshold) submitVote('like');
    else if (currentX < -threshold) submitVote('nope');
    else card.style.transform = 'translate(0,0) rotate(0)';
    currentX = 0; currentY = 0;
  };

  card.addEventListener('touchstart', onStart);
  card.addEventListener('touchmove', onMove);
  card.addEventListener('touchend', onEnd);

  swipeHandlers = {
    cleanup: () => {
      card.removeEventListener('touchstart', onStart);
      card.removeEventListener('touchmove', onMove);
      card.removeEventListener('touchend', onEnd);
    },
  };
}
