const { takeTiles, placeTiles, WALL_PATTERN } = require('./azulEngine');

const BOT_NAMES = ['Bot Picasso', 'Bot Gaudí', 'Bot Dalí', 'Bot Miró'];

function makeBotId(n) { return `bot-${n}`; }
function isBotId(id) { return typeof id === 'string' && id.startsWith('bot-'); }

function createBot(n) {
  const name = BOT_NAMES[(n - 1) % BOT_NAMES.length];
  return { id: makeBotId(n), userId: makeBotId(n), username: name, isBot: true };
}

// Return all legal (source, color, patternRow) moves for the current player
function getLegalMoves(state, playerIndex) {
  const player = state.players[playerIndex];
  const moves = [];

  const sources = [];
  state.factories.forEach((f, i) => { if (f.length) sources.push(String(i)); });
  const centerColors = [...new Set(state.center.filter(t => t !== 'first'))];
  if (centerColors.length) sources.push('center');

  for (const source of sources) {
    let colors;
    if (source === 'center') {
      colors = centerColors;
    } else {
      colors = [...new Set(state.factories[parseInt(source)])];
    }

    for (const color of colors) {
      // Try each pattern row
      for (let row = 0; row < 5; row++) {
        const line = player.patternLines[row];
        if (line.color && line.color !== color) continue;
        const wallCol = WALL_PATTERN[row].indexOf(color);
        if (player.wall[row][wallCol]) continue;
        moves.push({ source, color, patternRow: row });
      }
      // Always legal to dump to floor
      moves.push({ source, color, patternRow: 'floor' });
    }
  }

  return moves;
}

// Heuristic score for a move — prefer filling rows, avoid floor
function scoreMoveHeuristic(state, playerIndex, move) {
  if (move.patternRow === 'floor') return -5;
  const player = state.players[playerIndex];
  const line = player.patternLines[move.patternRow];
  const fillRatio = (line.count + 1) / line.slots; // closer to 1 = better
  const rowBonus = move.patternRow; // prefer smaller rows (easier to fill)
  return fillRatio * 10 - rowBonus * 0.5;
}

function chooseBotMove(state, playerIndex) {
  const moves = getLegalMoves(state, playerIndex);
  if (!moves.length) return null;
  // Sort by heuristic descending, pick best
  moves.sort((a, b) => scoreMoveHeuristic(state, playerIndex, b) - scoreMoveHeuristic(state, playerIndex, a));
  return moves[0];
}

module.exports = { createBot, isBotId, chooseBotMove };
