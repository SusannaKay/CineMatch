export const TMDB_GENRES = {
  movie: [
    { id: 28, name: 'Azione', emoji: '💥' }, { id: 12, name: 'Avventura', emoji: '🗺️' },
    { id: 16, name: 'Animazione', emoji: '🎨' }, { id: 35, name: 'Commedia', emoji: '😂' },
    { id: 80, name: 'Crime', emoji: '🕵️' }, { id: 99, name: 'Documentario', emoji: '🌍' },
    { id: 18, name: 'Dramma', emoji: '🎭' }, { id: 10751, name: 'Famiglia', emoji: '👨‍👩‍👧‍👦' },
    { id: 14, name: 'Fantasy', emoji: '🧙' }, { id: 36, name: 'Storia', emoji: '📜' },
    { id: 27, name: 'Horror', emoji: '👻' }, { id: 10402, name: 'Musica', emoji: '🎵' },
    { id: 9648, name: 'Mistero', emoji: '🔍' }, { id: 10749, name: 'Romance', emoji: '❤️' },
    { id: 878, name: 'Fantascienza', emoji: '👽' }, { id: 53, name: 'Thriller', emoji: '🔪' },
    { id: 10752, name: 'Guerra', emoji: '🪖' }, { id: 37, name: 'Western', emoji: '🤠' },
  ],
  tv: [
    { id: 10759, name: 'Azione & Avventura', emoji: '⚔️' }, { id: 16, name: 'Animazione', emoji: '🎨' },
    { id: 35, name: 'Commedia', emoji: '😂' }, { id: 80, name: 'Crime', emoji: '🕵️' },
    { id: 99, name: 'Documentario', emoji: '🌍' }, { id: 18, name: 'Dramma', emoji: '🎭' },
    { id: 10762, name: 'Kids', emoji: '🧸' }, { id: 9648, name: 'Mistero', emoji: '🔍' },
    { id: 10765, name: 'Sci-Fi & Fantasy', emoji: '🚀' }, { id: 10768, name: 'Politica & Guerra', emoji: '⚖️' },
    { id: 37, name: 'Western', emoji: '🤠' },
  ],
};

function curatedGenres(type) {
  if (type === 'movie') {
    return [
      { label: 'Adrenalina & Azione', icon: 'fa-fire', value: '28,12' },
      { label: 'Fatti una risata', icon: 'fa-face-laugh-squint', value: '35' },
      { label: 'Tensione & Mistero', icon: 'fa-user-secret', value: '53,27' },
      { label: 'Sentimentale / Dramma', icon: 'fa-heart', value: '10749,18' },
      { label: 'Fantascienza & Fantasy', icon: 'fa-user-astronaut', value: '878,14' },
    ];
  }
  if (type === 'tv') {
    return [
      { label: 'Azione & Avventura', icon: 'fa-fire', value: '10759' },
      { label: 'Commedia & Sitcom', icon: 'fa-face-laugh-squint', value: '35' },
      { label: 'Crime & Mistero', icon: 'fa-user-secret', value: '80,9648' },
      { label: 'Drammatico', icon: 'fa-masks-theater', value: '18' },
      { label: 'Sci-Fi & Fantasy', icon: 'fa-dragon', value: '10765' },
    ];
  }
  if (type === 'anime') {
    return [
      { label: 'Shōnen (Azione/Avventura)', icon: 'fa-fire', value: '10759' },
      { label: 'Commedia / Slice of Life', icon: 'fa-face-laugh-squint', value: '35' },
      { label: 'Sci-Fi / Mecha / Fantasy', icon: 'fa-robot', value: '10765' },
      { label: 'Dark / Thriller', icon: 'fa-skull', value: '9648' },
      { label: 'Qualsiasi', icon: 'fa-infinity', value: '' },
    ];
  }
  return [
    { label: 'True Crime', icon: 'fa-handcuffs', value: '80' },
    { label: 'Storia', icon: 'fa-monument', value: '36' },
    { label: 'Natura & Esplorazione', icon: 'fa-leaf', value: '99' },
    { label: 'Qualsiasi', icon: 'fa-infinity', value: '' },
  ];
}

