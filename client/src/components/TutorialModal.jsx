import { useState } from 'react';

const C = {
  blue:   '#4a90d9',
  yellow: '#f0c97a',
  red:    '#c0634a',
  black:  '#2c2c2c',
  white:  '#6b8c3e',
};

// 5-slot pattern line helper: returns array of tile colors (filled from right)
function line(slots, color, count) {
  return Array.from({ length: slots }, (_, i) => (i >= slots - count ? color : null));
}

// Mini wall: 5x5, just booleans + color from WALL_PATTERN
const WALL_PATTERN = [
  ['blue','yellow','red','black','white'],
  ['white','blue','yellow','red','black'],
  ['black','white','blue','yellow','red'],
  ['red','black','white','blue','yellow'],
  ['yellow','red','black','white','blue'],
];

const EMPTY_WALL = Array.from({ length: 5 }, () => Array(5).fill(false));
function setWall(base, row, color) {
  const w = base.map(r => [...r]);
  const col = WALL_PATTERN[row].indexOf(color);
  if (col >= 0) w[row][col] = true;
  return w;
}

// ── Scene definitions ──────────────────────────────────────────────────────
const SCENES = [
  {
    title: 'Welcome to Iberzo!',
    text: 'Each round, players take turns drafting colored tiles from factories in the center. Let\'s walk through one full round.',
    factories: [
      ['blue','blue','red','yellow'],
      ['red','red','black','white'],
      ['yellow','yellow','blue','black'],
    ],
    center: [],
    p1Lines: [line(1,null,0),line(2,null,0),line(3,null,0),line(4,null,0),line(5,null,0)],
    p2Lines: [line(1,null,0),line(2,null,0),line(3,null,0),line(4,null,0),line(5,null,0)],
    p1Wall: EMPTY_WALL,
    p2Wall: EMPTY_WALL,
    highlightFactory: null,
    highlightP1Row: null,
    highlightP2Row: null,
    scorePopup: null,
    floorP1: [],
    floorP2: [],
  },
  {
    title: 'Player 1 picks tiles',
    text: 'Player 1 picks ALL blue tiles from Factory 1. You must take every tile of the chosen color from that factory.',
    factories: [
      ['red','yellow'],       // blue removed
      ['red','red','black','white'],
      ['yellow','yellow','blue','black'],
    ],
    center: ['yellow'],       // leftover non-blue goes to center
    p1Lines: [line(1,null,0),line(2,'blue',2),line(3,null,0),line(4,null,0),line(5,null,0)],
    p2Lines: [line(1,null,0),line(2,null,0),line(3,null,0),line(4,null,0),line(5,null,0)],
    p1Wall: EMPTY_WALL,
    p2Wall: EMPTY_WALL,
    highlightFactory: 0,
    highlightP1Row: 1,
    highlightP2Row: null,
    scorePopup: null,
    floorP1: [],
    floorP2: [],
  },
  {
    title: 'Leftovers go to the center',
    text: 'The remaining tiles from Factory 1 (red & yellow) move to the center pool. Anyone can take from the center on their turn.',
    factories: [
      [],
      ['red','red','black','white'],
      ['yellow','yellow','blue','black'],
    ],
    center: ['red','yellow'],
    p1Lines: [line(1,null,0),line(2,'blue',2),line(3,null,0),line(4,null,0),line(5,null,0)],
    p2Lines: [line(1,null,0),line(2,null,0),line(3,null,0),line(4,null,0),line(5,null,0)],
    p1Wall: EMPTY_WALL,
    p2Wall: EMPTY_WALL,
    highlightFactory: null,
    highlightP1Row: null,
    highlightP2Row: null,
    scorePopup: null,
    floorP1: [],
    floorP2: [],
  },
  {
    title: 'Player 2 picks tiles',
    text: 'Player 2 picks both red tiles from Factory 2 and places them on Row 1 — which only holds 1 tile. The extra goes to the floor line.',
    factories: [
      [],
      ['black','white'],      // red removed
      ['yellow','yellow','blue','black'],
    ],
    center: ['red','yellow'],
    p1Lines: [line(1,null,0),line(2,'blue',2),line(3,null,0),line(4,null,0),line(5,null,0)],
    p2Lines: [line(1,'red',1),line(2,null,0),line(3,null,0),line(4,null,0),line(5,null,0)],
    p1Wall: EMPTY_WALL,
    p2Wall: EMPTY_WALL,
    highlightFactory: 1,
    highlightP1Row: null,
    highlightP2Row: 0,
    scorePopup: null,
    floorP1: [],
    floorP2: ['red'],         // overflow
  },
  {
    title: 'Player 1 picks yellow',
    text: 'Player 1 takes yellow tiles from Factory 3 and fills Row 3 (3 slots). Row 3 is now complete — it will score at end of round.',
    factories: [
      [],
      ['black','white'],
      ['blue','black'],       // yellow removed
    ],
    center: ['red','yellow'],
    p1Lines: [line(1,null,0),line(2,'blue',2),line(3,'yellow',3),line(4,null,0),line(5,null,0)],
    p2Lines: [line(1,'red',1),line(2,null,0),line(3,null,0),line(4,null,0),line(5,null,0)],
    p1Wall: EMPTY_WALL,
    p2Wall: EMPTY_WALL,
    highlightFactory: 2,
    highlightP1Row: 2,
    highlightP2Row: null,
    scorePopup: null,
    floorP1: [],
    floorP2: ['red'],
  },
  {
    title: 'Player 2 takes from center',
    text: 'Player 2 takes yellow from the center. Taking from the center gives the first-player marker — a −1 floor penalty, but you start next round first.',
    factories: [
      [],
      ['black','white'],
      ['blue','black'],
    ],
    center: ['red'],
    p1Lines: [line(1,null,0),line(2,'blue',2),line(3,'yellow',3),line(4,null,0),line(5,null,0)],
    p2Lines: [line(1,'red',1),line(2,'yellow',2),line(3,null,0),line(4,null,0),line(5,null,0)],
    p1Wall: EMPTY_WALL,
    p2Wall: EMPTY_WALL,
    highlightFactory: null,
    highlightP1Row: null,
    highlightP2Row: 1,
    scorePopup: null,
    floorP1: [],
    floorP2: ['red','first'],
  },
  {
    title: 'All factories empty — round ends!',
    text: 'When all factories and the center are empty, the round ends. Completed pattern lines now score onto the wall.',
    factories: [[],[],[]],
    center: [],
    p1Lines: [line(1,null,0),line(2,'blue',2),line(3,'yellow',3),line(4,null,0),line(5,null,0)],
    p2Lines: [line(1,'red',1),line(2,'yellow',2),line(3,null,0),line(4,null,0),line(5,null,0)],
    p1Wall: EMPTY_WALL,
    p2Wall: EMPTY_WALL,
    highlightFactory: null,
    highlightP1Row: 2,
    highlightP2Row: 0,
    scorePopup: null,
    floorP1: [],
    floorP2: ['red','first'],
  },
  {
    title: 'Player 1 scores Row 3',
    text: 'Player 1\'s completed yellow Row 3 tiles onto the wall. The tile earns +1 point (isolated tile). The other 2 yellow tiles are discarded.',
    factories: [[],[],[]],
    center: [],
    p1Lines: [line(1,null,0),line(2,'blue',2),line(3,null,0),line(4,null,0),line(5,null,0)],
    p2Lines: [line(1,'red',1),line(2,'yellow',2),line(3,null,0),line(4,null,0),line(5,null,0)],
    p1Wall: setWall(EMPTY_WALL, 2, 'yellow'),
    p2Wall: EMPTY_WALL,
    highlightFactory: null,
    highlightP1Row: null,
    highlightP2Row: null,
    scorePopup: { player: 1, pts: '+1', row: 2 },
    floorP1: [],
    floorP2: ['red','first'],
  },
  {
    title: 'Player 2 scores Row 1',
    text: 'Player 2\'s completed red Row 1 tiles onto the wall — earning +1 point. Row 2 was not complete so it stays for next round.',
    factories: [[],[],[]],
    center: [],
    p1Lines: [line(1,null,0),line(2,'blue',2),line(3,null,0),line(4,null,0),line(5,null,0)],
    p2Lines: [line(1,null,0),line(2,'yellow',2),line(3,null,0),line(4,null,0),line(5,null,0)],
    p1Wall: setWall(EMPTY_WALL, 2, 'yellow'),
    p2Wall: setWall(EMPTY_WALL, 0, 'red'),
    highlightFactory: null,
    highlightP1Row: null,
    highlightP2Row: null,
    scorePopup: { player: 2, pts: '+1', row: 0 },
    floorP1: [],
    floorP2: ['first'],
  },
  {
    title: 'Floor line penalties apply',
    text: 'Player 2\'s floor line had 1 overflow tile (−1) plus the first-player marker (−1) = −2 points total. Keep your floor clean!',
    factories: [[],[],[]],
    center: [],
    p1Lines: [line(1,null,0),line(2,'blue',2),line(3,null,0),line(4,null,0),line(5,null,0)],
    p2Lines: [line(1,null,0),line(2,'yellow',2),line(3,null,0),line(4,null,0),line(5,null,0)],
    p1Wall: setWall(EMPTY_WALL, 2, 'yellow'),
    p2Wall: setWall(EMPTY_WALL, 0, 'red'),
    highlightFactory: null,
    highlightP1Row: null,
    highlightP2Row: null,
    scorePopup: { player: 2, pts: '−2', row: -1, penalty: true },
    floorP1: [],
    floorP2: [],
  },
  {
    title: 'End of round scores',
    text: 'After penalties: Player 1 has 1 pt · Player 2 has 0 pts (1 − 2 = −1, floored to 0). Incomplete lines carry over to the next round.',
    factories: [[],[],[]],
    center: [],
    p1Lines: [line(1,null,0),line(2,'blue',2),line(3,null,0),line(4,null,0),line(5,null,0)],
    p2Lines: [line(1,null,0),line(2,'yellow',2),line(3,null,0),line(4,null,0),line(5,null,0)],
    p1Wall: setWall(EMPTY_WALL, 2, 'yellow'),
    p2Wall: setWall(EMPTY_WALL, 0, 'red'),
    highlightFactory: null,
    highlightP1Row: null,
    highlightP2Row: null,
    scorePopup: null,
    floorP1: [],
    floorP2: [],
    scores: { p1: 1, p2: 0 },
  },
  {
    title: 'You\'re ready to play!',
    text: 'That\'s one round of Iberzo. Complete rows, columns, and color sets to earn big bonuses at game end. The highest score wins!',
    factories: [[],[],[]],
    center: [],
    p1Lines: [line(1,null,0),line(2,'blue',2),line(3,null,0),line(4,null,0),line(5,null,0)],
    p2Lines: [line(1,null,0),line(2,'yellow',2),line(3,null,0),line(4,null,0),line(5,null,0)],
    p1Wall: setWall(EMPTY_WALL, 2, 'yellow'),
    p2Wall: setWall(EMPTY_WALL, 0, 'red'),
    highlightFactory: null,
    highlightP1Row: null,
    highlightP2Row: null,
    scorePopup: null,
    floorP1: [],
    floorP2: [],
    scores: { p1: 1, p2: 0 },
    final: true,
  },
];

