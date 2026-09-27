// Server-side copy of the owner's watchlist, shared by the devices that opted in to sync.
//
// Storage: one JSON file (DATA_DIR/watchlist.json), rewritten atomically (tmp file + rename)
// so a crash mid-write never leaves a half-written file. Every mutation goes through a
// single promise queue, so requests arriving close together from several devices are
// applied one after the other against the latest state.
//
// Conflict rules (last-writer-wins on client timestamps, clamped to server time):
//   add    → inserts the title; if it already exists, watched is OR-ed
//            (nothing is ever lost when two lists are merged). Ignored if the title was
//            removed *after* the add happened (tombstone newer than the op).
//   remove → deletes the title and leaves a tombstone; ignored if the title was (re)added
//            after the remove happened.
//   update → last-writer-wins on the watched flag.

import fs from 'fs/promises';
import path from 'path';
import { sanitizeItem, itemKey, LIMITS } from './validate.js';

const FILE_VERSION = 1;
const TOMBSTONE_TTL_MS = 180 * 24 * 60 * 60 * 1000;
const MAX_TOMBSTONES = 5000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

function emptyState() {
  return { version: FILE_VERSION, rev: 0, updatedAt: null, items: {}, tombstones: {} };
}

/** Accepts only a structurally valid file; anything else is treated as corrupt. */
function parseState(raw) {
  const data = JSON.parse(raw);
  if (!data || typeof data !== 'object' || typeof data.items !== 'object' || Array.isArray(data.items)) {
    throw new Error('unexpected file structure');
  }
  const state = emptyState();
  state.rev = Number.isInteger(data.rev) && data.rev >= 0 ? data.rev : 0;
  state.updatedAt = typeof data.updatedAt === 'number' ? data.updatedAt : null;
  for (const stored of Object.values(data.items)) {
    const item = sanitizeItem(stored);
    if (!item) continue;
    item.addedAt = Number.isFinite(stored.addedAt) ? stored.addedAt : Date.now();
    item.fieldTs = { watched: Number(stored.fieldTs?.watched) || item.addedAt };
    state.items[itemKey(item)] = item;
  }
  for (const [key, ts] of Object.entries(data.tombstones || {})) {
    if (/^(movie|tv):\d+$/.test(key) && Number.isFinite(ts)) state.tombstones[key] = ts;
  }
  return state;
}

