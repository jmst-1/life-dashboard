'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category } from '@/types';

const inputClassName =
  'mt-1 w-full rounded-xl border border-ld-border bg-ld-surface-high px-4 py-3 text-[15px] text-ld-text outline-none focus:border-ld-border-bright';

const chipSelected =
  'border-ld-orange bg-ld-orange/15 text-ld-text';
const chipIdle =
  'border-ld-border bg-ld-surface-high text-ld-text-sub hover:border-ld-border-bright';

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

type StrengthLevel = (typeof LEVELS)[number];

type StrengthSnapshot = {
  level: StrengthLevel;
  equipment: string;
  goals: string;
  goalEventName: string;
  goalEventDate: string;
  goalEventNotes: string;
  injuryNotes: string;
};

type StrengthCoachFormProps = {
  category: Category;
};

function buildInitial(category: Category): StrengthSnapshot {
  const ctx = category.coach_context ?? {};
  const level: StrengthLevel =
    typeof ctx.level === 'string' &&
    (LEVELS as readonly string[]).includes(ctx.level)
      ? (ctx.level as StrengthLevel)
      : 'intermediate';
  return {
    level,
    equipment: typeof ctx.equipment === 'string' ? ctx.equipment : '',
    goals: typeof ctx.goals === 'string' ? ctx.goals : '',
    goalEventName: category.goal_event_name ?? '',
    goalEventDate: category.goal_event_date ?? '',
    goalEventNotes: category.goal_event_notes ?? '',
    injuryNotes:
      typeof ctx.injury_notes === 'string' ? ctx.injury_notes : '',
  };
}

export function StrengthCoachForm({ category }: StrengthCoachFormProps) {
  const router = useRouter();
  const ctx = category.coach_context ?? {};
  const [snapshot, setSnapshot] = useState(() => buildInitial(category));
  const [level, setLevel] = useState(snapshot.level);
  const [equipment, setEquipment] = useState(snapshot.equipment);
  const [goals, setGoals] = useState(snapshot.goals);
  const [goalEventName, setGoalEventName] = useState(snapshot.goalEventName);
  const [goalEventDate, setGoalEventDate] = useState(snapshot.goalEventDate);
  const [goalEventNotes, setGoalEventNotes] = useState(snapshot.goalEventNotes);
  const [injuryNotes, setInjuryNotes] = useState(snapshot.injuryNotes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = useMemo(
    () =>
      level !== snapshot.level ||
      equipment !== snapshot.equipment ||
      goals !== snapshot.goals ||
      goalEventName !== snapshot.goalEventName ||
      goalEventDate !== snapshot.goalEventDate ||
      goalEventNotes !== snapshot.goalEventNotes ||
      injuryNotes !== snapshot.injuryNotes,
    [
      level,
      equipment,
      goals,
      goalEventName,
      goalEventDate,
      goalEventNotes,
      injuryNotes,
      snapshot,
    ]
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isDirty) return;
    setError(null);
    setLoading(true);

    try {
      const coach_context = {
        ...ctx,
        level,
        equipment: equipment.trim() || undefined,
        goals: goals.trim() || undefined,
        injury_notes: injuryNotes.trim() || undefined,
      };

      const res = await fetch(`/api/categories/${category.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coach_context,
          goal_event_name: goalEventName.trim() || null,
          goal_event_date: goalEventDate || null,
          goal_event_notes: goalEventNotes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save');
        return;
      }
      setSnapshot({
        level,
        equipment,
        goals,
        goalEventName,
        goalEventDate,
        goalEventNotes,
        injuryNotes,
      });
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <fieldset>
        <legend className="text-xs font-semibold text-ld-text-sub">Level</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(l)}
              className={`rounded-[14px] border px-3 py-1.5 text-sm capitalize ${
                level === l ? chipSelected : chipIdle
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-xs font-semibold text-ld-text-sub">
          Available equipment
        </span>
        <textarea
          rows={2}
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
          placeholder="Barbell, dumbbells, pull-up bar, bench"
          className={inputClassName}
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-ld-text-sub">Goals</span>
        <textarea
          rows={3}
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          className={inputClassName}
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-ld-text-sub">
          Goal event name{' '}
          <span className="font-normal text-ld-text-muted">(optional)</span>
        </span>
        <input
          type="text"
          value={goalEventName}
          onChange={(e) => setGoalEventName(e.target.value)}
          placeholder="e.g. powerlifting meet"
          className={inputClassName}
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-ld-text-sub">
          Goal event date{' '}
          <span className="font-normal text-ld-text-muted">(optional)</span>
        </span>
        <input
          type="date"
          value={goalEventDate}
          onChange={(e) => setGoalEventDate(e.target.value)}
          className={inputClassName}
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-ld-text-sub">
          Goal event notes{' '}
          <span className="font-normal text-ld-text-muted">(optional)</span>
        </span>
        <textarea
          rows={2}
          value={goalEventNotes}
          onChange={(e) => setGoalEventNotes(e.target.value)}
          className={inputClassName}
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-ld-text-sub">
          Injury / constraint notes
        </span>
        <textarea
          rows={3}
          value={injuryNotes}
          onChange={(e) => setInjuryNotes(e.target.value)}
          className={inputClassName}
        />
      </label>

      {error && (
        <p className="text-sm text-ld-red" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!isDirty || loading}
        className="w-full rounded-[14px] bg-ld-orange py-3.5 text-[15px] font-extrabold text-white disabled:opacity-60"
      >
        {loading ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}
