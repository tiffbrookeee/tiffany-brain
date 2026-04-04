import { NextResponse } from 'next/server';

const FEEDS = {
  events: 'https://feeds.bbci.co.uk/news/rss.xml',
  crypto: 'https://cointelegraph.com/rss',
  business: 'https://www.entrepreneur.com/latest.rss',
};

async function parseFeed(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 1800 },
    });
    const text = await res.text();
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(text)) !== null && items.length < 5) {
      const item = match[1];
      const title = (/<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(item) ||
        /<title>(.*?)<\/title>/.exec(item))?.[1] ?? '';
      const link = (/<link>(.*?)<\/link>/.exec(item) ||
        /<link\s[^>]*href="([^"]+)"/.exec(item))?.[1] ?? '';
      const pubDate = (/<pubDate>(.*?)<\/pubDate>/.exec(item))?.[1] ?? '';
      if (title && title.length > 5) {
        items.push({
          title: title.trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
          link: link.trim(),
          pubDate,
        });
      }
    }
    return items;
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const [events, crypto, business] = await Promise.all([
      parseFeed(FEEDS.events),
      parseFeed(FEEDS.crypto),
      parseFeed(FEEDS.business),
    ]);
    return NextResponse.json({ events, crypto, business });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
