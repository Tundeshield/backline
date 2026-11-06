/**
 * POST /api/agent  { message, channel, customerName, business, openInvoices, services, slots }
 * Returns { reply, intent, action }.
 *
 * Uses Claude when ANTHROPIC_API_KEY is set; otherwise falls back to the
 * same rule-based replies the browser uses, so the inbox always works.
 */
import { ruleReply } from '../../src/lib/agentRules.js';

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'POST only' });
  const ctx = await req.json().catch(() => null);
  if (!ctx?.message) return json(400, { error: 'message is required' });

  const fallback = ruleReply(ctx);
  if (!process.env.ANTHROPIC_API_KEY) return json(200, { ...fallback, engine: 'rules' });

  const system = `You are the customer-service agent for ${ctx.business?.name || 'a Nigerian business'}, replying on ${ctx.channel || 'WhatsApp'}.
Be warm, brief (max 3 short sentences), and professional; Nigerian English is fine. Never invent prices or facts not given below.
Services: ${JSON.stringify(ctx.services || [])}
Open bookings slots: ${JSON.stringify(ctx.slots || [])}
This customer's unpaid invoices: ${JSON.stringify(ctx.openInvoices || [])}
Bank details for payment: ${ctx.business?.bankDetails || 'ask the team'}
Return ONLY JSON: {"reply": string, "intent": "booking"|"invoice"|"pricing"|"complaint"|"other", "action": null | {"type":"book","slot":string} | {"type":"send_invoice","number":string} | {"type":"handoff"}}`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
        max_tokens: 400,
        system,
        messages: [{ role: 'user', content: `${ctx.customerName || 'Customer'}: ${ctx.message}` }],
      }),
    });
    const data = await r.json();
    const text = data?.content?.[0]?.text || '';
    const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    return json(200, { ...parsed, engine: 'claude' });
  } catch {
    return json(200, { ...fallback, engine: 'rules' });
  }
};
