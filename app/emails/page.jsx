'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function EmailsPage() {
  const [emailText, setEmailText] = useState('');
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState({});

  async function analyze() {
    if (!emailText.trim()) return;
    setLoading(true);
    setActions([]);
    try {
      const res = await fetch('/api/emails', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emailText }) });
      const data = await res.json();
      setActions(data.actions ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function addTask(action, idx) {
    await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: action.action }) });
    setAdded(a => ({ ...a, [idx]: true }));
  }

  const priorityColor = { high: '#ef4444', medium: '#f59e0b', low: '#6b7280' };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: '24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <Link href="/" style={{ color: '#888', textDecoration: 'none', fontSize: 14 }}>← Dashboard</Link>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>📧 Email Follow-ups</h1>
        </div>
        <div style={{ background: '#111', borderRadius: 12, padding: 20, border: '1px solid #222', marginBottom: 20 }}>
          <p style={{ color: '#888', fontSize: 14, margin: '0 0 12px' }}>Paste any email and I'll pull out exactly what needs to happen.</p>
          <textarea value={emailText} onChange={e => setEmailText(e.target.value)} placeholder="Paste email content here..." rows={8} style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: 12, color: '#fff', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
          <button onClick={analyze} disabled={loading || !emailText.trim()} style={{ marginTop: 12, background: loading ? '#333' : '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, cursor: loading ? 'default' : 'pointer' }}>{loading ? '🔍 Analyzing...' : '🔍 Extract Action Items'}</button>
        </div>
        {actions.length > 0 && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Action Items ({actions.length})</h2>
            {actions.map((a, i) => (
              <div key={i} style={{ background: '#111', borderRadius: 10, padding: 16, marginBottom: 10, border: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{a.action}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {a.person && `👤 ${a.person}`}
                    {a.person && a.dueDate && ' · '}
                    {a.dueDate && `📅 ${a.dueDate}`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {a.priority && <span style={{ fontSize: 11, color: priorityColor[a.priority] ?? '#888', fontWeight: 700, textTransform: 'uppercase' }}>{a.priority}</span>}
                  <button onClick={() => addTask(a, i)} disabled={added[i]} style={{ background: added[i] ? '#1a2e1a' : '#14532d', color: added[i] ? '#4ade80' : '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: added[i] ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>{added[i] ? '✓ Added' : '+ Add Task'}</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && actions.length === 0 && emailText && <p style={{ color: '#555', fontSize: 14 }}>No action items found, or try a different email.</p>}
      </div>
    </div>
  );
}
