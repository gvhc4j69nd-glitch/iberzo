import { useState, useRef, useEffect } from 'react';

export default function NavMenu({ onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function pick(page) {
    setOpen(false);
    onSelect(page);
  }

  return (
    <div className="nav-menu-wrap" ref={ref}>
      <button
        className={`nav-menu-btn ${open ? 'open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="Menu"
      >
        <span className="nav-menu-icon">
          <span /><span /><span />
        </span>
      </button>
      {open && (
        <div className="nav-menu-dropdown">
          <button onClick={() => pick('account')}>
            <span className="nav-menu-item-icon">👤</span> Account
          </button>
          <button onClick={() => pick('howtoplay')}>
            <span className="nav-menu-item-icon">📖</span> How to Play
          </button>
          <button onClick={() => pick('friends')}>
            <span className="nav-menu-item-icon">👥</span> Friends
          </button>
        </div>
      )}
    </div>
  );
}
