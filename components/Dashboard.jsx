'use client';
import { useState, useEffect } from 'react';

const HABITS = [
  { id: 'walk', label: '🚶 Morning Walk' },
  { id: 'lunch', label: '🥗 Packed Lunch' },
  { id: 'water', label: '💧 Water in Morning' },
  { id: 'skincare', label: '🌙 Night Skincare' },
];

const DOMAINS = [
  { name: 'Tuned In With Tiff', desc: 'Content & Brand', emoji: '😙️', href: '/domains' },
  { name: 'VND Media', desc: 'Agency & Clients', emoji: '📱', href: '/domains' },
  { name: 'Armor Insurance', desc: 'Insurance Business', emoji: '🛡️', href: '/domains' },
  { name: 'YPO', desc: 'Leadership & Mentorship', emoji: '🌐', href: '/domains' },
  { name: 'Investments', desc: 'Portfolio & Returns', emoji: '📈', href: '/domains' },
  { name: 'Lifestyle', desc: 'Health & Wellness', emoji: '✨', href: '/domains' },
  { name: 'Family', desc: 'Home & Relationships', emoji: '🏡', href: '/domains' },
  { name: 'Learning', desc: 'Books & Growth', emoji: '📚', href: '/domains' },
];

const C = {
  bg: '#080810',
  surface: 'rgba(255,255,255,0.04)',
  surfaceHover: 'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.07)',
  borderAccent: 'rgba(167,139,250,0.25)',
  text: '#e2e8f0',
  muted: '#64748b',
  dim: '#94a3b8',
  purple: '#a78bfa',
  blue: '#60a5fa',
  green: '#4ade80',
  red: '#f87171',
  amber: '#fbbf24',
};

const card = (extra = {}) => ({
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  padding: '20px 22px',
  ...extra,
});

const sectionLabel = {
  fontSize: 11,
  fontWeight: 700,
  color: C.muted,
  textTransform: 'uppercase',
  letterSpacing: 1.5,
  marginBottom: 14,
};

function Tag({ color, children }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px',
      borderRadius: 99, background: color + '20', color,
      letterSpacing: 0.5, textTransform: 'uppercase',
    }}>{children}</span>
  );
}

function TaskDot({ status }) {
  const colors = { done: C.green, 'in-progress': C.amber, urgent: C.red };
  return (
    <span style={{
      width: 8, height: 8, borderRadius: '50%',
      background: colors[status] || C.muted,
      display: 'inline-block', flexShrink: 0,
      marginTop: 4,
    }} />
  );
}

