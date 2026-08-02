const storiesEl = document.getElementById('stories');
const sampleBadge = document.getElementById('sampleBadge');
const updatedAtEl = document.getElementById('updatedAt');
const refreshBtn = document.getElementById('refreshBtn');
const searchInput = document.getElementById('searchInput');
const sortButtons = document.querySelectorAll('.sort-btn');
const storyTemplate = document.getElementById('storyCardTemplate');
const sourceTemplate = document.getElementById('sourceRowTemplate');

let allStories = [];
let currentSort = 'recent'; // 'recent' | 'covered'
let searchQuery = '';

function formatTimestamp(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return '';
  }
}

function renderSource(source) {
  const node = sourceTemplate.content.cloneNode(true);
  const nameEl = node.querySelector('.source-name');
  const labelEl = node.querySelector('.source-bias-label');
  const markerEl = node.querySelector('.bias-meter-marker');

  nameEl.textContent = source.name;
  nameEl.href = source.url;

  const hasScore = typeof source.biasScore === 'number';
  labelEl.textContent = hasScore ? `${source.biasLabel} · ${source.biasScore}/100` : 'Unrated';
  markerEl.style.left = `${hasScore ? source.biasScore : 50}%`;
  if (!hasScore) markerEl.style.opacity = '0.4';

  return node;
}

function renderStory(story) {
  const node = storyTemplate.content.cloneNode(true);
  node.querySelector('.story-headline').textContent = story.headline;
  node.querySelector('.story-summary').textContent = story.summary;
  node.querySelector('.source-count').textContent = story.sourceCount;
  node.querySelector('.plural').style.display = story.sourceCount === 1 ? 'none' : 'inline';

  const list = node.querySelector('.source-list');
  for (const source of story.sources) {
    list.appendChild(renderSource(source));
  }

  return node;
}

function matchesSearch(story, query) {
  if (!query) return true;
  const haystack = [
    story.headline,
    story.summary,
    ...story.sources.map((s) => s.name),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function sortStories(stories, sort) {
  const sorted = stories.slice();
  if (sort === 'covered') {
    sorted.sort((a, b) => b.sourceCount - a.sourceCount);
  } else {
    sorted.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }
  return sorted;
}

function renderVisibleStories() {
  const query = searchQuery.trim().toLowerCase();
  const filtered = allStories.filter((story) => matchesSearch(story, query));
  const sorted = sortStories(filtered, currentSort);

  storiesEl.innerHTML = '';

  if (allStories.length === 0) {
    storiesEl.innerHTML = '<div class="error-state">No stories available right now.</div>';
    return;
  }
  if (sorted.length === 0) {
    storiesEl.innerHTML = `<div class="error-state">No stories match &ldquo;${searchQuery}&rdquo;.</div>`;
    return;
  }
  for (const story of sorted) {
    storiesEl.appendChild(renderStory(story));
  }
}

function setSort(sort) {
  currentSort = sort;
  for (const btn of sortButtons) {
    btn.setAttribute('aria-pressed', String(btn.dataset.sort === sort));
  }
  renderVisibleStories();
}

async function loadStories() {
  storiesEl.innerHTML = '<div class="loading">Loading today’s stories…</div>';
  refreshBtn.disabled = true;

  try {
    const res = await fetch('/api/stories');
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    const data = await res.json();

    sampleBadge.hidden = !data.sample;
    updatedAtEl.textContent = data.generatedAt ? `Updated ${formatTimestamp(data.generatedAt)}` : '';

    allStories = data.stories || [];
    renderVisibleStories();
  } catch (err) {
    allStories = [];
    storiesEl.innerHTML = `<div class="error-state">Couldn’t load stories: ${err.message}</div>`;
  } finally {
    refreshBtn.disabled = false;
  }
}

refreshBtn.addEventListener('click', loadStories);
searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value;
  renderVisibleStories();
});
for (const btn of sortButtons) {
  btn.addEventListener('click', () => setSort(btn.dataset.sort));
}

loadStories();
