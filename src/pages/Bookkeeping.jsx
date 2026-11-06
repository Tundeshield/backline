import { useMemo, useRef, useState } from 'react';
import { Upload, Plus, CheckCheck, Wallet } from 'lucide-react';
import { useApp, useCollection } from '../lib/store.jsx';
import { Button, Card, PageHeader, Modal, Field, Badge, Empty, Bars, Toast } from '../components/ui.jsx';
import { CATEGORIES, categorise, profitAndLoss, cashFlowByMonth } from '../lib/tax.js';
import { naira, compact, today, monthLabel, fmtDate } from '../lib/format.js';

const ALL_CATS = [...CATEGORIES.income, ...CATEGORIES.expense];

/** Parse a bank / mobile-money CSV. Accepts Date, Description/Narration, Amount — or Debit + Credit columns. */
export function parseStatement(text, source = 'CSV import') {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const split = (l) => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"').trim());
  const head = split(lines[0]).map((h) => h.toLowerCase());
  const idx = (...names) => head.findIndex((h) => names.some((n) => h.includes(n)));
  const di = idx('date'), ni = idx('description', 'narration', 'details', 'remarks'), ai = idx('amount'), dr = idx('debit', 'withdrawal'), cr = idx('credit', 'deposit');
  const num = (s) => +String(s || '').replace(/[₦,\s]/g, '') || 0;
  return lines.slice(1).map(split).map((c) => {
    const amount = ai >= 0 ? num(c[ai]) : num(c[cr]) - num(c[dr]);
    const raw = c[di] || today();
    const d = new Date(raw);
    const date = isNaN(d) ? raw : d.toISOString().slice(0, 10);
    const description = c[ni] || '';
    return { date, description, amount, source, category: categorise(description, amount), auto: true, reviewed: false };
  }).filter((t) => t.amount !== 0);
}

