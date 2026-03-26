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

const store = {
  async get(k){try{const r=await window.storage.get(k);return r?JSON.parse(r.value):null}catch{return null}},
  async set(k,v){try{await window.storage.set(k,JSON.stringify(v))}catch{}},
};

const notion = {
  async getAll(){try{const r=await fetch("/api/notion?type=all");if(!r.ok)return null;return await r.json()}catch{return null}},
  async createTask(title,priority,area){try{const r=await fetch("/api/notion",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"task",title,priority,area})});return(await r.json()).task||null}catch{return null}},
  async createContent(title,hook,notes,contentType){try{const r=await fetch("/api/notion",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"content",title,hook,notes,contentType})});return(await r.json()).content||null}catch{return null}},
  async updateTask(pageId,status){try{await fetch("/api/notion",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"task",pageId,status})})}catch{}},
  async updateContent(pageId,status){try{await fetch("/api/notion",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"content",pageId,status})})}catch{}},
};

async function fetchGCalEvents(){
  try{
    const now=new Date().toISOString();
    const future=new Date(Date.now()+60*24*60*60*1000).toISOString();
    const r=await fetch(`/api/gcal?timeMin=${now}&timeMax=${future}`);
    if(!r.ok)return[];
    const d=await r.json();
    return d.events||[];
  }catch{return[];}
}

const SYSTEM=`You are Tiff's creative content partner and personal AI. Tiff is a college senior at ASU, admitted to Thunderbird Global MBA, law school waitlist — figuring it out in real time. Building @tunedinwithtiff: Mentor Minutes, Practice>Preach, Respectfully No. Best content: unscripted. Also @gym and @education. Building Vixens N Darlings: empowerment marketplace. Brand voice: big sister who has their shit together but secretly doesn't. Direct. Warm. Witty. Never preachy.`;

async function askClaude(msg,history=[],maxTokens=1200){
  const r=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system:SYSTEM,messages:[...history,{role:"user",content:msg}],max_tokens:maxTokens})});
  const d=await r.json();return d.content?.[0]?.text||"Something went wrong.";
}

// ── UI ATOMS ──────────────────────────────────────────────────────────────────
function Card({children,style,onClick,accent}){
  const [h,sH]=useState(false);
  return <div onClick={onClick} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)}
    style={{background:T.card,border:`1px solid ${h&&onClick?T.gold:accent||T.border}`,borderRadius:14,
      padding:"18px 20px",cursor:onClick?"pointer":"default",transition:"all .2s",...style}}>{children}</div>;
}

function Btn({children,onClick,variant="primary",style,disabled,sm}){
  const v={primary:{bg:T.gold,color:"#0F0D0C"},ghost:{bg:"transparent",color:T.muted,border:`1px solid ${T.border}`},
    wine:{bg:T.wine,color:T.cream},soft:{bg:T.surface,color:T.mutedLight,border:`1px solid ${T.border}`},
    danger:{bg:"#5A2020",color:"#FFAAAA"},green:{bg:"#2A4A2E",color:"#8ABA90",border:`1px solid #3A6A3E`}}[variant];
  return <button onClick={onClick} disabled={disabled} style={{background:v.bg,color:v.color,border:v.border||"none",
    borderRadius:8,padding:sm?"4px 10px":"8px 16px",fontSize:sm?11:13,fontFamily:"'DM Sans',sans-serif",
    fontWeight:500,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.45:1,transition:"all .15s",whiteSpace:"nowrap",...style}}>{children}</button>;
}

function Inp({value,onChange,placeholder,style,multi,rows=3,onKeyDown}){
  const base={background:T.surface,border:`1px solid ${T.border}`,borderRadius:9,color:T.cream,
    fontFamily:"'DM Sans',sans-serif",fontSize:13,padding:"9px 13px",outline:"none",width:"100%",
    transition:"border-color .15s",lineHeight:1.6,...style};
  const h={onFocus:e=>e.currentTarget.style.borderColor=T.gold,onBlur:e=>e.currentTarget.style.borderColor=T.border,onKeyDown};
  return multi?<textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} style={base} {...h}/>
    :<input value={value} onChange={onChange} placeholder={placeholder} style={base} {...h}/>;
}

function Tag({label,color,small}){
  return <span style={{display:"inline-flex",alignItems:"center",background:`${color}22`,color,
    border:`1px solid ${color}44`,borderRadius:20,padding:small?"2px 8px":"3px 10px",fontSize:small?10:11,fontWeight:500}}>{label}</span>;
}

function SubNav({items,active,set}){
  return <div style={{display:"flex",gap:4,marginBottom:22,flexWrap:"wrap"}}>
    {items.map(i=><button key={i.id} onClick={()=>set(i.id)} style={{
      background:active===i.id?T.gold:"transparent",color:active===i.id?"#0F0D0C":T.muted,
      border:`1px solid ${active===i.id?T.gold:T.border}`,borderRadius:7,padding:"5px 13px",fontSize:12,
      fontFamily:"'Syne',sans-serif",fontWeight:600,cursor:"pointer",transition:"all .15s",letterSpacing:".02em"}}>{i.label}</button>)}
  </div>;
}

function BucketPill({id,selected,onClick}){
  const b=BUCKETS.find(x=>x.id===id)||BUCKETS[0];
  return <button onClick={onClick} style={{background:selected?`${b.color}22`:"transparent",color:selected?b.color:T.muted,
    border:`1px solid ${selected?b.color+"66":T.border}`,borderRadius:20,padding:"3px 11px",fontSize:11,
    fontFamily:"'DM Sans',sans-serif",cursor:"pointer",transition:"all .15s",fontWeight:selected?500:400}}>{b.emoji} {b.label}</button>;
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
  if(!url)return null;
  return <a href={url} target="_blank" rel="noopener" onClick={e=>e.stopPropagation()}
    style={{fontSize:9,color:T.muted,textDecoration:"none",fontFamily:"'Syne',sans-serif",
      letterSpacing:".06em",border:`1px solid ${T.border}`,borderRadius:4,padding:"1px 5px",flexShrink:0}}>N↗</a>;
}

function SyncPill({syncing,lastSync,error,onSync}){
  return <button onClick={onSync} disabled={syncing} style={{display:"flex",alignItems:"center",gap:5,
    background:"transparent",border:`1px solid ${error?T.wine:T.border}`,borderRadius:20,padding:"3px 10px",
    color:error?T.wine:T.muted,fontSize:10,cursor:syncing?"default":"pointer",fontFamily:"'DM Sans',sans-serif"}}>
    <span>{syncing?"⟳":error?"⚠":"✓"}</span>
    {syncing?"Syncing...":error?"Sync error":lastSync?`Synced ${lastSync}`:"Sync Notion"}
  </button>;
}

