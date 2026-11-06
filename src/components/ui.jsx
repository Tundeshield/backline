import { X } from 'lucide-react';
import { useEffect } from 'react';

export function Button({ variant = 'primary', size = 'md', className = '', ...p }) {
  const v = {
    primary: 'bg-ink text-paper hover:bg-ink-2',
    signal: 'bg-signal text-ink hover:brightness-95',
    ghost: 'bg-transparent text-ink hover:bg-paper-2',
    outline: 'border border-line bg-white text-ink hover:border-ink',
    danger: 'bg-rust text-white hover:brightness-95',
  }[variant];
  const s = { sm: 'px-2.5 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' }[size];
  return <button className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${v} ${s} ${className}`} {...p} />;
}

export function Card({ className = '', children, ...p }) {
  return <div className={`card ${className}`} {...p}>{children}</div>;
}

export function PageHeader({ title, sub, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="display text-3xl font-semibold">{title}</h1>
        {sub && <p className="mt-1 text-sm text-ink/60">{sub}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Stat({ label, value, hint, tone = 'ink', icon: Icon }) {
  const t = { ink: 'text-ink', signal: 'text-signal-dark', amber: 'text-amber', rust: 'text-rust' }[tone];
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-ink/50">
        {label}{Icon && <Icon size={16} className="text-ink/30" />}
      </div>
      <div className={`num mt-2 text-2xl font-semibold ${t}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-ink/55">{hint}</div>}
    </Card>
  );
}

const BADGE = {
  green: 'bg-signal/15 text-signal-dark', amber: 'bg-amber/20 text-[#9a6210]', red: 'bg-rust/15 text-rust',
  gray: 'bg-ink/8 text-ink/60', blue: 'bg-sky/15 text-sky', ink: 'bg-ink text-paper',
};
export const Badge = ({ tone = 'gray', children }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE[tone]}`}>{children}</span>
);

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className={`card my-8 w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} shadow-2xl`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="display text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-paper-2" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export const Field = ({ label, children, className = '' }) => (
  <label className={`block ${className}`}><span className="label">{label}</span>{children}</label>
);

export const Empty = ({ icon: Icon, title, children }) => (
  <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
    {Icon && <div className="mb-3 rounded-full bg-paper-2 p-3"><Icon size={22} className="text-ink/50" /></div>}
    <div className="font-semibold">{title}</div>
    {children && <div className="mt-1 max-w-sm text-sm text-ink/60">{children}</div>}
  </div>
);

export function Bars({ data, height = 160 }) {
  // data: [{ label, a, b }] — a = inflow (signal), b = outflow (ink)
  const max = Math.max(1, ...data.flatMap((d) => [d.a, d.b]));
  return (
    <div className="flex items-end gap-4" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="flex h-full flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end justify-center gap-1">
            <div title={`In: ${d.a.toLocaleString()}`} className="w-1/3 rounded-t bg-signal" style={{ height: `${(d.a / max) * 100}%` }} />
            <div title={`Out: ${d.b.toLocaleString()}`} className="w-1/3 rounded-t bg-ink/70" style={{ height: `${(d.b / max) * 100}%` }} />
          </div>
          <div className="text-[11px] font-medium text-ink/50">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

export function Toast({ msg, onDone }) {
  useEffect(() => { if (msg) { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); } }, [msg, onDone]);
  if (!msg) return null;
  return <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-ink px-5 py-3 text-sm font-medium text-paper shadow-xl">{msg}</div>;
}
