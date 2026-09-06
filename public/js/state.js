export const appState = {
  useMockData: true,
  mode: null,
  room: null,
  playerName: '',
  localVoteCast: false,
  lanAddresses: [],
  port: null,
  prefillRoomCode: '',
  filtersDraft: {
    type: '',
    platforms: [],
    language: '',
    genre: [],
    genreMode: 'include',
    era: '',
    length: '',
  },
  filterStep: 0,
  showAllGenres: false,
  tempSelections: [],
};

export function resetFiltersDraft() {
  appState.filtersDraft = {
    type: '',
    platforms: [],
    language: '',
    genre: [],
    genreMode: 'include',
    era: '',
    length: '',
  };
  appState.filterStep = 0;
  appState.showAllGenres = false;
}
