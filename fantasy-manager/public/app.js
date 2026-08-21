const app = document.getElementById('app');
const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const fileNameEl = document.getElementById('fileName');
const uploadBtn = document.getElementById('uploadBtn');
const uploadStatus = document.getElementById('uploadStatus');
const sourceBadge = document.getElementById('sourceBadge');
const mflForm = document.getElementById('mflForm');
const mflLeagueId = document.getElementById('mflLeagueId');
const mflYear = document.getElementById('mflYear');
const mflImportBtn = document.getElementById('mflImportBtn');

const ROSTER_STATUS_TAG = {
  TAXI_SQUAD: 'Taxi',
  INJURED_RESERVE: 'IR',
};
const myTeamPrompt = document.getElementById('myTeamPrompt');
const myTeamSelect = document.getElementById('myTeamSelect');
const myTeamSave = document.getElementById('myTeamSave');
const myTeamError = document.getElementById('myTeamError');
const playerRowTemplate = document.getElementById('playerRowTemplate');
const teamCardTemplate = document.getElementById('teamCardTemplate');

const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DST', 'DEF'];

let currentLeague = null;
const availableFilter = { query: '', position: 'ALL' };

function formatTimestamp(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return '';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function positionRank(pos) {
  const idx = POSITION_ORDER.indexOf((pos || '').toUpperCase());
  return idx === -1 ? POSITION_ORDER.length : idx;
}

function sortByPositionThenRanking(players) {
  return players.slice().sort((a, b) => {
    const posDiff = positionRank(a.position) - positionRank(b.position);
    if (posDiff !== 0) return posDiff;
    const ra = typeof a.ranking === 'number' ? a.ranking : Infinity;
    const rb = typeof b.ranking === 'number' ? b.ranking : Infinity;
    return ra - rb;
  });
}

function renderPlayerRow(player) {
  const node = playerRowTemplate.content.cloneNode(true);
  const statusTag = player.rosterStatus && ROSTER_STATUS_TAG[player.rosterStatus];
  node.querySelector('.player-name').textContent = statusTag ? `${player.name} (${statusTag})` : player.name;
  const badge = node.querySelector('.pos-badge');
  const pos = (player.position || '').toUpperCase();
  badge.textContent = pos || '—';
  badge.dataset.pos = pos;
  node.querySelector('.player-nfl-team').textContent = player.nflTeam || '—';
  node.querySelector('.player-ranking').textContent =
    typeof player.ranking === 'number' ? player.ranking : (player.ranking || '—');
  return node;
}

function renderRosterTable(tbody, players) {
  tbody.innerHTML = '';
  if (players.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-note">No players.</td></tr>';
    return;
  }
  for (const p of sortByPositionThenRanking(players)) {
    tbody.appendChild(renderPlayerRow(p));
  }
}

function renderTeamCard(team) {
  const node = teamCardTemplate.content.cloneNode(true);
  node.querySelector('.team-card-name').textContent = team.name;
  node.querySelector('.team-card-count').textContent = `${team.players.length} players`;
  const body = node.querySelector('.team-card-body');
  const header = node.querySelector('.team-card-header');
  renderRosterTable(node.querySelector('.roster-body'), team.players);

  body.hidden = true;
  header.setAttribute('aria-expanded', 'false');
  header.addEventListener('click', () => {
    const expanded = header.getAttribute('aria-expanded') === 'true';
    header.setAttribute('aria-expanded', String(!expanded));
    header.classList.toggle('is-open', !expanded);
    body.hidden = expanded;
  });

  return node;
}

function renderAvailableTable() {
  const league = currentLeague;
  const query = availableFilter.query.trim().toLowerCase();
  let players = league.availablePlayers;
  if (availableFilter.position !== 'ALL') {
    players = players.filter((p) => (p.position || '').toUpperCase() === availableFilter.position);
  }
  if (query) {
    players = players.filter((p) => p.name.toLowerCase().includes(query));
  }
  const tbody = document.getElementById('availableBody');
  if (tbody) renderRosterTable(tbody, players);
}

const DEFAULT_POSITION_TARGETS = { QB: 3, RB: 6, WR: 6, TE: 3, K: 2, DST: 2 };
const RECOMMEND_PER_POSITION = 5;

const DEFAULT_STARTER_SLOTS = { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DST: 1 };
const DEFINITELY_OUT_STATUSES = new Set(['OUT', 'O', 'IR', 'INJURED RESERVE', 'RETIRED', 'PUP', 'SUSPENDED']);
let lastWeeklyInput = '';

function isUnavailableThisWeek(player) {
  if (player.isBye) return true;
  return DEFINITELY_OUT_STATUSES.has((player.injuryStatus || '').toUpperCase());
}

function renderWeeklyResults(data) {
  const container = document.getElementById('weeklyResults');
  if (!container) return;
  const starterSlots = { ...DEFAULT_STARTER_SLOTS, ...(data.starterSlots || {}) };
  const byPos = {};
  for (const p of data.players) {
    const pos = (p.position || '').toUpperCase();
    if (!pos) continue;
    (byPos[pos] = byPos[pos] || []).push(p);
  }
  const positions = Object.keys(byPos).sort((a, b) => positionRank(a) - positionRank(b));

  const html = positions
    .map((pos) => {
      const players = byPos[pos].slice().sort((a, b) => {
        const ra = typeof a.ranking === 'number' ? a.ranking : Infinity;
        const rb = typeof b.ranking === 'number' ? b.ranking : Infinity;
        return ra - rb;
      });
      const slotCount = starterSlots[pos] || 1;
      let started = 0;

      const rows = players
        .map((p) => {
          const unavailable = isUnavailableThisWeek(p);
          let role = 'bench';
          if (!unavailable && started < slotCount) {
            role = 'start';
            started += 1;
          }

          const rankNotes = [];
          if (p.oppRushDefenseRank != null) rankNotes.push(`Rush D #${p.oppRushDefenseRank}`);
          if (p.oppPassDefenseRank != null) rankNotes.push(`Pass D #${p.oppPassDefenseRank}`);
          const oppMain = p.isBye ? 'BYE' : p.opponent ? `${p.isHome ? 'vs' : '@'} ${escapeHtml(p.opponent)}` : '—';
          const oppText = rankNotes.length
            ? `${oppMain}<br/><span class="opp-rank-note">${escapeHtml(rankNotes.join(' · '))}</span>`
            : oppMain;

          const injuryHtml = p.injuryStatus
            ? `<span class="injury-badge">${escapeHtml(p.injuryStatus)}</span>`
            : '—';
          const rank = typeof p.ranking === 'number' ? p.ranking : (p.ranking || '—');

          return `<tr class="lineup-row">
            <td class="player-name">${escapeHtml(p.name)}</td>
            <td class="player-nfl-team">${escapeHtml(p.nflTeam || '—')}</td>
            <td>${oppText}</td>
            <td>${injuryHtml}</td>
            <td class="player-ranking">${escapeHtml(String(rank))}</td>
            <td><span class="role-badge role-${role}">${role === 'start' ? 'Start' : 'Bench'}</span></td>
          </tr>`;
        })
        .join('');

      return `
        <h3 class="draft-pos-heading">${escapeHtml(pos)}</h3>
        <table class="roster-table lineup-table">
          <thead><tr><th>Player</th><th>NFL Team</th><th>Opponent</th><th>Status</th><th>Rank</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    })
    .join('');

  container.innerHTML = html || '<p class="empty-note">No players to show.</p>';
}

function renderWeeklySection(league) {
  const section = document.getElementById('weeklySection');
  if (!section) return;
  if (league.source !== 'mfl' || !league.myTeamName) {
    section.innerHTML = '';
    return;
  }

  section.innerHTML = `
    <h2 class="section-heading">Weekly Lineup Check</h2>
    <form id="weeklyForm" class="mfl-form">
      <span class="mfl-label">Week:</span>
      <input id="weeklyWeekInput" type="text" inputmode="numeric" placeholder="e.g. 1" value="${escapeHtml(lastWeeklyInput)}" style="width: 60px" />
      <button type="submit" class="btn btn-primary" id="weeklyCheckBtn">Check This Week</button>
    </form>
    <p id="weeklyStatus" class="upload-status" hidden></p>
    <div id="weeklyResults"></div>
  `;

  document.getElementById('weeklyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const week = document.getElementById('weeklyWeekInput').value.trim();
    lastWeeklyInput = week;
    if (!week) return;

    const btn = document.getElementById('weeklyCheckBtn');
    const status = document.getElementById('weeklyStatus');
    btn.disabled = true;
    status.hidden = false;
    status.classList.remove('is-error');
    status.textContent = 'Checking live status…';

    try {
      const res = await fetch(`/api/lineup?week=${encodeURIComponent(week)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server responded ${res.status}`);
      status.hidden = false;
      status.textContent = `Week ${data.week} — checked ${formatTimestamp(data.generatedAt)}`;
      renderWeeklyResults(data);
    } catch (err) {
      status.hidden = false;
      status.classList.add('is-error');
      status.textContent = err.message;
      document.getElementById('weeklyResults').innerHTML = '';
    } finally {
      btn.disabled = false;
    }
  });
}

function countByPosition(players) {
  const counts = {};
  for (const p of players) {
    const pos = (p.position || '').toUpperCase();
    if (!pos) continue;
    counts[pos] = (counts[pos] || 0) + 1;
  }
  return counts;
}

function bestAvailableAtPosition(availablePlayers, pos, limit) {
  return availablePlayers
    .filter((p) => (p.position || '').toUpperCase() === pos)
    .slice()
    .sort((a, b) => {
      const ra = typeof a.ranking === 'number' ? a.ranking : Infinity;
      const rb = typeof b.ranking === 'number' ? b.ranking : Infinity;
      return ra - rb;
    })
    .slice(0, limit);
}

function renderMiniTable(players) {
  if (players.length === 0) return '<p class="empty-note">No available players at this position.</p>';
  const rows = players
    .map((p) => {
      const pos = (p.position || '').toUpperCase();
      const rank = typeof p.ranking === 'number' ? p.ranking : (p.ranking || '—');
      return `<tr>
        <td class="player-name">${escapeHtml(p.name)}</td>
        <td><span class="pos-badge" data-pos="${escapeHtml(pos)}">${escapeHtml(pos || '—')}</span></td>
        <td class="player-nfl-team">${escapeHtml(p.nflTeam || '—')}</td>
        <td class="player-ranking">${escapeHtml(String(rank))}</td>
      </tr>`;
    })
    .join('');
  return `
    <table class="roster-table draft-mini-table">
      <thead><tr><th>Player</th><th>Pos</th><th>NFL Team</th><th>Rank</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderDraftBoard(league, myTeam) {
  const section = document.getElementById('draftSection');
  if (!section) return;
  if (!myTeam) {
    section.innerHTML = '';
    return;
  }

  const targets = { ...DEFAULT_POSITION_TARGETS, ...(league.positionTargets || {}) };
  const counts = countByPosition(myTeam.players);
  const needs = Array.from(new Set([...Object.keys(targets), ...Object.keys(counts)]))
    .filter((pos) => targets[pos] > 0)
    .sort((a, b) => positionRank(a) - positionRank(b))
    .map((pos) => ({ pos, count: counts[pos] || 0, target: targets[pos] }));

  const summaryHtml = needs
    .map((n) => `<span class="need-chip${n.count < n.target ? ' is-short' : ''}">${escapeHtml(n.pos)} ${n.count}/${n.target}</span>`)
    .join('');

  const shortPositions = needs.filter((n) => n.count < n.target).map((n) => n.pos);

  let recommendationsHtml;
  if (shortPositions.length === 0) {
    const top = sortByPositionThenRanking(league.availablePlayers).slice(0, 10);
    recommendationsHtml = `
      <p class="draft-note">Your roster looks well-stocked everywhere (by these rough depth targets) — here's the best available overall.</p>
      ${renderMiniTable(top)}
    `;
  } else {
    recommendationsHtml = shortPositions
      .map((pos) => `
        <h3 class="draft-pos-heading">${escapeHtml(pos)} <span class="draft-pos-note">— below depth target</span></h3>
        ${renderMiniTable(bestAvailableAtPosition(league.availablePlayers, pos, RECOMMEND_PER_POSITION))}
      `)
      .join('');
  }

  section.innerHTML = `
    <h2 class="section-heading">Draft Recommendations</h2>
    <div class="need-summary">${summaryHtml}</div>
    <p class="draft-note draft-note-muted">Depth targets are a rough heuristic (roughly 2&times; your league's max starters at each position), not your league's actual bench rules.</p>
    ${recommendationsHtml}
  `;
}

function renderApp() {
  const league = currentLeague;
  app.innerHTML = `
    <section class="my-roster-section" id="myRosterSection"></section>
    <section class="weekly-section" id="weeklySection"></section>
    <section class="draft-section" id="draftSection"></section>
    <section class="league-section">
      <h2 class="section-heading">League Rosters</h2>
      <div class="team-list" id="teamList"></div>
    </section>
    <section class="available-section">
      <h2 class="section-heading">Available Players</h2>
      <div class="available-controls">
        <input id="availableSearch" class="search-input" type="search" placeholder="Search players…" aria-label="Search available players" />
        <select id="positionFilter" class="position-select" aria-label="Filter by position"></select>
      </div>
      <table class="roster-table available-table">
        <thead><tr><th>Player</th><th>Pos</th><th>NFL Team</th><th>Rank</th></tr></thead>
        <tbody id="availableBody"></tbody>
      </table>
    </section>
  `;

  const myTeam = league.teams.find((t) => t.name === league.myTeamName);
  const myRosterSection = document.getElementById('myRosterSection');
  if (myTeam) {
    myRosterSection.innerHTML = `
      <h2 class="section-heading">My Roster — ${escapeHtml(myTeam.name)}</h2>
      <table class="roster-table my-roster-table">
        <thead><tr><th>Player</th><th>Pos</th><th>NFL Team</th><th>Rank</th></tr></thead>
        <tbody id="myRosterBody"></tbody>
      </table>
    `;
    renderRosterTable(document.getElementById('myRosterBody'), myTeam.players);
  }
  renderWeeklySection(league);
  renderDraftBoard(league, myTeam);

  const teamList = document.getElementById('teamList');
  const otherTeams = league.teams.filter((t) => t.name !== league.myTeamName);
  if (otherTeams.length === 0) {
    teamList.innerHTML = '<p class="empty-note">No other team rosters found in the uploaded file.</p>';
  } else {
    for (const team of otherTeams) {
      teamList.appendChild(renderTeamCard(team));
    }
  }

  const positions = Array.from(
    new Set(league.availablePlayers.map((p) => (p.position || '').toUpperCase()).filter(Boolean))
  ).sort((a, b) => positionRank(a) - positionRank(b));

  const positionFilter = document.getElementById('positionFilter');
  positionFilter.innerHTML =
    '<option value="ALL">All positions</option>' +
    positions.map((p) => `<option value="${p}">${p}</option>`).join('');
  positionFilter.value = availableFilter.position;

  const searchInput = document.getElementById('availableSearch');
  searchInput.value = availableFilter.query;

  renderAvailableTable();

  searchInput.addEventListener('input', (e) => {
    availableFilter.query = e.target.value;
    renderAvailableTable();
  });
  positionFilter.addEventListener('change', (e) => {
    availableFilter.position = e.target.value;
    renderAvailableTable();
  });
}

function updateMyTeamPrompt(league) {
  myTeamError.hidden = true;
  if (league.myTeamName) {
    myTeamPrompt.hidden = true;
    return;
  }
  myTeamPrompt.hidden = league.teams.length === 0;
  myTeamSelect.innerHTML = league.teams
    .map((t) => `<option value="${escapeHtml(t.name)}">${escapeHtml(t.name)}</option>`)
    .join('');
}

const SOURCE_BADGE_TEXT = {
  sample: 'Sample data',
  mfl: 'MFL import',
};

function applyLeague(data) {
  currentLeague = data;
  const badgeText = SOURCE_BADGE_TEXT[data.source];
  sourceBadge.hidden = !badgeText;
  if (badgeText) sourceBadge.textContent = badgeText;
  updateMyTeamPrompt(data);
  renderApp();
}

async function fetchLeague() {
  app.innerHTML = '<div class="loading">Loading league…</div>';
  try {
    const res = await fetch('/api/league');
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    applyLeague(await res.json());
  } catch (err) {
    app.innerHTML = `<div class="error-state">Couldn't load league: ${err.message}</div>`;
  }
}

function showUploadStatus(message, isError) {
  uploadStatus.hidden = false;
  uploadStatus.textContent = message;
  uploadStatus.classList.toggle('is-error', Boolean(isError));
}

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = fileInput.files[0];
  if (!file) {
    showUploadStatus('Choose a .xlsx file first.', true);
    return;
  }
  const formData = new FormData();
  formData.append('spreadsheet', file);
  uploadBtn.disabled = true;
  showUploadStatus('Uploading…', false);
  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Server responded ${res.status}`);
    applyLeague(data);
    showUploadStatus(
      `Loaded ${data.teams.length} team(s) and ${data.availablePlayers.length} available player(s).`,
      false
    );
    fileInput.value = '';
    fileNameEl.textContent = 'Choose .xlsx…';
  } catch (err) {
    showUploadStatus(err.message, true);
  } finally {
    uploadBtn.disabled = false;
  }
});

fileInput.addEventListener('change', () => {
  fileNameEl.textContent = fileInput.files[0] ? fileInput.files[0].name : 'Choose .xlsx…';
});

myTeamSave.addEventListener('click', async () => {
  const teamName = myTeamSelect.value;
  if (!teamName) return;
  myTeamSave.disabled = true;
  myTeamError.hidden = true;
  try {
    const res = await fetch('/api/league/my-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Server responded ${res.status}`);
    applyLeague(data);
  } catch (err) {
    myTeamError.hidden = false;
    myTeamError.textContent = err.message;
  } finally {
    myTeamSave.disabled = false;
  }
});

mflForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const leagueId = mflLeagueId.value.trim();
  const year = mflYear.value.trim();
  if (!leagueId || !year) {
    showUploadStatus('Enter both a league ID and a year.', true);
    return;
  }
  mflImportBtn.disabled = true;
  showUploadStatus('Importing from MFL…', false);
  try {
    const res = await fetch('/api/import/mfl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId, year }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Server responded ${res.status}`);
    applyLeague(data);
    showUploadStatus(
      `Imported ${data.teams.length} team(s) and ${data.availablePlayers.length} available player(s) from MFL.`,
      false
    );
  } catch (err) {
    showUploadStatus(err.message, true);
  } finally {
    mflImportBtn.disabled = false;
  }
});

fetchLeague();
