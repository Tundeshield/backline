/** Client calls to Netlify functions, with in-browser fallbacks so Demo mode and `vite dev` keep working. */
import { validateInvoice, buildMbsPayload } from './einvoice.js';
import { ruleReply } from './agentRules.js';

async function post(path, body) {
  const r = await fetch(`/api/${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const ct = r.headers.get('content-type') || '';
  if (!ct.includes('application/json')) throw Object.assign(new Error('Function unavailable'), { unavailable: true });
  const data = await r.json();
  if (!r.ok) throw Object.assign(new Error(data.error || 'Request failed'), { data });
  return data;
}

async function sha256b64(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function submitEInvoice(invoice, business) {
  try {
    return await post('einvoice-submit', { invoice, business });
  } catch (e) {
    if (!e.unavailable) throw e;
    const errors = validateInvoice(invoice, business);
    if (errors.length) throw Object.assign(new Error('Validation failed'), { data: { errors } });
    const payload = buildMbsPayload(invoice, business);
    const irn = `${String(invoice.number).replace(/[^A-Za-z0-9]/g, '')}-BKLNTEST-${String(invoice.issueDate).replaceAll('-', '')}`;
    const csid = (await sha256b64(irn + JSON.stringify(payload.legal_monetary_total))).slice(0, 44);
    const qr = btoa(JSON.stringify({ irn, csid, total: payload.legal_monetary_total.payable_amount, tin: business.tin, sandbox: true }));
    return { mode: 'sandbox', irn, csid, qr, payload: { ...payload, irn }, transmittedAt: new Date().toISOString() };
  }
}

export async function agentReply(ctx) {
  try { return await post('agent', ctx); } catch { return { ...ruleReply(ctx), engine: 'rules' }; }
}

export async function sendEmail(to, subject, html) {
  try { return await post('send-email', { to, subject, html }); } catch { return { simulated: true }; }
}
