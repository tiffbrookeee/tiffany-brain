import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function POST(req) {
  try {
    const { emailText } = await req.json();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 500 });
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: 'You extract action items from emails. Return ONLY a valid JSON array, no other text. Each item: { "action": string, "person": string, "dueDate": string, "priority": "high"|"medium"|"low" }.',
        messages: [{ role: 'user', content: `Extract all action items from this email:\n\n${emailText}` }],
      }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data?.error?.message }, { status: res.status });
    const text = data?.content?.[0]?.text ?? '[]';
    let actions = [];
    try { actions = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] ?? '[]'); } catch { actions = []; }
    return NextResponse.json({ actions });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
