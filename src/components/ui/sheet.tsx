'use client';

import type { ReactNode } from 'react';

type SheetProps = {
  onClose: () => void;
  children: ReactNode;
  maxH?: string;
};

/** Bottom sheet constrained to the phone app frame (max-w-phone), not the full viewport. */
export function Sheet({ onClose, children, maxH = '92vh' }: SheetProps) {
  return (
    <div className="fixed inset-0 z-[200] flex justify-center">
      <div className="relative flex h-full w-full max-w-phone flex-col justify-end">
        <button
          type="button"
          aria-label="Close"
          className="absolute inset-0 bg-black/80 backdrop-blur-[6px]"
          onClick={onClose}
        />
        <div
          className="relative z-[1] flex w-full flex-col rounded-t-[22px] border border-b-0 border-ld-border bg-ld-surface"
          style={{ maxHeight: maxH }}
        >
          <div className="flex shrink-0 justify-center pt-3">
            <div className="h-1 w-9 rounded-sm bg-ld-border" />
          </div>
          <div className="scrollbar-none overflow-y-auto overscroll-contain px-5 pb-[max(3rem,env(safe-area-inset-bottom))] pt-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
