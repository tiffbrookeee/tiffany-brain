import { NextResponse } from 'next/server';

async function fetchRSS(url, sourceName) {
  try {
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&count=6`;
    const r = await fetch(apiUrl, { next: { revalidate: 3600 } });
    if (!r.ok) return [];
    const data = await r.json();
    if (data.status !== 'ok') return [];
    return (data.items || []).map((item) => ({
      title: (item.title || '').replace(/<[^>]+>/g, '').trim(),
      url: item.link || '',
      source: sourceName || data.feed?.title || '',
      published: item.pubDate || '',
    }));
  } catch {
    return [];
  }
}

export async function GET() {
  const [aiA, aiB, mktA, mktB, worldA, worldB] = await Promise.allSettled([
    fetchRSS('https://venturebeat.com/ai/feed/', 'VentureBeat AI'),
    fetchRSS(
      'https://techcrunch.com/category/artificial-intelligence/feed/',
      'TechCrunch AI'
    ),
    fetchRSS(
      'https://feeds.feedburner.com/entrepreneur/latest',
      'Entrepreneur'
    ),
    fetchRSS(
      'https://www.marketingweek.com/feed/',
      'Marketing Week'
    ),
    fetchRSS('https://feeds.bbci.co.uk/news/rss.xml', 'BBC News'),
    fetchRSS(
      'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
      'New York Times'
    ),
  ]);

  function val(settled) {
    return settled.status === 'fulfilled' ? settled.value : [];
  }

  const seen = new Set();
  function dedup(items) {
    return items.filter((i) => {
      const key = i.title.toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  const ai = dedup([...val(aiA), ...val(aiB)]).slice(0, 6);
  const marketing = dedup([...val(mktA), ...val(mktB)]).slice(0, 6);
  const world = dedup([...val(worldA), ...val(worldB)]).slice(0, 6);

  return NextResponse.json({ ai, marketing, world });
}
