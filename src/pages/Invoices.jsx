import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { Plus, Trash2, Send, CheckCircle2, ShieldCheck, MessageCircle, Printer, ArrowLeft, FileText, Mail, Bell, RotateCcw } from 'lucide-react';
import { useApp, useCollection } from '../lib/store.jsx';
import { Button, Card, PageHeader, Modal, Field, Badge, Empty, Toast, Stat } from '../components/ui.jsx';
import { invoiceTotals, mandateStatus } from '../lib/tax.js';
import { validateInvoice } from '../lib/einvoice.js';
import { submitEInvoice, sendEmail } from '../lib/api.js';
import { chaserMessage } from '../lib/agentRules.js';
import { naira, compact, today, addDays, daysBetween, fmtDate } from '../lib/format.js';
import { statusBadge } from './Dashboard.jsx';

const FILTERS = [['all', 'All'], ['draft', 'Drafts'], ['open', 'Open'], ['overdue', 'Overdue'], ['paid', 'Paid'], ['uncleared', 'Not cleared']];

export default function Invoices() {
  const { id } = useParams();
  const invoices = useCollection('invoices');
  const inv = invoices.find((i) => i.id === id);
  if (id) return inv ? <InvoiceDetail inv={inv} /> : <div className="text-sm text-ink/50">Loading invoice…</div>;
  return <InvoiceList invoices={invoices} />;
}

