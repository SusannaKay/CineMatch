// Whitelist-based validation for watchlist items sent by clients.
// Unknown fields are dropped, strings are length-capped, arrays are size-capped:
// nothing arbitrary or oversized ever reaches the data file.

export const LIMITS = {
  maxItems: 2000,
  maxOpsPerRequest: 200,
  maxTags: 20,
  maxTagLength: 32,
};

const str = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

function url(v) {
  if (typeof v !== 'string' || v.length > 500) return null;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

function strList(v, maxItems, maxLen) {
  if (!Array.isArray(v)) return [];
  return v.map((s) => str(s, maxLen)).filter(Boolean).slice(0, maxItems);
}

export function sanitizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.map((t) => str(t, LIMITS.maxTagLength)).filter(Boolean))].slice(0, LIMITS.maxTags);
}

export function itemKey(item) {
  return `${item.mediaType}:${item.id}`;
}

/**
 * Returns a clean copy of a watchlist item (same shape the client already uses),
 * or null if the essentials (TMDB id, type, title) are missing or invalid.
 */
export function sanitizeItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = Number(raw.id);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const mediaType = raw.mediaType === 'tv' ? 'tv' : raw.mediaType === 'movie' || raw.mediaType == null ? 'movie' : null;
  if (!mediaType) return null;
  const title = str(raw.title, 300);
  if (!title) return null;

  const releaseDate = typeof raw.release_date === 'string' && /^\d{4}(-\d{2}(-\d{2})?)?$/.test(raw.release_date) ? raw.release_date : null;
  const vote = Number.parseFloat(raw.vote_average);
  const runtime = Number(raw.runtime);
  const trailerKey = typeof raw.trailerKey === 'string' && /^[\w-]{1,32}$/.test(raw.trailerKey) ? raw.trailerKey : null;
  const providers = Array.isArray(raw.providers)
    ? raw.providers.slice(0, 30).map((p) => ({ name: str(p?.name, 100), logo: url(p?.logo) })).filter((p) => p.name)
    : [];

  return {
    id,
    mediaType,
    title,
    overview: str(raw.overview, 3000),
    poster_path: url(raw.poster_path),
    backdrop_path: url(raw.backdrop_path),
    release_date: releaseDate,
    vote_average: Number.isFinite(vote) && vote >= 0 && vote <= 10 ? vote.toFixed(1) : 'N/A',
    imdbRating: str(raw.imdbRating, 16),
    rottenTomatoes: str(raw.rottenTomatoes, 16),
    metacritic: str(raw.metacritic, 16),
    genres: strList(raw.genres, 20, 50),
    runtime: Number.isInteger(runtime) && runtime > 0 && runtime < 10000 ? runtime : null,
    director: str(raw.director, 200),
    cast: strList(raw.cast, 10, 100),
    providers,
    trailerKey,
    tags: sanitizeTags(raw.tags),
    watched: raw.watched === true,
  };
}

/** Public, stable shape returned by GET /api/watchlist (contract v1, see README). */
export function toPublicItem(item) {
  const year = item.release_date ? Number(item.release_date.slice(0, 4)) : null;
  const rating = Number.parseFloat(item.vote_average);
  return {
    tmdbId: item.id,
    type: item.mediaType,
    title: item.title,
    year: Number.isInteger(year) ? year : null,
    posterUrl: item.poster_path,
    addedAt: new Date(item.addedAt).toISOString(),
    releaseDate: item.release_date,
    overview: item.overview,
    genres: item.genres,
    runtime: item.runtime,
    rating: Number.isFinite(rating) ? rating : null,
    director: item.director,
    backdropUrl: item.backdrop_path,
    watched: item.watched,
    tags: item.tags,
    tmdbUrl: `https://www.themoviedb.org/${item.mediaType}/${item.id}`,
  };
}

/** Internal shape sent to syncing clients: the client's own item format plus addedAt. */
export function toClientItem(item) {
  const { fieldTs, ...rest } = item;
  return rest;
}
