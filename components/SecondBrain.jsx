'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const T = {
  bg:"#0F0D0C", surface:"#161210", card:"#1C1815", border:"#272220",
  borderLight:"#333028", gold:"#C4955A", wine:"#8B3A52",
  cream:"#F0E8DC", muted:"#8A8078", mutedLight:"#B8AFA5",
  green:"#5A7A62", blue:"#4A6B8A", purple:"#6A5A8A",
};

const BUCKETS = [
  {id:"mentor_minutes",label:"Mentor Minutes",emoji:"🎓",color:T.gold,notionType:"Mentor Minutes"},
  {id:"practice_preach",label:"Practice > Preach",emoji:"⚡",color:"#D4A060",notionType:"Brand Story"},
  {id:"respectfully_no",label:"Respectfully No",emoji:"🛑",color:T.wine,notionType:"Personal"},
  {id:"gym_healing",label:"Healing w/ Food",emoji:"🥗",color:T.green,notionType:"Educational"},
  {id:"gym_workouts",label:"Workout Journey",emoji:"💪",color:"#6A9A72",notionType:"Educational"},
  {id:"skincare_science",label:"Science of Skin",emoji:"🧪",color:T.blue,notionType:"Educational"},
  {id:"substack",label:"Substack Rewinds",emoji:"📚",color:T.purple,notionType:"Educational"},
];

const HUBS = [
  {id:"dashboard",label:"Command Center",icon:"⚡"},
  {id:"content",label:"Content",icon:"📱"},
  {id:"brand",label:"Vixens N Darlings",icon:"👗"},
  {id:"college",label:"College + Future",icon:"🎓"},
  {id:"science",label:"Science",icon:"🔬"},
  {id:"ai",label:"AI Lab",icon:"🤖"},
];

const AREAS = ["YPO","Brand","School","Personal","Café","Insurance"];
const PRIORITIES = ["High","Medium","Low"];
const PRIORITY_COLORS = {High:T.wine, Medium:T.gold, Low:T.muted};
const AREA_COLORS = {YPO:T.blue,Brand:T.wine,School:T.purple,Personal:T.green,Café:"#A0734A",Insurance:T.muted};
const CONTENT_STATUSES = ["Idea","Drafting","Ready to Post","Posted"];
const STATUS_COLORS = {Idea:T.muted,Drafting:T.gold,"Ready to Post":T.green,Posted:T.blue};

// ── STORAGE ──────────────────────────────────────────────────────────────────
const store = {
  async get(k){try{const r=await window.storage.get(k);return r?JSON.parse(r.value):null}catch{return null}},
  async set(k,v){try{await window.storage.set(k,JSON.stringify(v))}catch{}},
};

// ── NOTION API ────────────────────────────────────────────────────────────────
const notion = {
  async getAll() {
    try {
      const r = await fetch("/api/notion?type=all");
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  },
  async createTask(title, priority, area) {
    try {
      const r = await fetch("/api/notion", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({type:"task", title, priority, area})
      });
      const d = await r.json();
      return d.task || null;
    } catch { return null; }
  },
  async createContent(title, hook, notes, contentType) {
    try {
      const r = await fetch("/api/notion", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({type:"content", title, hook, notes, contentType})
      });
      const d = await r.json();
      return d.content || null;
    } catch { return null; }
  },
  async updateTask(pageId, status) {
    try {
      await fetch("/api/notion", {
        method:"PATCH", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({type:"task", pageId, status})
      });
    } catch {}
  },
  async updateContent(pageId, status) {
    try {
      await fetch("/api/notion", {
        method:"PATCH", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({type:"content", pageId, status})
      });
    } catch {}
  },
};

// ── CLAUDE API ────────────────────────────────────────────────────────────────
const SYSTEM = `You are Tiff's creative content partner and personal AI. Tiff is a college senior at ASU, admitted to Thunderbird Global MBA, law school waitlist — figuring it out in real time.
Building @tunedinwithtiff: Mentor Minutes (career wisdom), Practice>Preach (living what she preaches), Respectfully No (boundaries, for women told to shrink). Best content: unscripted — real, raw.
Also @gym (healing with food, workouts) and @education (skincare science, substack rewinds).
Building Vixens N Darlings: empowerment marketplace — vision still forming.
Brand voice: big sister who has their shit together but secretly doesn't. Direct. Warm. Witty. Never preachy.
The fork in the road IS content. The not-knowing IS content.`;

async function askClaude(msg, history=[], maxTokens=1200){
  const r = await fetch("/api/claude",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({system:SYSTEM,messages:[...history,{role:"user",content:msg}],max_tokens:maxTokens})
  });
  const d = await r.json();
  return d.content?.[0]?.text||"Something went wrong.";
}

// ── UI ATOMS ──────────────────────────────────────────────────────────────────
function Card({children,style,onClick,accent}){
  const [h,sH]=useState(false);
  return <div onClick={onClick} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)}
    style={{background:T.card,border:`1px solid ${h&&onClick?T.gold:accent||T.border}`,
      borderRadius:14,padding:"18px 20px",cursor:onClick?"pointer":"default",transition:"all .2s",...style}}>{children}</div>;
}

function Btn({children,onClick,variant="primary",style,disabled,sm}){
  const v={
    primary:{bg:T.gold,color:"#0F0D0C"},ghost:{bg:"transparent",color:T.muted,border:`1px solid ${T.border}`},
    wine:{bg:T.wine,color:T.cream},soft:{bg:T.surface,color:T.mutedLight,border:`1px solid ${T.border}`},
    danger:{bg:"#5A2020",color:"#FFAAAA"},green:{bg:"#2A4A2E",color:"#8ABA90",border:`1px solid #3A6A3E`},
  }[variant];
  return <button onClick={onClick} disabled={disabled} style={{background:v.bg,color:v.color,
    border:v.border||"none",borderRadius:8,padding:sm?"4px 10px":"8px 16px",fontSize:sm?11:13,
    fontFamily:"'DM Sans',sans-serif",fontWeight:500,cursor:disabled?"not-allowed":"pointer",
    opacity:disabled?.45:1,transition:"all .15s",whiteSpace:"nowrap",...style}}>{children}</button>;
}

function Inp({value,onChange,placeholder,style,multi,rows=3,onKeyDown}){
  const base={background:T.surface,border:`1px solid ${T.border}`,borderRadius:9,color:T.cream,
    fontFamily:"'DM Sans',sans-serif",fontSize:13,padding:"9px 13px",outline:"none",
    width:"100%",transition:"border-color .15s",lineHeight:1.6,...style};
  const h={onFocus:e=>e.currentTarget.style.borderColor=T.gold,
    onBlur:e=>e.currentTarget.style.borderColor=T.border,onKeyDown};
  return multi
    ?<textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} style={base} {...h}/>
    :<input value={value} onChange={onChange} placeholder={placeholder} style={base} {...h}/>;
}