function InvoiceList({ invoices }) {
  const { business } = useApp();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(params.get('new') ? {} : null);
  const t = today();
  const m = mandateStatus(business.turnover);

  const rows = useMemo(() => invoices.filter((i) => {
    if (q && !`${i.number} ${i.customer?.name}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === 'draft') return i.status === 'draft';
    if (filter === 'open') return i.status === 'sent';
    if (filter === 'overdue') return i.status === 'sent' && i.dueDate < t;
    if (filter === 'paid') return i.status === 'paid';
    if (filter === 'uncleared') return i.status !== 'draft' && !i.irn;
    return true;
  }), [invoices, filter, q, t]);

  const thisMonth = invoices.filter((i) => i.issueDate?.startsWith(t.slice(0, 7)) && i.status !== 'draft');
  const cleared = invoices.filter((i) => i.irn).length;
  const issued = invoices.filter((i) => i.status !== 'draft').length;

  return (
    <>
      <PageHeader title="Invoices & e-invoicing" sub={m.inScope ? 'Every B2B invoice is cleared on the NRS platform (MBS) and gets an IRN + QR before it goes to your customer.' : 'Create and send invoices. E-invoicing clearance is ready for when your tier comes into scope.'}>
        <Button onClick={() => setEditing({})}><Plus size={16} /> New invoice</Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Issued this month" value={thisMonth.length} hint={compact(thisMonth.reduce((a, i) => a + i.totals.total, 0)) + ' billed'} />
        <Stat label="NRS clearance" value={`${issued ? Math.round((cleared / issued) * 100) : 100}%`} hint={`${cleared} of ${issued} issued invoices have an IRN`} tone={cleared === issued ? 'signal' : 'rust'} icon={ShieldCheck} />
        <Stat label="Outstanding" value={compact(invoices.filter((i) => i.status === 'sent').reduce((a, i) => a + i.totals.total, 0))} hint="Chased automatically on WhatsApp & email" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
          {FILTERS.map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === k ? 'bg-ink text-paper' : 'bg-paper-2 text-ink/70 hover:bg-line'}`}>{l}</button>
          ))}
          <input className="input ml-auto max-w-xs" placeholder="Search number or customer" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {rows.length === 0 ? <Empty icon={FileText} title="No invoices here">Create your first invoice — it'll be cleared on the NRS platform in seconds.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Number</th><th>Customer</th><th>Issued</th><th>NRS</th><th className="text-right">VAT</th><th className="text-right">Total</th><th className="text-right">Status</th></tr></thead>
              <tbody>
                {rows.map((i) => (
                  <tr key={i.id}>
                    <td><Link to={`/app/invoices/${i.id}`} className="font-semibold hover:underline">{i.number}</Link></td>
                    <td>{i.customer?.name}<div className="text-xs text-ink/45">{i.type}</div></td>
                    <td className="text-ink/70">{fmtDate(i.issueDate)}</td>
                    <td>{i.irn ? <Badge tone="green"><ShieldCheck size={11} />Cleared</Badge> : i.status === 'draft' ? <Badge>—</Badge> : <Badge tone="red">Not cleared</Badge>}</td>
                    <td className="num text-right text-ink/70">{naira(i.totals.vat)}</td>
                    <td className="num text-right font-semibold">{naira(i.totals.total)}</td>
                    <td className="text-right">{statusBadge(i)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <InvoiceEditor open={!!editing} initial={editing} onClose={() => { setEditing(null); setParams({}); }} />
    </>
  );
}

/* ------------------------------------------------------------------ */

export function InvoiceEditor({ open, initial, onClose }) {
  const { business, api, saveBusiness } = useApp();
  const customers = useCollection('customers');
  const nav = useNavigate();
  const blank = () => ({
    number: `${business.invoicePrefix || 'INV'}-${business.nextInvoiceNo || 1001}`, type: 'B2B', currency: 'NGN',
    issueDate: today(), dueDate: addDays(today(), 30), customer: { name: '', tin: '', email: '', phone: '', contact: '', address: '', city: '' },
    lines: [{ description: '', qty: 1, price: 0, vat: true }], notes: '',
  });
  const [inv, setInv] = useState(blank);
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setInv(initial?.id ? initial : blank()); setErrors([]); } }, [open]); // eslint-disable-line

  const totals = invoiceTotals(inv.lines);
  const setLine = (i, k, v) => setInv({ ...inv, lines: inv.lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)) });
  const setCust = (k, v) => setInv({ ...inv, customer: { ...inv.customer, [k]: v } });

  const save = async (andClear) => {
    setBusy(true); setErrors([]);
    try {
      let data = { ...inv, totals, status: inv.status && inv.status !== 'draft' ? inv.status : 'draft' };
      if (andClear) {
        const errs = validateInvoice(data, business);
        if (errs.length) { setErrors(errs); setBusy(false); return; }
        const res = await submitEInvoice(data, business);
        data = { ...data, status: 'sent', irn: res.irn, csid: res.csid, qr: res.qr, einvoiceStatus: 'cleared', einvoiceMode: res.mode, clearedAt: res.transmittedAt };
      }
      if (!customers.some((c) => c.name === inv.customer.name) && inv.customer.name) await api.add('customers', inv.customer);
      let id = inv.id;
      if (id) await api.update('invoices', id, data);
      else {
        const created = await api.add('invoices', { ...data, reminders: [] });
        id = created.id;
        await saveBusiness({ nextInvoiceNo: (business.nextInvoiceNo || 1001) + 1 });
      }
      onClose();
      nav(`/app/invoices/${id}`);
    } catch (e) {
      setErrors(e.data?.errors || [e.message]);
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={inv.id ? `Edit ${inv.number}` : 'New invoice'} wide>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Invoice no."><input className="input num" value={inv.number} onChange={(e) => setInv({ ...inv, number: e.target.value })} /></Field>
        <Field label="Type"><select className="input" value={inv.type} onChange={(e) => setInv({ ...inv, type: e.target.value })}><option value="B2B">B2B (business)</option><option value="B2G">B2G (government)</option><option value="B2C">B2C (consumer)</option></select></Field>
        <Field label="Issue date"><input type="date" className="input" value={inv.issueDate} onChange={(e) => setInv({ ...inv, issueDate: e.target.value })} /></Field>
        <Field label="Due date"><input type="date" className="input" value={inv.dueDate} onChange={(e) => setInv({ ...inv, dueDate: e.target.value })} /></Field>
      </div>

      <div className="mt-6 rounded-xl bg-paper p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="label !mb-0">Customer</span>
          {customers.length > 0 && (
            <select className="input max-w-xs" value="" onChange={(e) => { const c = customers.find((x) => x.id === e.target.value); if (c) setInv({ ...inv, customer: { ...c } }); }}>
              <option value="">Pick a saved customer…</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <input className="input" placeholder="Business name" value={inv.customer.name} onChange={(e) => setCust('name', e.target.value)} />
          <input className="input" placeholder={inv.type === 'B2C' ? 'TIN (optional)' : 'Customer TIN (required)'} value={inv.customer.tin} onChange={(e) => setCust('tin', e.target.value)} />
          <input className="input" placeholder="Contact person" value={inv.customer.contact} onChange={(e) => setCust('contact', e.target.value)} />
          <input className="input" placeholder="Email" value={inv.customer.email} onChange={(e) => setCust('email', e.target.value)} />
          <input className="input" placeholder="WhatsApp / phone" value={inv.customer.phone} onChange={(e) => setCust('phone', e.target.value)} />
          <input className="input" placeholder="Address, city" value={inv.customer.address} onChange={(e) => setCust('address', e.target.value)} />
        </div>
      </div>

      <div className="mt-6">
        <div className="grid grid-cols-[1fr_80px_130px_60px_120px_32px] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-ink/50">
          <span>Item</span><span>Qty</span><span>Unit price</span><span>VAT</span><span className="text-right">Amount</span><span />
        </div>
        {inv.lines.map((l, i) => (
          <div key={i} className="mt-2 grid grid-cols-[1fr_80px_130px_60px_120px_32px] items-center gap-2">
            <input className="input" list="services" placeholder="Description" value={l.description} onChange={(e) => {
              const s = business.services?.find((x) => x.name === e.target.value);
              setInv({ ...inv, lines: inv.lines.map((x, j) => (j === i ? { ...x, description: e.target.value, ...(s ? { price: s.price } : {}) } : x)) });
            }} />
            <input className="input num" type="number" min="0" value={l.qty} onChange={(e) => setLine(i, 'qty', +e.target.value)} />
            <input className="input num" type="number" min="0" value={l.price} onChange={(e) => setLine(i, 'price', +e.target.value)} />
            <input type="checkbox" className="mx-auto h-4 w-4 accent-ink" checked={l.vat !== false} onChange={(e) => setLine(i, 'vat', e.target.checked)} title="7.5% VAT" />
            <span className="num text-right text-sm">{naira(l.qty * l.price)}</span>
            <button className="text-ink/40 hover:text-rust" onClick={() => setInv({ ...inv, lines: inv.lines.filter((_, j) => j !== i) })} aria-label="Remove line"><Trash2 size={16} /></button>
          </div>
        ))}
        <datalist id="services">{(business.services || []).map((s) => <option key={s.name} value={s.name} />)}</datalist>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => setInv({ ...inv, lines: [...inv.lines, { description: '', qty: 1, price: 0, vat: true }] })}><Plus size={14} /> Add line</Button>
      </div>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
        <Field label="Notes / payment terms" className="min-w-64 flex-1"><textarea className="input" rows={3} value={inv.notes} onChange={(e) => setInv({ ...inv, notes: e.target.value })} placeholder={`Pay to ${business.bankDetails || '…'}`} /></Field>
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-ink/60">Subtotal</span><span className="num">{naira(totals.subtotal, { kobo: true })}</span></div>
          <div className="flex justify-between"><span className="text-ink/60">VAT 7.5%</span><span className="num">{naira(totals.vat, { kobo: true })}</span></div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><span>Total</span><span className="num">{naira(totals.total, { kobo: true })}</span></div>
        </div>
      </div>

      {errors.length > 0 && <ul className="mt-4 list-disc space-y-1 rounded-lg bg-rust/10 py-3 pl-8 pr-3 text-sm text-rust">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="outline" disabled={busy} onClick={() => save(false)}>Save draft</Button>
        <Button variant="signal" disabled={busy} onClick={() => save(true)}><ShieldCheck size={16} />{busy ? 'Clearing with NRS…' : 'Issue & clear on NRS'}</Button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */

function InvoiceDetail({ inv }) {
  const { business, api } = useApp();
  const nav = useNavigate();
  const [qr, setQr] = useState('');
  const [toast, setToast] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState([]);
  const t = today();
  const daysOverdue = inv.status === 'sent' && inv.dueDate < t ? daysBetween(inv.dueDate, t) : 0;

  useEffect(() => {
    if (!inv.irn) { setQr(''); return; }
    QRCode.toDataURL(inv.qr || inv.irn, { margin: 1, width: 180, color: { dark: '#0E1B2C', light: '#FFFFFF' } }).then(setQr).catch(() => setQr(''));
  }, [inv.irn, inv.qr]);

  const clear = async () => {
    setBusy(true); setErrs([]);
    try {
      const res = await submitEInvoice(inv, business);
      await api.update('invoices', inv.id, { status: inv.status === 'draft' ? 'sent' : inv.status, irn: res.irn, csid: res.csid, qr: res.qr, einvoiceStatus: 'cleared', einvoiceMode: res.mode, clearedAt: res.transmittedAt });
      setToast(`Cleared on NRS · IRN ${res.irn}`);
    } catch (e) { setErrs(e.data?.errors || [e.message]); } finally { setBusy(false); }
  };

  const markPaid = async () => {
    await api.update('invoices', inv.id, { status: 'paid', paidAt: t });
    await api.add('transactions', { date: t, description: `PAYMENT ${inv.number} – ${inv.customer.name}`, amount: inv.totals.total, category: 'Sales', source: 'Manual', auto: false, reviewed: true, invoiceId: inv.id });
    setToast('Marked paid and booked to the ledger');
  };

  const chase = async (channel) => {
    const msg = chaserMessage({ ...inv, daysOverdue }, business);
    await api.update('invoices', inv.id, { reminders: [...(inv.reminders || []), { at: new Date().toISOString(), channel, daysOverdue }] });
    if (channel === 'whatsapp') {
      const phone = String(inv.customer.phone || '').replace(/\D/g, '');
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    } else {
      const r = await sendEmail(inv.customer.email, `Reminder: invoice ${inv.number}`, `<p>${msg}</p>`);
      setToast(r.simulated ? 'Reminder logged (email sending not configured yet)' : 'Reminder emailed');
    }
  };

  const send = async () => {
    const html = `<p>Dear ${inv.customer.contact || inv.customer.name},</p><p>Please find invoice <b>${inv.number}</b> for <b>${naira(inv.totals.total, { kobo: true })}</b>, due ${fmtDate(inv.dueDate)}.</p>${inv.irn ? `<p>NRS IRN: ${inv.irn}</p>` : ''}<p>Payment: ${business.bankDetails}</p><p>${business.name}</p>`;
    const r = await sendEmail(inv.customer.email, `Invoice ${inv.number} from ${business.name}`, html);
    if (inv.status === 'draft') await api.update('invoices', inv.id, { status: 'sent' });
    setToast(r.simulated ? 'Invoice marked as sent (email sending not configured yet)' : `Invoice emailed to ${inv.customer.email}`);
  };

  const creditNote = async () => {
    const created = await api.add('invoices', {
      ...inv, id: undefined, number: `CN-${inv.number}`, kind: 'credit_note', originalIrn: inv.irn, status: 'draft', irn: null, csid: null, qr: null, einvoiceStatus: null,
      issueDate: t, dueDate: t, lines: inv.lines.map((l) => ({ ...l, price: -Math.abs(l.price) })), totals: invoiceTotals(inv.lines.map((l) => ({ ...l, price: -Math.abs(l.price) }))), reminders: [],
    });
    nav(`/app/invoices/${created.id}`);
  };

  return (
    <>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => nav('/app/invoices')} className="flex items-center gap-1 text-sm font-medium text-ink/60 hover:text-ink"><ArrowLeft size={16} /> All invoices</button>
        <div className="flex flex-wrap gap-2">
          {inv.status === 'draft' && <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>}
          {!inv.irn && inv.kind !== 'credit_note' && <Button variant="signal" disabled={busy} onClick={clear}><ShieldCheck size={16} />{busy ? 'Clearing…' : 'Clear on NRS'}</Button>}
          {inv.kind === 'credit_note' && !inv.irn && <Button variant="signal" disabled={busy} onClick={clear}><ShieldCheck size={16} />Clear credit note</Button>}
          <Button variant="outline" onClick={send}><Mail size={16} /> Email</Button>
          {inv.status === 'sent' && <>
            <Button variant="outline" onClick={() => chase('whatsapp')}><MessageCircle size={16} /> Chase on WhatsApp</Button>
            <Button variant="outline" onClick={() => chase('email')}><Bell size={16} /> Email reminder</Button>
            <Button onClick={markPaid}><CheckCircle2 size={16} /> Mark paid</Button>
          </>}
          {inv.irn && inv.kind !== 'credit_note' && <Button variant="ghost" onClick={creditNote}><RotateCcw size={16} /> Credit note</Button>}
          <Button variant="ghost" onClick={() => window.print()}><Printer size={16} /></Button>
        </div>
      </div>

      {errs.length > 0 && <ul className="no-print mb-4 list-disc space-y-1 rounded-lg bg-rust/10 py-3 pl-8 pr-3 text-sm text-rust">{errs.map((e) => <li key={e}>{e}</li>)}</ul>}

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card className="p-8 sm:p-10">
          <div className="flex flex-wrap justify-between gap-6">
            <div>
              <div className="display text-2xl font-semibold">{business.legalName || business.name}</div>
              <div className="mt-1 text-sm text-ink/60">{business.address}{business.city ? `, ${business.city}` : ''}</div>
              <div className="text-sm text-ink/60">TIN {business.tin} · {business.rcNumber}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold uppercase tracking-widest text-ink/50">{inv.kind === 'credit_note' ? 'Credit note' : 'Tax invoice'}</div>
              <div className="num text-2xl font-semibold">{inv.number}</div>
              <div className="mt-1">{statusBadge(inv)}</div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <div><div className="label">Billed to</div><div className="font-semibold">{inv.customer.name}</div><div className="text-sm text-ink/60">{inv.customer.address}</div>{inv.customer.tin && <div className="text-sm text-ink/60">TIN {inv.customer.tin}</div>}</div>
            <div><div className="label">Issued</div><div>{fmtDate(inv.issueDate)}</div><div className="label mt-3">Due</div><div>{fmtDate(inv.dueDate)}</div></div>
            <div><div className="label">Type</div><div>{inv.type}</div>{inv.originalIrn && <><div className="label mt-3">Original IRN</div><div className="num break-all text-xs">{inv.originalIrn}</div></>}</div>
          </div>

          <table className="tbl mt-8">
            <thead><tr><th>Description</th><th className="text-right">Qty</th><th className="text-right">Unit</th><th className="text-right">VAT</th><th className="text-right">Amount</th></tr></thead>
            <tbody>
              {inv.lines.map((l, i) => (
                <tr key={i}><td>{l.description}</td><td className="num text-right">{l.qty}</td><td className="num text-right">{naira(l.price, { kobo: true })}</td><td className="text-right text-xs">{l.vat !== false ? '7.5%' : 'Exempt'}</td><td className="num text-right">{naira(l.qty * l.price, { kobo: true })}</td></tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <div className="flex items-center gap-4">
              {qr ? <img src={qr} alt="NRS verification QR code" className="h-28 w-28 rounded border border-line" /> : <div className="grid h-28 w-28 place-items-center rounded border border-dashed border-line text-center text-[10px] text-ink/40">QR appears<br />after clearance</div>}
              <div className="text-xs">
                <div className="label">NRS IRN</div>
                <div className="num max-w-56 break-all">{inv.irn || 'Not yet cleared'}</div>
                {inv.csid && <><div className="label mt-2">CSID</div><div className="num max-w-56 break-all text-ink/60">{inv.csid}</div></>}
                {inv.einvoiceMode === 'sandbox' && inv.irn && <div className="mt-2"><Badge tone="amber">Sandbox</Badge></div>}
              </div>
            </div>
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-ink/60">Subtotal</span><span className="num">{naira(inv.totals.subtotal, { kobo: true })}</span></div>
              <div className="flex justify-between"><span className="text-ink/60">VAT 7.5%</span><span className="num">{naira(inv.totals.vat, { kobo: true })}</span></div>
              <div className="flex justify-between border-t-2 border-ink pt-2 text-lg font-semibold"><span>Total</span><span className="num">{naira(inv.totals.total, { kobo: true })}</span></div>
            </div>
          </div>
          <div className="mt-8 border-t border-line pt-4 text-sm text-ink/60">{inv.notes || `Payment: ${business.bankDetails || '—'}`}</div>
        </Card>

        <div className="no-print space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold">E-invoicing</h3>
            <ol className="mt-3 space-y-3 text-sm">
              {[
                ['Standardised to NRS schema', inv.status !== 'draft' || inv.irn],
                ['Transmitted via Access Point', !!inv.irn],
                ['IRN + CSID + QR issued', !!inv.irn],
                ['Sent to customer', inv.status !== 'draft'],
                ['Payment received', inv.status === 'paid'],
              ].map(([l, done]) => (
                <li key={l} className="flex items-center gap-2"><span className={`grid h-5 w-5 place-items-center rounded-full ${done ? 'bg-signal text-ink' : 'bg-paper-2 text-ink/30'}`}><CheckCircle2 size={13} /></span><span className={done ? '' : 'text-ink/50'}>{l}</span></li>
              ))}
            </ol>
            {inv.clearedAt && <div className="mt-3 text-xs text-ink/50">Cleared {new Date(inv.clearedAt).toLocaleString('en-NG')}</div>}
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold">Reminders</h3>
            {(inv.reminders || []).length === 0 ? <p className="mt-2 text-sm text-ink/55">None sent yet.{daysOverdue > 0 && ' This invoice is overdue — chase it.'}</p> : (
              <ul className="mt-2 space-y-1.5 text-sm">{inv.reminders.map((r, i) => <li key={i} className="flex justify-between"><span className="capitalize">{r.channel}</span><span className="text-ink/50">{fmtDate(r.at)}</span></li>)}</ul>
            )}
            {inv.status === 'sent' && <div className="mt-3 rounded-lg bg-paper p-3 text-xs text-ink/70">{chaserMessage({ ...inv, daysOverdue }, business)}</div>}
          </Card>
        </div>
      </div>

      <InvoiceEditor open={editing} initial={inv} onClose={() => setEditing(false)} />
      <Toast msg={toast} onDone={() => setToast('')} />
    </>
  );
}
