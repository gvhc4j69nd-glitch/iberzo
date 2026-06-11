// Handles Apple's App Tracking Transparency (ATT) flow and initializes
// Google Analytics with the appropriate ad-personalization settings.
//
// - On iOS (Capacitor): prompts the user via the native ATT dialog before
//   any tracking-related data (ad personalization signals, Google Signals)
//   is enabled. If the user denies/restricts, analytics still runs but
//   without ad-personalization signals, and AdBanner requests
//   non-personalized ads only.
// - On web/Android: ATT does not apply — personalized ads/analytics are
//   allowed by default.

const GA_ID = 'G-MB5E3YTQHT';

let readyPromise = null;

export function initTracking() {
  if (readyPromise) return readyPromise;

  readyPromise = (async () => {
    let personalized = true;

    if (typeof window !== 'undefined' && window.Capacitor?.getPlatform?.() === 'ios') {
      try {
        const { AppTrackingTransparency } = await import('@capgo/capacitor-app-tracking-transparency');
        let { status } = await AppTrackingTransparency.getStatus();
        if (status === 'notDetermined') {
          ({ status } = await AppTrackingTransparency.requestPermission());
        }
        personalized = status === 'authorized';
      } catch {
        // Plugin unavailable or call failed — default to the safer,
        // non-personalized configuration.
        personalized = false;
      }
    }

    window.__adsPersonalized = personalized;
    loadAnalytics(personalized);
    return personalized;
  })();

  return readyPromise;
}

export function personalizedAdsAllowed() {
  return window.__adsPersonalized !== false;
}

function loadAnalytics(personalized) {
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('set', 'allow_ad_personalization_signals', personalized);
  gtag('config', GA_ID, { allow_google_signals: personalized });
}
