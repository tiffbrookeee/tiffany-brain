'use client';
import { useState, useEffect, useRef } from 'react';

// ─────────────────────────────────────────────
// TIFFANY'S PROFILE — lives in every Claude call
// ─────────────────────────────────────────────
const PROFILE = `You are Tiffany's personal second brain, life operating system, and thinking partner. You know her fully. Read this before every response.

WHO SHE IS:
Tiffany is a multifaceted woman in her early 20s — finishing school, building a brand (Vixens N Darlings), working 3 jobs, and figuring out who she wants to become. She is Blair Waldorf, not Serena. Precise, ambitious, aesthetics-minded. She spent too long trying to be the "loose and fun" version of herself that doesn't fit. She feels deeply, processes at a high volume, and internalizes other people's opinions in ways that can derail her. She is not too much. She hasn't found the spaces that match her depth yet.

IDENTITY:
- Honors student her whole life — now questioning direction post-graduation
- Multifaceted: loves tech/AI AND Harry Potter AND Disney AND philosophy AND makeup AND drawing AND painting AND singing AND fun conspiracy theories AND Substack deep reads
- Changes her hair color because she's still finding what feels most like her
- The "floater" friend — belongs to many worlds, fully centered in none yet
- Wants to be early, not just on time. Cares about her appearance and self-love.
- Spiral pattern: feels something → doesn't feel heard → goes quiet → internalizes → self-criticizes → "I wish I wasn't such a fuck up" — challenge this pattern directly when it shows up
- Waitlisted for law school. Unsure if law is even the right path.
- Goal: work in tech, AI, or leadership — somewhere she can learn, code, analyze, and make a real difference

HER BRAND — VIXENS N DARLINGS:
- Clothing brand. Hoodies first. One sample produced, corrections made, second sample in production.
- Tech pack and 5-minute pitch deck complete.
- Mission: heal who she was at 14 — the girl who couldn't be put in a box, too much for some rooms, not enough for others
- Vision: a world (the Pinky Promise Club) where multifaceted women — the floaters, the ones with too many passions, the ones always playing sidekick in someone else's story — feel seen, empowered, and capable of taking a leap
- Empowerment marketplace roadmap: hoodies → charms/accessories → events → podcast → newsletter → community
- Content struggle: she knows what she believes but hasn't cracked how to turn it into hooks that land
- Investor struggle: tried making it "business casual" but that's not her passion. The real pain point is harder to articulate: women who are multidimensional in a world that wants them to pick one lane.

SOCIAL MEDIA — @tunedinwithtiff (TikTok, main):
- Started November 2025. Currently 350 followers. Actively growing.
- 4 content buckets: (1) Education & Business: Mentor Minutes, Practice > Preach, Respectfully No, Founder BTS (2) Fitness & Nutrition: workout routines, recipes, goals, new workouts (3) Science & Routines: morning routine science, Substack Rewind, learning (4) Hobbies: makeup, drawing, painting, singing, Filling Up My Cup
- Other accounts: 84K from high school (mostly dead, TikTok Shop only); separate book promo account (20 videos/month, active brand deal)
- YouTube: cross-posting TikTok shorts
- Goal: build a community around what she stands for, the value she brings, a real window into her world

ACTIVE WORK:
1. Cafe/YPO: Cafe mostly self-sufficient. New project: photographing, cataloguing, describing rare baseball memorabilia. Also assists Justin (YPO mentorship chair) — this semester: YNG mentees kickoff, needs SMART goal worksheets for mentor matches.
2. Insurance: Just passed life insurance exam. Starting online onboarding. Part-time for now; intended to become primary income in grad life when cafe ends.
3. Book promo brand deal: 20 TikTok videos/month.

MONEY: 3 income sources to track. Needs a real budget. Grad school loans incoming. Has money market, stocks, and crypto. Wants to invest consistently and build for the future.

WELLNESS GOALS:
- 10,000 steps/day
- 30–45 minute workout daily (videos, weights, etc.)
- Solidcore once/month (committed)
- End goal: lean with muscle, able to maintain — she does better with a plan she doesn't have to think about. She won't commit to things she doesn't trust to get her to her goal.
- Night eating: wakes up mid-night and eats, wakes feeling bad — this is the primary wellness issue right now
- Sleep is disrupted by the night eating
- Anxiety and emotional spirals need grounding tools, not generic advice

SCHOOL & FUTURE: Finishing now. Grad life begins May — cafe ends, insurance becomes primary. Wants tech/AI/leadership career.

3-YEAR VISION: 100K–400K followers excited about clothing and charm drops. A podcast where women DM her saying she helped them. Working in tech, AI, or leadership. Pinky Promise Club is real. She knows who she is.

HER RULES:
1. Finish before opening something new
2. Plans beat willpower — build the system, trust the system
3. Don't shrink. Take up space.
4. When in the spiral: get in the body or get in the work
5. She is not too much. She is the right amount for the right spaces.

HOW TO COACH HER: Direct and specific — no softening, no generic affirmations, no fluff. Name the spiral when you see it. Call out avoidance. Remind her of her system. The brand, the content, the wellness — all connected to the same question she's working through: who am I and what do I stand for?`;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function load(key, def = null) {
  if (typeof window === 'undefined') return def;
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
}
function save(key, val) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

async function callClaude(messages, system) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, system, messages }),
  });
  const data = await res.json();
  return data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
}

