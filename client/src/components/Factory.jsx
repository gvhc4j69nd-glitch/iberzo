const COLOR_HEX = { blue: '#4a90d9', yellow: '#f5c842', red: '#e74c3c', black: '#2c2c2c', white: '#00b4d8' };

export default function Factory({ tiles, index, onSelect, onDragStart, selected, myTurn }) {
  if (!tiles.length) return <div className="factory empty" />;

  const colors = [...new Set(tiles.filter(t => t !== 'first'))];

  return (
    <div className={`factory ${selected?.source === String(index) ? 'selected-source' : ''}`}>
      {colors.map(color => (
        <div
          key={color}
          className={`tile-group ${myTurn ? 'draggable' : ''}`}
          draggable={myTurn}
          onClick={() => myTurn && onSelect(String(index), color)}
          onDragStart={e => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('source', String(index));
            e.dataTransfer.setData('color', color);
            onDragStart(String(index), color);
          }}
          style={{ background: COLOR_HEX[color], cursor: myTurn ? 'grab' : 'default' }}
          title={`Take ${tiles.filter(t => t === color).length}x ${color}`}
        >
          <span className="tile-count">{tiles.filter(t => t === color).length}</span>
        </div>
      ))}
    </div>
  );
}
