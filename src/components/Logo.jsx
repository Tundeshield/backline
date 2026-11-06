/**
 * Backline mark: a "B" built from the back line (the vertical stroke that
 * supports everything) and two ledger bars. Reads as a letter at 16px and as
 * a stack of records at larger sizes. Works in one colour: pass mono.
 */
export function Mark({ size = 28, tone = 'ink', mono = false, className = '' }) {
  const bg = tone === 'ink' ? '#172231' : tone === 'paper' ? '#F5F0E7' : 'transparent';
  const fg = tone === 'ink' ? '#F5F0E7' : '#172231';
  const accent = mono ? fg : '#C0644F';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      {tone !== 'none' && <rect width="64" height="64" rx="15" fill={bg} />}
      <rect x="15" y="13" width="7" height="38" rx="2" fill={accent} />
      <path d="M25 13h12.5a8 8 0 0 1 0 16H25z" fill={fg} />
      <path d="M25 33h15.5a9 9 0 0 1 0 18H25z" fill={fg} />
    </svg>
  );
}

export default function Logo({ light = false, size = 28, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark size={size} tone={light ? 'paper' : 'ink'} />
      <span className={`display text-[1.4rem] font-semibold leading-none tracking-[-0.03em] ${light ? 'text-paper' : 'text-ink'}`}>Backline</span>
    </span>
  );
}