function Tag({label,color,small}){
  return <span style={{display:"inline-flex",alignItems:"center",background:`${color}22`,color,
    border:`1px solid ${color}44`,borderRadius:20,padding:small?"2px 8px":"3px 10px",
    fontSize:small?10:11,fontWeight:500}}>{label}</span>;
}

function SubNav({items,active,set}){
  return <div style={{display:"flex",gap:4,marginBottom:22,flexWrap:"wrap"}}>
    {items.map(i=><button key={i.id} onClick={()=>set(i.id)} style={{
      background:active===i.id?T.gold:"transparent",color:active===i.id?"#0F0D0C":T.muted,
      border:`1px solid ${active===i.id?T.gold:T.border}`,borderRadius:7,padding:"5px 13px",
      fontSize:12,fontFamily:"'Syne',sans-serif",fontWeight:600,cursor:"pointer",
      transition:"all .15s",letterSpacing:".02em"}}>{i.label}</button>)}
  </div>;
}

function BucketPill({id,selected,onClick}){
  const b=BUCKETS.find(x=>x.id===id)||BUCKETS[0];
  return <button onClick={onClick} style={{background:selected?`${b.color}22`:"transparent",
    color:selected?b.color:T.muted,border:`1px solid ${selected?b.color+"66":T.border}`,
    borderRadius:20,padding:"3px 11px",fontSize:11,fontFamily:"'DM Sans',sans-serif",
    cursor:"pointer",transition:"all .15s",fontWeight:selected?500:400}}>{b.emoji} {b.label}</button>;
}

function BucketBar({bucket,set}){
  return <div style={{display:"flex",gap:5,marginBottom:18,flexWrap:"wrap"}}>
    {BUCKETS.map(b=><BucketPill key={b.id} id={b.id} selected={bucket===b.id} onClick={()=>set(b.id)}/>)}
  </div>;
}

function Heading({children}){
  return <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,color:T.cream,marginBottom:20}}>{children}</div>;
}

function NotionBadge({url}){
  if(!url) return null;
  return <a href={url} target="_blank" rel="noopener" onClick={e=>e.stopPropagation()}
    style={{fontSize:9,color:T.muted,textDecoration:"none",fontFamily:"'Syne',sans-serif",
      letterSpacing:".06em",border:`1px solid ${T.border}`,borderRadius:4,padding:"1px 5px",
      flexShrink:0}}>N↗</a>;
}

function SyncPill({syncing,lastSync,error,onSync}){
  return <button onClick={onSync} disabled={syncing} style={{display:"flex",alignItems:"center",
    gap:5,background:"transparent",border:`1px solid ${error?T.wine:T.border}`,borderRadius:20,
    padding:"3px 10px",color:error?T.wine:T.muted,fontSize:10,cursor:syncing?"default":"pointer",
    fontFamily:"'DM Sans',sans-serif",transition:"all .2s"}}>
    <span style={{fontSize:10,animation:syncing?"spin .8s linear infinite":"none"}}>
      {syncing?"⟳":error?"⚠":"✓"}
    </span>
    {syncing?"Syncing...":error?"Sync error":lastSync?`Synced ${lastSync}`:"Sync Notion"}
  </button>;
}

