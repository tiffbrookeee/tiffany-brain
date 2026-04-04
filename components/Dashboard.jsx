'use client';
import { useState, useEffect, useRef } from 'react';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────
const DOMAINS = [
  {
    id: 'ypo',
    emoji: '🤝',
    name: 'YPO',
    desc: 'Mentorship · EO & YNG · Gala',
    color: '#7C3AED',
    notionUrl: 'https://www.notion.so/33683fbef7cf81ca870ee859b3fa43fd',
  },
  {
    id: 'insurance',
    emoji: '💼',
    name: 'Insurance',
    desc: 'Clients · Policies · Leads',
    color: '#0EA5E9',
    notionUrl: 'https://www.notion.so/33683fbef7cf8118baffeb340c6731b6',
  },
  {
    id: 'cafe',
    emoji: '☕',
    name: 'Café',
    desc: 'Mon & Thu · Philip · Tasks',
    color: '#D97706',
    notionUrl: 'https://www.notion.so/33683fbef7cf81b08b1cc7136bab1b52',
  },
  {
    id: 'vnd',
    emoji: '👗',
    name: 'Vixens N Darlings',
    desc: 'Pitch · Brand · Sourcing',
    color: '#EC4899',
    notionUrl: 'https://www.notion.so/33683fbef7cf814ca6b0fbc28021b9c2',
  },
  {
    id: 'content',
    emoji: '📱',
    name: 'TunedInWithTiff',
    desc: 'Content · Hooks · Calendar',
    color: '#10B981',
    notionUrl: 'https://www.notion.so/33783fbef7cf81ce82d4d280460396a5',
  },
];

const HABITS = [
  { id: 'walk', emoji: '🚶', label: 'Morning Walk' },
  { id: 'lunch', emoji: '🥗', label: 'Packed Lunch' },
  { id: 'water', emoji: '💧', label: 'Water' },
  { id: 'skin', emoji: '🌙', label: 'Night Skincare' },
];

// ─── HELPERS ────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(d) {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(str) {
  if (!str) return '';
  try {
    return new Date(str).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return str;
  }
}

// ─── STYLES ────────────────────────────────────────────────────────────────
const ACCENT = '#1A1A1A';

