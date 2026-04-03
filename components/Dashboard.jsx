'use client';
import { useState, useEffect } from 'react';
import SecondBrain from './SecondBrain';

const HABITS = [
  { id: 'walk', label: '🚶 Morning Walk' },
  { id: 'lunch', label: '🥗 Packed Lunch' },
  { id: 'water', label: '💧 Water in Morning' },
  { id: 'skincare', label: '🌙 Night Skincare' },
];

const DOMAINS = [
  { name: 'Tuned In With Tiff', desc: 'Content & Brand', emoji: '🎙️', href: '/domains' },
  { name: 'VND Media', desc: 'Agency & Clients', emoji: '📱', href: '/domains' },
  { name: 'Armor Insurance', desc: 'Insurance Business', emoji: '🛡️', href: '/domains' },
  { name: 'YPO', desc: 'Leadership & Mentorship', emoji: '🌐', href: '/domains' },
  { name: 'Investments', desc: 'Portfolio & Returns', emoji: '📈', href: '/domains' },
  { name: 'Lifestyle', desc: 'Health & Wellness', emoji: '✨', href: '/domains' },
  { name: 'Family', desc: 'Home & Relationships', emoji: '🏡', href: '/domains' },
  { name: 'Learning', desc: 'Books & Growth', emoji: '📚', href: '/domains' },
];