function urgency(t) {
  if (!t || t.status === 'Done') return 'Done';
  if (!t.due) return 'No date';
  const d = Math.floor((new Date(t.due + 'T00:00:00') - new Date()) / 86400000);
  if (d < 0) return 'Overdue'; if (d === 0) return 'Today'; if (d <= 3) return 'Soon'; return 'Later';
}
function score(t) {
  if (!t || t.status === 'Done') return 0;
  let s = t.priority === 'P1' ? 30 : t.priority === 'P2' ? 20 : 10;
  if (t.today || t.finishFirst) s += 25; if (t.thisWeek) s += 15;
  const u = urgency(t);
  if (u === 'Overdue') s += 30; else if (u === 'Today') s += 20; else if (u === 'Soon') s += 10;
  return s;
}
function mkTask(o = {}) {
  return { id: Date.now().toString() + Math.random().toString(36).slice(2), title: '', status: 'Inbox', priority: 'P2', area: '', due: '', energy: '', finishFirst: false, thisWeek: false, today: false, notes: '', created: new Date().toISOString(), ...o };
}

const AREAS = ['Social Media', 'Brand', 'Insurance', 'Cafe/YPO', 'School', 'Money', 'Life Admin', 'Wellness', 'Personal', 'Grad Life'];
const MOODS = ['', 'Rough', 'Low', 'Okay', 'Good', 'Great'];

