import { useEffect, useState } from 'react';
import { verifyEmail } from '../lib/api';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [error, setError] = useState('');

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setStatus('error');
      setError('Missing verification token.');
      return;
    }
    verifyEmail(token).then(result => {
      if (result.error) {
        setStatus('error');
        setError(result.error);
      } else {
        setStatus('success');
      }
    }).catch(() => {
      setStatus('error');
      setError('Could not reach the server. Please check your connection and try again.');
    });
  }, []);

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '60px 20px', fontFamily: 'Segoe UI, system-ui, sans-serif', color: '#2d1a0e', textAlign: 'center' }}>
      <img src="/iberzo-logo.png" alt="Iberzo" style={{ width: 80, marginBottom: 20 }} />

      {status === 'verifying' && (
        <p style={{ fontSize: 15, color: '#9a7060' }}>Verifying your email…</p>
      )}

      {status === 'success' && (
        <>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Email Verified!</h1>
          <p style={{ fontSize: 15, color: '#9a7060', lineHeight: 1.7, marginBottom: 32 }}>
            Your email address has been confirmed. You're all set.
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Verification Failed</h1>
          <p style={{ fontSize: 15, color: '#9a7060', lineHeight: 1.7, marginBottom: 32 }}>
            {error || 'This verification link is invalid or has expired.'} You can request a new one from your account page after logging in.
          </p>
        </>
      )}

      <a
        href="/"
        style={{
          display: 'inline-block',
          background: '#c0392b',
          color: 'white',
          padding: '14px 28px',
          borderRadius: 10,
          fontWeight: 700,
          fontSize: 15,
          textDecoration: 'none',
        }}
      >
        Go to Iberzo
      </a>
    </div>
  );
}
