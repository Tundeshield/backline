export const naira = (n, opts = {}) =>
  '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: opts.kobo ? 2 : 0, maximumFractionDigits: opts.kobo ? 2 : 0 });

export const compact = (n) => {
  const a = Math.abs(n);
  if (a >= 1e9) return '₦' + (n / 1e9).toFixed(2) + 'bn';
  if (a >= 1e6) return '₦' + (n / 1e6).toFixed(1) + 'm';
  if (a >= 1e3) return '₦' + (n / 1e3).toFixed(0) + 'k';
  return naira(n);
};

export const pct = (n, d = 1) => (n * 100).toFixed(d) + '%';

export const today = () => new Date().toISOString().slice(0, 10);
export const addDays = (iso, days) => { const d = new Date(iso); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
export const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
export const thisMonth = () => today().slice(0, 7);
export const monthLabel = (ym) => new Date(ym + '-01').toLocaleDateString('en-NG', { month: 'short', year: 'numeric' });
export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