// ─────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Karla:wght@300;400;500;600&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#F7F5F0;--surf:#FFFFFF;--border:#E2DDD4;--border2:#C4BEB5;
  --text:#1C1912;--muted:#7A7469;--faint:#B5B0A8;
  --gold:#B8880A;--gbg:#FDF3DC;--gring:#E8C84C;
  --red:#A33030;--rbg:#FDF0EF;
  --green:#2D6B45;--gbg2:#EDF6F1;
  --blue:#1A4E8A;--bbg:#EEF3FB;
  --purple:#5A3E8A;--pbg:#F0EBFB;
}
html,body{background:#F7F5F0;min-height:100vh}
body{color:var(--text);font-family:'Karla',sans-serif;font-size:14px;line-height:1.6}
.app{max-width:860px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column}
.hdr{padding:15px 22px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border);background:var(--surf);position:sticky;top:0;z-index:20}
.hdr-name{font-family:'Libre Baskerville',serif;font-size:20px;font-weight:700;letter-spacing:-.01em}
.hdr-sub{font-size:10px;color:var(--muted);letter-spacing:.16em;text-transform:uppercase;font-weight:600}
.hdr-date{margin-left:auto;font-size:12px;color:var(--muted)}
.nav{display:flex;gap:2px;padding:8px 18px;border-bottom:1px solid var(--border);background:var(--surf);overflow-x:auto}
.nav::-webkit-scrollbar{display:none}
.nb{background:none;border:none;padding:7px 13px;border-radius:6px;font-family:'Karla',sans-serif;font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;transition:all .13s;white-space:nowrap}
.nb:hover{color:var(--text);background:var(--bg)}
.nb.on{color:var(--gold);background:var(--gbg)}
.body{flex:1;padding:22px 22px;max-width:820px;width:100%}
.card{background:var(--surf);border:1px solid var(--border);border-radius:10px;padding:18px;margin-bottom:14px}
.card-t{font-family:'Libre Baskerville',serif;font-size:16px;font-weight:700;margin-bottom:12px}
.sl{font-size:10px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin:22px 0 8px;display:flex;align-items:center;gap:8px}
.sl:first-child{margin-top:0}
.sl-b{background:var(--border);color:var(--muted);border-radius:20px;padding:1px 7px;font-size:10px}
.callout{background:var(--gbg);border-left:3px solid var(--gring);border-radius:0 6px 6px 0;padding:10px 14px;font-size:13px;font-style:italic;margin-bottom:14px}
.stat-row{display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap}
.stat{flex:1;min-width:80px;background:var(--surf);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center}
.stat-n{font-family:'Libre Baskerville',serif;font-size:26px;line-height:1;margin-bottom:2px}
.stat-l{font-size:10px;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;font-weight:600}
.ti{display:flex;align-items:flex-start;gap:9px;padding:10px 12px;border-radius:8px;border:1px solid var(--border);margin-bottom:4px;background:var(--surf)}
.ti:hover{border-color:var(--border2)}
.ti.done{opacity:.35}
.ti.ff{border-left:2.5px solid var(--gold)}
.ti.ov{border-left:2.5px solid var(--red)}
.chk{width:16px;height:16px;min-width:16px;border-radius:50%;border:1.5px solid var(--border2);cursor:pointer;display:flex;align-items:center;justify-content:center;margin-top:2px;flex-shrink:0}
.chk.on{background:var(--green);border-color:var(--green)}
.tb{flex:1;min-width:0}
.tt{font-size:14px;line-height:1.45;word-break:break-word}
.tm{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}
.tag{font-size:10px;font-weight:600;padding:2px 7px;border-radius:20px;letter-spacing:.04em}
.tp1{background:var(--rbg);color:var(--red)}
.tp2{background:var(--gbg);color:var(--gold)}
.tp3{background:var(--bg);color:var(--muted);border:1px solid var(--border)}
.ta{background:var(--bbg);color:var(--blue)}
.tff{background:var(--gbg);color:var(--gold);font-weight:700}
.tov{background:var(--rbg);color:var(--red)}
.tto{background:var(--gbg);color:var(--gold)}
.tso{background:var(--gbg2);color:var(--green)}
.tmu{background:var(--bg);color:var(--muted);border:1px solid var(--border)}
.tac{display:flex;gap:4px;opacity:0;flex-shrink:0;margin-top:1px}
.ti:hover .tac{opacity:1}
.ib{background:none;border:none;cursor:pointer;color:var(--faint);font-size:13px;padding:2px 5px;border-radius:4px}
.ib:hover{color:var(--text)}
input,select,textarea{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:8px 10px;color:var(--text);font-family:'Karla',sans-serif;font-size:13px;outline:none;transition:border-color .13s;width:100%}
input:focus,select:focus,textarea:focus{border-color:var(--gold)}
input::placeholder,textarea::placeholder{color:var(--faint)}
.lbl{font-size:11px;color:var(--muted);margin-bottom:4px;letter-spacing:.07em;font-weight:600;display:block}
.frow{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}
.fi{flex:1;min-width:110px}
.cbr{display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;user-select:none}
.cbr input[type=checkbox]{width:auto;cursor:pointer;accent-color:var(--gold)}
.btn{padding:8px 18px;border-radius:7px;border:none;font-family:'Karla',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all .13s;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.btn-p{background:var(--gold);color:#FFF}
.btn-p:hover:not(:disabled){background:#A07808}
.btn-p:disabled{opacity:.5;cursor:not-allowed}
.btn-g{background:none;color:var(--muted);border:1px solid var(--border)}
.btn-g:hover{color:var(--text);border-color:var(--border2)}
.chat-wrap{display:flex;flex-direction:column;height:480px;background:var(--surf);border:1px solid var(--border);border-radius:10px;overflow:hidden}
.chat-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}
.msg{max-width:85%;padding:10px 14px;border-radius:10px;font-size:13px;line-height:1.7;white-space:pre-wrap}
.msg.u{background:var(--gbg);border:1px solid rgba(184,136,10,.2);align-self:flex-end;border-bottom-right-radius:3px}
.msg.a{background:var(--bg);border:1px solid var(--border);align-self:flex-start;border-bottom-left-radius:3px}
.chat-in{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--border)}
.chat-in input{flex:1}
.dots span{display:inline-block;animation:bl 1.1s infinite;font-size:18px;color:var(--muted)}
.dots span:nth-child(2){animation-delay:.2s}
.dots span:nth-child(3){animation-delay:.4s}
@keyframes bl{0%,100%{opacity:.2}50%{opacity:1}}
.empty{text-align:center;color:var(--faint);padding:32px;font-style:italic;font-size:13px}
.start-c{text-align:center;padding:48px 24px}
.start-t{font-family:'Libre Baskerville',serif;font-size:22px;font-weight:700;margin-bottom:8px}
.start-s{font-size:13px;color:var(--muted);margin-bottom:22px;max-width:380px;margin-left:auto;margin-right:auto;line-height:1.7}
.pbar{height:6px;border-radius:3px;background:var(--border);overflow:hidden;margin-top:5px}
.pfill{height:100%;border-radius:3px;transition:width .3s}
.ni{display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid var(--border);font-size:14px;cursor:pointer;user-select:none}
.ni:last-child{border-bottom:none}
.ni.on{color:var(--muted);text-decoration:line-through}
.ni input[type=checkbox]{width:16px;height:16px;min-width:16px;cursor:pointer;accent-color:var(--gold)}
.brief-box{padding:16px;background:var(--surf);border:1px solid var(--border);border-left:3px solid var(--gold);border-radius:10px;margin-bottom:16px;font-size:13px;line-height:1.85;white-space:pre-wrap}
.q-btn{display:block;width:100%;text-align:left;padding:10px 14px;border-radius:8px;border:1px solid var(--border);background:none;font-family:'Karla',sans-serif;font-size:13px;color:var(--text);cursor:pointer;margin-bottom:6px;transition:all .13s}
.q-btn:hover{border-color:var(--gold);background:var(--gbg)}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
@media(max-width:560px){
  .body{padding:14px 14px}
  .hdr{padding:12px 14px}
  .nav{padding:6px 10px}
  .nb{padding:6px 9px;font-size:12px}
  .stat-n{font-size:22px}
}
`;

// ─────────────────────────────────────────────
// TASK ITEM
// ─────────────────────────────────────────────
function TaskItem({ task: t, onDone, onFlag, onDelete }) {
  const u = urgency(t);
  const done = t.status === 'Done';
  return (
    <div className={`ti ${done ? 'done' : ''} ${t.finishFirst && !done ? 'ff' : ''} ${u === 'Overdue' && !done ? 'ov' : ''}`}>
      <div className={`chk ${done ? 'on' : ''}`} onClick={() => onDone?.(t.id)}>
        {done && <span style={{ color: '#fff', fontSize: '9px', fontWeight: 'bold', lineHeight: 1 }}>✓</span>}
      </div>
      <div className="tb">
        <div className="tt" style={{ textDecoration: done ? 'line-through' : 'none' }}>{t.title || 'Untitled'}</div>
        <div className="tm">
          {t.priority === 'P1' && <span className="tag tp1">P1</span>}
          {t.priority === 'P2' && <span className="tag tp2">P2</span>}
          {t.priority === 'P3' && <span className="tag tp3">P3</span>}
          {t.area && <span className="tag ta">{t.area}</span>}
          {t.finishFirst && !done && <span className="tag tff">Finish First</span>}
          {!done && u === 'Overdue' && <span className="tag tov">Overdue</span>}
          {!done && u === 'Today' && <span className="tag tto">Today</span>}
          {!done && u === 'Soon' && t.due && <span className="tag tso">{new Date(t.due + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
          {!done && u === 'Later' && t.due && <span className="tag tmu">{new Date(t.due + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
          {t.energy && <span className="tag tmu">{t.energy}</span>}
        </div>
      </div>
      {(onFlag || onDelete) && (
        <div className="tac">
          {onFlag && <button className="ib" onClick={() => onFlag(t.id)}>{t.finishFirst ? '★' : '☆'}</button>}
          {onDelete && <button className="ib" onClick={() => onDelete(t.id)}>✕</button>}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// TODAY TAB
// ─────────────────────────────────────────────
function TodayTab({ tasks, onDone, onFlag, onDelete }) {
  const [brief, setBrief] = useState('');
  const [loading, setLoading] = useState(false);

  const todayTasks = tasks
    .filter(t => t.status !== 'Done' && t.status !== 'Archived' && (t.today || t.finishFirst || urgency(t) === 'Today' || urgency(t) === 'Overdue'))
    .sort((a, b) => { if (a.finishFirst !== b.finishFirst) return a.finishFirst ? -1 : 1; return score(b) - score(a); });
  const ff = tasks.filter(t => t.finishFirst && t.status !== 'Done');
  const ov = tasks.filter(t => urgency(t) === 'Overdue' && t.status !== 'Done').length;
  const done = tasks.filter(t => t.status === 'Done').length;
  const upcoming = tasks.filter(t => {
    if (t.status === 'Done' || !t.due) return false;
    const d = Math.floor((new Date(t.due + 'T00:00:00') - new Date()) / 86400000);
    return d > 0 && d <= 14;
  }).sort((a, b) => new Date(a.due) - new Date(b.due)).slice(0, 6);

  const getMorningBrief = async () => {
    setLoading(true);
    const top5 = todayTasks.slice(0, 5).map(t => t.title).filter(Boolean).join(', ') || 'None flagged yet';
    const ffStr = ff.map(t => t.title).filter(Boolean).join(', ') || 'Empty';
    const sys = PROFILE + "\n\nGenerate Tiffany's morning brief. 2–3 short paragraphs. Personal, direct, grounding. Name what actually matters today based on her task data. Reference her context. No generic affirmations. End with one clear first move.";
    try {
      const r = await callClaude([{ role: 'user', content: `Morning brief. Today's tasks: ${top5}. Finish First queue: ${ffStr}. Overdue: ${ov}. Done so far: ${done}.` }], sys);
      setBrief(r);
    } catch { setBrief('Could not generate brief — check your API key in Vercel settings.'); }
    setLoading(false);
  };

  return (
    <div>
      <div className="stat-row">
        <div className="stat"><div className="stat-n">{todayTasks.length}</div><div className="stat-l">Today</div></div>
        <div className="stat"><div className="stat-n" style={{ color: ov > 0 ? 'var(--red)' : 'inherit' }}>{ov}</div><div className="stat-l">Overdue</div></div>
        <div className="stat"><div className="stat-n" style={{ color: 'var(--green)' }}>{done}</div><div className="stat-l">Done</div></div>
        <div className="stat"><div className="stat-n" style={{ color: 'var(--gold)' }}>{ff.length}</div><div className="stat-l">Finish First</div></div>
      </div>

      {!brief ? (
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>Get your personalized morning brief — reads your full context and today's priorities.</div>
          <button className="btn btn-p" onClick={getMorningBrief} disabled={loading}>
            {loading ? 'Generating...' : 'Get Morning Brief'}
          </button>
        </div>
      ) : (
        <div className="brief-box">
          {brief}
          <div style={{ marginTop: 10 }}><button className="btn btn-g" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setBrief('')}>Refresh</button></div>
        </div>
      )}

      {ff.length > 0 && <>
        <div className="sl">Finish First <span className="sl-b">{ff.length}</span></div>
        <div className="callout">Close these before touching anything new.</div>
        {ff.map(t => <TaskItem key={t.id} task={t} onDone={onDone} onFlag={onFlag} onDelete={onDelete} />)}
      </>}

      <div className="sl">Today's Priorities <span className="sl-b">{todayTasks.length}</span></div>
      {todayTasks.length > 0
        ? todayTasks.map(t => <TaskItem key={t.id} task={t} onDone={onDone} onFlag={onFlag} onDelete={onDelete} />)
        : <div className="empty">Nothing flagged for today. Add tasks in Capture.</div>}

      {upcoming.length > 0 && <>
        <div className="sl">Upcoming — Next 14 Days</div>
        {upcoming.map(t => <TaskItem key={t.id} task={t} onDone={onDone} onFlag={onFlag} onDelete={onDelete} />)}
      </>}
    </div>
  );
}

