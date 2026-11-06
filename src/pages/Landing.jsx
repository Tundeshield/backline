import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, BookOpen, Receipt, Users, MessageCircle, ShieldCheck, ArrowRight, ArrowDown, Check, Menu, X, Minus,
} from 'lucide-react';
import Logo from '../components/Logo.jsx';
import { Button } from '../components/ui.jsx';
import { HeroVisual, ReviewSheet, VisibilityPanel } from '../components/Marketing.jsx';
import { PLANS } from '../lib/tax.js';
import { naira } from '../lib/format.js';
import { useApp } from '../lib/store.jsx';

const Wrap = ({ className = '', children }) => <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>{children}</div>;

const NAV = [['#services', 'Services'], ['#how', 'How it works'], ['#einvoicing', 'E-invoicing'], ['#review', 'Accountant review'], ['#pricing', 'Pricing']];

/* ---------------- content ---------------- */

const DESK = [
  ['Mon 08:10', 'A customer on WhatsApp: "Please resend last month\'s invoice."'],
  ['Mon 11:45', 'The diesel receipt is somewhere in the van\'s glovebox.'],
  ['Tue 09:30', '₦4.9m from a wholesale customer is 17 days overdue. Who\'s chasing it?'],
  ['Wed 16:00', 'Bank, OPay and Moniepoint statements. None of them reconciled.'],
  ['Thu 10:20', 'Salaries go out on Friday. PAYE for six staff still to work out.'],
  ['Thu 18:05', 'Three new enquiries since yesterday. No one has replied.'],
  ['Fri 12:00', 'The VAT return is due on the 21st. Are the receipts complete?'],
];

const SERVICES = [
  { icon: FileText, name: 'Invoicing and compliance', gets: 'Professional invoices created and sent in minutes, with the e-invoicing steps handled for businesses that are in scope.', link: 'A paid invoice lands in your books.' },
  { icon: BookOpen, name: 'Bookkeeping', gets: 'Bank and mobile-money transactions pulled together and sorted, with a monthly profit and loss and cash-flow report.', link: 'Your books become your tax records.' },
  { icon: Receipt, name: 'Tax preparation', gets: 'Receipts and records kept in order for VAT and other filings, with VAT you may be able to recover flagged before it\'s missed.', link: 'Payroll taxes join the same record.' },
  { icon: Users, name: 'Payroll', gets: 'Payslips, PAYE and pension worked out under the current tax bands, with payment schedules ready for your bank.', link: 'Salaries post to your books.' },
  { icon: MessageCircle, name: 'Business follow-ups', gets: 'An AI assistant on WhatsApp and email answers routine enquiries, books appointments and reminds customers to pay. You approve what goes out.', link: 'Payments it chases are matched to invoices.' },
  { icon: ShieldCheck, name: 'Accountant review', gets: 'A qualified accountant reviews your records, flags what needs attention and explains where you stand.', link: 'The loop closes, every review period.', accent: true },
];

const STEPS = [
  ['Connect your business', 'Add your business details and bring in your bank and mobile-money statements, staff list and customers.', 'e.g. upload Zenith and OPay statements'],
  ['Backline handles the work', 'Invoices, records, payroll and routine follow-ups run through connected workflows. You approve what matters.', 'e.g. reminder drafted for an overdue invoice'],
  ['Review and stay informed', 'See where the business stands each month, and get notes and support from an accountant.', 'e.g. "October books signed off, one note"'],
];

const TIERS = [
  ['Large taxpayers', 'Turnover above ₦5bn', 'Onboarding began in 2025. These businesses are expected to be fully live on the national system.'],
  ['Medium taxpayers', 'Turnover ₦1bn – ₦5bn', 'In scope from July 2026. Many are onboarding now.', true],
  ['Smaller businesses', 'Turnover below ₦1bn', 'Later phases, expected from 2027. Confirm the date that applies to you.'],
];

const REVIEW_QA = [
  ['What gets reviewed', 'Bank and mobile-money reconciliation, transaction categories, invoices and their e-invoice status, VAT schedules, and payroll with PAYE and pension.'],
  ['How often', 'Monthly on Compliance-Plus, quarterly on Business. On other plans you can run the same checklist yourself.'],
  ['When something is wrong', 'The accountant leaves a clear note in your review: what the issue is, what it affects and what to do next. Fixed items are checked again before sign-off.'],
  ['How you get help', 'Reply to the note or message the review desk from your account. A person answers, not a ticket queue.'],
];