// ── TASK ROW ──────────────────────────────────────────────────────────────────
function TaskRow({task,onToggle}){
  const [hov,sH]=useState(false);
  return <div onClick={onToggle}
    style={{display:"flex",alignItems:"flex-start",gap:9,padding:"9px 6px",borderRadius:7,
      cursor:"pointer",borderBottom:`1px solid ${T.border}`,
      background:hov?T.surface:"transparent",transition:"background .1s"}}
    onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)}>
    <div style={{width:15,height:15,borderRadius:4,marginTop:2,flexShrink:0,transition:"all .15s",
      border:`2px solid ${task.done?T.green:PRIORITY_COLORS[task.priority]||T.borderLight}`,
      background:task.done?T.green:"transparent"}}/>
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:13,color:task.done?T.muted:T.cream,
        textDecoration:task.done?"line-through":"none",
        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task.title}</div>
      <div style={{display:"flex",gap:5,marginTop:3,alignItems:"center",flexWrap:"wrap"}}>
        {task.area&&<Tag label={task.area} color={AREA_COLORS[task.area]||T.muted} small/>}
        {task.priority&&task.priority!=="Medium"&&<Tag label={task.priority} color={PRIORITY_COLORS[task.priority]} small/>}
        {task.due&&<span style={{fontSize:10,color:T.muted}}>📅 {new Date(task.due+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>}
      </div>
    </div>
    <NotionBadge url={task.notionUrl}/>
  </div>;
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({tasks,toggleTask,openCapture,syncing,lastSync,syncError,onSync}){
  const [brief,setBrief]=useState(null);
  const [loading,setLoading]=useState(false);
  const today=new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});

  useEffect(()=>{store.get("brief").then(b=>{if(b?.date===today)setBrief(b.text)});},[]);

  const gen=async()=>{
    setLoading(true);
    const pending=tasks.filter(t=>!t.done).slice(0,6)
      .map(t=>`${t.title}${t.area?` [${t.area}]`:""}${t.priority==="High"?" 🔴":""}`).join(", ")||"nothing queued";
    try{
      const txt=await askClaude(
        `Generate Tiff's morning brief for ${today}. Under 260 words, punchy, big sister energy.\n\nFormat exactly:\n☀️ GOOD MORNING, TIFF\n[2 sentences — energizing]\n\n📋 YOUR FOCUS TODAY\nOpen tasks: ${pending}. Prioritized view.\n\n📱 TRENDING CONTENT ANGLES\n• [Career/empowerment angle]\n• [Current event tie-in]\n• [Vixens N Darlings angle]\n\n💡 HOOK OF THE DAY\n[One hook + which bucket]\n\n🔥 REMINDER\n[1 line. Her voice.]`,[]);
      setBrief(txt);store.set("brief",{text:txt,date:today});
    }catch{setBrief("Couldn't load — try again.");}
    setLoading(false);
  };

  const pending=tasks.filter(t=>!t.done);
  const done=tasks.filter(t=>t.done);
  const high=pending.filter(t=>t.priority==="High");
  const rest=pending.filter(t=>t.priority!=="High");

  return <div style={{display:"flex",gap:20}}>
    <div style={{flex:1,display:"flex",flexDirection:"column",gap:18}}>
      <Card accent={T.gold+"33"}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,color:T.cream,lineHeight:1}}>{today}</div>
            <div style={{fontSize:10,color:T.muted,marginTop:3,fontFamily:"'Syne',sans-serif",letterSpacing:".08em"}}>MORNING BRIEF</div>
          </div>
          <Btn onClick={gen} disabled={loading}>{loading?"Brewing...":brief?"↺ Refresh":"✨ Generate"}</Btn>
        </div>
        {brief
          ?<div style={{fontSize:13,color:T.mutedLight,lineHeight:1.8,whiteSpace:"pre-line"}}>{brief}</div>
          :<div style={{textAlign:"center",padding:"24px 0",color:T.muted}}>
            <div style={{fontSize:32,marginBottom:8}}>☀️</div>
            <div style={{fontSize:13}}>Generate your daily brief — trends, priorities, a hook.</div>
          </div>}
      </Card>
      <Card>
        <div style={{fontSize:10,color:T.muted,fontFamily:"'Syne',sans-serif",letterSpacing:".1em",marginBottom:12}}>QUICK CAPTURE</div>
        <div style={{display:"flex",gap:8}}>
          <Btn onClick={()=>openCapture("task")} style={{flex:1}}>+ Task</Btn>
          <Btn onClick={()=>openCapture("content")} variant="wine" style={{flex:1}}>+ Content Idea</Btn>
          <Btn onClick={()=>openCapture("note")} variant="ghost" style={{flex:1}}>+ Note</Btn>
        </div>
      </Card>
    </div>

    <div style={{width:320,flexShrink:0}}>
      <Card style={{height:"100%"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:T.cream}}>Today's Focus</div>
          <span style={{fontSize:11,color:T.muted}}>{pending.length} open</span>
        </div>
        <div style={{marginBottom:14}}>
          <SyncPill syncing={syncing} lastSync={lastSync} error={syncError} onSync={onSync}/>
        </div>
        {pending.length===0
          ?<div style={{textAlign:"center",padding:"24px 0",color:T.muted,fontSize:13}}>Clear queue — take the win.</div>
          :<div style={{display:"flex",flexDirection:"column",gap:1,maxHeight:430,overflowY:"auto"}}>
            {high.length>0&&<div style={{fontSize:9,color:T.wine,fontFamily:"'Syne',sans-serif",letterSpacing:".1em",padding:"5px 6px 2px"}}>🔴 HIGH PRIORITY</div>}
            {high.map(t=><TaskRow key={t.id} task={t} onToggle={()=>toggleTask(t.id)}/>)}
            {rest.length>0&&high.length>0&&<div style={{fontSize:9,color:T.muted,fontFamily:"'Syne',sans-serif",letterSpacing:".1em",padding:"7px 6px 2px"}}>OTHER</div>}
            {rest.map(t=><TaskRow key={t.id} task={t} onToggle={()=>toggleTask(t.id)}/>)}
          </div>}
        {done.length>0&&<div style={{marginTop:10,fontSize:11,color:T.green}}>✓ {done.length} done today</div>}
        <Btn onClick={()=>openCapture("task")} variant="soft" style={{width:"100%",marginTop:12}}>+ Add Task</Btn>
      </Card>
    </div>
  </div>;
}

