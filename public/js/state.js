import { DEFAULT_REGION } from './data/regions.js';

const REGION_KEY = 'cinematch_region';

export const appState = {
  useMockData: true,
  mode: null,
  room: null,
  playerName: '',
  localVoteCast: false,
  lanAddresses: [],
  port: null,
  prefillRoomCode: '',
  soloMovies: [],
  region: localStorage.getItem(REGION_KEY) || DEFAULT_REGION,
  filtersDraft: { type: '', platforms: [], language: '', genre: [], genreMode: 'include', era: '', length: '' },
  filterStep: 0,
  showAllGenres: false,
  tempSelections: [],
};

export function setRegion(code) {
  appState.region = code;
  localStorage.setItem(REGION_KEY, code);
}

export function resetFiltersDraft() {
  appState.filtersDraft = { type: '', platforms: [], language: '', genre: [], genreMode: 'include', era: '', length: '' };
  appState.filterStep = 0;
  appState.showAllGenres = false;
}
