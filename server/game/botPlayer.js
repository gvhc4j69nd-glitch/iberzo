const { WALL_PATTERN } = require('./azulEngine');

const FLOOR_PENALTIES = [-1, -1, -2, -2, -2, -3, -3];

const BOT_NAMES = ['Bot Picasso', 'Bot Gaudí', 'Bot Dalí', 'Bot Miró'];

function makeBotId(n) { return `bot-${n}`; }
function isBotId(id) { return typeof id === 'string' && id.startsWith('bot-'); }

function createBot(n) {
  const name = BOT_NAMES[(n - 1) % BOT_NAMES.length];
  return { id: makeBotId(n), userId: makeBotId(n), username: name, isBot: true };
}

// How many tiles of `color` are available from a given source
function countAvailable(state, source, color) {
  if (source === 'center') return state.center.filter(t => t === color).length;
  return state.factories[parseInt(source)].filter(t => t === color).length;
}

// Simulate the wall score that would be gained if `color` were placed at [row][col]
function simWallScore(wall, row, col) {
  let h = 1, v = 1;
  for (let c = col - 1; c >= 0 && wall[row][c]; c--) h++;
  for (let c = col + 1; c < 5 && wall[row][c]; c++) h++;
  for (let r = row - 1; r >= 0 && wall[r][col]; r--) v++;
  for (let r = row + 1; r < 5 && wall[r][col]; r++) v++;
  let score = 1;
  if (h > 1) score += h - 1;
  if (v > 1) score += v - 1;
  return score;
}

// Estimate end-game bonus progress for a player
function endGameBonus(wall) {
  let bonus = 0;
  // Rows: +2 each complete row
  for (let r = 0; r < 5; r++) {
    const filled = wall[r].filter(Boolean).length;
    bonus += (filled / 5) * 2; // partial credit toward +2
  }
  // Columns: +7 each complete column
  for (let c = 0; c < 5; c++) {
    const filled = wall.filter(row => row[c]).length;
    bonus += (filled / 5) * 7;
  }
  // Colors: +10 each complete color
  const COLORS = ['blue', 'yellow', 'red', 'black', 'white'];
  for (const color of COLORS) {
    const count = wall.flat().filter(t => t === color).length;
    bonus += (count / 5) * 10;
  }
  return bonus;
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
      for (let row = 0; row < 5; row++) {
        const line = player.patternLines[row];
        if (line.color && line.color !== color) continue;
        if (line.count === line.slots) continue;
        const wallCol = WALL_PATTERN[row].indexOf(color);
        if (player.wall[row][wallCol]) continue;
        moves.push({ source, color, patternRow: row });
      }
      moves.push({ source, color, patternRow: 'floor' });
    }
  }

  return moves;
}

function scoreMoveHeuristic(state, playerIndex, move) {
  const player = state.players[playerIndex];
  const numTiles = countAvailable(state, move.source, move.color);

  // ── Floor dump ────────────────────────────────────────────────────────────
  if (move.patternRow === 'floor') {
    const currentFloor = player.floor.length;
    let penalty = 0;
    for (let i = 0; i < Math.min(numTiles, 7 - currentFloor); i++) {
      penalty += FLOOR_PENALTIES[currentFloor + i] || -3;
    }
    return penalty - 2; // always unattractive, slightly worse than its raw penalty
  }

  const row = move.patternRow;
  const line = player.patternLines[row];
  const wallCol = WALL_PATTERN[row].indexOf(move.color);

  // ── Tiles that fit vs overflow ────────────────────────────────────────────
  const space = line.slots - line.count;
  const fit = Math.min(numTiles, space);
  const overflow = numTiles - fit;

  // Overflow tiles go to floor — penalise them
  const currentFloor = player.floor.length;
  let floorPenalty = 0;
  for (let i = 0; i < Math.min(overflow, 7 - currentFloor); i++) {
    floorPenalty += FLOOR_PENALTIES[currentFloor + i] || -3;
  }

  // ── Will this complete the pattern line this move? ─────────────────────────
  const completesLine = (line.count + fit) === line.slots;

  let score = 0;

  // Immediate wall score when the line completes (adjacency bonus)
  if (completesLine) {
    score += simWallScore(player.wall, row, wallCol) * 3; // weight heavily
  }

  // Progress toward completing the line (partial fill is still good)
  const progressBefore = line.count / line.slots;
  const progressAfter = Math.min(1, (line.count + fit) / line.slots);
  score += (progressAfter - progressBefore) * 8;

  // Bonus for lines that are nearly complete (encourages finishing)
  if (progressAfter >= 0.75) score += 3;
  if (completesLine) score += 4;

  // End-game bonus potential: simulate placing the tile on wall
  const simWall = player.wall.map(r => [...r]);
  simWall[row][wallCol] = move.color;
  score += (endGameBonus(simWall) - endGameBonus(player.wall)) * 0.5;

  // Prefer placing in rows that align with existing wall adjacency
  score += simWallScore(player.wall, row, wallCol) * 0.5;

  // Prefer shorter rows (easier to complete, less waste risk)
  score += (5 - line.slots) * 0.4;

  // Apply floor penalty for overflow
  score += floorPenalty;

  // Small penalty for taking from center (avoids grabbing first-player token early)
  if (move.source === 'center' && state.center.includes('first')) score -= 1.5;

  return score;
}

function chooseBotMove(state, playerIndex) {
  const moves = getLegalMoves(state, playerIndex);
  if (!moves.length) return null;
  moves.sort((a, b) => scoreMoveHeuristic(state, playerIndex, b) - scoreMoveHeuristic(state, playerIndex, a));
  return moves[0];
}

module.exports = { createBot, isBotId, chooseBotMove };
