export const dynamic = 'force-dynamic';
const NOTION_TOKEN = process.env.NOTION_API_KEY;
export async function GET() {
  try {
    const searchRes = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${NOTION_TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Content Bank', filter: { value: 'database', property: 'object' } }),
    });
    const searchData = await searchRes.json();
    const db = searchData.results?.[0];
    if (!db) return NextResponse.json({ items: [] });
    const res = await fetch(`https://api.notion.com/v1/databases/${db.id}/query`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${NOTION_TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_size: 50 }),
    });
    const data = await res.json();
    const items = (data.results ?? []).map(p => ({
      id: p.id,
      title: p.properties?.Title?.title?.[0]?.plain_text ?? 'Untitled',
      domain: p.properties?.Domain?.select?.name ?? '',
      platform: p.properties?.Platform?.select?.name ?? '',
      status: p.properties?.Status?.select?.name ?? 'Idea',
      hook: p.properties?.Hook?.rich_text?.[0]?.plain_text ?? '',
    }));
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
export async function POST(req) {
  try {
    const { title, domain, platform, hook, body: bodyText } = await req.json();
    const searchRes = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${NOTION_TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Content Bank', filter: { value: 'database', property: 'object' } }),
    });
    const searchData = await searchRes.json();
    const db = searchData.results?.[0];
    if (!db) return NextResponse.json({ error: 'Content Bank database not found in Notion' }, { status: 404 });
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${NOTION_TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parent: { database_id: db.id },
        properties: {
          Title: { title: [{ text: { content: title || 'New Content Idea' } }] },
          Domain: { select: { name: domain || 'TunedInWithTiff' } },
          Platform: { select: { name: platform || 'Instagram' } },
          Status: { select: { name: 'Idea' } },
          Hook: { rich_text: [{ text: { content: hook || '' } }] },
        },
        children: bodyText ? [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: bodyText } }] } }] : [],
      }),
    });
    const data = await res.json();
    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
