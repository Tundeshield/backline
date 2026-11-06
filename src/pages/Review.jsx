import { useState } from 'react';
import { ShieldCheck, CheckCircle2, Circle, Lock } from 'lucide-react';
import { useApp, useCollection } from '../lib/store.jsx';
import { Button, Card, PageHeader, Badge, Toast } from '../components/ui.jsx';
import { vatReturn } from '../lib/tax.js';
import { thisMonth, monthLabel, fmtDate, compact, today } from '../lib/format.js';

const CHECKS = [
  ['bank', 'Bank & mobile-money balances reconciled to statements'],
  ['categorise', 'Every transaction categorised and confirmed'],
  ['einvoice', 'All issued invoices cleared on NRS (IRN present)'],
  ['vat', 'Output and input VAT schedules reviewed'],
  ['payroll', 'Payroll, PAYE and pension schedules checked'],
];

export default function Review() {
  const { business, api, user } = useApp();
  const reviews = useCollection('reviews');
  const txns = useCollection('transactions');
  const invoices = useCollection('invoices');
  const receipts = useCollection('receipts');
  const runs = useCollection('payrollRuns');
  const [asAccountant, setAsAccountant] = useState(false);
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState('');
  const period = thisMonth();
  const current = reviews.find((r) => r.period === period);
  const eligible = ['compliance-plus', 'business'].includes(business.plan);

  const monthTx = txns.filter((t) => String(t.date).startsWith(period));
  const v = vatReturn(invoices, receipts, period);
  const signals = {
    bank: monthTx.length > 0,
    categorise: monthTx.length > 0 && monthTx.every((t) => t.reviewed),
    einvoice: invoices.filter((i) => i.status !== 'draft' && i.issueDate?.startsWith(period)).every((i) => i.irn),
    vat: v.blocked.length === 0,
    payroll: runs.some((r) => r.period === period),
  };

  const request = async () => {
    await api.add('reviews', { period, status: 'requested', checklist: {}, notes: '', requestedBy: user.email });
    setToast('Review requested — an accountant will pick it up within 2 working days');
  };
  const toggle = (k) => api.update('reviews', current.id, { checklist: { ...current.checklist, [k]: !current.checklist?.[k] }, status: 'in_review' });
  const signOff = async () => {
    await api.update('reviews', current.id, { status: 'signed_off', notes: notes || current.notes, signedAt: today(), accountant: asAccountant ? 'Backline Review Desk' : current.accountant });
    setToast(`${monthLabel(period)} books signed off`);
  };

  return (
    <>
      <PageHeader title="Accountant review" sub="A qualified accountant checks your books every month before anything is filed.">
        <label className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm"><input type="checkbox" className="accent-ink" checked={asAccountant} onChange={(e) => setAsAccountant(e.target.checked)} /> Accountant view</label>
      </PageHeader>

      {!eligible && (
        <Card className="mb-6 flex items-center gap-4 border-amber bg-amber/10 p-5">
          <Lock className="shrink-0" />
          <div className="flex-1 text-sm"><b>Monthly accountant review is part of Compliance-Plus</b> (quarterly on Business). You can still run the checklist yourself.</div>
          <Button size="sm" onClick={() => (window.location.href = '/app/settings#plan')}>Upgrade</Button>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{monthLabel(period)} close</h2>
            {current ? <Badge tone={current.status === 'signed_off' ? 'green' : 'amber'}>{current.status.replace('_', ' ')}</Badge> : <Badge>Not requested</Badge>}
          </div>
          <ul className="mt-5 space-y-3">
            {CHECKS.map(([k, label]) => {
              const done = current?.checklist?.[k];
              return (
                <li key={k} className="flex items-start gap-3 rounded-lg border border-line p-3">
                  <button disabled={!asAccountant || !current || current.status === 'signed_off'} onClick={() => toggle(k)} className="mt-0.5 disabled:cursor-default">
                    {done ? <CheckCircle2 size={20} className="text-signal-dark" /> : <Circle size={20} className="text-ink/25" />}
                  </button>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{label}</div>
                    <div className={`text-xs ${signals[k] ? 'text-signal-dark' : 'text-amber'}`}>Backline check: {signals[k] ? 'looks good' : 'needs attention'}</div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-6">
            {!current && <Button onClick={request}><ShieldCheck size={16} /> Request {monthLabel(period)} review</Button>}
            {current && asAccountant && current.status !== 'signed_off' && (
              <div className="space-y-3">
                <textarea className="input" rows={3} placeholder="Review notes for the business owner…" value={notes} onChange={(e) => setNotes(e.target.value)} />
                <Button variant="signal" disabled={!CHECKS.every(([k]) => current.checklist?.[k])} onClick={signOff}>Sign off books</Button>
              </div>
            )}
            {current && !asAccountant && current.status !== 'signed_off' && <p className="text-sm text-ink/60">Your accountant is working through the checklist. Fixing the items marked "needs attention" speeds things up.</p>}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-semibold">This month at a glance</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-ink/60">Transactions</dt><dd className="num">{monthTx.length} ({monthTx.filter((t) => !t.reviewed).length} unconfirmed)</dd></div>
              <div className="flex justify-between"><dt className="text-ink/60">Net VAT</dt><dd className="num">{compact(v.net)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink/60">Input VAT at risk</dt><dd className="num">{compact(v.atRisk)}</dd></div>
            </dl>
          </Card>
          <Card className="p-6">
            <h2 className="font-semibold">History</h2>
            <ul className="mt-3 space-y-4">
              {reviews.filter((r) => r.period !== period).map((r) => (
                <li key={r.id} className="text-sm">
                  <div className="flex items-center justify-between"><span className="font-medium">{monthLabel(r.period)}</span><Badge tone="green">Signed off {fmtDate(r.signedAt)}</Badge></div>
                  <p className="mt-1 text-ink/70">{r.notes}</p>
                  <div className="mt-1 text-xs text-ink/45">{r.accountant}</div>
                </li>
              ))}
              {reviews.filter((r) => r.period !== period).length === 0 && <li className="text-sm text-ink/50">No previous reviews.</li>}
            </ul>
          </Card>
        </div>
      </div>
      <Toast msg={toast} onDone={() => setToast('')} />
    </>
  );
}
