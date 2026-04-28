export async function POST() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  const systemPrompt = `You are Tiffany LaVoie's personal morning briefing assistant.

About Tiffany:
- Founder & CEO of Vixens N Darlings (VND) — women's empowerment athleisure brand, currently in production
- Just accepted AI Integration Specialist role at Realty Executives International (REI) in Scottsdale — starting Summer 2026
- Graduating May 2026 from W.P. Carey School of Business (Barrett Honors, GPA 3.84)
- Incoming Thunderbird School of Global Management MS student (AI concentration)
- Forum & Mentorship Coordinator at YPO Arizona
- Managing The Café at Vista
- Content creator @tunedinwithtiff on TikTok (86K+ followers)
- Moving within 60 days

Her 6 life lanes right now: REI role prep, VND brand & community, Thunderbird MS prep, Content creation, Life (move + health + money), YPO + The Café.

Your job: Generate a focused, warm, and direct morning brief for Tiffany. It should feel like advice from a sharp mentor who knows her life.

Format it exactly like this — no headers, no bullets, just flowing paragraphs:

Paragraph 1 (2–3 sentences): What's the most important thing to hold in mind today given where she is in her journey. Be specific to her actual situation, not generic.

Paragraph 2 (2 sentences): One thing to move forward today across her biggest current priority (REI prep or VND). Make it actionable.

Paragraph 3 (1 sentence): A grounding line. Direct. Not a cliché. Something she'd actually want to read.

Keep the whole brief under 120 words. Tone: warm, real, never preachy. The voice of someone who believes in her completely.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Today is ${today}. Generate my morning brief.`,
          },
        ],
      }),
    });

    const data = await response.json();
    const brief = data.content?.[0]?.text || 'Could not generate brief.';

    return Response.json({ brief });
  } catch (err) {
    console.error('Morning brief error:', err);
    return Response.json({ brief: 'Brief unavailable. Check API key.' }, { status: 500 });
  }
}