// ─────────────────────────────────────────────
// CAPTURE TAB
// ─────────────────────────────────────────────
function CaptureTab({ onAddTask }) {
  const [mode, setMode] = useState('task');
  const [f, setF] = useState({ title: '', priority: 'P2', area: '', due: '', energy: '', today: false, thisWeek: false, finishFirst: false });
  const [dumps, setDumps] = useState([]);
  const [di, setDi] = useState('');
  const [da, setDa] = useState('');

  useEffect(() => { setDumps(load('tff_dumps', [])); }, []);
  useEffect(() => { save('tff_dumps', dumps); }, [dumps]);

  const submitTask = () => {
    if (!f.title.trim()) return;
    onAddTask(mkTask({ ...f, status: 'Inbox' }));
    setF({ title: '', priority: 'P2', area: '', due: '', energy: '', today: false, thisWeek: false, finishFirst: false });
  };
  const submitDump = () => {
    if (!di.trim()) return;
    setDumps(p => [{ id: Date.now().toString(), text: di, area: da, done: false, created: new Date().toISOString() }, ...p]);
    setDi(''); setDa('');
  };
  const unproc = dumps.filter(d => !d.done);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <button className={`btn ${mode === 'task' ? 'btn-p' : 'btn-g'}`} onClick={() => setMode('task')}>Add Task</button>
        <button className={`btn ${mode === 'dump' ? 'btn-p' : 'btn-g'}`} onClick={() => setMode('dump')}>Brain Dump{unproc.length > 0 ? ` (${unproc.length})` : ''}</button>
      </div>
      {mode === 'task' ? (
        <div className="card">
          <div className="card-t">New Task</div>
          <label className="lbl">What needs to happen?</label>
          <input style={{ marginBottom: 12, fontSize: 15 }} placeholder="Task name..." value={f.title} onChange={e => setF(p => ({ ...p, title: e.target.value }))} onKeyDown={e => e.key === 'Enter' && submitTask()} autoFocus />
          <div className="frow">
            <div className="fi"><label className="lbl">Priority</label><select value={f.priority} onChange={e => setF(p => ({ ...p, priority: e.target.value }))}>{['P1', 'P2', 'P3'].map(x => <option key={x}>{x}</option>)}</select></div>
            <div className="fi"><label className="lbl">Area</label><select value={f.area} onChange={e => setF(p => ({ ...p, area: e.target.value }))}><option value="">—</option>{AREAS.map(x => <option key={x}>{x}</option>)}</select></div>
            <div className="fi"><label className="lbl">Due</label><input type="date" value={f.due} onChange={e => setF(p => ({ ...p, due: e.target.value }))} /></div>
            <div className="fi"><label className="lbl">Energy</label><select value={f.energy} onChange={e => setF(p => ({ ...p, energy: e.target.value }))}><option value="">—</option>{['10 Min', 'Light', 'Medium', 'Deep'].map(x => <option key={x}>{x}</option>)}</select></div>
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
            <label className="cbr"><input type="checkbox" checked={f.today} onChange={e => setF(p => ({ ...p, today: e.target.checked }))} /> Today</label>
            <label className="cbr"><input type="checkbox" checked={f.thisWeek} onChange={e => setF(p => ({ ...p, thisWeek: e.target.checked }))} /> This Week</label>
            <label className="cbr"><input type="checkbox" checked={f.finishFirst} onChange={e => setF(p => ({ ...p, finishFirst: e.target.checked }))} /> Finish First</label>
          </div>
          <button className="btn btn-p" onClick={submitTask}>Add Task</button>
        </div>
      ) : (
        <div className="card">
          <div className="card-t">Brain Dump</div>
          <div className="callout">Get it out of your head. Don't think about where it goes yet.</div>
          <input style={{ marginBottom: 10, fontSize: 15 }} placeholder="What's on your mind?" value={di} onChange={e => setDi(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitDump()} autoFocus />
          <div style={{ marginBottom: 14 }}>
            <select value={da} onChange={e => setDa(e.target.value)} style={{ width: 'auto' }}>
              <option value="">No area</option>{AREAS.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <button className="btn btn-p" onClick={submitDump} style={{ marginBottom: 22 }}>Capture</button>
          {unproc.length > 0 && <>
            <div className="sl" style={{ marginTop: 8 }}>To Process <span className="sl-b">{unproc.length}</span></div>
            {unproc.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ flex: 1 }}><div style={{ fontSize: 14 }}>{d.text}</div>{d.area && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{d.area}</div>}</div>
                <button className="btn btn-g" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => setDumps(p => p.map(x => x.id === d.id ? { ...x, done: true } : x))}>Done ✓</button>
              </div>
            ))}
          </>}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// WELLNESS TAB
