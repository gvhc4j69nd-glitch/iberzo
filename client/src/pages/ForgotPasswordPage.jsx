import { useState } from 'react';
import { forgotPassword } from '../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await forgotPassword(email);
      if (result.error) return setError(result.error);
      setSent(true);
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '60px 20px', fontFamily: 'Segoe UI, system-ui, sans-serif', color: '#2d1a0e', textAlign: 'center' }}>
      <img src="/iberzo-logo.png" alt="Iberzo" style={{ width: 80, marginBottom: 20 }} />
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Reset Your Password</h1>

      {sent ? (
        <p style={{ fontSize: 15, color: '#9a7060', lineHeight: 1.7, marginBottom: 32 }}>
          If that email is registered, a password reset link has been sent. Check your inbox.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 15, color: '#9a7060', lineHeight: 1.7, marginBottom: 24 }}>
            Enter the email address on your account and we'll send you a link to reset your password.
          </p>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ width: '100%', maxWidth: 320, padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e0d0c4', fontSize: 15 }}
            />
            {error && <p style={{ color: '#c0392b', fontSize: 13 }}>{error}</p>}
            <button
              type="submit"
              disabled={loading}
              style={{
                background: '#c0392b', color: 'white', padding: '14px 28px', borderRadius: 10,
                fontWeight: 700, fontSize: 15, border: 'none', cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        </>
      )}

      <p style={{ fontSize: 13, color: '#9a7060', lineHeight: 1.6, marginTop: 32 }}>
        <a href="/" style={{ color: '#c0392b' }}>Back to Login</a>
      </p>
    </div>
  );
}
