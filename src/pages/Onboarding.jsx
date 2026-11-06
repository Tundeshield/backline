import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, AlertTriangle } from 'lucide-react';
import { useApp } from '../lib/store.jsx';
import { Logo } from '../components/Layout.jsx';
import { Button, Field } from '../components/ui.jsx';
import { mandateStatus, recommendPlan, PLANS } from '../lib/tax.js';
import { naira, compact, fmtDate } from '../lib/format.js';

const STEPS = ['Business', 'Size & mandate', 'Plan', 'Connect'];
const STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];

export default function Onboarding() {
  const { saveBusiness, business, user } = useApp();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [b, setB] = useState({
    name: '', legalName: '', rcNumber: '', tin: '', sector: '', email: user?.email || '', phone: '', address: '', city: '', state: 'Lagos',
    turnover: 1_500_000_000, staffCount: 10, invoicesPerMonth: 100, fixedAssets: 0, vatRegistered: true, bankDetails: '',
    invoicePrefix: 'INV', nextInvoiceNo: 1001, services: [], slots: [], ...business,
  });
  const set = (k) => (e) => setB({ ...b, [k]: e.target.type === 'number' ? +e.target.value : e.target.value });
  const m = mandateStatus(b.turnover);
  const rec = recommendPlan(b);
  const [plan, setPlan] = useState(b.plan || null);
  const chosen = plan || rec;

  const finish = async () => {
    await saveBusiness({ ...b, plan: chosen, onboarded: true });
    nav('/app');
  };

  return (
    <div className="min-h-full bg-paper">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Logo />
        <div className="mt-10 flex gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full ${i <= step ? 'bg-ink' : 'bg-line'}`} />
              <div className={`mt-2 text-xs font-semibold ${i === step ? 'text-ink' : 'text-ink/40'}`}>{s}</div>
            </div>
          ))}
        </div>

        <div className="card mt-8 p-8">
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <h2 className="display text-2xl font-semibold sm:col-span-2">Tell us about the business</h2>
              <Field label="Trading name"><input className="input" value={b.name} onChange={set('name')} placeholder="Ijebu Gold Foods" /></Field>
              <Field label="Registered (legal) name"><input className="input" value={b.legalName} onChange={set('legalName')} placeholder="Ijebu Gold Foods Limited" /></Field>
              <Field label="CAC RC / BN number"><input className="input" value={b.rcNumber} onChange={set('rcNumber')} placeholder="RC 1234567" /></Field>
              <Field label="Tax ID (TIN)"><input className="input" value={b.tin} onChange={set('tin')} placeholder="12345678-0001" /></Field>
              <Field label="Sector"><input className="input" value={b.sector} onChange={set('sector')} placeholder="e.g. Logistics, Retail, Food processing" /></Field>
              <Field label="Accounts email"><input className="input" type="email" value={b.email} onChange={set('email')} /></Field>
              <Field label="Phone / WhatsApp"><input className="input" value={b.phone} onChange={set('phone')} placeholder="+234…" /></Field>
              <Field label="State"><select className="input" value={b.state} onChange={set('state')}>{STATES.map((s) => <option key={s}>{s}</option>)}</select></Field>
              <Field label="Address" className="sm:col-span-2"><input className="input" value={b.address} onChange={set('address')} /></Field>
              <Field label="City"><input className="input" value={b.city} onChange={set('city')} /></Field>
              <Field label="Bank details for invoices"><input className="input" value={b.bankDetails} onChange={set('bankDetails')} placeholder="Name · Account no · Bank" /></Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <h2 className="display text-2xl font-semibold">Size and e-invoicing status</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={`Annual turnover — ${compact(b.turnover)}`}>
                  <input type="range" min={10_000_000} max={8_000_000_000} step={10_000_000} value={b.turnover} onChange={set('turnover')} className="w-full accent-ink" />
                  <input className="input mt-2" type="number" value={b.turnover} onChange={set('turnover')} />
                </Field>
                <Field label="Fixed assets (₦, approx.)"><input className="input" type="number" value={b.fixedAssets} onChange={set('fixedAssets')} /></Field>
                <Field label="Staff on payroll"><input className="input" type="number" value={b.staffCount} onChange={set('staffCount')} /></Field>
                <Field label="Invoices per month"><input className="input" type="number" value={b.invoicesPerMonth} onChange={set('invoicesPerMonth')} /></Field>
              </div>
              <div className={`flex gap-3 rounded-xl p-4 ${m.inScope ? 'bg-rust/10' : 'bg-signal/10'}`}>
                {m.inScope ? <AlertTriangle className="shrink-0 text-rust" /> : <Check className="shrink-0 text-signal-dark" />}
                <div>
                  <div className="font-semibold">{m.tier} taxpayer — {m.inScope ? 'in scope for e-invoicing now' : `in scope by ${fmtDate(m.deadline)}`}</div>
                  <p className="mt-1 text-sm text-ink/70">{m.note}</p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="display text-2xl font-semibold">Choose a plan</h2>
              <p className="mt-1 text-sm text-ink/60">We recommend <b>{PLANS.find((p) => p.id === rec).name}</b> for your size.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {PLANS.map((p) => (
                  <button key={p.id} onClick={() => setPlan(p.id)} className={`rounded-xl border-2 p-4 text-left transition ${chosen === p.id ? 'border-ink bg-paper' : 'border-line hover:border-ink/40'}`}>
                    <div className="flex items-center justify-between"><span className="font-semibold">{p.name}</span>{p.id === rec && <span className="rounded-full bg-signal px-2 py-0.5 text-[10px] font-bold">RECOMMENDED</span>}</div>
                    <div className="num mt-1 text-xl font-semibold">{naira(p.price)}<span className="text-xs font-normal text-ink/50">/mo</span></div>
                    <div className="mt-1 text-xs text-ink/60">{p.invoices === Infinity ? 'Unlimited' : p.invoices.toLocaleString()} invoices · {p.staff} staff</div>
                  </button>
                ))}
              </div>
              <p className="mt-4 text-xs text-ink/50">Billing starts after a 14-day free trial. Payment collection via Paystack is configured in Settings.</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="display text-2xl font-semibold">Connect your accounts</h2>
              <p className="text-sm text-ink/60">You can do this now or later from Settings. Nothing is switched on until you approve it.</p>
              {[
                ['NRS e-invoicing (MBS)', 'Starts in sandbox. We switch you to live once your Access Point onboarding is approved.', 'Sandbox ready'],
                ['Bank feeds', 'Connect bank accounts through Mono or Okra open banking, or upload statements as CSV.', 'CSV upload ready'],
                ['Mobile money', 'OPay, Moniepoint, PalmPay settlement exports.', 'CSV upload ready'],
                ['WhatsApp Business', 'Connect your WhatsApp number to let the agent reply and chase invoices.', 'Set up later'],
              ].map(([t, d, s]) => (
                <div key={t} className="flex items-center justify-between gap-4 rounded-xl border border-line p-4">
                  <div><div className="font-semibold">{t}</div><div className="text-sm text-ink/60">{d}</div></div>
                  <span className="shrink-0 rounded-full bg-paper-2 px-2.5 py-1 text-xs font-semibold">{s}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 flex justify-between">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
            {step < 3
              ? <Button disabled={step === 0 && (!b.name || !b.tin)} onClick={() => setStep(step + 1)}>Continue</Button>
              : <Button variant="signal" onClick={finish}>Open my back office</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