// ── Sub-components ────────────────────────────────────────────────────────

function MiniTile({ color, faded, highlight }) {
  return (
    <div className="tut-tile" style={{
      background: color ? C[color] : 'transparent',
      border: color ? 'none' : '1.5px dashed #ccc',
      opacity: faded ? 0.3 : 1,
      boxShadow: highlight ? `0 0 0 2px white, 0 0 0 4px ${C[color]}` : 'none',
    }} />
  );
}

function MiniFactory({ tiles, highlighted }) {
  return (
    <div className={`tut-factory ${highlighted ? 'tut-factory-hl' : ''}`}>
      {Array.from({ length: 4 }).map((_, i) => (
        <MiniTile key={i} color={tiles[i] || null} />
      ))}
    </div>
  );
}

function MiniPatternLine({ tiles, highlightRow, rowIdx }) {
  const hl = highlightRow === rowIdx;
  return (
    <div className={`tut-pline ${hl ? 'tut-pline-hl' : ''}`}>
      {tiles.map((c, i) => <MiniTile key={i} color={c} highlight={hl && !!c} />)}
    </div>
  );
}

function MiniWall({ wall }) {
  return (
    <div className="tut-wall">
      {wall.map((row, r) => (
        <div key={r} className="tut-wall-row">
          {row.map((filled, c) => {
            const color = WALL_PATTERN[r][c];
            return (
              <div key={c} className="tut-tile" style={{
                background: filled ? C[color] : C[color] + '28',
                border: filled ? 'none' : `1.5px solid ${C[color]}55`,
              }} />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function MiniFloor({ tiles }) {
  if (!tiles.length) return null;
  return (
    <div className="tut-floor">
      {tiles.map((t, i) => (
        <div key={i} className="tut-floor-tile" style={{
          background: t === 'first' ? '#f5c842' : C[t] || '#ccc',
        }}>
          {t === 'first' ? '1' : ''}
        </div>
      ))}
    </div>
  );
}

function PlayerBoard({ label, lines, wall, highlightRow, floor, score, scorePopup }) {
  return (
    <div className="tut-board">
      <div className="tut-board-label">{label}{score != null ? <span className="tut-score-badge">{score} pts</span> : null}</div>
      <div className="tut-board-inner">
        <div className="tut-pattern">
          {lines.map((row, i) => (
            <MiniPatternLine key={i} tiles={row} highlightRow={highlightRow} rowIdx={i} />
          ))}
        </div>
        <MiniWall wall={wall} />
      </div>
      {floor.length > 0 && <MiniFloor tiles={floor} />}
      {scorePopup && (
        <div className={`tut-score-popup ${scorePopup.penalty ? 'penalty' : ''}`}>
          {scorePopup.pts}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function TutorialModal({ onClose, onHowToPlay }) {
  const [step, setStep] = useState(0);
  const scene = SCENES[step];

  return (
    <div className="tut-overlay" onClick={onClose}>
      <div className="tut-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="tut-header">
          <span className="tut-step-counter">Step {step + 1} / {SCENES.length}</span>
          <button className="tut-close" onClick={onClose}>✕</button>
        </div>

        {/* Progress bar */}
        <div className="tut-progress-track">
          <div className="tut-progress-fill" style={{ width: `${((step + 1) / SCENES.length) * 100}%` }} />
        </div>

        {/* Scene title + text */}
        <div className="tut-text">
          <h3 className="tut-title">{scene.title}</h3>
          <p className="tut-desc">{scene.text}</p>
        </div>

        {/* Factories */}
        <div className="tut-factories">
          <span className="tut-area-label">Factories</span>
          <div className="tut-factory-row">
            {scene.factories.map((f, i) => (
              <MiniFactory key={i} tiles={f} highlighted={scene.highlightFactory === i} />
            ))}
            {scene.center.length > 0 && (
              <div className="tut-center">
                <span className="tut-center-label">Center</span>
                <div className="tut-center-tiles">
                  {scene.center.map((c, i) => (
                    <MiniTile key={i} color={c === 'first' ? 'yellow' : c} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Player boards */}
        <div className="tut-boards">
          <PlayerBoard
            label="Player 1"
            lines={scene.p1Lines}
            wall={scene.p1Wall}
            highlightRow={scene.highlightP1Row}
            floor={scene.floorP1}
            score={scene.scores?.p1}
            scorePopup={scene.scorePopup?.player === 1 ? scene.scorePopup : null}
          />
          <PlayerBoard
            label="Player 2"
            lines={scene.p2Lines}
            wall={scene.p2Wall}
            highlightRow={scene.highlightP2Row}
            floor={scene.floorP2}
            score={scene.scores?.p2}
            scorePopup={scene.scorePopup?.player === 2 ? scene.scorePopup : null}
          />
        </div>

        {/* Navigation */}
        <div className="tut-nav">
          <button
            className="tut-btn tut-btn-back"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
          >← Back</button>

          {!scene.final ? (
            <button
              className="tut-btn tut-btn-next"
              onClick={() => setStep(s => s + 1)}
            >Next →</button>
          ) : (
            <button
              className="tut-btn tut-btn-htp"
              onClick={onHowToPlay}
            >📖 Full Rules</button>
          )}
        </div>
      </div>
    </div>
  );
}