export function buildQuestionnaire(answers, showAllGenres) {
  const type = answers.type;
  const q = [
    {
      id: 'type',
      text: 'Cosa volete guardare stasera?',
      options: [
        { label: 'Un bel Film', icon: 'fa-film', value: 'movie' },
        { label: 'Una Serie TV', icon: 'fa-tv', value: 'tv' },
        { label: 'Un Anime', icon: 'fa-dragon', value: 'anime' },
        { label: 'Un Documentario', icon: 'fa-earth-europe', value: 'documentary' },
      ],
    },
    {
      id: 'platforms',
      text: 'Quali abbonamenti avete in comune?',
      multiSelect: true,
      options: [
        { label: 'Netflix', emoji: '🔴', value: '8' },
        { label: 'Prime Video', emoji: '📦', value: '119' },
        { label: 'Disney+', emoji: '✨', value: '337' },
        { label: 'NOW', emoji: '🟢', value: '39' },
        { label: 'Apple TV+', emoji: '🍎', value: '350' },
      ],
    },
    {
      id: 'language',
      text: 'In che lingua (originale)?',
      options: [
        { label: 'Italiano', emoji: '🇮🇹', value: 'it' },
        { label: 'Inglese (USA/UK)', emoji: '🇬🇧', value: 'en' },
        { label: 'Qualsiasi', emoji: '🌍', value: '' },
      ],
    },
  ];

  const excludable = type === 'movie' || type === 'tv';
  let genreOptions;
  if (excludable && showAllGenres) {
    genreOptions = TMDB_GENRES[type].map((g) => ({ label: g.name, emoji: g.emoji, value: String(g.id) }));
  } else {
    genreOptions = curatedGenres(type);
  }

  q.push({
    id: 'genre',
    text: answers.genreMode === 'exclude' ? 'Cosa NON volete guardare?' : 'Che emozione cercate?',
    multiSelect: true,
    isGenreStep: true,
    excludable,
    options: genreOptions,
  });

  q.push({
    id: 'era',
    text: 'Di che epoca parliamo?',
    options: [
      { label: 'Novità (Ultime uscite)', icon: 'fa-bolt', value: '2020-01-01|' },
      { label: 'Recenti (2010 - 2019)', icon: 'fa-calendar-days', value: '2010-01-01|2019-12-31' },
      { label: 'Anni 2000', icon: 'fa-compact-disc', value: '2000-01-01|2009-12-31' },
      { label: 'Grandi Classici (< 1999)', icon: 'fa-film', value: '|1999-12-31' },
      { label: 'Qualsiasi epoca', icon: 'fa-infinity', value: '' },
    ],
  });

  if (type === 'tv' || type === 'anime') {
    q.push({
      id: 'length',
      text: 'Quanto durano gli episodi?',
      options: [
        { label: 'Corti (~20-30 min)', icon: 'fa-stopwatch', value: '|30' },
        { label: 'Standard (~45-60 min)', icon: 'fa-clock', value: '30|60' },
        { label: 'Nessun limite', icon: 'fa-infinity', value: '' },
      ],
    });
  } else {
    q.push({
      id: 'length',
      text: 'Quanto tempo avete?',
      options: [
        { label: 'Breve (< 1h 40m)', icon: 'fa-stopwatch', value: '|100' },
        { label: 'Normale (1h 40m - 2h 20m)', icon: 'fa-clock', value: '100|140' },
        { label: 'Epico (> 2h 20m)', icon: 'fa-hourglass-end', value: '140|' },
        { label: 'Nessun limite', icon: 'fa-infinity', value: '' },
      ],
    });
  }

  return q;
}
