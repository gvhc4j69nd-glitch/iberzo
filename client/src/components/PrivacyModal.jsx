export default function PrivacyModal({ onClose }) {
  return (
    <div className="privacy-modal-overlay" onClick={onClose}>
      <div className="privacy-modal" onClick={e => e.stopPropagation()}>
        <div className="privacy-modal-header">
          <h2 style={{ margin: 0, fontSize: 18 }}>Privacy Policy</h2>
          <button className="tut-close" onClick={onClose}>✕ Close</button>
        </div>
        <div className="privacy-modal-body">
          <p style={{ color: '#9a7060', marginBottom: 24 }}>Last updated: June 2025</p>

          <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 20, marginBottom: 6 }}>1. Who We Are</h3>
          <p>Iberzo is a free multiplayer tile board game available at <a href="https://www.iberzo.com" target="_blank" rel="noreferrer" style={{ color: '#c0392b' }}>iberzo.com</a> and on mobile app stores. It is operated by Iberzo (Joseph Peffer).</p>

          <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 20, marginBottom: 6 }}>2. Information We Collect</h3>
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

          <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 20, marginBottom: 6 }}>3. How We Use Your Information</h3>
          <ul style={{ paddingLeft: 20 }}>
            <li>To provide and operate the game</li>
            <li>To display your username and stats on the leaderboard</li>
            <li>To enable multiplayer features (rooms, invites, friends)</li>
            <li>To send in-app notifications (friend requests, game invites)</li>
            <li>We do <strong>not</strong> sell your data to third parties</li>
            <li>We do <strong>not</strong> use your data for advertising targeting</li>
          </ul>

          <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 20, marginBottom: 6 }}>4. Third-Party Services</h3>
          <ul style={{ paddingLeft: 20 }}>
            <li><strong>Google AdSense</strong> — displays ads on the web version. Google may use cookies to serve relevant ads. See <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" style={{ color: '#c0392b' }}>Google's Privacy Policy</a>.</li>
            <li><strong>Google Analytics</strong> — collects anonymous usage data (page views, session duration). No personally identifiable information is shared.</li>
            <li><strong>Railway</strong> — our hosting provider stores your data on secure servers in the United States.</li>
          </ul>

          <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 20, marginBottom: 6 }}>5. Data Retention</h3>
          <p>Your account and game data is retained for as long as your account is active. You may request deletion of your account and all associated data by emailing <a href="mailto:joecpeffer@gmail.com" style={{ color: '#c0392b' }}>joecpeffer@gmail.com</a>.</p>

          <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 20, marginBottom: 6 }}>6. Children's Privacy</h3>
          <p>Iberzo is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us and we will delete it.</p>

          <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 20, marginBottom: 6 }}>7. Security</h3>
          <p>Passwords are hashed using bcrypt. All data is transmitted over HTTPS/TLS. We take reasonable measures to protect your information but no system is 100% secure.</p>

          <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 20, marginBottom: 6 }}>8. Your Rights</h3>
          <p>You have the right to access, correct, or delete your personal data at any time. Contact us at <a href="mailto:joecpeffer@gmail.com" style={{ color: '#c0392b' }}>joecpeffer@gmail.com</a> with any requests.</p>

          <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 20, marginBottom: 6 }}>9. Changes to This Policy</h3>
          <p>We may update this policy from time to time. Changes will be posted at this URL with an updated date.</p>

          <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 20, marginBottom: 6 }}>10. Contact</h3>
          <p>Questions about this privacy policy? Email us at <a href="mailto:joecpeffer@gmail.com" style={{ color: '#c0392b' }}>joecpeffer@gmail.com</a></p>

          <p style={{ marginTop: 32, fontSize: 13, color: '#9a7060' }}>© 2025 Iberzo. All rights reserved.</p>
        </div>
        <div className="privacy-modal-footer">
          <button className="primary-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
