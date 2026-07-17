'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category } from '@/types';

const inputClassName =
  'mt-1 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-gray-500';

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

type StrengthLevel = (typeof LEVELS)[number];

type StrengthCoachFormProps = {
  category: Category;
};

export function StrengthCoachForm({ category }: StrengthCoachFormProps) {
  const router = useRouter();
  const ctx = category.coach_context ?? {};

  const initialLevel: StrengthLevel =
    typeof ctx.level === 'string' &&
    (LEVELS as readonly string[]).includes(ctx.level)
      ? (ctx.level as StrengthLevel)
      : 'intermediate';
  const [level, setLevel] = useState(initialLevel);
  const [equipment, setEquipment] = useState(
    typeof ctx.equipment === 'string' ? ctx.equipment : ''
  );
  const [goals, setGoals] = useState(
    typeof ctx.goals === 'string' ? ctx.goals : ''
  );
  const [goalEventName, setGoalEventName] = useState(
    category.goal_event_name ?? ''
  );
  const [goalEventDate, setGoalEventDate] = useState(
    category.goal_event_date ?? ''
  );
  const [goalEventNotes, setGoalEventNotes] = useState(
    category.goal_event_notes ?? ''
  );
  const [injuryNotes, setInjuryNotes] = useState(
    typeof ctx.injury_notes === 'string' ? ctx.injury_notes : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
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
      setSuccess(true);
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
        <legend className="text-sm text-gray-300">Level</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(l)}
              className={`rounded border px-3 py-1.5 text-sm capitalize ${
                level === l
                  ? 'border-white bg-gray-800 text-white'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block text-sm">
        <span className="text-gray-300">Available equipment</span>
        <textarea
          rows={2}
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
          placeholder="Barbell, dumbbells, pull-up bar, bench"
          className={inputClassName}
        />
      </label>

      <label className="block text-sm">
        <span className="text-gray-300">Goals</span>
        <textarea
          rows={3}
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          className={inputClassName}
        />
      </label>

      <label className="block text-sm">
        <span className="text-gray-300">
          Goal event name <span className="text-gray-500">(optional)</span>
        </span>
        <input
          type="text"
          value={goalEventName}
          onChange={(e) => setGoalEventName(e.target.value)}
          placeholder="e.g. powerlifting meet"
          className={inputClassName}
        />
      </label>

      <label className="block text-sm">
        <span className="text-gray-300">
          Goal event date <span className="text-gray-500">(optional)</span>
        </span>
        <input
          type="date"
          value={goalEventDate}
          onChange={(e) => setGoalEventDate(e.target.value)}
          className={inputClassName}
        />
      </label>

      <label className="block text-sm">
        <span className="text-gray-300">
          Goal event notes <span className="text-gray-500">(optional)</span>
        </span>
        <textarea
          rows={2}
          value={goalEventNotes}
          onChange={(e) => setGoalEventNotes(e.target.value)}
          className={inputClassName}
        />
      </label>

      <label className="block text-sm">
        <span className="text-gray-300">Injury / constraint notes</span>
        <textarea
          rows={3}
          value={injuryNotes}
          onChange={(e) => setInjuryNotes(e.target.value)}
          className={inputClassName}
        />
      </label>

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-400" role="status">
          Saved.
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-white px-4 py-2.5 text-sm font-medium text-gray-950 hover:bg-gray-200 disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}
