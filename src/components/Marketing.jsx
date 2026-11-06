import { useMemo } from 'react';
import { FileText, BookOpen, Users, MessageCircle, Check, Receipt } from 'lucide-react';
import { seedDemo } from '../lib/seed.js';
import { profitAndLoss, cashFlowByMonth, vatReturn } from '../lib/tax.js';
import { compact, naira, today, addDays, monthLabel, daysBetween } from '../lib/format.js';

/* ------------------------------------------------------------------ *
 * Hero: one week of a sample business's back office, joined by the
 * back line. Shows the service as connected work, not widgets.
 * ------------------------------------------------------------------ */
const WEEK = [
  { icon: FileText, area: 'Invoicing', title: 'Invoice IGF-1046 sent to Lekki Fresh Mart', meta: '₦1,666,250 · e-invoice reference issued', status: 'Sent' },
  { icon: BookOpen, area: 'Bookkeeping', title: '48 bank and Moniepoint transactions sorted', meta: 'October profit & loss ready', status: 'Done' },
  { icon: Users, area: 'Payroll', title: 'Payroll for 6 staff prepared', meta: 'PAYE ₦267,228 ready to remit', status: 'Ready' },
  { icon: MessageCircle, area: 'Follow-ups', title: 'Payment reminder sent to Naija Kitchen', meta: 'IGF-1044 · 8 days overdue · WhatsApp', status: 'Sent' },
];

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div className="absolute -right-3 -top-6 z-10 hidden rotate-[2.5deg] rounded-xl border border-line bg-white px-4 py-3 shadow-[0_12px_30px_-12px_rgba(23,34,49,.35)] sm:block">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/45">Tax invoice</div>
        <div className="num text-sm font-semibold">IGF-1046</div>
        <div className="num text-lg font-semibold">₦1,666,250</div>
        <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-signal-dark"><Check size={12} strokeWidth={3} />IRN + QR issued</div>
      </div>

      <div className="rounded-[22px] border border-line bg-white p-5 shadow-[0_30px_60px_-30px_rgba(23,34,49,.45)] sm:p-7">
        <div className="border-b border-line pb-4 pr-24 sm:pr-28">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">This week, handled</div>
          <div className="display mt-1 text-xl font-semibold">Ijebu Gold Foods</div>
          <div className="mt-0.5 text-[11.5px] text-ink/50">Sample business · food processing, Lagos</div>
        </div>

        <ol className="backline-rule mt-4 space-y-4">
          {WEEK.map((w) => (
            <li key={w.title} className="relative flex gap-4 pl-0">
              <span className="relative z-[1] grid h-6 w-6 shrink-0 place-items-center rounded-full border border-sand bg-paper"><w.icon size={12} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[13.5px] font-semibold leading-snug">{w.title}</div>
                  <span className="mt-0.5 shrink-0 text-[11px] font-semibold text-signal-dark">{w.status}</span>
                </div>
                <div className="num mt-0.5 text-[11.5px] text-ink/55">{w.meta}</div>
              </div>
            </li>
          ))}
          <li className="relative flex gap-4">
            <span className="relative z-[1] grid h-6 w-6 shrink-0 place-items-center rounded-full bg-terracotta text-[9px] font-bold text-white">CO</span>
            <div className="min-w-0 flex-1 rounded-xl bg-terracotta-soft/70 px-3.5 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="text-[13.5px] font-semibold leading-snug">October books reviewed by an accountant</div>
                <span className="mt-0.5 shrink-0 text-[11px] font-semibold text-terracotta-dark">Signed off</span>
              </div>
              <div className="display mt-1 text-[14px] italic leading-snug text-terracotta-dark">"One note: ask NNPC Retail for proper VAT invoices before the 21st."</div>
            </div>
          </li>
        </ol>

        <div className="mt-5 flex items-center gap-2 border-t border-line pt-4 text-[12px] text-ink/60">
          <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
          Each step updated the books, VAT records and cash flow automatically.
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Accountant review sheet with a reviewer's margin notes.
 * ------------------------------------------------------------------ */
const CHECKS = [
  ['Bank and mobile-money balances match statements', true],
  ['Every transaction categorised', true],
  ['Issued invoices have an e-invoice reference', true],
  ['VAT schedules reviewed', 'note'],
  ['Payroll, PAYE and pension checked', true],
];

