import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { WatchlistStore } from './store.js';

const tmpDir = () => fs.mkdtemp(path.join(os.tmpdir(), 'cinematch-wl-'));
const movie = (id, extra = {}) => ({ id, mediaType: 'movie', title: `Movie ${id}`, poster_path: `https://image.tmdb.org/t/p/w500/${id}.jpg`, release_date: '2010-07-15', vote_average: '8.1', ...extra });

test('add, update, remove and persistence across restarts', async () => {
  const dir = await tmpDir();
  const store = await new WatchlistStore(dir).init();
  await store.applyOps([{ type: 'add', item: movie(1), ts: 1000 }, { type: 'add', item: movie(2), ts: 2000 }]);
  await store.applyOps([{ type: 'update', key: 'movie:1', patch: { watched: true }, ts: 3000 }]);
  await store.applyOps([{ type: 'remove', key: 'movie:2', ts: 4000 }]);
  const reopened = await new WatchlistStore(dir).init();
  const items = reopened.list();
  assert.equal(items.length, 1);
  assert.equal(items[0].watched, true);
  assert.equal(items[0].tags, undefined);
});

test('merge on add: no duplicates, watched kept', async () => {
  const store = await new WatchlistStore(await tmpDir()).init();
  await store.applyOps([{ type: 'add', item: movie(1, { watched: true }), ts: 1000 }]);
  await store.applyOps([{ type: 'add', item: movie(1, { watched: false }), ts: 2000 }]);
  const [item] = store.list();
  assert.equal(store.list().length, 1);
  assert.equal(item.watched, true);
});

test('movie and tv with the same TMDB id are different titles', async () => {
  const store = await new WatchlistStore(await tmpDir()).init();
  await store.applyOps([{ type: 'add', item: movie(5), ts: 1 }, { type: 'add', item: { ...movie(5), mediaType: 'tv' }, ts: 2 }]);
  assert.equal(store.list().length, 2);
});

test('stale ops lose against newer ones (offline device coming back)', async () => {
  const store = await new WatchlistStore(await tmpDir()).init();
  const T = Date.now() - 60000;
  await store.applyOps([{ type: 'add', item: movie(1), ts: T + 5000 }]);
  await store.applyOps([{ type: 'remove', key: 'movie:1', ts: T + 4000 }]); // removed before it was re-added
  assert.equal(store.list().length, 1);
  await store.applyOps([{ type: 'remove', key: 'movie:1', ts: T + 6000 }]);
  await store.applyOps([{ type: 'add', item: movie(1), ts: T + 5500 }]); // added before the removal
  assert.equal(store.list().length, 0);
  await store.applyOps([{ type: 'update', key: 'movie:1', patch: { watched: true }, ts: T + 7000 }]);
  await store.applyOps([{ type: 'add', item: movie(1), ts: T + 8000 }]);
  await store.applyOps([{ type: 'update', key: 'movie:1', patch: { watched: true }, ts: T + 9000 }, { type: 'update', key: 'movie:1', patch: { watched: false }, ts: T + 8500 }]);
  assert.equal(store.list()[0].watched, true);
});

test('invalid input is rejected or stripped', async () => {
  const store = await new WatchlistStore(await tmpDir()).init();
  const res = await store.applyOps([
    { type: 'add', item: { id: 'abc', title: 'x' } },
    { type: 'add', item: { id: 3, mediaType: 'movie' } },
    { type: 'add', item: { ...movie(4), evil: 'x'.repeat(1e6), title: 'T'.repeat(5000), poster_path: 'javascript:alert(1)' } },
    { type: 'update', key: '../etc', patch: {} },
    { type: 'drop-table' },
  ]);
  assert.equal(res.applied, 1);
  assert.equal(res.rejected, 4);
  const [item] = store.list();
  assert.equal(item.evil, undefined);
  assert.equal(item.title.length, 300);
  assert.equal(item.poster_path, null);
});

test('concurrent batches are serialized, nothing lost', async () => {
  const store = await new WatchlistStore(await tmpDir()).init();
  await Promise.all(Array.from({ length: 50 }, (_, i) => store.applyOps([{ type: 'add', item: movie(i + 1), ts: i + 1 }])));
  assert.equal(store.list().length, 50);
  assert.equal(store.rev, 50);
});

test('corrupt file does not crash: starts empty and keeps a backup', async () => {
  const dir = await tmpDir();
  await fs.writeFile(path.join(dir, 'watchlist.json'), '{"items": [trunc');
  const store = await new WatchlistStore(dir).init();
  assert.equal(store.list().length, 0);
  const files = await fs.readdir(dir);
  assert.ok(files.some((f) => f.startsWith('watchlist.json.corrupt-')));
  await store.applyOps([{ type: 'add', item: movie(1), ts: 1 }]);
  assert.equal((await new WatchlistStore(dir).init()).list().length, 1);
});

test('tags from older clients are dropped, not stored', async () => {
  const store = await new WatchlistStore(await tmpDir()).init();
  await store.applyOps([{ type: 'add', item: movie(1, { tags: ['x'] }), ts: 1 }]);
  const res = await store.applyOps([{ type: 'update', key: 'movie:1', patch: { tags: ['y'] }, ts: 2 }]);
  assert.equal(res.rejected, 0);
  assert.equal(store.list()[0].tags, undefined);
});
