import { NextResponse } from 'next/server';

const NOTION_API = 'https://api.notion.com/v1';
const DB = {
  tasks: process.env.NOTION_TASKS_DATABASE_ID,
  content: '0f11c6acb31f4d32bfb730c060576c61',
};
const HEADERS = {
  'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
  'Content-Type': 'application/json',
  'Notion-Version': '2022-06-28',
};

async function queryDB(dbId, filter, sorts = []) {
  const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ filter, sorts, page_size: 50 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data.results;
}

async function createPage(parent_id, properties) {
  const res = await fetch(`${NOTION_API}/pages`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ parent: { database_id: parent_id }, properties }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
}

async function patchPage(pageId, properties) {
  const res = await fetch(`${NOTION_API}/pages/${pageId}`, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify({ properties }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
}

// ── MAPPERS ────────────────────────────────────────────────────────────────────
function mapTask(page) {
  const props = page.properties;
  return {
    id: page.id,
    title: props.Task?.title?.[0]?.plain_text || props.Name?.title?.[0]?.plain_text || 'Untitled',
    status: props.Status?.select?.name || props.Status?.status?.name || 'To Do',
    priority: props.Priority?.select?.name || null,
    area: props.Bucket?.select?.name || props.Area?.select?.name || props.Domain?.select?.name || null,
    due: props.Due?.date?.start || null,
    done: false,
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
      const pages = await queryDB(
        DB.tasks,
        { property: 'Status', select: { equals: 'To Do' } },
        []
      );
      return NextResponse.json({ tasks: pages.map(mapTask) });
    }

    if (type === 'content') {
      const pages = await queryDB(
        DB.content,
        { property: 'Status', select: { does_not_equal: 'Posted' } },
        [{ property: 'Post Date', direction: 'ascending' }]
      );
      return NextResponse.json({ content: pages.map(mapContent) });
    }

    if (type === 'all') {
      const [taskPages, contentPages] = await Promise.all([
        queryDB(
          DB.tasks,
          { property: 'Status', select: { equals: 'To Do' } },
          []
        ),
        queryDB(
          DB.content,
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
      const { title, area, due } = body;
      const properties = {
        Task: { title: [{ text: { content: title } }] },
        Status: { select: { name: 'To Do' } },
      };
      if (area) properties.Bucket = { select: { name: area } };
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
    const { pageId, taskId, status } = await request.json();
    const id = pageId || taskId;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // Try to mark as Done; fall back to archiving if Done isn't a valid status option
    try {
      await patchPage(id, { Status: { select: { name: status || 'Done' } } });
    } catch {
      const res = await fetch(`${NOTION_API}/pages/${id}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify({ archived: true }),
      });
      if (!res.ok) throw new Error('Could not complete task');
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
