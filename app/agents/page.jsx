'use client';
import { useState } from 'react';

const AGENTS = [
  { id: 'smartdump', emoji: '🧠', label: 'SmartDump', desc: 'Clear your head → Notion' },
  { id: 'inbox',     emoji: '📬', label: 'Inbox Zero', desc: 'Triage Gmail to zero' },
  { id: 'rei',       emoji: '🏢', label: 'REI Research', desc: 'Research → REI Knowledge Base' },
  { id: 'content',   emoji: '🎬', label: 'Content', desc: 'Ideas, scripts & newsletters' },
];

export default function AgentsPage() {
  const [active, setActive] = useState('smartdump');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // SmartDump state
  const [dumpText, setDumpText] = useState('');

  // REI Research state
  const [reiQuestion, setReiQuestion] = useState('');

  // Content state
  const [contentMode, setContentMode] = useState('trending');
  const [contentTopic, setContentTopic] = useState('');
  const [contentContext, setContentContext] = useState('');

  async function run() {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      let res, data;

      if (active === 'smartdump') {
        res = await fetch('/api/smart-dump', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: dumpText }),
        });
        data = await res.json();

      } else if (active === 'inbox') {
        res = await fetch('/api/inbox-zero', { method: 'POST' });
        data = await res.json();

      } else if (active === 'rei') {
        res = await fetch('/api/rei-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: reiQuestion }),
        });
        data = await res.json();

      } else if (active === 'content') {
        res = await fetch('/api/content-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: contentMode, topic: contentTopic, context: contentContext }),
        });
        data = await res.json();
      }

      setResult(data);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,600;1,300&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0e0c0f; }

        .page { min-height: 100vh; background: #0e0c0f; color: #f0ebe8; font-family: 'DM Sans', sans-serif; padding: 40px 32px; }

        .top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; flex-wrap: wrap; gap: 16px; }
        .title { font-family: 'Cormorant Garamond', serif; font-size: 36px; font-weight: 300; }
        .title em { color: #c9a96e; font-style: italic; }
        .back { color: #c9a96e; font-size: 12px; text-decoration: none; letter-spacing: 0.1em; text-transform: uppercase; }

        .agents { display: flex; gap: 10px; margin-bottom: 32px; flex-wrap: wrap; }
        .agent-btn { background: transparent; border: 1px solid #2a2328; border-radius: 12px; padding: 14px 20px; cursor: pointer; text-align: left; transition: all 0.2s; flex: 1; min-width: 140px; }
        .agent-btn:hover { border-color: #c9a96e; }
        .agent-btn.active { border-color: #c9a96e; background: rgba(201,169,110,0.08); }
        .agent-emoji { font-size: 22px; margin-bottom: 6px; }
        .agent-label { font-size: 13px; font-weight: 500; color: #f0ebe8; }
        .agent-desc { font-size: 11px; color: #7a7075; margin-top: 2px; }

        .panel { background: #161218; border: 1px solid #2a2328; border-radius: 14px; padding: 28px; margin-bottom: 24px; }
        .panel-title { font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #c9a96e; margin-bottom: 20px; }

        textarea, input[type=text] { width: 100%; background: rgba(255,255,255,0.04); border: 1px solid #2a2328; border-radius: 8px; padding: 14px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #f0ebe8; outline: none; transition: border-color 0.2s; resize: vertical; }
        textarea::placeholder, input::placeholder { color: #5a5058; }
        textarea:focus, input:focus { border-color: #c9a96e; }

        .modes { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
        .mode-btn { background: transparent; border: 1px solid #2a2328; border-radius: 100px; padding: 6px 16px; font-size: 12px; color: #7a7075; cursor: pointer; transition: all 0.2s; }
        .mode-btn.active { background: #c9a96e; color: #0e0c0f; border-color: #c9a96e; font-weight: 500; }

        .run-btn { background: #c9a96e; color: #0e0c0f; border: none; border-radius: 10px; padding: 14px 32px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; letter-spacing: 0.04em; margin-top: 16px; }
        .run-btn:hover:not(:disabled) { background: #b8934e; }
        .run-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .result { background: #161218; border: 1px solid #2a2328; border-radius: 14px; padding: 28px; }
        .result-title { font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #7ec97e; margin-bottom: 20px; }

        .result-card { background: rgba(255,255,255,0.03); border: 1px solid #2a2328; border-radius: 10px; padding: 16px; margin-bottom: 12px; }
        .result-card h4 { font-size: 13px; font-weight: 500; color: #f0ebe8; margin-bottom: 8px; }
        .result-card p { font-size: 12px; color: #a89fa5; line-height: 1.6; }
        .result-card .lane { display: inline-block; font-size: 10px; padding: 2px 8px; border-radius: 100px; background: rgba(201,169,110,0.15); color: #c9a96e; margin-bottom: 6px; }
        .result-card .category { display: inline-block; font-size: 10px; padding: 2px 8px; border-radius: 100px; margin-left: 6px; }
        .cat-reply { background: rgba(232,133,106,0.15); color: #e8856a; }
        .cat-archive { background: rgba(126,202,126,0.15); color: #7ec97e; }
        .cat-action { background: rgba(126,170,232,0.15); color: #7eaae8; }

        .draft { background: rgba(126,202,126,0.06); border: 1px solid rgba(126,202,126,0.2); border-radius: 8px; padding: 12px; margin-top: 10px; font-size: 12px; color: #a89fa5; line-height: 1.7; white-space: pre-wrap; font-family: 'Cormorant Garamond', serif; font-size: 15px; }

        .notion-link { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: #c9a96e; text-decoration: none; margin-top: 10px; }
        .notion-link:hover { text-decoration: underline; }

        .loading { display: flex; gap: 6px; align-items: center; padding: 20px 0; }
        .dot { width: 7px; height: 7px; border-radius: 50%; background: #c9a96e; animation: pulse 1.2s ease-in-out infinite; }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes pulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }

        .stats { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .stat { background: rgba(255,255,255,0.04); border-radius: 8px; padding: 10px 16px; font-size: 12px; color: #7a7075; }
        .stat span { color: #c9a96e; font-weight: 500; font-size: 18px; display: block; }

        @media (max-width: 640px) { .page { padding: 24px 16px; } .agent-btn { min-width: 100%; } }
      `}</style>

      <div className="page">
        <div className="top">
          <div>
            <h1 className="title">Your <em>Agents</em></h1>
            <p style={{ fontSize: 12, color: '#7a7075', marginTop: 6 }}>AI working for you in the background</p>
          </div>
          <a href="/morning" className="back">← Morning</a>
        </div>

        {/* Agent selector */}
        <div className="agents">
          {AGENTS.map(a => (
            <button key={a.id} className={`agent-btn ${active === a.id ? 'active' : ''}`} onClick={() => { setActive(a.id); setResult(null); }}>
              <div className="agent-emoji">{a.emoji}</div>
              <div className="agent-label">{a.label}</div>
              <div className="agent-desc">{a.desc}</div>
            </button>
          ))}
        </div>

        {/* Input panels */}
        {active === 'smartdump' && (
          <div className="panel">
            <div className="panel-title">🧠 SmartDump — Clear Your Head</div>
            <textarea rows={6} value={dumpText} onChange={e => setDumpText(e.target.value)}
              placeholder="Dump everything here — tasks, ideas, anxieties, random thoughts, things you need to do, content ideas, REI prep notes... don't filter, just write. AI will categorize and push to the right place in Notion." />
            <button className="run-btn" onClick={run} disabled={loading || !dumpText.trim()}>
              {loading ? 'Categorizing...' : 'Categorize + Send to Notion →'}
            </button>
          </div>
        )}

        {active === 'inbox' && (
          <div className="panel">
            <div className="panel-title">📬 Inbox Zero</div>
            <p style={{ fontSize: 13, color: '#7a7075', lineHeight: 1.7, marginBottom: 16 }}>
              Reads your unread Gmail, categorizes every email, and drafts replies in your voice. You review and approve before anything sends.
            </p>
            <button className="run-btn" onClick={run} disabled={loading}>
              {loading ? 'Reading inbox...' : 'Triage My Inbox →'}
            </button>
          </div>
        )}

        {active === 'rei' && (
          <div className="panel">
            <div className="panel-title">🏢 REI Research Agent</div>
            <input type="text" value={reiQuestion} onChange={e => setReiQuestion(e.target.value)}
              placeholder="e.g. How are real estate brokerages using AI for lead generation in 2026?" style={{ marginBottom: 12 }} />
            <textarea rows={3} value={contentContext} onChange={e => setContentContext(e.target.value)}
              placeholder="Optional: any extra context or angle you want explored..." />
            <button className="run-btn" onClick={run} disabled={loading || !reiQuestion.trim()}>
              {loading ? 'Researching...' : 'Research + Save to REI Hub →'}
            </button>
          </div>
        )}

        {active === 'content' && (
          <div className="panel">
            <div className="panel-title">🎬 Content Agent — @tunedinwithtiff</div>
            <div className="modes">
              {[
                { id: 'trending', label: "🔥 What's Trending" },
                { id: 'generate_ideas', label: '💡 Generate Ideas' },
                { id: 'write_script', label: '🎬 Write TikTok Script' },
                { id: 'write_newsletter', label: '📨 Write Newsletter' },
              ].map(m => (
                <button key={m.id} className={`mode-btn ${contentMode === m.id ? 'active' : ''}`} onClick={() => setContentMode(m.id)}>{m.label}</button>
              ))}
            </div>
            {contentMode !== 'trending' && (
              <input type="text" value={contentTopic} onChange={e => setContentTopic(e.target.value)}
                placeholder={contentMode === 'write_script' ? 'What\'s the TikTok about? e.g. "Getting my first real job offer after graduation"'
                  : contentMode === 'write_newsletter' ? 'What\'s this edition about? e.g. "What I learned in my first week at REI"'
                  : 'Topic or theme to generate ideas around...'}
                style={{ marginBottom: 12 }} />
            )}
            <textarea rows={3} value={contentContext} onChange={e => setContentContext(e.target.value)}
              placeholder="Optional: extra context, recent events, specific angle or emotion you want to capture..." />
            <button className="run-btn" onClick={run} disabled={loading}>
              {loading ? 'Creating...' : contentMode === 'trending' ? 'Find Trends + Generate Ideas →'
                : contentMode === 'generate_ideas' ? 'Generate Ideas →'
                : contentMode === 'write_script' ? 'Write Script + Save to Notion →'
                : 'Write Newsletter + Save to Notion →'}
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="loading">
            <div className="dot"/><div className="dot"/><div className="dot"/>
            <span style={{ fontSize: 12, color: '#7a7075', marginLeft: 8 }}>
              {active === 'inbox' ? 'Reading your inbox...'
                : active === 'rei' ? 'Searching the web + synthesizing...'
                : active === 'content' && contentMode === 'trending' ? 'Scanning TikTok trends...'
                : 'AI is working...'}
            </span>
          </div>
        )}

        {/* Error */}
        {error && <div style={{ color: '#e8856a', fontSize: 13, padding: '12px 0' }}>Error: {error}</div>}

        {/* Results */}
        {result?.ok && (
          <div className="result">
            <div className="result-title">
              {active === 'smartdump' ? `✓ ${result.processed} items sent to Notion`
                : active === 'inbox' ? `✓ ${result.count} emails triaged`
                : active === 'rei' ? '✓ Research complete — saved to REI Hub'
                : '✓ Content generated'}
            </div>

            {/* SmartDump results */}
            {active === 'smartdump' && result.items?.map((item, i) => (
              <div className="result-card" key={i}>
                <span className="lane">{item.lane}</span>
                <span className="lane" style={{ background: 'rgba(126,170,232,0.1)', color: '#7eaae8', marginLeft: 6 }}>{item.db}</span>
                <h4>{item.item}</h4>
              </div>
            ))}

            {/* Inbox results */}
            {active === 'inbox' && result.emails?.map((email, i) => (
              <div className="result-card" key={i}>
                <span className="lane">{email.lane}</span>
                <span className={`category ${email.category === 'reply_needed' ? 'cat-reply' : email.category === 'archive' ? 'cat-archive' : 'cat-action'}`}>{email.category}</span>
                <h4 style={{ marginTop: 8 }}>{email.subject}</h4>
                <p style={{ marginTop: 4 }}><strong style={{ color: '#7a7075' }}>From:</strong> {email.from}</p>
                <p style={{ marginTop: 6 }}>{email.summary}</p>
                {email.draft_reply && (
                  <div className="draft">{email.draft_reply}</div>
                )}
              </div>
            ))}

            {/* REI Research results */}
            {active === 'rei' && result.note && (
              <>
                <div className="result-card">
                  <h4 style={{ fontSize: 16, marginBottom: 12 }}>{result.note.title}</h4>
                  <p>{result.note.summary}</p>
                </div>
                <div className="result-card">
                  <h4>Key Findings</h4>
                  {result.note.key_findings?.map((f, i) => <p key={i} style={{ marginTop: 6 }}>→ {f}</p>)}
                </div>
                <div className="result-card">
                  <h4>How REI Can Apply This</h4>
                  {result.note.rei_applications?.map((a, i) => <p key={i} style={{ marginTop: 6 }}>→ {a}</p>)}
                </div>
                {result.notion_url && (
                  <a href={result.notion_url} target="_blank" rel="noopener noreferrer" className="notion-link">
                    📝 View full note in Notion →
                  </a>
                )}
              </>
            )}

            {/* Content results */}
            {active === 'content' && result.result && (
              Array.isArray(result.result) ? (
                result.result.map((item, i) => (
                  <div className="result-card" key={i}>
                    <span className="lane">{item.pillar}</span>
                    <span className="lane" style={{ background: 'rgba(126,170,232,0.1)', color: '#7eaae8', marginLeft: 6 }}>{item.platform}</span>
                    <h4 style={{ marginTop: 8 }}>{item.hook}</h4>
                    <p style={{ marginTop: 6 }}>{item.concept}</p>
                    {item.why_now && <p style={{ marginTop: 6, color: '#c9a96e', fontSize: 11 }}>⚡ {item.why_now}</p>}
                  </div>
                ))
              ) : (
                <div className="result-card">
                  {result.result.hook && <h4 style={{ marginBottom: 12, color: '#c9a96e' }}>"{result.result.hook}"</h4>}
                  {result.result.script && <div className="draft">{result.result.script}</div>}
                  {result.result.body && <div className="draft">{result.result.body}</div>}
                  {result.result.caption && <p style={{ marginTop: 12, fontSize: 12, color: '#7a7075' }}>{result.result.caption}</p>}
                  {result.notion_url && (
                    <a href={result.notion_url} target="_blank" rel="noopener noreferrer" className="notion-link">📝 Saved to Notion →</a>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </>
  );
}
