import { useState, useEffect, useRef } from 'react';

const C = { blue:'#4a90d9', yellow:'#f0c97a', red:'#c0634a', black:'#3d3d3d', white:'#6b8c3e' };

const WALL_PAT = [
  ['blue','yellow','red','black','white'],
  ['white','blue','yellow','red','black'],
  ['black','white','blue','yellow','red'],
  ['red','black','white','blue','yellow'],
  ['yellow','red','black','white','blue'],
];

// Precomputed game states for the scripted demo
// WALL_PAT[1] = ['white','blue','yellow','red','black']
//   yellow→col2, red→col3, black→col4

const INIT_PLAYERS = [
  {
    name:'Alice', score:2,
    patternLines:[
      {color:null,  count:0,slots:1},
      {color:null,  count:0,slots:2},  // will fill with yellow
      {color:'blue',count:1,slots:3},
      {color:'red', count:2,slots:4},
      {color:null,  count:0,slots:5},
    ],
    wall:[
      [true, false,false,false,false],
      [false,false,false,false,false],
      [false,false,false,false,false],
      [false,false,false,false,false],
      [false,false,false,false,false],
    ],
    floor:[],
  },
  {
    name:'Bob', score:3,
    patternLines:[
      {color:null,   count:0,slots:1},
      {color:null,   count:0,slots:2},  // will fill with red
      {color:'black',count:2,slots:3},
      {color:'yellow',count:1,slots:4},
      {color:null,   count:0,slots:5},
    ],
    wall:[
      [false,true, false,false,false],
      [false,false,false,false,false],
      [false,false,false,false,false],
      [false,false,false,false,false],
      [false,false,false,false,false],
    ],
    floor:[],
  },
  {
    name:'Carol', score:1,
    patternLines:[
      {color:null,  count:0,slots:1},
      {color:null,  count:0,slots:2},  // will fill with black
      {color:'white',count:1,slots:3},
      {color:'blue', count:1,slots:4},
      {color:null,  count:0,slots:5},
    ],
    wall:[
      [false,false,true, false,false],
      [false,false,false,false,false],
      [false,false,false,false,false],
      [false,false,false,false,false],
      [false,false,false,false,false],
    ],
    floor:[],
  },
];

const INIT_FACTORIES = [
  ['yellow','yellow','red','blue'],
  ['red','red','blue','black'],
  ['black','black','white','yellow'],
  ['white','white','yellow','black'],
  ['blue','blue','red','white'],
];

function clone(x) { return JSON.parse(JSON.stringify(x)); }

function buildStates() {
  const s = [];

  // 0: intro
  s.push({
    phase:'New Round', label:'Round 2 begins — factories refilled, ready to draft',
    activePlayer:-1, highlightFactory:-1, highlightColor:null,
    factories:clone(INIT_FACTORIES), center:[], players:clone(INIT_PLAYERS), scorePopup:null,
  });

  // 1: Alice highlight pick
  const s1 = clone(s[0]);
  s1.phase="Alice's Turn"; s1.label='Alice selects all YELLOW tiles from Factory 1';
  s1.activePlayer=0; s1.highlightFactory=0; s1.highlightColor='yellow';
  s.push(s1);

  // 2: Alice places yellow, leftover to center
  const s2 = clone(s1);
  s2.label='2 yellow fill Alice\'s row 2 — complete! Red & blue go to the center.';
  s2.highlightFactory=-1; s2.highlightColor=null;
  s2.factories[0]=[];
  s2.center=['red','blue'];
  s2.players[0].patternLines[1]={color:'yellow',count:2,slots:2};
  s.push(s2);

  // 3: Bob highlight pick
  const s3 = clone(s2);
  s3.phase="Bob's Turn"; s3.label='Bob selects all RED tiles from Factory 2';
  s3.activePlayer=1; s3.highlightFactory=1; s3.highlightColor='red';
  s.push(s3);

  // 4: Bob places red, leftover to center
  const s4 = clone(s3);
  s4.label='2 red fill Bob\'s row 2 — complete! Blue & black go to the center.';
  s4.highlightFactory=-1; s4.highlightColor=null;
  s4.factories[1]=[];
  s4.center=['red','blue','blue','black'];
  s4.players[1].patternLines[1]={color:'red',count:2,slots:2};
  s.push(s4);

  // 5: Carol highlight pick
  const s5 = clone(s4);
  s5.phase="Carol's Turn"; s5.label='Carol selects all BLACK tiles from Factory 3';
  s5.activePlayer=2; s5.highlightFactory=2; s5.highlightColor='black';
  s.push(s5);

  // 6: Carol places black, leftover to center
  const s6 = clone(s5);
  s6.label='2 black fill Carol\'s row 2 — complete! White & yellow go to the center.';
  s6.highlightFactory=-1; s6.highlightColor=null;
  s6.factories[2]=[];
  s6.center=['red','blue','blue','black','white','yellow'];
  s6.players[2].patternLines[1]={color:'black',count:2,slots:2};
  s.push(s6);

  // 7: End of round
  const s7 = clone(s6);
  s7.phase='End of Round'; s7.label='All factories empty — completed rows score and move to the wall!';
  s7.activePlayer=-1;
  s.push(s7);

  // 8: Alice scores — yellow→wall[1][2]
  const s8 = clone(s7);
  s8.phase='Scoring'; s8.label='Alice\'s yellow tile moves to the wall — isolated tile scores +1!';
  s8.activePlayer=0;
  s8.players[0].patternLines[1]={color:null,count:0,slots:2};
  s8.players[0].wall[1][2]=true;
  s8.players[0].score=3;
  s8.scorePopup={player:0,pts:1};
  s.push(s8);

  // 9: Bob scores — red→wall[1][3]
  const s9 = clone(s8);
  s9.label='Bob\'s red tile moves to the wall — +1 point!';
  s9.activePlayer=1;
  s9.players[1].patternLines[1]={color:null,count:0,slots:2};
  s9.players[1].wall[1][3]=true;
  s9.players[1].score=4;
  s9.scorePopup={player:1,pts:1};
  s.push(s9);

  // 10: Carol scores — black→wall[1][4]
  const s10 = clone(s9);
  s10.label='Carol\'s black tile moves to the wall — +1 point!';
  s10.activePlayer=2;
  s10.players[2].patternLines[1]={color:null,count:0,slots:2};
  s10.players[2].wall[1][4]=true;
  s10.players[2].score=2;
  s10.scorePopup={player:2,pts:1};
  s.push(s10);

  // 11: Round complete
  const s11 = clone(s10);
  s11.phase='Round Complete!';
  s11.label='Scores — Alice: 3 pts  •  Bob: 4 pts  •  Carol: 2 pts  •  Game continues…';
  s11.activePlayer=-1; s11.scorePopup=null;
  s.push(s11);

  return s;
}

