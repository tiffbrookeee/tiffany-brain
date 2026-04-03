import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { messages } = await req.json();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: 'You are a creative content strategist for Tuned In With Tiff — a personal brand focused on business, wellness, and lifestyle. Help create engaging hooks, captions, scripts, and content ideas tailored for Instagram Reels, TikTok, and podcasts. Be concise, punchy, and trend-aware.',
        messages,
      }),
    });

    const data = await res.json();
    const reply = data?.content?.[0]?.text ?? 'No response';
    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
