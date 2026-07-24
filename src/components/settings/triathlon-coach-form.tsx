'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  Category,
  TrainingPhase,
  TriathlonRaceDistance,
} from '@/types';
import { derivePhase } from '@/lib/training-phase';

const inputClassName =
  'mt-1 w-full rounded-xl border border-ld-border bg-ld-surface-high px-4 py-3 text-[15px] text-ld-text outline-none focus:border-ld-border-bright';

const chipSelected =
  'border-ld-orange bg-ld-orange/15 text-ld-text';
const chipIdle =
  'border-ld-border bg-ld-surface-high text-ld-text-sub hover:border-ld-border-bright';

const DEFAULT_EQUIPMENT =
  'Pool, smart trainer / road bike, running shoes';

const RACE_DISTANCES: TriathlonRaceDistance[] = [
  'sprint',
  'olympic',
  '70.3',
  'ironman',
  'other',
];

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

function formatRaceDistance(d: TriathlonRaceDistance): string {
  if (d === '70.3') return '70.3';
  return d.charAt(0).toUpperCase() + d.slice(1);
}

type TriathlonSnapshot = {
  raceDistance: TriathlonRaceDistance;
  swimCssPer100: string;
  bikeFtp: string;
  runThresholdPace: string;
  phase: Exclude<TrainingPhase, 'race_week'>;
  goalEventName: string;
  goalEventDate: string;
  goalEventNotes: string;
  goals: string;
  equipmentNotes: string;
  injuryNotes: string;
};

type TriathlonCoachFormProps = {
  category: Category;
};

function buildInitial(category: Category): TriathlonSnapshot {
  const ctx = category.coach_context ?? {};
  const phase: Exclude<TrainingPhase, 'race_week'> =
    typeof ctx.phase === 'string' &&
    (EDITABLE_PHASES as readonly string[]).includes(ctx.phase)
      ? (ctx.phase as Exclude<TrainingPhase, 'race_week'>)
      : 'base';
  const raceDistance: TriathlonRaceDistance =
    typeof ctx.race_distance === 'string' &&
    (RACE_DISTANCES as readonly string[]).includes(ctx.race_distance)
      ? (ctx.race_distance as TriathlonRaceDistance)
      : 'olympic';
  return {
    raceDistance,
    swimCssPer100:
      typeof ctx.swim_css_per_100 === 'string' ? ctx.swim_css_per_100 : '',
    bikeFtp: typeof ctx.bike_ftp === 'number' ? String(ctx.bike_ftp) : '',
    runThresholdPace:
      typeof ctx.run_threshold_pace === 'string'
        ? ctx.run_threshold_pace
        : '',
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

export function TriathlonCoachForm({ category }: TriathlonCoachFormProps) {
  const router = useRouter();
  const ctx = category.coach_context ?? {};
  const [snapshot, setSnapshot] = useState(() => buildInitial(category));
  const [raceDistance, setRaceDistance] = useState(snapshot.raceDistance);
  const [swimCssPer100, setSwimCssPer100] = useState(snapshot.swimCssPer100);
  const [bikeFtp, setBikeFtp] = useState(snapshot.bikeFtp);
  const [runThresholdPace, setRunThresholdPace] = useState(
    snapshot.runThresholdPace
  );
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
      raceDistance !== snapshot.raceDistance ||
      swimCssPer100 !== snapshot.swimCssPer100 ||
      bikeFtp !== snapshot.bikeFtp ||
      runThresholdPace !== snapshot.runThresholdPace ||
      phase !== snapshot.phase ||
      goalEventName !== snapshot.goalEventName ||
      goalEventDate !== snapshot.goalEventDate ||
      goalEventNotes !== snapshot.goalEventNotes ||
      goals !== snapshot.goals ||
      equipmentNotes !== snapshot.equipmentNotes ||
      injuryNotes !== snapshot.injuryNotes,
    [
      raceDistance,
      swimCssPer100,
      bikeFtp,
      runThresholdPace,
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

    const ftpNum = Number(bikeFtp);
    if (!swimCssPer100.trim()) {
      setError('Swim CSS is required for plan generation.');
      return;
    }
    if (!bikeFtp || Number.isNaN(ftpNum) || ftpNum <= 0) {
      setError('Bike FTP is required for plan generation.');
      return;
    }
    if (!runThresholdPace.trim()) {
      setError('Run threshold pace is required for plan generation.');
      return;
    }

    setLoading(true);
    try {
      const coach_context = {
        ...ctx,
        race_distance: raceDistance,
        swim_css_per_100: swimCssPer100.trim(),
        bike_ftp: ftpNum,
        run_threshold_pace: runThresholdPace.trim(),
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
        raceDistance,
        swimCssPer100,
        bikeFtp,
        runThresholdPace,
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
      <fieldset>
        <legend className="text-xs font-semibold text-ld-text-sub">
          Race distance
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {RACE_DISTANCES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setRaceDistance(d)}
              className={`rounded-[14px] border px-3 py-1.5 text-sm ${
                raceDistance === d ? chipSelected : chipIdle
              }`}
            >
              {formatRaceDistance(d)}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-xs font-semibold text-ld-text-sub">
          Swim CSS
        </span>
        <input
          type="text"
          required
          value={swimCssPer100}
          onChange={(e) => setSwimCssPer100(e.target.value)}
          placeholder="e.g. 1:45/100m"
          className={inputClassName}
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-ld-text-sub">
          Bike FTP (watts)
        </span>
        <input
          type="number"
          step="1"
          min="1"
          required
          value={bikeFtp}
          onChange={(e) => setBikeFtp(e.target.value)}
          className={inputClassName}
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-ld-text-sub">
          Run threshold pace
        </span>
        <input
          type="text"
          required
          value={runThresholdPace}
          onChange={(e) => setRunThresholdPace(e.target.value)}
          placeholder="e.g. 5:00/km"
          className={inputClassName}
        />
      </label>

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
          placeholder="e.g. Olympic triathlon"
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