// ─────────────────────────────────────────────
function WellnessTab({ today: tw, onSave, log }) {
  const [w, setW] = useState({ steps: '', workout: false, workoutType: '', workoutMins: '', water: '', sleepHours: '', sleepQuality: '', nightEating: false, mood: '', spiral: '', reset: '' });
  useEffect(() => { if (tw && Object.keys(tw).length > 0) setW(p => ({ ...p, ...tw })); }, [tw]);
  const upd = (k, v) => { const n = { ...w, [k]: v }; setW(n); onSave(n); };
  const sp = Math.min(100, Math.round((parseInt(w.steps) || 0) / 10000 * 100));
  const wp = Math.min(100, Math.round((parseInt(w.water) || 0) / 8 * 100));

  return (
    <div>
      <div className="callout">You do better with a plan you don't have to think about. Log it — trust the system.</div>
      <div className="card">
        <div className="card-t">Movement</div>
        <div className="frow">
          <div className="fi">
            <label className="lbl">Steps Today</label>
            <input type="number" placeholder="0" value={w.steps} onChange={e => upd('steps', e.target.value)} />
            <div className="pbar"><div className="pfill" style={{ width: `${sp}%`, background: sp >= 100 ? 'var(--green)' : 'var(--gold)' }} /></div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{sp}% of 10,000</div>
          </div>
          <div className="fi">
            <label className="lbl">Water (glasses)</label>
            <input type="number" placeholder="0" value={w.water} onChange={e => upd('water', e.target.value)} />
            <div className="pbar"><div className="pfill" style={{ width: `${wp}%`, background: 'var(--blue)' }} /></div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{wp}% of 8 glasses</div>
          </div>
        </div>
        <label className="cbr" style={{ marginBottom: 10 }}><input type="checkbox" checked={!!w.workout} onChange={e => upd('workout', e.target.checked)} /> Workout done today</label>
        {w.workout && <div className="frow">
          <div className="fi"><label className="lbl">What?</label><input placeholder="YouTube video, weights, walk..." value={w.workoutType} onChange={e => upd('workoutType', e.target.value)} /></div>
          <div className="fi" style={{ maxWidth: 100 }}><label className="lbl">Minutes</label><input type="number" placeholder="30" value={w.workoutMins} onChange={e => upd('workoutMins', e.target.value)} /></div>
        </div>}
      </div>
      <div className="card">
        <div className="card-t">Sleep & Night Eating</div>
        <div className="frow" style={{ marginBottom: 10 }}>
          <div className="fi"><label className="lbl">Hours Slept</label><input type="number" step="0.5" placeholder="7.5" value={w.sleepHours} onChange={e => upd('sleepHours', e.target.value)} /></div>
          <div className="fi"><label className="lbl">Sleep Quality</label>
            <select value={w.sleepQuality} onChange={e => upd('sleepQuality', e.target.value)}>
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} — {['Terrible', 'Poor', 'Okay', 'Good', 'Great'][n - 1]}</option>)}
            </select>
          </div>
        </div>
        <label className="cbr"><input type="checkbox" checked={!!w.nightEating} onChange={e => upd('nightEating', e.target.checked)} /> Night eating happened last night</label>
        {w.nightEating && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>Noted. No judgment — just tracking the pattern.</div>}
      </div>
      <div className="card">
        <div className="card-t">Emotional Check-In</div>
        <label className="lbl">Mood today</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} className={`btn ${parseInt(w.mood) === n ? 'btn-p' : 'btn-g'}`} style={{ padding: '6px 14px' }} onClick={() => upd('mood', n)}>
              {['Rough', 'Low', 'Okay', 'Good', 'Great'][n - 1]}
            </button>
          ))}
        </div>
        <label className="lbl">Anything making me spiral today?</label>
        <textarea rows={2} style={{ marginBottom: 10, resize: 'vertical' }} placeholder="Get it out — this feeds into your nightly wind-down..." value={w.spiral} onChange={e => upd('spiral', e.target.value)} />
        <label className="lbl">One reset action for today</label>
        <input placeholder="One thing I can do in 10 minutes..." value={w.reset} onChange={e => upd('reset', e.target.value)} />
      </div>
      {Object.keys(log).length > 1 && (
        <div className="card">
          <div className="card-t">Recent Pattern</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 440 }}>
              <thead><tr>{['Date', 'Steps', 'Workout', 'Sleep', 'Night Eat', 'Mood'].map(h => (
                <th key={h} style={{ padding: '4px 8px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{h}</th>
              ))}</tr></thead>
              <tbody>{Object.entries(log).sort(([a], [b]) => b.localeCompare(a)).slice(0, 7).map(([date, d]) => (
                <tr key={date}>
                  <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)' }}>{new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                  <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)', color: parseInt(d.steps) >= 10000 ? 'var(--green)' : d.steps ? 'inherit' : 'var(--faint)' }}>{d.steps || '—'}</td>
                  <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)' }}>{d.workout ? '✓' : '—'}</td>
                  <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)' }}>{d.sleepHours ? `${d.sleepHours}h` : '—'}</td>
                  <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)', color: d.nightEating ? 'var(--red)' : 'inherit' }}>{d.nightEating ? 'Yes' : '—'}</td>
                  <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)' }}>{d.mood ? MOODS[d.mood] : '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// NIGHTLY TAB
