/**
 * WhatsApp Cloud API webhook.
 *   GET  /api/whatsapp-webhook  — Meta verification handshake
 *   POST /api/whatsapp-webhook  — inbound messages → agent reply → send back
 *
 * Env: WHATSAPP_VERIFY_TOKEN, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID.
 * To store conversations server-side, add firebase-admin with a service
 * account and write to businesses/{bizId}/conversations (see README).
 */
import { ruleReply } from '../../src/lib/agentRules.js';

export default async (req) => {
  const url = new URL(req.url);
  if (req.method === 'GET') {
    const ok = url.searchParams.get('hub.mode') === 'subscribe' && url.searchParams.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN;
    return new Response(ok ? url.searchParams.get('hub.challenge') : 'Forbidden', { status: ok ? 200 : 403 });
  }
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const body = await req.json().catch(() => ({}));
  const msg = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const contact = body?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0];
  if (!msg || msg.type !== 'text') return new Response('ok');

  const { reply } = ruleReply({ message: msg.text.body, customerName: contact?.profile?.name, business: { name: process.env.BUSINESS_NAME || '' } });

  if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: msg.from, type: 'text', text: { body: reply } }),
    }).catch(() => {});
  }
  return new Response('ok');
};