// ── CALENDAR ──────────────────────────────────────────────────────────────────
function CalendarView({tasks, contentItems, gcalEvents, onDayClick}){
  const [date,setDate]=useState(new Date());
  const [selected,setSelected]=useState(null);

  const year=date.getFullYear(), month=date.getMonth();
  const firstDay=new Date(year,month,1).getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const today=new Date();

  const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];

  const getDotsForDay=(d)=>{
    const dateStr=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const dots=[];
    // Tasks due
    tasks.filter(t=>!t.done&&t.due&&t.due.startsWith(dateStr)).forEach(t=>{
      dots.push({color:PRIORITY_COLORS[t.priority]||T.gold,type:"task",label:t.title,priority:t.priority});
    });
    // Content scheduled
    contentItems.filter(c=>c.postDate&&c.postDate.startsWith(dateStr)).forEach(c=>{
      dots.push({color:T.purple,type:"content",label:c.title});
    });
    // Google Cal events
    gcalEvents.filter(e=>{
      const eDate=e.start?.split("T")[0];
      return eDate===dateStr;
    }).forEach(e=>{
      dots.push({color:T.blue,type:"gcal",label:e.title});
    });
    return dots;
  };

  const getDayItems=(d)=>{
    const dateStr=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    return {
      tasks:tasks.filter(t=>t.due&&t.due.startsWith(dateStr)),
      content:contentItems.filter(c=>c.postDate&&c.postDate.startsWith(dateStr)),
      events:gcalEvents.filter(e=>e.start?.startsWith(dateStr)),
    };
  };

  const selectedItems=selected?getDayItems(selected):null;

  const isToday=(d)=>d===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();

  const cells=[];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(d);

  return <div>
    {/* Month header */}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:T.cream}}>
        {MONTHS[month]} {year}
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <div style={{display:"flex",gap:12,fontSize:11,color:T.muted}}>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:7,height:7,borderRadius:"50%",background:T.wine,display:"inline-block"}}/>Tasks</span>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:7,height:7,borderRadius:"50%",background:T.purple,display:"inline-block"}}/>Content</span>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:7,height:7,borderRadius:"50%",background:T.blue,display:"inline-block"}}/>Events</span>
        </div>
        <div style={{display:"flex",gap:4}}>
          <button onClick={()=>setDate(new Date(year,month-1,1))} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,padding:"4px 10px",color:T.muted,cursor:"pointer",fontSize:13}}>‹</button>
          <button onClick={()=>setDate(new Date())} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,padding:"4px 10px",color:T.muted,cursor:"pointer",fontSize:11,fontFamily:"'Syne',sans-serif",letterSpacing:".04em"}}>TODAY</button>
          <button onClick={()=>setDate(new Date(year,month+1,1))} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,padding:"4px 10px",color:T.muted,cursor:"pointer",fontSize:13}}>›</button>
        </div>
      </div>
    </div>

    {/* Day headers */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}}>
      {DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:9,color:T.muted,fontFamily:"'Syne',sans-serif",letterSpacing:".1em",padding:"4px 0"}}>{d}</div>)}
    </div>

    {/* Calendar grid */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
      {cells.map((d,i)=>{
        if(!d) return <div key={`e${i}`} style={{minHeight:72}}/>;
        const dots=getDotsForDay(d);
        const isSelected=selected===d;
        const isTod=isToday(d);
        return <div key={d} onClick={()=>setSelected(isSelected?null:d)}
          style={{minHeight:72,background:isSelected?`${T.gold}15`:isTod?`${T.gold}08`:T.surface,
            border:`1px solid ${isSelected?T.gold:isTod?T.gold+"44":T.border}`,
            borderRadius:9,padding:"7px 8px",cursor:"pointer",transition:"all .15s"}}
          onMouseEnter={e=>!isSelected&&(e.currentTarget.style.borderColor=T.borderLight)}
          onMouseLeave={e=>!isSelected&&(e.currentTarget.style.borderColor=isTod?T.gold+"44":T.border)}>
          <div style={{fontSize:12,color:isTod?T.gold:T.mutedLight,fontWeight:isTod?600:400,marginBottom:5,
            width:20,height:20,borderRadius:"50%",background:isTod?`${T.gold}20`:"transparent",
            display:"flex",alignItems:"center",justifyContent:"center"}}>{d}</div>
          {/* Event chips */}
          <div style={{display:"flex",flexDirection:"column",gap:2}}>
            {dots.slice(0,3).map((dot,j)=><div key={j}
              style={{fontSize:9,color:dot.color,background:`${dot.color}18`,borderRadius:4,
                padding:"1px 5px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                border:`1px solid ${dot.color}33`,lineHeight:1.6}}>
              {dot.type==="task"?"📋":dot.type==="content"?"📱":"📅"} {dot.label}
            </div>)}
            {dots.length>3&&<div style={{fontSize:9,color:T.muted,paddingLeft:4}}>+{dots.length-3} more</div>}
          </div>
        </div>;
      })}
    </div>

    {/* Selected day detail */}
    {selected&&selectedItems&&(
      <div style={{marginTop:14,padding:"14px 16px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:12}}>
        <div style={{fontSize:12,color:T.gold,fontFamily:"'Syne',sans-serif",letterSpacing:".06em",marginBottom:10}}>
          {MONTHS[month]} {selected}
        </div>
        <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
          {selectedItems.events.length>0&&<div style={{flex:1,minWidth:140}}>
            <div style={{fontSize:10,color:T.blue,fontFamily:"'Syne',sans-serif",letterSpacing:".08em",marginBottom:6}}>📅 EVENTS</div>
            {selectedItems.events.map(e=><div key={e.id} style={{fontSize:12,color:T.cream,marginBottom:4}}>
              {e.title}{e.start?.includes("T")&&<span style={{color:T.muted,fontSize:11}}> · {new Date(e.start).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}</span>}
            </div>)}
          </div>}
          {selectedItems.tasks.length>0&&<div style={{flex:1,minWidth:140}}>
            <div style={{fontSize:10,color:T.wine,fontFamily:"'Syne',sans-serif",letterSpacing:".08em",marginBottom:6}}>📋 TASKS DUE</div>
            {selectedItems.tasks.map(t=><div key={t.id} style={{fontSize:12,color:T.cream,marginBottom:4,display:"flex",alignItems:"center",gap:5}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:PRIORITY_COLORS[t.priority]||T.gold,flexShrink:0}}/>
              {t.title}
            </div>)}
          </div>}
          {selectedItems.content.length>0&&<div style={{flex:1,minWidth:140}}>
            <div style={{fontSize:10,color:T.purple,fontFamily:"'Syne',sans-serif",letterSpacing:".08em",marginBottom:6}}>📱 CONTENT</div>
            {selectedItems.content.map(c=><div key={c.id} style={{fontSize:12,color:T.cream,marginBottom:4}}>{c.title}</div>)}
          </div>}
          {!selectedItems.events.length&&!selectedItems.tasks.length&&!selectedItems.content.length&&
            <div style={{color:T.muted,fontSize:12}}>Nothing scheduled this day.</div>}
        </div>
      </div>
    )}
  </div>;
}

// ── TASK CARDS ────────────────────────────────────────────────────────────────
function TaskCards({tasks,toggleTask,openCapture,syncing,lastSync,syncError,onSync}){
  const pending=tasks.filter(t=>!t.done);
  const done=tasks.filter(t=>t.done);
  const high=pending.filter(t=>t.priority==="High");
  const med=pending.filter(t=>t.priority==="Medium");
  const low=pending.filter(t=>t.priority==="Low"||!t.priority);

  const TaskCard=({task})=>{
    const [hov,sH]=useState(false);
    return <div onClick={()=>toggleTask(task.id)}
      onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)}
      style={{background:hov?T.cardHover||"#211D19":T.card,
        border:`1px solid ${hov?PRIORITY_COLORS[task.priority]||T.border:T.border}`,
        borderLeft:`3px solid ${PRIORITY_COLORS[task.priority]||T.borderLight}`,
        borderRadius:10,padding:"11px 14px",cursor:"pointer",transition:"all .15s",marginBottom:8}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:9}}>
        <div style={{width:14,height:14,borderRadius:3,marginTop:2,flexShrink:0,transition:"all .15s",
          border:`2px solid ${task.done?T.green:PRIORITY_COLORS[task.priority]||T.borderLight}`,
          background:task.done?T.green:"transparent"}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,color:task.done?T.muted:T.cream,fontWeight:500,
            textDecoration:task.done?"line-through":"none",lineHeight:1.4,marginBottom:4}}>{task.title}</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
            {task.area&&<Tag label={task.area} color={AREA_COLORS[task.area]||T.muted} small/>}
            {task.due&&<span style={{fontSize:10,color:T.muted}}>📅 {new Date(task.due+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>}
          </div>
        </div>
        <NotionBadge url={task.notionUrl}/>
      </div>
    </div>;
  };

  const col=(label,items,color)=><div style={{flex:1,minWidth:200}}>
    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:12}}>
      <div style={{width:8,height:8,borderRadius:"50%",background:color}}/>
      <span style={{fontSize:10,color,fontFamily:"'Syne',sans-serif",letterSpacing:".1em",fontWeight:600}}>{label}</span>
      <span style={{fontSize:10,color:T.muted}}>({items.length})</span>
    </div>
    {items.length===0
      ?<div style={{textAlign:"center",padding:"20px 0",color:T.muted,fontSize:12,border:`1px dashed ${T.border}`,borderRadius:10}}>Clear ✓</div>
      :items.map(t=><TaskCard key={t.id} task={t}/>)}
  </div>;

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:T.cream}}>
        Tasks <span style={{fontSize:14,color:T.muted,fontFamily:"'DM Sans',sans-serif"}}>{pending.length} open</span>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <SyncPill syncing={syncing} lastSync={lastSync} error={syncError} onSync={onSync}/>
        <Btn onClick={()=>openCapture("task")} sm>+ Add Task</Btn>
      </div>
    </div>
    <div style={{display:"flex",gap:14}}>
      {col("🔴 HIGH",high,T.wine)}
      {col("🟡 MEDIUM",med,T.gold)}
      {col("⚪ LOW / INBOX",low,T.muted)}
    </div>
    {done.length>0&&<div style={{marginTop:14,fontSize:11,color:T.green,paddingLeft:4}}>✓ {done.length} completed today</div>}
  </div>;
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({tasks,toggleTask,contentItems,gcalEvents,openCapture,syncing,lastSync,syncError,onSync}){
  const [brief,setBrief]=useState(null);
  const [loading,setLoading]=useState(false);
  const [view,setView]=useState("calendar");
  const today=new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});

  useEffect(()=>{store.get("brief").then(b=>{if(b?.date===today)setBrief(b.text)});},[]);

  const gen=async()=>{
    setLoading(true);
    const pending=tasks.filter(t=>!t.done).slice(0,6).map(t=>`${t.title}${t.area?` [${t.area}]`:""}${t.priority==="High"?" 🔴":""}`).join(", ")||"nothing queued";
    const upcoming=gcalEvents.slice(0,3).map(e=>`${e.title} on ${new Date(e.start).toLocaleDateString()}`).join(", ")||"no upcoming events";
    try{
      const txt=await askClaude(`Generate Tiff's morning brief for ${today}. Under 250 words, punchy, big sister energy.\n\nFormat:\n☀️ GOOD MORNING, TIFF\n[2 sentences — energizing]\n\n📋 YOUR FOCUS TODAY\nTasks: ${pending}. Upcoming: ${upcoming}.\n\n📱 TRENDING CONTENT ANGLES\n• [Career/empowerment angle]\n• [Current event tie-in]\n• [Vixens N Darlings angle]\n\n💡 HOOK OF THE DAY\n[One hook + which bucket]\n\n🔥 REMINDER\n[1 line. Her voice.]`,[]);
      setBrief(txt);store.set("brief",{text:txt,date:today});
    }catch{setBrief("Couldn't load — try again.");}
    setLoading(false);
  };

  return <div style={{display:"flex",flexDirection:"column",gap:18}}>
    {/* Top row: Brief + Quick Actions */}
    <div style={{display:"flex",gap:18}}>
      <Card accent={T.gold+"33"} style={{flex:1}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:T.cream,lineHeight:1}}>{today}</div>
            <div style={{fontSize:9,color:T.muted,marginTop:2,fontFamily:"'Syne',sans-serif",letterSpacing:".08em"}}>MORNING BRIEF</div>
          </div>
          <Btn onClick={gen} disabled={loading} sm>{loading?"Brewing...":brief?"↺ Refresh":"✨ Generate"}</Btn>
        </div>
        {brief
          ?<div style={{fontSize:12,color:T.mutedLight,lineHeight:1.8,whiteSpace:"pre-line",maxHeight:160,overflowY:"auto"}}>{brief}</div>
          :<div style={{textAlign:"center",padding:"16px 0",color:T.muted}}>
            <div style={{fontSize:26,marginBottom:6}}>☀️</div>
            <div style={{fontSize:12}}>Generate your daily brief — trends, priorities, a hook.</div>
          </div>}
      </Card>
      <Card style={{width:220,flexShrink:0}}>
        <div style={{fontSize:10,color:T.muted,fontFamily:"'Syne',sans-serif",letterSpacing:".1em",marginBottom:12}}>QUICK CAPTURE</div>
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          <Btn onClick={()=>openCapture("task")} style={{width:"100%"}}>+ Task</Btn>
          <Btn onClick={()=>openCapture("content")} variant="wine" style={{width:"100%"}}>+ Content Idea</Btn>
          <Btn onClick={()=>openCapture("note")} variant="ghost" style={{width:"100%"}}>+ Note</Btn>
        </div>
        {gcalEvents.length>0&&<div style={{marginTop:12,paddingTop:10,borderTop:`1px solid ${T.border}`}}>
          <div style={{fontSize:9,color:T.blue,fontFamily:"'Syne',sans-serif",letterSpacing:".08em",marginBottom:7}}>NEXT UP</div>
          {gcalEvents.slice(0,2).map(e=><div key={e.id} style={{fontSize:11,color:T.mutedLight,marginBottom:5,lineHeight:1.4}}>
            <div style={{color:T.cream,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.title}</div>
            <div style={{color:T.muted,fontSize:10}}>{new Date(e.start).toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</div>
          </div>)}
        </div>}
      </Card>
    </div>

    {/* View toggle */}
    <div style={{display:"flex",gap:4}}>
      {["calendar","tasks"].map(v=><button key={v} onClick={()=>setView(v)} style={{
        background:view===v?T.gold:"transparent",color:view===v?"#0F0D0C":T.muted,
        border:`1px solid ${view===v?T.gold:T.border}`,borderRadius:7,padding:"5px 16px",
        fontSize:12,fontFamily:"'Syne',sans-serif",fontWeight:600,cursor:"pointer",transition:"all .15s",letterSpacing:".02em"
      }}>{v==="calendar"?"📅 Calendar":"📋 Tasks"}</button>}
    </div>

    {/* Calendar or Tasks */}
    {view==="calendar"
      ?<Card><CalendarView tasks={tasks} contentItems={contentItems} gcalEvents={gcalEvents} onDayClick={()=>{}}/></Card>
      :<TaskCards tasks={tasks} toggleTask={toggleTask} openCapture={openCapture} syncing={syncing} lastSync={lastSync} syncError={syncError} onSync={onSync}/>}
  </div>;
}


// ── CONTENT VOICE + HELPERS ─────────────────────────────────────────────────
const TIFF_VOICE = `You are writing content for Tiff LaVoie (@tunedinwithtiff). Her exact voice and style:

VOICE: Big-sister storytelling. Real talk from someone doing the thing — building a brand, going to grad school, working jobs, figuring it out in real time. Recovery + brand-in-progress moments. Boundary lines that are kind and clear. Never preachy, never polished to the point of fake.

CONTENT PILLARS:
1. The brand journey — behind the scenes, real moments, prototype updates, the messy truth
2. Mentor Minutes — advice you'd give your younger self or a little sister, things nobody tells you
3. Women who shrink — stories about being told to be quiet, take up less space, calm down
4. Thunderbird / grad school — what it looks like to bet on yourself when you're scared
5. The come-up — café shifts, YPO calls, building while working full time

HOOK STYLE (study these patterns):
- "Nobody told me that [career/brand/life truth]..."
- "POV: You just realized [relatable situation]..."
- "The thing about [topic] that nobody talks about is..."
- "I was always the loudest person in the room and here's what that cost me..."
- "Respectfully, no." [followed by the situation]
- "You were never too much. You were just in the wrong room."
- Direct address: "If you're a woman who's been told to shrink..."
- Vulnerability-first: "I don't have this figured out, but here's what I know..."

SCRIPT STYLE:
- Start with a hook that stops the scroll (first 3 seconds = everything)
- Unscripted FEEL even if written — short punchy sentences, real breath, conversational
- No LinkedIn polish — this isn't a resume, it's a conversation
- Specific > vague. "I was on a call with a YPO mentor" not "I got career advice"
- End with a call to action or a question that makes them comment
- Length: 45-90 seconds for TikTok/Reels

WHAT DOESN'T WORK FOR HER:
- Toxic positivity ("just believe in yourself!")
- Generic advice she hasn't lived
- Hiding the uncertainty — the not-knowing IS the content
- Over-produced, scripted robotic delivery
- Hiding that she's figuring it out as she goes`;

async function pushToNotion(item){
  try{
    const B = BUCKETS.find(b=>b.id===item.bucket);
    await fetch("/api/notion",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        type:"content",
        title:item.title,
        hook:item.hooks?.[0]||"",
        notes:item.script||item.notes||"",
        contentType:B?.notionType||null,
        status:item.status||"Idea",
      })
    });
    return true;
  }catch{return false;}
}


