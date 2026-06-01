import { useState, useEffect, useRef } from 'react';
import Factory from '../components/Factory';
import PlayerBoard from '../components/PlayerBoard';

const COLOR_HEX = { blue: '#4a90d9', yellow: '#f5c842', red: '#e74c3c', black: '#2c2c2c', white: '#00b4d8' };

export default function GamePage({ socket, username, roomId, initialState, onGameOver, onLeave, onAbandoned }) {
  const [state, setState] = useState(initialState);
  const [selected, setSelected] = useState(null); // { source, color }
  const [gameOverData, setGameOverData] = useState(null);
  const dragRef = useRef(null);

  const myIndex = state.players.findIndex(p => p.username === username);
  const myTurn = state.currentPlayerIndex === myIndex;

  useEffect(() => {
    const onUpdate = ({ roomId: id, state }) => {
      if (id === roomId) { setState(state); setSelected(null); }
    };
    const onOver = ({ roomId: id, players }) => {
      if (id === roomId) setGameOverData(players);
    };
    const onAbandoned_ = ({ roomId: id, username: who }) => {
      if (id !== roomId) return;
      setGameOverData({ abandoned: true, who });
      setTimeout(() => onAbandoned?.(), 3000);
    };
    socket.on('game_update', onUpdate);
    socket.on('game_over', onOver);
    socket.on('game_abandoned', onAbandoned_);
    return () => {
      socket.off('game_update', onUpdate);
      socket.off('game_over', onOver);
      socket.off('game_abandoned', onAbandoned_);
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
    const sorted = [...gameOverData].sort((a, b) => b.score - a.score);
    return (
      <div className="game-over">
        <h1>Game Over</h1>
        <ol>
          {sorted.map((p, i) => (
            <li key={p.username}>{p.username} — {p.score} pts {i === 0 ? '🏆' : ''}</li>
          ))}
        </ol>
        <button onClick={onLeave} className="primary-btn" style={{ width: 'auto' }}>Close</button>
      </div>
    );
  }

  return (
    <div className="game-page">
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
            selectedTiles={selected}
            onSelectRow={placeOnRow}
            onDrop={placeOnRow}
          />
        ))}
      </div>
    </div>
  );
}
