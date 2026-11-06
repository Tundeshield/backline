import { useMemo, useState } from 'react';
import { Plus, AlertTriangle, CheckCircle2, Download, Receipt, CalendarClock } from 'lucide-react';
import { useApp, useCollection } from '../lib/store.jsx';
import { Button, Card, PageHeader, Modal, Field, Badge, Stat, Empty } from '../components/ui.jsx';
import { vatReturn, receiptIssues, profitAndLoss, citEstimate, VAT_RATE } from '../lib/tax.js';
import { naira, compact, today, monthLabel, fmtDate, addDays } from '../lib/format.js';

const KINDS = ['Fixed asset', 'Overhead', 'Professional services', 'Goods for resale'];

function nextDue(day) {
  const d = new Date(); d.setDate(day);
  if (d < new Date()) d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export default function Vat() {
  const { business, api } = useApp();
  const invoices = useCollection('invoices');
  const receipts = useCollection('receipts');
  const txns = useCollection('transactions');
  const runs = useCollection('payrollRuns');
  const [month, setMonth] = useState('');
  const [editing, setEditing] = useState(null);

  const months = useMemo(() => [...new Set([...invoices.map((i) => i.issueDate), ...receipts.map((r) => r.date)].filter(Boolean).map((d) => d.slice(0, 7)))].sort().reverse(), [invoices, receipts]);
  const v = vatReturn(invoices, receipts, month || undefined);

  // annualised CIT estimate from the last 90 days of books
  const from = addDays(today(), -90);
  const pl = profitAndLoss(txns, from, today());
  const cit = citEstimate({ turnover: business.turnover, fixedAssets: business.fixedAssets, assessableProfit: pl.net * 4 });
  const lastRun = runs[0];

  const exportCsv = () => {
    const rows = [['Type', 'Date', 'Counterparty', 'TIN', 'Reference', 'Net', 'VAT', 'Claimable', 'Issue']];
    invoices.filter((i) => i.status !== 'draft' && (!month || i.issueDate.startsWith(month))).forEach((i) => rows.push(['Output', i.issueDate, i.customer.name, i.customer.tin || '', i.irn || i.number, i.totals.subtotal, i.totals.vat, '', '']));
    receipts.filter((r) => !month || r.date.startsWith(month)).forEach((r) => { const iss = receiptIssues(r); rows.push(['Input', r.date, r.supplier, r.supplierTin || '', r.supplierIrn || '', r.net, r.vat, iss.length ? 'No' : 'Yes', iss.join('; ')]); });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `vat-schedule-${month || 'all'}.csv`; a.click();
  };

  return (
    <>
      <PageHeader title="VAT & tax prep" sub="Output VAT from your cleared invoices, recoverable input VAT from receipts — including fixed assets and overheads under the 2026 rules.">
        <select className="input max-w-44" value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="">All periods</option>
          {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
        <Button variant="outline" onClick={exportCsv}><Download size={16} /> VAT schedule</Button>
        <Button onClick={() => setEditing({})}><Plus size={16} /> Add receipt</Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Output VAT" value={compact(v.output)} hint={`${v.invoiceCount} invoices`} />
        <Stat label="Input VAT claimable" value={compact(v.input)} hint={`${v.claimable.length} valid receipts`} tone="signal" />
        <Stat label="Net VAT payable" value={compact(v.net)} hint={v.net < 0 ? 'Credit to carry forward / refund' : 'Due by the 21st of next month'} tone={v.net > 0 ? 'ink' : 'signal'} />
        <Stat label="Input VAT at risk" value={compact(v.atRisk)} hint={`${v.blocked.length} receipts need fixing`} tone={v.atRisk ? 'rust' : 'signal'} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <div className="flex items-center justify-between px-6 pt-5"><h2 className="font-semibold">Receipts & input VAT</h2><span className="text-xs text-ink/50">Fix flagged receipts to claim the VAT</span></div>
          {receipts.length === 0 ? <Empty icon={Receipt} title="No receipts yet">Add purchase receipts for equipment, diesel, internet, rent and professional fees.</Empty> : (
            <div className="overflow-x-auto">
              <table className="tbl mt-3">
                <thead><tr><th>Supplier</th><th>Kind</th><th className="text-right">VAT</th><th>Status</th></tr></thead>
                <tbody>
                  {receipts.filter((r) => !month || r.date.startsWith(month)).map((r) => {
                    const iss = receiptIssues(r);
                    return (
                      <tr key={r.id} className="cursor-pointer" onClick={() => setEditing(r)}>
                        <td><div className="font-medium">{r.supplier}</div><div className="text-xs text-ink/50">{r.description} · {fmtDate(r.date)}</div></td>
                        <td><Badge tone={r.kind === 'Fixed asset' ? 'blue' : 'gray'}>{r.kind}</Badge></td>
                        <td className="num text-right">{naira(r.vat)}</td>
                        <td>{iss.length ? <span className="flex items-start gap-1 text-xs text-rust"><AlertTriangle size={13} className="mt-0.5 shrink-0" />{iss[0]}</span> : <span className="flex items-center gap-1 text-xs font-semibold text-signal-dark"><CheckCircle2 size={13} />Claimable</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-semibold">Recovered by type</h2>
            <div className="mt-3 space-y-2">
              {Object.entries(v.byKind).map(([k, amt]) => (
                <div key={k}>
                  <div className="flex justify-between text-sm"><span>{k}</span><span className="num">{naira(amt)}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-paper-2"><div className="h-full rounded-full bg-signal" style={{ width: `${(amt / Math.max(1, v.input)) * 100}%` }} /></div>
                </div>
              ))}
              {!Object.keys(v.byKind).length && <p className="text-sm text-ink/55">Nothing claimable yet.</p>}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="flex items-center gap-2 font-semibold"><CalendarClock size={17} /> Filing calendar</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex justify-between"><span>PAYE remittance (state IRS)</span><span className="font-medium">{fmtDate(nextDue(10))}</span></li>
              <li className="flex justify-between"><span>VAT return (NRS)</span><span className="font-medium">{fmtDate(nextDue(21))}</span></li>
              <li className="flex justify-between"><span>Pension remittance (PFAs)</span><span className="font-medium">7 working days after pay</span></li>
            </ul>
            <p className="mt-3 text-xs text-ink/50">Usual statutory deadlines; your accountant confirms each filing during monthly review.</p>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold">Company income tax (estimate)</h2>
            {cit.small ? (
              <p className="mt-2 text-sm text-ink/70">Turnover ≤ ₦100m and fixed assets ≤ ₦250m: small company, 0% CIT.</p>
            ) : (
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-ink/60">Annualised profit (90-day run rate)</span><span className="num">{compact(pl.net * 4)}</span></div>
                <div className="flex justify-between"><span className="text-ink/60">CIT @ 30%</span><span className="num">{compact(cit.cit)}</span></div>
                <div className="flex justify-between"><span className="text-ink/60">Development levy @ 4%</span><span className="num">{compact(cit.levy)}</span></div>
                <div className="flex justify-between border-t border-line pt-1 font-semibold"><span>Provision this year</span><span className="num">{compact(cit.total)}</span></div>
                <p className="pt-2 text-xs text-ink/50">Before capital allowances and adjustments. Final computation is prepared at year end with your accountant.</p>
              </div>
            )}
            {lastRun && <div className="mt-4 rounded-lg bg-paper p-3 text-sm">Last payroll ({monthLabel(lastRun.period)}): PAYE <b className="num">{naira(lastRun.totals.paye)}</b> to remit.</div>}
          </Card>
        </div>
      </div>

      <ReceiptModal key={editing?.id || 'new'} receipt={editing} onClose={() => setEditing(null)} api={api} />
    </>
  );
}

function ReceiptModal({ receipt, onClose, api }) {
  const [r, setR] = useState(() => ({ date: today(), supplier: '', description: '', kind: 'Overhead', gross: '', vatInclusive: true, supplierTin: '', hasInvoice: true, supplierIrn: '', exemptUse: false, ...(receipt || {}) }));
  if (!receipt) return null;
  const gross = +r.gross || 0;
  const vat = r.vatInclusive ? gross - gross / (1 + VAT_RATE) : gross * VAT_RATE;
  const net = r.vatInclusive ? gross / (1 + VAT_RATE) : gross;
  const data = { ...r, gross: r.vatInclusive ? gross : gross + vat, net: Math.round(net), vat: Math.round(vat) };
  const issues = receiptIssues(data);

  const save = async () => {
    if (r.id) await api.update('receipts', r.id, data); else await api.add('receipts', data);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={r.id ? 'Receipt' : 'Add receipt'}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Supplier" className="sm:col-span-2"><input className="input" value={r.supplier} onChange={(e) => setR({ ...r, supplier: e.target.value })} /></Field>
        <Field label="What was bought" className="sm:col-span-2"><input className="input" value={r.description} onChange={(e) => setR({ ...r, description: e.target.value })} /></Field>
        <Field label="Date"><input type="date" className="input" value={r.date} onChange={(e) => setR({ ...r, date: e.target.value })} /></Field>
        <Field label="Kind"><select className="input" value={r.kind} onChange={(e) => setR({ ...r, kind: e.target.value })}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select></Field>
        <Field label="Amount (₦)"><input className="input num" type="number" value={r.gross} onChange={(e) => setR({ ...r, gross: e.target.value })} /></Field>
        <Field label="Amount is"><select className="input" value={r.vatInclusive ? 'inc' : 'exc'} onChange={(e) => setR({ ...r, vatInclusive: e.target.value === 'inc' })}><option value="inc">VAT inclusive</option><option value="exc">VAT exclusive</option></select></Field>
        <Field label="Supplier TIN"><input className="input" value={r.supplierTin} onChange={(e) => setR({ ...r, supplierTin: e.target.value })} placeholder="12345678-0001" /></Field>
        <Field label="Supplier invoice IRN"><input className="input" value={r.supplierIrn} onChange={(e) => setR({ ...r, supplierIrn: e.target.value })} placeholder="From their e-invoice" /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-ink" checked={r.hasInvoice} onChange={(e) => setR({ ...r, hasInvoice: e.target.checked })} /> I have a valid tax invoice</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-ink" checked={r.exemptUse} onChange={(e) => setR({ ...r, exemptUse: e.target.checked })} /> Used only for exempt supplies</label>
      </div>
      <div className={`mt-5 rounded-lg p-3 text-sm ${issues.length ? 'bg-rust/10' : 'bg-signal/15'}`}>
        VAT <b className="num">{naira(vat)}</b> — {issues.length ? <>not claimable yet: {issues.join(', ').toLowerCase()}.</> : 'claimable this period.'}
      </div>
      <div className="mt-5 flex justify-between">
        {r.id ? <Button variant="ghost" className="text-rust" onClick={async () => { await api.remove('receipts', r.id); onClose(); }}>Delete</Button> : <span />}
        <Button onClick={save} disabled={!r.supplier || !gross}>Save receipt</Button>
      </div>
    </Modal>
  );
}
