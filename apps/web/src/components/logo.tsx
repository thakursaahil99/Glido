/** Lowercase wordmark + tri-service speed-underline — the "o" carries the brand color,
 * and the three short strokes underneath echo the Food/Grocery/Cab identity colors. */
export function GlidoLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex flex-col leading-none ${className}`}>
      <span className="inline-flex items-baseline font-extrabold tracking-tight">
        <span style={{ color: "var(--glido-ink)" }}>glid</span>
        <span style={{ color: "var(--glido-primary)" }}>o</span>
      </span>
      <svg viewBox="0 0 64 4" className="w-10 h-1 mt-0.5" preserveAspectRatio="none">
        <line x1="0" y1="2" x2="18" y2="2" stroke="var(--glido-food)" strokeWidth="4" strokeLinecap="round" />
        <line x1="23" y1="2" x2="41" y2="2" stroke="var(--glido-grocery)" strokeWidth="4" strokeLinecap="round" />
        <line x1="46" y1="2" x2="64" y2="2" stroke="var(--glido-cab)" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/** Trio-capsule mark (Food/Grocery/Cab stacked pills) + wordmark — for spacious contexts
 * like the login screen or footer, where the full brand lockup has room to breathe. */
export function GlidoLogoFull({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <span className="flex flex-col gap-1 rounded-2xl bg-white border border-[var(--glido-border)] p-1.5 shadow-sm shrink-0">
        <span className="flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1" style={{ background: "var(--glido-primary-light)" }}>
          <span className="h-4 w-4 rounded-full shrink-0" style={{ background: "var(--glido-food)" }} />
          <span className="text-[9px] font-extrabold tracking-wide" style={{ color: "var(--glido-food-dark)" }}>FOOD</span>
        </span>
        <span className="flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1" style={{ background: "var(--glido-grocery-light)" }}>
          <span className="h-4 w-4 rounded-full shrink-0" style={{ background: "var(--glido-grocery)" }} />
          <span className="text-[9px] font-extrabold tracking-wide" style={{ color: "var(--glido-grocery-dark)" }}>GROCERY</span>
        </span>
        <span className="flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1" style={{ background: "var(--glido-cab-light)" }}>
          <span className="h-4 w-4 rounded-full shrink-0" style={{ background: "var(--glido-cab)" }} />
          <span className="text-[9px] font-extrabold tracking-wide" style={{ color: "var(--glido-cab-dark)" }}>CAB</span>
        </span>
      </span>
      <span className="flex flex-col leading-none">
        <span className="inline-flex items-baseline font-extrabold tracking-tight text-3xl">
          <span style={{ color: "var(--glido-ink)" }}>glid</span>
          <span style={{ color: "var(--glido-primary)" }}>o</span>
        </span>
        <svg viewBox="0 0 100 4" className="w-16 h-1 mt-1" preserveAspectRatio="none">
          <line x1="0" y1="2" x2="28" y2="2" stroke="var(--glido-food)" strokeWidth="4" strokeLinecap="round" />
          <line x1="36" y1="2" x2="64" y2="2" stroke="var(--glido-grocery)" strokeWidth="4" strokeLinecap="round" />
          <line x1="72" y1="2" x2="100" y2="2" stroke="var(--glido-cab)" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <span className="text-[10px] font-bold tracking-[0.15em] text-[var(--glido-muted)] mt-1.5">ONE SUPER-APP · ALL LOCAL</span>
      </span>
    </span>
  );
}
