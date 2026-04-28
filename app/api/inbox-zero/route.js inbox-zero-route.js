// app/api/inbox-zero/route.js
// Reads unread Gmail, categorizes each email, drafts replies where needed,
// and returns a structured triage — Tiffany reviews and approves before anything sends.

export async function POST() {
  const systemPrompt = `You are Tiffany LaVoie's inbox manager. Your job is to triage her Gmail inbox to zero.

About Tiffany:
- AI Integration Specialist at REI (Realty Executives International) — starting Summer 2026
- Founder of Vixens N Darlings (VND) — athleisure brand
- Forum & Mentorship Coordinator at YPO Arizona (works with Justin Mitchell, mentor Mark McKeever)
- Managing The Café at Vista
- Content creator @tunedinwithtiff
- Incoming Thunderbird MS student

Key people: Justin Mitchell (YPO), Mark McKeever (mentor), Peter (IP attorney/Gavvel), her father Patrick.

For EACH unread email, you must:
1. Read and understand it fully
2. Assign a category: "reply_needed" | "action_needed" | "read_only" | "archive" | "spam"
3. Assign a lane: "REI" | "VND" | "YPO" | "Cafe" | "Content" | "Personal" | "Finance" | "School"
4. Write a 1-sentence summary of what the email is about
5. If category is "reply_needed": draft a complete reply in Tiffany's voice (direct, warm, professional, never preachy)
6. Suggest the action: "draft_ready" | "needs_tiffany_input" | "archive_now" | "unsubscribe"

Her voice for replies: confident, warm, gets to the point fast, signs off as "Tiffany" not "Best regards".

Return results as a JSON array — one object per email. Each object:
{
  "email_id": "thread id",
  "from": "sender name + email",
  "subject": "subject line",
  "summary": "1 sentence summary",
  "category": "reply_needed|action_needed|read_only|archive|spam",
  "lane": "REI|VND|YPO|Cafe|Content|Personal|Finance|School",
  "priority": "high|medium|low",
  "draft_reply": "full reply text if reply_needed, null otherwise",
  "suggested_action": "draft_ready|needs_tiffany_input|archive_now|unsubscribe"
}

Return ONLY the JSON array. No preamble. Process ALL unread emails.`;

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
        max_tokens: 4000,
        tools: [],
        mcp_servers: [
          {
            type: 'url',
            url: 'https://gmailmcp.googleapis.com/mcp/v1',
            name: 'gmail-mcp',
          },
        ],
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: 'Read all my unread emails and triage them. Return the JSON array.',
          },
        ],
      }),
    });

    const data = await response.json();

    // Extract text blocks (Claude's response after using Gmail MCP)
    const textBlocks = (data.content || []).filter(b => b.type === 'text');
    const rawText = textBlocks.map(b => b.text).join('');

    let emails;
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      // Find the JSON array in the response
      const match = cleaned.match(/\[[\s\S]*\]/);
      emails = match ? JSON.parse(match[0]) : [];
    } catch {
      return Response.json({ ok: false, error: 'Parse failed', raw: rawText });
    }

    // Sort by priority
    const priority = { high: 0, medium: 1, low: 2 };
    emails.sort((a, b) => (priority[a.priority] ?? 1) - (priority[b.priority] ?? 1));

    return Response.json({
      ok: true,
      count: emails.length,
      emails,
    });
  } catch (err) {
    console.error('Inbox zero error:', err);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// Send a draft reply (called when Tiffany approves)
export async function PUT(req) {
  const { thread_id, reply_text, to_email } = await req.json();

  if (!thread_id || !reply_text || !to_email) {
    return Response.json({ ok: false, error: 'Missing required fields' });
  }

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
        max_tokens: 500,
        mcp_servers: [
          {
            type: 'url',
            url: 'https://gmailmcp.googleapis.com/mcp/v1',
            name: 'gmail-mcp',
          },
        ],
        messages: [
          {
            role: 'user',
            content: `Send this reply to thread ${thread_id}: "${reply_text}"`,
          },
        ],
      }),
    });

    const data = await response.json();
    return Response.json({ ok: true, result: data });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
