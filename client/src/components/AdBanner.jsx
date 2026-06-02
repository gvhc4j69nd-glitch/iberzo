import { useEffect, useRef, useState } from 'react';
import { PW_PUBLISHER_ID, PW_SITE_ID, PW_UNITS, KOFI_URL, isNoAds, setNoAds } from '../lib/ads';

// Inject the Playwire Ramp script once globally when ads are enabled
let pwScriptInjected = false;
function injectPlaywireScript() {
  if (pwScriptInjected || !PW_PUBLISHER_ID || !PW_SITE_ID) return;
  pwScriptInjected = true;
  const script = document.createElement('script');
  script.src = `https://cdn.playwire.com/bolt/js/zeus/embed.js`;
  script.setAttribute('data-pw-pubid', PW_PUBLISHER_ID);
  script.setAttribute('data-pw-type', 'standard');
  script.async = true;
  document.head.appendChild(script);
}

/**
 * AdBanner
 * variant="leaderboard" — lobby sidebar (medium rectangle)
 * variant="postgame"    — game-over screen (medium rectangle)
 *
 * To activate: fill in PW_PUBLISHER_ID and PW_SITE_ID in src/lib/ads.js
 * after Playwire approves your account at playwire.com
 */
export default function AdBanner({ variant = 'leaderboard' }) {
  const [noAds, setNoAdsState] = useState(isNoAds());
  const [supported, setSupported] = useState(false);
  const unitId = useRef(`pw-${variant}-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (noAds) return;
    injectPlaywireScript();
  }, [noAds]);

  function handleSupport() {
    window.open(KOFI_URL, '_blank', 'noopener');
    setTimeout(() => {
      if (window.confirm('Thanks for supporting Iberzo! Click OK to remove ads on this device.')) {
        setNoAds();
        setNoAdsState(true);
        setSupported(true);
      }
    }, 1500);
  }

  if (noAds) {
    return supported ? (
      <div className="ad-thankyou">❤️ Thanks for supporting Iberzo — ads removed!</div>
    ) : null;
  }

  return (
    <div className={`ad-wrap ad-${variant}`}>
      <span className="ad-label">Advertisement</span>

      {PW_PUBLISHER_ID && PW_SITE_ID ? (
        // Playwire Ramp unit — script populates this div automatically
        <div
          id={unitId.current}
          data-pw-desk={PW_UNITS[variant]}
          data-pw-mobi={PW_UNITS[variant]}
          className="pw-unit"
        />
      ) : (
        // Placeholder until Playwire account is approved
        <div className="ad-placeholder">
          <div className="ad-placeholder-inner">
            <p className="ad-placeholder-text">Ad space</p>
            <p className="ad-placeholder-sub">Powered by Playwire</p>
          </div>
        </div>
      )}

      <button className="ad-remove-btn" onClick={handleSupport}>
        ☕ Support Iberzo — remove ads
      </button>
    </div>
  );
}
