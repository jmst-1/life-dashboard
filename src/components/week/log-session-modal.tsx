'use client';

import { useState } from 'react';
import type { Session } from '@/types';

type LogSessionModalProps = {
  session: Session;
  onClose: () => void;
  onSaved: (session: Session) => void;
};

export function LogSessionModal({
  session,
  onClose,
  onSaved,
}: LogSessionModalProps) {
  const [duration, setDuration] = useState(
    String(session.planned_duration_min ?? 0)
  );
  const [completed, setCompleted] = useState(true);
  const [skipped, setSkipped] = useState(false);
  const [skipReason, setSkipReason] = useState(session.skip_reason ?? '');
  const [calories, setCalories] = useState(
    session.actual_calories_kcal != null
      ? String(session.actual_calories_kcal)
      : ''
  );
  const [notes, setNotes] = useState(session.execution_notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setCompletedToggle(value: boolean) {
    setCompleted(value);
    if (value) setSkipped(false);
  }

  function setSkippedToggle(value: boolean) {
    setSkipped(value);
    if (value) setCompleted(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const durationNum = Number(duration);
    if (Number.isNaN(durationNum) || durationNum < 0) {
      setError('Duration must be a non-negative number');
      setSaving(false);
      return;
    }

    const body: Record<string, unknown> = {
      actual_duration_min: Math.round(durationNum),
      completed,
      skipped,
      execution_notes: notes.trim() || null,
    };

    if (skipped) {
      body.skip_reason = skipReason.trim() || null;
    }

    if (calories.trim()) {
      const cal = Number(calories);
      if (Number.isNaN(cal) || cal < 0) {
        setError('Calories must be a non-negative number');
        setSaving(false);
        return;
      }
      body.actual_calories_kcal = Math.round(cal);
    } else {
      body.actual_calories_kcal = null;
    }

    try {
      const res = await fetch(`/api/sessions/${session.id}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
      aria-labelledby="log-session-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-xl border border-gray-700 bg-gray-950 p-5 text-white shadow-xl sm:rounded-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="log-session-title" className="text-base font-semibold">
              Log session
            </h2>
            <p className="mt-0.5 text-sm text-gray-400">{session.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-white"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              required
            />
          </label>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={completed}
                onChange={(e) => setCompletedToggle(e.target.checked)}
                className="rounded border-gray-600"
              />
              Completed
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={skipped}
                onChange={(e) => setSkippedToggle(e.target.checked)}
                className="rounded border-gray-600"
              />
              Skipped
            </label>
          </div>

          {skipped && (
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-gray-400">Why?</span>
              <input
                type="text"
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
                placeholder="Skip reason"
              />
            </label>
          )}

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-gray-400">
              Calories burned (optional)
            </span>
            <input
              type="number"
              min={0}
              step={1}
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-gray-400">
              Notes (optional)
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
            />
          </label>

          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving || (!completed && !skipped)}
            className="w-full rounded bg-white py-2.5 text-sm font-medium text-gray-950 hover:bg-gray-200 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}