// ─────────────────────────────────────────────
function NightlyTab({ tasks, wellness }) {
  const [phase, setPhase] = useState('checks');
  const [checks, setChecks] = useState({ done: false, moved: false, loops: false, tomorrow: false });
  const [refs, setRefs] = useState({ done: '', heavy: '', tomorrow: '' });
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, loading]);

  const done = tasks.filter(t => t.status === 'Done');
  const open = tasks.filter(t => t.status !== 'Done' && t.status !== 'Archived');
  const ov = tasks.filter(t => urgency(t) === 'Overdue' && t.status !== 'Done');
  const ff = tasks.filter(t => t.finishFirst && t.status !== 'Done');

  const sys = `${PROFILE}

You are Tiffany's nightly wind-down companion. Tonight's data:
- Done today: ${done.length} tasks (${done.slice(0, 3).map(t => t.title).filter(Boolean).join(', ') || 'none recorded'})
- Still open: ${open.length} tasks
- Overdue: ${ov.length > 0 ? ov.map(t => t.title).slice(0, 3).join(', ') : 'none'}
- Finish First queue: ${ff.length > 0 ? ff.map(t => t.title).join(', ') : 'clear'}
- Wellness: steps=${wellness.steps || 'not logged'}, workout=${wellness.workout ? `done (${wellness.workoutType || ''})` : 'not done'}, sleep quality=${wellness.sleepQuality || 'not logged'}, night eating=${wellness.nightEating ? 'happened last night' : 'no'}, mood=${MOODS[wellness.mood] || 'not logged'}${wellness.spiral ? `\n- On her mind tonight: "${wellness.spiral}"` : ''}
- Her reflection: Done: "${refs.done}" | Felt heavy: "${refs.heavy}" | Tomorrow first: "${refs.tomorrow}"

Run a real wind-down. Grounded, direct. One focused question at a time. Max 3 sentences per response. Start by acknowledging something real from today — not a compliment, an observation.`;

  const start = async () => {
    setStarted(true); setLoading(true);
    try { const r = await callClaude([], sys); setMsgs([{ role: 'assistant', content: r }]); }
    catch { setMsgs([{ role: 'assistant', content: "Let's close the day. What actually got done today — even the small things count." }]); }
    setLoading(false);
  };
  const send = async () => {
    if (!input.trim() || loading) return;
    const um = { role: 'user', content: input.trim() };
    const next = [...msgs, um]; setMsgs(next); setInput(''); setLoading(true);
    try { const r = await callClaude(next, sys); setMsgs(p => [...p, { role: 'assistant', content: r }]); }
    catch { setMsgs(p => [...p, { role: 'assistant', content: 'Go on.' }]); }
    setLoading(false);
  };

  if (phase === 'checks') return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'Libre Baskerville,serif', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Nightly Wind-Down</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>5 minutes. Close the day the right way.</div>
      </div>
      <div className="card">
        <div className="card-t">Wrap-Up Checklist</div>
        {[['done', 'Marked completed tasks as Done'], ['moved', 'Moved unfinished tasks or flagged them'], ['loops', 'Dumped any new open loops'], ['tomorrow', "Set tomorrow's Top 3"]].map(([k, label]) => (
          <div key={k} className={`ni ${checks[k] ? 'on' : ''}`} onClick={() => setChecks(p => ({ ...p, [k]: !p[k] }))}>
            <input type="checkbox" checked={!!checks[k]} onChange={() => {}} />
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-t">Quick Reflection</div>
        <div style={{ marginBottom: 12 }}><label className="lbl">What actually got done today?</label><input placeholder="Even the small things count..." value={refs.done} onChange={e => setRefs(p => ({ ...p, done: e.target.value }))} /></div>
        <div style={{ marginBottom: 12 }}><label className="lbl">What felt heavier than it needed to?</label><input placeholder="Be honest..." value={refs.heavy} onChange={e => setRefs(p => ({ ...p, heavy: e.target.value }))} /></div>
        <div style={{ marginBottom: 18 }}><label className="lbl">What is tomorrow's first move?</label><input placeholder="One clear action..." value={refs.tomorrow} onChange={e => setRefs(p => ({ ...p, tomorrow: e.target.value }))} /></div>
        <button className="btn btn-p" onClick={() => setPhase('chat')} disabled={!refs.done.trim()}>Talk it through with Claude →</button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ fontFamily: 'Libre Baskerville,serif', fontSize: 20, fontWeight: 700 }}>Nightly Wind-Down</div>
        <button className="btn btn-g" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => { setPhase('checks'); setStarted(false); setMsgs([]); }}>← Back</button>
      </div>
      {!started ? (
        <div className="start-c">
          <div className="start-s">Claude has tonight's full picture — tasks, wellness, your reflection. One real question at a time.</div>
          <button className="btn btn-p" style={{ fontSize: 15, padding: '11px 28px' }} onClick={start}>Begin Wind-Down</button>
        </div>
      ) : (
        <div className="chat-wrap">
          <div className="chat-msgs">
            {msgs.map((m, i) => <div key={i} className={`msg ${m.role === 'user' ? 'u' : 'a'}`}>{m.content}</div>)}
            {loading && <div className="msg a"><div className="dots"><span>·</span><span>·</span><span>·</span></div></div>}
            <div ref={bottomRef} />
          </div>
          <div className="chat-in">
            <input placeholder="Your thoughts..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} disabled={loading} autoFocus />
            <button className="btn btn-p" onClick={send} disabled={loading}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CEO TAB
// ─────────────────────────────────────────────
function CEOTab({ tasks }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, loading]);

  const done = tasks.filter(t => t.status === 'Done');
  const open = tasks.filter(t => t.status !== 'Done' && t.status !== 'Archived');
  const ff = tasks.filter(t => t.finishFirst && t.status !== 'Done');
  const ov = tasks.filter(t => urgency(t) === 'Overdue' && t.status !== 'Done');

  const sys = `${PROFILE}

You are running Tiffany's Weekly Mini CEO session. You are her strategic advisor and second brain.

This week's data:
- Done: ${done.length} tasks
- Open: ${open.length} (${open.slice(0, 4).map(t => t.title).filter(Boolean).join(', ') || 'none named yet'})
- Overdue: ${ov.length > 0 ? ov.map(t => t.title).slice(0, 3).join(', ') : 'none'}
- Finish First queue: ${ff.length > 0 ? ff.map(t => t.title).join(', ') : 'empty'}

Run the session in 4 parts: 1) Content performance — what posted, hook quality, what's dying in drafts 2) Finish First audit — what's open and must close 3) Priorities for next week 4) Energy read — what drained her, what gave energy, one avoided decision

Direct, strategic, personal. Reference her brand (Vixens N Darlings), content series (@tunedinwithtiff), and rules. One question at a time. 2–4 sentences per response.`;

  const start = async () => {
    setStarted(true); setLoading(true);
    try { const r = await callClaude([], sys); setMsgs([{ role: 'assistant', content: r }]); }
    catch { setMsgs([{ role: 'assistant', content: "CEO session. First: what content actually went out this week and how did it land?" }]); }
    setLoading(false);
  };
  const send = async () => {
    if (!input.trim() || loading) return;
    const um = { role: 'user', content: input.trim() };
    const next = [...msgs, um]; setMsgs(next); setInput(''); setLoading(true);
    try { const r = await callClaude(next, sys); setMsgs(p => [...p, { role: 'assistant', content: r }]); }
    catch { setMsgs(p => [...p, { role: 'assistant', content: 'Keep going.' }]); }
    setLoading(false);
  };

  if (!started) return (
    <div className="start-c">
      <div className="start-t">Weekly Mini CEO</div>
      <div className="start-s">Content performance. Open loops. Next week. Energy read. Claude knows your full profile and this week's data.</div>
      <button className="btn btn-p" style={{ fontSize: 15, padding: '12px 30px' }} onClick={start}>Begin CEO Session</button>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ fontFamily: 'Libre Baskerville,serif', fontSize: 20, fontWeight: 700 }}>Weekly Mini CEO</div>
        <button className="btn btn-g" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => { setStarted(false); setMsgs([]); }}>Reset</button>
      </div>
      <div className="chat-wrap">
        <div className="chat-msgs">
          {msgs.map((m, i) => <div key={i} className={`msg ${m.role === 'user' ? 'u' : 'a'}`}>{m.content}</div>)}
          {loading && <div className="msg a"><div className="dots"><span>·</span><span>·</span><span>·</span></div></div>}
          <div ref={bottomRef} />
        </div>
        <div className="chat-in">
          <input placeholder="Your answer..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} disabled={loading} autoFocus />
          <button className="btn btn-p" onClick={send} disabled={loading}>Send</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// BRAIN TAB
