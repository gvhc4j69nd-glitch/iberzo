export default function AboutPage() {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px', fontFamily: 'Segoe UI, system-ui, sans-serif', color: '#2d1a0e', lineHeight: 1.7 }}>
      <img src="/iberzo-logo.png" alt="Iberzo" style={{ width: 90, display: 'block', margin: '0 auto 20px' }} />

      <h1 style={{ fontSize: 28, fontWeight: 800, textAlign: 'center', marginBottom: 6, color: '#c0392b' }}>About Iberzo</h1>
      <p style={{ textAlign: 'center', color: '#9a7060', marginBottom: 36, fontSize: 15 }}>Games worth playing, built with care.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Who We Are</h2>
      <p>Iberzo is an independent game studio with a simple mission: create fun, accessible games that bring people together. We're a small team with a big love for board games, strategy, and the kind of "one more round" feeling that keeps you up past midnight.</p>

      <p style={{ marginTop: 14 }}>We started with a question — why aren't there more great tile-drafting games online that you can play with friends without downloading a bloated app or paying a subscription? So we built one.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 10 }}>What We Build</h2>
      <p>Our games are designed to be easy to learn, hard to master, and always free to play. We believe great games don't need to be complicated or expensive — they just need to be well made.</p>

      <p style={{ marginTop: 14 }}>Iberzo is our first title — a fast-paced multiplayer tile-drafting game inspired by classic European board games. Play in your browser, on iOS, or on Android. Your account works everywhere.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 10 }}>Our Philosophy</h2>
      <ul style={{ paddingLeft: 20 }}>
        <li style={{ marginBottom: 8 }}><strong>Free to play</strong> — no paywalls, no pay-to-win, no subscriptions</li>
        <li style={{ marginBottom: 8 }}><strong>Cross-platform</strong> — play on any device, pick up where you left off</li>
        <li style={{ marginBottom: 8 }}><strong>Community first</strong> — built around playing with real people, not algorithms</li>
        <li style={{ marginBottom: 8 }}><strong>Always improving</strong> — we ship updates regularly based on player feedback</li>
      </ul>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 10 }}>Our Games</h2>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10 }}>
        <div style={{ flex: 1, minWidth: 220, background: '#f5ddd0', borderRadius: 14, padding: '20px 18px' }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#c0392b', marginBottom: 6 }}>Iberzo</div>
          <p style={{ fontSize: 14, margin: '0 0 12px', lineHeight: 1.6 }}>A competitive tile-drafting strategy game for 2–4 players. Pick colored tiles from shared factories, build your pattern lines, and score points by completing your decorative wall.</p>
          <a href="/" style={{ fontSize: 13, fontWeight: 700, color: '#c0392b', textDecoration: 'none' }}>Play Iberzo →</a>
        </div>
        <div style={{ flex: 1, minWidth: 220, background: '#1a1a2e', borderRadius: 14, padding: '20px 18px', color: '#fff' }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#e94560', marginBottom: 6, letterSpacing: 1 }}>KWERZO</div>
          <p style={{ fontSize: 14, margin: '0 0 12px', lineHeight: 1.6, color: '#cbd5e0' }}>A fast-play tile game where you match shapes or colors to build lines on a shared board. Complete a line of 6 tiles for a <strong style={{ color: '#e94560' }}>Kwerzo</strong> — a big bonus that swings the game!</p>
          <a href="https://www.kwerzo.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 700, color: '#e94560', textDecoration: 'none' }}>Play Kwerzo →</a>
        </div>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 10 }}>Get in Touch</h2>
      <p>We love hearing from players. Whether it's a bug report, a feature idea, or just to say hello — reach out anytime.</p>
      <a
        href="mailto:iberzogames@gmail.com"
        style={{ display: 'inline-block', marginTop: 12, background: '#c0392b', color: 'white', padding: '12px 24px', borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}
      >
        Contact Us
      </a>

      <p style={{ marginTop: 48, fontSize: 13, color: '#9a7060', textAlign: 'center' }}>
        <a href="/how-to-play" style={{ color: '#9a7060' }}>How to Play</a>
        {' · '}
        <a href="/privacy" style={{ color: '#9a7060' }}>Privacy Policy</a>
        {' · '}
        <a href="/delete-account" style={{ color: '#9a7060' }}>Delete Account</a>
        {' · '}
        © 2025 Iberzo. All rights reserved.
      </p>
    </div>
  );
}
