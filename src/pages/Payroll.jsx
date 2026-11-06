import { useState } from 'react';
import { Plus, Play, Download, Users } from 'lucide-react';
import { useApp, useCollection } from '../lib/store.jsx';
import { Button, Card, PageHeader, Modal, Field, Badge, Stat, Empty, Toast } from '../components/ui.jsx';
import { payslip, PIT_BANDS } from '../lib/tax.js';
import { naira, compact, monthLabel, pct, thisMonth } from '../lib/format.js';

const csv = (rows, name) => {
  const text = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = name; a.click();
};

export default function Payroll() {
  const { api } = useApp();
  const employees = useCollection('employees').filter((e) => e.active !== false);
  const runs = useCollection('payrollRuns');
  const [editing, setEditing] = useState(null);
  const [viewRun, setViewRun] = useState(null);
  const [toast, setToast] = useState('');
  const period = thisMonth();
  const already = runs.find((r) => r.period === period);

  const slips = employees.map((e) => ({ e, s: payslip(e) }));
  const sum = (k) => slips.reduce((a, x) => a + x.s[k], 0);

  const run = async () => {
    const lines = slips.map(({ e, s }) => ({ employeeId: e.id, name: e.name, role: e.role, state: e.state, bank: e.bank, accountNo: e.accountNo || '', ...s }));
    const totals = Object.fromEntries(['gross', 'paye', 'pension', 'employerPension', 'nhf', 'net'].map((k) => [k, lines.reduce((a, l) => a + l[k], 0)]));
    const created = await api.add('payrollRuns', { period, status: 'approved', lines, totals });
    await api.add('transactions', { date: new Date().toISOString().slice(0, 10), description: `SALARY PAYMENT ${monthLabel(period).toUpperCase()}`, amount: -Math.round(totals.net), category: 'Salaries', source: 'Payroll', auto: false, reviewed: true });
    setViewRun(created);
    setToast(`Payroll for ${monthLabel(period)} approved and booked`);
  };

  return (
    <>
      <PageHeader title="Payroll & PAYE" sub="Nigeria Tax Act 2025 bands, rent relief, 8% / 10% pension and NHF, worked out for every payslip.">
        <Button variant="outline" onClick={() => setEditing({})}><Plus size={16} /> Add employee</Button>
        <Button onClick={run} disabled={!employees.length || !!already}><Play size={16} /> {already ? `${monthLabel(period)} done` : `Run ${monthLabel(period)} payroll`}</Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Monthly gross" value={compact(sum('gross'))} hint={`${employees.length} staff`} icon={Users} />
        <Stat label="PAYE to remit" value={compact(sum('paye'))} hint={`Effective ${pct(sum('paye') / Math.max(1, sum('gross')))}`} />
        <Stat label="Pension (8% + 10%)" value={compact(sum('pension') + sum('employerPension'))} hint="Employee + employer" />
        <Stat label="Net pay" value={compact(sum('net'))} tone="signal" />
      </div>

      <Card className="mt-6">
        {employees.length === 0 ? <Empty icon={Users} title="No employees yet">Add your team to compute PAYE, pension and net pay.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Employee</th><th>State</th><th className="text-right">Gross</th><th className="text-right">Pension</th><th className="text-right">Rent relief /yr</th><th className="text-right">PAYE</th><th className="text-right">Net pay</th></tr></thead>
              <tbody>
                {slips.map(({ e, s }) => (
                  <tr key={e.id} className="cursor-pointer" onClick={() => setEditing(e)}>
                    <td><div className="font-medium">{e.name}</div><div className="text-xs text-ink/50">{e.role}</div></td>
                    <td className="text-ink/70">{e.state}</td>
                    <td className="num text-right">{naira(s.gross)}</td>
                    <td className="num text-right text-ink/70">{naira(s.pension)}</td>
                    <td className="num text-right text-ink/70">{naira(s.rentRelief)}</td>
                    <td className="num text-right">{naira(s.paye)}</td>
                    <td className="num text-right font-semibold">{naira(s.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <h2 className="mb-3 mt-8 font-semibold">Payroll runs</h2>
      <Card>
        <table className="tbl">
          <thead><tr><th>Period</th><th>Status</th><th className="text-right">Gross</th><th className="text-right">PAYE</th><th className="text-right">Net</th><th /></tr></thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td className="font-medium">{monthLabel(r.period)}</td>
                <td><Badge tone={r.status === 'paid' ? 'green' : 'blue'}>{r.status}</Badge></td>
                <td className="num text-right">{naira(r.totals.gross)}</td>
                <td className="num text-right">{naira(r.totals.paye)}</td>
                <td className="num text-right font-semibold">{naira(r.totals.net)}</td>
                <td className="text-right"><Button size="sm" variant="ghost" onClick={() => setViewRun(r)}>Open</Button></td>
              </tr>
            ))}
            {!runs.length && <tr><td colSpan={6} className="text-center text-ink/50">No runs yet.</td></tr>}
          </tbody>
        </table>
      </Card>

      <EmployeeModal key={editing?.id || 'new'} emp={editing} onClose={() => setEditing(null)} api={api} />

      <Modal open={!!viewRun} onClose={() => setViewRun(null)} title={viewRun ? `Payroll · ${monthLabel(viewRun.period)}` : ''} wide>
        {viewRun && <>
          <div className="mb-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => csv([['Name', 'Bank', 'Account', 'Net pay'], ...viewRun.lines.map((l) => [l.name, l.bank || '', l.accountNo || '', l.net.toFixed(2)])], `bank-schedule-${viewRun.period}.csv`)}><Download size={14} /> Bank schedule</Button>
            <Button size="sm" variant="outline" onClick={() => csv([['Name', 'State', 'Gross', 'Chargeable (annual)', 'PAYE'], ...viewRun.lines.map((l) => [l.name, l.state || '', l.gross, l.chargeableAnnual, l.paye.toFixed(2)])], `paye-schedule-${viewRun.period}.csv`)}><Download size={14} /> PAYE schedule</Button>
            <Button size="sm" variant="outline" onClick={() => csv([['Name', 'Employee 8%', 'Employer 10%', 'Total'], ...viewRun.lines.map((l) => [l.name, l.pension.toFixed(2), l.employerPension.toFixed(2), (l.pension + l.employerPension).toFixed(2)])], `pension-schedule-${viewRun.period}.csv`)}><Download size={14} /> Pension schedule</Button>
            {viewRun.status !== 'paid' && <Button size="sm" onClick={async () => { await api.update('payrollRuns', viewRun.id, { status: 'paid' }); setViewRun({ ...viewRun, status: 'paid' }); }}>Mark paid</Button>}
          </div>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Employee</th><th className="text-right">Gross</th><th className="text-right">Pension</th><th className="text-right">NHF</th><th className="text-right">PAYE</th><th className="text-right">Net</th></tr></thead>
              <tbody>
                {viewRun.lines.map((l) => <tr key={l.employeeId}><td>{l.name}</td><td className="num text-right">{naira(l.gross)}</td><td className="num text-right">{naira(l.pension)}</td><td className="num text-right">{naira(l.nhf)}</td><td className="num text-right">{naira(l.paye)}</td><td className="num text-right font-semibold">{naira(l.net)}</td></tr>)}
                <tr className="font-semibold"><td>Total</td><td className="num text-right">{naira(viewRun.totals.gross)}</td><td className="num text-right">{naira(viewRun.totals.pension)}</td><td className="num text-right">{naira(viewRun.totals.nhf)}</td><td className="num text-right">{naira(viewRun.totals.paye)}</td><td className="num text-right">{naira(viewRun.totals.net)}</td></tr>
              </tbody>
            </table>
          </div>
        </>}
      </Modal>
      <Toast msg={toast} onDone={() => setToast('')} />
    </>
  );
}

function EmployeeModal({ emp, onClose, api }) {
  const [e, setE] = useState(() => ({ name: '', role: '', state: 'Lagos', bank: '', accountNo: '', basic: 0, housing: 0, transport: 0, other: 0, annualRent: 0, pension: true, nhf: false, active: true, ...(emp || {}) }));
  if (!emp) return null;
  const s = payslip(e);
  const num = (k) => (ev) => setE({ ...e, [k]: +ev.target.value });
  const save = async () => { if (e.id) await api.update('employees', e.id, e); else await api.add('employees', e); onClose(); };

  let lower = 0;
  return (
    <Modal open onClose={onClose} title={e.id ? e.name : 'Add employee'} wide>
      <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full name" className="col-span-2"><input className="input" value={e.name} onChange={(ev) => setE({ ...e, name: ev.target.value })} /></Field>
          <Field label="Role"><input className="input" value={e.role} onChange={(ev) => setE({ ...e, role: ev.target.value })} /></Field>
          <Field label="State of residence"><input className="input" value={e.state} onChange={(ev) => setE({ ...e, state: ev.target.value })} /></Field>
          <Field label="Bank"><input className="input" value={e.bank} onChange={(ev) => setE({ ...e, bank: ev.target.value })} /></Field>
          <Field label="Account no."><input className="input num" value={e.accountNo} onChange={(ev) => setE({ ...e, accountNo: ev.target.value })} /></Field>
          <Field label="Basic (monthly)"><input className="input num" type="number" value={e.basic} onChange={num('basic')} /></Field>
          <Field label="Housing (monthly)"><input className="input num" type="number" value={e.housing} onChange={num('housing')} /></Field>
          <Field label="Transport (monthly)"><input className="input num" type="number" value={e.transport} onChange={num('transport')} /></Field>
          <Field label="Other allowances"><input className="input num" type="number" value={e.other} onChange={num('other')} /></Field>
          <Field label="Annual rent paid (for relief)" className="col-span-2"><input className="input num" type="number" value={e.annualRent} onChange={num('annualRent')} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-ink" checked={e.pension} onChange={(ev) => setE({ ...e, pension: ev.target.checked })} /> Contributory pension</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-ink" checked={e.nhf} onChange={(ev) => setE({ ...e, nhf: ev.target.checked })} /> NHF (2.5% of basic)</label>
        </div>

        <div className="rounded-xl bg-paper p-5 text-sm">
          <div className="label">Payslip preview</div>
          {[['Gross pay', s.gross], ['Pension (8%)', -s.pension], ['NHF', -s.nhf], ['PAYE', -s.paye]].map(([l, v]) => <div key={l} className="flex justify-between py-0.5"><span className="text-ink/70">{l}</span><span className="num">{naira(v)}</span></div>)}
          <div className="mt-1 flex justify-between border-t border-line pt-2 text-base font-semibold"><span>Net pay</span><span className="num">{naira(s.net)}</span></div>
          <div className="label mt-5">How PAYE was worked out (annual)</div>
          <div className="flex justify-between py-0.5"><span className="text-ink/70">Gross × 12</span><span className="num">{naira(s.gross * 12)}</span></div>
          <div className="flex justify-between py-0.5"><span className="text-ink/70">− Pension & NHF</span><span className="num">{naira((s.pension + s.nhf) * 12)}</span></div>
          <div className="flex justify-between py-0.5"><span className="text-ink/70">− Rent relief (20%, max ₦500k)</span><span className="num">{naira(s.rentRelief)}</span></div>
          <div className="flex justify-between py-0.5 font-medium"><span>Chargeable income</span><span className="num">{naira(s.chargeableAnnual)}</span></div>
          <div className="mt-2 space-y-0.5">
            {s.bands.map((b, i) => {
              const label = `${naira(lower)} – ${PIT_BANDS[i].size === Infinity ? '∞' : naira(lower + PIT_BANDS[i].size)} @ ${b.rate * 100}%`;
              lower += PIT_BANDS[i].size;
              return <div key={i} className="flex justify-between text-xs"><span className="text-ink/60">{label}</span><span className="num">{naira(b.tax)}</span></div>;
            })}
          </div>
          <div className="mt-2 flex justify-between border-t border-line pt-2 font-semibold"><span>Annual tax · effective {pct(s.effectiveRate)}</span><span className="num">{naira(s.annualTax)}</span></div>
          <div className="mt-2 text-xs text-ink/50">Employer pension (10%): {naira(s.employerPension)} / month</div>
        </div>
      </div>
      <div className="mt-6 flex justify-between">
        {e.id ? <Button variant="ghost" className="text-rust" onClick={async () => { await api.update('employees', e.id, { active: false }); onClose(); }}>Remove from payroll</Button> : <span />}
        <Button onClick={save} disabled={!e.name}>Save employee</Button>
      </div>
    </Modal>
  );
}
