import { useEffect, useRef, useState } from 'react';

const COLOR_HEX = {
  blue:   '#4a90d9',
  yellow: '#f0c97a',
  red:    '#c0634a',
  black:  '#2c2c2c',
  white:  '#6b8c3e',
};
const WALL_PATTERN = [
  ['blue','yellow','red','black','white'],
  ['white','blue','yellow','red','black'],
  ['black','white','blue','yellow','red'],
  ['red','black','white','blue','yellow'],
  ['yellow','red','black','white','blue'],
];

// A fixed demo scenario that looks like a real mid-game state.
// Factories 2-4 are never touched by the scripted moves below — exactly
// like a real round, most factories still sit full while play continues.
const DEMO_FACTORIES = [
  ['blue','red','yellow','black'],
  ['yellow','yellow','white','red'],
  ['black','black','white','red'],
  ['red','red','white','blue'],
  ['red','white','blue','black'],
];

// Pattern lines: { color, count, slots } — one set per player
const INITIAL_PATTERNS = [
  [ // Player 1
    { color: null,     count: 0, slots: 1 },
    { color: 'red',    count: 1, slots: 2 },
    { color: null,     count: 0, slots: 3 },
    { color: 'black',  count: 2, slots: 4 },
    { color: 'yellow', count: 3, slots: 5 },
  ],
  [ // Player 2
    { color: 'blue',   count: 1, slots: 1 },
    { color: null,     count: 0, slots: 2 },
    { color: 'red',    count: 1, slots: 3 },
    { color: null,     count: 0, slots: 4 },
    { color: 'black',  count: 4, slots: 5 },
  ],
  [ // Player 3
    { color: 'red',    count: 1, slots: 1 },
    { color: null,     count: 0, slots: 2 },
    { color: 'black',  count: 2, slots: 3 },
    { color: null,     count: 0, slots: 4 },
    { color: 'white',  count: 4, slots: 5 },
  ],
];

// Wall tiles already placed — purely cosmetic/static for this demo (no
// live end-of-round scoring), one grid per player for visual variety
const WALLS = [
  [
    [true,  false, false, false, false],
    [false, true,  false, true,  false],
    [false, false, true,  false, false],
    [false, true,  false, false, true ],
    [false, false, false, true,  false],
  ],
  [
    [false, true,  false, false, false],
    [true,  false, false, false, false],
    [false, false, false, true,  false],
    [false, false, true,  false, false],
    [false, false, false, false, true ],
  ],
  [
    [false, false, true,  false, false],
    [false, false, false, false, true ],
    [true,  false, false, false, false],
    [false, true,  false, false, false],
    [false, false, false, true,  false],
  ],
];

// Horizontal offset (px) so the flying tile lands on the right player's board
const PLAYER_FLY_X = ['-96px', '0px', '96px'];

// Scripted 3-turn cycle — one turn per player — demonstrating both ways to
// draft tiles in real Azul: take every tile of one color from a factory
// (leftovers move to the center), or take every tile of one color from the
// center pool. Every target row is either empty or already holds that
// color, and no move ever exceeds a row's remaining space, so nothing here
// needs a floor line to stay legal.
const MOVES = [
  { player: 0, source: 'factory', factoryIdx: 0, color: 'blue',   targetRow: 0 },
  { player: 1, source: 'center',                  color: 'red',   targetRow: 1 },
  { player: 2, source: 'factory', factoryIdx: 1, color: 'yellow', targetRow: 1 },
];

// Phase durations (ms)
const PAUSE      = 900;   // idle before picking
const FLY_DOWN   = 700;   // tile flies to board
const SETTLE     = 600;   // tile settles, pattern line fills
const INTER      = 1000;  // gap between moves

