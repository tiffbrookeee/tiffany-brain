import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
const NOTION_TOKEN = process.env.NOTION_API_KEY;
const NOTION_TASKS_DB = process.env.NOTION_TASKS_DATABASE_ID;
export async function GET() {
    try {
          const res = await fetch('https://api.notion.com/v1/databases/' + NOTION_TASKS_DB + '/query', {
                  method: 'POST',
                  headers: { 'Authorization': 'Bearer ' + NOTION_TOKEN, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filter: { property: 'Status', status: { does_not_equal: 'Done' } }, page_size: 20 }),
                });
          const data = await res.json();
          const tasks = (data.results ?? []).map(p => ({
                  id: p.id,
                  title: p.properties?.Name?.title?.[0]?.plain_text ?? p.properties?.Task?.title?.[0]?.plain_text ?? 'Untitled',
                  status: p.properties?.Status?.status?.name ?? p.properties?.Status?.select?.name ?? 'Open',
                  domain: p.properties?.Domain?.select?.name ?? '',
                }));
          return NextResponse.json({ tasks });
        } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
        }
  }
export async function PATCH(req) {
    try {
          const { taskId } = await req.json();
          const res = await fetch('https://api.notion.com/v1/pages/' + taskId, {
                  method: 'PATCH',
                  headers: { 'Authorization': 'Bearer ' + NOTION_TOKEN, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
                  body: JSON.stringify({ properties: { Status: { status: { name: 'Done' } } } }),
                });
          const data = await res.json();
          if (!res.ok) return NextResponse.json({ error: data?.message }, { status: res.status });
          return NextResponse.json({ success: true });
        } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
        }
  }