async function askClaudeContent(msg, history=[], maxTokens=2000){
  const r = await fetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({system:TIFF_VOICE,messages:[...history,{role:'user',content:msg}],max_tokens:maxTokens})
  });
  const d = await r.json(); return d.content?.[0]?.text||'Something went wrong.';
}
function Scraper({onSaved}){
  const [input,setInput]=useState("");
  const [bucket,setBucket]=useState("mentor_minutes");
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const B=BUCKETS.find(b=>b.id===bucket);

  const generate=async()=>{
    if(!input.trim())return;
    setLoading(true);setResult(null);setSaved(false);
    try{
      const res=await askClaudeContent(
        `Tiff wants to turn this source content into her own original video content for her ${B?.label} bucket.

SOURCE (YouTube URL, transcript, article, or any text):
${input}

Generate the following in Tiff's exact voice:

1. CORE INSIGHT
One sentence — what's the real truth/lesson here that Tiff can speak to from her own experience?

2. THREE HOOKS (stop-the-scroll opening lines)
Hook 1: [hook]
Hook 2: [hook]  
Hook 3: [hook]

3. SHORT-FORM SCRIPT (TikTok/Reels — 45-75 seconds)
Write a full script in Tiff's voice. Unscripted feel. Start with the best hook. Personal, specific, real. End with a question or CTA.

4. CONTENT ANGLE
One sentence on why this works for ${B?.label} specifically and how to make it feel authentic to Tiff's story.

5. SUGGESTED TITLE (for the library)
A short punchy title for this piece of content.`,
        [],2000
      );

      // Parse the response into structured sections
      const lines=res.split("\n");
      const getSection=(label)=>{
        const idx=lines.findIndex(l=>l.includes(label));
        if(idx===-1)return"";
        const end=lines.findIndex((l,i)=>i>idx&&/^\d\./.test(l));
        return lines.slice(idx+1,end===-1?undefined:end).join("\n").trim();
      };

      const hooksSection=getSection("THREE HOOKS")||getSection("HOOKS");
      const hookLines=hooksSection.split("\n").filter(l=>l.startsWith("Hook")||l.match(/^[123]\./)||l.startsWith("-")).map(l=>l.replace(/^Hook \d:|^[123]\.|^-/,"").trim()).filter(Boolean);

      const titleSection=getSection("SUGGESTED TITLE")||getSection("TITLE");
      const titleLine=titleSection.split("\n").find(l=>l.trim())||"Untitled Content";

      setResult({
        raw:res,
        title:titleLine.replace(/[*_#]/g,"").trim(),
        hooks:hookLines.length?hookLines:[res.substring(0,120)+"..."],
        script:getSection("SHORT-FORM SCRIPT")||getSection("SCRIPT")||res,
        angle:getSection("CONTENT ANGLE")||getSection("ANGLE")||"",
        insight:getSection("CORE INSIGHT")||getSection("INSIGHT")||"",
        bucket,
        status:"Idea",
        source:input.substring(0,200),
        createdAt:new Date().toISOString(),
      });
    }catch{setResult(null);}
    setLoading(false);
  };

  const saveToLibrary=async()=>{
    if(!result||saving)return;
    setSaving(true);
    const item={...result,id:Date.now()};
    // Save to local persistent library
    const existing=await store.get("content_library")||[];
    await store.set("content_library",[item,...existing]);
    // Push to Notion
    await pushToNotion(item);
    setSaved(true);setSaving(false);
    onSaved(item);
    // Don't clear result — it stays visible until they manually clear
  };

  return <div>
    <div style={{marginBottom:20}}>
      <div style={{fontSize:10,color:T.muted,fontFamily:"'Syne',sans-serif",letterSpacing:".1em",marginBottom:8}}>BUCKET</div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {BUCKETS.map(b=><BucketPill key={b.id} id={b.id} selected={bucket===b.id} onClick={()=>setBucket(b.id)}/>)}
      </div>
    </div>

    <div style={{display:"flex",gap:16}}>
      {/* Input side */}
      <div style={{flex:1}}>
        <div style={{fontSize:10,color:T.muted,fontFamily:"'Syne',sans-serif",letterSpacing:".1em",marginBottom:8}}>
          PASTE YOUTUBE URL, TRANSCRIPT, ARTICLE, OR ANY TEXT
        </div>
        <Inp value={input} onChange={e=>setInput(e.target.value)}
          placeholder="Paste a YouTube link, paste a full transcript, drop an article, a tweet, a podcast summary — anything. Claude will turn it into YOUR content in your voice."
          multi rows={10}/>
        <div style={{display:"flex",gap:8,marginTop:10}}>
          <Btn onClick={generate} disabled={loading||!input.trim()} style={{flex:1}}>
            {loading?"Generating in your voice...":"🎬 Generate My Content"}
          </Btn>
          {input&&<Btn onClick={()=>{setInput("");setResult(null);setSaved(false);}} variant="ghost" sm>Clear</Btn>}
        </div>
        {loading&&<div style={{marginTop:12,fontSize:12,color:T.muted,lineHeight:1.8}}>
          <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:4}}>
            {[0,.2,.4].map(d=><span key={d} style={{width:5,height:5,borderRadius:"50%",background:T.gold,display:"inline-block",animation:`pulse 1.4s ease-in-out ${d}s infinite`}}/>)}
            <span style={{marginLeft:4}}>Reading the source content...</span>
          </div>
          <div style={{color:T.muted,fontSize:11}}>Extracting insight → writing in your voice → formatting hooks + script</div>
        </div>}
      </div>

      {/* Output side */}
      <div style={{flex:1}}>
        {result?(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {/* Title */}
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:T.cream,lineHeight:1.2}}>
              {result.title}
              <Tag label={B?.label||""} color={B?.color||T.gold} small style={{marginLeft:8,verticalAlign:"middle"}}/>
            </div>

            {/* Core Insight */}
            {result.insight&&<Card style={{padding:"10px 14px",background:T.surface}}>
              <div style={{fontSize:9,color:T.gold,fontFamily:"'Syne',sans-serif",letterSpacing:".1em",marginBottom:5}}>💡 CORE INSIGHT</div>
              <div style={{fontSize:13,color:T.cream,lineHeight:1.6}}>{result.insight}</div>
            </Card>}

            {/* Hooks */}
            <Card style={{padding:"12px 14px"}}>
              <div style={{fontSize:9,color:T.gold,fontFamily:"'Syne',sans-serif",letterSpacing:".1em",marginBottom:10}}>🪝 HOOKS (tap to copy)</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {result.hooks.map((hook,i)=>(
                  <div key={i} onClick={()=>navigator.clipboard?.writeText(hook)}
                    style={{fontSize:13,color:T.cream,fontStyle:"italic",padding:"8px 10px",
                      background:T.surface,borderRadius:8,cursor:"pointer",border:`1px solid ${T.border}`,
                      transition:"all .15s",lineHeight:1.5}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=T.gold;e.currentTarget.style.color=T.gold;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.cream;}}>
                    "{hook}"
                  </div>
                ))}
              </div>
            </Card>

            {/* Script */}
            {result.script&&<Card style={{padding:"12px 14px"}}>
              <div style={{fontSize:9,color:T.purple,fontFamily:"'Syne',sans-serif",letterSpacing:".1em",marginBottom:8}}>📝 SCRIPT</div>
              <div style={{fontSize:12,color:T.mutedLight,lineHeight:1.85,whiteSpace:"pre-line",maxHeight:220,overflowY:"auto"}}>{result.script}</div>
            </Card>}

            {/* Actions */}
            <div style={{display:"flex",gap:8}}>
              {saved
                ?<div style={{fontSize:12,color:T.green,display:"flex",alignItems:"center",gap:5,padding:"8px 16px",background:"#1E3A22",borderRadius:8,border:`1px solid #2E5A32`}}>
                  ✓ Saved to library + Notion
                </div>
                :<Btn onClick={saveToLibrary} disabled={saving} variant="green" style={{flex:1}}>
                  {saving?"Saving...":"💾 Save to Library + Notion"}
                </Btn>}
              <Btn onClick={()=>{setResult(null);setSaved(false);}} variant="ghost" sm>✕ Dismiss</Btn>
            </div>
          </div>
        ):(
          <Card style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",minHeight:300,flexDirection:"column",gap:12}}>
            <div style={{fontSize:36}}>🎬</div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:T.cream,textAlign:"center"}}>Your content, your voice</div>
            <div style={{fontSize:12,color:T.muted,textAlign:"center",maxWidth:260,lineHeight:1.7}}>
              Paste any source — YouTube link, transcript, article, podcast — and Claude turns it into content that sounds like <em style={{color:T.mutedLight}}>you</em>, not AI.
            </div>
          </Card>
        )}
      </div>
    </div>
  </div>;
}

