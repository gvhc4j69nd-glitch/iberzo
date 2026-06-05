export default function DeleteAccountPage() {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '60px 20px', fontFamily: 'Segoe UI, system-ui, sans-serif', color: '#2d1a0e', textAlign: 'center' }}>
      <img src="/iberzo-logo.png" alt="Iberzo" style={{ width: 80, marginBottom: 20 }} />
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Delete Your Account</h1>
      <p style={{ fontSize: 15, color: '#9a7060', lineHeight: 1.7, marginBottom: 32 }}>
        To request deletion of your Iberzo account and all associated data (username, email, game history, scores, and friends), send us an email using the button below.
        We will process your request within 7 days.
      </p>
      <a
        href="mailto:joecpeffer@gmail.com?subject=Account Deletion Request&body=Please delete my Iberzo account and all associated data. My username is: "
        style={{
          display: 'inline-block',
          background: '#c0392b',
          color: 'white',
          padding: '14px 28px',
          borderRadius: 10,
          fontWeight: 700,
          fontSize: 15,
          textDecoration: 'none',
          marginBottom: 32,
        }}
      >
        Request Account Deletion
      </a>
      <p style={{ fontSize: 13, color: '#9a7060', lineHeight: 1.6 }}>
        Please include your <strong>username</strong> in the email so we can locate your account.
        <br />
        Questions? See our <a href="/privacy" style={{ color: '#c0392b' }}>Privacy Policy</a>.
      </p>
    </div>
  );
}
