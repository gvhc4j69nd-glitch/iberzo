import { useEffect, useRef, useState } from 'react';
import { CARBON_SERVE_ID, KOFI_URL, isNoAds, setNoAds } from '../lib/ads';

/**
 * AdBanner — renders a Carbon Ads unit or a tasteful placeholder.
 * Pass variant="leaderboard" for the lobby sidebar (smaller),
 * or variant="postgame" for the game-over interstitial (larger).
 * Hidden entirely when the user has opted out via Ko-fi support.
 */
export default function AdBanner({ variant = 'leaderboard' }) {
  const [noAds, setNoAdsState] = useState(isNoAds());
  const [supported, setSupported] = useState(false);
  const carbonRef = useRef(null);

  useEffect(() => {
    if (noAds || !CARBON_SERVE_ID || !carbonRef.current) return;
    // Remove any previous instance
    carbonRef.current.innerHTML = '';
    const script = document.createElement('script');
    script.src = `//cdn.carbonads.com/carbon.js?serve=${CARBON_SERVE_ID}&placement=iberzo`;
    script.id = '_carbonads_js';
    script.async = true;
    carbonRef.current.appendChild(script);
    return () => { if (carbonRef.current) carbonRef.current.innerHTML = ''; };
  }, [noAds]);

  function handleSupport() {
    window.open(KOFI_URL, '_blank', 'noopener');
    // Give them a moment to land on Ko-fi, then confirm
    setTimeout(() => {
      if (window.confirm('Thanks for supporting Iberzo! Click OK to remove ads on this device.')) {
        setNoAds();
        setNoAdsState(true);
        setSupported(true);
      }
    }, 1500);
  }

  if (noAds) {
    if (supported) {
      return (
        <div className="ad-thankyou">
          ❤️ Thanks for supporting Iberzo — ads removed!
        </div>
      );
    }
    return null;
  }

  return (
    <div className={`ad-wrap ad-${variant}`}>
      {CARBON_SERVE_ID ? (
        // Real Carbon Ads unit — Carbon injects its own markup here
        <div ref={carbonRef} className="carbon-wrap" />
      ) : (
        // Placeholder shown until Carbon Ads account is approved
        <div className="ad-placeholder">
          <span className="ad-label">Advertisement</span>
          <div className="ad-placeholder-inner">
            <p className="ad-placeholder-text">Your ad here</p>
            <p className="ad-placeholder-sub">Powered by Carbon Ads</p>
          </div>
        </div>
      )}
      <button className="ad-remove-btn" onClick={handleSupport}>
        ☕ Support Iberzo — remove ads
      </button>
    </div>
  );
}
