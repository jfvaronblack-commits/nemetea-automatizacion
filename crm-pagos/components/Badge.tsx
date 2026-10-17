const STYLES: Record<string, string> = {
  good: "bg-[var(--good-bg)] text-[var(--good)]",
  warn: "bg-[var(--warn-bg)] text-[var(--warn)]",
  bad: "bg-[var(--bad-bg)] text-[var(--bad)]",
  info: "bg-[var(--info-bg)] text-[var(--fg-muted)]",
  violet: "bg-[var(--violet-bg)] text-[var(--violet)]",
};

export function Badge({
  tone = "info",
  children,
  dot = false,
}: {
  tone?: "good" | "warn" | "bad" | "info" | "violet";
  children: React.ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STYLES[tone]}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function ExampleFlag() {
  return (
    <span className="ml-1.5 rounded-md border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-[var(--fg-muted)]">
      EJEMPLO
    </span>
  );
}