function Library({items,onDelete,onPushToNotion,onStatusChange}){
  const [filter,setFilter]=useState("all");
  const [search,setSearch]=useState("");
  const [expanded,setExpanded]=useState(null);

  const filtered=items
    .filter(i=>filter==="all"||i.bucket===filter)
    .filter(i=>!search||i.title?.toLowerCase().includes(search.toLowerCase())||i.hooks?.some(h=>h.toLowerCase().includes(search.toLowerCase())));

  return <div>
    {/* Controls */}
    <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap",alignItems:"center"}}>
      <Inp value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search library..." style={{width:200,flex:"0 0 200px"}}/>
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
        <button onClick={()=>setFilter("all")} style={{background:filter==="all"?T.gold:"transparent",color:filter==="all"?"#0F0D0C":T.muted,border:`1px solid ${filter==="all"?T.gold:T.border}`,borderRadius:20,padding:"3px 11px",fontSize:11,cursor:"pointer"}}>All ({items.length})</button>
        {BUCKETS.map(b=>{
          const count=items.filter(i=>i.bucket===b.id).length;
          if(!count)return null;
          return <button key={b.id} onClick={()=>setFilter(b.id)} style={{background:filter===b.id?`${b.color}22`:"transparent",color:filter===b.id?b.color:T.muted,border:`1px solid ${filter===b.id?b.color+"66":T.border}`,borderRadius:20,padding:"3px 11px",fontSize:11,cursor:"pointer"}}>{b.emoji} {b.label} ({count})</button>;
        })}
      </div>
    </div>

    {filtered.length===0
      ?<Card style={{textAlign:"center",padding:48}}>
        <div style={{fontSize:28,marginBottom:10}}>📚</div>
        <div style={{color:T.muted,fontSize:13}}>{items.length===0?"No content saved yet — use the Generator to start building your library.":"No content matches this filter."}</div>
      </Card>
      :<div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(item=>{
          const B=BUCKETS.find(b=>b.id===item.bucket);
          const isExp=expanded===item.id;
          return <Card key={item.id} style={{borderLeft:`3px solid ${B?.color||T.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
              <div style={{flex:1,minWidth:0}}>
                {/* Title + meta */}
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                  <div style={{fontSize:14,color:T.cream,fontWeight:500}}>{item.title}</div>
                  <Tag label={B?.label||item.bucket} color={B?.color||T.gold} small/>
                  <Tag label={item.status||"Idea"} color={STATUS_COLORS[item.status||"Idea"]} small/>
                </div>
                {/* First hook preview */}
                {item.hooks?.[0]&&<div style={{fontSize:12,color:T.muted,fontStyle:"italic",marginBottom:6,lineHeight:1.5}}>
                  "{item.hooks[0].substring(0,100)}{item.hooks[0].length>100?"...":""}"
                </div>}
                <div style={{fontSize:10,color:T.muted}}>{new Date(item.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>
              </div>
              <div style={{display:"flex",gap:5,flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end"}}>
                <select value={item.status||"Idea"} onChange={e=>onStatusChange(item.id,e.target.value)}
                  style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,color:T.mutedLight,padding:"3px 6px",fontFamily:"'DM Sans',sans-serif",fontSize:11,cursor:"pointer"}}>
                  {CONTENT_STATUSES.map(s=><option key={s}>{s}</option>)}
                </select>
                <Btn onClick={()=>setExpanded(isExp?null:item.id)} variant="soft" sm>{isExp?"▲ Less":"▼ More"}</Btn>
                <Btn onClick={()=>onPushToNotion(item)} variant="ghost" sm>→ Notion</Btn>
                <Btn onClick={()=>onDelete(item.id)} variant="danger" sm>✕</Btn>
              </div>
            </div>

            {/* Expanded view */}
            {isExp&&<div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${T.border}`}}>
              {item.hooks&&item.hooks.length>0&&<div style={{marginBottom:14}}>
                <div style={{fontSize:9,color:T.gold,fontFamily:"'Syne',sans-serif",letterSpacing:".1em",marginBottom:8}}>🪝 ALL HOOKS</div>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {item.hooks.map((h,i)=><div key={i} onClick={()=>navigator.clipboard?.writeText(h)}
                    style={{fontSize:12,color:T.cream,fontStyle:"italic",padding:"6px 10px",background:T.surface,
                      borderRadius:7,cursor:"pointer",border:`1px solid ${T.border}`}}>"{h}"</div>)}
                </div>
              </div>}
              {item.script&&<div>
                <div style={{fontSize:9,color:T.purple,fontFamily:"'Syne',sans-serif",letterSpacing:".1em",marginBottom:8}}>📝 SCRIPT</div>
                <div style={{fontSize:12,color:T.mutedLight,lineHeight:1.85,whiteSpace:"pre-line",background:T.surface,padding:"12px 14px",borderRadius:9}}>{item.script}</div>
              </div>}
            </div>}
          </Card>;
        })}
      </div>}
  </div>;
}

