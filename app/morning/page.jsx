'use client';

import { useState, useEffect } from 'react';

const NOTION_HUB_URL = 'https://www.notion.so/5a7f7b8d11b5445f9d342157b84c609f';

const GCAL_BASE = 'https://calendar.google.com/calendar/embed?ctz=America%2FPhoenix';
const GCAL_SRCS = '&src=tiffbrookeee%40gmail.com&src=8821afc8c72b42163405fd1246773e1c6ebee234971253c7b8e113c533f8ce86%40group.calendar.google.com&src=fc02c25342dbd7998dfddc12d1e816a783b54978664480bf49cd116d232c47d8%40group.calendar.google.com&src=41e7773cbb56084733b459e738eeab2608997e849129f527cc559802d32adfae%40group.calendar.google.com&src=b2a01c8849cde0ef81bd1a46d35991c3ba46e897d30d1ae3740d49e06f81d544%40group.calendar.google.com&src=b88006b0ac2dee24b36e0093712ec2f4b781e2ed726bf5a047dc7319fd46d717%40group.calendar.google.com&src=c2cc86c287a70229e6dfd5be8848428a4b146bba48b4b2b08b39a33f176c356f%40group.calendar.google.com&src=e8061bb2a52b658bcceaca10dd930ffbe6f7c80f1c84fd461103f20020fc161c%40group.calendar.google.com';
const GCAL_EMBED_URL = GCAL_BASE + GCAL_SRCS;

