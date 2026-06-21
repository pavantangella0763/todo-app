// Talks to the Spring Boot backend in /backend.
// Run it first (cd backend && mvn spring-boot:run) so it's listening on :8080.
const API_BASE = 'http://localhost:8080/api/tasks';

/** @type {{id:number, text:string, done:boolean, createdAt:string, completedAt:string|null}[]} */
let tasks = [];
let loadError = null;

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function tiltFor(id) {
  const s = String(id);
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  const deg = ((Math.abs(hash) % 24) / 10) - 1.2; // roughly -1.2deg .. 1.2deg
  return deg.toFixed(2);
}

function greetingText() {
  const h = new Date().getHours();
  if (h < 5) return 'Still up?';
  if (h < 12) return 'Good morning.';
  if (h < 17) return 'Good afternoon.';
  if (h < 21) return 'Good evening.';
  return 'Winding down.';
}

function metaText() {
  const now = new Date();
  const dateStr = now
    .toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    .toUpperCase();
  const open = tasks.filter((t) => !t.done).length;
  const doneToday = tasks.filter((t) => t.done && isToday(t.completedAt)).length;
  return `${dateStr}  ·  ${open} open, ${doneToday} done today`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function taskEl(t) {
  const row = document.createElement('div');
  row.className = 'task' + (t.done ? ' done' : '');
  row.style.setProperty('--tilt', tiltFor(t.id) + 'deg');
  row.innerHTML = `
    <button class="check" type="button" aria-label="${t.done ? 'Mark not done' : 'Mark done'}" data-id="${t.id}">
      <svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#1B1F2A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <span class="task-text">${escapeHtml(t.text)}</span>
    <button class="delete" type="button" aria-label="Delete task" data-id="${t.id}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M9 6V4h6v2m-8 0 1 14h8l1-14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
  `;
  return row;
}

function render() {
  document.getElementById('greeting').textContent = greetingText();
  document.getElementById('meta').textContent = metaText();

  const list = document.getElementById('list');
  list.innerHTML = '';

  if (loadError) {
    list.innerHTML = `<div class="empty-state error">${escapeHtml(loadError)}</div>`;
    return;
  }

  if (tasks.length === 0) {
    list.innerHTML = `<div class="empty-state">The page is empty. Add your first task below.</div>`;
    return;
  }

  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

  open.forEach((t) => list.appendChild(taskEl(t)));

  if (done.length) {
    const divider = document.createElement('p');
    divider.className = 'divider';
    divider.textContent = `Done (${done.length})`;
    list.appendChild(divider);
    done.forEach((t) => list.appendChild(taskEl(t)));
  }
}

// ---- Backend calls ----

async function refreshTasks() {
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error('Request failed');
    tasks = await res.json();
    loadError = null;
  } catch (err) {
    console.error(err);
    loadError = "Can't reach the server. Start the backend with 'mvn spring-boot:run' in /backend, then reload.";
  }
  render();
}

async function addTask(text) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Could not add the task.');
    }
    loadError = null;
    await refreshTasks();
    return true;
  } catch (err) {
    console.error(err);
    loadError = err.message;
    render();
    return false;
  }
}

async function toggleTask(id) {
  const row = document.querySelector(`.check[data-id="${id}"]`)?.closest('.task');
  const willAnimate = !!row && !row.classList.contains('done');
  if (willAnimate) row.classList.add('done'); // play the stamp animation before the list re-sorts

  try {
    const res = await fetch(`${API_BASE}/${id}/toggle`, { method: 'PUT' });
    if (!res.ok) throw new Error('Could not update the task.');
    const updated = await res.json();
    tasks = tasks.map((t) => (t.id === updated.id ? updated : t));
    loadError = null;
    willAnimate ? setTimeout(render, 420) : render();
  } catch (err) {
    console.error(err);
    loadError = err.message;
    render();
  }
}

async function removeTask(id) {
  const row = document.querySelector(`.check[data-id="${id}"]`)?.closest('.task');
  if (row) row.classList.add('removing');

  try {
    const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) throw new Error('Could not delete the task.');
    setTimeout(() => {
      tasks = tasks.filter((t) => t.id !== id);
      loadError = null;
      render();
    }, row ? 220 : 0);
  } catch (err) {
    console.error(err);
    loadError = err.message;
    render();
  }
}

// ---- Wiring ----

document.getElementById('list').addEventListener('click', (e) => {
  const checkBtn = e.target.closest('.check');
  if (checkBtn) {
    toggleTask(Number(checkBtn.dataset.id));
    return;
  }
  const delBtn = e.target.closest('.delete');
  if (delBtn) {
    removeTask(Number(delBtn.dataset.id));
  }
});

const composer = document.getElementById('composer');
const input = document.getElementById('taskInput');
const submitBtn = document.querySelector('.composer-submit');

input.addEventListener('input', () => {
  submitBtn.disabled = !input.value.trim();
});

composer.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = input.value;
  if (!text.trim()) return;
  submitBtn.disabled = true;
  const ok = await addTask(text);
  if (ok) input.value = '';
  submitBtn.disabled = !input.value.trim();
  input.focus();
});

// Keep the date/greeting/stats line fresh if the app is left open.
setInterval(render, 60000);

document.getElementById('list').innerHTML = '<div class="empty-state">Loading your tasks…</div>';
refreshTasks();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
