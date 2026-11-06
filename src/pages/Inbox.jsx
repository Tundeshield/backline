import { useEffect, useState } from 'react';
import { Sparkles, Send, MessageCircle, Mail, CalendarDays, Bell, Plus, Bot, CheckCircle2 } from 'lucide-react';
import { useApp, useCollection } from '../lib/store.jsx';
import { Button, Card, PageHeader, Badge, Empty, Modal, Field, Toast } from '../components/ui.jsx';
import { agentReply } from '../lib/api.js';
import { chaserMessage } from '../lib/agentRules.js';
import { naira, today, daysBetween, fmtDate } from '../lib/format.js';

export default function Inbox() {
  const { business, api } = useApp();
  const convos = useCollection('conversations');
  const invoices = useCollection('invoices');
  const appts = useCollection('appointments');
  const [sel, setSel] = useState(null);
  const [draft, setDraft] = useState('');
  const [meta, setMeta] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('open');
  const [sim, setSim] = useState(false);
  const [newAppt, setNewAppt] = useState(null);
  const [toast, setToast] = useState('');

  const list = convos.filter((c) => (tab === 'open' ? c.status === 'open' : c.status !== 'open'));
  const c = convos.find((x) => x.id === sel) || list[0];
  useEffect(() => { setDraft(''); setMeta(null); }, [c?.id]);

  const t = today();
  const overdue = invoices.filter((i) => i.status === 'sent' && i.dueDate < t).map((i) => ({ ...i, daysOverdue: daysBetween(i.dueDate, t) }));

  const suggest = async () => {
    if (!c) return;
    setBusy(true);
    const lastCustomer = [...c.messages].reverse().find((m) => m.from === 'customer');
    const nameKey = c.customerName.toLowerCase();
    const openInvoices = invoices.filter((i) => i.status === 'sent' && (nameKey.includes(i.customer.name.toLowerCase().split(' ')[0]) || nameKey.includes((i.customer.contact || '~').toLowerCase().split(' ')[0])))
      .map((i) => ({ number: i.number, total: i.totals.total, dueDate: i.dueDate }));
    const res = await agentReply({
      message: lastCustomer?.text || '', channel: c.channel, customerName: c.customerName.split(' (')[0],
      business: { name: business.name, bankDetails: business.bankDetails }, services: business.services || [], slots: business.slots || [], openInvoices,
    });
    setDraft(res.reply); setMeta(res); setBusy(false);
  };

  const send = async (resolve) => {
    if (!draft.trim()) return;
    await api.update('conversations', c.id, { messages: [...c.messages, { from: 'agent', text: draft, at: new Date().toISOString() }], status: resolve ? 'resolved' : c.status });
    if (meta?.action?.type === 'offer_slots' || meta?.intent === 'booking') {
      await api.add('appointments', { title: `Visit – ${c.customerName}`, with: c.customerName, date: (business.slots?.[0] || t).slice(0, 10), time: (business.slots?.[0] || '').slice(11) || '10:00', channel: c.channel, status: 'proposed' });
    }
    if (c.channel === 'whatsapp' && c.phone) window.open(`https://wa.me/${c.phone.replace(/\D/g, '')}?text=${encodeURIComponent(draft)}`, '_blank', 'noopener');
    setDraft(''); setMeta(null);
    setToast(resolve ? 'Reply sent and conversation resolved' : 'Reply sent');
  };

  const chaseAll = async () => {
    for (const i of overdue) await api.update('invoices', i.id, { reminders: [...(i.reminders || []), { at: new Date().toISOString(), channel: 'whatsapp', daysOverdue: i.daysOverdue }] });
    setToast(`Queued ${overdue.length} reminders`);
  };

  return (
    <>
      <PageHeader title="Agent inbox" sub="WhatsApp and email in one place. The agent drafts replies, books appointments and chases unpaid invoices — you approve.">
        <Button variant="outline" onClick={() => setSim(true)}><Plus size={16} /> Simulate incoming message</Button>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[300px_1fr_320px]">
        <Card className="overflow-hidden">
          <div className="flex border-b border-line">
            {['open', 'resolved'].map((k) => <button key={k} onClick={() => setTab(k)} className={`flex-1 py-3 text-xs font-semibold capitalize ${tab === k ? 'border-b-2 border-ink' : 'text-ink/50'}`}>{k} ({convos.filter((x) => (k === 'open' ? x.status === 'open' : x.status !== 'open')).length})</button>)}
          </div>
          <ul className="max-h-[560px] overflow-y-auto">
            {list.map((x) => (
              <li key={x.id}>
                <button onClick={() => setSel(x.id)} className={`w-full border-b border-line/60 px-4 py-3 text-left transition ${c?.id === x.id ? 'bg-paper' : 'hover:bg-paper/50'}`}>
                  <div className="flex items-center gap-2">
                    {x.channel === 'whatsapp' ? <MessageCircle size={14} className="text-signal-dark" /> : <Mail size={14} className="text-sky" />}
                    <span className="truncate text-sm font-semibold">{x.customerName}</span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-ink/55">{x.messages.at(-1)?.text}</div>
                </button>
              </li>
            ))}
            {!list.length && <li className="p-6 text-center text-sm text-ink/50">Nothing here.</li>}
          </ul>
        </Card>

        <Card className="flex min-h-[560px] flex-col">
          {!c ? <Empty icon={MessageCircle} title="No conversations">Connect WhatsApp Business in Settings, or simulate a message.</Empty> : <>
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <div><div className="font-semibold">{c.customerName}</div><div className="text-xs text-ink/50">{c.channel === 'whatsapp' ? 'WhatsApp' : 'Email'} · {c.phone}</div></div>
              {c.status === 'open' ? <Button size="sm" variant="ghost" onClick={() => api.update('conversations', c.id, { status: 'resolved' })}><CheckCircle2 size={14} /> Resolve</Button> : <Badge tone="green">Resolved</Badge>}
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto bg-paper/40 p-5">
              {c.messages.map((m, i) => (
                <div key={i} className={`flex ${m.from === 'customer' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${m.from === 'customer' ? 'bg-white shadow-sm' : m.from === 'agent' ? 'bg-ink text-paper' : 'bg-amber/20 italic'}`}>
                    {m.from !== 'customer' && <div className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase opacity-60">{m.from === 'agent' ? <><Bot size={10} />Agent</> : 'Internal note'}</div>}
                    {m.text}
                    <div className="mt-1 text-[10px] opacity-50">{new Date(m.at).toLocaleString('en-NG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-line p-4">
              {meta && <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-ink/60">
                <Badge tone="blue">{meta.intent}</Badge>{meta.action?.type && <Badge>{meta.action.type.replace('_', ' ')}</Badge>}<span>drafted by {meta.engine === 'claude' ? 'AI agent' : 'rules engine'}</span>
              </div>}
              <textarea className="input" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a reply, or let the agent draft one…" />
              <div className="mt-2 flex flex-wrap justify-between gap-2">
                <Button variant="outline" size="sm" onClick={suggest} disabled={busy}><Sparkles size={14} />{busy ? 'Drafting…' : 'Draft with agent'}</Button>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => send(true)} disabled={!draft.trim()}>Send & resolve</Button>
                  <Button size="sm" onClick={() => send(false)} disabled={!draft.trim()}><Send size={14} /> Send</Button>
                </div>
              </div>
            </div>
          </>}
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-semibold"><CalendarDays size={16} /> Appointments</h3><Button size="sm" variant="ghost" onClick={() => setNewAppt({ title: '', with: '', date: t, time: '10:00', status: 'confirmed', channel: 'whatsapp' })}><Plus size={14} /></Button></div>
            <ul className="mt-3 space-y-2">
              {[...appts].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).map((a) => (
                <li key={a.id} className="rounded-lg border border-line p-3">
                  <div className="flex items-start justify-between gap-2"><div className="text-sm font-medium">{a.title}</div><Badge tone={a.status === 'confirmed' ? 'green' : 'amber'}>{a.status}</Badge></div>
                  <div className="mt-0.5 text-xs text-ink/55">{fmtDate(a.date)} · {a.time} · {a.with}</div>
                  {a.status !== 'confirmed' && <button className="mt-1 text-xs font-semibold underline" onClick={() => api.update('appointments', a.id, { status: 'confirmed' })}>Confirm</button>}
                </li>
              ))}
              {!appts.length && <li className="text-sm text-ink/50">No appointments.</li>}
            </ul>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-semibold"><Bell size={16} /> Invoice chasing</h3>{overdue.length > 0 && <Button size="sm" variant="outline" onClick={chaseAll}>Chase all</Button>}</div>
            <ul className="mt-3 space-y-3">
              {overdue.map((i) => (
                <li key={i.id} className="text-sm">
                  <div className="flex justify-between"><span className="font-medium">{i.number}</span><span className="num text-rust">{naira(i.totals.total)}</span></div>
                  <div className="text-xs text-ink/55">{i.customer.name} · {i.daysOverdue}d overdue · {(i.reminders || []).length} reminders</div>
                  <div className="mt-1 rounded-md bg-paper p-2 text-xs text-ink/70">{chaserMessage(i, business)}</div>
                </li>
              ))}
              {!overdue.length && <li className="text-sm text-ink/50">No overdue invoices. 🎉</li>}
            </ul>
          </Card>
        </div>
      </div>

      <SimModal open={sim} onClose={() => setSim(false)} onSend={async (d) => {
        const created = await api.add('conversations', { customerName: d.name, phone: d.phone, channel: d.channel, status: 'open', messages: [{ from: 'customer', text: d.text, at: new Date().toISOString() }] });
        setSel(created.id); setTab('open'); setSim(false);
      }} />

      <Modal open={!!newAppt} onClose={() => setNewAppt(null)} title="New appointment">
        {newAppt && <div className="grid gap-3">
          <Field label="Title"><input className="input" value={newAppt.title} onChange={(e) => setNewAppt({ ...newAppt, title: e.target.value })} /></Field>
          <Field label="With"><input className="input" value={newAppt.with} onChange={(e) => setNewAppt({ ...newAppt, with: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><input type="date" className="input" value={newAppt.date} onChange={(e) => setNewAppt({ ...newAppt, date: e.target.value })} /></Field>
            <Field label="Time"><input type="time" className="input" value={newAppt.time} onChange={(e) => setNewAppt({ ...newAppt, time: e.target.value })} /></Field>
          </div>
          <Button onClick={async () => { await api.add('appointments', newAppt); setNewAppt(null); }} disabled={!newAppt.title}>Save</Button>
        </div>}
      </Modal>
      <Toast msg={toast} onDone={() => setToast('')} />
    </>
  );
}

function SimModal({ open, onClose, onSend }) {
  const [d, setD] = useState({ name: 'Bola Hassan', phone: '+2348120000000', channel: 'whatsapp', text: 'Hi, how much is garri per bag? I need 20 bags delivered to Yaba.' });
  return (
    <Modal open={open} onClose={onClose} title="Simulate an incoming message">
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Customer"><input className="input" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
          <Field label="Channel"><select className="input" value={d.channel} onChange={(e) => setD({ ...d, channel: e.target.value })}><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select></Field>
        </div>
        <Field label="Message"><textarea className="input" rows={3} value={d.text} onChange={(e) => setD({ ...d, text: e.target.value })} /></Field>
        <div className="flex flex-wrap gap-2 text-xs">
          {['Can I book a visit on Thursday?', 'Please send our outstanding invoice', 'The last delivery was late and damaged', 'What are your prices?'].map((s) => <button key={s} className="rounded-full bg-paper-2 px-2.5 py-1 hover:bg-line" onClick={() => setD({ ...d, text: s })}>{s}</button>)}
        </div>
        <Button onClick={() => onSend(d)}>Deliver message</Button>
      </div>
    </Modal>
  );
}
