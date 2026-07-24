type ActivityLoaderProps = {
  label?: string;
};

/** Branded route/page loader — staggered stride dots in brand orange. */
export function ActivityLoader({ label = 'Loading…' }: ActivityLoaderProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 py-24"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex items-end gap-1.5">
        <span className="ld-stride-dot h-2 w-2 rounded-full bg-ld-orange" />
        <span className="ld-stride-dot ld-stride-dot-2 h-2.5 w-2.5 rounded-full bg-ld-orange" />
        <span className="ld-stride-dot ld-stride-dot-3 h-2 w-2 rounded-full bg-ld-orange" />
      </div>
      <p className="text-xs font-medium text-ld-text-sub">{label}</p>
    </div>
  );
}
