/**
 * POST /api/send-email  { to, subject, html }
 * Sends invoices and reminders via Resend. Without RESEND_API_KEY it
 * returns { simulated: true } so the UI flow still completes.
 */
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'POST only' });
  const { to, subject, html } = await req.json().catch(() => ({}));
  if (!to || !subject) return json(400, { error: 'to and subject are required' });
  if (!process.env.RESEND_API_KEY) return json(200, { simulated: true });
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || 'Backline <onboarding@resend.dev>', to, subject, html }),
  });
  const data = await r.json().catch(() => ({}));
  return json(r.ok ? 200 : r.status, data);
};
