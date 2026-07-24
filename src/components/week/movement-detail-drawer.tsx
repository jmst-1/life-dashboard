'use client';

import { Shuffle } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Session } from '@/types';

type MovementDetailDrawerProps = {
  session: Session;
  targetArea: string | null;
  canEdit: boolean;
  onClose: () => void;
  onSaved: (session: Session) => void;
  onRerolled: (session: Session, targetArea: string | null) => void;
};

function formatStepDuration(sec: number): string {
  if (sec >= 60 && sec % 60 === 0) {
    return `${sec / 60} min`;
  }
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m} min ${s} sec`;
  }
  return `${sec} sec`;
}

export function MovementDetailDrawer({
  session: initialSession,
  targetArea: initialTargetArea,
  canEdit,
  onClose,
  onSaved,
  onRerolled,
}: MovementDetailDrawerProps) {
  const [session, setSession] = useState(initialSession);
  const [targetArea, setTargetArea] = useState(initialTargetArea);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [duration, setDuration] = useState(
    String(initialSession.planned_duration_min ?? 0)
  );
  const [saving, setSaving] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canLog = canEdit && !session.completed && !session.skipped;

  useEffect(() => {
    setSession(initialSession);
    setTargetArea(initialTargetArea);
    setDuration(
      String(
        initialSession.actual_duration_min ??
          initialSession.planned_duration_min ??
          0
      )
    );
    setChecked({});
  }, [initialSession, initialTargetArea]);

  const steps = [...(session.routine_steps ?? [])].sort(
    (a, b) => a.order - b.order
  );

  async function handleShuffle() {
    if (!canLog) return;
    setShuffling(true);
    setError(null);
    try {
      const res = await fetch('/api/plan/reroll-movement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      });
      const json = (await res.json()) as {
        session?: Session & { target_area?: string };
        error?: string;
      };
      if (!res.ok || !json.session) {
        setError(json.error ?? 'Failed to shuffle');
        setShuffling(false);
        return;
      }
      const next = json.session;
      const area = next.target_area ?? null;
      setSession(next);
      setTargetArea(area);
      setDuration(String(next.planned_duration_min ?? 0));
      setChecked({});
      onRerolled(next, area);
    } catch {
      setError('Failed to shuffle');
    }
    setShuffling(false);
  }

  async function handleLog() {
    if (!canLog) return;
    setSaving(true);
    setError(null);

    if (steps.length > 0 && !steps.some((step) => checked[step.order])) {
      setError('Check at least one step before logging');
      setSaving(false);
      return;
    }

    const durationNum = Number(duration);
    if (Number.isNaN(durationNum) || durationNum < 0) {
      setError('Duration must be a non-negative number');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/sessions/${session.id}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actual_duration_min: Math.round(durationNum),
          completed: true,
          skipped: false,
        }),
      });
      const json = (await res.json()) as {
        session?: Session;
        error?: string;
      };
      if (!res.ok || !json.session) {
        setError(json.error ?? 'Failed to log session');
        setSaving(false);
        return;
      }
      onSaved(json.session);
    } catch {
      setError('Failed to log session');
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="movement-detail-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-xl border border-gray-700 bg-gray-950 p-5 text-white shadow-xl sm:rounded-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="movement-detail-title" className="text-base font-semibold">
              {session.title}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {targetArea && (
                <span className="rounded border border-gray-700 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                  {targetArea.replace(/_/g, ' ')}
                </span>
              )}
              {session.planned_duration_min != null && (
                <span className="text-xs text-gray-500">
                  {session.planned_duration_min} min
                </span>
              )}
              {session.completed && (
                <span className="rounded border border-emerald-800 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
                  Completed
                </span>
              )}
              {session.skipped && (
                <span className="rounded border border-gray-600 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                  Skipped
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canLog && (
              <button
                type="button"
                onClick={handleShuffle}
                disabled={shuffling}
                className="rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-50"
                aria-label="Shuffle routine"
              >
                <Shuffle
                  size={18}
                  className={shuffling ? 'animate-spin' : ''}
                />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-400 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>

        <ul className="space-y-3">
          {steps.map((step) => (
            <li key={step.order} className="flex gap-3">
              <input
                type="checkbox"
                checked={!!checked[step.order]}
                disabled={!canLog}
                onChange={(e) =>
                  setChecked((prev) => ({
                    ...prev,
                    [step.order]: e.target.checked,
                  }))
                }
                className="mt-1 rounded border-gray-600 disabled:opacity-60"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">
                  {step.name}{' '}
                  <span className="font-normal text-gray-500">
                    ({formatStepDuration(step.duration_sec)})
                  </span>
                </p>
                {step.cue && (
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
                    {step.cue}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        {canLog && (
          <div className="mt-5 space-y-3 border-t border-gray-800 pt-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-gray-400">
                Duration (min)
              </span>
              <input
                type="number"
                min={0}
                step={1}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
              />
            </label>
            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={handleLog}
              disabled={saving}
              className="w-full rounded bg-white py-2.5 text-sm font-medium text-gray-950 hover:bg-gray-200 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Log session'}
            </button>
          </div>
        )}

        {!canLog && session.actual_duration_min != null && (
          <p className="mt-5 border-t border-gray-800 pt-4 text-sm text-gray-400">
            Logged duration: {session.actual_duration_min} min
          </p>
        )}
      </div>
    </div>
  );
}
