import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useApp } from '../lib/store.jsx';
import { Button, Card, PageHeader, Field, Badge, Toast } from '../components/ui.jsx';
import { PLANS, mandateStatus } from '../lib/tax.js';
import { naira, compact } from '../lib/format.js';

export default function Settings() {
  const { business, saveBusiness, demoMode, startDemo } = useApp();
  const [b, setB] = useState(business);
  const [toast, setToast] = useState('');
  const [slot, setSlot] = useState('');
  const set = (k) => (e) => setB({ ...b, [k]: e.target.type === 'number' ? +e.target.value : e.target.value });
  const save = async (patch = b) => { await saveBusiness(patch); setToast('Saved'); };
  const m = mandateStatus(b.turnover);

  return (
    <>
      <PageHeader title="Settings" sub="Business profile, price list, e-invoicing connection and plan." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 font-semibold">Business</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[['name', 'Trading name'], ['legalName', 'Legal name'], ['rcNumber', 'RC number'], ['tin', 'TIN'], ['email', 'Accounts email'], ['phone', 'Phone / WhatsApp'], ['address', 'Address'], ['city', 'City'], ['bankDetails', 'Bank details on invoices'], ['invoicePrefix', 'Invoice prefix']].map(([k, l]) => (
              <Field key={k} label={l}><input className="input" value={b[k] || ''} onChange={set(k)} /></Field>
            ))}
            <Field label="Next invoice number"><input className="input num" type="number" value={b.nextInvoiceNo || 1001} onChange={set('nextInvoiceNo')} /></Field>
            <Field label={`Annual turnover (${compact(b.turnover || 0)})`}><input className="input num" type="number" value={b.turnover || 0} onChange={set('turnover')} /></Field>
            <Field label="Fixed assets (₦)"><input className="input num" type="number" value={b.fixedAssets || 0} onChange={set('fixedAssets')} /></Field>
          </div>
          <div className="mt-3 text-xs text-ink/60">{m.tier} taxpayer · {m.note}</div>
          <Button className="mt-4" onClick={() => save()}>Save business</Button>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 font-semibold">Price list</h2>
            <p className="mb-3 text-xs text-ink/55">Used for invoice line suggestions and by the agent when customers ask for prices.</p>
            {(b.services || []).map((s, i) => (
              <div key={i} className="mb-2 grid grid-cols-[1fr_140px_32px] gap-2">
                <input className="input" value={s.name} onChange={(e) => setB({ ...b, services: b.services.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                <input className="input num" type="number" value={s.price} onChange={(e) => setB({ ...b, services: b.services.map((x, j) => (j === i ? { ...x, price: +e.target.value } : x)) })} />
                <button className="text-ink/40 hover:text-rust" onClick={() => setB({ ...b, services: b.services.filter((_, j) => j !== i) })} aria-label="Remove"><Trash2 size={16} /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setB({ ...b, services: [...(b.services || []), { name: '', price: 0 }] })}><Plus size={14} /> Add item</Button>
              <Button size="sm" onClick={() => save({ services: b.services })}>Save prices</Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-2 font-semibold">Booking slots</h2>
            <p className="mb-3 text-xs text-ink/55">The agent offers these when customers ask for an appointment.</p>
            <div className="flex flex-wrap gap-2">
              {(b.slots || []).map((s) => <span key={s} className="flex items-center gap-1 rounded-full bg-paper-2 px-3 py-1 text-xs">{s}<button onClick={() => { const slots = b.slots.filter((x) => x !== s); setB({ ...b, slots }); save({ slots }); }}>×</button></span>)}
            </div>
            <div className="mt-3 flex gap-2">
              <input type="datetime-local" className="input" value={slot} onChange={(e) => setSlot(e.target.value)} />
              <Button size="sm" disabled={!slot} onClick={() => { const slots = [...(b.slots || []), slot.replace('T', ' ')]; setB({ ...b, slots }); save({ slots }); setSlot(''); }}>Add</Button>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="mb-4 font-semibold">Integrations</h2>
          <ul className="space-y-3 text-sm">
            {[
              ['NRS e-invoicing (MBS)', 'Sandbox', 'amber', 'Live once your Access Point Provider credentials are added on the server (APP_BASE_URL, APP_API_KEY).'],
              ['Firebase', demoMode ? 'Demo mode' : 'Connected', demoMode ? 'amber' : 'green', demoMode ? 'Data is stored in this browser. Add VITE_FIREBASE_* keys in Netlify to go multi-user.' : 'Auth and Firestore are live.'],
              ['WhatsApp Business (Cloud API)', 'Not connected', 'gray', 'Webhook ready at /api/whatsapp-webhook — add WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID.'],
              ['Email (Resend)', 'Not connected', 'gray', 'Add RESEND_API_KEY to send invoices and reminders by email.'],
              ['AI agent (Claude)', 'Rules engine', 'gray', 'Add ANTHROPIC_API_KEY for natural replies; rules are used until then.'],
              ['Open banking (Mono / Okra)', 'CSV only', 'gray', 'Statement CSV import works today; live bank feeds are on the roadmap.'],
            ].map(([t, s, tone, d]) => (
              <li key={t} className="flex items-start justify-between gap-4 rounded-lg border border-line p-3">
                <div><div className="font-medium">{t}</div><div className="text-xs text-ink/55">{d}</div></div>
                <Badge tone={tone}>{s}</Badge>
              </li>
            ))}
          </ul>
          <Field label="NRS MBS business ID" className="mt-4"><input className="input num" value={b.mbsBusinessId || ''} onChange={set('mbsBusinessId')} placeholder="Issued at MBS onboarding" /></Field>
          <Button size="sm" className="mt-2" onClick={() => save({ mbsBusinessId: b.mbsBusinessId })}>Save</Button>
        </Card>

        <Card className="p-6" id="plan">
          <h2 className="mb-4 font-semibold">Plan</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {PLANS.map((p) => (
              <button key={p.id} onClick={() => { setB({ ...b, plan: p.id }); save({ plan: p.id }); }} className={`rounded-xl border-2 p-4 text-left ${b.plan === p.id ? 'border-ink bg-paper' : 'border-line hover:border-ink/40'}`}>
                <div className="font-semibold">{p.name}</div>
                <div className="num text-lg">{naira(p.price)}<span className="text-xs text-ink/50">/mo</span></div>
                <div className="text-xs text-ink/55">{p.invoices === Infinity ? 'Unlimited' : p.invoices} invoices · {p.staff} staff</div>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink/50">Subscription billing via Paystack is wired in the next release; plan changes apply immediately during the pilot.</p>
          {demoMode && <Button variant="outline" size="sm" className="mt-6" onClick={() => { startDemo(); window.location.reload(); }}>Reset demo data</Button>}
        </Card>
      </div>
      <Toast msg={toast} onDone={() => setToast('')} />
    </>
  );
}
