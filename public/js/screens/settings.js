import { mountScreen, setHeaderBadge } from '../utils/dom.js';
import { appState, setRegion } from '../state.js';
import { REGIONS } from '../data/regions.js';
import { ignoredCount, clearIgnored } from '../utils/banlist.js';
import { showToast } from '../socket.js';

export function renderSettings(onNavigate) {
  const screen = mountScreen('screen-settings', `
    <div class="flex-grow flex flex-col overflow-hidden">
      <div class="flex-grow overflow-y-auto p-6">
        <button id="btn-back" class="text-slate-400 p-2 -ml-2 mb-2"><i class="fa-solid fa-arrow-left text-xl"></i></button>
        <h2 class="text-2xl font-extrabold mb-1">Settings</h2>
        <p class="text-slate-400 text-sm mb-6">Tune CineMatch to your region and reset your local preferences.</p>

        <h3 class="font-bold text-sm text-slate-300 uppercase tracking-wide mb-1">Region</h3>
        <p class="text-xs text-slate-500 mb-3">Used to match streaming availability and content language to your country.</p>
        <div id="region-options" class="flex flex-col gap-2 mb-8"></div>

        <h3 class="font-bold text-sm text-slate-300 uppercase tracking-wide mb-1">Hidden titles</h3>
        <p class="text-xs text-slate-500 mb-3">
          Titles you've hidden from swipe decks (<span id="ignored-count" class="font-bold text-slate-300"></span>) stay hidden on this device until you clear the list.
        </p>
        <button id="btn-clear-banlist" class="w-full bg-slate-800 border border-slate-700 text-rose-400 font-bold py-3 rounded-xl text-sm">
          <i class="fa-solid fa-trash mr-2"></i>Clear hidden titles
        </button>
      </div>
    </div>
  `);

  setHeaderBadge('');
  screen.querySelector('#btn-back').onclick = () => onNavigate('welcome');

  const regionOptions = screen.querySelector('#region-options');
  function renderRegions() {
    regionOptions.innerHTML = REGIONS.map((r) => `
      <button data-region="${r.code}" class="option-btn ${appState.region === r.code ? 'selected' : ''}">
        <span class="text-2xl w-10 text-center mr-3 flex-shrink-0">${r.flag}</span>
        <span class="font-semibold text-lg flex-grow">${r.label}</span>
        ${appState.region === r.code ? '<i class="fa-solid fa-circle-check text-primary text-xl"></i>' : ''}
      </button>
    `).join('');
    regionOptions.querySelectorAll('[data-region]').forEach((btn) => {
      btn.onclick = () => {
        setRegion(btn.dataset.region);
        renderRegions();
        showToast('Region updated');
      };
    });
  }
  renderRegions();

  screen.querySelector('#ignored-count').textContent = `${ignoredCount()}`;
  screen.querySelector('#btn-clear-banlist').onclick = () => {
    if (!ignoredCount()) { showToast('No hidden titles to clear'); return; }
    if (!window.confirm('Clear the hidden titles list? They may show up again in future decks.')) return;
    clearIgnored();
    screen.querySelector('#ignored-count').textContent = '0';
    showToast('Hidden titles list cleared');
  };
}