export default function AzulDemo() {
  const [patternLines, setPatternLines] = useState(INITIAL_PATTERNS.map(p => p.map(l => ({ ...l }))));
  const [factories, setFactories]       = useState(DEMO_FACTORIES.map(f => [...f]));
  const [center, setCenter]             = useState([]);
  const [moveIdx, setMoveIdx]           = useState(0);
  const [phase, setPhase]               = useState('pause'); // pause | fly | settle | inter
  const [flyColor, setFlyColor]         = useState(null);
  const [flySource, setFlySource]       = useState(null); // 'factory' | 'center'
  const [flyFactoryIdx, setFlyFactoryIdx] = useState(null);
  const [flyPlayer, setFlyPlayer]       = useState(null);
  const [flyTargetRow, setFlyTargetRow] = useState(null);

  const timerRef = useRef(null);
  const factoriesRef = useRef(DEMO_FACTORIES.map(f => [...f]));
  const centerRef = useRef([]);

  useEffect(() => {
    function runPhase(ph, idx) {
      const move = MOVES[idx % MOVES.length];
      timerRef.current = setTimeout(() => {
        if (ph === 'pause') {
          setPhase('fly');
          setFlyColor(move.color);
          setFlySource(move.source);
          setFlyFactoryIdx(move.source === 'factory' ? move.factoryIdx : null);
          setFlyPlayer(move.player);
          setFlyTargetRow(move.targetRow);
          runPhase('fly', idx);
        } else if (ph === 'fly') {
          setPhase('settle');

          let takeCount;
          if (move.source === 'factory') {
            // Real Azul rule: a factory pick takes EVERY tile of the chosen
            // color (they go to the pattern line); everything else in that
            // factory — regardless of color — moves to the center pool, and
            // the factory ends up completely empty.
            const factoryTiles = factoriesRef.current[move.factoryIdx];
            takeCount = factoryTiles.filter(c => c === move.color).length;
            const leftover = factoryTiles.filter(c => c !== move.color);
            factoriesRef.current[move.factoryIdx] = [];
            setFactories(factoriesRef.current.map(f => [...f]));
            centerRef.current = [...centerRef.current, ...leftover];
            setCenter([...centerRef.current]);
          } else {
            // Center pick: take every tile of the chosen color out of the
            // pool; nothing else moves (there's no "leftover" redirect for
            // a center take — only factory picks feed the center).
            takeCount = centerRef.current.filter(c => c === move.color).length;
            centerRef.current = centerRef.current.filter(c => c !== move.color);
            setCenter([...centerRef.current]);
          }

          setPatternLines(prev => {
            const next = prev.map(p => p.map(l => ({ ...l })));
            const line = next[move.player][move.targetRow];
            if (!line.color) line.color = move.color;
            line.count = Math.min(line.count + takeCount, line.slots);
            return next;
          });

          setFlyColor(null);
          runPhase('settle', idx);
        } else if (ph === 'settle') {
          setPhase('inter');
          setFlySource(null);
          setFlyFactoryIdx(null);
          runPhase('inter', idx);
        } else if (ph === 'inter') {
          const nextIdx = idx + 1;
          setMoveIdx(nextIdx);
          // One full 3-player cycle done — reset for the next loop
          if ((nextIdx % MOVES.length) === 0) {
            setPatternLines(INITIAL_PATTERNS.map(p => p.map(l => ({ ...l }))));
            factoriesRef.current = DEMO_FACTORIES.map(f => [...f]);
            setFactories(factoriesRef.current.map(f => [...f]));
            centerRef.current = [];
            setCenter([]);
          }
          setFlyPlayer(null);
          setFlyTargetRow(null);
          setPhase('pause');
          runPhase('pause', nextIdx);
        }
      }, ph === 'pause' ? PAUSE : ph === 'fly' ? FLY_DOWN : ph === 'settle' ? SETTLE : INTER);
    }

    runPhase('pause', 0);
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <div className="azul-demo">
      {/* Factory area */}
      <div className="demo-factories">
        {factories.map((tiles, fi) => (
          <div
            key={fi}
            className={`demo-factory ${flySource === 'factory' && flyFactoryIdx === fi ? 'demo-factory-active' : ''}`}
          >
            {Array.from({ length: 4 }).map((_, ti) => {
              const color = tiles[ti];
              const isPicked = phase === 'fly' && flySource === 'factory' && flyFactoryIdx === fi && color === flyColor;
              return (
                <div
                  key={ti}
                  className={`demo-tile ${isPicked ? 'demo-tile-picked' : ''}`}
                  style={{ background: color ? COLOR_HEX[color] : 'transparent',
                           border: color ? 'none' : '1.5px dashed #ddd' }}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Center pool — leftover tiles from used factories, or a pick source */}
      {center.length > 0 && (
        <div className={`demo-center ${flySource === 'center' ? 'demo-center-active' : ''}`}>
          {center.map((color, i) => {
            const isPicked = phase === 'fly' && flySource === 'center' && color === flyColor;
            return (
              <div
                key={i}
                className={`demo-tile ${isPicked ? 'demo-tile-picked' : ''}`}
                style={{ background: COLOR_HEX[color] }}
              />
            );
          })}
        </div>
      )}

      {/* Flying tile — arcs down toward the active player's board */}
      {phase === 'fly' && flyColor && (
        <div
          className="demo-flying-tile"
          style={{ background: COLOR_HEX[flyColor], '--fly-x': PLAYER_FLY_X[flyPlayer ?? 1] }}
        />
      )}

      {/* Three player boards */}
      <div className="demo-players">
        {patternLines.map((lines, p) => (
          <div key={p} className={`demo-player ${flyPlayer === p ? 'demo-player-active' : ''}`}>
            <div className="demo-player-label">P{p + 1}</div>
            <div className="demo-mini-board">
              <div className="demo-mini-pattern">
                {lines.map((line, row) => (
                  <div
                    key={row}
                    className={`demo-mini-pattern-row ${flyPlayer === p && flyTargetRow === row && phase === 'settle' ? 'demo-row-flash' : ''}`}
                  >
                    {Array.from({ length: line.slots }).map((_, si) => {
                      const filled = si < line.count;
                      return (
                        <div
                          key={si}
                          className="demo-tile demo-tile-sm"
                          style={{
                            background: filled && line.color ? COLOR_HEX[line.color] : 'transparent',
                            border: filled && line.color ? 'none' : '1px dashed #ccc',
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="demo-mini-wall">
                {WALLS[p].map((row, r) => (
                  <div key={r} className="demo-mini-wall-row">
                    {row.map((filled, c) => {
                      const color = WALL_PATTERN[r][c];
                      return (
                        <div
                          key={c}
                          className="demo-tile demo-tile-sm demo-wall-tile"
                          style={{
                            background: filled ? COLOR_HEX[color] : COLOR_HEX[color] + '28',
                            border: filled ? 'none' : '1px solid ' + COLOR_HEX[color] + '55',
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
