// app/api/smart-dump/route.js
// Categorizes brain dump text and routes to the correct Notion lane

const NOTION_API_KEY = process.env.NOTION_API_KEY;

// Your Notion database IDs
const DBS = {
  tasks:   'd0df52150e60480b991ea8d875de5c9e', // Master Tasks
  content: '0f11c6acb31f4d32bfb730c060576c61', // Content Bank
};

export async function POST(req) {
  const { content } = await req.json();
  if (!content?.trim()) return Response.json({ ok: false, error: 'Empty dump' });

  // Step 1: Ask Claude to categorize and structure the dump
  const classifyRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `You are Tiffany's SmartDump categorizer. She brain-dumps raw thoughts and you structure them.

Her 6 life lanes: REI (AI Integration Specialist role), VND (Vixens N Darlings brand), Thunderbird (MS program), Content (@tunedinwithtiff TikTok/Substack), Life (move/health/money), YPO+Cafe.

Analyze the dump and extract discrete items. For each item output JSON only — no other text.

Return a JSON array where each item has:
- "text": clean, actionable version of the item (1 sentence)
- "type": one of "task" | "content_idea" | "note"  
- "lane": one of "REI" | "VND" | "Thunderbird" | "Content" | "Life" | "YPO_Cafe" | "General"
- "priority": one of "high" | "medium" | "low"
- "notion_db": one of "tasks" | "content" based on type (content_ideas go to content, everything else to tasks)

Return ONLY the JSON array. No preamble.`,
      messages: [{ role: 'user', content }],
    }),
  });

  const classifyData = await classifyRes.json();
  const rawText = classifyData.content?.[0]?.text || '[]';

  let items;
  try {
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    items = JSON.parse(cleaned);
  } catch {
    return Response.json({ ok: false, error: 'Parse failed', raw: rawText });
  }

  // Step 2: Push each item to Notion
  const results = await Promise.all(items.map(async (item) => {
    const dbId = item.notion_db === 'content' ? DBS.content : DBS.tasks;

    // Build properties based on which DB
    let properties;
    if (item.notion_db === 'content') {
      properties = {
        'Name': { title: [{ text: { content: item.text } }] },
      };
    } else {
      properties = {
        'Task Name': { title: [{ text: { content: item.text } }] },
      };
    }

    const notionRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { database_id: dbId },
        properties,
      }),
    });

    const notionData = await notionRes.json();
    return { item: item.text, lane: item.lane, db: item.notion_db, ok: notionRes.ok, id: notionData.id };
  }));

  return Response.json({ ok: true, processed: results.length, items: results });
}
