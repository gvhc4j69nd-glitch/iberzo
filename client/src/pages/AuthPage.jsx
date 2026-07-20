import { useState } from 'react';
import { register, login } from '../lib/api';
import GameDemo from '../components/GameDemo';
import TutorialModal from '../components/TutorialModal';
import PrivacyModal from '../components/PrivacyModal';
import HowToPlayPage from './HowToPlayPage';

export default function AuthPage({ onAuth, sessionExpired }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState(sessionExpired ? 'Your session expired — please log in again.' : '');
  const [showTutorial, setShowTutorial] = useState(false);
  const [showHtp, setShowHtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (mode === 'register' && !agreedToPrivacy) {
      return setError('You must read and agree to the Privacy Policy to register.');
    }
    const result = mode === 'login'
      ? await login(form.username, form.password)
      : await register(form.username, form.email, form.password);
    if (result.error) return setError(result.error);
    localStorage.setItem('token', result.token);
    localStorage.setItem('username', result.username);
    onAuth(result.token, result.username);
  }

  if (showHtp) {
    return (
      <div className="landing-page" style={{ justifyContent: 'flex-start', paddingTop: 20 }}>
        <HowToPlayPage onClose={() => setShowHtp(false)} />
      </div>
    );
  }

  return (
    <div className="landing-page">
      {showTutorial && (
        <TutorialModal
          onClose={() => setShowTutorial(false)}
          onHowToPlay={() => { setShowTutorial(false); setShowHtp(true); }}
        />
      )}
      {showPrivacyModal && (
        <PrivacyModal onClose={() => setShowPrivacyModal(false)} />
      )}
      <img src="/iberzo-logo.png" alt="Iberzo" className="landing-logo" />
      <p className="tagline-text">The challenging tile game you can play with friends, strangers, or challenging bots!</p>
      <h3 style={{margin:'8px 0 4px',fontSize:13,fontWeight:700,color:'#9a7060',letterSpacing:'0.5px',textTransform:'uppercase'}}>Demonstration of Play</h3>
      <GameDemo />
      <button className="tut-launch-btn" onClick={() => setShowTutorial(true)}>
        ▶ Watch Tutorial
      </button>
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
          <div className="password-field">
            <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
            <button type="button" className="password-toggle" onClick={() => setShowPassword(v => !v)}>{showPassword ? '🙈' : '👁'}</button>
          </div>
          {mode === 'register' && (
            <label className="privacy-checkbox-row">
              <input
                type="checkbox"
                checked={agreedToPrivacy}
                onChange={e => setAgreedToPrivacy(e.target.checked)}
              />
              <span>
                I have read and understand Iberzo's{' '}
                <button type="button" onClick={() => setShowPrivacyModal(true)}>
                  Privacy Policy
                </button>
              </span>
            </label>
          )}
          {error && <p className="error">{error}</p>}
          <button type="submit">{mode === 'login' ? 'Login' : 'Register'}</button>
        </form>
        {mode === 'login' && (
          <p style={{ fontSize: 12, color: '#9a7060', textAlign: 'center', marginTop: 8 }}>
            <a href="/forgot-password" style={{ color: '#9a7060' }}>Forgot password?</a>
          </p>
        )}
        <p style={{ fontSize: 11, color: '#9a7060', textAlign: 'center', marginTop: 4 }}>
          <a href="/about" style={{ color: '#9a7060' }}>About Us</a>
          {' · '}
          <a href="mailto:iberzogames@gmail.com" style={{ color: '#9a7060' }}>Contact Us</a>
          {' · '}
          <a href="/privacy" style={{ color: '#9a7060' }}>Privacy</a>
          {' · '}
          <a href="/delete-account" style={{ color: '#9a7060' }}>Delete Account</a>
        </p>
      </div>

      {/* Kwerzo cross-promo */}
      <a href="https://www.kwerzo.com" target="_blank" rel="noopener noreferrer" className="kwerzo-promo-card">
        <div className="kwerzo-promo-inner">
          <div className="kwerzo-promo-logo"><span className="kwerzo-k">K</span>wer<span className="kwerzo-z">z</span>o</div>
          <p className="kwerzo-promo-text">Love tile games? Try our other game — the fast-paced cosmic tile-matching challenge!</p>
          <span className="kwerzo-promo-cta">Play free at kwerzo.com →</span>
        </div>
      </a>
    </div>
  );
}
