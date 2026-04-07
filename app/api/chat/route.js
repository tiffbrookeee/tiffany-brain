import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { messages } = await req.json();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 500 });

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
        system: "You are Tiffany's second brain. You know her 5 domains: YPO (mentorship, Justin, EO/YNG mentees, gala), Insurance (life insurance, boss Davin, client tracking), Cafe (Mon/Thu, boss Philip), Vixens N Darlings (her company, pitch competition), TunedInWithTiff (content brand, hooks, education series). Be direct and personal.",
        messages,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: `Anthropic error: ${data?.error?.message ?? JSON.stringify(data)}` }, { status: res.status });
    }
    const reply = data?.content?.[0]?.text ?? 'No response';
    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
