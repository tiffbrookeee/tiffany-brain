import { NextResponse } from 'next/server';

const FEEDS = {
  events: 'https://feeds.bbci.co.uk/news/rss.xml',
  ai: 'https://techcrunch.com/feed/',
  business: 'https://www.entrepreneur.com/latest.rss',
};

async function parseFeed(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 1800 } });
    const text = await res.text();
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(text)) !== null && items.length < 5) {
      const item = match[1];
      const title = (/<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(item) || /<title>(.*?)<\/title>/.exec(item))?.[1] ?? '';
      const link = (/<link>(.*?)<\/link>/.exec(item) || /<link\s[^>]*href="([^"]+)"/.exec(item))?.[1] ?? '';
      const desc = (/<description><!\[CDATA\[(.*?)\]\]><\/description>/.exec(item) || /<description>(.*?)<\/description>/.exec(item))?.[1] ?? '';
      const pubDate = (/<pubDate>(.*?)<\/pubDate>/.exec(item))?.[1] ?? '';
      if (title) items.push({ title: title.trim(), link: link.trim(), desc: desc.replace(/<[^>]+>/g, '').trim().slice(0, 120), pubDate });
    }
    return items;
  } catch { return []; }
}

export async function GET() {
  try {
    const [events, ai, business] = await Promise.all([parseFeed(FEEDS.events), parseFeed(FEEDS.ai), parseFeed(FEEDS.business)]);
    return NextResponse.json({ events, ai, business });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