export default function MorningPage() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [greeting, setGreeting] = useState('');
  const [brief, setBrief] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);
  const [dump, setDump] = useState('');
  const [dumpSent, setDumpSent] = useState(false);
  const [intentions, setIntentions] = useState(['', '', '']);
  const [intentionsSaved, setIntentionsSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const tick = () => {
      const now = new Date();
      const h = now.getHours();
      setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
      setDate(now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  async function generateBrief() {
    setBriefLoading(true);
    setBrief('');
    try {
      const res = await fetch('/api/morning-brief', { method: 'POST' });
      const data = await res.json();
      setBrief(data.brief || 'Could not generate brief.');
    } catch {
      setBrief('Could not reach the brief generator. Check your API setup.');
    }
    setBriefLoading(false);
  }

  async function sendDump() {
    if (!dump.trim()) return;
    try {
      await fetch('/api/smart-dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: dump }),
      });
      setDump('');
      setDumpSent(true);
      setTimeout(() => setDumpSent(false), 3000);
    } catch {
      setDumpSent(false);
    }
  }

  function saveIntentions() {
    setIntentionsSaved(true);
    setTimeout(() => setIntentionsSaved(false), 2500);
  }

  if (!mounted) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #f5f0eb;
          min-height: 100vh;
        }

        .morning {
          min-height: 100vh;
          background: #f5f0eb;
          background-image:
            radial-gradient(ellipse at 0% 0%, rgba(201,169,110,0.12) 0%, transparent 60%),
            radial-gradient(ellipse at 100% 100%, rgba(180,140,100,0.08) 0%, transparent 60%);
          font-family: 'DM Sans', sans-serif;
          color: #2a1f14;
          padding: 0 0 80px;
        }

        /* Hero header */
        .hero {
          padding: 52px 40px 36px;
          border-bottom: 1px solid rgba(42,31,20,0.1);
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
        }

        .hero-left {}

        .greeting-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #c9a96e;
          margin-bottom: 6px;
        }

        .hero-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(36px, 5vw, 56px);
          font-weight: 300;
          color: #2a1f14;
          line-height: 1.05;
          letter-spacing: -0.01em;
        }

        .hero-name em {
          font-style: italic;
          color: #c9a96e;
        }

        .hero-right {
          text-align: right;
        }

        .hero-time {
          font-family: 'Cormorant Garamond', serif;
          font-size: 42px;
          font-weight: 300;
          color: #2a1f14;
          line-height: 1;
          letter-spacing: -0.02em;
        }

        .hero-date {
          font-size: 12px;
          color: #8a7060;
          margin-top: 4px;
          letter-spacing: 0.04em;
          font-weight: 300;
        }

        /* Notion button */
        .notion-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #2a1f14;
          color: #f5f0eb;
          border: none;
          border-radius: 10px;
          padding: 14px 24px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s;
          letter-spacing: 0.02em;
          margin-top: 20px;
        }

        .notion-btn:hover {
          background: #c9a96e;
          color: #2a1f14;
          transform: translateY(-1px);
        }

        .notion-btn svg { flex-shrink: 0; }

        /* Main grid */
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: auto auto;
          gap: 1px;
          background: rgba(42,31,20,0.1);
          border-top: 1px solid rgba(42,31,20,0.1);
        }

        .cell {
          background: #f5f0eb;
          padding: 36px 40px;
        }

        .cell-full {
          grid-column: 1 / -1;
        }

        .cell-label {
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #c9a96e;
          margin-bottom: 20px;
          font-weight: 500;
        }

        /* Brief section */
        .brief-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: 1.5px solid #2a1f14;
          border-radius: 8px;
          padding: 10px 20px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 500;
          color: #2a1f14;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.04em;
          margin-bottom: 20px;
        }

        .brief-btn:hover:not(:disabled) {
          background: #2a1f14;
          color: #f5f0eb;
        }

        .brief-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .brief-text {
          font-family: 'Cormorant Garamond', serif;
          font-size: 17px;
          line-height: 1.7;
          color: #2a1f14;
          font-weight: 400;
          white-space: pre-wrap;
        }

        .brief-loading {
          display: flex;
          gap: 5px;
          align-items: center;
          padding: 8px 0;
        }

        .dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #c9a96e;
          animation: pulse 1.2s ease-in-out infinite;
        }

        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }

        /* Intentions */
        .intentions-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }

        .intention-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .intention-num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          font-weight: 300;
          color: #c9a96e;
          width: 20px;
          flex-shrink: 0;
          font-style: italic;
        }

        .intention-input {
          flex: 1;
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(42,31,20,0.2);
          padding: 8px 0;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #2a1f14;
          outline: none;
          transition: border-color 0.2s;
        }

        .intention-input::placeholder { color: #b0a090; }
        .intention-input:focus { border-bottom-color: #c9a96e; }

        .save-btn {
          background: #c9a96e;
          color: #2a1f14;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.04em;
        }

        .save-btn:hover { background: #b8934e; }

        .saved-msg {
          font-size: 12px;
          color: #c9a96e;
          font-style: italic;
          margin-left: 12px;
        }

        /* SmartDump */
        .dump-area {
          width: 100%;
          min-height: 120px;
          background: rgba(42,31,20,0.04);
          border: 1.5px solid rgba(42,31,20,0.12);
          border-radius: 10px;
          padding: 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #2a1f14;
          resize: vertical;
          outline: none;
          transition: border-color 0.2s;
          margin-bottom: 14px;
          line-height: 1.6;
        }

        .dump-area::placeholder { color: #b0a090; }
        .dump-area:focus { border-color: #c9a96e; }

        .dump-row {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .dump-btn {
          background: #2a1f14;
          color: #f5f0eb;
          border: none;
          border-radius: 8px;
          padding: 10px 22px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.04em;
        }

        .dump-btn:hover { background: #c9a96e; color: #2a1f14; }

        .dump-sent {
          font-size: 12px;
          color: #c9a96e;
          font-style: italic;
        }

        /* Calendar */
        .cal-wrapper {
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid rgba(42,31,20,0.1);
          background: white;
        }

        .cal-placeholder {
          background: rgba(42,31,20,0.04);
          border: 1.5px dashed rgba(42,31,20,0.2);
          border-radius: 10px;
          padding: 40px 24px;
          text-align: center;
        }

        .cal-placeholder p {
          font-family: 'Cormorant Garamond', serif;
          font-size: 16px;
          color: #8a7060;
          line-height: 1.6;
          margin-bottom: 10px;
        }

        .cal-placeholder code {
          font-size: 11px;
          background: rgba(42,31,20,0.08);
          padding: 3px 8px;
          border-radius: 4px;
          color: #2a1f14;
          font-family: monospace;
        }

        @media (max-width: 768px) {
          .hero { padding: 32px 20px 24px; }
          .grid { grid-template-columns: 1fr; }
          .cell { padding: 28px 20px; }
          .cell-full { grid-column: 1; }
        }
      `}</style>

      <div className="morning">
        {/* Hero */}
        <div className="hero">
          <div className="hero-left">
            <div className="greeting-label">{greeting}, Tiffany</div>
            <h1 className="hero-name">
              Your day,<br /><em>by design.</em>
            </h1>
            <a
              href={NOTION_HUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="notion-btn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              Open Notion Hub
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 17L17 7M17 7H7M17 7v10"/>
              </svg>
            </a>
          </div>
          <div className="hero-right">
            <div className="hero-time">{time}</div>
            <div className="hero-date">{date}</div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid">

          {/* Morning Brief */}
          <div className="cell">
            <div className="cell-label">Morning Brief</div>
            <button className="brief-btn" onClick={generateBrief} disabled={briefLoading}>
              {briefLoading ? (
                <>Generating...</>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  Generate Today's Brief
                </>
              )}
            </button>
            {briefLoading && (
              <div className="brief-loading">
                <div className="dot"/><div className="dot"/><div className="dot"/>
              </div>
            )}
            {brief && <div className="brief-text">{brief}</div>}
            {!brief && !briefLoading && (
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px', color: '#b0a090', fontStyle: 'italic', lineHeight: 1.6 }}>
                Hit the button to get your personalized AI-generated brief for today — what to focus on, what to watch, what to carry.
              </p>
            )}
          </div>

          {/* Intentions */}
          <div className="cell">
            <div className="cell-label">Three Intentions</div>
            <div className="intentions-list">
              {intentions.map((val, i) => (
                <div className="intention-row" key={i}>
                  <span className="intention-num">{i + 1}</span>
                  <input
                    className="intention-input"
                    value={val}
                    onChange={e => {
                      const next = [...intentions];
                      next[i] = e.target.value;
                      setIntentions(next);
                    }}
                    placeholder={[
                      'What matters most today?',
                      'What will you move forward?',
                      'What will you protect?'
                    ][i]}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button className="save-btn" onClick={saveIntentions}>Lock them in</button>
              {intentionsSaved && <span className="saved-msg">Intentions set ✓</span>}
            </div>
          </div>

          {/* Calendar — full width */}
          <div className="cell cell-full">
            <div className="cell-label">Calendar</div>
            {GCAL_EMBED_URL ? (
              <div className="cal-wrapper">
                <iframe
                  src={GCAL_EMBED_URL}
                  style={{ width: '100%', height: '500px', border: 'none' }}
                  title="Google Calendar"
                />
              </div>
            ) : (
              <div className="cal-placeholder">
                <p>Your Google Calendar will live here.</p>
                <p style={{ fontSize: '13px', marginTop: 8 }}>
                  Add your embed URL as <code>NEXT_PUBLIC_GCAL_EMBED_URL</code> in your <code>.env.local</code> file,<br/>
                  or paste it directly into the <code>GCAL_EMBED_URL</code> constant at the top of this file.
                </p>
                <p style={{ fontSize: '12px', marginTop: 16, color: '#b0a090' }}>
                  Google Calendar → Settings → your calendar → Integrate calendar → copy the src= URL from the embed code
                </p>
              </div>
            )}
          </div>

          {/* SmartDump — full width */}
          <div className="cell cell-full">
            <div className="cell-label">SmartDump — Clear Your Head</div>
            <textarea
              className="dump-area"
              value={dump}
              onChange={e => setDump(e.target.value)}
              placeholder="What's rattling around in your head? Dump it here — tasks, ideas, anxieties, random thoughts. AI will categorize and push to Notion..."
            />
            <div className="dump-row">
              <button className="dump-btn" onClick={sendDump} disabled={!dump.trim()}>
                Send to Notion
              </button>
              {dumpSent && <span className="dump-sent">Sent to Notion ✓</span>}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
