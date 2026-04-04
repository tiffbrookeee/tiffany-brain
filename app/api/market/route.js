import { NextResponse } from 'next/server';

const TICKERS = ['SPY', 'QQQ', 'BTC-USD', 'XRP-USD', 'NVDA', 'TSLA'];

async function fetchTicker(ticker) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 300 },
    });
    const data = await res.json();
    const quote = data?.chart?.result?.[0]?.meta;
    if (!quote) return null;
    const price = quote.regularMarketPrice ?? 0;
    const prev = quote.chartPreviousClose ?? quote.previousClose ?? price;
    const change = price - prev;
    const changePct = prev ? ((change / prev) * 100).toFixed(2) : '0.00';
    return { ticker, price: price.toFixed(2), change: change.toFixed(2), changePct };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const results = await Promise.all(TICKERS.map(fetchTicker));
    return NextResponse.json(results.filter(Boolean));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
