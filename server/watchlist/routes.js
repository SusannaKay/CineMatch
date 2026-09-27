import express from 'express';
import { LIMITS, toPublicItem, toClientItem } from './validate.js';

const MAX_PUBLIC_LIMIT = 500;

export function watchlistRouter(store) {
  const router = express.Router();

  // Public read-only endpoint (for the dashboard and anything else on the LAN). Contract v1, see README.
  router.get('/watchlist', (req, res) => {
    let limit = null;
    if (req.query.limit !== undefined) {
      limit = Number(req.query.limit);
      if (!Number.isInteger(limit) || limit < 1) return res.status(400).json({ error: 'invalid_limit', message: 'limit must be a positive integer' });
      limit = Math.min(limit, MAX_PUBLIC_LIMIT);
    }
    const newestFirst = store.list().reverse();
    const items = (limit ? newestFirst.slice(0, limit) : newestFirst).map(toPublicItem);
    res.set('Cache-Control', 'no-store');
    res.json({
      version: 1,
      updatedAt: store.state.updatedAt ? new Date(store.state.updatedAt).toISOString() : null,
      total: newestFirst.length,
      count: items.length,
      items,
    });
  });

  // Used only by devices that turned on sync: pushes queued ops, returns the full synced list.
  router.post('/watchlist/sync', express.json({ limit: '1mb' }), async (req, res) => {
    const ops = req.body?.ops ?? [];
    if (!Array.isArray(ops)) return res.status(400).json({ error: 'invalid_ops' });
    if (ops.length > LIMITS.maxOpsPerRequest) return res.status(413).json({ error: 'too_many_ops', max: LIMITS.maxOpsPerRequest });
    try {
      const result = ops.length ? await store.applyOps(ops) : { applied: 0, rejected: 0, rev: store.rev };
      res.set('Cache-Control', 'no-store');
      res.json({ ...result, items: store.list().map(toClientItem) });
    } catch (err) {
      console.error('[watchlist] write failed:', err.message);
      res.status(503).json({ error: 'storage_unavailable' });
    }
  });

  return router;
}
