import { Link } from 'react-router-dom';
import { FileText, AlertTriangle, TrendingUp, Receipt, MessageCircle, ShieldCheck, ArrowRight, Wallet } from 'lucide-react';
import { useApp, useCollection } from '../lib/store.jsx';
import { Card, PageHeader, Stat, Bars, Badge, Button } from '../components/ui.jsx';
import { profitAndLoss, cashFlowByMonth, vatReturn, mandateStatus } from '../lib/tax.js';
import { compact, naira, today, daysBetween, thisMonth, monthLabel, fmtDate } from '../lib/format.js';

export default function Dashboard() {
  const { business } = useApp();
  const invoices = useCollection('invoices');
  const txns = useCollection('transactions');
  const receipts = useCollection('receipts');
  const convos = useCollection('conversations');
  const reviews = useCollection('reviews');

  const t = today();
  const open = invoices.filter((i) => i.status === 'sent');
  const overdue = open.filter((i) => i.dueDate < t);
  const receivable = open.reduce((a, i) => a + i.totals.total, 0);
  const uncleared = invoices.filter((i) => i.status !== 'draft' && !i.irn);
  const from = new Date(); from.setDate(from.getDate() - 30);
  const pl = profitAndLoss(txns, from.toISOString().slice(0, 10), t);
  const cf = cashFlowByMonth(txns).slice(-4);
  const vat = vatReturn(invoices, receipts);
  const m = mandateStatus(business.turnover);
  const openConvos = convos.filter((c) => c.status === 'open');
  const lastReview = reviews[0];

  const tasks = [
    overdue.length && { icon: AlertTriangle, tone: 'rust', text: `${overdue.length} invoice${overdue.length > 1 ? 's' : ''} overdue (${compact(overdue.reduce((a, i) => a + i.totals.total, 0))})`, to: '/app/invoices', cta: 'Chase' },
    uncleared.length && { icon: FileText, tone: 'rust', text: `${uncleared.length} issued invoice${uncleared.length > 1 ? 's' : ''} not yet cleared on NRS`, to: '/app/invoices', cta: 'Clear' },
    vat.blocked.length && { icon: Receipt, tone: 'amber', text: `${compact(vat.atRisk)} input VAT at risk on ${vat.blocked.length} receipts`, to: '/app/vat', cta: 'Fix' },
    txns.filter((x) => !x.reviewed).length && { icon: Wallet, tone: 'amber', text: `${txns.filter((x) => !x.reviewed).length} auto-categorised transactions to confirm`, to: '/app/books', cta: 'Review' },
    openConvos.length && { icon: MessageCircle, tone: 'blue', text: `${openConvos.length} customer message${openConvos.length > 1 ? 's' : ''} waiting`, to: '/app/inbox', cta: 'Reply' },
  ].filter(Boolean);

  return (
    <>
      <PageHeader title={`Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}, ${business.name}`} sub={`${monthLabel(thisMonth())} · ${m.tier} taxpayer${m.inScope ? ' · e-invoicing mandatory' : ''}`}>
        <Link to="/app/invoices?new=1"><Button><FileText size={16} /> New invoice</Button></Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Receivables" value={compact(receivable)} hint={`${open.length} open · ${overdue.length} overdue`} tone={overdue.length ? 'rust' : 'ink'} icon={FileText} />
        <Stat label="Net profit · 30 days" value={compact(pl.net)} hint={`${compact(pl.totalIncome)} in · ${compact(pl.totalExpense)} out`} tone={pl.net >= 0 ? 'signal' : 'rust'} icon={TrendingUp} />
        <Stat label="VAT position" value={compact(vat.net)} hint={`${compact(vat.output)} output − ${compact(vat.input)} input`} icon={Receipt} />
        <Stat label="VAT recovered" value={compact(vat.input)} hint={`${compact(vat.atRisk)} still at risk`} tone="signal" icon={ShieldCheck} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-semibold">Cash flow</h2>
            <div className="flex gap-4 text-xs text-ink/60"><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-signal" />In</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-ink/70" />Out</span></div>
          </div>
          <Bars data={cf.map((c) => ({ label: monthLabel(c.month), a: c.inflow, b: c.outflow }))} height={200} />
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-semibold">Needs your attention</h2>
          {tasks.length === 0 && <p className="text-sm text-ink/60">All clear. Your back office is up to date.</p>}
          <ul className="space-y-2">
            {tasks.map((x, i) => (
              <li key={i}>
                <Link to={x.to} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 transition hover:border-ink">
                  <x.icon size={17} className={{ rust: 'text-rust', amber: 'text-amber', blue: 'text-sky' }[x.tone]} />
                  <span className="flex-1 text-sm">{x.text}</span>
                  <span className="flex items-center gap-1 text-xs font-semibold">{x.cta}<ArrowRight size={12} /></span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between px-6 pt-5"><h2 className="font-semibold">Recent invoices</h2><Link to="/app/invoices" className="text-xs font-semibold underline">All invoices</Link></div>
          <table className="tbl mt-3">
            <tbody>
              {invoices.slice(0, 5).map((i) => (
                <tr key={i.id}>
                  <td><Link to={`/app/invoices/${i.id}`} className="font-semibold hover:underline">{i.number}</Link><div className="text-xs text-ink/50">{i.customer?.name}</div></td>
                  <td className="num text-right">{naira(i.totals.total)}</td>
                  <td className="text-right">{statusBadge(i)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card className="p-6">
          <h2 className="font-semibold">Accountant review</h2>
          {lastReview ? (
            <div className="mt-3">
              <div className="flex items-center gap-2"><Badge tone={lastReview.status === 'signed_off' ? 'green' : 'amber'}>{lastReview.status === 'signed_off' ? 'Signed off' : 'In review'}</Badge><span className="text-sm text-ink/60">{monthLabel(lastReview.period)}</span></div>
              <p className="mt-3 text-sm text-ink/75">{lastReview.notes}</p>
              <div className="mt-3 text-xs text-ink/50">{lastReview.accountant} · {fmtDate(lastReview.signedAt)}</div>
            </div>
          ) : <p className="mt-2 text-sm text-ink/60">No reviews yet. Request one when this month's books are ready.</p>}
          <Link to="/app/review"><Button variant="outline" size="sm" className="mt-4">Open review desk</Button></Link>
        </Card>
      </div>
    </>
  );
}

export function statusBadge(i) {
  const t = today();
  if (i.status === 'draft') return <Badge>Draft</Badge>;
  if (i.status === 'void') return <Badge>Void</Badge>;
  if (i.status === 'paid') return <Badge tone="green">Paid</Badge>;
  if (i.dueDate < t) return <Badge tone="red">{daysBetween(i.dueDate, t)}d overdue</Badge>;
  return <Badge tone="blue">Due {fmtDate(i.dueDate)}</Badge>;
}
