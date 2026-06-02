// ── Playwire configuration ────────────────────────────────────────────────
// After Playwire approves your site at playwire.com, they'll give you:
//   - A Publisher ID  (e.g. "7005")
//   - A Website/Site ID (e.g. "12345")
// Paste both below and ads will go live automatically.
export const PW_PUBLISHER_ID = null;  // e.g. '7005'
export const PW_SITE_ID      = null;  // e.g. '12345'

// Playwire ad unit types to use per placement
// These are standard Ramp unit names — Playwire may give you custom ones
export const PW_UNITS = {
  leaderboard: 'med_rect_atf',   // 300x250 medium rectangle
  postgame:    'med_rect_atf',   // same unit, different placement context
};

// Ko-fi page for supporter donations
export const KOFI_URL = 'https://ko-fi.com/iberzo';

const NO_ADS_KEY = 'iberzo_no_ads';
export function isNoAds()  { return localStorage.getItem(NO_ADS_KEY) === '1'; }
export function setNoAds() { localStorage.setItem(NO_ADS_KEY, '1'); }
