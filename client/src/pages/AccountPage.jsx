import { useState } from 'react';
import { changePassword } from '../lib/api';

export default function AccountPage({ username, token, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState(null); // { type: 'success'|'error', msg }
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleChangePassword(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', msg: 'New passwords do not match' });
      return;
    }
    setLoading(true);
    setStatus(null);
    const res = await changePassword(token, currentPassword, newPassword);
    setLoading(false);
    if (res.ok) {
      setStatus({ type: 'success', msg: 'Password updated successfully' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } else {
      setStatus({ type: 'error', msg: res.error || 'Failed to update password' });
    }
  }

  return (
    <div className="nav-page">
      <div className="nav-page-header">
        <h2>Account</h2>
        <button className="nav-page-close" onClick={onClose}>✕</button>
      </div>

      <div className="nav-page-body">
        <div className="account-info-card">
          <div className="account-field">
            <span className="account-label">Username</span>
            <span className="account-value">{username}</span>
          </div>
        </div>

        <div className="account-section">
          <h3>Change Password</h3>
          <form onSubmit={handleChangePassword} className="account-form">
            <div className="form-group">
              <label>Current Password</label>
              <div className="password-field">
                <input type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Enter current password" required />
                <button type="button" className="password-toggle" onClick={() => setShowCurrent(v => !v)}>{showCurrent ? '🙈' : '👁'}</button>
              </div>
            </div>
            <div className="form-group">
              <label>New Password</label>
              <div className="password-field">
                <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 6 characters" minLength={6} required />
                <button type="button" className="password-toggle" onClick={() => setShowNew(v => !v)}>{showNew ? '🙈' : '👁'}</button>
              </div>
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <div className="password-field">
                <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat new password" required />
                <button type="button" className="password-toggle" onClick={() => setShowConfirm(v => !v)}>{showConfirm ? '🙈' : '👁'}</button>
              </div>
            </div>
            {status && (
              <p className={status.type === 'success' ? 'account-success' : 'error'}>
                {status.msg}
              </p>
            )}
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
