'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function ContentPage() {
  const [items, setItems] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastReply, setLastReply] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => { fetchContent(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function fetchContent() {
    const res = await fetch('/api/content');
    const data = await res.json();
    setItems(data.items ?? []);
  }

  async function sendMessage(text) {
    const userMsg = { role: 'user', content: text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/content-agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: newMsgs }) });
      const data = await res.json();
      const reply = data.reply || data.error || 'No response';
      setLastReply(reply);
      setMessages(m => [...m, { role: 'assistant', content: reply }]);
    } finally {
      setLoading(false);
    }
  }

  async function saveToBank() {
    if (!lastReply) return;
    setSaving(true);
    await fetch('/api/content', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: lastReply.slice(0, 60), hook: lastReply.slice(0, 150), domain: 'TunedInWithTiff', platform: 'Instagram' }) });
    await fetchContent();
    setSaving(false);
  }

  const quickPrompts = ['Write 3 hooks for TunedInWithTiff', 'Script a 30-sec Reel for VND pitch', 'Give me 5 education post ideas', 'Write a science-backed caption about confidence'];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: '24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <Link href="/" style={{ color: '#888', textDecoration: 'none', fontSize: 14 }}>← Dashboard</Link>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>✍️ Content Hub</h1>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div style={{ background: '#111', borderRadius: 12, padding: 20, border: '1px solid #222', maxHeight: 600, overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>📚 Content Bank</h2>
            {items.length === 0 ? <p style={{ color: '#555', fontSize: 14 }}>No saved content yet. Generate ideas on the right and save them here.</p> :
              items.map(item => (
                <div key={item.id} style={{ background: '#1a1a1a', borderRadius: 8, padding: 12, marginBottom: 10, border: '1px solid #2a2a2a' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{item.title}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {item.domain && <span style={{ fontSize: 11, background: '#1e3a5f', color: '#60a5fa', padding: '2px 8px', borderRadius: 4 }}>{item.domain}</span>}
                    {item.platform && <span style={{ fontSize: 11, background: '#1a2e1a', color: '#4ade80', padding: '2px 8px', borderRadius: 4 }}>{item.platform}</span>}
                    {item.status && <span style={{ fontSize: 11, background: '#2a1a2e', color: '#c084fc', padding: '2px 8px', borderRadius: 4 }}>{item.status}</span>}
                  </div>
                  {item.hook && <p style={{ fontSize: 12, color: '#888', margin: '8px 0 0', lineHeight: 1.5 }}>{item.hook}</p>}
                </div>
              ))
            }
          </div>
          <div style={{ background: '#111', borderRadius: 12, padding: 20, border: '1px solid #222', display: 'flex', flexDirection: 'column', height: 600 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>🤖 AI Content Agent</h2>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {quickPrompts.map(p => <button key={p} onClick={() => sendMessage(p)} style={{ fontSize: 11, background: '#1a1a2e', color: '#818cf8', border: '1px solid #2a2a4e', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>{p}</button>)}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
              {messages.length === 0 && <p style={{ color: '#555', fontSize: 13 }}>Ask me to write hooks, scripts, captions, or content ideas for TunedInWithTiff or VND.</p>}
              {messages.map((m, i) => (
                <div key={i} style={{ marginBottom: 12, display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '85%', background: m.role === 'user' ? '#1e3a5f' : '#1a1a1a', borderRadius: 10, padding: '10px 14px', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.content}</div>
                </div>
              ))}
              {loading && <div style={{ color: '#555', fontSize: 13, padding: '8px 0' }}>✍️ Writing...</div>}
              <div ref={chatEndRef} />
            </div>
            {lastReply && <button onClick={saveToBank} disabled={saving} style={{ background: '#14532d', color: '#4ade80', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', marginBottom: 10 }}>{saving ? 'Saving...' : '💾 Save to Content Bank'}</button>}
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && input.trim()) { e.preventDefault(); sendMessage(input); }}} placeholder="Ask for hooks, scripts, ideas..." style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 13 }} />
              <button onClick={() => input.trim() && sendMessage(input)} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontSize: 13 }}>Send</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