function Iterate({bucket,setBucket}){
  const [chat,setChat]=useState([]);
  const [chatIn,setChatIn]=useState("");
  const [chatLoading,setChatLoading]=useState(false);
  const chatRef=useRef(null);
  const B=BUCKETS.find(b=>b.id===bucket);

  useEffect(()=>{store.get("c_chat").then(c=>{if(c)setChat(c)})},[]);
  useEffect(()=>{chatRef.current?.scrollIntoView({behavior:"smooth"})},[chat]);

  const send=async()=>{
    if(!chatIn.trim()||chatLoading)return;
    const msg=chatIn;setChatIn("");setChatLoading(true);
    const next=[...chat,{role:"user",content:msg}];setChat(next);
    try{
      const res=await askClaudeContent(`Current bucket: ${B?.label}. ${msg}`,chat.slice(-10));
      const final=[...next,{role:"assistant",content:res}];
      setChat(final);store.set("c_chat",final);
    }catch{setChat(p=>[...p,{role:"assistant",content:"Ran into an issue — try again."}])}
    setChatLoading(false);
  };

  return <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 220px)"}}>
    <div style={{marginBottom:14}}>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {BUCKETS.map(b=><BucketPill key={b.id} id={b.id} selected={bucket===b.id} onClick={()=>setBucket(b.id)}/>)}
      </div>
    </div>
    <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:8,paddingBottom:4}}>
      {chat.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:T.muted}}>
        <div style={{fontSize:34,marginBottom:10}}>✨</div>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:T.cream,marginBottom:5}}>Iterate in your voice</div>
        <div style={{fontSize:13,marginBottom:18,color:T.muted}}>I know your pillars, your voice, what's worked and what hasn't. Let's make content.</div>
        <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap",maxWidth:600,margin:"0 auto"}}>
          {[`Give me 5 hooks for ${B?.label}`,"Help me write a 'Respectfully No' script about being talked over in meetings",
            "I want to make content about not knowing if I should do Thunderbird or stay and build — help me find the angle",
            "Turn this idea into a 60-second script: [paste idea]",
            "What's a content series I could do around my YPO work?"].map(s=><button key={s} onClick={()=>setChatIn(s)}
            style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:20,padding:"5px 13px",
              color:T.muted,fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",lineHeight:1.5,textAlign:"left"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=T.gold;e.currentTarget.style.color=T.gold}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.muted}}>{s}</button>)}
        </div>
      </div>}
      {chat.map((m,i)=><div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
        <div style={{maxWidth:"72%",background:m.role==="user"?T.wine:T.card,
          border:`1px solid ${m.role==="user"?T.wine+"88":T.border}`,
          borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",
          padding:"11px 15px",fontSize:13,color:T.cream,lineHeight:1.75,whiteSpace:"pre-line"}}>{m.content}</div>
      </div>)}
      {chatLoading&&<div style={{display:"flex",gap:5,padding:14,alignItems:"center"}}>
        {[0,.2,.4].map(d=><span key={d} style={{width:6,height:6,borderRadius:"50%",background:T.gold,display:"inline-block",animation:`pulse 1.4s ease-in-out ${d}s infinite`}}/>)}
      </div>}
      <div ref={chatRef}/>
    </div>
    <div style={{display:"flex",gap:8,marginTop:10,alignItems:"flex-end"}}>
      <Inp value={chatIn} onChange={e=>setChatIn(e.target.value)}
        placeholder={`Working on ${B?.label}... pitch an idea, ask for hooks, iterate a script`}
        multi rows={2} style={{flex:1}}
        onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}}/>
      <div style={{display:"flex",flexDirection:"column",gap:5}}>
        <Btn onClick={send} disabled={chatLoading||!chatIn.trim()}>Send</Btn>
        {chat.length>0&&<Btn onClick={()=>{setChat([]);store.set("c_chat",[])}} variant="ghost" sm>Clear</Btn>}
      </div>
    </div>
  </div>;
}

function Pipeline({contentItems,setContentItems,onSync}){
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{fontSize:13,color:T.muted}}>Your Notion Content Bank — move items through the pipeline.</div>
      <Btn onClick={onSync} variant="soft" sm>↺ Sync Notion</Btn>
    </div>
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
            {col.map(item=>{
              const B=BUCKETS.find(b=>b.notionType===item.type)||BUCKETS[0];
              return <Card key={item.id} style={{padding:"12px 14px"}}>
                <div style={{fontSize:13,color:T.cream,fontWeight:500,lineHeight:1.3,marginBottom:6}}>{item.title}</div>
                {item.hook&&<div style={{fontSize:11,color:T.gold,marginBottom:6,fontStyle:"italic"}}>"{item.hook}"</div>}
                {item.type&&<div style={{marginBottom:8}}><Tag label={item.type} color={B?.color||T.blue} small/></div>}
                {status!=="Ready to Post"&&<Btn sm variant="soft" onClick={()=>{
                  const next=CONTENT_STATUSES[CONTENT_STATUSES.indexOf(status)+1];
                  if(next){
                    setContentItems(p=>p.map(i=>i.id===item.id?{...i,status:next}:i));
                    fetch("/api/notion",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"content",pageId:item.id,status:next})});
                  }
                }}>→ {CONTENT_STATUSES[CONTENT_STATUSES.indexOf(status)+1]}</Btn>}
              </Card>;
            })}
            {col.length===0&&<div style={{padding:"16px 0",textAlign:"center",color:T.muted,fontSize:12,border:`1px dashed ${T.border}`,borderRadius:10}}>Empty</div>}
          </div>
        </div>;
      })}
    </div>
  </div>;
}

function Working(){
  const [w,setW]=useState({works:"",doesnt:"",metrics:""});
  useEffect(()=>{store.get("c_working").then(d=>{if(d)setW(d)})},[]);
  return <div>
    <div style={{display:"flex",gap:18,marginBottom:16}}>
      <Card style={{flex:1}}>
        <div style={{fontSize:10,color:T.green,fontFamily:"'Syne',sans-serif",letterSpacing:".08em",marginBottom:9}}>✓ WHAT'S WORKING</div>
        <Inp value={w.works} onChange={e=>setW(p=>({...p,works:e.target.value}))} placeholder="Formats, hooks, topics that are landing..." multi rows={6}/>
      </Card>
      <Card style={{flex:1}}>
        <div style={{fontSize:10,color:T.wine,fontFamily:"'Syne',sans-serif",letterSpacing:".08em",marginBottom:9}}>✗ WHAT'S NOT WORKING</div>
        <Inp value={w.doesnt} onChange={e=>setW(p=>({...p,doesnt:e.target.value}))} placeholder="Honest log. No judgment. What flopped or felt off?" multi rows={6}/>
      </Card>
    </div>
    <Card>
      <div style={{fontSize:10,color:T.muted,fontFamily:"'Syne',sans-serif",letterSpacing:".08em",marginBottom:9}}>📊 METRICS</div>
      <Inp value={w.metrics} onChange={e=>setW(p=>({...p,metrics:e.target.value}))} placeholder="View counts, follower growth, engagement notes..." multi rows={4}/>
    </Card>
    <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}><Btn onClick={()=>store.set("c_working",w)}>Save</Btn></div>
  </div>;
}

