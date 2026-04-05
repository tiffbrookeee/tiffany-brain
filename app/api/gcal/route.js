import { NextResponse } from 'next/server';

const GCAL_API = 'https://www.googleapis.com/calendar/v3';

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  return data.access_token;
}

export async function GET(request) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REFRESH_TOKEN) {
    return NextResponse.json({ events: [], connected: false });
  }
  try {
    const token = await getAccessToken();
    const searchParams = new URL(request.url).searchParams;
    const timeMin = searchParams.get('timeMin') || new Date().toISOString();
    const timeMax =
      searchParams.get('timeMax') ||
      new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

    const res = await fetch(
      `${GCAL_API}/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    const events = (data.items || []).map(
      ({ summary, start, end, location, htmlLink }) => ({
        title: summary || 'Event',
        start: start.dateTime || start.date,
        end: end.dateTime || end.date,
        allDay: !!start.date,
        location: location || null,
        url: htmlLink,
      })
    );
    return NextResponse.json({ connected: true, events });
  } catch (err) {
    return NextResponse.json({
      events: [],
      connected: false,
      error: err.message,
    });
  }
}
