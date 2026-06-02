export default function HowToPlayPage({ onClose }) {
  return (
    <div className="nav-page">
      <div className="nav-page-header">
        <h2>How to Play</h2>
        <button className="nav-page-close" onClick={onClose}>✕</button>
      </div>

      <div className="nav-page-body htp-body">

        <section className="htp-section">
          <h3>Objective</h3>
          <p>Score the most points by drafting colorful tiles from factories and placing them on your wall. The game ends when any player completes a full horizontal row on their wall.</p>
        </section>

        <section className="htp-section">
          <h3>Turn Structure</h3>
          <ol className="htp-list">
            <li><strong>Pick tiles</strong> — Select all tiles of one color from any single factory or the center pool. Leftover tiles from the factory move to the center.</li>
            <li><strong>Place tiles</strong> — Put them in one of your 5 pattern lines (left side) or discard them to your floor line.</li>
            <li>Play passes clockwise. The player who took from the center first gets the <strong>First Player token</strong> — a floor penalty but they go first next round.</li>
          </ol>
        </section>

        <section className="htp-section">
          <h3>End of Round</h3>
          <p>When all tiles are gone, any <strong>completed</strong> pattern line (filled all the way) moves one tile onto your wall. The rest are discarded. Then floor penalties are applied.</p>
        </section>

        <section className="htp-section">
          <h3>Scoring</h3>
          <div className="htp-table-wrap">
            <table className="htp-table">
            <thead>
              <tr><th>Event</th><th>Points</th></tr>
            </thead>
            <tbody>
              <tr><td>Place a tile (isolated)</td><td>+1</td></tr>
              <tr><td>Tile connects horizontally</td><td>+1 per tile in row</td></tr>
              <tr><td>Tile connects vertically</td><td>+1 per tile in col</td></tr>
              <tr><td>Complete a wall row</td><td>+2 bonus</td></tr>
              <tr><td>Complete a wall column</td><td>+7 bonus</td></tr>
              <tr><td>Place all 5 of one color</td><td>+10 bonus</td></tr>
            </tbody>
            </table>
          </div>
          <p style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>Row and column bonuses are awarded at game end.</p>
        </section>

        <section className="htp-section">
          <h3>Floor Penalties</h3>
          <div className="htp-table-wrap">
            <table className="htp-table">
              <thead>
                <tr><th>Slot</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th></tr>
              </thead>
              <tbody>
                <tr><td>Penalty</td><td>−1</td><td>−1</td><td>−2</td><td>−2</td><td>−2</td><td>−3</td><td>−3</td></tr>
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>Score cannot go below 0 from floor penalties.</p>
        </section>

        <section className="htp-section">
          <h3>Wall Pattern</h3>
          <p>Each row on the wall has a fixed color order. A color can only appear once per row and once per column — plan your pattern lines accordingly.</p>
        </section>

        <section className="htp-section">
          <h3>Game End</h3>
          <p>The game ends at the <strong>end of the round</strong> in which any player completes a full horizontal wall row. Final bonuses are applied, then the player with the most points wins.</p>
        </section>

      </div>
    </div>
  );
}
