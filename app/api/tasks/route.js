import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

const NOTION_TOKEN = process.env.NOTION_API_KEY;
const NOTION_TASKS_DB = process.env.NOTION_TASKS_DATABASE_ID;
const NOTION_API = 'https://api.notion.com/v1';
const HEADERS = {
  'Authorization': 'Bearer ' + NOTION_TOKEN,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
};

export async function GET() {
  try {
    const res = await fetch(NOTION_API + '/databases/' + NOTION_TASKS_DB + '/query', {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        filter: { property: 'Status', select: { equals: 'To Do' } },
        page_size: 50,
      }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.message }, { status: 500 });
    const tasks = (data.results ?? []).map(p => ({
      id: p.id,
      title: p.properties?.Task?.title?.[0]?.plain_text ?? p.properties?.Name?.title?.[0]?.plain_text ?? 'Untitled',
      status: p.properties?.Status?.select?.name ?? 'To Do',
      area: p.properties?.Bucket?.select?.name ?? p.properties?.Domain?.select?.name ?? '',
    }));
    return NextResponse.json({ tasks });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const { taskId } = await req.json();
    if (!taskId) return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });

    // Try marking as Done via select; if that fails, archive the page
    try {
      const res = await fetch(NOTION_API + '/pages/' + taskId, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify({ properties: { Status: { select: { name: 'Done' } } } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
    } catch {
      const res = await fetch(NOTION_API + '/pages/' + taskId, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify({ archived: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        return NextResponse.json({ error: data.message }, { status: res.status });
      }
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