const STATES = buildStates();
const DURATIONS = [2500,2000,2500,2000,2500,2000,2500,1500,2000,2000,2000,3000];

// ── sub-components ───────────────────────────────────────────────────────

function WallGrid({ wall, flash }) {
  return (
    <div className="gd-wall">
      {WALL_PAT.map((row, r) => (
        <div key={r} className="gd-wall-row">
          {row.map((color, c) => {
            const filled = wall[r][c];
            const glowing = flash && flash.r === r && flash.c === c;
            return (
              <div key={c} className={`gd-wall-cell${filled?' filled':''}${glowing?' glow':''}`}
                style={{
                  background: filled ? C[color] : C[color]+'28',
                  borderColor: filled ? C[color]+'88' : C[color]+'44',
                  boxShadow: glowing ? `0 0 10px 3px ${C[color]}` : undefined,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function PatternGrid({ lines, size = 'lg' }) {
  const cell = size === 'lg' ? 'gd-pcell' : 'gd-pcell-sm';
  return (
    <div className="gd-pattern">
      {lines.map((line, row) => (
        <div key={row} className="gd-prow">
          {Array.from({length:line.slots}).map((_,i) => {
            const filled = i >= line.slots - line.count;
            return (
              <div key={i} className={cell}
                style={{background: filled && line.color ? C[line.color] : '#e8d5c4'}}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function FloorRow({ floor }) {
  const pens = [-1,-1,-2,-2,-2,-3,-3];
  return (
    <div className="gd-floor-row">
      <span className="gd-floor-label">Floor</span>
      {pens.map((p,i) => (
        <div key={i} className="gd-floor-cell"
          style={{background: floor[i] ? C[floor[i]] : '#f0e8e0'}}>
          <span style={{fontSize:7,color:floor[i]?'#fff':'#bbb'}}>{p}</span>
        </div>
      ))}
    </div>
  );
}

function FactoryDisc({ tiles, highlight, highlightColor, idx }) {
  return (
    <div className={`gd-factory${highlight?' gd-factory-hi':''}`}>
      <div className="gd-factory-tiles">
        {tiles.length === 0
          ? <span className="gd-factory-empty">empty</span>
          : tiles.map((color, i) => (
            <div key={i} className="gd-ftile"
              style={{
                background: C[color],
                opacity: highlight && highlightColor && color !== highlightColor ? 0.2 : 1,
                boxShadow: highlight && color === highlightColor ? `0 0 6px ${C[color]}` : undefined,
              }}
            />
          ))
        }
        {tiles.length > 0 && tiles.length < 4 && Array.from({length:4-tiles.length}).map((_,i) => (
          <div key={`e${i}`} className="gd-ftile" style={{background:'transparent'}} />
        ))}
      </div>
      <div className="gd-factory-label">F{idx+1}</div>
    </div>
  );
}

function CenterPool({ tiles }) {
  const grouped = {};
  tiles.forEach(t => { grouped[t] = (grouped[t]||0)+1; });
  return (
    <div className="gd-center">
      <span className="gd-center-label">Center pool</span>
      <div className="gd-center-tiles">
        {tiles.length === 0
          ? <span style={{fontSize:10,color:'#ccc'}}>empty</span>
          : Object.entries(grouped).map(([color, n]) =>
              Array.from({length:n}).map((_,i) => (
                <div key={`${color}${i}`} className="gd-ctile" style={{background:C[color]}} />
              ))
            )
        }
      </div>
    </div>
  );
}

function BigBoard({ player, prevWall, scorePopup, popup }) {
  // detect new wall tile for flash
  let flash = null;
  if (prevWall) {
    for (let r=0;r<5;r++) for (let c=0;c<5;c++) {
      if (player.wall[r][c] && !prevWall[r][c]) flash={r,c};
    }
  }
  return (
    <div className="gd-bigboard">
      <div className="gd-bigboard-name">
        {player.name}
        <span className="gd-bigboard-score">
          {player.score} pts
          {popup != null && <span className="gd-score-pop">+{popup}</span>}
        </span>
      </div>
      <div className="gd-bigboard-inner">
        <div>
          <div className="gd-section-label">Pattern Lines</div>
          <PatternGrid lines={player.patternLines} size="lg" />
        </div>
        <div className="gd-divider" />
        <div>
          <div className="gd-section-label">Wall</div>
          <WallGrid wall={player.wall} flash={flash} />
        </div>
      </div>
      <FloorRow floor={player.floor} />
    </div>
  );
}

function MiniBoard({ player, active, popup }) {
  return (
    <div className={`gd-miniboard${active?' active':''}`}>
      <div className="gd-mini-name">
        {player.name}
        <span style={{color:'#c0634a',marginLeft:4}}>
          {player.score}pts
          {popup != null && <span className="gd-score-pop">+{popup}</span>}
        </span>
      </div>
      <div className="gd-mini-inner">
        <PatternGrid lines={player.patternLines} size="sm" />
        <div className="gd-mini-wall">
          {WALL_PAT.map((row,r) => (
            <div key={r} style={{display:'flex',gap:2}}>
              {row.map((color,c) => (
                <div key={c} style={{
                  width:8,height:8,borderRadius:2,
                  background:player.wall[r][c]?C[color]:C[color]+'28',
                  transition:'background 0.4s',
                }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────

export default function GameDemo() {
  const [step, setStep] = useState(0);
  const stepRef = useRef(0);

  useEffect(() => {
    let t;
    function advance() {
      const next = (stepRef.current + 1) % STATES.length;
      stepRef.current = next;
      setStep(next);
      t = setTimeout(advance, DURATIONS[next]);
    }
    t = setTimeout(advance, DURATIONS[0]);
    return () => clearTimeout(t);
  }, []);

  const st = STATES[step];
  const prev = step > 0 ? STATES[step-1] : null;

  const popup = (pidx) =>
    st.scorePopup?.player === pidx ? st.scorePopup.pts : null;

  return (
    <div className="gd-wrap">
      {/* Phase + dots */}
      <div className="gd-phase-bar">
        <span className="gd-phase-text">{st.phase}</span>
        <div className="gd-dots">
          {STATES.map((_,i) => (
            <div key={i} className={`gd-dot${i===step?' active':''}`} />
          ))}
        </div>
      </div>

      {/* Action label */}
      <div className="gd-label">{st.label}</div>

      {/* Main area */}
      <div className="gd-main">
        {/* Factories + center */}
        <div className="gd-left">
          <div className="gd-factories">
            {st.factories.map((tiles, i) => (
              <FactoryDisc key={i} tiles={tiles} idx={i}
                highlight={st.highlightFactory === i}
                highlightColor={st.highlightColor}
              />
            ))}
          </div>
          <CenterPool tiles={st.center} />
        </div>

        {/* Right: active player full board OR scoring overview */}
        <div className="gd-right">
          {st.activePlayer >= 0 ? (
            <BigBoard
              player={st.players[st.activePlayer]}
              prevWall={prev?.players[st.activePlayer]?.wall}
              popup={popup(st.activePlayer)}
            />
          ) : (
            <div className="gd-overview">
              {st.players.map((p,i) => (
                <div key={i} className="gd-overview-row">
                  <MiniBoard player={p} active={false} popup={popup(i)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: all 3 mini boards (shown when one player is active) */}
      {st.activePlayer >= 0 && (
        <div className="gd-players">
          {st.players.map((p,i) => (
            <MiniBoard key={i} player={p} active={st.activePlayer===i} popup={popup(i)} />
          ))}
        </div>
      )}
    </div>
  );
}
