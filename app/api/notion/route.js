import { NextResponse } from 'next/server';

const NOTION_API = 'https://api.notion.com/v1';
const DATABASE_ID = 'd0df52150e60480b991ea8d875de5c9e';
const HEADERS = {
  'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
  'Content-Type': 'application/json',
  'Notion-Version': '2022-06-28',
};

// GET — fetch all non-done tasks
export async function GET() {
  try {
    const res = await fetch(`${NOTION_API}/databases/${DATABASE_ID}/query`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        filter: {
          property: 'Status',
          select: { does_not_equal: 'Done' }
        },
        sorts: [{ property: 'Due', direction: 'ascending' }],
        page_size: 50,
      }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.message }, { status: res.status });

    const tasks = data.results.map(page => ({
      id: page.id,
      title: page.properties.Task?.title?.[0]?.plain_text || 'Untitled',
      status: page.properties.Status?.select?.name || 'To Do',
      priority: page.properties.Priority?.select?.name || 'Medium',
      area: page.properties.Area?.select?.name || null,
      due: page.properties.Due?.date?.start || null,
      done: page.properties.Status?.select?.name === 'Done',
      notionUrl: page.url,
    }));

    return NextResponse.json({ tasks });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — create a new task
export async function POST(request) {
  try {
    const { title, priority = 'Medium', area, due } = await request.json();

    const properties = {
      Task: { title: [{ text: { content: title } }] },
      Status: { select: { name: 'To Do' } },
      Priority: { select: { name: priority } },
    };

    if (area) properties.Area = { select: { name: area } };
    if (due) properties.Due = { date: { start: due } };

    const res = await fetch(`${NOTION_API}/pages`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        parent: { database_id: DATABASE_ID },
        properties,
      }),
    });

    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.message }, { status: res.status });

    return NextResponse.json({
      task: {
        id: data.id,
        title,
        status: 'To Do',
        priority,
        area: area || null,
        due: due || null,
        done: false,
        notionUrl: data.url,
      }
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — mark task done / update status
export async function PATCH(request) {
  try {
    const { taskId, status } = await request.json();

    const res = await fetch(`${NOTION_API}/pages/${taskId}`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({
        properties: {
          Status: { select: { name: status } },
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.message }, { status: res.status });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
