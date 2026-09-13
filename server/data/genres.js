// TMDB genre ids are stable and shared across the API, so this can be a static
// lookup instead of an extra request. Movie and TV lists overlap on shared ids
// (Animation, Comedy, Crime, Documentary, Drama, Family, Mystery, Western...);
// the rest are namespaced per media type.
export const GENRE_NAMES = {
  28: 'Azione',
  12: 'Avventura',
  16: 'Animazione',
  35: 'Commedia',
  80: 'Crime',
  99: 'Documentario',
  18: 'Drammatico',
  10751: 'Famiglia',
  14: 'Fantasy',
  36: 'Storico',
  27: 'Horror',
  10402: 'Musica',
  9648: 'Mistero',
  10749: 'Romantico',
  878: 'Fantascienza',
  10770: 'Film TV',
  53: 'Thriller',
  10752: 'Guerra',
  37: 'Western',
  10759: 'Azione e Avventura',
  10762: 'Bambini',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi e Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'Guerra e Politica',
};

export function genreNamesFromIds(ids = []) {
  return ids.map((id) => GENRE_NAMES[id]).filter(Boolean);
}
