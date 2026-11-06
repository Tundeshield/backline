/**
 * NRS Merchant Buyer Solution (MBS) e-invoice payload builder.
 *
 * Backline acts as the System Integrator: it standardises invoices into the
 * NRS JSON shape and hands them to an accredited Access Point Provider (APP),
 * which signs and transmits them and returns the IRN, CSID and QR data.
 *
 * Field names follow the published MBS/UBL-style schema. When you onboard
 * with a specific APP, map any provider-specific differences in
 * netlify/functions/einvoice-submit.mjs, not here.
 */
import { VAT_RATE, invoiceTotals } from './tax.js';

const TIN_RE = /^\d{8}-\d{4}$|^\d{10,13}$/;

export function validateInvoice(inv, business) {
  const errors = [];
  if (!business?.tin) errors.push('Your business TIN is missing (Settings → Business).');
  else if (!TIN_RE.test(String(business.tin).trim())) errors.push('Your TIN format looks wrong (expected e.g. 12345678-0001).');
  if (!inv.number) errors.push('Invoice number is required.');
  if (!inv.customer?.name) errors.push('Customer name is required.');
  if (inv.type !== 'B2C' && !inv.customer?.tin) errors.push('B2B invoices need the customer TIN.');
  if (!inv.lines?.length) errors.push('Add at least one line item.');
  (inv.lines || []).forEach((l, i) => {
    if (!l.description) errors.push(`Line ${i + 1}: description is required.`);
    if (!(+l.qty > 0)) errors.push(`Line ${i + 1}: quantity must be above 0.`);
    if (!(+l.price >= 0)) errors.push(`Line ${i + 1}: price is invalid.`);
  });
  return errors;
}

export function buildMbsPayload(inv, business) {
  const totals = invoiceTotals(inv.lines);
  const vatLines = inv.lines.filter((l) => l.vat !== false);
  const taxable = vatLines.reduce((a, l) => a + l.qty * l.price, 0);
  const now = new Date();
  return {
    business_id: business.mbsBusinessId || business.id,
    irn: inv.irn || null,
    invoice_number: inv.number,
    issue_date: inv.issueDate,
    issue_time: now.toTimeString().slice(0, 8),
    due_date: inv.dueDate,
    invoice_type_code: inv.kind === 'credit_note' ? '381' : '380',
    invoice_kind: inv.type || 'B2B',
    tax_point_date: inv.issueDate,
    document_currency_code: inv.currency || 'NGN',
    tax_currency_code: 'NGN',
    payment_status: inv.status === 'paid' ? 'PAID' : 'PENDING',
    note: inv.notes || undefined,
    billing_reference: inv.originalIrn ? [{ irn: inv.originalIrn }] : undefined,
    accounting_supplier_party: {
      party_name: business.legalName || business.name,
      tin: business.tin,
      email: business.email,
      telephone: business.phone,
      postal_address: { street_name: business.address, city_name: business.city, country: 'NG' },
    },
    accounting_customer_party: {
      party_name: inv.customer.name,
      tin: inv.customer.tin || undefined,
      email: inv.customer.email || undefined,
      telephone: inv.customer.phone || undefined,
      postal_address: { street_name: inv.customer.address || '', city_name: inv.customer.city || '', country: 'NG' },
    },
    invoice_line: inv.lines.map((l, i) => ({
      id: i + 1,
      hsn_code: l.hsCode || undefined,
      product_category: l.category || undefined,
      invoiced_quantity: +l.qty,
      price_amount: +l.price,
      line_extension_amount: +(l.qty * l.price).toFixed(2),
      item: { name: l.description, description: l.description },
      tax_category: l.vat === false ? { id: 'ZERO_OR_EXEMPT', percent: 0 } : { id: 'STANDARD_VAT', percent: VAT_RATE * 100 },
    })),
    tax_total: [{
      tax_amount: totals.vat,
      tax_subtotal: [{ taxable_amount: +taxable.toFixed(2), tax_amount: totals.vat, tax_category: { id: 'STANDARD_VAT', percent: VAT_RATE * 100 } }],
    }],
    legal_monetary_total: {
      line_extension_amount: totals.subtotal,
      tax_exclusive_amount: totals.subtotal,
      tax_inclusive_amount: totals.total,
      payable_amount: totals.total,
    },
  };
}
