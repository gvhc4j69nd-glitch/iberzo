const app = document.getElementById('app');
const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const fileNameEl = document.getElementById('fileName');
const uploadBtn = document.getElementById('uploadBtn');
const uploadStatus = document.getElementById('uploadStatus');
const sourceBadge = document.getElementById('sourceBadge');
const myTeamPrompt = document.getElementById('myTeamPrompt');
const myTeamSelect = document.getElementById('myTeamSelect');
const myTeamSave = document.getElementById('myTeamSave');
const myTeamError = document.getElementById('myTeamError');
const playerRowTemplate = document.getElementById('playerRowTemplate');
const teamCardTemplate = document.getElementById('teamCardTemplate');

const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DST', 'DEF'];

let currentLeague = null;
const availableFilter = { query: '', position: 'ALL' };

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
  node.querySelector('.player-name').textContent = player.name;
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

function renderApp() {
  const league = currentLeague;
  app.innerHTML = `
    <section class="my-roster-section" id="myRosterSection"></section>
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

function applyLeague(data) {
  currentLeague = data;
  sourceBadge.hidden = data.source !== 'sample';
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

fetchLeague();
