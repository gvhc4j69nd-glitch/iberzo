import { useState, useEffect, useRef } from 'react';
import Factory from '../components/Factory';
import PlayerBoard from '../components/PlayerBoard';
import AdBanner from '../components/AdBanner';

const COLOR_HEX = { blue: '#4a90d9', yellow: '#f0c97a', red: '#c0634a', black: '#2c2c2c', white: '#6b8c3e' };
const ROW_LABELS = ['Row 1', 'Row 2', 'Row 3', 'Row 4', 'Row 5'];

export default function GamePage({ socket, username, roomId, initialState, onGameOver, onLeave, onAbandoned }) {
  const [state, setState] = useState(initialState);
  const [selected, setSelected] = useState(null); // { source, color }
  const [gameOverData, setGameOverData] = useState(null);
  const [gameOverPhase, setGameOverPhase] = useState('round'); // 'round' | 'final' | 'winner'
  const [moveError, setMoveError] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState(null);
  const dragRef = useRef(null);
  const errorTimerRef = useRef(null);

  const myIndex = state.players.findIndex(p => p.username === username);
  const myTurn = state.currentPlayerIndex === myIndex;

  useEffect(() => {
    const onUpdate = ({ roomId: id, state }) => {
      if (id !== roomId) return;
      setState(state);
      setSelected(null);
      if (state.roundSummary) {
        setSummary(state.roundSummary);
        setShowSummary(true);
      }
    };
    const onOver = ({ roomId: id, players, roundSummary, finalSummary }) => {
      if (id !== roomId) return;
      setGameOverData({ players, roundSummary, finalSummary });
      setGameOverPhase(roundSummary ? 'round' : 'final');
    };
    const onAbandoned_ = ({ roomId: id, username: who }) => {
      if (id !== roomId) return;
      setGameOverData({ abandoned: true, who });
      setTimeout(() => onAbandoned?.(), 3000);
    };
    const onError = (msg) => {
      setSelected(null);
      dragRef.current = null;
      setMoveError('Invalid placement');
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => setMoveError(null), 2500);
    };
    socket.on('game_update', onUpdate);
    socket.on('game_over', onOver);
    socket.on('game_abandoned', onAbandoned_);
    socket.on('game_error', onError);
    return () => {
      socket.off('game_update', onUpdate);
      socket.off('game_over', onOver);
      socket.off('game_abandoned', onAbandoned_);
      socket.off('game_error', onError);
      clearTimeout(errorTimerRef.current);
    };
  }, [socket, roomId]);

  function selectTiles(source, color) {
    dragRef.current = { source, color };
    setSelected({ source, color });
  }

  function placeOnRow(patternRow) {
    const pick = dragRef.current ?? selected;
    if (!pick?.source || !pick?.color) return;
    socket.emit('make_move', { roomId, move: { source: pick.source, color: pick.color, patternRow } });
    dragRef.current = null;
    setSelected(null);
  }

  if (gameOverData) {
    if (gameOverData.abandoned) {
      return (
        <div className="game-over">
          <h1>Game Ended</h1>
          <p style={{ fontSize: 18, opacity: 0.7 }}>{gameOverData.who} left the game.</p>
          <button onClick={onLeave} className="primary-btn" style={{ width: 'auto' }}>Close</button>
        </div>
      );
    }

    // Phase 1: last round tile/floor scoring
    if (gameOverPhase === 'round' && gameOverData.roundSummary) {
      return (
        <div className="game-over game-over-scoring">
          <h1>Final Round Scoring</h1>
          <div className="round-summary-players">
            {gameOverData.roundSummary.map(p => (
              <div key={p.username} className="round-summary-player">
                <div className="rsp-header">
                  <span className="rsp-name">{p.username}</span>
                  <span className="rsp-total">{p.scoreAfter} pts</span>
                </div>
                <div className="rsp-rows">
                  {p.tilePlacements.length === 0 && (
                    <div className="rsp-row rsp-none">No tiles placed on wall</div>
                  )}
                  {p.tilePlacements.map(t => (
                    <div key={t.row} className="rsp-row">
                      <span className="rsp-dot" style={{ background: COLOR_HEX[t.color] }} />
                      <span className="rsp-label">{ROW_LABELS[t.row]}</span>
                      <span className="rsp-pts">+{t.pts}</span>
                    </div>
                  ))}
                  {p.floorPenalty < 0 && (
                    <div className="rsp-row rsp-penalty">
                      <span className="rsp-label">🟫 Floor penalty</span>
                      <span className="rsp-pts">{p.floorPenalty}</span>
                    </div>
                  )}
                  <div className="rsp-row rsp-net">
                    <span className="rsp-label">Round total</span>
                    <span className="rsp-pts">{p.scoreAfter - p.scoreBefore >= 0 ? '+' : ''}{p.scoreAfter - p.scoreBefore}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="primary-btn" style={{ width: '100%', maxWidth: 360 }}
            onClick={() => setGameOverPhase('final')}>
            Final Bonuses →
          </button>
        </div>
      );
    }

    // Phase 2: end-game bonus scoring
    if (gameOverPhase === 'final' && gameOverData.finalSummary) {
      const COL_LABELS = ['Column A', 'Column B', 'Column C', 'Column D', 'Column E'];
      return (
        <div className="game-over game-over-scoring">
          <h1>End-Game Bonuses</h1>
          <div className="round-summary-players">
            {gameOverData.finalSummary.map(p => (
              <div key={p.username} className="round-summary-player">
                <div className="rsp-header">
                  <span className="rsp-name">{p.username}</span>
                  <span className="rsp-total">{p.finalScore} pts</span>
                </div>
                <div className="rsp-rows">
                  <div className="rsp-row">
                    <span className="rsp-label">Score before bonuses</span>
                    <span className="rsp-pts">{p.scoreBeforeBonuses}</span>
                  </div>
                  {p.completedRows.length > 0 && p.completedRows.map(r => (
                    <div key={`row-${r}`} className="rsp-row">
                      <span className="rsp-label">✅ Complete row {r + 1}</span>
                      <span className="rsp-pts">+2</span>
                    </div>
                  ))}
                  {p.completedCols.length > 0 && p.completedCols.map(c => (
                    <div key={`col-${c}`} className="rsp-row">
                      <span className="rsp-label">✅ Complete {COL_LABELS[c]}</span>
                      <span className="rsp-pts">+7</span>
                    </div>
                  ))}
                  {p.completedColors.length > 0 && p.completedColors.map(color => (
                    <div key={color} className="rsp-row">
                      <span className="rsp-dot" style={{ background: COLOR_HEX[color] }} />
                      <span className="rsp-label">All 5 {color === 'white' ? 'green' : color}</span>
                      <span className="rsp-pts">+10</span>
                    </div>
                  ))}
                  {p.bonusPoints === 0 && (
                    <div className="rsp-row rsp-none">No bonuses earned</div>
                  )}
                  <div className="rsp-row rsp-net">
                    <span className="rsp-label">Bonus total</span>
                    <span className="rsp-pts">+{p.bonusPoints}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="primary-btn" style={{ width: '100%', maxWidth: 360 }}
            onClick={() => setGameOverPhase('winner')}>
            See Results →
          </button>
        </div>
      );
    }

    // Phase 3: winner screen
    const sorted = [...gameOverData.players].sort((a, b) => b.score - a.score);
    return (
      <div className="game-over">
        <h1>Game Over</h1>
        <ol>
          {sorted.map((p, i) => (
            <li key={p.username}>{p.username} — {p.score} pts {i === 0 ? '🏆' : ''}</li>
          ))}
        </ol>
        <AdBanner variant="postgame" />
        <button onClick={onLeave} className="primary-btn" style={{ width: 'auto' }}>Close</button>
      </div>
    );
  }

  return (
    <div className="game-page">
      {moveError && (
        <div className="move-error-toast">{moveError}</div>
      )}
      <div className="game-header">
        <span>Round {state.round}</span>
        <span className={myTurn ? 'your-turn' : ''}>
          {myTurn ? 'Your turn' : `${state.players[state.currentPlayerIndex]?.username}'s turn`}
        </span>
        {selected && (
          <span className="selected-hint">
            <strong style={{ color: COLOR_HEX[selected.color] }}>{selected.color}</strong>
            {' from '}{selected.source === 'center' ? 'center' : `factory ${parseInt(selected.source) + 1}`}
            {' → tap a row'}
          </span>
        )}
        <button className="leave-btn" onClick={onLeave}>Leave</button>
      </div>

      <div className="factories-area">
        {state.factories.map((tiles, i) => (
          <Factory
            key={i}
            tiles={tiles}
            index={i}
            onSelect={selectTiles}
            onDragStart={selectTiles}
            selected={selected}
            myTurn={myTurn}
          />
        ))}
        <div className={`center-pool ${selected?.source === 'center' ? 'selected-source' : ''}`}>
          <span className="center-label">Center</span>
          {[...new Set(state.center.filter(t => t !== 'first'))].map(color => (
            <div
              key={color}
              className={`tile-group ${myTurn ? 'draggable' : ''}`}
              draggable={myTurn}
              onClick={() => myTurn && selectTiles('center', color)}
              onDragStart={e => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('source', 'center');
                e.dataTransfer.setData('color', color);
                selectTiles('center', color);
              }}
              style={{ background: COLOR_HEX[color], cursor: myTurn ? 'grab' : 'default' }}
            >
              <span className="tile-count">{state.center.filter(t => t === color).length}</span>
            </div>
          ))}
          {state.center.includes('first') && <div className="first-token-tile">1st</div>}
        </div>
      </div>

      <div className="boards-area">
        {[...state.players].sort((a, b) => a.username === username ? -1 : b.username === username ? 1 : 0).map((player) => (
          <PlayerBoard
            key={player.username}
            player={player}
            isMe={player.username === username}
            myTurn={myTurn}
            isCurrent={state.players[state.currentPlayerIndex]?.username === player.username}
            selectedTiles={selected}
            onSelectRow={placeOnRow}
            onDrop={placeOnRow}
          />
        ))}
      </div>

      {showSummary && summary && (
        <div className="round-summary-overlay" onClick={() => setShowSummary(false)}>
          <div className="round-summary-modal" onClick={e => e.stopPropagation()}>
            <h2 className="round-summary-title">Round {state.round - 1} Scoring</h2>
            <div className="round-summary-players">
              {summary.map(p => (
                <div key={p.username} className="round-summary-player">
                  <div className="rsp-header">
                    <span className="rsp-name">{p.username}</span>
                    <span className="rsp-total">{p.scoreAfter} pts</span>
                  </div>
                  <div className="rsp-rows">
                    {p.tilePlacements.length === 0 && (
                      <div className="rsp-row rsp-none">No tiles placed on wall</div>
                    )}
                    {p.tilePlacements.map(t => (
                      <div key={t.row} className="rsp-row">
                        <span className="rsp-dot" style={{ background: COLOR_HEX[t.color] }} />
                        <span className="rsp-label">{ROW_LABELS[t.row]}</span>
                        <span className="rsp-pts">+{t.pts}</span>
                      </div>
                    ))}
                    {p.floorPenalty < 0 && (
                      <div className="rsp-row rsp-penalty">
                        <span className="rsp-label">🟫 Floor penalty</span>
                        <span className="rsp-pts">{p.floorPenalty}</span>
                      </div>
                    )}
                    <div className="rsp-row rsp-net">
                      <span className="rsp-label">Round total</span>
                      <span className="rsp-pts">{p.scoreAfter - p.scoreBefore >= 0 ? '+' : ''}{p.scoreAfter - p.scoreBefore}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="primary-btn rsp-close" onClick={() => setShowSummary(false)}>
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