function DataDoc(){
  const [doc,setDoc]=useState({
    mission:"For women told to shrink — this is the big sister voice they needed.\n\nTiff Lavoie. Building in public. Figuring it out out loud.",
    voice:"Big-sister storytelling. Recovery + brand-in-progress moments. Boundary lines that are kind and clear.\n\n• \"Respectfully, no.\"\n• \"You were never too much. You were just in the wrong room.\"\n• \"Build in public. Stumble in public. Grow in public.\"",
    buckets:"🎓 Mentor Minutes — advice you'd give your younger self or a little sister\n⚡ Practice>Preach — living what you preach, being accountable\n🛑 Respectfully No — boundaries, self-advocacy, for women told to shrink\n\n🥗 Healing w/ Food — @gym\n💪 Workout Journey — @gym\n\n🧪 Science of Skin — @education\n📚 Substack Rewinds — @education",
    confinements:"• Not toxic positivity — keep it real\n• Not LinkedIn-polished — unscripted converts better for Tiff\n• Not giving advice she hasn't lived\n• Not hiding the uncertainty — the not-knowing IS the content\n• Not separated from the brand — she IS the brand right now",
    pillars:"1. The brand journey — behind the scenes, real moments, prototype updates\n2. Mentor Minutes — advice from someone doing the thing\n3. Women who shrink — stories, truths, the reason the marketplace exists\n4. Thunderbird / grad school — betting on yourself\n5. The come-up — café shifts, YPO calls, building while working",
  });
  useEffect(()=>{store.get("data_doc").then(d=>{if(d)setDoc(d)})},[]);
  const S=[
    {key:"mission",label:"🎯 MISSION",rows:3},
    {key:"voice",label:"🎤 BRAND VOICE & PHRASES",rows:6},
    {key:"pillars",label:"🏛️ CONTENT PILLARS",rows:7},
    {key:"buckets",label:"🪣 CONTENT BUCKETS",rows:8},
    {key:"confinements",label:"🚫 CONFINEMENTS",rows:6},
  ];
  return <div>
    <div style={{fontSize:13,color:T.muted,marginBottom:16}}>Your source of truth. Claude reads this every time it generates content for you.</div>
    {S.map(s=><Card key={s.key} style={{marginBottom:12}}>
      <div style={{fontSize:10,color:T.gold,fontFamily:"'Syne',sans-serif",letterSpacing:".1em",marginBottom:9}}>{s.label}</div>
      <Inp value={doc[s.key]} onChange={e=>setDoc(p=>({...p,[s.key]:e.target.value}))} multi rows={s.rows}/>
    </Card>)}
    <div style={{display:"flex",justifyContent:"flex-end"}}><Btn onClick={()=>store.set("data_doc",doc)}>Save Document</Btn></div>
  </div>;
}
function ContentHub({contentItems,setContentItems,onSyncContent}){
  const [sub,setSub]=useState("generator");
  const [bucket,setBucket]=useState("mentor_minutes");
  const [library,setLibrary]=useState([]);

  // Load library from storage on mount
  useEffect(()=>{
    store.get("content_library").then(l=>{if(l)setLibrary(l)});
  },[]);

  const handleSaved=(item)=>{
    setLibrary(p=>[item,...p.filter(i=>i.id!==item.id)]);
  };

  const deleteItem=(id)=>{
    const updated=library.filter(i=>i.id!==id);
    setLibrary(updated);
    store.set("content_library",updated);
  };

  const handlePushToNotion=async(item)=>{
    await pushToNotion(item);
  };

  const handleStatusChange=(id,status)=>{
    const updated=library.map(i=>i.id===id?{...i,status}:i);
    setLibrary(updated);
    store.set("content_library",updated);
  };

  const SUBS=[
    {id:"generator",label:"🎬 Generator"},
    {id:"library",label:`📚 Library (${library.length})`},
    {id:"pipeline",label:"📋 Notion Pipeline"},
    {id:"iterate",label:"✨ Iterate w/ AI"},
    {id:"working",label:"📊 What's Working"},
    {id:"dataDoc",label:"📄 Data Doc"},
  ];

  return <div>
    <SubNav items={SUBS} active={sub} set={setSub}/>
    {sub==="generator"&&<Scraper onSaved={handleSaved}/>}
    {sub==="library"&&<Library items={library} onDelete={deleteItem} onPushToNotion={handlePushToNotion} onStatusChange={handleStatusChange}/>}
    {sub==="pipeline"&&<Pipeline contentItems={contentItems} setContentItems={setContentItems} onSync={onSyncContent}/>}
    {sub==="iterate"&&<Iterate bucket={bucket} setBucket={setBucket}/>}
    {sub==="working"&&<Working/>}
    {sub==="dataDoc"&&<DataDoc/>}
  </div>;
}

// ── OTHER HUBS (Brand, College, Science, AI) ─────────────────────────────────
function BrandHub(){
  const [sub,setSub]=useState("clarity");
  const [docs,setDocs]=useState({clarity:"## Where I'm Stuck\n\n## What I Know For Sure\n• Women's empowerment is the through-line\n\n## Possible Directions\n1. Clothing brand first\n2. Community/content first\n3. Platform-first\n\n## The Question I Need to Answer",bizPlan:"## Business Overview\n\n## Revenue Streams\n1. \n2. \n3. ",marketing:"## Channels\n\n## Messaging\n\n## Launch Strategy",strategy:"## Differentiation\n\n## Key Partnerships",files:"## Important Links & Files"});
  const [ai,setAI]=useState({q:"",a:"",loading:false});
  useEffect(()=>{store.get("brand_docs").then(d=>{if(d)setDocs(d)})},[]);
  const SUBS=[{id:"clarity",label:"🔍 Brand Clarity"},{id:"bizPlan",label:"📋 Biz Plan"},{id:"marketing",label:"📣 Marketing"},{id:"strategy",label:"♟️ Strategy"},{id:"files",label:"📁 Files"},{id:"aiHelper",label:"✨ AI Helper"}];
  const ask=async()=>{if(!ai.q.trim())return;setAI(p=>({...p,loading:true}));const res=await askClaude(`Help Tiff with Vixens N Darlings. Concrete steps. Push back if needed. Q: ${ai.q}`,[]);setAI(p=>({...p,a:res,loading:false}));};
  if(sub==="aiHelper") return <div><SubNav items={SUBS} active={sub} set={setSub}/><Heading>Brand Strategy AI</Heading>
    <div style={{display:"flex",gap:18}}><div style={{flex:1}}><Inp value={ai.q} onChange={e=>setAI(p=>({...p,q:e.target.value}))} placeholder="Ask anything about VnD..." multi rows={8}/>
    <div style={{display:"flex",justifyContent:"flex-end",marginTop:9}}><Btn onClick={ask} disabled={ai.loading||!ai.q.trim()}>{ai.loading?"Thinking...":"Ask"}</Btn></div></div>
    <div style={{flex:1}}>{ai.a?<Card style={{whiteSpace:"pre-line",fontSize:13,color:T.mutedLight,lineHeight:1.75}}>{ai.a}</Card>:<Card style={{display:"flex",alignItems:"center",justifyContent:"center",padding:48}}><div style={{color:T.muted,fontSize:13,textAlign:"center"}}><div style={{fontSize:30,marginBottom:8}}>👗</div>Ask anything about VnD.</div></Card>}</div></div></div>;
  return <div><SubNav items={SUBS} active={sub} set={setSub}/><Heading>Vixens N Darlings</Heading>
    <Card><div style={{fontSize:10,color:T.wine,fontFamily:"'Syne',sans-serif",letterSpacing:".1em",marginBottom:10}}>{SUBS.find(s=>s.id===sub)?.label}</div>
    <Inp value={docs[sub]||""} onChange={e=>setDocs(p=>({...p,[sub]:e.target.value}))} multi rows={16}/>
    <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}><Btn onClick={()=>store.set("brand_docs",docs)}>Save</Btn></div></Card></div>;
}

