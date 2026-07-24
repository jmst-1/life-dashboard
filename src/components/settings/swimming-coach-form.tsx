'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category, SwimPoolLength, TrainingPhase } from '@/types';
import { derivePhase } from '@/lib/training-phase';

const inputClassName =
  'mt-1 w-full rounded-xl border border-ld-border bg-ld-surface-high px-4 py-3 text-[15px] text-ld-text outline-none focus:border-ld-border-bright';

const chipSelected =
  'border-ld-orange bg-ld-orange/15 text-ld-text';
const chipIdle =
  'border-ld-border bg-ld-surface-high text-ld-text-sub hover:border-ld-border-bright';

const DEFAULT_EQUIPMENT = 'Pull buoy, paddles, kickboard';

const POOL_LENGTHS: SwimPoolLength[] = ['25m', '50m', '25yd'];

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

type SwimmingSnapshot = {
  cssPer100: string;
  poolLength: SwimPoolLength;
  phase: Exclude<TrainingPhase, 'race_week'>;
  goalEventName: string;
  goalEventDate: string;
  goalEventNotes: string;
  goals: string;
  equipmentNotes: string;
  injuryNotes: string;
};

type SwimmingCoachFormProps = {
  category: Category;
};

function buildInitial(category: Category): SwimmingSnapshot {
  const ctx = category.coach_context ?? {};
  const phase: Exclude<TrainingPhase, 'race_week'> =
    typeof ctx.phase === 'string' &&
    (EDITABLE_PHASES as readonly string[]).includes(ctx.phase)
      ? (ctx.phase as Exclude<TrainingPhase, 'race_week'>)
      : 'base';
  const poolLength: SwimPoolLength =
    typeof ctx.pool_length === 'string' &&
    (POOL_LENGTHS as readonly string[]).includes(ctx.pool_length)
      ? (ctx.pool_length as SwimPoolLength)
      : '25m';
  return {
    cssPer100: typeof ctx.css_per_100 === 'string' ? ctx.css_per_100 : '',
    poolLength,
    phase,
    goalEventName: category.goal_event_name ?? '',
    goalEventDate: category.goal_event_date ?? '',
    goalEventNotes: category.goal_event_notes ?? '',
    goals: typeof ctx.goals === 'string' ? ctx.goals : '',
    equipmentNotes:
      typeof ctx.equipment_notes === 'string' && ctx.equipment_notes
        ? ctx.equipment_notes
        : DEFAULT_EQUIPMENT,
    injuryNotes:
      typeof ctx.injury_notes === 'string' ? ctx.injury_notes : '',
  };
}

export function SwimmingCoachForm({ category }: SwimmingCoachFormProps) {
  const router = useRouter();
  const ctx = category.coach_context ?? {};
  const [snapshot, setSnapshot] = useState(() => buildInitial(category));
  const [cssPer100, setCssPer100] = useState(snapshot.cssPer100);
  const [poolLength, setPoolLength] = useState(snapshot.poolLength);
  const [phase, setPhase] = useState(snapshot.phase);
  const [goalEventName, setGoalEventName] = useState(snapshot.goalEventName);
  const [goalEventDate, setGoalEventDate] = useState(snapshot.goalEventDate);
  const [goalEventNotes, setGoalEventNotes] = useState(snapshot.goalEventNotes);
  const [goals, setGoals] = useState(snapshot.goals);
  const [equipmentNotes, setEquipmentNotes] = useState(snapshot.equipmentNotes);
  const [injuryNotes, setInjuryNotes] = useState(snapshot.injuryNotes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const derivedPhase = goalEventDate ? derivePhase(goalEventDate) : null;
  const phaseAuto = derivedPhase != null;

  const isDirty = useMemo(
    () =>
      cssPer100 !== snapshot.cssPer100 ||
      poolLength !== snapshot.poolLength ||
      phase !== snapshot.phase ||
      goalEventName !== snapshot.goalEventName ||
      goalEventDate !== snapshot.goalEventDate ||
      goalEventNotes !== snapshot.goalEventNotes ||
      goals !== snapshot.goals ||
      equipmentNotes !== snapshot.equipmentNotes ||
      injuryNotes !== snapshot.injuryNotes,
    [
      cssPer100,
      poolLength,
      phase,
      goalEventName,
      goalEventDate,
      goalEventNotes,
      goals,
      equipmentNotes,
      injuryNotes,
      snapshot,
    ]
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isDirty) return;
    setError(null);

    if (!cssPer100.trim()) {
      setError('Critical swim speed (CSS) is required for plan generation.');
      return;
    }

    setLoading(true);
    try {
      const coach_context = {
        ...ctx,
        css_per_100: cssPer100.trim(),
        pool_length: poolLength,
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
      setSnapshot({
        cssPer100,
        poolLength,
        phase,
        goalEventName,
        goalEventDate,
        goalEventNotes,
        goals,
        equipmentNotes,
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
      <label className="block">
        <span className="text-xs font-semibold text-ld-text-sub">
          Critical swim speed (CSS)
        </span>
        <input
          type="text"
          required
          value={cssPer100}
          onChange={(e) => setCssPer100(e.target.value)}
          placeholder="e.g. 1:45/100m"
          className={inputClassName}
        />
        <span className="mt-1 block text-[11px] text-ld-text-muted">
          Required for plan generation. Pace per 100.
        </span>
      </label>

      <fieldset>
        <legend className="text-xs font-semibold text-ld-text-sub">
          Pool length
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {POOL_LENGTHS.map((len) => (
            <button
              key={len}
              type="button"
              onClick={() => setPoolLength(len)}
              className={`rounded-[14px] border px-3 py-1.5 text-sm ${
                poolLength === len ? chipSelected : chipIdle
              }`}
            >
              {len}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <span className="text-xs font-semibold text-ld-text-sub">
          Training phase
        </span>
        {phaseAuto && derivedPhase ? (
          <div className="mt-2">
            <span className="inline-flex rounded-[14px] border border-ld-orange bg-ld-orange/15 px-3 py-1.5 text-sm capitalize text-ld-text">
              {formatPhase(derivedPhase)}
            </span>
            <p className="mt-1.5 text-[11px] text-ld-text-muted">
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
                className={`rounded-[14px] border px-3 py-1.5 text-sm capitalize ${
                  phase === p ? chipSelected : chipIdle
                }`}
              >
                {formatPhase(p)}
              </button>
            ))}
          </div>
        )}
      </div>

      <label className="block">
        <span className="text-xs font-semibold text-ld-text-sub">
          Goal event name{' '}
          <span className="font-normal text-ld-text-muted">(optional)</span>
        </span>
        <input
          type="text"
          value={goalEventName}
          onChange={(e) => setGoalEventName(e.target.value)}
          placeholder="e.g. open water 5k"
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
          Equipment notes
        </span>
        <textarea
          rows={2}
          value={equipmentNotes}
          onChange={(e) => setEquipmentNotes(e.target.value)}
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