export default function Dashboard() {
  const [market, setMarket] = useState([]);
  const [news, setNews] = useState({ events: [], crypto: [], business: [] });
  const [habits, setHabits] = useState({});
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [brief, setBrief] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const today = new Date().toDateString();
  const doneCount = HABITS.filter(h => habits[h.id]).length;

  useEffect(() => {
    fetch('/api/market').then(r => r.json()).then(setMarket).catch(() => {});
    fetch('/api/news').then(r => r.json()).then(setNews).catch(() => {});
    fetch('/api/gcal').then(r => r.json()).then(d => setEvents(d.events || [])).catch(() => {});
    fetch('/api/notion?type=tasks').then(r => r.json()).then(d => setTasks(d.tasks || [])).catch(() => {});
    const saved = localStorage.getItem('habits_' + today);
    if (saved) setHabits(JSON.parse(saved));
  }, []);

  const toggleHabit = (id) => {
    const updated = { ...habits, [id]: !habits[id] };
    setHabits(updated);
    localStorage.setItem('habits_' + today, JSON.stringify(updated));
  };

  const generateBrief = async () => {
    setBriefLoading(true);
    setBriefOpen(true);
    const mktCtx = market.map(m => `${m.ticker} $${m.price} (${m.changePct >= 0 ? '+' : ''}${m.changePct}%)`).join(', ');
    const newsCtx = [...(news.crypto || []).slice(0, 3), ...(news.events || []).slice(0, 2)].map(n => n.title).join('; ');
    const messages = [{
      role: 'user',
      content: `Markets: ${mktCtx}\nCrypto & news headlines: ${newsCtx}\n\nGive me a sharp morning brief focused on XRP, Bitcoin, and top market movers. What should I watch, buy, hold, or avoid today? Be concise and actionable — 4-6 bullet points max.`
    }];
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      const data = await res.json();
      setBrief(data.reply || data.message || 'Could not generate brief.');
    } catch { setBrief('Error generating brief. Check your ANTHROPIC_API_KEY in Vercel.'); }
    setBriefLoading(false);
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput('');
    const newHistory = [...chatHistory, { role: 'user', content: msg }];
    setChatHistory(newHistory);
    setChatLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHistory }),
      });
      const data = await res.json();
      setChatHistory([...newHistory, { role: 'assistant', content: data.reply || data.message }]);
    } catch { setChatHistory([...newHistory, { role: 'assistant', content: 'Error — check API key.' }]); }
    setChatLoading(false);
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const todayEvents = events.filter(e => {
    const start = new Date(e.start);
    const now = new Date();
    return start.toDateString() === now.toDateString();
  }).sort((a, b) => new Date(a.start) - new Date(b.start));

  const activeTasks = tasks.filter(t => t.status !== 'done').slice(0, 8);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* HEADER */}
      <div style={{
        background: 'linear-gradient(135deg, #0f0f1a 0%, #12152a 50%, #0a1628 100%)',
        borderBottom: `1px solid ${C.border}`,
        padding: '22px 36px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: 22, fontWeight: 700,
            background: 'linear-gradient(90deg, #a78bfa, #60a5fa, #4ade80)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Hey Tiff 👋
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {' · '}{doneCount}/{HABITS.length} habits · {activeTasks.length} tasks remaining
          </p>
        </div>
        <button onClick={generateBrief} disabled={briefLoading} style={{
          background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
          color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px',
          fontWeight: 600, fontSize: 13, cursor: 'pointer',
        }}>
          {briefLoading ? '⏳ Generating...' : '🤖 AI Morning Brief'}
        </button>
      </div>

      {/* AI BRIEF (expandable) */}
      {briefOpen && (
        <div style={{
          margin: '0 36px', marginTop: 16,
          background: 'rgba(167,139,250,0.06)',
          border: `1px solid ${C.borderAccent}`,
          borderRadius: 14, padding: '16px 20px',
          fontSize: 13.5, lineHeight: 1.75, color: C.text,
          whiteSpace: 'pre-wrap',
        }}>
          {briefLoading
            ? <span style={{ color: C.muted }}>✨ Analyzing markets and crypto for you...</span>
            : brief}
        </div>
      )}

      {/* MAIN GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 0, padding: '20px 36px 36px', gap: 20 }}>

        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* TASKS */}
          <div style={card()}>
            <div style={sectionLabel}>📋 Today's Tasks</div>
            {activeTasks.length === 0 ? (
              <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
                {tasks.length === 0 ? 'Syncing from Notion...' : '🎉 All caught up! No open tasks.'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activeTasks.map((t, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${C.border}`,
                  }}>
                    <TaskDot status={t.status} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: C.text, lineHeight: 1.4 }}>{t.name || t.title}</div>
                      {t.dueDate && (
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                          Due {new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      )}
                    </div>
                    {t.status && <Tag color={t.status === 'urgent' ? C.red : t.status === 'in-progress' ? C.amber : C.blue}>{t.status}</Tag>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CALENDAR */}
          <div style={card()}>
            <div style={sectionLabel}>📅 Today's Calendar</div>
            {todayEvents.length === 0 ? (
              <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
                {events.length === 0 && events.connected === false
                  ? 'Connect Google Calendar in Vercel env vars.'
                  : 'No events today — free day 🎉'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {todayEvents.map((e, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(96,165,250,0.06)',
                    border: '1px solid rgba(96,165,250,0.15)',
                  }}>
                    <div style={{ textAlign: 'center', minWidth: 52 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.blue }}>{formatTime(e.start)}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: C.text }}>{e.title || e.summary}</div>
                      {e.location && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{e.location}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MARKET */}
          <div style={card()}>
            <div style={sectionLabel}>📊 Market Pulse</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {market.length === 0 ? (
                <p style={{ color: C.muted, fontSize: 13, gridColumn: '1/-1', margin: 0 }}>Loading market data...</p>
              ) : market.map(m => {
                const pos = parseFloat(m.changePct) >= 0;
                return (
                  <div key={m.ticker} style={{
                    background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`,
                    borderRadius: 12, padding: '12px 14px',
                  }}>
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: 0.5 }}>{m.ticker}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '4px 0 2px' }}>${parseFloat(m.price).toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: pos ? C.green : C.red, fontWeight: 600 }}>
                      {pos ? '▲' : '▼'} {Math.abs(m.changePct)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* NEWS */}
          <div style={card()}>
            <div style={sectionLabel}>📰 News Feed</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {[
                { key: 'events', label: '🌍 World', color: C.blue },
                { key: 'crypto', label: '₿ Crypto', color: C.amber },
                { key: 'business', label: '💼 Business', color: C.green },
              ].map(({ key, label, color }) => (
                <div key={key}>
                  <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 10, letterSpacing: 0.5 }}>{label}</div>
                  {(news[key] || []).map((n, i) => (
                    <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
                      <a href={n.link} target="_blank" rel="noreferrer" style={{
                        color: C.dim, textDecoration: 'none', fontSize: 12.5,
                        lineHeight: 1.5, display: 'block',
                        transition: 'color 0.2s',
                      }}
                        onMouseEnter={e => e.target.style.color = color}
                        onMouseLeave={e => e.target.style.color = C.dim}
                      >{n.title}</a>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* HABITS */}
          <div style={card()}>
            <div style={sectionLabel}>✅ Daily Habits</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {HABITS.map(h => {
                const done = !!habits[h.id];
                return (
                  <button key={h.id} onClick={() => toggleHabit(h.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 14px', borderRadius: 10, width: '100%',
                    border: done ? '1px solid rgba(74,222,128,0.3)' : `1px solid ${C.border}`,
                    background: done ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      border: done ? '2px solid #4ade80' : '2px solid rgba(255,255,255,0.2)',
                      background: done ? '#4ade80' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {done && <span style={{ fontSize: 9, color: '#0a0a0a', fontWeight: 900 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13, color: done ? C.green : C.dim, textDecoration: done ? 'line-through' : 'none' }}>
                      {h.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={{
              marginTop: 12, fontSize: 11.5, color: C.muted, textAlign: 'center',
              padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: 8,
            }}>
              {doneCount === HABITS.length ? '🎉 All done today!' : `${doneCount}/${HABITS.length} habits complete`}
            </div>
          </div>

          {/* AI CONTENT STUDIO */}
          <div style={{ ...card(), flex: 1 }}>
            <div style={sectionLabel}>🎙️ Content Studio</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 12 }}>
              Hooks, captions & scripts for tunedinwithtiff
            </div>
            <div style={{
              background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 12,
              minHeight: 160, maxHeight: 280, overflowY: 'auto', marginBottom: 10,
            }}>
              {chatHistory.length === 0 && (
                <div style={{ color: 'rgba(148,163,184,0.4)', fontSize: 12, textAlign: 'center', paddingTop: 40 }}>
                  Ask for a hook, caption, or script idea...
                </div>
              )}
              {chatHistory.map((m, i) => (
                <div key={i} style={{
                  marginBottom: 10, padding: '8px 12px', borderRadius: 8,
                  background: m.role === 'user' ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                  fontSize: 12.5, lineHeight: 1.6, color: C.text,
                }}>
                  <span style={{ color: m.role === 'user' ? C.purple : C.blue, fontWeight: 700, fontSize: 11 }}>
                    {m.role === 'user' ? 'You' : 'AI'}:{' '}
                  </span>
                  {m.content}
                </div>
              ))}
              {chatLoading && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', fontSize: 12, color: C.muted }}>
                  ✍️ Writing...
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Write a hook for my morning routine..."
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${C.border}`, borderRadius: 8,
                  padding: '9px 12px', color: C.text, fontSize: 12.5, outline: 'none',
                }}
              />
              <button onClick={sendChat} disabled={chatLoading} style={{
                background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
                color: '#fff', border: 'none', borderRadius: 8,
                padding: '9px 14px', fontWeight: 600, fontSize: 12, cursor: 'pointer',
              }}>→</button>
            </div>
          </div>
        </div>
      </div>

      {/* DOMAIN HUB */}
      <div style={{ padding: '0 36px 40px', borderTop: `1px solid ${C.border}`, paddingTop: 28 }}>
        <div style={sectionLabel}>🧠 Your Second Brain</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {DOMAINS.map(d => (
            <a key={d.name} href={d.href} style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 14, padding: '18px 16px',
              textDecoration: 'none', color: 'inherit', display: 'block',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = C.surfaceHover; e.currentTarget.style.borderColor = C.borderAccent; }}
              onMouseLeave={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.borderColor = C.border; }}
            >
              <div style={{ fontSize: 26, marginBottom: 10 }}>{d.emoji}</div>
              <div style={{ fontWeight: 600, fontSize: 13.5, color: C.text }}>{d.name}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{d.desc}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
