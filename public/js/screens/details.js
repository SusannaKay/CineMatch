function ratingBadgesHTML(movie) {
  const badges = [
    `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-yellow-400 text-xs font-bold"><i class="fa-solid fa-star"></i> TMDB ${movie.vote_average}</span>`,
  ];

  if (movie.imdbRating) {
    badges.push(`<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#f5c518] text-black text-xs font-extrabold"><i class="fa-brands fa-imdb text-sm"></i> ${movie.imdbRating}</span>`);
  }

  if (movie.rottenTomatoes) {
    const pct = parseInt(movie.rottenTomatoes, 10);
    const fresh = !Number.isNaN(pct) && pct >= 60;
    badges.push(`<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md ${fresh ? 'bg-red-600 text-white' : 'bg-green-800 text-green-100'} text-xs font-extrabold">${fresh ? '🍅' : '🤢'} ${movie.rottenTomatoes}</span>`);
  }

  if (movie.metacritic) {
    const score = parseInt(movie.metacritic, 10);
    const color = Number.isNaN(score) ? 'bg-slate-600' : score >= 61 ? 'bg-emerald-600' : score >= 40 ? 'bg-yellow-500' : 'bg-red-600';
    badges.push(`<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md ${color} text-white text-xs font-extrabold"><span class="border border-white/60 rounded-sm px-1 leading-none">M</span> ${Number.isNaN(score) ? movie.metacritic : score}</span>`);
  }

  return badges.join('');
}

export function openDetails(movie) {
  const modal = document.getElementById('details-modal');
  modal.style.transition = '';
  modal.style.transform = '';
  const backdrop = document.getElementById('modal-backdrop');
  backdrop.style.backgroundImage = `url('${movie.backdrop_path || movie.poster_path}')`;

  let providersHTML = '';
  if (movie.providers?.length) {
    providersHTML = `
      <h3 class="font-bold text-slate-300 mb-3 mt-6">Disponibile su:</h3>
      <div class="flex flex-wrap gap-3">
        ${movie.providers.map((p) => `
          <div class="flex items-center bg-slate-800 rounded-lg p-2 border border-slate-700">
            <img src="${p.logo}" alt="${p.name}" class="w-8 h-8 rounded-md mr-2 object-cover">
            <span class="text-xs font-semibold text-slate-300">${p.name}</span>
          </div>
        `).join('')}
      </div>`;
  }

  let trailerHTML = '';
  if (movie.trailerKey) {
    trailerHTML = `
      <div class="mt-6">
        <h3 class="font-bold text-slate-300 mb-3"><i class="fa-brands fa-youtube text-red-500 mr-2"></i>Trailer</h3>
        <div class="relative w-full overflow-hidden rounded-xl bg-black" style="padding-top:56.25%">
          <iframe class="absolute inset-0 w-full h-full border-0"
            src="https://www.youtube.com/embed/${movie.trailerKey}" allowfullscreen></iframe>
        </div>
      </div>`;
  }

  document.getElementById('details-content').innerHTML = `
    <h2 class="text-3xl font-extrabold mb-4 leading-tight">${movie.title}</h2>
    <div class="flex items-center gap-2 text-sm font-semibold text-slate-400 mb-4">
      <span><i class="fa-solid fa-calendar mr-1"></i> ${movie.release_date?.substring(0, 4) || 'N/A'}</span>
    </div>
    <div class="flex flex-wrap gap-2 mb-6 border-b border-slate-700 pb-4">
      ${ratingBadgesHTML(movie)}
    </div>
    <h3 class="font-bold text-slate-300 mb-2">Trama</h3>
    <p class="text-slate-400 leading-relaxed text-sm">${movie.overview}</p>
    ${providersHTML}
    ${trailerHTML}
  `;

  modal.classList.add('active');
}

function closeDetails() {
  const modal = document.getElementById('details-modal');
  modal.style.transition = '';
  modal.style.transform = '';
  modal.classList.remove('active');
  const iframe = document.querySelector('#details-content iframe');
  if (iframe) iframe.src = iframe.src;
}

document.getElementById('close-details').addEventListener('click', closeDetails);

(function setupSwipeToClose() {
  const modal = document.getElementById('details-modal');
  const content = document.getElementById('details-content');
  const CLOSE_THRESHOLD = 120;
  let startY = 0;
  let dragY = 0;
  let dragging = false;

  modal.addEventListener('touchstart', (e) => {
    if (content.contains(e.target) && content.scrollTop > 0) return;
    startY = e.touches[0].clientY;
    dragging = true;
    modal.style.transition = 'none';
  });

  modal.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    dragY = Math.max(0, e.touches[0].clientY - startY);
    modal.style.transform = `translateY(${dragY}px)`;
  });

  modal.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    modal.style.transition = 'transform 0.3s cubic-bezier(.175,.885,.32,1.275)';
    if (dragY > CLOSE_THRESHOLD) closeDetails();
    else modal.style.transform = '';
    dragY = 0;
  });
})();
