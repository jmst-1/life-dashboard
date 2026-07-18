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
          reps: priorSet?.reps ?? null,
          weight_kg: priorSet?.weight_kg ?? null,
          equipment: priorSet?.equipment ?? null,
          notes: priorSet?.notes ?? null,
        });
      }
      entries.push({ exercise_name: exercise.name, sets });
    }
  }
  return entries;
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
  const [log, setLog] = useState<ExerciseLogEntry[]>(() =>
    buildInitialLog(session)
  );
  const [duration, setDuration] = useState(
    String(session.planned_duration_min ?? 0)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateSet(
    exerciseName: string,
    setNum: number,
    field: keyof Omit<ExerciseLogSet, 'set_num'>,
    value: string
  ) {
    setLog((prev) =>
      prev.map((entry) => {
        if (entry.exercise_name !== exerciseName) return entry;
        return {
          ...entry,
          sets: entry.sets.map((s) => {
            if (s.set_num !== setNum) return s;
            if (field === 'equipment' || field === 'notes') {
              return { ...s, [field]: value.trim() || null };
            }
            return { ...s, [field]: numOrNull(value) };
          }),
        };
      })
    );
  }

  function getLogEntry(exerciseName: string): ExerciseLogEntry | undefined {
    return log.find((e) => e.exercise_name === exerciseName);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setError(null);

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
      router.push('/week/current');
      router.refresh();
    } catch {
      setError('Failed to log session');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">{session.title}</h1>
        {session.planned_duration_min != null && (
          <p className="mt-1 text-sm text-gray-400">
            {session.planned_duration_min} min planned
          </p>
        )}
        {session.description && (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
            {session.description}
          </p>
        )}
      </div>

      {(blocks as StrengthBlock[]).map((block, bi) => (
        <section key={`${block.name}-${bi}`} className="space-y-3">
          <h2 className="text-sm font-semibold text-white">{block.name}</h2>
          <ul className="space-y-4">
            {block.exercises.map((exercise, ei) => {
              const entry = getLogEntry(exercise.name);
              return (
                <li
                  key={`${exercise.name}-${ei}`}
                  className="rounded border border-gray-800 bg-gray-900/50 p-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-white">
                      {exercise.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {exercise.sets} × {exercise.reps}
                    </p>
                  </div>
                  {exercise.notes && (
                    <p className="mt-1 text-xs text-gray-500">
                      {exercise.notes}
                    </p>
                  )}
                  <ul className="mt-3 space-y-2">
                    {(entry?.sets ?? []).map((set) => (
                      <li
                        key={set.set_num}
                        className="grid grid-cols-2 gap-2 sm:grid-cols-5"
                      >
                        <span className="col-span-2 text-xs font-medium text-gray-400 sm:col-span-1 sm:self-center">
                          Set {set.set_num}
                        </span>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          placeholder="kg"
                          disabled={!canEdit}
                          value={set.weight_kg ?? ''}
                          onChange={(e) =>
                            updateSet(
                              exercise.name,
                              set.set_num,
                              'weight_kg',
                              e.target.value
                            )
                          }
                          className="rounded border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white disabled:opacity-60"
                          aria-label={`Set ${set.set_num} weight`}
                        />
                        <input
                          type="text"
                          placeholder="Equip"
                          disabled={!canEdit}
                          value={set.equipment ?? ''}
                          onChange={(e) =>
                            updateSet(
                              exercise.name,
                              set.set_num,
                              'equipment',
                              e.target.value
                            )
                          }
                          className="rounded border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white disabled:opacity-60"
                          aria-label={`Set ${set.set_num} equipment`}
                        />
                        <input
                          type="number"
                          min={0}
                          step={1}
                          placeholder="Reps"
                          disabled={!canEdit}
                          value={set.reps ?? ''}
                          onChange={(e) =>
                            updateSet(
                              exercise.name,
                              set.set_num,
                              'reps',
                              e.target.value
                            )
                          }
                          className="rounded border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white disabled:opacity-60"
                          aria-label={`Set ${set.set_num} reps`}
                        />
                        <input
                          type="text"
                          placeholder="Notes"
                          disabled={!canEdit}
                          value={set.notes ?? ''}
                          onChange={(e) =>
                            updateSet(
                              exercise.name,
                              set.set_num,
                              'notes',
                              e.target.value
                            )
                          }
                          className="col-span-2 rounded border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white disabled:opacity-60 sm:col-span-5"
                          aria-label={`Set ${set.set_num} notes`}
                        />
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {canEdit && (
        <div className="space-y-3 border-t border-gray-800 pt-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-gray-400">
              Actual duration (min)
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
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded bg-white py-2.5 text-sm font-medium text-gray-950 hover:bg-gray-200 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Log session'}
          </button>
        </div>
      )}

      {!canEdit && (
        <p className="text-sm text-gray-500">
          This week is locked — logging is disabled.
        </p>
      )}
    </form>
  );
}
