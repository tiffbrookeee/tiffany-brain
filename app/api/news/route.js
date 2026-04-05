import { NextResponse } from 'next/server';

async function fetchRSS(url, sourceName) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TiffanyBrain/1.0; +https://tiffany-brain.vercel.app)' },
      next: { revalidate: 3600 },
    });
    if (!r.ok) return [];
    const xml = await r.text();
    const items = [];
    const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let m;
    while ((m = itemRe.exec(xml)) !== null && items.length < 6) {
      const b = m[1];
      const title = (b.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1] || '';
      const link = (b.match(/<link>([^<]+)<\/link>/) || b.match(/<link[^/]*\/?>/) || [])[1] || '';
      const pub = (b.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/) || [])[1] || '';
      const clean = title.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
      if (clean) items.push({ title: clean, url: link.trim(), source: sourceName, published: pub.trim() });
    }
    return items;
  } catch { return []; }
}

export async function GET() {
  const [aiA, aiB, mktA, mktB, worldA, worldB] = await Promise.allSettled([
    fetchRSS('https://venturebeat.com/ai/feed/', 'VentureBeat AI'),
    fetchRSS('https://techcrunch.com/category/artificial-intelligence/feed/', 'TechCrunch'),
    fetchRSS('https://feeds.feedburner.com/entrepreneur/latest', 'Entrepreneur'),
    fetchRSS('https://feeds.feedburner.com/fastcompany/headlines', 'Fast Company'),
    fetchRSS('https://feeds.bbci.co.uk/news/rss.xml', 'BBC News'),
    fetchRSS('https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', 'New York Times'),
  ]);
  function val(s) { return s.status === 'fulfilled' ? s.value : []; }
  const seen = new Set();
  function dedup(arr) {
    return arr.filter((i) => {
      const k = i.title.toLowerCase().trim();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  return NextResponse.json({
    ai: dedup([...val(aiA), ...val(aiB)]).slice(0, 6),
    marketing: dedup([...val(mktA), ...val(mktB)]).slice(0, 6),
    world: dedup([...val(worldA), ...val(worldB)]).slice(0, 6),
  });
}
