export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px', fontFamily: 'Segoe UI, system-ui, sans-serif', color: '#2d1a0e', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Privacy Policy</h1>
      <p style={{ color: '#9a7060', marginBottom: 32 }}>Last updated: June 2025</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28, marginBottom: 8 }}>1. Who We Are</h2>
      <p>Iberzo is a free multiplayer tile board game available at <a href="https://www.iberzo.com" style={{ color: '#c0392b' }}>iberzo.com</a> and on mobile app stores. It is operated by Iberzo (Joseph Peffer).</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28, marginBottom: 8 }}>2. Information We Collect</h2>
      <p>When you create an account we collect:</p>
      <ul style={{ paddingLeft: 20, marginTop: 8 }}>
        <li><strong>Username</strong> — chosen by you, displayed to other players</li>
        <li><strong>Email address</strong> — used only for account recovery</li>
        <li><strong>Password</strong> — stored as a secure hash, never in plain text</li>
      </ul>
      <p style={{ marginTop: 12 }}>During gameplay we collect:</p>
      <ul style={{ paddingLeft: 20, marginTop: 8 }}>
        <li>Game results (wins, losses, scores) for leaderboard purposes</li>
        <li>Friend connections you choose to make within the app</li>
      </ul>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28, marginBottom: 8 }}>3. How We Use Your Information</h2>
      <ul style={{ paddingLeft: 20 }}>
        <li>To provide and operate the game</li>
        <li>To display your username and stats on the leaderboard</li>
        <li>To enable multiplayer features (rooms, invites, friends)</li>
        <li>To send in-app notifications (friend requests, game invites)</li>
        <li>We do <strong>not</strong> sell your data to third parties</li>
        <li>We do <strong>not</strong> use your data for advertising targeting</li>
      </ul>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28, marginBottom: 8 }}>4. Third-Party Services</h2>
      <ul style={{ paddingLeft: 20 }}>
        <li><strong>Google AdSense</strong> — displays ads on the web version. Google may use cookies to serve relevant ads. See <a href="https://policies.google.com/privacy" style={{ color: '#c0392b' }}>Google's Privacy Policy</a>.</li>
        <li><strong>Google Analytics</strong> — collects anonymous usage data (page views, session duration). No personally identifiable information is shared.</li>
        <li><strong>Railway</strong> — our hosting provider stores your data on secure servers in the United States.</li>
      </ul>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28, marginBottom: 8 }}>5. Data Retention</h2>
      <p>Your account and game data is retained for as long as your account is active. You may request deletion of your account and all associated data by emailing <a href="mailto:joecpeffer@gmail.com" style={{ color: '#c0392b' }}>joecpeffer@gmail.com</a>.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28, marginBottom: 8 }}>6. Children's Privacy</h2>
      <p>Iberzo is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us and we will delete it.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28, marginBottom: 8 }}>7. Security</h2>
      <p>Passwords are hashed using bcrypt. All data is transmitted over HTTPS/TLS. We take reasonable measures to protect your information but no system is 100% secure.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28, marginBottom: 8 }}>8. Your Rights</h2>
      <p>You have the right to access, correct, or delete your personal data at any time. Contact us at <a href="mailto:joecpeffer@gmail.com" style={{ color: '#c0392b' }}>joecpeffer@gmail.com</a> with any requests.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28, marginBottom: 8 }}>9. Changes to This Policy</h2>
      <p>We may update this policy from time to time. Changes will be posted at this URL with an updated date.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28, marginBottom: 8 }}>10. Contact</h2>
      <p>Questions about this privacy policy? Email us at <a href="mailto:joecpeffer@gmail.com" style={{ color: '#c0392b' }}>joecpeffer@gmail.com</a></p>

      <p style={{ marginTop: 48, fontSize: 13, color: '#9a7060' }}>© 2025 Iberzo. All rights reserved.</p>
    </div>
  );
}