export default function Bookkeeping() {
  const { api } = useApp();
  const txns = useCollection('transactions');
  const fileRef = useRef();
  const [month, setMonth] = useState(today().slice(0, 7));
  const [filter, setFilter] = useState('all');
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState('');
  const [nt, setNt] = useState({ date: today(), description: '', amount: '', source: 'Cash' });

  const months = useMemo(() => [...new Set(txns.map((t) => String(t.date).slice(0, 7)))].sort().reverse(), [txns]);
  const pl = profitAndLoss(txns, month + '-01', month + '-31');
  const cf = cashFlowByMonth(txns).slice(-6);
  const shown = txns
    .filter((t) => String(t.date).startsWith(month))
    .filter((t) => filter === 'all' || (filter === 'review' ? !t.reviewed : filter === 'in' ? t.amount > 0 : t.amount < 0))
    .sort((a, b) => b.date.localeCompare(a.date));
  const toReview = txns.filter((t) => !t.reviewed);

  const importFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const rows = parseStatement(await f.text(), f.name.replace(/\.csv$/i, ''));
    for (const r of rows) await api.add('transactions', r);
    setToast(`Imported ${rows.length} transactions and auto-categorised them`);
    e.target.value = '';
  };

  const confirmAll = async () => {
    for (const t of shown.filter((x) => !x.reviewed)) await api.update('transactions', t.id, { reviewed: true });
    setToast('Categories confirmed');
  };

  return (
    <>
      <PageHeader title="Bookkeeping" sub="Bank and mobile-money transactions, categorised automatically. Confirm or correct, and the reports update.">
        <input ref={fileRef} type="file" accept=".csv" hidden onChange={importFile} />
        <Button variant="outline" onClick={() => fileRef.current.click()}><Upload size={16} /> Import statement CSV</Button>
        <Button onClick={() => setAdding(true)}><Plus size={16} /> Add transaction</Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Profit & loss</h2>
            <select className="input max-w-40" value={month} onChange={(e) => setMonth(e.target.value)}>
              {(months.length ? months : [month]).map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </div>
          <div className="space-y-1 text-sm">
            <div className="label mt-2">Income</div>
            {Object.entries(pl.income).map(([k, v]) => <div key={k} className="flex justify-between"><span>{k}</span><span className="num">{naira(v)}</span></div>)}
            <div className="flex justify-between border-t border-line pt-1 font-semibold"><span>Total income</span><span className="num">{naira(pl.totalIncome)}</span></div>
            <div className="label mt-4">Expenses</div>
            {Object.entries(pl.expense).sort((a, b) => b[1] - a[1]).map(([k, v]) => <div key={k} className="flex justify-between"><span>{k}</span><span className="num">{naira(v)}</span></div>)}
            <div className="flex justify-between border-t border-line pt-1 font-semibold"><span>Total expenses</span><span className="num">{naira(pl.totalExpense)}</span></div>
            <div className={`mt-3 flex justify-between rounded-lg px-3 py-2 text-base font-semibold ${pl.net >= 0 ? 'bg-signal/15' : 'bg-rust/10'}`}><span>Net {pl.net >= 0 ? 'profit' : 'loss'}</span><span className="num">{naira(pl.net)}</span></div>
            <p className="pt-2 text-xs text-ink/50">Fixed-asset purchases and own-account transfers are excluded from P&L (capital allowances are handled in tax prep).</p>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-6 font-semibold">Cash flow · last 6 months</h2>
          <Bars data={cf.map((c) => ({ label: monthLabel(c.month), a: c.inflow, b: c.outflow }))} height={190} />
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            {cf.slice(-1).map((c) => [['Inflow', c.inflow, 'text-signal-dark'], ['Outflow', c.outflow, ''], ['Net', c.net, c.net >= 0 ? 'text-signal-dark' : 'text-rust']].map(([l, v, cls]) => (
              <div key={l} className="rounded-lg bg-paper p-3"><div className="text-xs text-ink/50">{l} · {monthLabel(c.month)}</div><div className={`num font-semibold ${cls}`}>{compact(v)}</div></div>
            )))}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
          {[['all', 'All'], ['review', `To confirm (${toReview.length})`], ['in', 'Money in'], ['out', 'Money out']].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === k ? 'bg-ink text-paper' : 'bg-paper-2 text-ink/70'}`}>{l}</button>
          ))}
          <Button size="sm" variant="outline" className="ml-auto" onClick={confirmAll}><CheckCheck size={14} /> Confirm all shown</Button>
        </div>
        {shown.length === 0 ? <Empty icon={Wallet} title="No transactions this month">Import a bank or mobile-money statement (CSV) to get started.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Description</th><th>Source</th><th>Category</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {shown.map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap text-ink/70">{fmtDate(t.date)}</td>
                    <td className="max-w-xs truncate">{t.description}</td>
                    <td><Badge>{t.source}</Badge></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <select className={`rounded-md border px-2 py-1 text-xs ${t.reviewed ? 'border-line bg-white' : 'border-amber bg-amber/10'}`} value={t.category}
                          onChange={(e) => api.update('transactions', t.id, { category: e.target.value, reviewed: true, auto: false })}>
                          {ALL_CATS.map((c) => <option key={c}>{c}</option>)}
                        </select>
                        {!t.reviewed && <button className="text-xs font-semibold text-signal-dark hover:underline" onClick={() => api.update('transactions', t.id, { reviewed: true })}>OK</button>}
                      </div>
                    </td>
                    <td className={`num whitespace-nowrap text-right font-semibold ${t.amount > 0 ? 'text-signal-dark' : ''}`}>{t.amount > 0 ? '+' : '−'}{naira(Math.abs(t.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add transaction">
        <div className="grid gap-4">
          <Field label="Date"><input type="date" className="input" value={nt.date} onChange={(e) => setNt({ ...nt, date: e.target.value })} /></Field>
          <Field label="Description"><input className="input" value={nt.description} onChange={(e) => setNt({ ...nt, description: e.target.value })} placeholder="e.g. Diesel for generator" /></Field>
          <Field label="Amount (negative for money out)"><input className="input num" type="number" value={nt.amount} onChange={(e) => setNt({ ...nt, amount: e.target.value })} /></Field>
          <Field label="Source"><select className="input" value={nt.source} onChange={(e) => setNt({ ...nt, source: e.target.value })}>{['Cash', 'Zenith Bank', 'GTBank', 'Access Bank', 'Moniepoint', 'OPay', 'PalmPay'].map((s) => <option key={s}>{s}</option>)}</select></Field>
          <div className="text-sm text-ink/60">Suggested category: <b>{categorise(nt.description, +nt.amount)}</b></div>
          <Button onClick={async () => { await api.add('transactions', { ...nt, amount: +nt.amount, category: categorise(nt.description, +nt.amount), auto: false, reviewed: true }); setAdding(false); setNt({ ...nt, description: '', amount: '' }); }} disabled={!nt.description || !+nt.amount}>Save</Button>
        </div>
      </Modal>
      <Toast msg={toast} onDone={() => setToast('')} />
    </>
  );
}
