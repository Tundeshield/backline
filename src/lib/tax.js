/**
 * Backline tax engine — Nigeria Tax Act 2025 (in force 1 January 2026).
 * Pure functions, no browser APIs, so they run in the app, in Netlify
 * functions and in `npm test`.
 *
 * Every figure here is an estimate for preparation and accountant review,
 * not a filed return.
 */

export const VAT_RATE = 0.075;

/** NTA 2025 personal income tax bands (annual, ₦). */
export const PIT_BANDS = [
  { size: 800_000, rate: 0 },
  { size: 2_200_000, rate: 0.15 },
  { size: 9_000_000, rate: 0.18 },
  { size: 13_000_000, rate: 0.21 },
  { size: 25_000_000, rate: 0.23 },
  { size: Infinity, rate: 0.25 },
];

export const RENT_RELIEF_RATE = 0.2;
export const RENT_RELIEF_CAP = 500_000;
export const PENSION_EMPLOYEE = 0.08;
export const PENSION_EMPLOYER = 0.1;
export const NHF_RATE = 0.025;

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Annual PIT on chargeable income, with a per-band breakdown. */
export function annualPIT(chargeable) {
  let remaining = Math.max(0, chargeable);
  let tax = 0;
  const bands = [];
  for (const b of PIT_BANDS) {
    if (remaining <= 0) break;
    const slice = Math.min(remaining, b.size);
    const t = slice * b.rate;
    bands.push({ slice, rate: b.rate, tax: r2(t) });
    tax += t;
    remaining -= slice;
  }
  return { tax: r2(tax), bands };
}

export const rentRelief = (annualRent = 0) => Math.min(Math.max(0, annualRent) * RENT_RELIEF_RATE, RENT_RELIEF_CAP);

/**
 * Monthly payslip for one employee.
 * emp: { basic, housing, transport, other, annualRent, pension: bool, nhf: bool }  (monthly ₦ amounts)
 */
export function payslip(emp) {
  const basic = +emp.basic || 0, housing = +emp.housing || 0, transport = +emp.transport || 0, other = +emp.other || 0;
  const gross = basic + housing + transport + other;
  const pensionable = basic + housing + transport;
  const pension = emp.pension === false ? 0 : pensionable * PENSION_EMPLOYEE;
  const employerPension = emp.pension === false ? 0 : pensionable * PENSION_EMPLOYER;
  const nhf = emp.nhf ? basic * NHF_RATE : 0;
  const annualGross = gross * 12;
  const relief = rentRelief(+emp.annualRent || 0);
  const chargeable = Math.max(0, annualGross - (pension + nhf) * 12 - relief);
  const { tax, bands } = annualPIT(chargeable);
  const paye = tax / 12;
  const net = gross - pension - nhf - paye;
  return {
    gross: r2(gross), pension: r2(pension), employerPension: r2(employerPension), nhf: r2(nhf),
    rentRelief: r2(relief), chargeableAnnual: r2(chargeable), annualTax: tax, paye: r2(paye), net: r2(net),
    effectiveRate: annualGross ? tax / annualGross : 0, bands,
  };
}

/** Invoice line maths. line: { qty, price, vat: bool } */
export function invoiceTotals(lines = [], { whtRate = 0 } = {}) {
  let subtotal = 0, vat = 0;
  for (const l of lines) {
    const amt = (+l.qty || 0) * (+l.price || 0);
    subtotal += amt;
    if (l.vat !== false) vat += amt * VAT_RATE;
  }
  const wht = subtotal * whtRate;
  return { subtotal: r2(subtotal), vat: r2(vat), wht: r2(wht), total: r2(subtotal + vat), payable: r2(subtotal + vat - wht) };
}

/* ------------------------------------------------------------------ *
 * Bookkeeping
 * ------------------------------------------------------------------ */
export const CATEGORIES = {
  income: ['Sales', 'Service income', 'Other income', 'Transfer in'],
  expense: [
    'Cost of goods', 'Salaries', 'Rent', 'Utilities', 'Fuel & diesel', 'Transport & logistics',
    'Internet & telecoms', 'Software', 'Professional fees', 'Marketing', 'Bank charges',
    'Repairs & maintenance', 'Equipment (fixed asset)', 'Taxes & levies', 'Office supplies', 'Other expense', 'Transfer out',
  ],
};

