import { mountScreen, setHeaderBadge } from '../utils/dom.js';
import { appState, setRegion } from '../state.js';
import { REGIONS } from '../data/regions.js';
import { ignoredCount, clearIgnored } from '../utils/banlist.js';
import { showToast } from '../socket.js';
import { getSyncStatus, enableSync, disableSync, syncNow, onWatchlistChange, watchlistCount } from '../watchlist.js';

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

        <h3 class="font-bold text-sm text-slate-300 uppercase tracking-wide mb-1">Watchlist sync</h3>
        <p class="text-xs text-slate-500 mb-3">
          Keeps one shared Watchlist on the CineMatch server, the same on every device where this is on.
          Turn it on only on the server owner's own devices: guests should leave it off, or their titles end up in the owner's list.
        </p>
        <label class="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 mb-2 cursor-pointer">
          <i class="fa-solid fa-cloud text-primary text-lg w-6 text-center"></i>
          <span class="flex-grow">
            <span class="block font-semibold">Sync this device</span>
            <span id="sync-detail" class="block text-xs text-slate-400 mt-0.5"></span>
          </span>
          <input id="sync-toggle" type="checkbox" class="w-5 h-5 accent-rose-600" aria-label="Sync this device's Watchlist with the server">
        </label>
        <button id="btn-sync-now" class="hidden w-full bg-slate-800 border border-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-sm mb-8">
          <i class="fa-solid fa-arrows-rotate mr-2"></i>Sync now
        </button>
        <div id="sync-spacer" class="mb-8"></div>

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

  wireSync(screen);

  screen.querySelector('#ignored-count').textContent = `${ignoredCount()}`;
  screen.querySelector('#btn-clear-banlist').onclick = () => {
    if (!ignoredCount()) { showToast('No hidden titles to clear'); return; }
    if (!window.confirm('Clear the hidden titles list? They may show up again in future decks.')) return;
    clearIgnored();
    screen.querySelector('#ignored-count').textContent = '0';
    showToast('Hidden titles list cleared');
  };
}

function syncDetailText() {
  const { enabled, state, pending, lastSync } = getSyncStatus();
  if (!enabled) return 'Off: this Watchlist is stored only on this device.';
  if (state === 'syncing') return 'Syncing…';
  if (state === 'offline') return `Server unreachable: changes are kept here${pending ? ` (${pending} pending)` : ''} and will sync automatically.`;
  return lastSync ? `On · last synced ${new Date(lastSync).toLocaleString()}` : 'On';
}

function wireSync(screen) {
  const toggle = screen.querySelector('#sync-toggle');
  const detail = screen.querySelector('#sync-detail');
  const syncBtn = screen.querySelector('#btn-sync-now');
  const spacer = screen.querySelector('#sync-spacer');
  let unsubscribe = () => {};
  const update = () => {
    if (!document.body.contains(toggle)) { unsubscribe(); return; }
    const { enabled } = getSyncStatus();
    toggle.checked = enabled;
    detail.textContent = syncDetailText();
    syncBtn.classList.toggle('hidden', !enabled);
    spacer.classList.toggle('hidden', enabled);
  };
  unsubscribe = onWatchlistChange(update);
  update();

  toggle.onchange = async () => {
    if (toggle.checked) {
      const n = watchlistCount();
      const msg = `Turn on Watchlist sync on this device?\n\n${n ? `The ${n} title${n === 1 ? '' : 's'} saved here will be merged into the shared list on the server. ` : ''}Do this only on your own devices.`;
      if (!window.confirm(msg)) { toggle.checked = false; return; }
      const status = await enableSync();
      update();
      showToast(status.state === 'offline' ? 'Sync on — server unreachable, will retry automatically' : `Watchlist synced (${watchlistCount()} titles)`);
    } else {
      const { pending } = getSyncStatus();
      const msg = `Turn off Watchlist sync on this device?\n\nThe current list stays here as a local-only list; the server copy is not touched.${pending ? `\n\nWarning: ${pending} change${pending === 1 ? '' : 's'} not yet sent to the server will not be synced.` : ''}`;
      if (!window.confirm(msg)) { toggle.checked = true; return; }
      disableSync();
      update();
      showToast('Watchlist sync turned off on this device');
    }
  };

  syncBtn.onclick = async () => {
    const status = await syncNow();
    showToast(status.state === 'offline' ? 'Server unreachable, will retry automatically' : 'Watchlist synced');
  };
}
