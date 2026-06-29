import { useState } from 'react';
import { resetPassword } from '../lib/api';

export default function ResetPasswordPage() {
  const token = new URLSearchParams(window.location.search).get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError('Passwords do not match');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      const result = await resetPassword(token, password);
      if (result.error) return setError(result.error);
      setDone(true);
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '60px 20px', fontFamily: 'Segoe UI, system-ui, sans-serif', color: '#2d1a0e', textAlign: 'center' }}>
      <img src="/iberzo-logo.png" alt="Iberzo" style={{ width: 80, marginBottom: 20 }} />
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Set a New Password</h1>

      {!token ? (
        <p style={{ fontSize: 15, color: '#9a7060', lineHeight: 1.7, marginBottom: 32 }}>
          This reset link is missing its token. Please use the link from your email, or
          {' '}<a href="/forgot-password" style={{ color: '#c0392b' }}>request a new one</a>.
        </p>
      ) : done ? (
        <p style={{ fontSize: 15, color: '#9a7060', lineHeight: 1.7, marginBottom: 32 }}>
          Your password has been reset. You can now log in with your new password.
        </p>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: '100%', maxWidth: 320, padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e0d0c4', fontSize: 15 }}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
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
            {loading ? 'Saving…' : 'Reset Password'}
          </button>
        </form>
      )}

      <p style={{ fontSize: 13, color: '#9a7060', lineHeight: 1.6, marginTop: 32 }}>
        <a href="/" style={{ color: '#c0392b' }}>Back to Login</a>
      </p>
    </div>
  );
}