// ── CONTENT HUB ───────────────────────────────────────────────────────────────
function ContentHub({contentItems,setContentItems,onSyncContent}){
  const [sub,setSub]=useState("iterate");
  const [bucket,setBucket]=useState("mentor_minutes");
  const [chat,setChat]=useState([]);
  const [chatIn,setChatIn]=useState("");
  const [chatLoading,setChatLoading]=useState(false);
  const [working,setWorking]=useState({works:"",doesnt:"",metrics:""});
  const [scraperIn,setScraperIn]=useState("");
  const [scraperOut,setScraperOut]=useState("");
  const [scraperLoading,setScraperLoading]=useState(false);
  const chatRef=useRef(null);
  const B=BUCKETS.find(b=>b.id===bucket);

  useEffect(()=>{
    Promise.all([store.get("c_working"),store.get("c_chat")])
      .then(([w,c])=>{if(w)setWorking(w);if(c)setChat(c)});
  },[]);
  useEffect(()=>{store.set("c_working",working)},[working]);
  useEffect(()=>{chatRef.current?.scrollIntoView({behavior:"smooth"})},[chat]);

  const sendChat=async()=>{
    if(!chatIn.trim()||chatLoading)return;
    const msg=chatIn;setChatIn("");setChatLoading(true);
    const next=[...chat,{role:"user",content:msg}];setChat(next);
    try{
      const res=await askClaude(`Bucket context: ${B?.label}. ${msg}`,chat.slice(-10));
      const final=[...next,{role:"assistant",content:res}];
      setChat(final);store.set("c_chat",final);
    }catch{setChat(p=>[...p,{role:"assistant",content:"Ran into an issue — try again."}])}
    setChatLoading(false);
  };

  const scrape=async()=>{
    if(!scraperIn.trim())return;setScraperLoading(true);
    try{
      const res=await askClaude(`Extract content ideas from this for Tiff's specific buckets.
Give: 1) Core insight 2) 3 hooks in her voice 3) Which bucket(s) and why 4) One specific video angle.
Source: ${scraperIn}`,[]);
      setScraperOut(res);
    }catch{setScraperOut("Couldn't process — try again.")}
    setScraperLoading(false);
  };

  const SUBS=[
    {id:"iterate",label:"✨ Iterate w/ AI"},
    {id:"pipeline",label:"📋 Content Pipeline"},
    {id:"working",label:"📊 What's Working"},
    {id:"extractor",label:"🎬 Extractor"},
    {id:"dataDoc",label:"📋 Data Doc"},
  ];

  // Content pipeline — shows Notion Content Bank items
  const bucketItems = contentItems.filter(i => {
    const b = BUCKETS.find(b=>b.id===bucket);
    return !b?.notionType || i.type===b.notionType || !i.type;
  });

  if(sub==="pipeline") return <div>
    <SubNav items={SUBS} active={sub} set={setSub}/>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <BucketBar bucket={bucket} set={setBucket}/>
      <div style={{display:"flex",gap:8,flexShrink:0}}>
        <Btn onClick={onSyncContent} variant="soft" sm>↺ Sync Notion</Btn>
      </div>
    </div>
    {/* Status columns */}
    <div style={{display:"flex",gap:14,overflowX:"auto",paddingBottom:8}}>
      {CONTENT_STATUSES.filter(s=>s!=="Posted").map(status=>{
        const col=contentItems.filter(i=>i.status===status);
        return <div key={status} style={{minWidth:240,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:STATUS_COLORS[status]}}/>
            <span style={{fontSize:11,color:T.mutedLight,fontFamily:"'Syne',sans-serif",letterSpacing:".06em",fontWeight:600}}>{status.toUpperCase()}</span>
            <span style={{fontSize:10,color:T.muted}}>({col.length})</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {col.map(item=><Card key={item.id} style={{padding:"12px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:6}}>
                <div style={{fontSize:13,color:T.cream,fontWeight:500,lineHeight:1.3,flex:1}}>{item.title}</div>
                <NotionBadge url={item.notionUrl}/>
              </div>
              {item.hook&&<div style={{fontSize:11,color:T.gold,marginTop:5,fontStyle:"italic"}}>"{item.hook}"</div>}
              {item.type&&<div style={{marginTop:6}}><Tag label={item.type} color={T.blue} small/></div>}
              <div style={{display:"flex",gap:5,marginTop:8}}>
                {status!=="Ready to Post"&&<Btn sm variant="soft" onClick={()=>{
                  const next=CONTENT_STATUSES[CONTENT_STATUSES.indexOf(status)+1];
                  if(next){
                    setContentItems(p=>p.map(i=>i.id===item.id?{...i,status:next}:i));
                    notion.updateContent(item.id,next);
                  }
                }}>→ {CONTENT_STATUSES[CONTENT_STATUSES.indexOf(status)+1]}</Btn>}
              </div>
            </Card>)}
            {col.length===0&&<div style={{padding:"16px 0",textAlign:"center",color:T.muted,fontSize:12}}>Empty</div>}
          </div>
        </div>;
      })}
    </div>
  </div>;

  if(sub==="iterate") return <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 180px)"}}>
    <SubNav items={SUBS} active={sub} set={setSub}/>
    <BucketBar bucket={bucket} set={setBucket}/>
    <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:8,paddingBottom:4}}>
      {chat.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:T.muted}}>
        <div style={{fontSize:34,marginBottom:10}}>✨</div>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:T.cream,marginBottom:5}}>Your AI Content Partner</div>
        <div style={{fontSize:13,marginBottom:18}}>Pitch ideas, get hooks, iterate scripts — I know your brand.</div>
        <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap",maxWidth:580,margin:"0 auto"}}>
          {["Give me 5 hooks for Mentor Minutes","Help me write a Respectfully No script",
            "What content can I make about not knowing my future?",
            "Turn this idea into a video: [paste idea]"].map(s=><button key={s} onClick={()=>setChatIn(s)}
            style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:20,padding:"5px 13px",
              color:T.muted,fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=T.gold;e.currentTarget.style.color=T.gold}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.muted}}
          >{s}</button>)}
        </div>
      </div>}
      {chat.map((m,i)=><div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
        <div style={{maxWidth:"72%",background:m.role==="user"?T.wine:T.card,
          border:`1px solid ${m.role==="user"?T.wine+"88":T.border}`,
          borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",
          padding:"11px 15px",fontSize:13,color:T.cream,lineHeight:1.7,whiteSpace:"pre-line"}}>{m.content}</div>
      </div>)}
      {chatLoading&&<div style={{display:"flex",gap:5,padding:14,alignItems:"center"}}>
        {[0,.2,.4].map(d=><span key={d} style={{width:6,height:6,borderRadius:"50%",background:T.gold,
          display:"inline-block",animation:`pulse 1.4s ease-in-out ${d}s infinite`}}/>)}
      </div>}
      <div ref={chatRef}/>
    </div>
    <div style={{display:"flex",gap:8,marginTop:10,alignItems:"flex-end"}}>
      <Inp value={chatIn} onChange={e=>setChatIn(e.target.value)}
        placeholder={`Working on ${B?.label}... pitch an idea, ask for hooks`}
        multi rows={2} style={{flex:1}}
        onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendChat()}}}/>
      <div style={{display:"flex",flexDirection:"column",gap:5}}>
        <Btn onClick={sendChat} disabled={chatLoading||!chatIn.trim()}>Send</Btn>
        {chat.length>0&&<Btn onClick={()=>{setChat([]);store.set("c_chat",[])}} variant="ghost" sm>Clear</Btn>}
      </div>
    </div>
  </div>;

  if(sub==="working") return <div>
    <SubNav items={SUBS} active={sub} set={setSub}/>
    <div style={{display:"flex",gap:18,marginBottom:16}}>
      <Card style={{flex:1}}>
        <div style={{fontSize:10,color:T.green,fontFamily:"'Syne',sans-serif",letterSpacing:".08em",marginBottom:9}}>✓ WHAT'S WORKING</div>
        <Inp value={working.works} onChange={e=>setWorking(p=>({...p,works:e.target.value}))} placeholder="Formats, hooks, topics landing..." multi rows={6}/>
      </Card>
      <Card style={{flex:1}}>
        <div style={{fontSize:10,color:T.wine,fontFamily:"'Syne',sans-serif",letterSpacing:".08em",marginBottom:9}}>✗ WHAT'S NOT</div>
        <Inp value={working.doesnt} onChange={e=>setWorking(p=>({...p,doesnt:e.target.value}))} placeholder="Honest log. No judgment." multi rows={6}/>
      </Card>
    </div>
    <Card>
      <div style={{fontSize:10,color:T.muted,fontFamily:"'Syne',sans-serif",letterSpacing:".08em",marginBottom:9}}>📊 METRICS</div>
      <Inp value={working.metrics} onChange={e=>setWorking(p=>({...p,metrics:e.target.value}))} placeholder="Views, follower growth, notes..." multi rows={4}/>
    </Card>
    <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}><Btn onClick={()=>store.set("c_working",working)}>Save</Btn></div>
  </div>;

  if(sub==="extractor") return <div>
    <SubNav items={SUBS} active={sub} set={setSub}/>
    <div style={{fontSize:13,color:T.mutedLight,marginBottom:14}}>Paste a transcript, article, or video description — Claude extracts ideas for your exact buckets.</div>
    <div style={{display:"flex",gap:18}}>
      <div style={{flex:1}}>
        <Inp value={scraperIn} onChange={e=>setScraperIn(e.target.value)} placeholder="Paste transcript, article, podcast notes..." multi rows={12}/>
        <Btn onClick={scrape} disabled={scraperLoading||!scraperIn.trim()} style={{marginTop:9,width:"100%"}}>
          {scraperLoading?"Extracting...":"🎬 Extract Content Ideas"}
        </Btn>
      </div>
      <div style={{flex:1}}>
        {scraperOut
          ?<Card style={{whiteSpace:"pre-line",fontSize:13,color:T.mutedLight,lineHeight:1.75,height:"100%"}}>{scraperOut}</Card>
          :<Card style={{display:"flex",alignItems:"center",justifyContent:"center",padding:48,height:"100%"}}>
            <div style={{color:T.muted,fontSize:13}}>Ideas will appear here</div></Card>}
      </div>
    </div>
  </div>;

  if(sub==="dataDoc") return <div><SubNav items={SUBS} active={sub} set={setSub}/><DataDoc/></div>;
  return <div><SubNav items={SUBS} active={sub} set={setSub}/></div>;
}