function CollegeHub(){
  const [sub,setSub]=useState("internships");
  const [lists,setLists]=useState({internships:[],scholarships:[],certs:[]});
  const [newItem,setNewItem]=useState({title:"",status:"Researching",deadline:""});
  const [decisions,setDecisions]=useState("## The Fork\n- Thunderbird Global MBA (admitted ✓)\n- Law school (waitlist)\n- Brand / Vixens N Darlings full-time\n\n## What matters most:\n\n## Pros/Cons:\n\n## Decide by:");
  useEffect(()=>{Promise.all([store.get("internships"),store.get("scholarships"),store.get("certs"),store.get("decisions")]).then(([i,s,c,d])=>{setLists({internships:i||[],scholarships:s||[],certs:c||[]});if(d)setDecisions(d)});},[]);
  const SM={internships:["Researching","Applied","Interview","Offer","Rejected"],scholarships:["Researching","Applied","Won","Rejected"],certs:["Planned","In Progress","Completed"]};
  const SC={Researching:T.muted,Applied:T.blue,Interview:T.gold,Offer:T.green,Won:T.green,Rejected:T.wine,"In Progress":T.gold,Planned:T.muted,Completed:T.green};
  const SUBS=[{id:"internships",label:"💼 Internships"},{id:"scholarships",label:"💰 Scholarships"},{id:"certs",label:"📜 Certs"},{id:"decisions",label:"🗺️ Post-Grad"}];
  const add=()=>{if(!newItem.title.trim())return;const item={id:Date.now(),...newItem,at:new Date().toISOString()};const updated={...lists,[sub]:[item,...lists[sub]]};setLists(updated);store.set(sub,updated[sub]);setNewItem({title:"",status:SM[sub][0],deadline:""});};
  if(sub==="decisions") return <div><SubNav items={SUBS} active={sub} set={setSub}/><Heading>Post-Grad Decisions</Heading>
    <Card><Inp value={decisions} onChange={e=>setDecisions(e.target.value)} multi rows={16}/><div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}><Btn onClick={()=>store.set("decisions",decisions)}>Save</Btn></div></Card></div>;
  const items=lists[sub]||[];
  return <div><SubNav items={SUBS} active={sub} set={setSub}/><Heading>{SUBS.find(s=>s.id===sub)?.label}</Heading>
    <Card style={{marginBottom:14}}><div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
      <Inp value={newItem.title} onChange={e=>setNewItem(p=>({...p,title:e.target.value}))} placeholder="Name..." style={{flex:"1 1 180px"}}/>
      <select value={newItem.status} onChange={e=>setNewItem(p=>({...p,status:e.target.value}))} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,color:T.cream,padding:"9px 12px",fontFamily:"'DM Sans',sans-serif",fontSize:13,cursor:"pointer"}}>
        {(SM[sub]||[]).map(s=><option key={s}>{s}</option>)}
      </select>
      <Inp value={newItem.deadline} onChange={e=>setNewItem(p=>({...p,deadline:e.target.value}))} placeholder="Deadline" style={{flex:"1 1 120px"}}/>
      <Btn onClick={add}>Add</Btn>
    </div></Card>
    {items.map(item=><Card key={item.id} style={{marginBottom:9,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:9}}><div style={{fontSize:14,color:T.cream}}>{item.title}</div><Tag label={item.status} color={SC[item.status]||T.muted} small/></div>
      {item.deadline&&<div style={{fontSize:11,color:T.muted,marginTop:3}}>📅 {item.deadline}</div>}</div>
      <Btn onClick={()=>{const u={...lists,[sub]:items.filter(x=>x.id!==item.id)};setLists(u);store.set(sub,u[sub])}} variant="danger" sm>✕</Btn>
    </Card>)}
    {items.length===0&&<div style={{textAlign:"center",padding:36,color:T.muted,fontSize:13}}>Nothing added yet.</div>}
  </div>;
}

function ScienceHub(){
  const [sub,setSub]=useState("skincare");
  const [notes,setNotes]=useState({skincare:"",nutrition:"",health:"",workouts:"",cycle:"",hair:""});
  const [ai,setAI]=useState({q:"",a:"",loading:false});
  useEffect(()=>{store.get("sci_notes").then(n=>{if(n)setNotes(n)})},[]);
  const SUBS=[{id:"skincare",label:"✨ Skincare"},{id:"nutrition",label:"🥗 Nutrition"},{id:"health",label:"💊 Health + Vitamins"},{id:"workouts",label:"💪 Workouts"},{id:"cycle",label:"🌙 Hormones + Cycle"},{id:"hair",label:"💇 Haircare"}];
  const ask=async()=>{if(!ai.q.trim())return;setAI(p=>({...p,loading:true}));const res=await askClaude(`Tiff asking about ${sub}. Give: 1) Science answer 2) Content angle. Q: ${ai.q}`,[]);setAI(p=>({...p,a:res,loading:false}));};
  return <div><SubNav items={SUBS} active={sub} set={setSub}/>
    <div style={{display:"flex",gap:18}}>
      <div style={{flex:1}}><Heading>{SUBS.find(s=>s.id===sub)?.label} Notes</Heading>
        <Card><Inp value={notes[sub]} onChange={e=>setNotes(p=>({...p,[sub]:e.target.value}))} placeholder={`Notes on ${sub}...`} multi rows={12}/>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:9}}><Btn onClick={()=>store.set("sci_notes",notes)}>Save</Btn></div></Card></div>
      <div style={{width:320,flexShrink:0}}><Heading>🔬 Ask the Science</Heading>
        <Card><Inp value={ai.q} onChange={e=>setAI(p=>({...p,q:e.target.value}))} placeholder={`Ask about ${sub}...`} multi rows={4}/>
        <Btn onClick={ask} disabled={ai.loading||!ai.q.trim()} style={{marginTop:9,width:"100%"}}>{ai.loading?"Researching...":"Ask"}</Btn>
        {ai.a&&<div style={{marginTop:12,fontSize:12,color:T.mutedLight,lineHeight:1.75,whiteSpace:"pre-line"}}>{ai.a}</div>}</Card></div>
    </div>
  </div>;
}

