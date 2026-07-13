export default function HowToPlayPublicPage() {
  const COLOR_SWATCH = {
    blue: '#4a90d9', yellow: '#f0c97a', red: '#c0634a', black: '#2c2c2c', white: '#6b8c3e',
  };
  const swatch = (color) => (
    <span style={{
      display: 'inline-block', width: 14, height: 14, borderRadius: 3,
      background: COLOR_SWATCH[color], verticalAlign: 'middle', marginRight: 5,
    }} />
  );

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px', fontFamily: 'Segoe UI, system-ui, sans-serif', color: '#2d1a0e', lineHeight: 1.75 }}>
      <a href="/" style={{ display: 'inline-block', marginBottom: 24, color: '#c0392b', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>← Back to Iberzo</a>

      <img src="/iberzo-logo.png" alt="Iberzo" style={{ width: 90, display: 'block', margin: '0 auto 16px' }} />
      <h1 style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', marginBottom: 4, color: '#c0392b' }}>How to Play Iberzo</h1>
      <p style={{ textAlign: 'center', color: '#9a7060', marginBottom: 40, fontSize: 15 }}>
        A fast-paced multiplayer tile-drafting strategy game. Free to play in your browser.
      </p>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, borderBottom: '2px solid #f0c97a', paddingBottom: 6 }}>Overview</h2>
        <p>Iberzo is a competitive tile-drafting game for 2–4 players (or solo against bots). Each round, players take turns picking colored tiles from shared factories, building pattern lines on their personal board, and scoring points by completing rows on their decorative wall. The game ends when any player finishes a full horizontal row on their wall — final bonuses are applied, and the player with the most points wins.</p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, borderBottom: '2px solid #f0c97a', paddingBottom: 6 }}>The Board</h2>
        <p>Each player has a personal board with two main areas:</p>
        <ul style={{ paddingLeft: 22, marginTop: 10 }}>
          <li style={{ marginBottom: 10 }}><strong>Pattern Lines (left side)</strong> — Five rows of increasing length (1 to 5 slots). You fill them with tiles of a single color. Once a row is complete, it scores at round-end.</li>
          <li style={{ marginBottom: 10 }}><strong>Wall (right side)</strong> — A 5×5 grid where completed pattern-line tiles are permanently placed. Each row has a fixed color order — no color can appear twice in the same row or column.</li>
          <li style={{ marginBottom: 10 }}><strong>Floor Line</strong> — Seven penalty slots at the bottom. Overflow tiles and the First Player token land here. Penalties are applied at round-end.</li>
        </ul>
        <p style={{ marginTop: 12 }}>In the center of the table are <strong>factories</strong> — circular displays of 4 tiles each — and a <strong>center pool</strong> where leftover tiles accumulate during the round.</p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, borderBottom: '2px solid #f0c97a', paddingBottom: 6 }}>On Your Turn</h2>
        <ol style={{ paddingLeft: 22, marginTop: 10 }}>
          <li style={{ marginBottom: 12 }}>
            <strong>Pick tiles</strong> — Select all tiles of one color from a single factory <em>or</em> from the center pool.
            When you take from a factory, all remaining tiles from that factory move to the center pool.
            The first player to take from the center pool each round also takes the <strong>First Player token</strong> — it lands in your floor line as a −1 penalty, but you go first next round.
          </li>
          <li style={{ marginBottom: 12 }}>
            <strong>Place tiles</strong> — Put your picked tiles into one of your five pattern lines. Rules:
            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
              <li>A pattern line can only hold <em>one color</em>. You cannot mix colors.</li>
              <li>The corresponding wall slot for that color must not already be filled.</li>
              <li>Any tiles that don't fit go to your floor line as penalties.</li>
              <li>You can also choose to send all tiles directly to the floor line.</li>
            </ul>
          </li>
        </ol>
        <p style={{ marginTop: 8 }}>Play continues clockwise until all factories and the center pool are empty.</p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, borderBottom: '2px solid #f0c97a', paddingBottom: 6 }}>End of Round</h2>
        <ol style={{ paddingLeft: 22, marginTop: 10 }}>
          <li style={{ marginBottom: 10 }}><strong>Score completed pattern lines</strong> — Any pattern line filled all the way moves one tile to the matching spot on your wall and scores points. Remaining tiles in that line are discarded. Incomplete lines stay for next round.</li>
          <li style={{ marginBottom: 10 }}><strong>Apply floor penalties</strong> — Floor tiles subtract points (score cannot go below 0).</li>
          <li style={{ marginBottom: 10 }}><strong>Check for game end</strong> — If any player has a complete horizontal row on their wall, the game ends after this round. Otherwise, tiles are refilled and play continues.</li>
        </ol>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, borderBottom: '2px solid #f0c97a', paddingBottom: 6 }}>Scoring</h2>
        <p>Points are scored each time a tile is placed on the wall:</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: 15 }}>
          <thead>
            <tr style={{ background: '#f5ddd0' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Event</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>Points</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Tile placed with no adjacent tiles', '+1'],
              ['Tile connects horizontally', '+1 per tile in that row'],
              ['Tile connects vertically', '+1 per tile in that column'],
              ['Complete a full wall row (end of game)', '+2'],
              ['Complete a full wall column (end of game)', '+7'],
              ['Place all 5 tiles of one color (end of game)', '+10'],
            ].map(([ev, pts], i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fdf6f0' }}>
                <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0e0d0' }}>{ev}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #f0e0d0', fontWeight: 600, color: '#c0392b' }}>{pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, borderBottom: '2px solid #f0c97a', paddingBottom: 6 }}>Floor Penalties</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: 15 }}>
          <thead>
            <tr style={{ background: '#f5ddd0' }}>
              {['Slot 1','Slot 2','Slot 3','Slot 4','Slot 5','Slot 6','Slot 7'].map(s => (
                <th key={s} style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700 }}>{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {['−1','−1','−2','−2','−2','−3','−3'].map((p, i) => (
                <td key={i} style={{ padding: '8px 12px', textAlign: 'center', color: '#c0392b', fontWeight: 700, background: i % 2 === 0 ? '#fff' : '#fdf6f0' }}>{p}</td>
              ))}
            </tr>
          </tbody>
        </table>
        <p style={{ marginTop: 10, fontSize: 13, color: '#9a7060' }}>Your score can never go below 0 from floor penalties.</p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, borderBottom: '2px solid #f0c97a', paddingBottom: 6 }}>The Wall Pattern</h2>
        <p>Every row on the wall has a fixed color order that rotates each row. A color can only appear <strong>once per row</strong> and <strong>once per column</strong>. Plan your pattern lines carefully — if the matching wall slot is already filled, you cannot use that row for that color again.</p>
        <p style={{ marginTop: 12 }}>The five tile colors are: {[['blue','Blue'],['yellow','Yellow'],['red','Red'],['black','Black'],['white','Green']].map(([c,label]) => (
          <span key={c} style={{ marginRight: 12 }}>{swatch(c)}{label}</span>
        ))}</p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, borderBottom: '2px solid #f0c97a', paddingBottom: 6 }}>Strategy Tips</h2>
        <ul style={{ paddingLeft: 22 }}>
          <li style={{ marginBottom: 10 }}><strong>Complete shorter rows first</strong> — Row 1 (1 slot) scores quickly and frees it up. Row 5 (5 slots) is a big investment.</li>
          <li style={{ marginBottom: 10 }}><strong>Build adjacency</strong> — Tiles that connect to existing wall tiles score more. Aim to cluster your wall tiles for bonus chains.</li>
          <li style={{ marginBottom: 10 }}><strong>Watch the center pool</strong> — Taking from the center gives you more tile choices but costs you the First Player penalty if you're first.</li>
          <li style={{ marginBottom: 10 }}><strong>Denial</strong> — If an opponent needs a color to complete their row, taking it first can be worth it even if it's not your best move.</li>
          <li style={{ marginBottom: 10 }}><strong>End-game bonuses</strong> — A completed column (+7) or full color set (+10) can swing the game. Keep them in mind from round one.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, borderBottom: '2px solid #f0c97a', paddingBottom: 6 }}>Playing Against Bots</h2>
        <p>Iberzo includes AI opponents at six difficulty levels. Solo games (you vs. bots only) count toward the <strong>Bot Leaderboard</strong>, which uses an Elo rating system where each bot acts as a fixed-strength opponent.</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: 15 }}>
          <thead>
            <tr style={{ background: '#f5ddd0' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Difficulty</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Elo Rating</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Play Style</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Easy', '800', 'Avoids the floor; otherwise random'],
              ['Medium', '1000', 'Picks from the top 3 reasonable moves'],
              ['Hard', '1300', 'Always plays the best heuristic move'],
              ['Demanding', '1600', 'Best move + denies opponents good tiles'],
              ['Expert', '1900', 'Full denial + 2-ply lookahead'],
              ['Grandmaster', '2200', '3-ply minimax; extremely hard to beat'],
            ].map(([diff, elo, style], i) => (
              <tr key={diff} style={{ background: i % 2 === 0 ? '#fff' : '#fdf6f0' }}>
                <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0e0d0', fontWeight: 600 }}>{diff}</td>
                <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0e0d0' }}>{elo}</td>
                <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0e0d0', color: '#9a7060' }}>{style}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: 12, fontSize: 14, color: '#9a7060' }}>Beating a harder bot earns more Elo than beating an easy one. The top-rated player earns the <strong>Grand Master</strong> badge on the Bot Leaderboard.</p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, borderBottom: '2px solid #f0c97a', paddingBottom: 6 }}>Leaderboards</h2>
        <p>Iberzo tracks two leaderboards:</p>
        <ul style={{ paddingLeft: 22, marginTop: 10 }}>
          <li style={{ marginBottom: 10 }}><strong>Main Leaderboard</strong> — Elo-rated rankings from multiplayer games against other human players.</li>
          <li style={{ marginBottom: 10 }}><strong>Bot Leaderboard</strong> — Elo-rated rankings from solo games against bots. A win against a Grandmaster bot is worth far more than a win against an Easy bot.</li>
        </ul>
        <p style={{ marginTop: 10 }}>Both leaderboards use a K-factor system: rating swings are larger in your first 10 games (K=40), moderate in games 11–30 (K=24), and settle down after that (K=16).</p>
      </section>

      <div style={{ textAlign: 'center', marginTop: 48, padding: '32px 20px', background: '#f5ddd0', borderRadius: 16 }}>
        <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Ready to play?</p>
        <a href="/" style={{ display: 'inline-block', background: '#c0392b', color: 'white', padding: '14px 32px', borderRadius: 12, fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>
          Play Iberzo Free →
        </a>
      </div>

      <p style={{ marginTop: 48, fontSize: 13, color: '#9a7060', textAlign: 'center' }}>
        <a href="/about" style={{ color: '#9a7060' }}>About</a>
        {' · '}
        <a href="/privacy" style={{ color: '#9a7060' }}>Privacy Policy</a>
        {' · '}
        © 2025 Iberzo. All rights reserved.
      </p>
    </div>
  );
}