function DataDoc(){
  const [doc,setDoc]=useState({
    mission:"For women told to shrink — this is the big sister voice they needed.\n\nTiff Lavoie. College senior. Brand builder. Building in public.",
    voice:"Big sister who has their shit together but secretly doesn't.\nDirect. Warm. Witty. Never preachy.\n\n• \"Respectfully, no.\"\n• \"You were never too much. You were just in the wrong room.\"\n• \"Build in public. Stumble in public. Grow in public.\"",
    buckets:"🎓 Mentor Minutes\n⚡ Practice>Preach\n🛑 Respectfully No\n🥗 Healing w/ Food\n💪 Workout Journey\n🧪 Science of Skin\n📚 Substack Rewinds",
    confinements:"• Not toxic positivity\n• Unscripted converts better\n• Not giving advice she hasn't lived\n• Not hiding the uncertainty",
    audience:"Women told to shrink. Ambitious, emotional, building something.\nNeeds: permission, validation, tactical advice, a mirror.",
  });
  useEffect(()=>{store.get("data_doc").then(d=>{if(d)setDoc(d)})},[]);
  const S=[{key:"mission",label:"🎯 MISSION",rows:4},{key:"audience",label:"👥 AUDIENCE",rows:4},
    {key:"voice",label:"🎤 BRAND VOICE",rows:7},{key:"buckets",label:"🪣 BUCKETS",rows:7},
    {key:"confinements",label:"🚫 CONFINEMENTS",rows:4}];
  return <div>
    {S.map(s=><Card key={s.key} style={{marginBottom:12}}>
      <div style={{fontSize:10,color:T.gold,fontFamily:"'Syne',sans-serif",letterSpacing:".1em",marginBottom:8}}>{s.label}</div>
      <Inp value={doc[s.key]} onChange={e=>setDoc(p=>({...p,[s.key]:e.target.value}))} multi rows={s.rows}/>
    </Card>)}
    <div style={{display:"flex",justifyContent:"flex-end"}}><Btn onClick={()=>store.set("data_doc",doc)}>Save</Btn></div>
  </div>;
}

// ── BRAND HUB ─────────────────────────────────────────────────────────────────
function BrandHub(){
  const [sub,setSub]=useState("clarity");
  const [docs,setDocs]=useState({
    clarity:"## Where I'm Stuck\n\n## What I Know For Sure\n• Women's empowerment is the through-line\n\n## Possible Directions\n1. Clothing brand first\n2. Community/content first\n3. Platform-first: the forum IS the product\n\n## The Question I Need to Answer",
    bizPlan:"## Business Overview\n\n## Revenue Streams\n1. \n2. \n3. \n\n## Timeline\n- Now: \n- 6 months: \n- 1 year: ",
    marketing:"## Channels\n\n## Messaging\n\n## Launch Strategy",
    strategy:"## Differentiation\n\n## Key Partnerships\n\n## Competitive Landscape",
    files:"## Important Links & Files",
  });
  const [ai,setAI]=useState({q:"",a:"",loading:false});
  useEffect(()=>{store.get("brand_docs").then(d=>{if(d)setDocs(d)})},[]);
  const SUBS=[{id:"clarity",label:"🔍 Brand Clarity"},{id:"bizPlan",label:"📋 Biz Plan"},
    {id:"marketing",label:"📣 Marketing"},{id:"strategy",label:"♟️ Strategy"},
    {id:"files",label:"📁 Files"},{id:"aiHelper",label:"✨ AI Helper"}];
  const ask=async()=>{
    if(!ai.q.trim())return;setAI(p=>({...p,loading:true}));
    const res=await askClaude(`Help Tiff with Vixens N Darlings. Concrete steps, not vague inspiration. Push back if needed. Question: ${ai.q}`,[]);
    setAI(p=>({...p,a:res,loading:false}));
  };
  if(sub==="aiHelper") return <div>
    <SubNav items={SUBS} active={sub} set={setSub}/><Heading>Brand Strategy AI</Heading>
    <div style={{display:"flex",gap:18}}>
      <div style={{flex:1}}>
        <Inp value={ai.q} onChange={e=>setAI(p=>({...p,q:e.target.value}))} placeholder="Ask anything about VnD..." multi rows={8}/>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:9}}>
          <Btn onClick={ask} disabled={ai.loading||!ai.q.trim()}>{ai.loading?"Thinking...":"Ask"}</Btn>
        </div>
      </div>
      <div style={{flex:1}}>
        {ai.a?<Card style={{whiteSpace:"pre-line",fontSize:13,color:T.mutedLight,lineHeight:1.75}}>{ai.a}</Card>
          :<Card style={{display:"flex",alignItems:"center",justifyContent:"center",padding:48}}>
            <div style={{color:T.muted,fontSize:13,textAlign:"center"}}><div style={{fontSize:30,marginBottom:8}}>👗</div>Strategy, clarity, naming — ask anything.</div></Card>}
      </div>
    </div>
  </div>;
  return <div>
    <SubNav items={SUBS} active={sub} set={setSub}/><Heading>Vixens N Darlings</Heading>
    <Card>
      <div style={{fontSize:10,color:T.wine,fontFamily:"'Syne',sans-serif",letterSpacing:".1em",marginBottom:10}}>{SUBS.find(s=>s.id===sub)?.label}</div>
      <Inp value={docs[sub]||""} onChange={e=>setDocs(p=>({...p,[sub]:e.target.value}))} multi rows={16}/>
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}><Btn onClick={()=>store.set("brand_docs",docs)}>Save</Btn></div>
    </Card>
  </div>;
}

