const WALL_PATTERN = [
  ['blue', 'yellow', 'red', 'black', 'white'],
  ['white', 'blue', 'yellow', 'red', 'black'],
  ['black', 'white', 'blue', 'yellow', 'red'],
  ['red', 'black', 'white', 'blue', 'yellow'],
  ['yellow', 'red', 'black', 'white', 'blue'],
];
const COLOR_HEX = { blue: '#4a90d9', yellow: '#f5c842', red: '#e74c3c', black: '#2c2c2c', white: '#6b8c3e' };
const FLOOR_PENALTIES = [-1, -1, -2, -2, -2, -3, -3];

export default function PlayerBoard({ player, isMe, onSelectRow, onDrop, selectedTiles, myTurn }) {
  function handleDragOver(e) {
    if (isMe && myTurn) e.preventDefault();
  }

  function handleDrop(e, target) {
    e.preventDefault();
    if (!isMe || !myTurn) return;
    onDrop(target);
  }

  return (
    <div className={`player-board ${isMe ? 'mine' : ''}`}>
      <div className="board-header">
        <strong>{player.username}</strong>
        <span className="score">Score: {player.score}</span>
        {player.hasFirstPlayerToken && <span className="first-token">1st</span>}
      </div>
      <div className="board-main">
        <div className="pattern-lines">
          {player.patternLines.map((line, row) => (
            <div
              key={row}
              className={`pattern-row ${isMe && myTurn && selectedTiles ? 'drop-target' : ''}`}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, row)}
              onClick={() => isMe && myTurn && selectedTiles && onSelectRow(row)}
            >
              {Array.from({ length: line.slots }).map((_, i) => {
                const filled = i >= line.slots - line.count;
                return (
                  <div
                    key={i}
                    className={`tile ${filled && line.color ? 'filled' : 'empty'}`}
                    style={filled && line.color ? { background: COLOR_HEX[line.color] } : {}}
                  />
                );
              })}
              {isMe && myTurn && selectedTiles && (
                <span className="row-hint">→</span>
              )}
            </div>
          ))}
        </div>

        <div className="wall">
          {WALL_PATTERN.map((wallRow, row) => (
            <div key={row} className="wall-row">
              {wallRow.map((color, col) => (
                <div
                  key={col}
                  className={`tile ${player.wall[row][col] ? 'filled' : 'ghost'}`}
                  style={{ background: player.wall[row][col] ? COLOR_HEX[color] : COLOR_HEX[color] + '33' }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div
        className={`floor-line ${isMe && myTurn && selectedTiles ? 'drop-target' : ''}`}
        onDragOver={handleDragOver}
        onDrop={e => handleDrop(e, 'floor')}
        onClick={() => isMe && myTurn && selectedTiles && onSelectRow('floor')}
      >
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className={`tile floor-tile ${player.floor[i] ? 'filled' : 'empty'}`}
            style={player.floor[i] && player.floor[i] !== 'first' ? { background: COLOR_HEX[player.floor[i]] } : {}}
          >
            <span className="penalty">{FLOOR_PENALTIES[i]}</span>
            {player.floor[i] === 'first' && <span>1</span>}
          </div>
        ))}
        {isMe && myTurn && selectedTiles && <span className="row-hint floor-hint">→ Floor</span>}
      </div>
    </div>
  );
}
