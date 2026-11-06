import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, FileText, BookOpen, Receipt, Users, MessageCircle, ShieldCheck, Settings, LogOut, Menu, X,
} from 'lucide-react';
import { useApp } from '../lib/store.jsx';
import { PLANS } from '../lib/tax.js';

import Logo from './Logo.jsx';

export { Logo };

const NAV = [
  ['/app', 'Overview', LayoutDashboard, true],
  ['/app/invoices', 'Invoices & e-invoicing', FileText],
  ['/app/books', 'Bookkeeping', BookOpen],
  ['/app/vat', 'VAT & tax prep', Receipt],
  ['/app/payroll', 'Payroll & PAYE', Users],
  ['/app/inbox', 'Agent inbox', MessageCircle],
  ['/app/review', 'Accountant review', ShieldCheck],
  ['/app/settings', 'Settings', Settings],
];

export default function Layout({ children }) {
  const { business, user, signOut, demoMode } = useApp();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const plan = PLANS.find((p) => p.id === business?.plan);

  const Side = (
    <aside className="flex h-full w-64 flex-col bg-ink text-paper">
      <div className="flex items-center justify-between px-5 py-5">
        <Logo light />
        <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button>
      </div>
      <div className="mx-4 mb-4 rounded-xl bg-ink-2 px-3 py-2.5">
        <div className="truncate text-sm font-semibold">{business?.name}</div>
        <div className="text-[11px] text-paper/50">{plan?.name || 'No plan'} · TIN {business?.tin || '—'}</div>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map(([to, label, Icon, end]) => (
          <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-paper text-ink shadow-[inset_3px_0_0_var(--color-terracotta)]' : 'text-paper/70 hover:bg-ink-2 hover:text-paper'}`}>
            <Icon size={17} />{label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-ink-3 p-4">
        <div className="mb-2 truncate text-xs text-paper/50">{user?.email}</div>
        <button onClick={async () => { await signOut(); nav('/'); }} className="flex items-center gap-2 text-sm text-paper/70 hover:text-paper">
          <LogOut size={15} /> {demoMode ? 'Exit demo' : 'Sign out'}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-full">
      <div className="no-print hidden lg:block">{Side}</div>
      {open && <div className="no-print fixed inset-0 z-40 flex lg:hidden"><div>{Side}</div><div className="flex-1 bg-ink/40" onClick={() => setOpen(false)} /></div>}
      <main className="flex-1 overflow-y-auto">
        {demoMode && (
          <div className="no-print bg-terracotta-soft px-4 py-1.5 text-center text-xs font-semibold text-terracotta-dark">
            Demo mode — data lives in this browser only. Add Firebase keys to go live.
          </div>
        )}
        <div className="no-print flex items-center gap-3 border-b border-line bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
          <Logo />
        </div>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">{children}</div>
      </main>
    </div>
  );
}
