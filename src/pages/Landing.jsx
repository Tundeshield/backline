import { Link, useNavigate } from 'react-router-dom';
import { FileCheck2, BookOpen, Receipt, Users, MessageCircle, ShieldCheck, ArrowRight, Check } from 'lucide-react';
import { Logo } from '../components/Layout.jsx';
import { Button } from '../components/ui.jsx';
import { PLANS } from '../lib/tax.js';
import { naira } from '../lib/format.js';
import { useApp } from '../lib/store.jsx';

const MODULES = [
  [FileCheck2, 'Invoicing & e-invoicing', 'Create, send and clear invoices on the NRS e-invoicing platform. Every invoice gets its IRN and QR code automatically.'],
  [BookOpen, 'Bookkeeping', 'Bank and mobile-money transactions pulled in and categorised. Monthly profit & loss and cash-flow, ready on day one.'],
  [Receipt, 'VAT recovery', 'Input VAT on fixed assets and overheads is now recoverable. Backline tracks every receipt so you actually claim it.'],
  [Users, 'Payroll & PAYE', 'Payslips, pension and PAYE under the new 2026 income-tax bands and rent relief, for staff in any state.'],
  [MessageCircle, 'WhatsApp & email agent', 'Answers enquiries, books appointments and chases unpaid invoices, politely at first, then firmly.'],
  [ShieldCheck, 'Accountant review', 'A qualified accountant checks your books every month and signs off before anything is filed.'],
];

