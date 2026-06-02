export default function FriendsPage({ onClose }) {
  return (
    <div className="nav-page">
      <div className="nav-page-header">
        <h2>Friends</h2>
        <button className="nav-page-close" onClick={onClose}>✕</button>
      </div>
      <div className="nav-page-body">
        <div className="placeholder-card">
          <span className="placeholder-icon">👥</span>
          <h3>Coming Soon</h3>
          <p>Friends lists, friend requests, and head-to-head stats are on the way.</p>
        </div>
      </div>
    </div>
  );
}
