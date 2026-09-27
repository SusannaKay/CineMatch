// Watchlist storage.
//
// Default (sync off): the list lives only in this browser's localStorage, exactly as before.
// Sync on (opt-in, per device, from Settings): localStorage is still the working copy, so the
// app keeps working offline, but every change is also queued in an outbox and pushed to the
// server (POST /api/watchlist/sync). The server's answer — the shared list — replaces the local
// copy, with any still-queued changes re-applied on top. If the server is unreachable the outbox
// is kept (in localStorage too) and retried with backoff, on reconnect, and when the app regains focus.

const STORAGE_KEY = 'cinematch_watchlist';
const SYNC_KEY = 'cinematch_watchlist_sync';
const OUTBOX_KEY = 'cinematch_watchlist_outbox';
const LAST_SYNC_KEY = 'cinematch_watchlist_last_sync';
const SYNC_URL = '/api/watchlist/sync';
const BATCH_SIZE = 100;
const REQUEST_TIMEOUT_MS = 8000;
const PERIODIC_SYNC_MS = 60 * 1000;

function readJSON(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ }
}

function load() {
  const parsed = readJSON(STORAGE_KEY, []);
  if (!Array.isArray(parsed)) return [];
  // Tags were removed from the app: drop leftovers from older versions.
  return parsed.map(({ tags, ...movie }) => movie);
}

let movies = load();
let outbox = (() => { const o = readJSON(OUTBOX_KEY, []); return Array.isArray(o) ? o : []; })();
let syncEnabled = readJSON(SYNC_KEY, false) === true;
let lastSync = Number(readJSON(LAST_SYNC_KEY, 0)) || null;
let syncState = syncEnabled ? 'idle' : 'off'; // off | idle | syncing | offline
let knownRev = null;
let inflight = null;
let rerun = false;
let retryTimer = null;
let retryDelay = 5000;
let debounceTimer = null;
const listeners = new Set();

const typeOf = (m) => (m?.mediaType === 'tv' ? 'tv' : 'movie');
const keyOf = (m) => `${typeOf(m)}:${m.id}`;
const matches = (m, id, mediaType) => String(m.id) === String(id) && (!mediaType || typeOf(m) === mediaType);

function saveMovies() { writeJSON(STORAGE_KEY, movies); }
function saveOutbox() { writeJSON(OUTBOX_KEY, outbox); }
function notify() { for (const fn of listeners) { try { fn(); } catch (err) { console.error(err); } } }

export function onWatchlistChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getWatchlist() {
  return [...movies];
}

export function hasInWatchlist(id, mediaType) {
  return movies.some((movie) => matches(movie, id, mediaType));
}

export function addToWatchlist(movie) {
  if (!movie || movie.id == null || hasInWatchlist(movie.id, typeOf(movie))) return false;
  const { tags, ...rest } = movie;
  const item = { ...rest, watched: false, addedAt: Date.now() };
  movies.push(item);
  saveMovies();
  enqueue({ type: 'add', item });
  return true;
}

export function removeFromWatchlist(id, mediaType) {
  const removed = movies.filter((movie) => matches(movie, id, mediaType));
  if (!removed.length) return false;
  movies = movies.filter((movie) => !matches(movie, id, mediaType));
  saveMovies();
  removed.forEach((movie) => enqueue({ type: 'remove', key: keyOf(movie) }));
  return true;
}

/** Merges a partial update (e.g. { watched }) into a saved title. */
export function updateWatchlistItem(id, patch, mediaType) {
  const movie = movies.find((m) => matches(m, id, mediaType));
  if (!movie) return false;
  Object.assign(movie, patch);
  saveMovies();
  const synced = {};
  if ('watched' in patch) synced.watched = !!patch.watched;
  if (Object.keys(synced).length) enqueue({ type: 'update', key: keyOf(movie), patch: synced });
  return true;
}

export function watchlistCount() {
  return movies.length;
}

// ── Sync ────────────────────────────────────────────────────────────────

export function getSyncStatus() {
  return { enabled: syncEnabled, state: syncState, pending: outbox.length, lastSync };
}

function setState(state) {
  if (syncState === state) return;
  syncState = state;
  notify();
}