// ── COLLEGE HUB ───────────────────────────────────────────────────────────────
function CollegeHub(){
  const [sub,setSub]=useState("internships");
  const [lists,setLists]=useState({internships:[],scholarships:[],certs:[]});
  const [newItem,setNewItem]=useState({title:"",status:"Researching",deadline:""});
  const [decisions,setDecisions]=useState("## The Fork\n- Thunderbird Global MBA (admitted ✓)\n- Law school (waitlist)\n- Brand / Vixens N Darlings full-time\n\n## What matters most:\n\n## Pros/Cons:\n\n## Decide by:");
  useEffect(()=>{
    Promise.all([store.get("internships"),store.get("scholarships"),store.get("certs"),store.get("decisions")])
      .then(([i,s,c,d])=>{setLists({internships:i||[],scholarships:s||[],certs:c||[]});if(d)setDecisions(d)});
  },[]);
  const SM={internships:["Researching","Applied","Interview","Offer","Rejected"],
    scholarships:["Researching","Applied","Won","Rejected"],certs:["Planned","In Progress","Completed"]};
  const SC={Researching:T.muted,Applied:T.blue,Interview:T.gold,Offer:T.green,Won:T.green,Rejected:T.wine,"In Progress":T.gold,Planned:T.muted,Completed:T.green};
  const SUBS=[{id:"internships",label:"💼 Internships"},{id:"scholarships",label:"💰 Scholarships"},
    {id:"certs",label:"📜 Certs"},{id:"decisions",label:"🗺️ Post-Grad"}];
  const add=()=>{
    if(!newItem.title.trim())return;
    const item={id:Date.now(),...newItem,at:new Date().toISOString()};
    const updated={...lists,[sub]:[item,...lists[sub]]};setLists(updated);store.set(sub,updated[sub]);
    setNewItem({title:"",status:SM[sub][0],deadline:""});
  };
  if(sub==="decisions") return <div>
    <SubNav items={SUBS} active={sub} set={setSub}/><Heading>Post-Grad Decisions</Heading>
    <Card><Inp value={decisions} onChange={e=>setDecisions(e.target.value)} multi rows={16}/>
    <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}><Btn onClick={()=>store.set("decisions",decisions)}>Save</Btn></div></Card>
  </div>;
  const items=lists[sub]||[];
  return <div>
    <SubNav items={SUBS} active={sub} set={setSub}/><Heading>{SUBS.find(s=>s.id===sub)?.label}</Heading>
    <Card style={{marginBottom:14}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <Inp value={newItem.title} onChange={e=>setNewItem(p=>({...p,title:e.target.value}))} placeholder="Name..." style={{flex:"1 1 180px"}}/>
        <select value={newItem.status} onChange={e=>setNewItem(p=>({...p,status:e.target.value}))}
          style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,color:T.cream,
            padding:"9px 12px",fontFamily:"'DM Sans',sans-serif",fontSize:13,cursor:"pointer"}}>
          {(SM[sub]||[]).map(s=><option key={s}>{s}</option>)}
        </select>
        <Inp value={newItem.deadline} onChange={e=>setNewItem(p=>({...p,deadline:e.target.value}))} placeholder="Deadline" style={{flex:"1 1 120px"}}/>
        <Btn onClick={add}>Add</Btn>
      </div>
    </Card>
    {items.map(item=><Card key={item.id} style={{marginBottom:9,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{flex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{fontSize:14,color:T.cream}}>{item.title}</div>
          <Tag label={item.status} color={SC[item.status]||T.muted} small/>
        </div>
        {item.deadline&&<div style={{fontSize:11,color:T.muted,marginTop:3}}>📅 {item.deadline}</div>}
      </div>
      <Btn onClick={()=>{const u={...lists,[sub]:items.filter(x=>x.id!==item.id)};setLists(u);store.set(sub,u[sub])}} variant="danger" sm>✕</Btn>
    </Card>)}
    {items.length===0&&<div style={{textAlign:"center",padding:36,color:T.muted,fontSize:13}}>Nothing added yet.</div>}
  </div>;
}

// ── SCIENCE HUB ───────────────────────────────────────────────────────────────
function ScienceHub(){
  const [sub,setSub]=useState("skincare");
  const [notes,setNotes]=useState({skincare:"",nutrition:"",health:"",workouts:"",cycle:"",hair:""});
  const [ai,setAI]=useState({q:"",a:"",loading:false});
  useEffect(()=>{store.get("sci_notes").then(n=>{if(n)setNotes(n)})},[]);
  const SUBS=[{id:"skincare",label:"✨ Skincare"},{id:"nutrition",label:"🥗 Nutrition"},
    {id:"health",label:"💊 Health + Vitamins"},{id:"workouts",label:"💪 Workouts"},
    {id:"cycle",label:"🌙 Hormones + Cycle"},{id:"hair",label:"💇 Haircare"}];
  const ask=async()=>{
    if(!ai.q.trim())return;setAI(p=>({...p,loading:true}));
    const res=await askClaude(`Tiff asking about ${sub}. Give: 1) Science-backed answer 2) One content angle for her education account. Question: ${ai.q}`,[]);
    setAI(p=>({...p,a:res,loading:false}));
  };
  return <div>
    <SubNav items={SUBS} active={sub} set={setSub}/>
    <div style={{display:"flex",gap:18}}>
      <div style={{flex:1}}>
        <Heading>{SUBS.find(s=>s.id===sub)?.label} Notes</Heading>
        <Card>
          <Inp value={notes[sub]} onChange={e=>setNotes(p=>({...p,[sub]:e.target.value}))} placeholder={`Notes on ${sub}...`} multi rows={12}/>
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:9}}><Btn onClick={()=>store.set("sci_notes",notes)}>Save</Btn></div>
        </Card>
      </div>
      <div style={{width:320,flexShrink:0}}>
        <Heading>🔬 Ask the Science</Heading>
        <Card>
          <Inp value={ai.q} onChange={e=>setAI(p=>({...p,q:e.target.value}))} placeholder={`Ask anything about ${sub}...`} multi rows={4}/>
          <Btn onClick={ask} disabled={ai.loading||!ai.q.trim()} style={{marginTop:9,width:"100%"}}>{ai.loading?"Researching...":"Ask"}</Btn>
          {ai.a&&<div style={{marginTop:12,fontSize:12,color:T.mutedLight,lineHeight:1.75,whiteSpace:"pre-line"}}>{ai.a}</div>}
        </Card>
      </div>
    </div>
  </div>;
}

