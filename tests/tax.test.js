import { test } from 'node:test';
import assert from 'node:assert/strict';
import { annualPIT, payslip, invoiceTotals, rentRelief, categorise, vatReturn, mandateStatus, citEstimate } from '../src/lib/tax.js';
import { validateInvoice, buildMbsPayload } from '../src/lib/einvoice.js';

test('PIT: ₦15m chargeable → ₦2,580,000 (BusinessDay worked example)', () => {
  assert.equal(annualPIT(15_000_000).tax, 2_580_000);
});

test('PIT: first ₦800k is tax-free', () => {
  assert.equal(annualPIT(800_000).tax, 0);
  assert.equal(annualPIT(3_000_000).tax, 330_000); // 2.2m × 15%
});

test('PIT: top band at 25% above ₦50m', () => {
  // 0 + 330k + 1.62m + 2.73m + 5.75m = 10.43m at 50m
  assert.equal(annualPIT(50_000_000).tax, 10_430_000);
  assert.equal(annualPIT(60_000_000).tax, 10_430_000 + 2_500_000);
});

test('Rent relief: 20% capped at ₦500k', () => {
  assert.equal(rentRelief(1_200_000), 240_000);
  assert.equal(rentRelief(5_000_000), 500_000);
});

test('Payslip deducts pension and rent relief before tax', () => {
  const s = payslip({ basic: 300_000, housing: 100_000, transport: 50_000, other: 0, annualRent: 1_200_000, pension: true });
  assert.equal(s.gross, 450_000);
  assert.equal(s.pension, 36_000);
  assert.equal(s.chargeableAnnual, 450_000 * 12 - 36_000 * 12 - 240_000);
  assert.ok(Math.abs(s.net - (450_000 - 36_000 - s.paye)) < 0.01);
});

test('Invoice totals with 7.5% VAT and exempt lines', () => {
  const t = invoiceTotals([{ qty: 40, price: 38_000 }, { qty: 2, price: 15_000 }, { qty: 1, price: 10_000, vat: false }]);
  assert.equal(t.subtotal, 1_560_000);
  assert.equal(t.vat, 116_250);
  assert.equal(t.total, 1_676_250);
});

test('Categorisation rules', () => {
  assert.equal(categorise('NNPC FILLING STN DIESEL', -100), 'Fuel & diesel');
  assert.equal(categorise('PURCHASE 60KVA GENERATOR', -1), 'Equipment (fixed asset)');
  assert.equal(categorise('POS SALES SETTLEMENT', 1000), 'Sales');
});

test('VAT return blocks receipts without TIN or invoice', () => {
  const inv = [{ status: 'sent', issueDate: '2026-10-02', totals: { vat: 75_000 } }];
  const rc = [
    { date: '2026-10-03', vat: 10_000, supplierTin: '1-1', hasInvoice: true },
    { date: '2026-10-04', vat: 5_000, supplierTin: '', hasInvoice: true },
  ];
  const v = vatReturn(inv, rc, '2026-10');
  assert.equal(v.output, 75_000);
  assert.equal(v.input, 10_000);
  assert.equal(v.atRisk, 5_000);
  assert.equal(v.net, 65_000);
});

test('Mandate tiers', () => {
  assert.equal(mandateStatus(6e9).tier, 'Large');
  assert.equal(mandateStatus(2e9).tier, 'Medium');
  assert.equal(mandateStatus(2e8).inScope, false);
});

test('Small company pays 0% CIT', () => {
  assert.equal(citEstimate({ turnover: 90e6, fixedAssets: 10e6, assessableProfit: 20e6 }).total, 0);
  assert.equal(citEstimate({ turnover: 2e9, fixedAssets: 1e9, assessableProfit: 100e6 }).total, 34e6);
});

test('E-invoice validation and payload', () => {
  const biz = { id: 'b1', name: 'X', tin: '12345678-0001' };
  const inv = { number: 'INV-1', type: 'B2B', issueDate: '2026-11-06', customer: { name: 'Y', tin: '87654321-0001' }, lines: [{ description: 'Item', qty: 2, price: 1000 }] };
  assert.deepEqual(validateInvoice(inv, biz), []);
  assert.ok(validateInvoice({ ...inv, customer: { name: 'Y' } }, biz).length > 0);
  const p = buildMbsPayload(inv, biz);
  assert.equal(p.legal_monetary_total.payable_amount, 2150);
  assert.equal(p.invoice_type_code, '380');
});
