/** Demo data for a medium Nigerian business newly in scope for e-invoicing. Dates are relative to today. */
import { invoiceTotals, categorise, payslip } from './tax.js';

const iso = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
let n = 0; const id = (p) => `${p}_${(++n).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const DEMO_BUSINESS = {
  id: 'demo-biz',
  name: 'Ijebu Gold Foods',
  legalName: 'Ijebu Gold Foods Limited',
  rcNumber: 'RC 1489023',
  tin: '23415678-0001',
  vatRegistered: true,
  sector: 'Food processing & distribution',
  turnover: 2_400_000_000,
  fixedAssets: 410_000_000,
  staffCount: 6,
  invoicesPerMonth: 120,
  email: 'accounts@ijebugold.ng',
  phone: '+234 803 555 0142',
  address: '14 Ogunlana Drive, Surulere',
  city: 'Lagos',
  state: 'Lagos',
  bankDetails: 'Ijebu Gold Foods Ltd · 0123456789 · Zenith Bank',
  plan: 'compliance-plus',
  invoicePrefix: 'IGF',
  nextInvoiceNo: 1047,
  services: [
    { name: 'Garri (50kg bag)', price: 38_000 },
    { name: 'Red palm oil (25L)', price: 42_000 },
    { name: 'Plantain chips (carton of 24)', price: 18_500 },
    { name: 'Delivery within Lagos', price: 15_000 },
  ],
  slots: [],
  onboarded: true,
};

const CUSTOMERS = [
  { name: 'Lekki Fresh Mart Ltd', tin: '19283746-0001', email: 'payables@lekkifresh.ng', phone: '+2348021110000', contact: 'Ngozi Eze', address: '3 Admiralty Way, Lekki', city: 'Lagos' },
  { name: 'Ibadan Wholesale Depot', tin: '30495867-0001', email: 'accounts@ibwd.ng', phone: '+2348032220000', contact: 'Kunle Adeyemi', address: 'Bodija Market Road', city: 'Ibadan' },
  { name: 'Naija Kitchen Restaurants Ltd', tin: '41526378-0001', email: 'finance@naijakitchen.ng', phone: '+2348093330000', contact: 'Amaka Obi', address: '22 Allen Avenue, Ikeja', city: 'Lagos' },
  { name: 'Harbour Hotels & Suites', tin: '52637489-0001', email: 'procurement@harbourhotels.ng', phone: '+2348054440000', contact: 'Tayo Bakare', address: 'Marina Road', city: 'Lagos' },
];

function mkInvoice(no, cust, lines, issueOffset, status, cleared = true) {
  const issueDate = iso(issueOffset);
  const dueDate = iso(issueOffset + 30);
  const totals = invoiceTotals(lines);
  const number = `IGF-${no}`;
  const irn = cleared ? `IGF${no}-BKLNTEST-${issueDate.replaceAll('-', '')}` : null;
  return {
    id: id('inv'), number, type: 'B2B', customer: cust, lines, issueDate, dueDate, currency: 'NGN', totals, status,
    irn, csid: cleared ? 'sbx_' + Math.random().toString(36).slice(2, 14) : null,
    qr: cleared ? btoa(JSON.stringify({ irn, total: totals.total, sandbox: true })) : null,
    einvoiceStatus: cleared ? 'cleared' : null, einvoiceMode: 'sandbox',
    paidAt: status === 'paid' ? iso(issueOffset + 18) : null, reminders: [], createdAt: issueDate + 'T09:00:00.000Z',
  };
}

export function seedDemo() {
  const [lfm, ibw, nkr, hhs] = CUSTOMERS;
  const L = (d, q, p, vat = true) => ({ description: d, qty: q, price: p, vat });
  const invoices = [
    mkInvoice(1046, lfm, [L('Garri (50kg bag)', 40, 38000), L('Delivery within Lagos', 2, 15000)], -3, 'sent'),
    mkInvoice(1045, hhs, [L('Plantain chips (carton of 24)', 60, 18500), L('Red palm oil (25L)', 10, 42000)], -12, 'sent'),
    mkInvoice(1044, nkr, [L('Red palm oil (25L)', 25, 42000)], -38, 'sent'),
    mkInvoice(1043, ibw, [L('Garri (50kg bag)', 120, 38000), L('Delivery within Lagos', 1, 15000)], -47, 'sent'),
    mkInvoice(1042, lfm, [L('Plantain chips (carton of 24)', 80, 18500)], -41, 'paid'),
    mkInvoice(1041, hhs, [L('Garri (50kg bag)', 30, 38000), L('Red palm oil (25L)', 15, 42000)], -55, 'paid'),
    mkInvoice(1040, nkr, [L('Plantain chips (carton of 24)', 45, 18500)], -66, 'paid'),
    mkInvoice(1039, ibw, [L('Red palm oil (25L)', 60, 42000)], -79, 'paid'),
    { ...mkInvoice(1047, nkr, [L('Garri (50kg bag)', 12, 38000)], 0, 'draft', false) },
  ];

  // Bank + mobile-money feed (90 days)
  const raw = [];
  const push = (off, desc, amt, source = 'Zenith Bank') => raw.push({ date: iso(off), description: desc, amount: amt, source });
  invoices.filter((i) => i.status === 'paid').forEach((i) => push(+(i.paidAt ? Math.round((new Date(i.paidAt) - new Date()) / 864e5) : -10), `TRF FROM ${i.customer.name.toUpperCase()} ${i.number}`, i.totals.total));
  for (let m = 0; m < 3; m++) {
    const b = -m * 30;
    push(b - 1, 'SALARY PAYMENT OCT BATCH', -2_985_000);
    push(b - 3, 'IKEDC PREPAID TOKEN', -185_000);
    push(b - 5, 'NNPC FILLING STN DIESEL 1200L', -1_380_000);
    push(b - 7, 'SPECTRANET 4G MONTHLY', -45_000);
    push(b - 8, 'GIG LOGISTICS DISPATCH', -210_000);
    push(b - 9, 'POS SALES SETTLEMENT', 4_840_000, 'Moniepoint');
    push(b - 15, 'TRF FROM OYO DISTRIBUTORS – BULK GARRI', 3_560_000);
    push(b - 11, 'SUPPLIER: CASSAVA RAW MATERIAL IJEBU-ODE', -6_400_000);
    push(b - 13, 'OPAY TRANSFER IN – RETAIL SALES', 2_360_000, 'OPay');
    push(b - 14, 'META ADS NG', -150_000);
    push(b - 16, 'SMS ALERT CHARGES', -1_250);
    push(b - 16, 'STAMP DUTY', -50);
    push(b - 18, 'WAREHOUSE RENT – SURULERE', -1_250_000);
    push(b - 20, 'GOOGLE WORKSPACE SUBSCRIPTION', -38_400);
    push(b - 22, 'POS SALES SETTLEMENT', 5_610_000, 'Moniepoint');
    push(b - 25, 'MECHANIC – SERVICING OF DELIVERY VAN', -95_000);
  }
  push(-27, 'PURCHASE 60KVA GENERATOR – MIKANO', -18_500_000);
  push(-33, 'AUDIT & CONSULTING FEES – Q3', -1_200_000);
  const transactions = raw.map((t) => ({ id: id('txn'), ...t, category: categorise(t.description, t.amount), auto: true, reviewed: false, createdAt: t.date + 'T12:00:00.000Z' }));

  const R = (date, supplier, kind, gross, supplierTin, hasInvoice, extra = {}) => {
    const net = Math.round(gross / 1.075); const vat = gross - net;
    return { id: id('rct'), date: iso(date), supplier, kind, gross, net, vat, supplierTin, hasInvoice, supplierIrn: hasInvoice ? `SUP-${Math.random().toString(36).slice(2, 8).toUpperCase()}` : '', createdAt: iso(date) + 'T10:00:00.000Z', ...extra };
  };
  const receipts = [
    R(-27, 'Mikano International Ltd', 'Fixed asset', 18_500_000, '10293847-0001', true, { description: '60KVA generator' }),
    R(-33, 'Adebayo & Co. Chartered Accountants', 'Professional services', 1_200_000, '11223344-0001', true, { description: 'Audit & consulting Q3' }),
    R(-5, 'NNPC Retail – Surulere', 'Overhead', 1_380_000, '', false, { description: 'Diesel 1,200L (no VAT invoice)' }),
    R(-7, 'Spectranet Ltd', 'Overhead', 45_000, '20394857-0001', true, { description: '4G internet' }),
    R(-8, 'GIG Logistics', 'Overhead', 210_000, '30495861-0001', true, { description: 'Dispatch' }),
    R(-20, 'Google Workspace (reseller)', 'Overhead', 38_400, '', true, { description: 'Software subscription' }),
    R(-25, 'Ade Motors Workshop', 'Overhead', 95_000, '', false, { description: 'Van servicing' }),
    R(-14, 'Meta Platforms Ireland', 'Overhead', 150_000, '', true, { description: 'Advertising' }),
    R(-62, 'Dell Nigeria Distributor', 'Fixed asset', 2_150_000, '40596872-0001', true, { description: '3 laptops' }),
  ];

  const E = (name, role, basic, housing, transport, other, annualRent, opts = {}) => ({ id: id('emp'), name, role, basic, housing, transport, other, annualRent, pension: true, nhf: false, bank: 'GTBank', state: 'Lagos', active: true, startDate: iso(-400), ...opts });
  const employees = [
    E('Folake Adeleke', 'Operations Manager', 450_000, 180_000, 70_000, 50_000, 3_000_000),
    E('Chinedu Okafor', 'Accountant', 320_000, 120_000, 50_000, 0, 1_800_000),
    E('Bisi Ogunleye', 'Sales Lead', 260_000, 100_000, 40_000, 60_000, 1_200_000),
    E('Musa Ibrahim', 'Driver', 110_000, 40_000, 20_000, 0, 480_000),
    E('Grace Etim', 'Production Supervisor', 220_000, 80_000, 40_000, 0, 900_000, { nhf: true }),
    E('Tobi Lawal', 'Factory Hand', 70_000, 20_000, 15_000, 0, 0, { pension: false }),
  ];
  const prevMonth = iso(-30).slice(0, 7);
  const lines = employees.map((e) => ({ employeeId: e.id, name: e.name, ...payslip(e) }));
  const sum = (k) => lines.reduce((a, l) => a + l[k], 0);
  const payrollRuns = [{ id: id('pr'), period: prevMonth, status: 'paid', lines, totals: { gross: sum('gross'), paye: sum('paye'), pension: sum('pension'), employerPension: sum('employerPension'), nhf: sum('nhf'), net: sum('net') }, createdAt: iso(-30) + 'T08:00:00.000Z' }];

  const C = (name, phone, channel, msgs, status = 'open') => ({ id: id('cv'), customerName: name, phone, channel, status, messages: msgs.map(([from, text, off]) => ({ from, text, at: new Date(Date.now() + off * 60000).toISOString() })), createdAt: new Date(Date.now() + msgs[0][2] * 60000).toISOString() });
  const conversations = [
    C('Ngozi Eze (Lekki Fresh Mart)', '+2348021110000', 'whatsapp', [['customer', 'Good morning, please what is the price of palm oil 25L now? We want to order 30.', -42]]),
    C('Amaka Obi (Naija Kitchen)', '+2348093330000', 'whatsapp', [['customer', 'Hello, can you resend our outstanding invoice? Finance wants to pay this week.', -95]]),
    C('Dele Martins', '+2348116660000', 'email', [['customer', 'Hi, I run a supermarket in Abeokuta. Can I book a visit to your factory next week to discuss supply?', -180]]),
    C('Kunle Adeyemi (Ibadan Wholesale)', '+2348032220000', 'whatsapp', [
      ['customer', 'We received the garri but 4 bags were damaged.', -1500],
      ['agent', "I'm sorry about this, Kunle. I've flagged it to a manager who will call you today.", -1499],
      ['staff', 'Called Kunle — credit note for 4 bags agreed.', -1300],
    ], 'resolved'),
  ];
  const appointments = [
    { id: id('apt'), title: 'Supply meeting – Harbour Hotels', with: 'Tayo Bakare', date: iso(2), time: '11:00', channel: 'whatsapp', status: 'confirmed', createdAt: iso(-1) },
    { id: id('apt'), title: 'Factory visit – new distributor', with: 'Prospect', date: iso(5), time: '14:00', channel: 'email', status: 'proposed', createdAt: iso(-1) },
  ];
  DEMO_BUSINESS.slots = [`${iso(3)} 10:00`, `${iso(3)} 15:00`, `${iso(4)} 11:30`, `${iso(6)} 10:00`];

  const reviews = [
    { id: id('rv'), period: prevMonth, status: 'signed_off', accountant: 'Chinedu Okafor, ACA (Backline Review Desk)',
      checklist: { bank: true, categorise: true, vat: true, payroll: true, einvoice: true },
      notes: 'Books reconciled to Zenith and Moniepoint statements. Two diesel receipts lacked VAT invoices — input VAT of ₦96k not claimed. Ask NNPC Retail for proper tax invoices.',
      signedAt: iso(-24), createdAt: iso(-26) },
  ];

  return {
    user: { uid: 'demo', email: 'owner@ijebugold.ng', name: 'Folake Adeleke' },
    business: DEMO_BUSINESS,
    collections: { invoices, transactions, receipts, employees, payrollRuns, conversations, appointments, reviews, customers: CUSTOMERS.map((c) => ({ id: id('cus'), ...c })) },
  };
}