const RULES = [
  [/salary|payroll|wages/i, 'Salaries'],
  [/rent|lease/i, 'Rent'],
  [/ikedc|ekedc|aedc|phed|electric|nepa|water board/i, 'Utilities'],
  [/diesel|fuel|petrol|nnpc|filling/i, 'Fuel & diesel'],
  [/gig|dhl|uber|bolt|logistics|haulage|kwik/i, 'Transport & logistics'],
  [/mtn|airtel|glo|9mobile|spectranet|starlink|ipnx|data bundle/i, 'Internet & telecoms'],
  [/google|microsoft|zoho|aws|netlify|software|subscription/i, 'Software'],
  [/legal|audit|consult|accountant/i, 'Professional fees'],
  [/facebook|meta ads|instagram|advert|marketing/i, 'Marketing'],
  [/stamp duty|sms alert|vat on fee|charge|commission|maintenance fee|emtl/i, 'Bank charges'],
  [/repair|servic(e|ing) of|mechanic/i, 'Repairs & maintenance'],
  [/laptop|generator|machine|vehicle|equipment|furniture|inverter/i, 'Equipment (fixed asset)'],
  [/nrs|firs|lirs|tax|levy/i, 'Taxes & levies'],
  [/stationery|printer|toner|supplies/i, 'Office supplies'],
  [/supplier|raw material|stock|inventory|purchase/i, 'Cost of goods'],
];

/** Auto-categorise a bank / mobile-money line. Positive amount = money in. */
export function categorise(description = '', amount = 0) {
  if (amount > 0) {
    if (/reversal|refund/i.test(description)) return 'Other income';
    if (/own account|self transfer/i.test(description)) return 'Transfer in';
    return 'Sales';
  }
  if (/own account|self transfer/i.test(description)) return 'Transfer out';
  for (const [re, cat] of RULES) if (re.test(description)) return cat;
  return 'Other expense';
}

const inRange = (d, from, to) => (!from || d >= from) && (!to || d <= to);

export function profitAndLoss(txns = [], from, to) {
  const income = {}, expense = {};
  for (const t of txns) {
    if (!inRange(t.date, from, to)) continue;
    if (/^Transfer/.test(t.category) || t.category === 'Equipment (fixed asset)') continue; // capex is not P&L
    const bucket = t.amount >= 0 ? income : expense;
    bucket[t.category] = (bucket[t.category] || 0) + Math.abs(t.amount);
  }
  const totalIncome = Object.values(income).reduce((a, b) => a + b, 0);
  const totalExpense = Object.values(expense).reduce((a, b) => a + b, 0);
  return { income, expense, totalIncome, totalExpense, net: totalIncome - totalExpense };
}

/** Cash flow by month: [{ month: '2026-09', inflow, outflow, net }] */
export function cashFlowByMonth(txns = []) {
  const m = {};
  for (const t of txns) {
    const k = String(t.date).slice(0, 7);
    m[k] ||= { month: k, inflow: 0, outflow: 0 };
    if (t.amount >= 0) m[k].inflow += t.amount; else m[k].outflow += -t.amount;
  }
  return Object.values(m).sort((a, b) => a.month.localeCompare(b.month)).map((x) => ({ ...x, net: x.inflow - x.outflow }));
}

/* ------------------------------------------------------------------ *
 * VAT — output vs recoverable input (NTA 2025 widens input VAT to
 * fixed assets and overhead services used for taxable supplies).
 * ------------------------------------------------------------------ */

/** Why a receipt's input VAT may not be claimable. Empty array = claimable. */
export function receiptIssues(r) {
  const issues = [];
  if (!r.vat || r.vat <= 0) issues.push('No VAT shown on receipt');
  if (!r.supplierTin) issues.push('Supplier TIN missing');
  if (!r.supplierIrn && !r.hasInvoice) issues.push('No valid tax invoice / IRN attached');
  if (r.exemptUse) issues.push('Used for exempt supplies');
  return issues;
}

