type PillProps = {
  label: string;
  color: string;
};

export function Pill({ label, color }: PillProps) {
  return (
    <span
      className="rounded-[5px] border px-[7px] py-[3px] text-[9px] font-extrabold tracking-wider"
      style={{
        background: `${color}22`,
        color,
        borderColor: `${color}44`,
      }}
    >
      {label}
    </span>
  );
}
