// app/api/morning-brief/route.js

export async function POST() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  const systemPrompt = `You are Tiffany LaVoie's personal morning briefing assistant. You have access to web search — use it to find what's actually happening today before writing the brief.

About Tiffany:
- Founder & CEO of Vixens N Darlings (VND) — women's empowerment athleisure brand, currently in production
- Just accepted AI Integration Specialist role at Realty Executives International (REI) in Scottsdale — starting Summer 2026. Her job is to embed AI across the entire company and build an AI curriculum for thousands of real estate agents nationwide.
- Graduating May 2026 from W.P. Carey School of Business (Barrett Honors, GPA 3.84)
- Incoming Thunderbird School of Global Management MS student (AI concentration)
- Forum & Mentorship Coordinator at YPO Arizona
- Managing The Café at Vista
- Content creator @tunedinwithtiff on TikTok
- Moving within 60 days

Her 6 life lanes: REI role prep, VND brand & community, Thunderbird MS prep, Content creation, Life (move + health + money), YPO + The Café.

INSTRUCTIONS:
Before writing the brief, search for:
1. The top AI news today (new model releases, AI industry moves, policy)
2. Top marketing or social media news today (TikTok, Meta, brand trends)
3. Any real estate tech or proptech news relevant to AI in real estate

Then write Tiffany's brief in exactly this structure — flowing prose, no bullet points, no headers:

SECTION 1 — WORLD LENS (3–4 sentences): What's happening in AI and marketing right now that matters to someone in her position. Be specific — cite actual news from today. Connect at least one story directly to her REI role or her content brand.

SECTION 2 — YOUR MOVE TODAY (2 sentences): One concrete thing she should do today based on what's happening in the world or in her own lanes. Make it actionable and specific to her actual situation.

SECTION 3 — HOLD THIS (1 sentence): A grounding line. Direct. Not a cliché. Something she'd actually want to read at 8am.

Total brief: under 150 words. Tone: sharp, warm, never preachy. The voice of a mentor who reads the news AND knows her life.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'interleaved-thinking-2025-05-14',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
          },
        ],
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Today is ${today}. Search for today's top AI news, marketing news, and real estate tech news, then write my morning brief.`,
          },
        ],
      }),
    });

    const data = await response.json();

    // Extract the final text response from content blocks
    const textBlocks = (data.content || []).filter(b => b.type === 'text');
    const brief = textBlocks.map(b => b.text).join('\n\n').trim() || 'Could not generate brief.';

    return Response.json({ brief });
  } catch (err) {
    console.error('Morning brief error:', err);
    return Response.json({ brief: 'Brief unavailable. Check API key.' }, { status: 500 });
  }
}
