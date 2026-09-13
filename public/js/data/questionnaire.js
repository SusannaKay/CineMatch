export const TMDB_GENRES = {
  movie: [
    { id: 28, name: 'Action', emoji: '💥' }, { id: 12, name: 'Adventure', emoji: '🗺️' },
    { id: 16, name: 'Animation', emoji: '🎨' }, { id: 35, name: 'Comedy', emoji: '😂' },
    { id: 80, name: 'Crime', emoji: '🕵️' }, { id: 99, name: 'Documentary', emoji: '🌍' },
    { id: 18, name: 'Drama', emoji: '🎭' }, { id: 10751, name: 'Family', emoji: '👨‍👩‍👧‍👦' },
    { id: 14, name: 'Fantasy', emoji: '🧙' }, { id: 36, name: 'History', emoji: '📜' },
    { id: 27, name: 'Horror', emoji: '👻' }, { id: 10402, name: 'Music', emoji: '🎵' },
    { id: 9648, name: 'Mystery', emoji: '🔍' }, { id: 10749, name: 'Romance', emoji: '❤️' },
    { id: 878, name: 'Science Fiction', emoji: '👽' }, { id: 53, name: 'Thriller', emoji: '🔪' },
    { id: 10752, name: 'War', emoji: '🪖' }, { id: 37, name: 'Western', emoji: '🤠' },
  ],
  tv: [
    { id: 10759, name: 'Action & Adventure', emoji: '⚔️' }, { id: 16, name: 'Animation', emoji: '🎨' },
    { id: 35, name: 'Comedy', emoji: '😂' }, { id: 80, name: 'Crime', emoji: '🕵️' },
    { id: 99, name: 'Documentary', emoji: '🌍' }, { id: 18, name: 'Drama', emoji: '🎭' },
    { id: 10762, name: 'Kids', emoji: '🧸' }, { id: 9648, name: 'Mystery', emoji: '🔍' },
    { id: 10765, name: 'Sci-Fi & Fantasy', emoji: '🚀' }, { id: 10768, name: 'War & Politics', emoji: '⚖️' },
    { id: 37, name: 'Western', emoji: '🤠' },
  ],
};

function curatedGenres(type) {
  if (type === 'movie') {
    return [
      { label: 'Adrenaline & Action', icon: 'fa-fire', value: '28,12' },
      { label: 'Have a laugh', icon: 'fa-face-laugh-squint', value: '35' },
      { label: 'Tension & Mystery', icon: 'fa-user-secret', value: '53,27' },
      { label: 'Romance / Drama', icon: 'fa-heart', value: '10749,18' },
      { label: 'Sci-Fi & Fantasy', icon: 'fa-user-astronaut', value: '878,14' },
    ];
  }
  if (type === 'tv') {
    return [
      { label: 'Action & Adventure', icon: 'fa-fire', value: '10759' },
      { label: 'Comedy & Sitcom', icon: 'fa-face-laugh-squint', value: '35' },
      { label: 'Crime & Mystery', icon: 'fa-user-secret', value: '80,9648' },
      { label: 'Drama', icon: 'fa-masks-theater', value: '18' },
      { label: 'Sci-Fi & Fantasy', icon: 'fa-dragon', value: '10765' },
    ];
  }
  if (type === 'anime') {
    return [
      { label: 'Shōnen (Action/Adventure)', icon: 'fa-fire', value: '10759' },
      { label: 'Comedy / Slice of Life', icon: 'fa-face-laugh-squint', value: '35' },
      { label: 'Sci-Fi / Mecha / Fantasy', icon: 'fa-robot', value: '10765' },
      { label: 'Dark / Thriller', icon: 'fa-skull', value: '9648' },
      { label: 'Anything', icon: 'fa-infinity', value: '' },
    ];
  }
  return [
    { label: 'True Crime', icon: 'fa-handcuffs', value: '80' },
    { label: 'History', icon: 'fa-monument', value: '36' },
    { label: 'Nature & Exploration', icon: 'fa-leaf', value: '99' },
    { label: 'Anything', icon: 'fa-infinity', value: '' },
  ];
}

export function buildQuestionnaire(answers, showAllGenres) {
  const type = answers.type;
  const q = [
    {
      id: 'type',
      text: 'What do you want to watch tonight?',
      options: [
        { label: 'A good Movie', icon: 'fa-film', value: 'movie' },
        { label: 'A TV Show', icon: 'fa-tv', value: 'tv' },
        { label: 'An Anime', icon: 'fa-dragon', value: 'anime' },
        { label: 'A Documentary', icon: 'fa-earth-europe', value: 'documentary' },
      ],
    },
    {
      id: 'platforms',
      text: 'Which subscriptions do you have in common?',
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
      text: 'In what (original) language?',
      options: [
        { label: 'English (US/UK)', emoji: '🇬🇧', value: 'en' },
        { label: 'Italian', emoji: '🇮🇹', value: 'it' },
        { label: 'Any', emoji: '🌍', value: '' },
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
    text: answers.genreMode === 'exclude' ? "What do you NOT want to watch?" : 'What are you in the mood for?',
    multiSelect: true,
    isGenreStep: true,
    excludable,
    options: genreOptions,
  });

  q.push({
    id: 'era',
    text: 'What era are we talking about?',
    options: [
      { label: 'New releases', icon: 'fa-bolt', value: '2020-01-01|' },
      { label: 'Recent (2010 - 2019)', icon: 'fa-calendar-days', value: '2010-01-01|2019-12-31' },
      { label: '2000s', icon: 'fa-compact-disc', value: '2000-01-01|2009-12-31' },
      { label: 'Classics (< 1999)', icon: 'fa-film', value: '|1999-12-31' },
      { label: 'Any era', icon: 'fa-infinity', value: '' },
    ],
  });

  if (type === 'tv' || type === 'anime') {
    q.push({
      id: 'length',
      text: 'How long are the episodes?',
      options: [
        { label: 'Short (~20-30 min)', icon: 'fa-stopwatch', value: '|30' },
        { label: 'Standard (~45-60 min)', icon: 'fa-clock', value: '30|60' },
        { label: 'No limit', icon: 'fa-infinity', value: '' },
      ],
    });
  } else {
    q.push({
      id: 'length',
      text: 'How much time do you have?',
      options: [
        { label: 'Short (< 1h 40m)', icon: 'fa-stopwatch', value: '|100' },
        { label: 'Normal (1h 40m - 2h 20m)', icon: 'fa-clock', value: '100|140' },
        { label: 'Epic (> 2h 20m)', icon: 'fa-hourglass-end', value: '140|' },
        { label: 'No limit', icon: 'fa-infinity', value: '' },
      ],
    });
  }

  return q;
}
