// ── Ad configuration ──────────────────────────────────────────────────────
// Once your Carbon Ads account is approved, replace this with your real ID:
//   https://app.carbonads.com
// Format: '//cdn.carbonads.com/carbon.js?serve=XXXXXXXX&placement=iberzo'
export const CARBON_SERVE_ID = null; // e.g. 'CKYIKKQU' — set when approved

// Ko-fi page for supporter donations
export const KOFI_URL = 'https://ko-fi.com/iberzo';

const NO_ADS_KEY = 'iberzo_no_ads';

export function isNoAds() {
  return localStorage.getItem(NO_ADS_KEY) === '1';
}

export function setNoAds() {
  localStorage.setItem(NO_ADS_KEY, '1');
}

export function clearNoAds() {
  localStorage.removeItem(NO_ADS_KEY);
}
