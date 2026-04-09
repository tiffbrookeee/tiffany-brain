import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function POST(req) {
  try {
    const { messages } = await req.json();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 500 });
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: `You are Tiffany's AI content strategist for two brands:
- TunedInWithTiff: personal brand. Pillars: hooks-first, science-backed education, value-driven. Formats: education series, BTS founder, GRWM with knowledge voiceover. Platforms: Instagram Reels, TikTok.
- Vixens N Darlings (VND): her fashion/lifestyle company. Pitch competition coming up. Aesthetic: bold, feminine, entrepreneurial.
Always lead with a strong hook. Keep it punchy and shareable. Tie to real value or science when relevant. Give multiple options. Be trend-aware and direct.`,
        messages,
      }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data?.error?.message ?? 'API error' }, { status: res.status });
    return NextResponse.json({ reply: data?.content?.[0]?.text ?? '' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
