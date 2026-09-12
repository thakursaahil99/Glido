export function GlidoLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline font-extrabold tracking-tight leading-none ${className}`}>
      <span
        style={{
          background: "linear-gradient(155deg, #ff7f1f, var(--glido-primary) 55%, var(--glido-primary-dark))",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        G
      </span>
      <span className="text-[var(--glido-ink)]">lido</span>
    </span>
  );
}
