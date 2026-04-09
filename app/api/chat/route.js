import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function POST(req) {
    try {
          const body = await req.json();
          const messages = body?.messages ?? [];
          const apiKey = process.env.ANTHROPIC_API_KEY;
          if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 500 });
          if (!messages.length) return NextResponse.json({ error: 'No messages' }, { status: 400 });
          const res = await fetch('https://api.anthropic.com/v1/messages', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
                  body: JSON.stringify({
                            model: 'claude-haiku-4-5-20251001',
                            max_tokens: 1024,
                            system: "You are Tiffany's second brain assistant. Tiffany works across 5 domains: YPO (mentorship with Justin, manages EO and YNG mentees, annual gala, key people: Sergei EO chair, Tarina YNG chair, mentors Noah/Mike/Steve/Mark), Insurance (life insurance agent, boss is Davin, tracks clients and policies), Cafe (works Mon and Thu mornings, boss is Philip), Vixens N Darlings aka VND (her own company, her main brand and project, pitch competition coming up), TunedInWithTiff (personal brand and social media, hooks-first value content, science-backed education series, BTS founder content). Help her stay organized, brainstorm content, prepare for her pitch, draft emails, or anything else. Be direct and personal.",
                            messages: messages,
                  }),
          });
          const data = await res.json();
          if (!res.ok) return NextResponse.json({ error: 'API error: ' + (data?.error?.message ?? JSON.stringify(data)) }, { status: res.status });
          const reply = data?.content?.[0]?.text;
          if (!reply) return NextResponse.json({ error: 'Empty response', debug: data }, { status: 500 });
          return NextResponse.json({ reply });
    } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
