const COLORS = ['blue', 'yellow', 'red', 'black', 'white'];
const WALL_PATTERN = [
  ['blue', 'yellow', 'red', 'black', 'white'],
  ['white', 'blue', 'yellow', 'red', 'black'],
  ['black', 'white', 'blue', 'yellow', 'red'],
  ['red', 'black', 'white', 'blue', 'yellow'],
  ['yellow', 'red', 'black', 'white', 'blue'],
];
const FLOOR_PENALTIES = [-1, -1, -2, -2, -2, -3, -3];
const FACTORY_COUNT = { 2: 5, 3: 7, 4: 9 };
const TILES_PER_FACTORY = 4;

function createBag() {
  const bag = [];
  COLORS.forEach(c => { for (let i = 0; i < 20; i++) bag.push(c); });
  return shuffle(bag);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createPlayer(userId, username) {
  return {
    userId,
    username,
    patternLines: Array.from({ length: 5 }, (_, i) => ({ slots: i + 1, color: null, count: 0 })),
    wall: Array.from({ length: 5 }, () => Array(5).fill(null)),
    floor: [],
    score: 0,
    hasFirstPlayerToken: false,
  };
}

function createGame(players) {
  const numPlayers = players.length;
  const bag = createBag();
  const numFactories = FACTORY_COUNT[numPlayers] || 5;

  const factories = Array.from({ length: numFactories }, () => {
    return bag.splice(0, TILES_PER_FACTORY);
  });

  return {
    players: players.map(p => createPlayer(p.userId, p.username)),
    factories,
    center: ['first'],
    bag,
    discard: [],
    currentPlayerIndex: 0,
    round: 1,
    phase: 'drafting',
    gameOver: false,
  };
}

function takeTiles(state, playerIndex, source, color) {
  if (state.currentPlayerIndex !== playerIndex) return { error: 'Not your turn' };
  if (state.phase !== 'drafting') return { error: 'Wrong phase' };

  let taken = [];

  if (source === 'center') {
    if (state.center.includes('first')) {
      state.players[playerIndex].floor.push('first');
      state.center = state.center.filter(t => t !== 'first');
    }
    taken = state.center.filter(t => t === color);
    state.center = state.center.filter(t => t !== color);
  } else {
    const factoryIdx = parseInt(source);
    const factory = state.factories[factoryIdx];
    if (!factory || !factory.includes(color)) return { error: 'Invalid selection' };
    taken = factory.filter(t => t === color);
    const leftover = factory.filter(t => t !== color);
    state.factories[factoryIdx] = [];
    state.center.push(...leftover);
  }

  if (!taken.length) return { error: 'No tiles of that color' };

  return { taken };
}

function validatePlacement(state, playerIndex, color, patternRow) {
  if (patternRow === 'floor') return {};
  const player = state.players[playerIndex];
  const line = player.patternLines[patternRow];
  if (line.color && line.color !== color) return { error: 'Row already has a different color' };
  if (line.count === line.slots) return { error: 'Pattern line is already full' };
  const wallCol = WALL_PATTERN[patternRow].indexOf(color);
  if (player.wall[patternRow][wallCol]) return { error: 'Wall space already filled' };
  return {};
}

function placeTiles(state, playerIndex, taken, patternRow) {
  const player = state.players[playerIndex];

  if (patternRow === 'floor') {
    player.floor.push(...taken.filter(t => t !== 'first'));
    return {};
  }

  const line = player.patternLines[patternRow];
  if (line.color && line.color !== taken[0]) return { error: 'Row already has a different color' };
  const wallCol = WALL_PATTERN[patternRow].indexOf(taken[0]);
  if (player.wall[patternRow][wallCol]) return { error: 'Wall space already filled' };

  line.color = taken[0];
  const space = line.slots - line.count;
  const fit = taken.slice(0, space);
  const overflow = taken.slice(space);
  line.count += fit.length;
  player.floor.push(...overflow);

  return {};
}

function endRound(state) {
  const roundSummary = [];

  // Tiling phase
  state.players.forEach(player => {
    const scoreBefore = player.score;
    const tilePlacements = [];

    player.patternLines.forEach((line, row) => {
      if (line.count === line.slots) {
        const col = WALL_PATTERN[row].indexOf(line.color);
        player.wall[row][col] = line.color;
        const pts = calcTileScore(player.wall, row, col);
        player.score += pts;
        tilePlacements.push({ row, color: line.color, pts });
        state.discard.push(...Array(line.slots - 1).fill(line.color));
        line.color = null;
        line.count = 0;
      }
    });

    // Floor penalty — 'first' token occupies a slot and counts as -1
    let penaltyIdx = 0;
    let penalty = 0;
    for (const t of player.floor.slice(0, 7)) {
      if (t === 'first') { player.hasFirstPlayerToken = true; }
      penalty += FLOOR_PENALTIES[penaltyIdx] ?? -3;
      penaltyIdx++;
    }
    const scoreAfterTiles = player.score;
    player.score = Math.max(0, player.score + penalty);
    state.discard.push(...player.floor.filter(t => t !== 'first'));
    player.floor = [];

    const actualPenalty = player.score - scoreAfterTiles; // ≤ 0 (may be clamped)
    roundSummary.push({
      username: player.username,
      scoreBefore,
      tilePlacements,
      tilePoints: scoreAfterTiles - scoreBefore,
      floorPenalty: actualPenalty,
      scoreAfter: player.score,
    });
  });

  state.roundSummary = roundSummary;

  // Check game over (any player completed a wall row)
  const gameOver = state.players.some(p => p.wall.some(row => row.every(Boolean)));
  if (gameOver) {
    finalScoring(state);
    state.gameOver = true;
    return;
  }

  // Refill factories
  if (state.bag.length < state.factories.length * TILES_PER_FACTORY) {
    state.bag.push(...shuffle(state.discard));
    state.discard = [];
  }
  state.factories = state.factories.map(() => state.bag.splice(0, TILES_PER_FACTORY));
  state.center = ['first'];

  // First player token goes to next round starter
  const firstIdx = state.players.findIndex(p => p.hasFirstPlayerToken);
  state.players.forEach(p => p.hasFirstPlayerToken = false);
  state.currentPlayerIndex = firstIdx >= 0 ? firstIdx : 0;
  state.round++;
  state.phase = 'drafting';
  // roundSummary is cleared once a new move is made (handled client-side via phase change)
}

function calcTileScore(wall, row, col) {
  let score = 1;
  let h = 1;
  for (let c = col - 1; c >= 0 && wall[row][c]; c--) h++;
  for (let c = col + 1; c < 5 && wall[row][c]; c++) h++;
  let v = 1;
  for (let r = row - 1; r >= 0 && wall[r][col]; r--) v++;
  for (let r = row + 1; r < 5 && wall[r][col]; r++) v++;
  if (h > 1) score += h - 1;
  if (v > 1) score += v - 1;
  return score;
}

function finalScoring(state) {
  const finalSummary = [];
  state.players.forEach(player => {
    const scoreBeforeBonuses = player.score;
    const completedRows = [];
    const completedCols = [];
    const completedColors = [];

    // Complete rows (+2 each)
    player.wall.forEach((row, r) => {
      if (row.every(Boolean)) { player.score += 2; completedRows.push(r); }
    });
    // Complete columns (+7 each)
    for (let c = 0; c < 5; c++) {
      if (player.wall.every(row => row[c])) { player.score += 7; completedCols.push(c); }
    }
    // Complete colors (+10 each)
    COLORS.forEach(color => {
      const count = player.wall.flat().filter(t => t === color).length;
      if (count === 5) { player.score += 10; completedColors.push(color); }
    });

    finalSummary.push({
      username: player.username,
      scoreBeforeBonuses,
      completedRows,
      completedCols,
      completedColors,
      bonusPoints: player.score - scoreBeforeBonuses,
      finalScore: player.score,
    });
  });
  state.finalSummary = finalSummary;
}

function isDraftingOver(state) {
  return state.factories.every(f => f.length === 0) &&
    state.center.filter(t => t !== 'first').length === 0;
}

module.exports = { createGame, takeTiles, placeTiles, validatePlacement, endRound, isDraftingOver, WALL_PATTERN };
