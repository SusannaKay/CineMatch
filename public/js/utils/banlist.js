const STORAGE_KEY = 'cinematch_ignored';

function readIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function writeIds(set) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    /* storage non disponibile */
  }
}

export function isIgnored(movieId) {
  return readIds().has(movieId);
}

export function addToIgnored(movieId) {
  const set = readIds();
  set.add(movieId);
  writeIds(set);
}

export function removeFromIgnored(movieId) {
  const set = readIds();
  set.delete(movieId);
  writeIds(set);
}

export function clearIgnored() {
  writeIds(new Set());
}

export function ignoredCount() {
  return readIds().size;
}
