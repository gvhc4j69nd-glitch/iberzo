import { useEffect, useState } from 'react';
import { ADSENSE_CLIENT, ADSENSE_SLOTS, KOFI_URL, isNoAds, setNoAds } from '../lib/ads';

let adsenseScriptInjected = false;
function injectAdSense() {
  if (adsenseScriptInjected) return;
  adsenseScriptInjected = true;
  const script = document.createElement('script');
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  script.async = true;
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
}

export default function AdBanner({ variant = 'leaderboard' }) {
  const [noAds, setNoAdsState] = useState(isNoAds());
  const [supported, setSupported] = useState(false);
  const slotId = ADSENSE_SLOTS[variant];

  useEffect(() => {
    if (noAds) return;
    injectAdSense();
    // Push the ad unit after script loads
    if (slotId) {
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
    }
  }, [noAds, slotId]);

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

      {slotId ? (
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%' }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : (
        <div className="ad-placeholder">
          <div className="ad-placeholder-inner">
            <p className="ad-placeholder-text">Ad space</p>
            <p className="ad-placeholder-sub">Powered by Google AdSense</p>
          </div>
        </div>
      )}

      <button className="ad-remove-btn" onClick={handleSupport}>
        ☕ Support Iberzo — remove ads
      </button>
    </div>
  );
}