export function vatReturn(invoices = [], receipts = [], month /* 'YYYY-MM' */) {
  const inMonth = (d) => !month || String(d).startsWith(month);
  const issued = invoices.filter((i) => i.status !== 'draft' && i.status !== 'void' && inMonth(i.issueDate));
  const output = issued.reduce((a, i) => a + (i.totals?.vat || 0), 0);
  const rs = receipts.filter((r) => inMonth(r.date));
  const claimable = rs.filter((r) => receiptIssues(r).length === 0);
  const blocked = rs.filter((r) => receiptIssues(r).length > 0);
  const input = claimable.reduce((a, r) => a + (+r.vat || 0), 0);
  const atRisk = blocked.reduce((a, r) => a + (+r.vat || 0), 0);
  const byKind = {};
  for (const r of claimable) byKind[r.kind || 'Overhead'] = (byKind[r.kind || 'Overhead'] || 0) + (+r.vat || 0);
  return { output: r2(output), input: r2(input), net: r2(output - input), atRisk: r2(atRisk), claimable, blocked, byKind, invoiceCount: issued.length };
}

/* ------------------------------------------------------------------ *
 * Company income tax estimate
 * ------------------------------------------------------------------ */
export const SMALL_CO_TURNOVER = 100_000_000;
export const SMALL_CO_ASSETS = 250_000_000;
export function citEstimate({ turnover, fixedAssets = 0, assessableProfit }) {
  const small = turnover <= SMALL_CO_TURNOVER && fixedAssets <= SMALL_CO_ASSETS;
  if (small) return { small, cit: 0, levy: 0, total: 0 };
  const p = Math.max(0, assessableProfit);
  const cit = p * 0.3, levy = p * 0.04;
  return { small, cit: r2(cit), levy: r2(levy), total: r2(cit + levy) };
}

/* ------------------------------------------------------------------ *
 * E-invoicing mandate & plans
 * ------------------------------------------------------------------ */
export function mandateStatus(turnover = 0) {
  if (turnover > 5_000_000_000) return { tier: 'Large', inScope: true, deadline: '2026-07-31', note: 'Large taxpayers (turnover above ₦5bn) must already be fully live on the NRS e-invoicing platform (MBS).' };
  if (turnover >= 1_000_000_000) return { tier: 'Medium', inScope: true, deadline: '2026-07-01', note: 'Medium taxpayers (₦1bn–₦5bn) came into scope on 1 July 2026. Every B2B invoice needs an IRN and QR code.' };
  return { tier: 'Small', inScope: false, deadline: '2027-01-01', note: 'Smaller businesses are scheduled to follow by 2027. Getting compliant early avoids a scramble.' };
}

export const PLANS = [
  { id: 'starter', name: 'Starter', price: 15_000, invoices: 50, staff: 3, blurb: 'For micro-businesses getting organised.',
    features: ['50 invoices / month', 'Bank & mobile-money bookkeeping', 'Monthly P&L and cash flow', 'VAT receipt tracker', 'Payroll for up to 3 staff'] },
  { id: 'growth', name: 'Growth', price: 45_000, invoices: 300, staff: 15, blurb: 'For growing SMEs with a team.',
    features: ['300 invoices / month', 'Everything in Starter', 'PAYE payroll for up to 15 staff', 'Invoice chasing on WhatsApp & email', 'VAT return preparation'] },
  { id: 'business', name: 'Business', price: 120_000, invoices: 1500, staff: 50, blurb: 'For established businesses.',
    features: ['1,500 invoices / month', 'Everything in Growth', 'AI agent: enquiries & bookings', 'Payroll for up to 50 staff', 'Quarterly accountant review'] },
  { id: 'compliance-plus', name: 'Compliance-Plus', price: 350_000, invoices: Infinity, staff: 250, highlight: true, blurb: 'For medium firms already under the e-invoicing mandate.',
    features: ['Unlimited NRS e-invoices (IRN + QR)', 'Everything in Business', 'Monthly human accountant review', 'Input-VAT recovery audit', 'Payroll for up to 250 staff', 'Priority onboarding in 5 working days'] },
];

export function recommendPlan({ turnover = 0, invoicesPerMonth = 0, staff = 0 }) {
  if (mandateStatus(turnover).inScope) return 'compliance-plus';
  const fit = PLANS.find((p) => invoicesPerMonth <= p.invoices && staff <= p.staff);
  return (fit || PLANS[PLANS.length - 1]).id;
}
