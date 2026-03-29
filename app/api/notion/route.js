import { NextResponse } from 'next/server';

const NOTION_API = 'https://api.notion.com/v1';
const DB = {
  tasks: 'd0df52150e60480b991ea8d875de5c9e',
  content: '0f11c6acb31f4d32bfb730c060576c61',
};
const HEADERS = {
  'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
  'Content-Type': 'application/json',
  'Notion-Version': '2022-06-28',
};

async function queryDB(dbId, filter, sorts = []) {
  const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
    method: 'POST', headers: HEADERS,
    body: JSON.stringify({ filter, sorts, page_size: 50 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data.results;
}

async function createPage(parent_id, properties) {
  const res = await fetch(`${NOTION_API}/pages`, {
    method: 'POST', headers: HEADERS,
    body: JSON.stringify({ parent: { database_id: parent_id }, properties }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
}

async function patchPage(pageId, properties) {
  const res = await fetch(`${NOTION_API}/pages/${pageId}`, {
    method: 'PATCH', headers: HEADERS,
    body: JSON.stringify({ properties }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
}

// ── MAPPERS ──────────────────────────────────────────────────────────────────
function mapTask(page) {
  return {
    id: page.id,
    title: page.properties.Task?.title?.[0]?.plain_text || 'Untitled',
    status: page.properties.Status?.select?.name || 'To Do',
    priority: page.properties.Priority?.select?.name || 'Medium',
    area: page.properties.Area?.select?.name || null,
    due: page.properties.Due?.date?.start || null,
    done: page.properties.Status?.select?.name === 'Done',
    notionUrl: page.url,
    source: 'notion',
  };
}

function mapContent(page) {
  return {
    id: page.id,
    title: page.properties['Content Title']?.title?.[0]?.plain_text || 'Untitled',
    hook: page.properties.Hook?.rich_text?.[0]?.plain_text || '',
    notes: page.properties.Notes?.rich_text?.[0]?.plain_text || '',
    status: page.properties.Status?.select?.name || 'Idea',
    type: page.properties.Type?.select?.name || null,
    platforms: page.properties.Platform?.multi_select?.map(p => p.name) || [],
    postDate: page.properties['Post Date']?.date?.start || null,
    notionUrl: page.url,
    source: 'notion',
  };
}

// ── ROUTE HANDLER ─────────────────────────────────────────────────────────────
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'tasks';

  try {
    if (type === 'tasks') {
      const pages = await queryDB(DB.tasks,
        { property: 'Status', select: { does_not_equal: 'Done' } },
        [{ property: 'Due', direction: 'ascending' }]
      );
      return NextResponse.json({ tasks: pages.map(mapTask) });
    }

    if (type === 'content') {
      const pages = await queryDB(DB.content,
        { property: 'Status', select: { does_not_equal: 'Posted' } },
        [{ property: 'Post Date', direction: 'ascending' }]
      );
      return NextResponse.json({ content: pages.map(mapContent) });
    }

    if (type === 'all') {
      const [taskPages, contentPages] = await Promise.all([
        queryDB(DB.tasks,
          { property: 'Status', select: { does_not_equal: 'Done' } },
          [{ property: 'Due', direction: 'ascending' }]
        ),
        queryDB(DB.content,
          { property: 'Status', select: { does_not_equal: 'Posted' } },
          [{ property: 'Post Date', direction: 'ascending' }]
        ),
      ]);
      return NextResponse.json({
        tasks: taskPages.map(mapTask),
        content: contentPages.map(mapContent),
      });
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { type } = body;

    if (type === 'task') {
      const { title, priority = 'Medium', area, due } = body;
      const properties = {
        Task: { title: [{ text: { content: title } }] },
        Status: { select: { name: 'To Do' } },
        Priority: { select: { name: priority } },
      };
      if (area) properties.Area = { select: { name: area } };
      if (due) properties.Due = { date: { start: due } };

      const page = await createPage(DB.tasks, properties);
      return NextResponse.json({ task: mapTask(page) });
    }

    if (type === 'content') {
      const { title, hook, notes, status = 'Idea', contentType, platforms = [] } = body;
      const properties = {
        'Content Title': { title: [{ text: { content: title } }] },
        Status: { select: { name: status } },
      };
      if (hook) properties.Hook = { rich_text: [{ text: { content: hook } }] };
      if (notes) properties.Notes = { rich_text: [{ text: { content: notes } }] };
      if (contentType) properties.Type = { select: { name: contentType } };
      if (platforms.length) properties.Platform = { multi_select: platforms.map(p => ({ name: p })) };

      const page = await createPage(DB.content, properties);
      return NextResponse.json({ content: mapContent(page) });
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { pageId, type, status, priority } = await request.json();

if (type === 'task') {
  const properties = {};
  if (status) properties.Status = { select: { name: status } };
  if (priority) properties.Priority = { select: { name: priority } };
  await patchPage(pageId, properties);
} else if (type === 'content') {
  await patchPage(pageId, { Status: { select: { name: status } } });
}

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
