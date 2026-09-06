import { fetchConfig, getSocket, onRoomState } from './socket.js';
import { appState, resetFiltersDraft } from './state.js';
import { renderWelcome, renderJoin } from './screens/welcome.js';
import { renderLobby, renderLoading } from './screens/lobby.js';
import { renderFilters } from './screens/filters.js';
import { renderSwipe } from './screens/swipe.js';
import { renderResults } from './screens/results.js';
import { renderSolo } from './screens/solo.js';
import { renderSuggestion } from './screens/suggestion.js';
import { renderWatchlist } from './screens/watchlist.js';
import './screens/details.js';

let currentScreen = 'welcome';

function navigate(screen) {
  if (screen === 'multiplayer') {
    appState.mode = 'multiplayer';
    currentScreen = 'welcome';
  } else if (screen === 'solo' || screen === 'filters') {
    appState.mode = 'solo';
    if (screen === 'filters') resetFiltersDraft();
    currentScreen = screen;
  } else if (screen === 'suggestion') {
    appState.mode = 'suggestion';
    currentScreen = screen;
  } else if (screen === 'watchlist') {
    appState.mode = 'watchlist';
    currentScreen = screen;
  } else {
    currentScreen = screen;
  }
  render();
}

function render() {
  const room = appState.room;
  if (currentScreen === 'welcome') return renderWelcome(navigate);
  if (currentScreen === 'join') return renderJoin(navigate);
  if (currentScreen === 'filters') return renderFilters(navigate);
  if (currentScreen === 'solo') return renderSolo(appState.soloMovies, navigate);
  if (currentScreen === 'suggestion') return renderSuggestion(navigate);
  if (currentScreen === 'watchlist') return renderWatchlist(navigate);

  if (!room) {
    currentScreen = 'welcome';
    return renderWelcome(navigate);
  }

  switch (room.status) {
    case 'lobby':
      currentScreen = 'lobby';
      renderLobby(room, navigate);
      break;
    case 'loading':
      renderLoading(room);
      break;
    case 'swiping':
      renderSwipe(room);
      break;
    case 'results':
      currentScreen = 'results';
      renderResults(room, navigate);
      break;
    default:
      renderLobby(room, navigate);
  }
}

async function init() {
  await fetchConfig();
  getSocket();
  onRoomState((room) => {
    if (room.status === 'lobby' && currentScreen !== 'filters') currentScreen = 'lobby';
    if (room.status === 'results') currentScreen = 'results';
    if (room.filters && room.isHost && currentScreen !== 'filters') {
      appState.filtersDraft = { ...room.filters };
    }
    render();
  });

  const params = new URLSearchParams(window.location.search);
  const roomFromQr = params.get('room');
  if (roomFromQr) {
    appState.prefillRoomCode = roomFromQr.toUpperCase().slice(0, 4);
    navigate('join');
    return;
  }

  renderWelcome(navigate);
}

init();
