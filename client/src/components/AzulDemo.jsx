import { useEffect, useRef, useState } from 'react';

const COLORS = ['blue', 'yellow', 'red', 'black', 'white'];
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

// A fixed demo scenario that looks like a real mid-game state
const DEMO_FACTORIES = [
  ['blue','red','yellow','black'],
  ['yellow','yellow','white','red'],
  ['black','black','white','red'],
  ['red','red','white','blue'],
  ['red','white','blue','black'],
];

// Pattern lines: { color, count, slots }
const INITIAL_PATTERN = [
  { color: null,     count: 0, slots: 1 },
  { color: 'red',    count: 1, slots: 2 },
  { color: null,     count: 0, slots: 3 },
  { color: 'black',  count: 2, slots: 4 },
  { color: 'yellow', count: 3, slots: 5 },
];

// Wall tiles already placed
const INITIAL_WALL = [
  [true,  false, false, false, false],
  [false, true,  false, true,  false],
  [false, false, true,  false, false],
  [false, true,  false, false, true ],
  [false, false, false, true,  false],
];

// Sequence of moves to animate: { factoryIdx, color, targetRow }
// Each move takes ALL tiles of the chosen color from a factory, matching
// real Azul rules — and only ever places into an empty row or a row
// already holding that same color.
const MOVES = [
  { factoryIdx: 0, color: 'blue',   targetRow: 0 },
  { factoryIdx: 1, color: 'yellow', targetRow: 4 },
  { factoryIdx: 2, color: 'black',  targetRow: 3 },
  { factoryIdx: 3, color: 'red',    targetRow: 2 },
  { factoryIdx: 4, color: 'red',    targetRow: 1 },
];

// Phase durations (ms)
const PAUSE      = 900;   // idle before picking
const FLY_DOWN   = 700;   // tile flies to board
const SETTLE     = 600;   // tile settles, pattern line fills
const INTER      = 1000;  // gap between moves

export default function AzulDemo() {
  const [patternLines, setPatternLines] = useState(INITIAL_PATTERN.map(l => ({ ...l })));
  const [wall, setWall]                 = useState(INITIAL_WALL.map(r => [...r]));
  const [factories, setFactories]       = useState(DEMO_FACTORIES.map(f => [...f]));
  const [moveIdx, setMoveIdx]           = useState(0);
  const [phase, setPhase]               = useState('pause'); // pause | fly | settle | inter
  const [flyColor, setFlyColor]         = useState(null);
  const [flyFactory, setFlyFactory]     = useState(null);
  const [flyTarget, setFlyTarget]       = useState(null);

  const timerRef = useRef(null);
  const factoriesRef = useRef(DEMO_FACTORIES.map(f => [...f]));

  useEffect(() => {
    function runPhase(ph, idx) {
      const move = MOVES[idx % MOVES.length];
      timerRef.current = setTimeout(() => {
        if (ph === 'pause') {
          setPhase('fly');
          setFlyColor(move.color);
          setFlyFactory(move.factoryIdx);
          setFlyTarget(move.targetRow);
          runPhase('fly', idx);
        } else if (ph === 'fly') {
          setPhase('settle');
          // Real Azul rule: a factory pick takes EVERY tile of the chosen
          // color from that factory, and they all go to the pattern line.
          const takeCount = factoriesRef.current[move.factoryIdx].filter(c => c === move.color).length;
          // Update pattern line
          setPatternLines(prev => {
            const next = prev.map(l => ({ ...l }));
            const line = next[move.targetRow];
            if (!line.color) line.color = move.color;
            line.count = Math.min(line.count + takeCount, line.slots);
            return next;
          });
          // Remove all tiles of that color from the factory
          factoriesRef.current[move.factoryIdx] = factoriesRef.current[move.factoryIdx].filter(c => c !== move.color);
          setFactories(factoriesRef.current.map(f => [...f]));
          setFlyColor(null);
          runPhase('settle', idx);
        } else if (ph === 'settle') {
          setPhase('inter');
          setFlyFactory(null);
          setFlyTarget(null);
          runPhase('inter', idx);
        } else if (ph === 'inter') {
          const nextIdx = idx + 1;
          setMoveIdx(nextIdx);
          // If factory used up, reset for next loop
          if ((nextIdx % MOVES.length) === 0) {
            setPatternLines(INITIAL_PATTERN.map(l => ({ ...l })));
            setWall(INITIAL_WALL.map(r => [...r]));
            factoriesRef.current = DEMO_FACTORIES.map(f => [...f]);
            setFactories(factoriesRef.current.map(f => [...f]));
          }
          setPhase('pause');
          runPhase('pause', nextIdx);
        }
      }, ph === 'pause' ? PAUSE : ph === 'fly' ? FLY_DOWN : ph === 'settle' ? SETTLE : INTER);
    }

    runPhase('pause', 0);
    return () => clearTimeout(timerRef.current);
  }, []);

  const currentMove = MOVES[moveIdx % MOVES.length];

  return (
    <div className="azul-demo">
      {/* Factory area */}
      <div className="demo-factories">
        {factories.map((tiles, fi) => (
          <div
            key={fi}
            className={`demo-factory ${flyFactory === fi ? 'demo-factory-active' : ''}`}
          >
            {Array.from({ length: 4 }).map((_, ti) => {
              const color = tiles[ti];
              const isPicked = phase === 'fly' && flyFactory === fi && color === flyColor;
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

      {/* Flying tile */}
      {phase === 'fly' && flyColor && (
        <div
          className="demo-flying-tile"
          style={{ background: COLOR_HEX[flyColor] }}
        />
      )}

      {/* Player board */}
      <div className="demo-board">
        {/* Pattern lines */}
        <div className="demo-pattern">
          {patternLines.map((line, row) => (
            <div
              key={row}
              className={`demo-pattern-row ${flyTarget === row && phase === 'settle' ? 'demo-row-flash' : ''}`}
            >
              {Array.from({ length: line.slots }).map((_, si) => {
                const filled = si < line.count;
                return (
                  <div
                    key={si}
                    className="demo-tile"
                    style={{
                      background: filled && line.color ? COLOR_HEX[line.color] : 'transparent',
                      border: filled && line.color ? 'none' : '1.5px dashed #ccc',
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Wall */}
        <div className="demo-wall">
          {wall.map((row, r) => (
            <div key={r} className="demo-wall-row">
              {row.map((filled, c) => {
                const color = WALL_PATTERN[r][c];
                return (
                  <div
                    key={c}
                    className="demo-tile demo-wall-tile"
                    style={{
                      background: filled ? COLOR_HEX[color] : COLOR_HEX[color] + '28',
                      border: filled ? 'none' : '1.5px solid ' + COLOR_HEX[color] + '55',
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
