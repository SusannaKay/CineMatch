const STORAGE_KEY = 'cinematch_watchlist';

function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let movies = load();

export function getWatchlist() {
  return [...movies];
}

export function hasInWatchlist(id) {
  return movies.some((movie) => String(movie.id) === String(id));
}

export function addToWatchlist(movie) {
  if (!movie || movie.id == null || hasInWatchlist(movie.id)) return false;
  movies.push(movie);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
  return true;
}

export function removeFromWatchlist(id) {
  const before = movies.length;
  movies = movies.filter((movie) => String(movie.id) !== String(id));
  if (movies.length !== before) localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
  return movies.length !== before;
}

export function watchlistCount() {
  return movies.length;
}
