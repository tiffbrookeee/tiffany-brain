// app/api/content-agent/route.js
// Generates content ideas, hooks, and full scripts for @tunedinwithtiff
// across TikTok, Substack, and Discord — saves to Notion Content Bank

const CONTENT_DB_ID = '0f11c6acb31f4d32bfb730c060576c61';
const NOTION_API_KEY = process.env.NOTION_API_KEY;

export async function POST(req) {
  const { mode, topic, platform, context } = await req.json();
  // mode: "generate_ideas" | "write_script" | "write_newsletter" | "trending"
  // platform: "tiktok" | "substack" | "discord" | "all"

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  const BRAND_CONTEXT = `
About @tunedinwithtiff (Tiffany LaVoie):
- 86K+ TikTok followers, also on Substack and Discord (Pinky Promise Club)
- Brand voice: direct, warm, real, "big sister who figures things out publicly" — NEVER preachy
- Her story right now: graduating college (Barrett Honors, ASU), just got her dream role as AI Integration Specialist at a major real estate franchise, building her clothing brand Vixens N Darlings, incoming MS student at Thunderbird focusing on AI
- She's in a massive life transition — graduating, new job, moving, new grad program all at once

Content Pillars:
1. Mentor Minutes — wisdom from mentors/YPO, lessons learned
2. Fork in the Road — real decisions she's making in real time (relatable life transitions)
3. Unapologetically Loud — confidence, ambition, owning your voice as a young woman
4. Brand in Progress — building VND publicly (behind the scenes, real talk)
5. The Come-Up — career moves, opportunities, how she got here
6. Behind the Role — NEW: documenting the REI AI Integration Specialist journey publicly (most differentiated content right now)

What makes her content different: she doesn't perform having it together. She figures it out on camera and brings her audience with her. The transition from "student + café manager" to "AI specialist + grad student + brand founder" is the story RIGHT NOW.

Platform specs:
- TikTok: hooks in first 2 seconds, 60-90 second scripts, conversational, trending audio awareness
- Substack: longer form, 400-800 words, personal essay style, ends with a question for readers
- Discord (Pinky Promise Club): community prompts, short, vulnerable, discussion-starting`;

  let systemPrompt = '';
  let userMessage = '';

  if (mode === 'trending') {
    systemPrompt = `${BRAND_CONTEXT}

You have web search. Search for:
1. What's trending on TikTok right now (sounds, formats, topics)
2. What's happening in AI news this week that a 22-year-old professional would care about
3. Any viral career or life transition content formats right now

Then generate 5 content ideas that ride current trends but are authentic to Tiffany's story.

Return JSON array of ideas:
[{
  "pillar": "pillar name",
  "platform": "tiktok|substack|discord",
  "hook": "opening line or hook",
  "concept": "2-3 sentence description of the content",
  "why_now": "why this is timely/trending right now",
  "trend_angle": "the specific trend or format it leverages"
}]

Return ONLY the JSON array.`;
    userMessage = `Today is ${today}. Find what's trending and generate 5 content ideas for Tiffany.`;

  } else if (mode === 'generate_ideas') {
    systemPrompt = `${BRAND_CONTEXT}

Generate 6 content ideas based on the topic or context provided. Mix platforms.

Return JSON array:
[{
  "pillar": "pillar name",
  "platform": "tiktok|substack|discord",
  "hook": "opening hook — first words out of her mouth or email subject line",
  "concept": "2-3 sentence description",
  "angle": "the specific emotional or narrative angle",
  "cta": "what you want the audience to do or feel"
}]

Return ONLY the JSON array.`;
    userMessage = topic || 'Generate ideas based on what\'s happening in my life right now';

  } else if (mode === 'write_script') {
    systemPrompt = `${BRAND_CONTEXT}

Write a complete TikTok script for the topic provided. 

Format:
{
  "hook": "first 2-3 seconds — MUST stop the scroll immediately",
  "script": "full word-for-word script, 60-90 seconds when spoken at normal pace. Use line breaks to show natural pauses. Include [action] notes for visual cues.",
  "caption": "TikTok caption with 3-5 hashtags",
  "pillar": "which pillar this falls under",
  "cta": "end call to action"
}

Her voice: talks like she's texting her best friend but smarter. Starts mid-thought. No "hey guys." No fake enthusiasm. Real.

Return ONLY the JSON.`;
    userMessage = topic || 'Write a script about my life transition right now';

  } else if (mode === 'write_newsletter') {
    systemPrompt = `${BRAND_CONTEXT}

Write a complete Substack newsletter edition.

Format:
{
  "subject": "email subject line — personal, specific, makes you want to open it",
  "preview_text": "25-word preview text",
  "body": "full newsletter, 400-600 words, personal essay style. Use short paragraphs. Include a personal story or specific moment. End with a question for readers.",
  "pillar": "which pillar this falls under"
}

Voice: like a journal entry she decided to send. Honest. Specific. Not advice — just her figuring it out.

Return ONLY the JSON.`;
    userMessage = topic || 'Write a newsletter about my current life chapter';
  }

  const useWebSearch = mode === 'trending';

  try {
    const body = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage + (context ? `\n\nExtra context: ${context}` : '') }],
    };

    if (useWebSearch) {
      body.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    const textBlocks = (data.content || []).filter(b => b.type === 'text');
    const rawText = textBlocks.map(b => b.text).join('');

    let result;
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      const match = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
      result = match ? JSON.parse(match[0]) : null;
    } catch {
      return Response.json({ ok: false, error: 'Parse failed', raw: rawText });
    }

    // Save to Notion Content Bank if it's a script or newsletter
    let notionUrl = null;
    if ((mode === 'write_script' || mode === 'write_newsletter') && result) {
      const title = mode === 'write_script'
        ? `[TikTok] ${result.hook?.slice(0, 60) || topic}`
        : `[Newsletter] ${result.subject || topic}`;

      const notionRes = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${NOTION_API_KEY}`,
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({
          parent: { database_id: CONTENT_DB_ID },
          icon: { emoji: mode === 'write_script' ? '🎬' : '📨' },
          properties: {
            Name: { title: [{ text: { content: title } }] },
          },
        }),
      });

      const notionData = await notionRes.json();
      notionUrl = notionData.url;
    }

    return Response.json({ ok: true, mode, result, notion_url: notionUrl });

  } catch (err) {
    console.error('Content agent error:', err);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