const S = {
  page: { minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif' },
  header: { background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', padding: '24px 32px', borderBottom: '1px solid #ffffff15' },
  headerTitle: { fontSize: 28, fontWeight: 700, margin: 0, background: 'linear-gradient(90deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  headerSub: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  section: { padding: '24px 32px' },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 },
  card: { background: '#ffffff08', border: '1px solid #ffffff10', borderRadius: 12, padding: 16 },
  ticker: { display: 'flex', flexDirection: 'column', gap: 2 },
  tickerName: { fontSize: 11, color: '#94a3b8' },
  tickerPrice: { fontSize: 18, fontWeight: 700 },
  tickerChange: (pos) => ({ fontSize: 12, color: pos ? '#4ade80' : '#f87171' }),
  habitBtn: (done) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, border: done ? '1px solid #4ade8040' : '1px solid #ffffff10', background: done ? '#4ade8015' : '#ffffff05', cursor: 'pointer', transition: 'all 0.2s', width: '100%' }),
  habitCheck: (done) => ({ width: 20, height: 20, borderRadius: '50%', border: done ? '2px solid #4ade80' : '2px solid #ffffff30', background: done ? '#4ade80' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
  btn: { padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  primaryBtn: { background: 'linear-gradient(135deg, #7c3aed, #2563eb)', color: '#fff' },
  newsItem: { padding: '8px 0', borderBottom: '1px solid #ffffff08', fontSize: 13 },
  newsLink: { color: '#a78bfa', textDecoration: 'none', lineHeight: 1.4, display: 'block' },
  chatBox: { background: '#ffffff05', borderRadius: 10, padding: 16, minHeight: 200, maxHeight: 350, overflowY: 'auto', marginBottom: 12 },
  chatMsg: (role) => ({ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: role === 'user' ? '#7c3aed30' : '#ffffff08', fontSize: 13, lineHeight: 1.6 }),
  inputRow: { display: 'flex', gap: 8 },
  input: { flex: 1, background: '#ffffff08', border: '1px solid #ffffff15', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none' },
  domainCard: { background: '#ffffff08', border: '1px solid #ffffff10', borderRadius: 12, padding: 16, cursor: 'pointer', textDecoration: 'none', color: 'inherit', display: 'block', transition: 'background 0.2s' },
  briefBox: { background: '#ffffff05', border: '1px solid #a78bfa30', borderRadius: 10, padding: 16, marginTop: 12, fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' },
};

export default function Dashboard() {
  const [market, setMarket] = useState([]);
  const [news, setNews] = useState({ events: [], ai: [], business: [] });
  const [habits, setHabits] = useState({});
  const [brief, setBrief] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const today = new Date().toDateString();

  useEffect(() => {
    fetch('/api/market').then(r => r.json()).then(setMarket).catch(() => {});
    fetch('/api/news').then(r => r.json()).then(setNews).catch(() => {});
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
    const ctx = market.map(m => `${m.ticker}: $${m.price} (${m.change > 0 ? '+' : ''}${m.change}%)`).join(', ');
    const newsCtx = [...(news.events || []).slice(0,2), ...(news.ai || []).slice(0,2), ...(news.business || []).slice(0,2)].map(n => n.title).join('; ');
    const prompt = `Market: ${ctx}\nNews: ${newsCtx}\n\nGive me a sharp morning investor brief. What are the key moves to consider today? Be concise and actionable (buy/sell/hold insights).`;
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: prompt, systemPrompt: 'You are a sharp AI investor assistant. Give concise, actionable morning briefs.' }) });
    const data = await res.json();
    setBrief(data.message);
    setBriefLoading(false);
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput('');
    const newHistory = [...chatHistory, { role: 'user', content: msg }];
    setChatHistory(newHistory);
    setChatLoading(true);
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, history: chatHistory, systemPrompt: 'You are a creative content strategist for Tiffany, a lifestyle entrepreneur and content creator behind tunedinwithtiff. Help with hooks, captions, scripts, content ideas for Instagram, TikTok, and podcasts. Be punchy, creative, and on-brand.' }) });
    const data = await res.json();
    setChatHistory([...newHistory, { role: 'assistant', content: data.message }]);
    setChatLoading(false);
  };

  const doneCount = HABITS.filter(h => habits[h.id]).length;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.headerTitle}>✨ Tiffany's Command Center</h1>
        <p style={S.headerSub}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · {doneCount}/{HABITS.length} habits done</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 0 }}>
        <div>
          <div style={S.section}>
            <div style={S.sectionTitle}>📊 Market Pulse</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 16 }}>
              {market.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13, gridColumn: '1/-1' }}>Loading market data...</div>}
              {market.map(m => (
                <div key={m.ticker} style={{ ...S.card, ...S.ticker }}>
                  <span style={S.tickerName}>{m.ticker}</span>
                  <span style={S.tickerPrice}>${m.price?.toLocaleString()}</span>
                  <span style={S.tickerChange(m.change >= 0)}>{m.change >= 0 ? '▲' : '▼'} {Math.abs(m.change)}%</span>
                </div>
              ))}
            </div>
            <button onClick={generateBrief} disabled={briefLoading} style={{ ...S.btn, ...S.primaryBtn }}>
              {briefLoading ? '⏳ Generating...' : '🤖 Generate AI Morning Brief'}
            </button>
            {brief && <div style={S.briefBox}>{brief}</div>}
          </div>

          <div style={S.section}>
            <div style={S.sectionTitle}>📰 News Feed</div>
            <div style={S.grid3}>
              <div style={S.card}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', marginBottom: 8 }}>🌍 Current Events</div>
                {(news.events || []).map((n, i) => (
                  <div key={i} style={S.newsItem}><a href={n.link} target="_blank" rel="noreferrer" style={S.newsLink}>{n.title}</a></div>
                ))}
              </div>
              <div style={S.card}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', marginBottom: 8 }}>🤖 AI & Tech</div>
                {(news.ai || []).map((n, i) => (
                  <div key={i} style={S.newsItem}><a href={n.link} target="_blank" rel="noreferrer" style={S.newsLink}>{n.title}</a></div>
                ))}
              </div>
              <div style={S.card}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', marginBottom: 8 }}>💼 Business & Marketing</div>
                {(news.business || []).map((n, i) => (
                  <div key={i} style={S.newsItem}><a href={n.link} target="_blank" rel="noreferrer" style={S.newsLink}>{n.title}</a></div>
                ))}
              </div>
            </div>
          </div>

          <div style={S.section}>
            <div style={S.sectionTitle}>🎨 AI Content Studio</div>
            <div style={S.card}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>Chat with your AI content strategist — hooks, captions, scripts, ideas for tunedinwithtiff</div>
              <div style={S.chatBox}>
                {chatHistory.length === 0 && <div style={{ color: '#94a3b855', fontSize: 13, textAlign: 'center', paddingTop: 60 }}>Ask me to write a hook, caption, podcast script, or brainstorm content ideas...</div>}
                {chatHistory.map((m, i) => (
                  <div key={i} style={S.chatMsg(m.role)}>
                    <strong style={{ color: m.role === 'user' ? '#a78bfa' : '#60a5fa' }}>{m.role === 'user' ? 'You' : 'AI'}: </strong>{m.content}
                  </div>
                ))}
                {chatLoading && <div style={S.chatMsg('assistant')}><strong style={{ color: '#60a5fa' }}>AI: </strong>✍️ Writing...</div>}
              </div>
              <div style={S.inputRow}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Write me a hook for my morning routine post..." style={S.input} />
                <button onClick={sendChat} disabled={chatLoading} style={{ ...S.btn, ...S.primaryBtn }}>Send</button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderLeft: '1px solid #ffffff10' }}>
          <div style={{ ...S.section, paddingLeft: 24 }}>
            <div style={S.sectionTitle}>✅ Daily Habits</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {HABITS.map(h => (
                <button key={h.id} onClick={() => toggleHabit(h.id)} style={S.habitBtn(habits[h.id])}>
                  <div style={S.habitCheck(habits[h.id])}>
                    {habits[h.id] && <span style={{ fontSize: 10, color: '#0a0a0a', fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 13, color: habits[h.id] ? '#4ade80' : '#e2e8f0' }}>{h.label}</span>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: '10px 14px', background: '#ffffff05', borderRadius: 8, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
              {doneCount === HABITS.length ? '🎉 All habits complete!' : `${HABITS.length - doneCount} habit${HABITS.length - doneCount !== 1 ? 's' : ''} remaining`}
            </div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #ffffff10', padding: '24px 32px' }}>
        <div style={S.sectionTitle}>📅 Calendar & Tasks</div>
        <SecondBrain />
      </div>

      <div style={{ borderTop: '1px solid #ffffff10', padding: '24px 32px' }}>
        <div style={S.sectionTitle}>🧠 Your Second Brain</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {DOMAINS.map(d => (
            <a key={d.name} href={d.href} style={S.domainCard}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{d.emoji}</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{d.name}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{d.desc}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