// ── AI HUB ────────────────────────────────────────────────────────────────────
function AIHub(){
  const [sub,setSub]=useState("prompts");
  const [items,setItems]=useState({prompts:[],ideas:[],workflows:[]});
  const [newItem,setNewItem]=useState({title:"",content:""});
  useEffect(()=>{store.get("ai_hub").then(d=>{if(d)setItems(d)})},[]);
  const SUBS=[{id:"prompts",label:"📝 Prompts"},{id:"ideas",label:"💡 AI Ideas"},{id:"workflows",label:"⚙️ Workflows"}];
  const add=()=>{
    if(!newItem.title.trim())return;
    const item={id:Date.now(),...newItem,at:new Date().toISOString()};
    const updated={...items,[sub]:[item,...items[sub]]};setItems(updated);store.set("ai_hub",updated);
    setNewItem({title:"",content:""});
  };
  return <div>
    <SubNav items={SUBS} active={sub} set={setSub}/><Heading>{SUBS.find(s=>s.id===sub)?.label}</Heading>
    <Card style={{marginBottom:14}}>
      <Inp value={newItem.title} onChange={e=>setNewItem(p=>({...p,title:e.target.value}))} placeholder="Name..." style={{marginBottom:7}}/>
      <Inp value={newItem.content} onChange={e=>setNewItem(p=>({...p,content:e.target.value}))} placeholder="Content, instructions, details..." multi rows={3}/>
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:9}}><Btn onClick={add}>Save</Btn></div>
    </Card>
    {items[sub].map(item=><Card key={item.id} style={{marginBottom:9}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{fontSize:14,color:T.cream,fontWeight:500,marginBottom:5}}>{item.title}</div>
        <Btn onClick={()=>{const updated={...items,[sub]:items[sub].filter(x=>x.id!==item.id)};setItems(updated);store.set("ai_hub",updated)}} variant="danger" sm>✕</Btn>
      </div>
      {item.content&&<div style={{fontSize:12,color:T.muted,lineHeight:1.6}}>{item.content}</div>}
    </Card>)}
    {items[sub].length===0&&<div style={{textAlign:"center",padding:36,color:T.muted,fontSize:13}}>Nothing saved yet.</div>}
  </div>;
}