export default function Landing() {
  const { startDemo, user } = useApp();
  const nav = useNavigate();
  const demo = () => { startDemo(); nav('/app'); };

  return (
    <div className="min-h-full bg-paper">
      {/* nav */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="hidden gap-8 text-sm font-medium text-ink/70 md:flex">
          <a href="#modules" className="hover:text-ink">Product</a>
          <a href="#mandate" className="hover:text-ink">E-invoicing mandate</a>
          <a href="#pricing" className="hover:text-ink">Pricing</a>
        </nav>
        <div className="flex gap-2">
          {user ? <Button onClick={() => nav('/app')}>Open app</Button> : <>
            <Button variant="ghost" onClick={() => nav('/login')}>Sign in</Button>
            <Button onClick={() => nav('/signup')}>Get started</Button>
          </>}
        </div>
      </header>

      {/* hero */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-signal" /> Built for the Nigeria Tax Act 2025
          </div>
          <h1 className="display text-5xl font-semibold leading-[1.05] sm:text-6xl">
            The digital back office for <em className="text-signal-dark not-italic">small businesses.</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink/70">
            One monthly subscription runs your admin: compliant e-invoices, clean books, recovered VAT, PAYE payroll and a WhatsApp agent that chases what you're owed. A human accountant checks it all monthly.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => nav('/signup')}>Start your back office <ArrowRight size={18} /></Button>
            <Button size="lg" variant="outline" onClick={demo}>Explore the live demo</Button>
          </div>
          <p className="mt-4 text-xs text-ink/50">Demo loads a sample medium-sized food business. No sign-up needed.</p>
        </div>

        {/* hero card */}
        <div className="relative">
          <div className="grain absolute -inset-6 rounded-[2rem]" />
          <div className="relative rounded-2xl bg-ink p-6 text-paper shadow-2xl">
            <div className="flex items-center justify-between text-xs text-paper/50"><span>INVOICE IGF-1046</span><span className="rounded-full bg-signal/20 px-2 py-0.5 font-semibold text-signal">Cleared by NRS</span></div>
            <div className="num mt-4 text-4xl font-semibold">₦1,666,250.00</div>
            <div className="mt-1 text-sm text-paper/60">Lekki Fresh Mart Ltd · VAT ₦116,250</div>
            <div className="mt-6 grid grid-cols-[1fr_auto] gap-4 rounded-xl bg-ink-2 p-4">
              <div className="space-y-1 text-xs">
                <div className="text-paper/50">IRN</div>
                <div className="num break-all text-paper">IGF1046-94ND90NR-20261103</div>
                <div className="pt-2 text-paper/50">CSID</div>
                <div className="num text-paper/80">Qm8x…f3Lw</div>
              </div>
              <div className="grid h-20 w-20 grid-cols-6 gap-0.5 rounded bg-paper p-1.5">
                {Array.from({ length: 36 }).map((_, i) => <div key={i} className={((i * 7) % 5 < 2 || i % 7 === 0) ? 'bg-ink' : ''} />)}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
              {[['Sent', 'WhatsApp'], ['Reported', 'NRS MBS'], ['Booked', 'Ledger']].map(([a, b]) => (
                <div key={a} className="rounded-lg border border-ink-3 py-2"><div className="font-semibold text-signal">{a}</div><div className="text-paper/50">{b}</div></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* why now */}
      <section id="mandate" className="bg-ink py-20 text-paper">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="display max-w-2xl text-4xl font-semibold">Compliance just became a monthly job.</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {[
              ['140–200 hrs', 'a year that Nigerian MSMEs spend on tax filings and compliance (PwC Nigeria MSME surveys).'],
              ['1 Jan 2026', 'the Nigeria Tax Act took effect: new PAYE bands, rent relief, wider input-VAT recovery.'],
              ['1 Jul 2026', 'medium firms (₦1–5bn turnover) came into scope for e-invoicing. Large firms had to be fully live by 31 July.'],
              ['7.5%', 'operating cost that recoverable input VAT on assets and overheads can save, if you keep the receipts.'],
            ].map(([k, v]) => (
              <div key={k} className="border-t border-ink-3 pt-5">
                <div className="num text-3xl font-semibold text-signal">{k}</div>
                <p className="mt-2 text-sm text-paper/70">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* modules */}
      <section id="modules" className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="display text-4xl font-semibold">Everything behind the counter.</h2>
        <p className="mt-3 max-w-2xl text-ink/65">Start with e-invoicing, because you have to. Stay for the rest, because it's already connected.</p>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(([Icon, t, d]) => (
            <div key={t} className="card p-6">
              <div className="mb-4 inline-flex rounded-xl bg-paper-2 p-2.5"><Icon size={20} /></div>
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-2 text-sm text-ink/65">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* pricing */}
      <section id="pricing" className="border-t border-line bg-paper-2/60 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="display text-4xl font-semibold">Priced by invoice volume.</h2>
          <p className="mt-3 text-ink/65">Monthly, in naira, VAT exclusive. Change plans any time.</p>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((p) => (
              <div key={p.id} className={`flex flex-col rounded-2xl border p-6 ${p.highlight ? 'border-ink bg-ink text-paper' : 'border-line bg-white'}`}>
                {p.highlight && <div className="mb-3 self-start rounded-full bg-signal px-2 py-0.5 text-[11px] font-bold text-ink">FOR FIRMS UNDER THE MANDATE</div>}
                <div className="font-semibold">{p.name}</div>
                <div className="num mt-2 text-3xl font-semibold">{naira(p.price)}<span className={`text-sm font-normal ${p.highlight ? 'text-paper/50' : 'text-ink/50'}`}>/mo</span></div>
                <p className={`mt-2 text-sm ${p.highlight ? 'text-paper/70' : 'text-ink/60'}`}>{p.blurb}</p>
                <ul className="mt-5 flex-1 space-y-2 text-sm">
                  {p.features.map((f) => <li key={f} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-signal" />{f}</li>)}
                </ul>
                <Button className="mt-6" variant={p.highlight ? 'signal' : 'outline'} onClick={() => nav('/signup')}>Choose {p.name}</Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-10 text-sm text-ink/50">
        <Logo />
        <div>Backline estimates are prepared for review by a qualified accountant and are not tax advice. © {new Date().getFullYear()}</div>
        <Link to="/login" className="hover:text-ink">Sign in</Link>
      </footer>
    </div>
  );
}