const COMPARE = [
  ['Invoices per month', (p) => (p.invoices === Infinity ? 'Unlimited' : p.invoices.toLocaleString())],
  ['Staff on payroll', (p) => `Up to ${p.staff}`],
  ['Bookkeeping, P&L and cash flow', () => true],
  ['VAT receipt tracking', () => true],
  ['Invoice reminders on WhatsApp and email', (p) => p.id !== 'starter'],
  ['AI assistant for enquiries and bookings', (p) => ['business', 'compliance-plus'].includes(p.id)],
  ['Accountant review', (p) => ({ business: 'Quarterly', 'compliance-plus': 'Monthly' }[p.id] || false)],
];

const WHO = {
  starter: 'Micro-businesses that need invoicing and tidy records.',
  growth: 'Growing teams that want payroll and payment follow-ups.',
  business: 'Established businesses that want the assistant and regular review.',
  'compliance-plus': 'Medium firms under the e-invoicing mandate with higher volumes.',
};

/* ---------------- page ---------------- */

export default function Landing() {
  const { startDemo, user } = useApp();
  const nav = useNavigate();
  const [menu, setMenu] = useState(false);
  const demo = () => { startDemo(); nav('/app'); };
  const toHow = () => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-full overflow-x-hidden bg-paper">
      {/* ============ NAV ============ */}
      <header className="sticky top-0 z-40 border-b border-sand/60 bg-paper/85 backdrop-blur-md">
        <Wrap className="flex h-16 items-center justify-between gap-4">
          <Link to="/" aria-label="Backline home"><Logo /></Link>
          <nav className="hidden items-center gap-7 text-[14px] font-medium text-ink/70 lg:flex">
            {NAV.map(([h, l]) => <a key={h} href={h} className="transition hover:text-ink">{l}</a>)}
          </nav>
          <div className="hidden items-center gap-2 sm:flex">
            {user ? <Button onClick={() => nav('/app')}>Open Backline</Button> : <>
              <Button variant="ghost" onClick={() => nav('/login')}>Sign in</Button>
              <Button onClick={() => nav('/signup')}>Get started</Button>
            </>}
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5 lg:hidden" onClick={() => setMenu(!menu)} aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu}>
            {menu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </Wrap>
        {menu && (
          <div className="border-t border-sand/60 bg-paper lg:hidden">
            <Wrap className="flex flex-col gap-1 py-4">
              {NAV.map(([h, l]) => <a key={h} href={h} onClick={() => setMenu(false)} className="rounded-lg px-2 py-2.5 text-[15px] font-medium hover:bg-ink/5">{l}</a>)}
              <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden">
                {user ? <Button className="col-span-2" onClick={() => nav('/app')}>Open Backline</Button> : <>
                  <Button variant="outline" onClick={() => nav('/login')}>Sign in</Button>
                  <Button onClick={() => nav('/signup')}>Get started</Button>
                </>}
              </div>
            </Wrap>
          </div>
        )}
      </header>

      <main>
        {/* ============ 1. HERO ============ */}
        <section className="pb-20 pt-12 sm:pt-16 lg:pb-28 lg:pt-20">
          <Wrap className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sand bg-white/60 px-3 py-1.5 text-[12.5px] font-semibold text-ink/75">
                <span className="h-1.5 w-1.5 rounded-full bg-terracotta" /> Business administration, built for Nigeria
              </div>
              <h1 className="t-hero mt-6 lg:max-w-[9.4em]">Run your business. We'll handle the <em className="font-normal">back office.</em></h1>
              <p className="t-lead mt-6 max-w-xl">
                Invoicing, bookkeeping, tax, payroll and business follow-ups, handled together.
                <span className="mt-2 block">Software keeps the work connected. An accountant checks it.</span>
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={toHow}>See how Backline works <ArrowDown size={17} /></Button>
                <Button size="lg" variant="outline" onClick={demo}>Explore the demo</Button>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-ink/60">
                {['Built for the Nigeria Tax Act 2025', 'Works with WhatsApp', 'Accountant-reviewed books'].map((t) => (
                  <li key={t} className="flex items-center gap-1.5"><Check size={14} className="text-terracotta" strokeWidth={2.5} />{t}</li>
                ))}
              </ul>
            </div>
            <HeroVisual />
          </Wrap>
        </section>

        {/* ============ 2. PROBLEM ============ */}
        <section className="border-t border-sand/70 py-20 lg:py-28">
          <Wrap className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <div className="eyebrow">Sound familiar?</div>
              <h2 className="t-section mt-4">Running a business is already a full-time job.</h2>
              <p className="t-lead mt-5 max-w-md">Then there's everything behind it. None of these jobs is big on its own. Together, they take the week.</p>
              <p className="mt-6 max-w-md border-l-2 border-terracotta pl-4 text-[13.5px] text-ink/60">PwC Nigeria's MSME surveys put tax filings and compliance alone at 140–200 hours a year for small businesses.</p>
            </div>
            <ol className="divide-y divide-sand/70 rounded-2xl border border-sand/70 bg-white/55">
              {DESK.map(([time, text]) => (
                <li key={time} className="grid grid-cols-[84px_1fr] gap-4 px-5 py-4 sm:grid-cols-[100px_1fr] sm:px-6">
                  <span className="num pt-0.5 text-[12px] text-ink/45">{time}</span>
                  <span className="text-[15px] leading-snug">{text}</span>
                </li>
              ))}
            </ol>
          </Wrap>
          <Wrap className="mt-16 text-center">
            <p className="display text-[1.6rem] italic leading-snug text-ink/80 sm:text-[1.9rem]">Backline takes these off your desk.</p>
          </Wrap>
        </section>

        {/* ============ 3. SERVICES ============ */}
        <section id="services" className="scroll-mt-20 pb-20 lg:pb-28">
          <Wrap>
            <div className="max-w-2xl">
              <div className="eyebrow">What Backline does</div>
              <h2 className="t-section mt-4">Everything your business needs behind the scenes.</h2>
              <p className="t-lead mt-5">One connected back office for the work that keeps your business running. Each part feeds the next, so nothing is entered twice.</p>
            </div>

            <ol className="relative mt-14">
              <span className="absolute bottom-6 left-[19px] top-6 w-0.5 rounded bg-gradient-to-b from-sand via-sand to-terracotta sm:left-[23px]" aria-hidden />
              {SERVICES.map((s, i) => (
                <li key={s.name} className="relative grid grid-cols-[40px_1fr] gap-4 py-6 sm:grid-cols-[48px_1fr] sm:gap-6 md:grid-cols-[48px_1.1fr_0.9fr] md:gap-10">
                  <span className={`relative z-[1] grid h-10 w-10 place-items-center rounded-full border sm:h-12 sm:w-12 ${s.accent ? 'border-terracotta bg-terracotta text-white' : 'border-sand bg-paper text-ink'}`}>
                    <s.icon size={18} />
                  </span>
                  <div className="pt-1 sm:pt-2">
                    <div className="flex items-baseline gap-3">
                      <span className="num text-[12px] text-ink/40">0{i + 1}</span>
                      <h3 className="t-card">{s.name}</h3>
                    </div>
                    <p className="mt-2 max-w-lg text-[15px] text-ink/70">{s.gets}</p>
                  </div>
                  <div className="col-start-2 flex items-start md:col-start-3 md:pt-3">
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-medium ${s.accent ? 'bg-terracotta-soft text-terracotta-dark' : 'bg-white text-ink/70 ring-1 ring-sand/70'}`}>
                      <ArrowRight size={13} />{s.link}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </Wrap>
        </section>

        {/* ============ 4. HOW IT WORKS ============ */}
        <section id="how" className="scroll-mt-16 bg-ink py-20 text-paper lg:py-28">
          <Wrap>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-xl">
                <div className="eyebrow !text-[#d98a76]">How it works</div>
                <h2 className="t-section mt-4">Your back office, without the extra overhead.</h2>
              </div>
              <Button variant="light" onClick={demo}>Explore the demo <ArrowRight size={16} /></Button>
            </div>
            <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
              {STEPS.map(([title, body, eg], i) => (
                <li key={title} className="relative border-t border-paper/20 pt-6">
                  <span className="absolute -top-px left-0 h-px w-14 bg-[#d98a76]" aria-hidden />
                  <div className="num text-[13px] text-paper/45">Step {i + 1}</div>
                  <h3 className="t-card mt-2 text-paper">{title}</h3>
                  <p className="mt-3 text-[15px] text-paper/70">{body}</p>
                  <p className="num mt-4 text-[12px] text-paper/45">{eg}</p>
                </li>
              ))}
            </ol>
          </Wrap>
        </section>

        {/* ============ 5. E-INVOICING ============ */}
        <section id="einvoicing" className="scroll-mt-20 py-20 lg:py-28">
          <Wrap className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <div>
              <div className="eyebrow">E-invoicing in Nigeria</div>
              <h2 className="t-section mt-4">Get compliant. Keep your business moving.</h2>
              <div className="mt-6 space-y-4 text-[15.5px] text-ink/75">
                <p>The Nigeria Tax Act 2025 took effect on 1 January 2026. Alongside it, the Nigeria Revenue Service (formerly FIRS) is phasing in e-invoicing through its Merchant-Buyer Solution.</p>
                <p>For businesses in scope, each invoice is validated by the national system and given an invoice reference number (IRN) and QR code. Deadlines depend on your size, so not every business has the same date.</p>
              </div>
              <h3 className="mt-10 text-[13px] font-bold uppercase tracking-[0.12em] text-ink/50">How Backline helps</h3>
              <ul className="mt-4 space-y-3 text-[15px]">
                {[
                  'Prepares your invoices in the format the national system expects',
                  'Built to submit through NRS-accredited Access Point Providers, then stores the IRN and QR code on each invoice',
                  'Shows which invoices are cleared and which still need attention',
                  'Keeps credit notes linked to the original invoice',
                ].map((t) => <li key={t} className="flex gap-3"><Check size={18} className="mt-0.5 shrink-0 text-terracotta" strokeWidth={2.5} />{t}</li>)}
              </ul>
            </div>

            <div className="lg:pt-14">
              <div className="rounded-2xl border border-sand bg-white">
                <div className="border-b border-line px-6 py-4 text-[13px] font-semibold text-ink/60">Rollout by business size</div>
                <ol>
                  {TIERS.map(([name, size, body, current]) => (
                    <li key={name} className={`grid gap-1 border-b border-line px-6 py-5 last:border-b-0 sm:grid-cols-[150px_1fr] sm:gap-6 ${current ? 'bg-terracotta-soft/45' : ''}`}>
                      <div>
                        <div className="font-semibold">{name}</div>
                        <div className="num text-[12px] text-ink/55">{size}</div>
                      </div>
                      <p className="text-[14.5px] text-ink/75">{body}{current && <span className="ml-2 inline-block rounded-full bg-terracotta px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-white">Now</span>}</p>
                    </li>
                  ))}
                </ol>
              </div>
              <p className="mt-4 text-[12.5px] leading-relaxed text-ink/55">Backline is not a tax authority and is not itself an accredited Access Point Provider. Your obligations depend on your business, so confirm the details with your tax adviser or the NRS.</p>
              <p className="display mt-8 text-[1.35rem] italic leading-snug text-ink/80">The mandate is a good reason to start. It isn't the only one.</p>
            </div>
          </Wrap>
        </section>

        {/* ============ 6. ACCOUNTANT REVIEW ============ */}
        <section id="review" className="scroll-mt-16 border-y border-sand/70 bg-paper-2/70 py-20 lg:py-28">
          <Wrap className="grid items-center gap-14 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <div className="order-2 lg:order-1"><ReviewSheet /></div>
            <div className="order-1 lg:order-2">
              <div className="eyebrow">Human review</div>
              <h2 className="t-section mt-4">Software handles the work. An accountant checks it.</h2>
              <p className="t-lead mt-5">Automation is fast, but some things need a professional eye. A qualified accountant goes through your records, so problems are caught while they're still small.</p>
              <dl className="mt-8 space-y-5">
                {REVIEW_QA.map(([q, a]) => (
                  <div key={q} className="grid gap-1 border-t border-sand pt-4 sm:grid-cols-[150px_1fr] sm:gap-6">
                    <dt className="text-[14px] font-semibold">{q}</dt>
                    <dd className="text-[14.5px] text-ink/70">{a}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-6 text-[13px] text-ink/55">Review lowers the chance that mistakes go unnoticed. It doesn't replace your own responsibility for what you file, and we'll always tell you plainly what we found.</p>
            </div>
          </Wrap>
        </section>

        {/* ============ 7. VISIBILITY ============ */}
        <section className="py-20 lg:py-28">
          <Wrap>
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="max-w-2xl">
                <div className="eyebrow">Financial visibility</div>
                <h2 className="t-section mt-4">Know where your business stands.</h2>
                <p className="t-lead mt-5">Organised records turn into answers: what came in, what went out, who still owes you, what payroll costs and what's due in tax.</p>
              </div>
              <Button variant="outline" onClick={demo} className="justify-self-start">Open the demo business <ArrowRight size={16} /></Button>
            </div>
            <div className="mt-12"><VisibilityPanel /></div>
            <p className="mt-4 text-[12.5px] text-ink/50">Figures come from the sample business in the demo, worked out by the same engine the app uses.</p>
          </Wrap>
        </section>

        {/* ============ 8. PRICING ============ */}
        <section id="pricing" className="scroll-mt-16 border-t border-sand/70 py-20 lg:py-28">
          <Wrap>
            <div className="max-w-2xl">
              <div className="eyebrow">Pricing</div>
              <h2 className="t-section mt-4">Backline grows with your business.</h2>
              <p className="t-lead mt-5">Start with what you need today. Move up when you're ready. Monthly, in naira, VAT exclusive, with a 14-day free trial.</p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PLANS.map((p) => (
                <div key={p.id} className={`flex flex-col rounded-2xl border p-6 ${p.highlight ? 'border-ink bg-ink text-paper' : 'border-sand bg-white'}`}>
                  <div className="mb-1 h-5">{p.highlight && <span className="rounded-full bg-[#d98a76] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">Mandate-ready</span>}</div>
                  <h3 className="t-card">{p.name}</h3>
                  <p className={`mt-2 min-h-[3em] text-[13.5px] ${p.highlight ? 'text-paper/70' : 'text-ink/65'}`}>{WHO[p.id]}</p>
                  <div className="num mt-5 text-[1.9rem] font-semibold leading-none">{naira(p.price)}<span className={`ml-1 text-[13px] font-normal ${p.highlight ? 'text-paper/55' : 'text-ink/50'}`}>/month</span></div>
                  <ul className="mt-6 flex-1 space-y-2.5 text-[13.5px]">
                    {p.features.map((f) => <li key={f} className="flex gap-2"><Check size={15} className={`mt-0.5 shrink-0 ${p.highlight ? 'text-[#d98a76]' : 'text-terracotta'}`} strokeWidth={2.5} />{f}</li>)}
                  </ul>
                  <Button className="mt-7" variant={p.highlight ? 'light' : 'outline'} onClick={() => nav('/signup')}>Start with {p.name}</Button>
                </div>
              ))}
            </div>

            <div className="mt-10 overflow-x-auto rounded-2xl border border-sand bg-white">
              <table className="w-full min-w-[640px] text-[13.5px]">
                <caption className="sr-only">Compare plans</caption>
                <thead>
                  <tr className="border-b border-line">
                    <th className="px-5 py-3.5 text-left font-semibold text-ink/55">Compare plans</th>
                    {PLANS.map((p) => <th key={p.id} className="px-4 py-3.5 text-center font-semibold">{p.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map(([label, fn]) => (
                    <tr key={label} className="border-b border-line/70 last:border-b-0">
                      <td className="px-5 py-3 text-ink/75">{label}</td>
                      {PLANS.map((p) => {
                        const v = fn(p);
                        return (
                          <td key={p.id} className="px-4 py-3 text-center">
                            {v === true ? <Check size={16} className="mx-auto text-signal-dark" strokeWidth={2.5} aria-label="Included" />
                              : v === false ? <Minus size={16} className="mx-auto text-ink/25" aria-label="Not included" />
                              : <span className={/\d/.test(String(v)) ? 'num' : 'font-medium'}>{v}</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Wrap>
        </section>

        {/* ============ 9. FINAL CTA ============ */}
        <section className="bg-ink py-20 text-paper lg:py-24">
          <Wrap className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <h2 className="t-section">Get your business handled.</h2>
              <p className="mt-5 max-w-lg text-[17px] text-paper/70">Start with the work your business needs today. Add the rest of your back office as you grow.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <Button size="lg" variant="light" onClick={() => nav(user ? '/app' : '/signup')}>Get started <ArrowRight size={17} /></Button>
              <Button size="lg" variant="outline-light" onClick={demo}>Explore the demo</Button>
            </div>
          </Wrap>
        </section>
      </main>

      {/* ============ FOOTER ============ */}
      <footer className="py-12">
        <Wrap className="grid gap-8 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-[14px] text-ink/60">The back office for growing businesses.</p>
          </div>
          <nav className="grid grid-cols-2 gap-2 text-[14px] text-ink/70">
            {NAV.map(([h, l]) => <a key={h} href={h} className="hover:text-ink">{l}</a>)}
            <Link to="/login" className="hover:text-ink">Sign in</Link>
            <button onClick={demo} className="text-left hover:text-ink">Demo</button>
          </nav>
          <p className="text-[12.5px] leading-relaxed text-ink/50">Backline's tax figures are prepared for review by a qualified accountant and are not tax advice. © {new Date().getFullYear()} Backline.</p>
        </Wrap>
      </footer>
    </div>
  );
}
