/**
 * POST /api/einvoice-submit   { invoice, business }
 *
 * Validates and standardises an invoice, then transmits it to the NRS MBS
 * platform through an Access Point Provider.
 *
 *  - EINVOICE_MODE=sandbox (default): returns a test IRN / CSID / QR payload
 *    so the full flow can be demoed and tested end to end.
 *  - EINVOICE_MODE=live: POSTs the payload to your APP at APP_BASE_URL.
 *    Adjust `toProvider` / `fromProvider` to your APP's exact contract.
 */
import crypto from 'node:crypto';
import { validateInvoice, buildMbsPayload } from '../../src/lib/einvoice.js';

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const toProvider = (payload) => payload;
const fromProvider = (res) => ({ irn: res.irn || res.data?.irn, csid: res.csid || res.data?.csid, qr: res.qr_code || res.data?.qr_code || res.qr });

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'POST only' });
  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'Invalid JSON' }); }
  const { invoice, business } = body || {};
  if (!invoice || !business) return json(400, { error: 'invoice and business are required' });

  const errors = validateInvoice(invoice, business);
  if (errors.length) return json(422, { error: 'Validation failed', errors });

  const payload = buildMbsPayload(invoice, business);
  const mode = process.env.EINVOICE_MODE || 'sandbox';

  if (mode === 'live') {
    if (!process.env.APP_BASE_URL || !process.env.APP_API_KEY) return json(500, { error: 'Live e-invoicing is not configured (APP_BASE_URL / APP_API_KEY).' });
    const r = await fetch(`${process.env.APP_BASE_URL.replace(/\/$/, '')}/invoice/submit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.APP_API_KEY, 'x-api-secret': process.env.APP_API_SECRET || '' },
      body: JSON.stringify(toProvider(payload)),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return json(r.status, { error: 'Access Point Provider rejected the invoice', provider: data });
    return json(200, { mode, ...fromProvider(data), payload, transmittedAt: new Date().toISOString() });
  }

  // --- sandbox: deterministic, clearly-marked test identifiers
  const serviceId = (process.env.EINVOICE_SERVICE_ID || 'BKLNTEST').slice(0, 8).toUpperCase();
  const stamp = String(invoice.issueDate || '').replaceAll('-', '');
  const irn = `${String(invoice.number).replace(/[^A-Za-z0-9]/g, '')}-${serviceId}-${stamp}`;
  const csid = crypto.createHash('sha256').update(irn + JSON.stringify(payload.legal_monetary_total)).digest('base64url').slice(0, 44);
  const qr = Buffer.from(JSON.stringify({ irn, csid, total: payload.legal_monetary_total.payable_amount, tin: business.tin, sandbox: true })).toString('base64');
  return json(200, { mode, irn, csid, qr, payload: { ...payload, irn }, transmittedAt: new Date().toISOString() });
};