// ─────────────────────────────────────────────
const PROMPTS = [
  "What should I actually focus on today?",
  "Help me write a hook for a Mentor Minutes video",
  "I'm spiraling — help me think through this",
  "Help me crack the Vixens N Darlings pain point for investors",
  "Talk me through the Pinky Promise Club idea",
  "What content am I closest to finishing?",
  "Help me figure out my next career move after graduation",
  "I need a 10-minute reset — what should I do?",
];

function BrainTab({ tasks }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, loading]);

  const open = tasks.filter(t => t.status !== 'Done' && t.status !== 'Archived');
  const ff = tasks.filter(t => t.finishFirst && t.status !== 'Done');

  const sys = `${PROFILE}

You are Tiffany's second brain. You have full context on her life, brand, goals, struggles, and rules.

Current task snapshot: ${open.length} open tasks. Finish First queue: ${ff.length > 0 ? ff.map(t => t.title).join(', ') : 'empty'}.

Help her think through anything — decisions, spirals, content strategy, brand positioning, career path, relationships, money, wellness. Be direct, personal, grounded. You know her. No generic advice. When she's spiraling, name what's real and give her a concrete next action.`;

  const send = async (msg) => {
    const text = msg || input.trim();
    if (!text || loading) return;
    const um = { role: 'user', content: text };
    const next = [...msgs, um]; setMsgs(next); setInput(''); setLoading(true);
    try { const r = await callClaude(next, sys); setMsgs(p => [...p, { role: 'assistant', content: r }]); }
    catch { setMsgs(p => [...p, { role: 'assistant', content: 'Something went wrong — try again.' }]); }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: 'Libre Baskerville,serif', fontSize: 20, fontWeight: 700, marginBottom: 3 }}>Your Second Brain</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Ask anything. Thinks, spirals, decisions, content, brand, career — all of it.</div>
      </div>
      {msgs.length === 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="sl" style={{ marginTop: 0 }}>Try asking...</div>
          {PROMPTS.map((q, i) => <button key={i} className="q-btn" onClick={() => send(q)}>{q}</button>)}
        </div>
      )}
      {msgs.length > 0 && (
        <div className="chat-wrap" style={{ marginBottom: 10 }}>
          <div className="chat-msgs">
            {msgs.map((m, i) => <div key={i} className={`msg ${m.role === 'user' ? 'u' : 'a'}`}>{m.content}</div>)}
            {loading && <div className="msg a"><div className="dots"><span>·</span><span>·</span><span>·</span></div></div>}
            <div ref={bottomRef} />
          </div>
          <div className="chat-in">
            <input placeholder="Ask your second brain anything..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} disabled={loading} autoFocus />
            <button className="btn btn-p" onClick={() => send()} disabled={loading || !input.trim()}>Send</button>
          </div>
        </div>
      )}
      {msgs.length === 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <input placeholder="Or type your own question..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} disabled={loading} />
          <button className="btn btn-p" onClick={() => send()} disabled={loading || !input.trim()} style={{ flexShrink: 0 }}>Send</button>
        </div>
      )}
      {msgs.length > 0 && <button className="btn btn-g" style={{ fontSize: 12, padding: '4px 10px', marginTop: 8 }} onClick={() => setMsgs([])}>Clear chat</button>}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
