'use client';

type ToggleProps = {
  on: boolean;
  onChange: (next: boolean) => void;
};

export function Toggle({ on, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-[42px] shrink-0 cursor-pointer rounded-xl transition-colors ${
        on ? 'bg-ld-orange' : 'bg-ld-border'
      }`}
    >
      <span
        className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-[left] ${
          on ? 'left-[21px]' : 'left-[3px]'
        }`}
      />
    </button>
  );
}
