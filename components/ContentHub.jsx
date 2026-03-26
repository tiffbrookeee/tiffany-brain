'use client';
import { useState, useEffect, useRef } from 'react';

// ── PASTE THIS ENTIRE FILE AS: components/ContentHub.jsx ─────────────────────
// Then in SecondBrain.jsx, replace:
//   import ... (no change needed if you inline it)
// And change the ContentHub function to import from this file OR just replace
// the ContentHub function in SecondBrain.jsx with everything below.

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

const CONTENT_STATUSES = ["Idea","Drafting","Ready to Post","Posted"];
const STATUS_COLORS = {Idea:T.muted,Drafting:T.gold,"Ready to Post":T.green,Posted:T.blue};

// Tiff's exact voice + style from her Notion Content Bank
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

const store = {
  async get(k){try{const r=await window.storage.get(k);return r?JSON.parse(r.value):null}catch{return null}},
  async set(k,v){try{await window.storage.set(k,JSON.stringify(v))}catch{}},
};

async function askClaude(msg, history=[], maxTokens=2000){
  const r = await fetch("/api/claude",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({system:TIFF_VOICE,messages:[...history,{role:"user",content:msg}],max_tokens:maxTokens})
  });
  const d = await r.json();
  return d.content?.[0]?.text||"Something went wrong.";
}

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

// ── UI ATOMS ──────────────────────────────────────────────────────────────────
function Card({children,style,onClick,accent}){
  const [h,sH]=useState(false);
  return <div onClick={onClick} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)}
    style={{background:T.card,border:`1px solid ${h&&onClick?T.gold:accent||T.border}`,
      borderRadius:14,padding:"16px 18px",cursor:onClick?"pointer":"default",transition:"all .2s",...style}}>{children}</div>;
}

function Btn({children,onClick,variant="primary",style,disabled,sm}){
  const v={
    primary:{bg:T.gold,color:"#0F0D0C"},
    ghost:{bg:"transparent",color:T.muted,border:`1px solid ${T.border}`},
    wine:{bg:T.wine,color:T.cream},
    soft:{bg:T.surface,color:T.mutedLight,border:`1px solid ${T.border}`},
    danger:{bg:"#5A2020",color:"#FFAAAA"},
    green:{bg:"#1E3A22",color:"#7ABA82",border:`1px solid #2E5A32`},
  }[variant];
  return <button onClick={onClick} disabled={disabled}
    style={{background:v.bg,color:v.color,border:v.border||"none",borderRadius:8,
      padding:sm?"4px 10px":"8px 16px",fontSize:sm?11:13,fontFamily:"'DM Sans',sans-serif",
      fontWeight:500,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.45:1,
      transition:"all .15s",whiteSpace:"nowrap",...style}}>{children}</button>;
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
    borderRadius:20,padding:"3px 11px",fontSize:11,cursor:"pointer",
    transition:"all .15s",fontWeight:selected?500:400}}>{b.emoji} {b.label}</button>;
}

// ── YOUTUBE SCRAPER + GENERATOR ───────────────────────────────────────────────
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
      const res=await askClaude(
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

// ── CONTENT LIBRARY ───────────────────────────────────────────────────────────
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

// ── ITERATE WITH AI ───────────────────────────────────────────────────────────
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
      const res=await askClaude(`Current bucket: ${B?.label}. ${msg}`,chat.slice(-10));
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

// ── PIPELINE (from Notion) ────────────────────────────────────────────────────
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

// ── WHAT'S WORKING ────────────────────────────────────────────────────────────
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

// ── DATA DOC ──────────────────────────────────────────────────────────────────
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

// ── MAIN CONTENT HUB ──────────────────────────────────────────────────────────
export default function ContentHub({contentItems,setContentItems,onSyncContent}){
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