// ── CAPTURE MODAL ─────────────────────────────────────────────────────────────
function CaptureModal({type,onClose,onSave,curHub}){
  const [text,setText]=useState("");
  const [hook,setHook]=useState("");
  const [priority,setPriority]=useState("Medium");
  const [area,setArea]=useState("");
  const [bucket,setBucket]=useState("mentor_minutes");
  const [hub,setHub]=useState(curHub||"dashboard");
  const [saving,setSaving]=useState(false);

  const save=async()=>{
    if(!text.trim()||saving)return;
    setSaving(true);
    await onSave({type,text,hook,priority,area:area||null,bucket,hub});
    setSaving(false);
    onClose();
  };

  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"#000000BB",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
    <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:16,padding:26,width:500,maxWidth:"90vw"}}>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:T.cream,marginBottom:16}}>
        {type==="task"?"New Task":type==="content"?"Content Idea":"Quick Note"}
      </div>
      <Inp value={text} onChange={e=>setText(e.target.value)}
        placeholder={type==="task"?"What needs to get done?":type==="content"?"Title or idea...":"Capture the thought..."}
        multi rows={2} style={{marginBottom:8}}/>

      {type==="content"&&<>
        <Inp value={hook} onChange={e=>setHook(e.target.value)} placeholder='Hook (optional): "POV: you just realized..."' style={{marginBottom:12}}/>
        <div style={{fontSize:10,color:T.muted,fontFamily:"'Syne',sans-serif",letterSpacing:".08em",marginBottom:6}}>BUCKET</div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:4}}>
          {BUCKETS.map(b=><BucketPill key={b.id} id={b.id} selected={bucket===b.id} onClick={()=>setBucket(b.id)}/>)}
        </div>
      </>}

      {type==="task"&&<>
        <div style={{display:"flex",gap:10,marginBottom:12}}>
          <div style={{flex:1}}>
            <div style={{fontSize:10,color:T.muted,fontFamily:"'Syne',sans-serif",letterSpacing:".08em",marginBottom:6}}>PRIORITY</div>
            <div style={{display:"flex",gap:5}}>
              {PRIORITIES.map(p=><button key={p} onClick={()=>setPriority(p)} style={{
                background:priority===p?`${PRIORITY_COLORS[p]}22`:"transparent",
                color:priority===p?PRIORITY_COLORS[p]:T.muted,
                border:`1px solid ${priority===p?PRIORITY_COLORS[p]+"66":T.border}`,
                borderRadius:20,padding:"3px 10px",fontSize:11,fontFamily:"'DM Sans',sans-serif",cursor:"pointer"
              }}>{p}</button>)}
            </div>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:10,color:T.muted,fontFamily:"'Syne',sans-serif",letterSpacing:".08em",marginBottom:6}}>AREA</div>
            <select value={area} onChange={e=>setArea(e.target.value)}
              style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,
                color:area?T.cream:T.muted,padding:"7px 10px",fontFamily:"'DM Sans',sans-serif",fontSize:12,width:"100%",cursor:"pointer"}}>
              <option value="">No area</option>
              {AREAS.map(a=><option key={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <div style={{fontSize:10,color:T.muted,fontFamily:"'Syne',sans-serif",letterSpacing:".08em",marginBottom:6}}>HUB</div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {HUBS.map(h=><button key={h.id} onClick={()=>setHub(h.id)} style={{
            background:hub===h.id?`${T.gold}22`:"transparent",color:hub===h.id?T.gold:T.muted,
            border:`1px solid ${hub===h.id?T.gold+"66":T.border}`,borderRadius:20,padding:"3px 11px",
            fontSize:11,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",transition:"all .15s"
          }}>{h.icon} {h.label}</button>)}
        </div>
      </>}

      <div style={{display:"flex",gap:8,marginTop:18,justifyContent:"flex-end"}}>
        <Btn onClick={onClose} variant="ghost">Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving?"Saving to Notion...":"Save"}</Btn>
      </div>
    </div>
  </div>;
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function SecondBrain(){
  const [hub,setHub]=useState("dashboard");
  const [tasks,setTasks]=useState([]);
  const [contentItems,setContentItems]=useState([]);
  const [capture,setCapture]=useState(null);
  const [collapsed,setCollapsed]=useState(false);
  const [syncing,setSyncing]=useState(false);
  const [lastSync,setLastSync]=useState(null);
  const [syncError,setSyncError]=useState(false);

  // Inject fonts + styles
  useEffect(()=>{
    if(!document.getElementById("brain-fonts")){
      const link=document.createElement("link");link.id="brain-fonts";link.rel="stylesheet";
      link.href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Syne:wght@400;500;600;700&family=DM+Sans:wght@300;400;500&display=swap";
      document.head.appendChild(link);
    }
    if(!document.getElementById("brain-styles")){
      const s=document.createElement("style");s.id="brain-styles";
      s.textContent=`*{box-sizing:border-box}body{background:#0F0D0C;margin:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#2e2824;border-radius:4px}textarea{resize:vertical}@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`;
      document.head.appendChild(s);
    }
  },[]);

  // Full sync from Notion
  const syncAll = useCallback(async()=>{
    setSyncing(true);setSyncError(false);
    const data = await notion.getAll();
    if(data){
      if(data.tasks) setTasks(data.tasks);
      if(data.content) setContentItems(data.content);
      setLastSync(new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}));
      // Cache locally
      if(data.tasks) store.set("tasks",data.tasks);
      if(data.content) store.set("content_items",data.content);
    } else {
      setSyncError(true);
      const [t,c]=await Promise.all([store.get("tasks"),store.get("content_items")]);
      if(t) setTasks(t);
      if(c) setContentItems(c);
    }
    setSyncing(false);
  },[]);

  // Sync content only (for content hub refresh button)
  const syncContent = useCallback(async()=>{
    try {
      const r = await fetch("/api/notion?type=content");
      if(r.ok){const d=await r.json();if(d.content){setContentItems(d.content);store.set("content_items",d.content);}}
    } catch {}
  },[]);

  useEffect(()=>{ syncAll(); },[syncAll]);

  const handleSave=async({type,text,hook,priority,area,bucket,hub:th})=>{
    if(type==="task"){
      const temp={id:`temp-${Date.now()}`,title:text,priority,area,hub:th,done:false,status:"To Do",source:"local"};
      setTasks(p=>[temp,...p]);
      const created=await notion.createTask(text,priority,area);
      if(created) setTasks(p=>p.map(t=>t.id===temp.id?{...created,hub:th}:t));
    } else if(type==="content"){
      const B=BUCKETS.find(b=>b.id===bucket);
      const temp={id:`temp-${Date.now()}`,title:text,hook,status:"Idea",type:B?.notionType||null,source:"local"};
      setContentItems(p=>[temp,...p]);
      const created=await notion.createContent(text,hook,"",B?.notionType||null);
      if(created) setContentItems(p=>p.map(i=>i.id===temp.id?created:i));
    }
  };

  const toggleTask=async(id)=>{
    const task=tasks.find(t=>t.id===id);if(!task)return;
    const newStatus=task.done?"To Do":"Done";
    setTasks(p=>p.map(t=>t.id===id?{...t,done:!t.done,status:newStatus}:t));
    if(!String(id).startsWith("temp-")) await notion.updateTask(id,newStatus);
  };

  const pending=tasks.filter(t=>!t.done).length;

  return <div style={{display:"flex",height:"100vh",background:T.bg,color:T.cream,fontFamily:"'DM Sans',sans-serif",overflow:"hidden"}}>
    {/* SIDEBAR */}
    <div style={{width:collapsed?58:210,background:T.surface,borderRight:`1px solid ${T.border}`,
      padding:collapsed?"24px 8px":"24px 12px",display:"flex",flexDirection:"column",
      transition:"width .22s ease",flexShrink:0,overflow:"hidden"}}>
      <div style={{marginBottom:24,display:"flex",alignItems:"center",justifyContent:collapsed?"center":"space-between",paddingLeft:collapsed?0:3}}>
        {!collapsed&&<div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,color:T.gold,letterSpacing:".02em"}}>Tiff's Brain</div>
          <div style={{fontSize:9,color:T.muted,marginTop:2,fontFamily:"'Syne',sans-serif",letterSpacing:".1em"}}>SECOND BRAIN v2</div>
        </div>}
        <button onClick={()=>setCollapsed(p=>!p)} style={{background:"transparent",border:"none",color:T.muted,cursor:"pointer",fontSize:14,padding:3,flexShrink:0}}>
          {collapsed?"→":"←"}
        </button>
      </div>
      {HUBS.map(h=><button key={h.id} onClick={()=>setHub(h.id)} style={{
        display:"flex",alignItems:"center",gap:collapsed?0:9,justifyContent:collapsed?"center":"flex-start",
        padding:collapsed?"9px 0":"8px 9px",borderRadius:8,marginBottom:2,width:"100%",
        background:hub===h.id?`${T.gold}18`:"transparent",
        border:hub===h.id?`1px solid ${T.gold}33`:"1px solid transparent",
        color:hub===h.id?T.gold:T.muted,fontSize:13,fontFamily:"'DM Sans',sans-serif",
        fontWeight:hub===h.id?500:400,cursor:"pointer",textAlign:"left",
        transition:"all .15s",overflow:"hidden",whiteSpace:"nowrap"
      }}><span style={{fontSize:15,flexShrink:0}}>{h.icon}</span>{!collapsed&&h.label}</button>)}
      {!collapsed&&<div style={{marginTop:"auto",paddingTop:14,borderTop:`1px solid ${T.border}`}}>
        <button onClick={()=>setCapture("task")} style={{width:"100%",background:`${T.gold}15`,
          border:`1px solid ${T.gold}33`,borderRadius:8,padding:"7px 9px",color:T.gold,
          fontSize:12,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",marginBottom:5}}>+ Quick Capture</button>
        <div style={{fontSize:11,color:T.muted,paddingLeft:3}}>{pending} task{pending!==1?"s":""} pending</div>
      </div>}
    </div>

    {/* MAIN */}
    <div style={{flex:1,overflow:"auto",padding:"28px 30px"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:32,color:T.cream,lineHeight:1}}>
            {HUBS.find(h=>h.id===hub)?.icon} {HUBS.find(h=>h.id===hub)?.label}
          </div>
          <div style={{display:"flex",gap:7}}>
            <Btn onClick={()=>setCapture("content")} variant="wine" sm>+ Content Idea</Btn>
            <Btn onClick={()=>setCapture("task")} variant="soft" sm>+ Task</Btn>
          </div>
        </div>
        {hub==="dashboard"&&<Dashboard tasks={tasks} toggleTask={toggleTask} openCapture={setCapture} syncing={syncing} lastSync={lastSync} syncError={syncError} onSync={syncAll}/>}
        {hub==="content"&&<ContentHub contentItems={contentItems} setContentItems={setContentItems} onSyncContent={syncContent}/>}
        {hub==="brand"&&<BrandHub/>}
        {hub==="college"&&<CollegeHub/>}
        {hub==="science"&&<ScienceHub/>}
        {hub==="ai"&&<AIHub/>}
      </div>
    </div>

    {capture&&<CaptureModal type={capture==="note"?"note":capture} onClose={()=>setCapture(null)} onSave={handleSave} curHub={hub}/>}
  </div>;
}
