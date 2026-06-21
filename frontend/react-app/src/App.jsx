import React, { useEffect, useMemo, useState } from 'react';

const API_BASE = 'http://localhost:8080/api/tasks';

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
  const deg = (Math.abs(hash) % 24) / 10 - 1.2;
  return `${deg.toFixed(2)}deg`;
}

function greetingText() {
  const h = new Date().getHours();
  if (h < 5) return 'Still up?';
  if (h < 12) return 'Good morning.';
  if (h < 17) return 'Good afternoon.';
  if (h < 21) return 'Good evening.';
  return 'Winding down.';
}

function escapeHtml(s) {
  // not needed with React text nodes, but keep for safety when rendering as attributes.
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '<',
    '>': '>',
    '"': '"',
    "'": '&#39;'
  }[c]));
}

function TaskRow({ t, onToggle, onDelete }) {
  return (
    <div className={`task${t.done ? ' done' : ''}`} style={{ transform: `rotate(${tiltFor(t.id)})` }}>
      <button
        className="check"
        type="button"
        aria-label={t.done ? 'Mark not done' : 'Mark done'}
        data-id={t.id}
        onClick={() => onToggle(t.id)}
      >
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M5 13l4 4L19 7" stroke="#1B1F2A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <span className="task-text">{t.text}</span>

      <button
        className="delete"
        type="button"
        aria-label="Delete task"
        data-id={t.id}
        onClick={() => onDelete(t.id)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 6h16M9 6V4h6v2m-8 0 1 14h8l1-14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const stats = useMemo(() => {
    const open = tasks.filter((t) => !t.done).length;
    const doneToday = tasks.filter((t) => t.done && isToday(t.completedAt)).length;
    return { open, doneToday };
  }, [tasks]);

  function metaText() {
    const now = new Date();
    const dateStr = now
      .toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
      .toUpperCase();
    return `${dateStr}  ·  ${stats.open} open, ${stats.doneToday} done today`;
  }

  async function refreshTasks() {
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error('Request failed');
      setTasks(await res.json());
      setLoadError(null);
    } catch (err) {
      console.error(err);
      setLoadError("Can't reach the server. Start the backend on :8080, then reload.");
    }
  }

  async function addTask() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Could not add the task.');
      }
      setText('');
      await refreshTasks();
      setLoadError(null);
    } catch (err) {
      console.error(err);
      setLoadError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleTask(id) {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/${id}/toggle`, { method: 'PUT' });
      if (!res.ok) throw new Error('Could not update the task.');
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setLoadError(null);
    } catch (err) {
      console.error(err);
      setLoadError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeTask(id) {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Could not delete the task.');
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setLoadError(null);
    } catch (err) {
      console.error(err);
      setLoadError(err.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refreshTasks();
    const t = setInterval(() => {
      // refresh date/meta line
      setTasks((prev) => [...prev]);
    }, 60000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

  return (
    <div className="app">
      <header className="header">
        <p className="eyebrow">Field Notes</p>
        <h1 className="greeting">{greetingText()}</h1>
        <p className="meta">{metaText()}</p>
      </header>

      <main className="list" id="list" aria-live="polite">
        {loadError ? (
          <div className="empty-state error">{loadError}</div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">The page is empty. Add your first task below.</div>
        ) : (
          <>
            {open.map((t) => (
              <TaskRow key={t.id} t={t} onToggle={toggleTask} onDelete={removeTask} />
            ))}
            {done.length ? (
              <p className="divider">Done ({done.length})</p>
            ) : null}
            {done.map((t) => (
              <TaskRow key={t.id} t={t} onToggle={toggleTask} onDelete={removeTask} />
            ))}
          </>
        )}
      </main>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          addTask();
        }}
      >
        <div className="composer-pill">
          <input
            type="text"
            id="taskInput"
            className="composer-input"
            placeholder="Add a task…"
            autoComplete="off"
            maxLength={140}
            enterKeyHint="done"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <button type="submit" className="composer-submit" aria-label="Add task" disabled={busy || !text.trim()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
    </div>
  );
}