const S = {
  root: {
    minHeight: '100vh',
    background: '#F8F7F4',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif',
    color: '#1A1A1A',
  },
  header: {
    background: '#fff',
    borderBottom: '1px solid #EBEBEB',
    padding: '18px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  greeting: { fontSize: 21, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.3px' },
  date: { fontSize: 13, color: '#9B9590', marginTop: 3 },
  main: {
    maxWidth: 1300,
    margin: '0 auto',
    padding: '24px 28px 48px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 },
  card: {
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #EBEBEB',
    padding: '20px 22px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
    color: '#B0A8A0',
    marginBottom: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  taskRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '9px 0',
    borderBottom: '1px solid #F4F2EF',
    cursor: 'pointer',
  },
  newsRow: {
    padding: '10px 0',
    borderBottom: '1px solid #F4F2EF',
    display: 'block',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  newsTitle: { fontSize: 13, fontWeight: 500, lineHeight: 1.45, color: '#2A2A2A' },
  newsSource: { fontSize: 11, color: '#B0A8A0', marginTop: 3 },
  input: {
    flex: 1,
    padding: '11px 14px',
    border: '1px solid #E2E0DB',
    borderRadius: 10,
    fontSize: 14,
    outline: 'none',
    background: '#FAFAF8',
    color: '#1A1A1A',
  },
  sendBtn: {
    padding: '11px 16px',
    background: ACCENT,
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
  },
  chatBubble: {
    padding: '10px 14px',
    borderRadius: 12,
    fontSize: 13,
    lineHeight: 1.55,
    maxWidth: '88%',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  calRow: {
    display: 'flex',
    gap: 12,
    padding: '9px 0',
    borderBottom: '1px solid #F4F2EF',
    alignItems: 'flex-start',
  },
  badge: {
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 7px',
    borderRadius: 99,
    letterSpacing: '0.03em',
  },
  notionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: '#F4F2EF',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    color: '#2A2A2A',
    textDecoration: 'none',
    cursor: 'pointer',
  },
};

// ─── SUB-COMPONENTS ─────────────────────────────────────────────────────────

function Label({ emoji, children }) {
  return (
    <div style={S.sectionLabel}>
      {emoji && <span style={{ fontSize: 12 }}>{emoji}</span>}
      {children}
    </div>
  );
}

function Card({ children, style = {} }) {
  return <div style={{ ...S.card, ...style }}>{children}</div>;
}

function StatusBadge({ status }) {
  const map = {
    'To Do': { bg: '#FEF3C7', color: '#92400E' },
    'In Progress': { bg: '#DBEAFE', color: '#1E40AF' },
    Done: { bg: '#D1FAE5', color: '#065F46' },
  };
  const s = map[status] || { bg: '#F3F4F6', color: '#6B7280' };
  return (
    <span style={{ ...S.badge, background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

// ── Calendar ──
function CalendarSection({ events = [], connected }) {
  if (!events.length) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '28px 0',
          color: '#B0A8A0',
        }}
      >
        <div style={{ fontSize: 30, marginBottom: 8 }}>🎉</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#6B6560' }}>
          Free day — no events scheduled
        </div>
        {!connected && (
          <div style={{ fontSize: 12, marginTop: 6 }}>
            Google Calendar not yet connected
          </div>
        )}
      </div>
    );
  }
  return (
    <div>
      {events.map((ev, i) => (
        <div key={i} style={S.calRow}>
          <div
            style={{
              width: 3,
              minHeight: 36,
              borderRadius: 2,
              background: '#7C3AED',
              flexShrink: 0,
              marginTop: 2,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{ fontSize: 13, fontWeight: 600, color: '#2A2A2A', lineHeight: 1.3 }}
            >
              {ev.summary || ev.title || 'Event'}
            </div>
            <div style={{ fontSize: 12, color: '#9B9590', marginTop: 3 }}>
              {ev.start
                ? `${formatTime(ev.start)}${ev.end ? ` → ${formatTime(ev.end)}` : ''}`
                : 'All day'}
              {ev.location ? ` · ${ev.location}` : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tasks ──
function TaskList({ tasks = [], onToggle }) {
  const pending = tasks.filter((t) => !t.done);
  if (!pending.length) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '28px 0',
          color: '#B0A8A0',
          fontSize: 14,
        }}
      >
        All caught up! 🎉
      </div>
    );
  }
  return (
    <div>
      {pending.slice(0, 7).map((t) => (
        <div key={t.id} style={S.taskRow} onClick={() => onToggle(t.id)}>
          <input
            type="checkbox"
            checked={!!t.done}
            onChange={() => onToggle(t.id)}
            onClick={(e) => e.stopPropagation()}
            style={{
              marginTop: 2,
              width: 15,
              height: 15,
              accentColor: ACCENT,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#2A2A2A',
                lineHeight: 1.4,
              }}
            >
              {t.title}
            </div>
            <div
              style={{
                display: 'flex',
                gap: 6,
                marginTop: 4,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              {t.area && (
                <span style={{ fontSize: 11, color: '#B0A8A0' }}>{t.area}</span>
              )}
              {t.status && <StatusBadge status={t.status} />}
              {t.due && (
                <span style={{ fontSize: 11, color: '#B0A8A0' }}>
                  Due: {t.due}
                </span>
              )}
            </div>
          </div>
          {t.notionUrl && (
            <a
              href={t.notionUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ fontSize: 13, color: '#C0BAB4', flexShrink: 0, textDecoration: 'none' }}
            >
              ↗
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Domain Hub ──
function DomainHub() {
  return (
    <Card>
      <Label emoji="🗂️">Your 5 Domains</Label>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 12,
        }}
      >
        {DOMAINS.map((d) => (
          <a
            key={d.id}
            href={d.notionUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#FAFAF8',
              borderRadius: 12,
              border: '1.5px solid #EBEBEB',
              padding: '16px 14px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              textDecoration: 'none',
              display: 'block',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = d.color;
              e.currentTarget.style.background = '#fff';
              e.currentTarget.style.boxShadow = `0 2px 12px ${d.color}18`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#EBEBEB';
              e.currentTarget.style.background = '#FAFAF8';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 8 }}>{d.emoji}</div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#1A1A1A',
                marginBottom: 4,
                lineHeight: 1.3,
              }}
            >
              {d.name}
            </div>
            <div
              style={{
                fontSize: 11,
                color: '#B0A8A0',
                lineHeight: 1.4,
              }}
            >
              {d.desc}
            </div>
            <div
              style={{
                width: 20,
                height: 2,
                borderRadius: 2,
                background: d.color,
                marginTop: 10,
              }}
            />
          </a>
        ))}
      </div>
    </Card>
  );
}

// ── Morning Brief (News) ──
function MorningBrief({ news = {}, loading }) {
  const [tab, setTab] = useState('ai');

  const tabs = [
    { id: 'ai', label: '🤖 AI & Tech', items: news.ai || [] },
    { id: 'marketing', label: '📣 Marketing', items: news.marketing || [] },
    { id: 'world', label: '🌍 World', items: news.world || [] },
  ];
  const active = tabs.find((t) => t.id === tab) || tabs[0];

  return (
    <Card>
      <Label emoji="📰">Morning Brief</Label>
      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 14,
          background: '#F4F2EF',
          borderRadius: 9,
          padding: 4,
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: '6px 8px',
              border: 'none',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              background: tab === t.id ? '#fff' : 'transparent',
              color: tab === t.id ? '#1A1A1A' : '#9B9590',
              boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.07)' : 'none',
              transition: 'all 0.13s',
              letterSpacing: '0.02em',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div
          style={{
            textAlign: 'center',
            padding: '28px 0',
            color: '#B0A8A0',
            fontSize: 13,
          }}
        >
          Loading brief…
        </div>
      ) : active.items.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '28px 0',
            color: '#B0A8A0',
            fontSize: 13,
          }}
        >
          No stories available right now
        </div>
      ) : (
        <div>
          {active.items.slice(0, 5).map((item, i) => (
            <a
              key={i}
              href={item.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              style={S.newsRow}
            >
              <div style={S.newsTitle}>{item.title}</div>
              <div style={S.newsSource}>
                {item.source}
                {item.published
                  ? ` · ${new Date(item.published).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}`
                  : ''}
              </div>
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── AI Chat ──
function AIChatInterface() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hey Tiff! I'm your second brain assistant. Ask me about your tasks, domains, what to focus on — or just think out loud.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text }]);
    setLoading(true);
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const d = await r.json();
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: d.reply || d.message || 'Got it!' },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: "Something went wrong. Check your API key or try again.",
        },
      ]);
    }
    setLoading(false);
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', height: 420 }}>
      <Label emoji="🧠">Ask Your Second Brain</Label>
      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginBottom: 14,
          paddingRight: 2,
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                ...S.chatBubble,
                background: m.role === 'user' ? ACCENT : '#F4F2EF',
                color: m.role === 'user' ? '#fff' : '#2A2A2A',
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                ...S.chatBubble,
                background: '#F4F2EF',
                color: '#9B9590',
              }}
            >
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {/* Input */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          style={S.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask anything — tasks, priorities, ideas…"
        />
        <button style={S.sendBtn} onClick={send}>
          ↑
        </button>
      </div>
    </Card>
  );
}

// ── Habit Tracker ──
function HabitTracker({ habits, checked, onToggle }) {
  const count = checked.size;
  const pct = Math.round((count / habits.length) * 100);
  return (
    <Card>
      <Label emoji="✅">Daily Habits · {count}/{habits.length}</Label>
      {/* Progress bar */}
      <div
        style={{
          height: 4,
          background: '#F4F2EF',
          borderRadius: 2,
          marginBottom: 14,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: '#10B981',
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {habits.map((h) => (
          <label
            key={h.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={checked.has(h.id)}
              onChange={() => onToggle(h.id)}
              style={{
                width: 16,
                height: 16,
                accentColor: '#10B981',
                cursor: 'pointer',
              }}
            />
            <span
              style={{
                fontSize: 13,
                color: checked.has(h.id) ? '#B0A8A0' : '#2A2A2A',
                textDecoration: checked.has(h.id) ? 'line-through' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {h.emoji} {h.label}
            </span>
          </label>
        ))}
      </div>
    </Card>
  );
}

// ── Market Pulse ──
function MarketPulse({ data = [] }) {
  // Filter out heavy crypto, focus on equities
  const stocks = data.filter(
    (d) => !['BTC-USD', 'XRP-USD', 'ETH-USD'].includes(d.ticker)
  );
  if (!stocks.length) return null;

  return (
    <Card>
      <Label emoji="📊">Market Pulse</Label>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
        {stocks.slice(0, 5).map((s) => {
          const up = parseFloat(s.changePct) >= 0;
          return (
            <div key={s.ticker} style={{ flex: '1 1 70px' }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#9B9590',
                  letterSpacing: '0.06em',
                  marginBottom: 2,
                }}
              >
                {s.ticker}
              </div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: '#1A1A1A',
                  letterSpacing: '-0.5px',
                }}
              >
                ${Number(s.price).toFixed(2)}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: up ? '#059669' : '#DC2626',
                  marginTop: 2,
                }}
              >
                {up ? '▲' : '▼'} {Math.abs(parseFloat(s.changePct)).toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── MAIN DASHBOARD ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [cal, setCal] = useState({ events: [], connected: false });
  const [news, setNews] = useState({});
  const [market, setMarket] = useState([]);
  const [habits, setHabits] = useState(new Set());
  const [tasksDone, setTasksDone] = useState(new Set());
  const [newsLoading, setNewsLoading] = useState(true);

  const now = new Date();
  const dateKey = now.toDateString();

  useEffect(() => {
    // Restore habits
    try {
      const saved = JSON.parse(
        localStorage.getItem(`tiff_habits_${dateKey}`) || '[]'
      );
      setHabits(new Set(saved));
    } catch {}

    // Fetch all data
    fetch('/api/notion')
      .then((r) => r.json())
      .then((d) => setTasks(d.tasks || []))
      .catch(() => {});

    fetch('/api/gcal')
      .then((r) => r.json())
      .then((d) => setCal(d))
      .catch(() => {});

    fetch('/api/market')
      .then((r) => r.json())
      .then((d) => setMarket(Array.isArray(d) ? d : []))
      .catch(() => {});

    setNewsLoading(true);
    fetch('/api/news')
      .then((r) => r.json())
      .then((d) => {
        setNews(d);
        setNewsLoading(false);
      })
      .catch(() => setNewsLoading(false));
  }, []);

  function toggleHabit(id) {
    setHabits((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try {
        localStorage.setItem(`tiff_habits_${dateKey}`, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }

  function toggleTask(id) {
    setTasksDone((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Merge local done state with API data
  const mergedTasks = tasks.map((t) => ({
    ...t,
    done: tasksDone.has(t.id) || t.done,
  }));
  const pendingCount = mergedTasks.filter((t) => !t.done).length;

  return (
    <div style={S.root}>
      {/* ── Header ─────────────────────────────── */}
      <header style={S.header}>
        <div>
          <div style={S.greeting}>
            {getGreeting()}, Tiff 👋
          </div>
          <div style={S.date}>
            {formatDate(now)} · {habits.size}/{HABITS.length} habits ·{' '}
            {pendingCount} task{pendingCount !== 1 ? 's' : ''} remaining
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a
            href="https://www.notion.so/32583fbef7cf81cf9930eaa9505e476e"
            target="_blank"
            rel="noopener noreferrer"
            style={S.notionBtn}
          >
            Notion ↗
          </a>
        </div>
      </header>

      <main style={S.main}>
        {/* ── Domain Hub ─────────────────────────── */}
        <DomainHub />

        {/* ── Today: Calendar + Tasks ────────────── */}
        <div style={S.grid2}>
          <Card>
            <Label emoji="📅">Today's Calendar</Label>
            <CalendarSection events={cal.events} connected={cal.connected} />
          </Card>
          <Card>
            <Label emoji="✅">
              Tasks · {pendingCount} remaining
            </Label>
            <TaskList tasks={mergedTasks} onToggle={toggleTask} />
          </Card>
        </div>

        {/* ── Morning Brief + Chat ────────────────── */}
        <div style={S.grid2}>
          <MorningBrief news={news} loading={newsLoading} />
          <AIChatInterface />
        </div>

        {/* ── Habits + Market ────────────────────── */}
        <div style={S.grid2}>
          <HabitTracker habits={HABITS} checked={habits} onToggle={toggleHabit} />
          <MarketPulse data={market} />
        </div>
      </main>
    </div>
  );
}
