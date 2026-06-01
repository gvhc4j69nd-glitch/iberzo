import { useState } from 'react';
import { register, login } from '../lib/api';

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    const result = mode === 'login'
      ? await login(form.username, form.password)
      : await register(form.username, form.email, form.password);
    if (result.error) return setError(result.error);
    localStorage.setItem('token', result.token);
    localStorage.setItem('username', result.username);
    onAuth(result.token, result.username);
  }

  return (
    <div className="auth-page">
      <img src="/iberzo-logo.png" alt="Iberzo" style={{ width: 220, maxWidth: '80vw' }} />
      <div className="auth-card">
        <div className="tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Register</button>
        </div>
        <form onSubmit={submit}>
          <input placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
          {mode === 'register' && (
            <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          )}
          <input type="password" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          {error && <p className="error">{error}</p>}
          <button type="submit">{mode === 'login' ? 'Login' : 'Register'}</button>
        </form>
      </div>
    </div>
  );
}
