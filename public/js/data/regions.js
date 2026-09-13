// Keep in sync with server/data/regions.js (same codes drive TMDB's language/watch_region).
export const REGIONS = [
  { code: 'US', label: 'United States', flag: '🇺🇸' },
  { code: 'GB', label: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', label: 'Canada', flag: '🇨🇦' },
  { code: 'AU', label: 'Australia', flag: '🇦🇺' },
  { code: 'IT', label: 'Italy', flag: '🇮🇹' },
  { code: 'FR', label: 'France', flag: '🇫🇷' },
  { code: 'DE', label: 'Germany', flag: '🇩🇪' },
  { code: 'ES', label: 'Spain', flag: '🇪🇸' },
];

export const DEFAULT_REGION = 'US';

export function regionLabel(code) {
  return REGIONS.find((r) => r.code === code)?.label || code;
}