export default function SecondBrain() {
  const [tab, setTab] = useState('today');
  const [tasks, setTasks] = useState(null);
  const [wellnessLog, setWellnessLog] = useState({});

  useEffect(() => {
    setTasks(load('tff_tasks', []));
    setWellnessLog(load('tff_wellness', {}));
  }, []);

  useEffect(() => { if (tasks !== null) save('tff_tasks', tasks); }, [tasks]);
  useEffect(() => { save('tff_wellness', wellnessLog); }, [wellnessLog]);

  const addTask = t => setTasks(p => [t, ...p]);
  const doneTask = id => setTasks(p => p.map(t => t.id === id ? { ...t, status: t.status === 'Done' ? 'Inbox' : 'Done' } : t));
  const flagTask = id => setTasks(p => p.map(t => t.id === id ? { ...t, finishFirst: !t.finishFirst } : t));
  const delTask = id => setTasks(p => p.filter(t => t.id !== id));

  const todayKey = new Date().toISOString().split('T')[0];
  const todayWellness = wellnessLog[todayKey] || {};
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const TABS = [
    { id: 'today', label: 'Today' },
    { id: 'capture', label: 'Capture' },
    { id: 'wellness', label: 'Wellness' },
    { id: 'nightly', label: 'Nightly' },
    { id: 'ceo', label: 'Mini CEO' },
    { id: 'brain', label: 'Brain' },
  ];

  if (tasks === null) return (
    <>
      <style>{CSS}</style>
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)', fontFamily: 'Karla,sans-serif' }}>Loading your second brain...</div>
    </>
  );

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <div className="hdr">
          <div className="hdr-name">Tiffany</div>
          <div className="hdr-sub" style={{ marginLeft: 4 }}>Second Brain</div>
          <div className="hdr-date">{today}</div>
        </div>
        <nav className="nav">
          {TABS.map(t => (
            <button key={t.id} className={`nb ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </nav>
        <div className="body">
          {tab === 'today' && <TodayTab tasks={tasks} onDone={doneTask} onFlag={flagTask} onDelete={delTask} />}
          {tab === 'capture' && <CaptureTab onAddTask={addTask} />}
          {tab === 'wellness' && <WellnessTab today={todayWellness} onSave={w => setWellnessLog(p => ({ ...p, [todayKey]: w }))} log={wellnessLog} />}
          {tab === 'nightly' && <NightlyTab tasks={tasks} wellness={todayWellness} />}
          {tab === 'ceo' && <CEOTab tasks={tasks} />}
          {tab === 'brain' && <BrainTab tasks={tasks} />}
        </div>
      </div>
    </>
  );
}
