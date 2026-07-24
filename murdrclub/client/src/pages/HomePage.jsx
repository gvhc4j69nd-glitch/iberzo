import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext.jsx';

export default function HomePage() {
  const { user } = useAuth();
  const [regions, setRegions] = useState([]);

  useEffect(() => {
    api.get('/regions').then(({ regions }) => setRegions(regions)).catch(() => {});
  }, []);

  const totalCases = regions.reduce((sum, r) => sum + r.case_count, 0);

  return (
    <>
      <section className="hero">
        <div className="eyebrow">Est. for the unsolved</div>
        <h1>The hunt for answers doesn't end when the case goes cold.</h1>
        <p>
          murdrclub organizes the world's top unsolved murders by region. Join a case, dig up
          evidence, vote on what other members contribute, and climb the ranks as a trusted
          investigator.
        </p>
        <div className="hero-actions">
          <Link to="/regions" className="btn btn-primary">Browse regions</Link>
          {!user && <Link to="/register" className="btn">Join the club</Link>}
        </div>
      </section>

      <section className="section container">
        <div className="stat-row">
          <div className="stat-tile">
            <div className="num">{regions.length || 20}</div>
            <div className="label">Regions covered</div>
          </div>
          <div className="stat-tile">
            <div className="num">{totalCases}</div>
            <div className="label">Active cases</div>
          </div>
          <div className="stat-tile">
            <div className="num">1–5</div>
            <div className="label">Member-rated evidence</div>
          </div>
        </div>
      </section>

      <section className="section container">
        <h2>How it works</h2>
        <p className="section-sub">Four steps from bystander to investigator.</p>
        <div className="region-grid">
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>1. Join a region</h3>
            <p className="hint">Every case lives under one of 20 regions, from the Midwest US to the Baltic States.</p>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>2. Join the hunt</h3>
            <p className="hint">Sign onto a specific case's investigation group to unlock its chat and evidence feed.</p>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>3. Contribute evidence</h3>
            <p className="hint">Add write-ups, links, photos, and video — anything that moves the case forward.</p>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>4. Get rated, get ranked</h3>
            <p className="hint">Fellow hunters rate your contributions 1–5. Strong track records climb the member leaderboard.</p>
          </div>
        </div>
      </section>

      <section className="section container">
        <h2>Regions</h2>
        <p className="section-sub">Pick a region to see its top unsolved murders.</p>
        <div className="region-grid">
          {regions.slice(0, 8).map(r => (
            <Link key={r.key} to={`/regions/${r.key}`} className="region-card">
              <div className="region-name">{r.name}</div>
              <div className="region-count">{r.case_count} active case{r.case_count === 1 ? '' : 's'}</div>
            </Link>
          ))}
        </div>
        <div style={{ marginTop: 18, textAlign: 'center' }}>
          <Link to="/regions" className="btn">See all regions</Link>
        </div>
      </section>
    </>
  );
}