function AIHub(){
  const [sub,setSub]=useState("prompts");
  const [items,setItems]=useState({prompts:[],ideas:[],workflows:[]});
  const [newItem,setNewItem]=useState({title:"",content:""});
  useEffect(()=>{store.get("ai_hub").then(d=>{if(d)setItems(d)})},[]);
  const SUBS=[{id:"prompts",label:"📝 Prompts"},{id:"ideas",label:"💡 AI Ideas"},{id:"workflows",label:"⚙️ Workflows"}];
  const add=()=>{if(!newItem.title.trim())return;const item={id:Date.now(),...newItem,at:new Date().toISOString()};const updated={...items,[sub]:[item,...items[sub]]};setItems(updated);store.set("ai_hub",updated);setNewItem({title:"",content:""});};
  return <div><SubNav items={SUBS} active={sub} set={setSub}/><Heading>{SUBS.find(s=>s.id===sub)?.label}</Heading>
    <Card style={{marginBottom:14}}><Inp value={newItem.title} onChange={e=>setNewItem(p=>({...p,title:e.target.value}))} placeholder="Name..." style={{marginBottom:7}}/>
    <Inp value={newItem.content} onChange={e=>setNewItem(p=>({...p,content:e.target.value}))} placeholder="Details..." multi rows={3}/>
    <div style={{display:"flex",justifyContent:"flex-end",marginTop:9}}><Btn onClick={add}>Save</Btn></div></Card>
    {items[sub].map(item=><Card key={item.id} style={{marginBottom:9}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{fontSize:14,color:T.cream,fontWeight:500,marginBottom:5}}>{item.title}</div>
      <Btn onClick={()=>{const u={...items,[sub]:items[sub].filter(x=>x.id!==item.id)};setItems(u);store.set("ai_hub",u)}} variant="danger" sm>✕</Btn></div>
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
  const save=async()=>{if(!text.trim()||saving)return;setSaving(true);await onSave({type,text,hook,priority,area:area||null,bucket,hub});setSaving(false);onClose();};
  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"#000000BB",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
    <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:16,padding:26,width:500,maxWidth:"90vw"}}>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:T.cream,marginBottom:16}}>{type==="task"?"New Task":type==="content"?"Content Idea":"Quick Note"}</div>
      <Inp value={text} onChange={e=>setText(e.target.value)} placeholder={type==="task"?"What needs to get done?":type==="content"?"Title or idea...":"Capture the thought..."} multi rows={2} style={{marginBottom:8}}/>
      {type==="content"&&<><Inp value={hook} onChange={e=>setHook(e.target.value)} placeholder='Hook (optional)...' style={{marginBottom:12}}/>
        <div style={{fontSize:10,color:T.muted,fontFamily:"'Syne',sans-serif",letterSpacing:".08em",marginBottom:6}}>BUCKET</div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{BUCKETS.map(b=><BucketPill key={b.id} id={b.id} selected={bucket===b.id} onClick={()=>setBucket(b.id)}/>)}</div></>}
      {type==="task"&&<>
        <div style={{display:"flex",gap:10,marginBottom:12}}>
          <div style={{flex:1}}><div style={{fontSize:10,color:T.muted,fontFamily:"'Syne',sans-serif",letterSpacing:".08em",marginBottom:6}}>PRIORITY</div>
            <div style={{display:"flex",gap:5}}>{PRIORITIES.map(p=><button key={p} onClick={()=>setPriority(p)} style={{background:priority===p?`${PRIORITY_COLORS[p]}22`:"transparent",color:priority===p?PRIORITY_COLORS[p]:T.muted,border:`1px solid ${priority===p?PRIORITY_COLORS[p]+"66":T.border}`,borderRadius:20,padding:"3px 10px",fontSize:11,fontFamily:"'DM Sans',sans-serif",cursor:"pointer"}}>{p}</button>)}</div></div>
          <div style={{flex:1}}><div style={{fontSize:10,color:T.muted,fontFamily:"'Syne',sans-serif",letterSpacing:".08em",marginBottom:6}}>AREA</div>
            <select value={area} onChange={e=>setArea(e.target.value)} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,color:area?T.cream:T.muted,padding:"7px 10px",fontFamily:"'DM Sans',sans-serif",fontSize:12,width:"100%",cursor:"pointer"}}>
              <option value="">No area</option>{AREAS.map(a=><option key={a}>{a}</option>)}</select></div>
        </div>
        <div style={{fontSize:10,color:T.muted,fontFamily:"'Syne',sans-serif",letterSpacing:".08em",marginBottom:6}}>HUB</div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{HUBS.map(h=><button key={h.id} onClick={()=>setHub(h.id)} style={{background:hub===h.id?`${T.gold}22`:"transparent",color:hub===h.id?T.gold:T.muted,border:`1px solid ${hub===h.id?T.gold+"66":T.border}`,borderRadius:20,padding:"3px 11px",fontSize:11,fontFamily:"'DM Sans',sans-serif",cursor:"pointer"}}>{h.icon} {h.label}</button>)}</div></>}
      <div style={{display:"flex",gap:8,marginTop:18,justifyContent:"flex-end"}}>
        <Btn onClick={onClose} variant="ghost">Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving?"Saving...":"Save"}</Btn>
      </div>
    </div>
  </div>;
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function SecondBrain(){
  const [hub,setHub]=useState("dashboard");
  const [tasks,setTasks]=useState([]);
  const [contentItems,setContentItems]=useState([]);
  const [gcalEvents,setGcalEvents]=useState([]);
  const [capture,setCapture]=useState(null);
  const [collapsed,setCollapsed]=useState(false);
  const [syncing,setSyncing]=useState(false);
  const [lastSync,setLastSync]=useState(null);
  const [syncError,setSyncError]=useState(false);

  useEffect(()=>{
    if(!document.getElementById("brain-fonts")){
      const l=document.createElement("link");l.id="brain-fonts";l.rel="stylesheet";
      l.href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Syne:wght@400;500;600;700&family=DM+Sans:wght@300;400;500&display=swap";
      document.head.appendChild(l);
    }
    if(!document.getElementById("brain-styles")){
      const s=document.createElement("style");s.id="brain-styles";
      s.textContent=`*{box-sizing:border-box}body{background:#0F0D0C;margin:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#2e2824;border-radius:4px}textarea{resize:vertical}@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}`;
      document.head.appendChild(s);
    }
  },[]);

  const syncAll=useCallback(async()=>{
    setSyncing(true);setSyncError(false);
    const [notionData,calEvents]=await Promise.all([notion.getAll(),fetchGCalEvents()]);
    if(notionData){
      if(notionData.tasks)setTasks(notionData.tasks);
      if(notionData.content)setContentItems(notionData.content);
      setLastSync(new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}));
      if(notionData.tasks)store.set("tasks",notionData.tasks);
      if(notionData.content)store.set("content_items",notionData.content);
    }else{
      setSyncError(true);
      const[t,c]=await Promise.all([store.get("tasks"),store.get("content_items")]);
      if(t)setTasks(t);if(c)setContentItems(c);
    }
    if(calEvents.length>0){setGcalEvents(calEvents);store.set("gcal_events",calEvents);}
    else{const cached=await store.get("gcal_events");if(cached)setGcalEvents(cached);}
    setSyncing(false);
  },[]);

  const syncContent=useCallback(async()=>{
    try{const r=await fetch("/api/notion?type=content");if(r.ok){const d=await r.json();if(d.content){setContentItems(d.content);store.set("content_items",d.content);}}}catch{}
  },[]);

  useEffect(()=>{syncAll();},[syncAll]);

  const handleSave=async({type,text,hook,priority,area,bucket,hub:th})=>{
    if(type==="task"){
      const temp={id:`temp-${Date.now()}`,title:text,priority,area,hub:th,done:false,status:"To Do",source:"local"};
      setTasks(p=>[temp,...p]);
      const created=await notion.createTask(text,priority,area);
      if(created)setTasks(p=>p.map(t=>t.id===temp.id?{...created,hub:th}:t));
    }else if(type==="content"){
      const B=BUCKETS.find(b=>b.id===bucket);
      const temp={id:`temp-${Date.now()}`,title:text,hook,status:"Idea",type:B?.notionType||null,source:"local"};
      setContentItems(p=>[temp,...p]);
      const created=await notion.createContent(text,hook,"",B?.notionType||null);
      if(created)setContentItems(p=>p.map(i=>i.id===temp.id?created:i));
    }
  };

  const toggleTask=async(id)=>{
    const task=tasks.find(t=>t.id===id);if(!task)return;
    const newStatus=task.done?"To Do":"Done";
    setTasks(p=>p.map(t=>t.id===id?{...t,done:!t.done,status:newStatus}:t));
    if(!String(id).startsWith("temp-"))await notion.updateTask(id,newStatus);
  };

  const pending=tasks.filter(t=>!t.done).length;

  return <div style={{display:"flex",height:"100vh",background:T.bg,color:T.cream,fontFamily:"'DM Sans',sans-serif",overflow:"hidden"}}>
    <div style={{width:collapsed?58:210,background:T.surface,borderRight:`1px solid ${T.border}`,padding:collapsed?"24px 8px":"24px 12px",display:"flex",flexDirection:"column",transition:"width .22s ease",flexShrink:0,overflow:"hidden"}}>
      <div style={{marginBottom:24,display:"flex",alignItems:"center",justifyContent:collapsed?"center":"space-between",paddingLeft:collapsed?0:3}}>
        {!collapsed&&<div><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,color:T.gold,letterSpacing:".02em"}}>Tiff's Brain</div>
          <div style={{fontSize:9,color:T.muted,marginTop:2,fontFamily:"'Syne',sans-serif",letterSpacing:".1em"}}>SECOND BRAIN v2</div></div>}
        <button onClick={()=>setCollapsed(p=>!p)} style={{background:"transparent",border:"none",color:T.muted,cursor:"pointer",fontSize:14,padding:3,flexShrink:0}}>{collapsed?"→":"←"}</button>
      </div>
      {HUBS.map(h=><button key={h.id} onClick={()=>setHub(h.id)} style={{display:"flex",alignItems:"center",gap:collapsed?0:9,justifyContent:collapsed?"center":"flex-start",padding:collapsed?"9px 0":"8px 9px",borderRadius:8,marginBottom:2,width:"100%",background:hub===h.id?`${T.gold}18`:"transparent",border:hub===h.id?`1px solid ${T.gold}33`:"1px solid transparent",color:hub===h.id?T.gold:T.muted,fontSize:13,fontFamily:"'DM Sans',sans-serif",fontWeight:hub===h.id?500:400,cursor:"pointer",textAlign:"left",transition:"all .15s",overflow:"hidden",whiteSpace:"nowrap"}}>
        <span style={{fontSize:15,flexShrink:0}}>{h.icon}</span>{!collapsed&&h.label}</button>)}
      {!collapsed&&<div style={{marginTop:"auto",paddingTop:14,borderTop:`1px solid ${T.border}`}}>
        <button onClick={()=>setCapture("task")} style={{width:"100%",background:`${T.gold}15`,border:`1px solid ${T.gold}33`,borderRadius:8,padding:"7px 9px",color:T.gold,fontSize:12,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",marginBottom:5}}>+ Quick Capture</button>
        <div style={{fontSize:11,color:T.muted,paddingLeft:3}}>{pending} task{pending!==1?"s":""} pending</div>
      </div>}
    </div>

    <div style={{flex:1,overflow:"auto",padding:"28px 30px"}}>
      <div style={{maxWidth:1140,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:32,color:T.cream,lineHeight:1}}>{HUBS.find(h=>h.id===hub)?.icon} {HUBS.find(h=>h.id===hub)?.label}</div>
          <div style={{display:"flex",gap:7}}>
            <Btn onClick={()=>setCapture("content")} variant="wine" sm>+ Content Idea</Btn>
            <Btn onClick={()=>setCapture("task")} variant="soft" sm>+ Task</Btn>
          </div>
        </div>
        {hub==="dashboard"&&<Dashboard tasks={tasks} toggleTask={toggleTask} contentItems={contentItems} gcalEvents={gcalEvents} openCapture={setCapture} syncing={syncing} lastSync={lastSync} syncError={syncError} onSync={syncAll}/>}
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
