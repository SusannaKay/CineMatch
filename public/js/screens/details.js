export function openDetails(movie) {
  const modal = document.getElementById('details-modal');
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
    <div class="flex gap-4 text-sm font-semibold text-slate-400 mb-6 border-b border-slate-700 pb-4">
      <span><i class="fa-solid fa-calendar mr-1"></i> ${movie.release_date?.substring(0, 4) || 'N/A'}</span>
      <span class="text-yellow-400"><i class="fa-solid fa-star mr-1"></i> ${movie.vote_average}/10</span>
    </div>
    <h3 class="font-bold text-slate-300 mb-2">Trama</h3>
    <p class="text-slate-400 leading-relaxed text-sm">${movie.overview}</p>
    ${providersHTML}
    ${trailerHTML}
  `;

  modal.classList.add('active');
}

document.getElementById('close-details').addEventListener('click', () => {
  document.getElementById('details-modal').classList.remove('active');
  const iframe = document.querySelector('#details-content iframe');
  if (iframe) iframe.src = iframe.src;
});