function enqueue(op) {
  if (!syncEnabled) return;
  outbox.push({ ...op, ts: Date.now(), opId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` });
  saveOutbox();
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => syncNow(), 300);
}

/** Same rules as the server, used to show queued changes on top of the last server copy. */
function applyLocally(list, op) {
  if (op.type === 'add') {
    const existing = list.find((m) => keyOf(m) === keyOf(op.item));
    if (!existing) return [...list, { ...op.item }];
    existing.watched = !!(existing.watched || op.item.watched);
    return list;
  }
  if (op.type === 'remove') return list.filter((m) => keyOf(m) !== op.key);
  if (op.type === 'update') {
    const existing = list.find((m) => keyOf(m) === op.key);
    if (existing) Object.assign(existing, op.patch);
  }
  return list;
}

function scheduleRetry() {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => syncNow(), retryDelay);
  retryDelay = Math.min(retryDelay * 2, 60000);
}

/** Pushes queued changes and pulls the shared list. Never throws. */
export function syncNow() {
  if (!syncEnabled) return Promise.resolve(getSyncStatus());
  if (inflight) { rerun = true; return inflight; }
  inflight = runSync().finally(() => {
    inflight = null;
    if (rerun && syncEnabled) { rerun = false; syncNow(); }
  });
  return inflight;
}

async function runSync() {
  setState('syncing');
  try {
    do {
      const batch = outbox.slice(0, BATCH_SIZE);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      let res;
      try {
        res = await fetch(SYNC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ops: batch }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      if (!syncEnabled) return getSyncStatus();

      if (!res.ok && res.status >= 400 && res.status < 500 && ![408, 429].includes(res.status)) {
        // The server will never accept this batch (malformed): drop it rather than block the queue forever.
        console.warn(`[watchlist] server refused ${batch.length} queued change(s) (HTTP ${res.status}), dropping them`);
        dropSent(batch);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (!Array.isArray(data.items)) throw new Error('bad response');
      dropSent(batch);
      knownRev = data.rev;
      movies = outbox.reduce(applyLocally, data.items);
      saveMovies();
      lastSync = Date.now();
      writeJSON(LAST_SYNC_KEY, lastSync);
    } while (outbox.length && syncEnabled);

    retryDelay = 5000;
    clearTimeout(retryTimer);
    setState('idle');
    notify();
  } catch (err) {
    console.warn('[watchlist] sync failed, keeping local copy:', err.message || err);
    setState('offline');
    notify();
    scheduleRetry();
  }
  return getSyncStatus();
}

function dropSent(batch) {
  const sent = new Set(batch.map((op) => op.opId));
  outbox = outbox.filter((op) => !sent.has(op.opId));
  saveOutbox();
}

/**
 * Turns sync on for this device. The local list is merged into the server's one
 * (union by TMDB id + type; "watched" kept if set on either side).
 */
export async function enableSync() {
  if (syncEnabled) return syncNow();
  syncEnabled = true;
  writeJSON(SYNC_KEY, true);
  const now = Date.now();
  outbox = movies.map((movie, i) => ({
    type: 'add',
    item: { ...movie, addedAt: Number.isFinite(movie.addedAt) ? movie.addedAt : now - (movies.length - 1 - i) },
    ts: now,
    opId: `migrate-${now.toString(36)}-${i}`,
  }));
  saveOutbox();
  syncState = 'idle';
  notify();
  return syncNow();
}

/** Turns sync off for this device. The current list stays here as a local-only list. */
export function disableSync() {
  syncEnabled = false;
  writeJSON(SYNC_KEY, false);
  outbox = [];
  saveOutbox();
  clearTimeout(retryTimer);
  clearTimeout(debounceTimer);
  syncState = 'off';
  notify();
}

/** Called when the server announces a change (Socket.IO "watchlist:changed"). */
export function handleRemoteChange(rev) {
  if (syncEnabled && rev !== knownRev) syncNow();
}

let started = false;
/** Wires the automatic sync triggers. Safe to call once at startup. */
export function initWatchlistSync() {
  if (started) return;
  started = true;
  if (syncEnabled) syncNow();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow(); });
  window.addEventListener('online', () => { retryDelay = 5000; syncNow(); });
  setInterval(() => { if (document.visibilityState === 'visible') syncNow(); }, PERIODIC_SYNC_MS);
}
