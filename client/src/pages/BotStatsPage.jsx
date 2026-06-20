import { useEffect, useState } from 'react';
import { fetchBotStats } from '../lib/api';

const DIFF_ORDER = { easy: 0, medium: 1, hard: 2, demanding: 3, expert: 4 };

export default function BotStatsPage({ token, onClose }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBotStats(token).then(data => {
      setStats(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, [token]);

  const sorted = stats
    ? [...stats].sort((a, b) =>
        (DIFF_ORDER[a.difficulty] ?? 1) - (DIFF_ORDER[b.difficulty] ?? 1) ||
        a.bot_name.localeCompare(b.bot_name)
      )
    : [];

  return (
    <div className="nav-page">
      <div className="nav-page-header">
        <h2>Bot Record</h2>
        <button className="nav-page-close" onClick={onClose}>✕</button>
      </div>

      <div className="nav-page-body">
        {loading && <p className="hint" style={{ padding: 16 }}>Loading…</p>}

        {!loading && sorted.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center' }}>
            <p className="hint">No bot games played yet.</p>
            <p className="hint" style={{ fontSize: 12, marginTop: 6 }}>
              Create a room and add a bot to start tracking your record.
            </p>
          </div>
        )}

        {!loading && sorted.length > 0 && (
          <div className="htp-table-wrap" style={{ padding: '12px 14px' }}>
            <table className="bot-stats-table">
              <thead>
                <tr>
                  <th>Bot</th>
                  <th>Difficulty</th>
                  <th>W</th>
                  <th>L</th>
                  <th>Win %</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => {
                  const total = row.wins + row.losses;
                  const pct = total > 0 ? Math.round((row.wins / total) * 100) : 0;
                  return (
                    <tr key={i}>
                      <td>{row.bot_name}</td>
                      <td>
                        <span className={`difficulty-badge difficulty-${row.difficulty}`}>
                          {row.difficulty}
                        </span>
                      </td>
                      <td className="stat-win">{row.wins}</td>
                      <td className="stat-loss">{row.losses}</td>
                      <td className="stat-pct">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
