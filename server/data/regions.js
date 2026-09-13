// Countries CineMatch can localize discovery/streaming data for. Keep this in
// sync with public/js/data/regions.js (the user-facing list has the same codes).
export const REGION_LANGUAGE = {
  US: 'en-US',
  GB: 'en-GB',
  CA: 'en-CA',
  AU: 'en-AU',
  IT: 'it-IT',
  FR: 'fr-FR',
  DE: 'de-DE',
  ES: 'es-ES',
};

export const DEFAULT_REGION = 'US';

export function sanitizeRegion(region) {
  const code = String(region || '').toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : DEFAULT_REGION;
}

export function languageForRegion(region) {
  return REGION_LANGUAGE[region] || REGION_LANGUAGE[DEFAULT_REGION];
}
