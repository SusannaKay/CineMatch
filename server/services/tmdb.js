import { config } from '../config.js';
import { mockMovies } from '../data/mockMovies.js';

const TMDB_BASE = 'https://api.themoviedb.org/3';

async function tmdbFetch(path) {
  const sep = path.includes('?') ? '&' : '?';
  const url = `${TMDB_BASE}${path}${sep}api_key=${config.tmdbApiKey}&language=it-IT`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

async function enrichMovie(m, endpoint) {
  let providers = [];
  let trailerKey = null;
  let backdrop_path = m.backdrop_path ? `https://image.tmdb.org/t/p/w780${m.backdrop_path}` : null;

  try {
    const d = await tmdbFetch(`/${endpoint}/${m.id}?append_to_response=watch/providers,videos`);
    const itProviders = d['watch/providers']?.results?.IT?.flatrate || [];
    providers = itProviders.map((p) => ({
      name: p.provider_name,
      logo: `https://image.tmdb.org/t/p/w92${p.logo_path}`,
    }));
    const trailer = (d.videos?.results || []).find((v) => v.site === 'YouTube' && v.type === 'Trailer');
    if (trailer) trailerKey = trailer.key;
    if (d.backdrop_path) backdrop_path = `https://image.tmdb.org/t/p/w780${d.backdrop_path}`;
  } catch {
    /* enrichment opzionale */
  }

  return {
    id: m.id,
    title: m.title || m.name,
    overview: m.overview || 'Trama non disponibile.',
    poster_path: m.poster_path
      ? `https://image.tmdb.org/t/p/w600_and_h900_bestv2${m.poster_path}`
      : 'https://placehold.co/600x900/1e293b/ffffff?text=No+Poster',
    backdrop_path,
    release_date: m.release_date || m.first_air_date || null,
    vote_average: m.vote_average ? m.vote_average.toFixed(1) : 'N/A',
    providers,
    trailerKey,
  };
}

function buildDiscoverUrl(filters, page) {
  const type = filters.type || 'movie';
  const endpoint = type === 'tv' || type === 'anime' ? 'tv' : 'movie';
  let url = `/discover/${endpoint}?sort_by=popularity.desc&include_adult=false&include_video=false&page=${page}&watch_region=IT&with_watch_monetization_types=flatrate`;

  if (filters.platforms?.length) url += `&with_watch_providers=${filters.platforms.join('|')}`;
  if (filters.language) url += `&with_original_language=${filters.language}`;

  let finalGenres = [];
  if (type === 'anime') finalGenres.push('16');
  if (type === 'documentary') finalGenres.push('99');
  if (filters.genre?.length) finalGenres.push(filters.genre.join(','));
  if (finalGenres.length) {
    const joined = finalGenres.join(',');
    url += filters.genreMode === 'exclude' ? `&without_genres=${joined}` : `&with_genres=${joined}`;
  }

  if (filters.era) {
    const dateField = endpoint === 'tv' ? 'first_air_date' : 'primary_release_date';
    const [gte, lte] = filters.era.split('|');
    if (gte) url += `&${dateField}.gte=${gte}`;
    if (lte) url += `&${dateField}.lte=${lte}`;
  }

  if (filters.length) {
    const [gte, lte] = filters.length.split('|');
    if (gte) url += `&with_runtime.gte=${gte}`;
    if (lte) url += `&with_runtime.lte=${lte}`;
  }

  return { url, endpoint };
}

export async function buildDeck(filters, size = config.deckSize) {
  if (config.useMockData) {
    await new Promise((r) => setTimeout(r, 400));
    const copies = [];
    while (copies.length < size) {
      copies.push(...mockMovies.map((m, i) => ({ ...m, id: m.id + copies.length * 100 + i })));
    }
    return copies.slice(0, size);
  }

  const movies = [];
  let page = 1;
  const { url: basePath, endpoint } = buildDiscoverUrl(filters, page);

  while (movies.length < size && page <= 5) {
    const path = basePath.replace(/page=\d+/, `page=${page}`);
    const data = await tmdbFetch(path);
    const valid = (data.results || []).filter((m) => m.poster_path);
    const enriched = await Promise.all(valid.map((m) => enrichMovie(m, endpoint)));
    movies.push(...enriched);
    page++;
  }

  return movies.slice(0, size);
}

export async function searchMulti(query) {
  if (config.useMockData) {
    return mockMovies.slice(0, 4).map((m) => ({
      id: m.id,
      title: m.title,
      year: m.release_date?.substring(0, 4) || '',
      mediaType: 'movie',
      poster_path: m.poster_path,
    }));
  }

  const data = await tmdbFetch(`/search/multi?query=${encodeURIComponent(query)}`);
  return (data.results || [])
    .filter((i) => i.media_type === 'movie' || i.media_type === 'tv')
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      title: item.title || item.name,
      year: (item.release_date || item.first_air_date || '').substring(0, 4),
      mediaType: item.media_type,
      poster_path: item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : null,
    }));
}

export async function getRecommendations(id, mediaType) {
  const endpoint = mediaType === 'tv' ? 'tv' : 'movie';

  if (config.useMockData) {
    return mockMovies
      .filter((movie) => String(movie.id) !== String(id))
      .slice(0, 6);
  }

  const data = await tmdbFetch(`/${endpoint}/${id}/recommendations?page=1`);
  const valid = (data.results || []).filter((movie) => movie.poster_path).slice(0, 12);
  return Promise.all(valid.map((movie) => enrichMovie(movie, endpoint)));
}

export { config as tmdbConfig };
