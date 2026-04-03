import { NextResponse } from 'next/server';

const TICKERS = ['SPY', 'QQQ', 'BTC-USD', 'NVDA', 'AAPL', 'TSLA'];

export async function GET() {
  try {
    const results = await Promise.all(
      TICKERS.map(async (ticker) => {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=2d`;
          const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          const data = await res.json();
          const meta = data?.chart?.result?.[0]?.meta;
          const price = meta?.regularMarketPrice ?? 0;
          const prev = meta?.chartPreviousClose ?? price;
          const change = price - prev;
          const changePct = prev ? (change / prev) * 100 : 0;
          return { ticker, price: price.toFixed(2), change: change.toFixed(2), changePct: changePct.toFixed(2) };
        } catch {
          return { ticker, price: 'N/A', change: '0', changePct: '0' };
        }
      })
    );
    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
