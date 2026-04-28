// app/api/rei-research/route.js
// Takes a research question, searches the web, synthesizes findings,
// and saves a structured note to the REI Knowledge Base in Notion.

const REI_HUB_PAGE_ID = '77ab04cd-e896-456b-b373-896f06920fd2';
const NOTION_API_KEY = process.env.NOTION_API_KEY;

export async function POST(req) {
  const { question } = await req.json();
  if (!question?.trim()) return Response.json({ ok: false, error: 'No question provided' });

  const today = new Date().toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  const systemPrompt = `You are Tiffany LaVoie's REI research assistant. She is the new AI Integration Specialist at Realty Executives International — a major real estate franchise headquartered in Scottsdale, AZ.

Her job is to embed AI across all departments and build an AI curriculum for thousands of real estate agents nationwide.

When given a research question:
1. Use web_search to find the most current, relevant information (search at least 3 times with different angles)
2. Synthesize what you find into a structured research note

Return your findings as JSON with this exact structure:
{
  "title": "Short descriptive title for this research note",
  "summary": "3-4 sentence executive summary of what you found — written for someone who needs to act on this",
  "key_findings": ["finding 1", "finding 2", "finding 3", "finding 4"],
  "rei_applications": ["How REI could apply this specifically — 2-3 concrete ideas"],
  "tools_mentioned": ["Any specific AI tools, platforms, or products named"],
  "sources": ["source name + URL"],
  "next_action": "One specific thing Tiffany should do with this research"
}

Return ONLY the JSON. No preamble.`;

  try {
    // Step 1: Research with web search
    const researchRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: systemPrompt,
        messages: [{ role: 'user', content: question }],
      }),
    });

    const researchData = await researchRes.json();
    const textBlocks = (researchData.content || []).filter(b => b.type === 'text');
    const rawText = textBlocks.map(b => b.text).join('');

    let note;
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      note = match ? JSON.parse(match[0]) : null;
    } catch {
      return Response.json({ ok: false, error: 'Parse failed', raw: rawText });
    }

    if (!note) return Response.json({ ok: false, error: 'No structured output', raw: rawText });

    // Step 2: Save to Notion under REI hub
    const notionContent = `## ${note.summary}

---

### Key Findings
${note.key_findings.map(f => `- ${f}`).join('\n')}

### How REI Can Apply This
${note.rei_applications.map(a => `- ${a}`).join('\n')}

### Tools & Platforms Mentioned
${note.tools_mentioned?.length ? note.tools_mentioned.map(t => `- ${t}`).join('\n') : '- None specifically mentioned'}

### Sources
${note.sources?.map(s => `- ${s}`).join('\n') || '- See web search results'}

### Next Action
> ${note.next_action}

---
*Researched: ${today} | Query: "${question}"*`;

    const notionRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { page_id: REI_HUB_PAGE_ID },
        icon: { emoji: '🔍' },
        properties: {
          title: { title: [{ text: { content: `[Research] ${note.title}` } }] },
        },
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: notionContent } }],
            },
          },
        ],
      }),
    });

    const notionData = await notionRes.json();

    return Response.json({
      ok: true,
      note,
      notion_url: notionData.url,
      notion_id: notionData.id,
    });

  } catch (err) {
    console.error('REI research error:', err);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
