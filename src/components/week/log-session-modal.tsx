'use client';

import { useState } from 'react';
import type { Session } from '@/types';

type LogSessionModalProps = {
  session: Session;
  canEdit?: boolean;
  onClose: () => void;
  onSaved: (session: Session) => void;
};

export function LogSessionModal({
  session,
  canEdit = true,
  onClose,
  onSaved,
}: LogSessionModalProps) {
  const canLog = canEdit && !session.completed && !session.skipped;
  const plannedDuration = String(session.planned_duration_min ?? 0);

  const [duration, setDuration] = useState(
    String(session.actual_duration_min ?? session.planned_duration_min ?? 0)
  );
  const [completed, setCompleted] = useState(
    session.skipped ? false : true
  );
  const [skipped, setSkipped] = useState(session.skipped);
  const [skipReason, setSkipReason] = useState(session.skip_reason ?? '');
  const [calories, setCalories] = useState(
    session.actual_calories_kcal != null
      ? String(session.actual_calories_kcal)
      : ''
  );
  const [notes, setNotes] = useState(session.execution_notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  function setCompletedToggle(value: boolean) {
    setNeedsConfirm(false);
    setCompleted(value);
    if (value) setSkipped(false);
  }

  function setSkippedToggle(value: boolean) {
    setNeedsConfirm(false);
    setSkipped(value);
    if (value) setCompleted(false);
  }

  function isUnchanged(): boolean {
    return (
      duration === plannedDuration &&
      completed &&
      !skipped &&
      calories.trim() === '' &&
      notes.trim() === ''
    );
  }

  async function submitLog() {
    setSaving(true);
    setError(null);
    setNeedsConfirm(false);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canLog) return;

    if (isUnchanged() && !needsConfirm) {
      setNeedsConfirm(true);
      setError(null);
      return;
    }

    await submitLog();
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
              {canLog ? 'Log session' : 'View session'}
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
              disabled={!canLog}
              onChange={(e) => {
                setNeedsConfirm(false);
                setDuration(e.target.value);
              }}
              className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-60"
              required
            />
          </label>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={completed}
                disabled={!canLog}
                onChange={(e) => setCompletedToggle(e.target.checked)}
                className="rounded border-gray-600 disabled:opacity-60"
              />
              Completed
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={skipped}
                disabled={!canLog}
                onChange={(e) => setSkippedToggle(e.target.checked)}
                className="rounded border-gray-600 disabled:opacity-60"
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
                disabled={!canLog}
                onChange={(e) => {
                  setNeedsConfirm(false);
                  setSkipReason(e.target.value);
                }}
                className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-60"
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
              disabled={!canLog}
              onChange={(e) => {
                setNeedsConfirm(false);
                setCalories(e.target.value);
              }}
              className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-60"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-gray-400">
              Notes (optional)
            </span>
            <textarea
              value={notes}
              disabled={!canLog}
              onChange={(e) => {
                setNeedsConfirm(false);
                setNotes(e.target.value);
              }}
              rows={3}
              className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-60"
            />
          </label>

          {canLog && needsConfirm && (
            <div
              className="space-y-2 rounded border border-amber-800/60 bg-amber-950/40 px-3 py-3"
              role="status"
            >
              <p className="text-sm text-amber-200">
                Nothing was edited. Confirm that this session is completed?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNeedsConfirm(false)}
                  className="flex-1 rounded border border-gray-600 py-2 text-sm text-gray-300 hover:bg-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void submitLog()}
                  disabled={saving}
                  className="flex-1 rounded bg-amber-200 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Confirm'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          {canLog && !needsConfirm && (
            <button
              type="submit"
              disabled={saving || (!completed && !skipped)}
              className="w-full rounded bg-white py-2.5 text-sm font-medium text-gray-950 hover:bg-gray-200 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
