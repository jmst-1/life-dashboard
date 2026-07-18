'use client';

import type { Session } from '@/types';

type CyclingDetailDrawerProps = {
  session: Session;
  ftp: number;
  canEdit: boolean;
  onClose: () => void;
  onLog: () => void;
};

function wattsFromPct(ftp: number, pct: number): number {
  return Math.round((ftp * pct) / 100);
}

export function CyclingDetailDrawer({
  session,
  ftp,
  canEdit,
  onClose,
  onLog,
}: CyclingDetailDrawerProps) {
  const zones = session.zones ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cycling-detail-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-xl border border-gray-700 bg-gray-950 p-5 text-white shadow-xl sm:rounded-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="cycling-detail-title" className="text-base font-semibold">
              {session.title}
            </h2>
            {session.planned_duration_min != null && (
              <p className="mt-0.5 text-sm text-gray-400">
                {session.planned_duration_min} min
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-white"
          >
            Close
          </button>
        </div>

        {zones.length > 0 && (
          <ul className="space-y-2">
            {zones.map((zone, i) => (
              <li
                key={`${zone.name}-${i}`}
                className="rounded border border-gray-800 bg-gray-900/60 px-3 py-2"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-white">
                    {zone.name}
                  </span>
                  <span className="text-xs text-gray-400 tabular-nums">
                    {zone.duration_min} min
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500 tabular-nums">
                  {wattsFromPct(ftp, zone.pct_ftp_low)}–
                  {wattsFromPct(ftp, zone.pct_ftp_high)} W (
                  {zone.pct_ftp_low}–{zone.pct_ftp_high}% FTP)
                </p>
              </li>
            ))}
          </ul>
        )}

        {session.description && (
          <div className="mt-4 border-t border-gray-800 pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Notes
            </p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
              {session.description}
            </p>
          </div>
        )}

        {canEdit && (
          <button
            type="button"
            onClick={onLog}
            className="mt-5 w-full rounded bg-white py-2.5 text-sm font-medium text-gray-950 hover:bg-gray-200"
          >
            Log session
          </button>
        )}
      </div>
    </div>
  );
}
