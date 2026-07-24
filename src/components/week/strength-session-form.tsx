'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type {
  ExerciseLogEntry,
  ExerciseLogSet,
  Session,
  StrengthBlock,
} from '@/types';

type StrengthSessionFormProps = {
  session: Session;
  canEdit: boolean;
};

const inputClassName =
  'w-full rounded-xl border border-ld-border bg-ld-surface-high px-3 py-2.5 text-[14px] text-ld-text outline-none focus:border-ld-border-bright disabled:opacity-60';

function parseDefaultReps(reps: string): number | null {
  const match = reps.match(/\d+/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isNaN(n) ? null : n;
}

function minutesToTimeValue(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

const DURATION_PATTERN = /^(\d{1,2}):([0-5]\d):([0-5]\d)$/;

function timeValueToMinutes(value: string): number | null {
  const match = value.trim().match(DURATION_PATTERN);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  return Math.round(totalSeconds / 60);
}

function buildInitialLog(session: Session): ExerciseLogEntry[] {
  const blocks = session.blocks ?? [];
  const existing = session.exercise_log ?? [];
  const existingByName = new Map(
    existing.map((e) => [e.exercise_name, e] as const)
  );

  const entries: ExerciseLogEntry[] = [];
  for (const block of blocks) {
    for (const exercise of block.exercises) {
      const prior = existingByName.get(exercise.name);
      const setCount = Math.max(exercise.sets, 1);
      const sets: ExerciseLogSet[] = [];
      for (let i = 1; i <= setCount; i++) {
        const priorSet = prior?.sets.find((s) => s.set_num === i);
        sets.push({
          set_num: i,
          reps: priorSet?.reps ?? parseDefaultReps(exercise.reps),
          weight_kg: priorSet?.weight_kg ?? null,
          equipment: null,
          notes: null,
        });
      }
      const priorNotes =
        prior?.notes ??
        prior?.sets.find((s) => s.notes?.trim())?.notes ??
        null;
      entries.push({
        exercise_name: exercise.name,
        notes: priorNotes,
        sets,
      });
    }
  }
  return entries;
}

function logsMatch(a: ExerciseLogEntry[], b: ExerciseLogEntry[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i];
    const right = b[i];
    if (left.exercise_name !== right.exercise_name) return false;
    if ((left.notes ?? null) !== (right.notes ?? null)) return false;
    if (left.sets.length !== right.sets.length) return false;
    for (let j = 0; j < left.sets.length; j++) {
      const ls = left.sets[j];
      const rs = right.sets[j];
      if (ls.set_num !== rs.set_num) return false;
      if (ls.reps !== rs.reps) return false;
      if (ls.weight_kg !== rs.weight_kg) return false;
    }
  }
  return true;
}

function numOrNull(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function StrengthSessionForm({
  session,
  canEdit,
}: StrengthSessionFormProps) {
  const router = useRouter();
  const blocks = session.blocks ?? [];
  const canLog = canEdit && !session.completed && !session.skipped;
  const [baselineLog] = useState(() => buildInitialLog(session));
  const [baselineDuration] = useState(() =>
    minutesToTimeValue(
      session.actual_duration_min ?? session.planned_duration_min ?? 0
    )
  );
  const [log, setLog] = useState<ExerciseLogEntry[]>(() =>
    buildInitialLog(session)
  );
  const [duration, setDuration] = useState(() =>
    minutesToTimeValue(
      session.actual_duration_min ?? session.planned_duration_min ?? 0
    )
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  function updateSet(
    exerciseName: string,
    setNum: number,
    field: 'reps' | 'weight_kg',
    value: string
  ) {
    setNeedsConfirm(false);
    setLog((prev) =>
      prev.map((entry) => {
        if (entry.exercise_name !== exerciseName) return entry;
        return {
          ...entry,
          sets: entry.sets.map((s) => {
            if (s.set_num !== setNum) return s;
            return { ...s, [field]: numOrNull(value) };
          }),
        };
      })
    );
  }

  function updateExerciseNotes(exerciseName: string, value: string) {
    setNeedsConfirm(false);
    setLog((prev) =>
      prev.map((entry) => {
        if (entry.exercise_name !== exerciseName) return entry;
        return { ...entry, notes: value.trim() || null };
      })
    );
  }

  function getLogEntry(exerciseName: string): ExerciseLogEntry | undefined {
    return log.find((e) => e.exercise_name === exerciseName);
  }

  function isUnchanged(): boolean {
    return logsMatch(log, baselineLog) && duration === baselineDuration;
  }

  async function submitLog() {
    setSaving(true);
    setError(null);
    setNeedsConfirm(false);

    const durationNum = timeValueToMinutes(duration);
    if (durationNum == null || durationNum < 0) {
      setError('Duration must be a valid time (HH:MM:SS)');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/sessions/${session.id}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actual_duration_min: durationNum,
          completed: true,
          skipped: false,
          exercise_log: log,
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
      router.push('/today');
      router.refresh();
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
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        {session.planned_duration_min != null && (
          <p className="text-[13px] text-ld-text-sub">
            {session.planned_duration_min} min planned
          </p>
        )}
        {(session.completed || session.skipped) && (
          <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-ld-green">
            {session.completed ? 'Completed' : 'Skipped'}
          </p>
        )}
        {session.description && (
          <p className="mt-3 whitespace-pre-wrap rounded-2xl border border-ld-border bg-ld-surface p-4 text-[13px] leading-relaxed text-ld-text-sub">
            {session.description}
          </p>
        )}
      </div>

      {(blocks as StrengthBlock[]).map((block, bi) => (
        <section key={`${block.name}-${bi}`} className="space-y-2.5">
          <h2 className="text-[11px] font-bold tracking-wide text-ld-text-muted">
            {block.name.toUpperCase()}
          </h2>
          <ul className="space-y-3">
            {block.exercises.map((exercise, ei) => {
              const entry = getLogEntry(exercise.name);
              return (
                <li
                  key={`${exercise.name}-${ei}`}
                  className="rounded-2xl border border-ld-border bg-ld-surface p-3.5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[14px] font-bold text-ld-text">
                      {exercise.name}
                    </p>
                    <p className="text-[12px] font-bold text-ld-orange">
                      {exercise.sets} × {exercise.reps}
                    </p>
                  </div>
                  {exercise.notes && (
                    <p className="mt-1 text-[12px] text-ld-text-muted">
                      {exercise.notes}
                    </p>
                  )}
                  <ul className="mt-3 space-y-2">
                    {(entry?.sets ?? []).map((set) => (
                      <li
                        key={set.set_num}
                        className="grid grid-cols-3 items-center gap-2"
                      >
                        <span className="text-[12px] font-semibold text-ld-text-sub">
                          Set {set.set_num}
                        </span>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          placeholder="kg"
                          disabled={!canLog}
                          value={set.weight_kg ?? ''}
                          onChange={(e) =>
                            updateSet(
                              exercise.name,
                              set.set_num,
                              'weight_kg',
                              e.target.value
                            )
                          }
                          className={inputClassName}
                          aria-label={`Set ${set.set_num} weight`}
                        />
                        <input
                          type="number"
                          min={0}
                          step={1}
                          placeholder="Reps"
                          disabled={!canLog}
                          value={set.reps ?? ''}
                          onChange={(e) =>
                            updateSet(
                              exercise.name,
                              set.set_num,
                              'reps',
                              e.target.value
                            )
                          }
                          className={inputClassName}
                          aria-label={`Set ${set.set_num} reps`}
                        />
                      </li>
                    ))}
                  </ul>
                  <input
                    type="text"
                    placeholder="Notes"
                    disabled={!canLog}
                    value={entry?.notes ?? ''}
                    onChange={(e) =>
                      updateExerciseNotes(exercise.name, e.target.value)
                    }
                    className={`mt-2 ${inputClassName}`}
                    aria-label={`${exercise.name} notes`}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {canLog && (
        <div className="space-y-3 border-t border-ld-border pt-4">
          <label className="block space-y-1.5">
            <span className="text-[12px] font-semibold text-ld-text-sub">
              Actual duration (HH:MM:SS)
            </span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="00:50:00"
              pattern="\d{1,2}:[0-5]\d:[0-5]\d"
              value={duration}
              onChange={(e) => {
                setNeedsConfirm(false);
                setDuration(e.target.value);
              }}
              className={`${inputClassName} font-mono tabular-nums`}
              required
            />
          </label>
          {needsConfirm && (
            <div
              className="space-y-2 rounded-2xl border border-ld-amber/40 bg-ld-amber-dim px-3.5 py-3"
              role="status"
            >
              <p className="text-[13px] text-ld-amber">
                You haven&apos;t changed any values from the defaults. Log this
                session anyway?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNeedsConfirm(false)}
                  className="flex-1 rounded-xl border border-ld-border py-2.5 text-[13px] text-ld-text-sub"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void submitLog()}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-ld-amber py-2.5 text-[13px] font-bold text-ld-bg disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Log anyway'}
                </button>
              </div>
            </div>
          )}
          {error && (
            <p className="text-sm text-ld-red" role="alert">
              {error}
            </p>
          )}
          {!needsConfirm && (
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-ld-orange py-3.5 text-[15px] font-extrabold text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Log session'}
            </button>
          )}
        </div>
      )}

      {!canLog && (
        <div className="space-y-2 border-t border-ld-border pt-4">
          <p className="text-[13px] text-ld-text-sub">
            Actual duration:{' '}
            <span className="font-mono tabular-nums text-ld-text">
              {duration}
            </span>
          </p>
          {!canEdit && (
            <p className="text-[13px] text-ld-text-muted">
              This week is locked — logging is disabled.
            </p>
          )}
        </div>
      )}
    </form>
  );
}
