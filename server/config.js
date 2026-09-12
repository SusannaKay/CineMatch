import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3000,
  tmdbApiKey: process.env.TMDB_API_KEY || '',
  omdbApiKey: process.env.OMDB_API_KEY || '',
  useMockData: process.env.USE_MOCK_DATA === 'true' || !process.env.TMDB_API_KEY,
  roomTtlMs: 2 * 60 * 60 * 1000,
  voteTimeoutSec: 45,
  deckSize: 10,
  playerColors: ['#e11d48', '#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'],
};
