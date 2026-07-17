'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category, TrainingPhase } from '@/types';
import { derivePhase } from '@/lib/training-phase';

const inputClassName =
  'mt-1 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-gray-500';

const DEFAULT_EQUIPMENT =
  'Smart trainer (Rouvy ERG), outdoor bike with power meter';

const EDITABLE_PHASES: Exclude<TrainingPhase, 'race_week'>[] = [
  'base',
  'build',
  'peak',
  'recovery',
  'taper',
];

function formatPhase(phase: TrainingPhase): string {
  if (phase === 'race_week') return 'Race week';
  return phase.charAt(0).toUpperCase() + phase.slice(1);
}

type CyclingCoachFormProps = {
  category: Category;
};

export function CyclingCoachForm({ category }: CyclingCoachFormProps) {
  const router = useRouter();
  const ctx = category.coach_context ?? {};

  const [ftp, setFtp] = useState(
    typeof ctx.ftp === 'number' ? String(ctx.ftp) : ''
  );
  const initialPhase: Exclude<TrainingPhase, 'race_week'> =
    typeof ctx.phase === 'string' &&
    (EDITABLE_PHASES as readonly string[]).includes(ctx.phase)
      ? (ctx.phase as Exclude<TrainingPhase, 'race_week'>)
      : 'base';
  const [phase, setPhase] = useState(initialPhase);
  const [goalEventName, setGoalEventName] = useState(
    category.goal_event_name ?? ''
  );
  const [goalEventDate, setGoalEventDate] = useState(
    category.goal_event_date ?? ''
  );
  const [goalEventNotes, setGoalEventNotes] = useState(
    category.goal_event_notes ?? ''
  );
  const [goals, setGoals] = useState(
    typeof ctx.goals === 'string' ? ctx.goals : ''
  );
  const [equipmentNotes, setEquipmentNotes] = useState(
    typeof ctx.equipment_notes === 'string' && ctx.equipment_notes
      ? ctx.equipment_notes
      : DEFAULT_EQUIPMENT
  );
  const [injuryNotes, setInjuryNotes] = useState(
    typeof ctx.injury_notes === 'string' ? ctx.injury_notes : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const derivedPhase = goalEventDate ? derivePhase(goalEventDate) : null;
  const phaseAuto = derivedPhase != null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const ftpNum = Number(ftp);
    if (!ftp || Number.isNaN(ftpNum) || ftpNum <= 0) {
      setError('FTP is required for plan generation.');
      return;
    }

    setLoading(true);
    try {
      const coach_context = {
        ...ctx,
        ftp: ftpNum,
        phase: phaseAuto ? derivedPhase : phase,
        goals: goals.trim() || undefined,
        equipment_notes: equipmentNotes.trim() || undefined,
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
      <label className="block text-sm">
        <span className="text-gray-300">FTP (watts)</span>
        <input
          type="number"
          step="1"
          min="1"
          required
          value={ftp}
          onChange={(e) => setFtp(e.target.value)}
          className={inputClassName}
        />
        <span className="mt-1 block text-xs text-gray-500">
          Required for plan generation.
        </span>
      </label>

      <div>
        <span className="text-sm text-gray-300">Training phase</span>
        {phaseAuto && derivedPhase ? (
          <div className="mt-2">
            <span className="inline-flex rounded-full border border-gray-600 bg-gray-900 px-3 py-1 text-sm capitalize text-white">
              {formatPhase(derivedPhase)}
            </span>
            <p className="mt-1.5 text-xs text-gray-500">
              Auto-derived from your goal event
            </p>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {EDITABLE_PHASES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPhase(p)}
                className={`rounded border px-3 py-1.5 text-sm capitalize ${
                  phase === p
                    ? 'border-white bg-gray-800 text-white'
                    : 'border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {formatPhase(p)}
              </button>
            ))}
          </div>
        )}
      </div>

      <label className="block text-sm">
        <span className="text-gray-300">
          Goal event name <span className="text-gray-500">(optional)</span>
        </span>
        <input
          type="text"
          value={goalEventName}
          onChange={(e) => setGoalEventName(e.target.value)}
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
        <span className="text-gray-300">Goals</span>
        <textarea
          rows={3}
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          className={inputClassName}
        />
      </label>

      <label className="block text-sm">
        <span className="text-gray-300">Equipment notes</span>
        <textarea
          rows={2}
          value={equipmentNotes}
          onChange={(e) => setEquipmentNotes(e.target.value)}
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
