const ExcelJS = require('exceljs');

const AVAILABLE_SHEET_NAME = /available|free.?agent|waiver/i;

const COLUMN_ALIASES = {
  name: /^player(\s*name)?$|^name$/i,
  nflTeam: /^team$|^nfl\s*team$/i,
  position: /^pos(ition)?$/i,
  ranking: /^rank(ing)?$/i,
};

function normalizeCell(value) {
  if (value == null) return '';
  if (typeof value === 'object' && 'text' in value) return String(value.text).trim();
  if (typeof value === 'object' && 'result' in value) return String(value.result).trim();
  return String(value).trim();
}

function mapHeaderRow(row) {
  const columnIndexFor = {};
  row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const header = normalizeCell(cell.value);
    for (const [field, pattern] of Object.entries(COLUMN_ALIASES)) {
      if (pattern.test(header)) columnIndexFor[field] = colNumber;
    }
  });
  return columnIndexFor;
}

function parseRanking(raw) {
  if (raw === '' || raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : raw;
}

function extractPlayers(worksheet) {
  const players = [];
  let columnIndexFor = null;

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) {
      columnIndexFor = mapHeaderRow(row);
      return;
    }
    if (!columnIndexFor || columnIndexFor.name == null) return;

    const name = normalizeCell(row.getCell(columnIndexFor.name).value);
    if (!name) return;

    players.push({
      name,
      nflTeam: columnIndexFor.nflTeam != null ? normalizeCell(row.getCell(columnIndexFor.nflTeam).value) : '',
      position: columnIndexFor.position != null ? normalizeCell(row.getCell(columnIndexFor.position).value) : '',
      ranking: columnIndexFor.ranking != null ? parseRanking(normalizeCell(row.getCell(columnIndexFor.ranking).value)) : null,
    });
  });

  return players;
}

/**
 * Parses a multi-tab fantasy football workbook: one sheet per team's roster,
 * plus a sheet for available/free-agent players (matched by name). Each
 * sheet needs a header row with player name / team / position / ranking
 * columns (flexible naming, see COLUMN_ALIASES).
 */
async function parseSpreadsheet(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const teams = [];
  let availablePlayers = [];

  workbook.eachSheet((worksheet) => {
    const players = extractPlayers(worksheet);
    if (AVAILABLE_SHEET_NAME.test(worksheet.name)) {
      availablePlayers = availablePlayers.concat(players);
    } else {
      teams.push({ name: worksheet.name, players });
    }
  });

  return { teams, availablePlayers, generatedAt: new Date().toISOString() };
}

module.exports = { parseSpreadsheet };
