// ── Google AdSense configuration ─────────────────────────────────────────
export const ADSENSE_CLIENT = 'ca-pub-3107493448711439';

// Ad slot IDs — create these in your AdSense dashboard under Ads → By ad unit
// For each placement, create a "Display ad" unit and paste the slot ID below
export const ADSENSE_SLOTS = {
  leaderboard: null,  // e.g. '1234567890'
  postgame:    null,  // e.g. '0987654321'
};

// Ko-fi page for supporter donations
export const KOFI_URL = 'https://ko-fi.com/iberzo';

const NO_ADS_KEY = 'iberzo_no_ads';
export function isNoAds()  { return localStorage.getItem(NO_ADS_KEY) === '1'; }
export function setNoAds() { localStorage.setItem(NO_ADS_KEY, '1'); }