export function ReviewSheet() {
  return (
    <div className="relative mx-auto w-full max-w-[500px]">
      <div className="absolute inset-0 translate-x-3 translate-y-3 rotate-[1.5deg] rounded-[18px] border border-sand bg-paper" aria-hidden />
      <div className="relative rounded-[18px] border border-sand bg-white p-6 shadow-[0_24px_50px_-28px_rgba(23,34,49,.4)] sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">Monthly review · October</div>
            <div className="display mt-1 text-2xl font-semibold">Ijebu Gold Foods Ltd</div>
          </div>
          <span className="rounded-full bg-paper px-2.5 py-1 text-[10px] font-semibold text-ink/55">Example review</span>
        </div>

        <ul className="mt-6 space-y-3">
          {CHECKS.map(([label, state]) => (
            <li key={label} className="flex items-start gap-3 text-[14px]">
              <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${state === true ? 'bg-signal/15 text-signal-dark' : 'bg-terracotta-soft text-terracotta-dark'}`}>
                {state === true ? <Check size={12} strokeWidth={3} /> : <span className="text-[11px] font-bold">!</span>}
              </span>
              <span className={state === 'note' ? 'font-semibold' : ''}>{label}</span>
            </li>
          ))}
        </ul>

        <div className="relative mt-6 rounded-xl border border-dashed border-terracotta/40 bg-terracotta-soft/40 p-4">
          <svg className="absolute -left-2 -top-3 text-terracotta" width="46" height="20" viewBox="0 0 46 20" fill="none" aria-hidden>
            <path d="M2 14c8-9 22-12 40-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p className="display text-[17px] italic leading-snug text-terracotta-dark">
            Two diesel receipts have no VAT invoice, so <span className="num not-italic font-semibold">₦96,000</span> of input VAT can't be claimed yet. Ask NNPC Retail for proper tax invoices and we'll include it next month.
          </p>
        </div>

        <div className="mt-6 flex items-center gap-3 border-t border-line pt-5">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-sm font-semibold text-paper">CO</span>
          <div className="flex-1">
            <div className="text-sm font-semibold">Chinedu O., ACA</div>
            <div className="text-xs text-ink/55">Backline review desk</div>
          </div>
          <div className="text-right">
            <div className="display text-lg italic text-ink/70">C. Okafor</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-signal-dark">Signed off</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Financial visibility — computed live from the demo business with the
 * same tax engine the app uses, so the numbers match the demo.
 * ------------------------------------------------------------------ */
export function VisibilityPanel() {
  const d = useMemo(() => {
    const { collections: c } = seedDemo();
    const t = today();
    const pl = profitAndLoss(c.transactions, addDays(t, -30), t);
    const cf = cashFlowByMonth(c.transactions).slice(-4);
    const open = c.invoices.filter((i) => i.status === 'sent');
    const vat = vatReturn(c.invoices, c.receipts);
    const run = c.payrollRuns[0];
    const topExp = Object.entries(pl.expense).sort((a, b) => b[1] - a[1]).slice(0, 4);
    return { pl, cf, open, vat, run, topExp, t };
  }, []);
  const max = Math.max(1, ...d.cf.flatMap((c) => [c.inflow, c.outflow]));

  const Tile = ({ label, children, className = '' }) => (
    <div className={`rounded-2xl border border-line bg-white p-5 ${className}`}>
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/45">{label}</div>
      {children}
    </div>
  );

  return (
    <div className="grid gap-3 sm:gap-4 md:grid-cols-6">
      <Tile label="Profit & loss · last 30 days" className="md:col-span-2">
        <div className={`num mt-2 text-3xl font-semibold ${d.pl.net >= 0 ? 'text-signal-dark' : 'text-rust'}`}>{compact(d.pl.net)}</div>
        <div className="mt-3 space-y-1.5 text-[13px]">
          <div className="flex justify-between"><span className="text-ink/60">Income</span><span className="num">{compact(d.pl.totalIncome)}</span></div>
          <div className="flex justify-between"><span className="text-ink/60">Expenses</span><span className="num">{compact(d.pl.totalExpense)}</span></div>
        </div>
      </Tile>

      <Tile label="Cash flow" className="md:col-span-4">
        <div className="mt-4 flex h-32 items-end gap-3 sm:gap-6">
          {d.cf.map((c) => (
            <div key={c.month} className="flex h-full flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end justify-center gap-1">
                <div className="w-[38%] max-w-6 rounded-t bg-ink" style={{ height: `${(c.inflow / max) * 100}%` }} title="In" />
                <div className="w-[38%] max-w-6 rounded-t bg-sand" style={{ height: `${(c.outflow / max) * 100}%` }} title="Out" />
              </div>
              <div className="text-[11px] text-ink/50">{monthLabel(c.month).split(' ')[0]}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-4 text-[11px] text-ink/55"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-ink" />Money in</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-sand" />Money out</span></div>
      </Tile>

      <Tile label="Where the money went" className="md:col-span-2">
        <ul className="mt-3 space-y-2 text-[13px]">
          {d.topExp.map(([k, v]) => (
            <li key={k}>
              <div className="flex justify-between gap-2"><span className="truncate text-ink/70">{k}</span><span className="num">{compact(v)}</span></div>
              <div className="mt-1 h-1 rounded-full bg-paper-2"><div className="h-full rounded-full bg-terracotta/70" style={{ width: `${(v / d.pl.totalExpense) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      </Tile>

      <Tile label="Outstanding invoices" className="md:col-span-2">
        <ul className="mt-3 space-y-2.5 text-[13px]">
          {d.open.slice(0, 4).map((i) => {
            const late = i.dueDate < d.t;
            return (
              <li key={i.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0"><span className="num font-semibold">{i.number}</span> <span className="block truncate text-[11.5px] text-ink/55">{i.customer.name}</span></span>
                <span className="text-right"><span className="num block">{compact(i.totals.total)}</span><span className={`text-[11px] font-semibold ${late ? 'text-rust' : 'text-ink/50'}`}>{late ? `${daysBetween(i.dueDate, d.t)}d overdue` : 'Not yet due'}</span></span>
              </li>
            );
          })}
        </ul>
      </Tile>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 md:col-span-2 md:grid-cols-1">
        <Tile label="Payroll · last run">
          <div className="num mt-2 text-xl font-semibold">{naira(d.run.totals.gross)}</div>
          <div className="mt-1 text-[12px] text-ink/55"><Users size={12} className="mr-1 inline" />{d.run.lines.length} staff · PAYE <span className="num">{compact(d.run.totals.paye)}</span></div>
        </Tile>
        <Tile label="Tax records">
          <div className="mt-2 flex items-baseline justify-between gap-2"><span className="text-[13px] text-ink/60">VAT recoverable</span><span className="num font-semibold text-signal-dark">{compact(d.vat.input)}</span></div>
          <div className="mt-1 flex items-baseline justify-between gap-2"><span className="text-[13px] text-ink/60"><Receipt size={12} className="mr-1 inline" />Receipts to fix</span><span className="num font-semibold text-rust">{d.vat.blocked.length}</span></div>
        </Tile>
      </div>
    </div>
  );
}