export class WatchlistStore {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.file = path.join(dataDir, 'watchlist.json');
    this.state = emptyState();
    this.queue = Promise.resolve();
    this.writable = false;
    this.readFailed = false;
    this.listeners = new Set();
  }

  /** Loads the file. Never throws: a missing or corrupt file just means an empty list. */
  async init() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch { /* checked below */ }

    let raw = null;
    try {
      raw = await fs.readFile(this.file, 'utf8');
    } catch (err) {
      if (err.code !== 'ENOENT') {
        // The file may be fine but we can't read it (permissions, bad mount): never overwrite it.
        this.readFailed = true;
        console.error(`[watchlist] cannot read ${this.file} (${err.code || err.message}): sync disabled until this is fixed; the file is left untouched.`);
      }
    }
    if (raw != null) {
      try {
        this.state = parseState(raw);
      } catch (err) {
        const backup = `${this.file}.corrupt-${Date.now()}`;
        console.error(`[watchlist] ${this.file} is corrupt (${err.message}); starting empty, original kept as ${backup}`);
        await fs.rename(this.file, backup).catch(() => {});
        this.state = emptyState();
      }
    }

    try {
      await fs.access(this.dataDir, fs.constants.W_OK);
      this.writable = true;
    } catch {
      this.writable = false;
      console.error(`[watchlist] ${this.dataDir} is not writable: sync writes will fail until permissions are fixed (reads still work).`);
    }
    console.log(`[watchlist] ${Object.keys(this.state.items).length} synced titles loaded from ${this.file}`);
    return this;
  }

  onChange(fn) { this.listeners.add(fn); }

  get rev() { return this.state.rev; }

  /** Items sorted oldest → newest (the order the client displays as "Date added"). */
  list() {
    return Object.values(this.state.items).sort((a, b) => a.addedAt - b.addedAt || a.id - b.id);
  }

  /** Applies a batch of ops atomically: either the whole new state is persisted or nothing changes. */
  applyOps(ops) {
    const run = this.queue.then(() => this.#applyOpsNow(ops));
    this.queue = run.catch(() => {});
    return run;
  }

  async #applyOpsNow(ops) {
    if (this.readFailed) throw new Error('data file could not be read at startup');
    const next = structuredClone(this.state);
    const now = Date.now();
    let applied = 0;
    let rejected = 0;

    for (const op of ops) {
      const result = applyOne(next, op, now);
      if (result === 'rejected') rejected += 1;
      else if (result === 'applied') applied += 1;
    }

    if (applied > 0) {
      pruneTombstones(next, now);
      next.rev += 1;
      next.updatedAt = now;
      await this.#persist(next);
      this.state = next;
      for (const fn of this.listeners) fn(this.state.rev);
    }
    return { applied, rejected, rev: this.state.rev };
  }

  async #persist(state) {
    const tmp = `${this.file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(state), 'utf8');
    await fs.rename(tmp, this.file);
    this.writable = true;
  }
}

function clampTs(ts, now) {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return now;
  return Math.min(n, now + MAX_CLOCK_SKEW_MS);
}

/** @returns {'applied'|'ignored'|'rejected'} */
function applyOne(state, op, now) {
  if (!op || typeof op !== 'object') return 'rejected';
  const ts = clampTs(op.ts, now);

  if (op.type === 'add') {
    const item = sanitizeItem(op.item);
    if (!item) return 'rejected';
    const key = itemKey(item);
    const existing = state.items[key];
    if (existing) {
      if (!item.watched || existing.watched) return 'ignored';
      existing.watched = true;
      existing.fieldTs = { watched: Math.max(existing.fieldTs.watched, ts) };
      return 'applied';
    }
    if ((state.tombstones[key] || 0) > ts) return 'ignored';
    if (Object.keys(state.items).length >= LIMITS.maxItems) return 'rejected';
    const addedAt = Number.isFinite(op.item.addedAt) ? clampTs(op.item.addedAt, now) : ts;
    state.items[key] = { ...item, addedAt, fieldTs: { watched: ts } };
    delete state.tombstones[key];
    return 'applied';
  }

  const key = typeof op.key === 'string' && /^(movie|tv):\d{1,15}$/.test(op.key) ? op.key : null;
  if (!key) return 'rejected';

  if (op.type === 'remove') {
    const existing = state.items[key];
    if (!existing) return 'ignored';
    if (existing.addedAt > ts) return 'ignored';
    delete state.items[key];
    state.tombstones[key] = ts;
    return 'applied';
  }

  if (op.type === 'update') {
    const existing = state.items[key];
    const patch = op.patch;
    if (!patch || typeof patch !== 'object') return 'rejected';
    if ('watched' in patch && typeof patch.watched !== 'boolean') return 'rejected';
    if (!existing) return 'ignored';
    let changed = false;
    if ('watched' in patch) {
      if (ts >= existing.fieldTs.watched) {
        changed ||= existing.watched !== patch.watched;
        existing.watched = patch.watched;
        existing.fieldTs.watched = ts;
      }
    }
    return changed ? 'applied' : 'ignored';
  }

  return 'rejected';
}

function pruneTombstones(state, now) {
  const entries = Object.entries(state.tombstones).filter(([, ts]) => now - ts < TOMBSTONE_TTL_MS);
  entries.sort((a, b) => b[1] - a[1]);
  state.tombstones = Object.fromEntries(entries.slice(0, MAX_TOMBSTONES));
}
