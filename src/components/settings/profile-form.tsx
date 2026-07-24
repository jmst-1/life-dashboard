'use client';

import { FormEvent, useMemo, useState } from 'react';
import type { Profile } from '@/types';
import { weeklyDeficitKcal } from '@/lib/weekly-deficit';

const inputClassName =
  'mt-1 w-full rounded-xl border border-ld-border bg-ld-surface-high px-4 py-3 text-[15px] text-ld-text outline-none focus:border-ld-border-bright';

const chipSelected =
  'border-ld-orange bg-ld-orange/15 text-ld-text';
const chipIdle =
  'border-ld-border bg-ld-surface-high text-ld-text-sub hover:border-ld-border-bright';

const cardSelected =
  'border-ld-orange/60 bg-ld-orange/10';
const cardIdle =
  'border-ld-border bg-ld-surface-high hover:border-ld-border-bright';

const RATE_OPTIONS = [0.25, 0.5, 0.75, 1.0] as const;

const ACTIVITY_OPTIONS: {
  value: Profile['activity_level'];
  label: string;
  description: string;
}[] = [
  {
    value: 'sedentary',
    label: 'Sedentary',
    description: 'Desk job, little daily movement',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    description: 'On your feet some of the day, or light daily activity',
  },
  {
    value: 'active',
    label: 'Active',
    description: 'Physical job or lots of non-training movement',
  },
];

type ProfileSnapshot = {
  displayName: string;
  currentWeight: string;
  goalWeight: string;
  height: string;
  age: string;
  biologicalSex: 'male' | 'female' | '';
  activityLevel: Profile['activity_level'];
  targetRate: number;
  deficitStrategy: Profile['deficit_strategy'];
  tdeeOverride: string;
};

function snapshotFromProfile(profile: Profile): ProfileSnapshot {
  return {
    displayName: profile.display_name ?? '',
    currentWeight: profile.current_weight_kg?.toString() ?? '',
    goalWeight: profile.goal_weight_kg?.toString() ?? '',
    height: profile.height_cm?.toString() ?? '',
    age: profile.age?.toString() ?? '',
    biologicalSex: profile.biological_sex ?? '',
    activityLevel: profile.activity_level,
    targetRate: profile.target_rate_kg_per_week,
    deficitStrategy: profile.deficit_strategy,
    tdeeOverride: profile.tdee_override?.toString() ?? '',
  };
}

type ProfileFormProps = {
  profile: Profile;
};

export function ProfileForm({ profile }: ProfileFormProps) {
  const [snapshot, setSnapshot] = useState(() => snapshotFromProfile(profile));
  const [displayName, setDisplayName] = useState(snapshot.displayName);
  const [currentWeight, setCurrentWeight] = useState(snapshot.currentWeight);
  const [goalWeight, setGoalWeight] = useState(snapshot.goalWeight);
  const [height, setHeight] = useState(snapshot.height);
  const [age, setAge] = useState(snapshot.age);
  const [biologicalSex, setBiologicalSex] = useState(snapshot.biologicalSex);
  const [activityLevel, setActivityLevel] = useState(snapshot.activityLevel);
  const [targetRate, setTargetRate] = useState(snapshot.targetRate);
  const [deficitStrategy, setDeficitStrategy] = useState(
    snapshot.deficitStrategy
  );
  const [tdeeOverride, setTdeeOverride] = useState(snapshot.tdeeOverride);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = useMemo(() => {
    return (
      displayName !== snapshot.displayName ||
      currentWeight !== snapshot.currentWeight ||
      goalWeight !== snapshot.goalWeight ||
      height !== snapshot.height ||
      age !== snapshot.age ||
      biologicalSex !== snapshot.biologicalSex ||
      activityLevel !== snapshot.activityLevel ||
      targetRate !== snapshot.targetRate ||
      deficitStrategy !== snapshot.deficitStrategy ||
      tdeeOverride !== snapshot.tdeeOverride
    );
  }, [
    displayName,
    currentWeight,
    goalWeight,
    height,
    age,
    biologicalSex,
    activityLevel,
    targetRate,
    deficitStrategy,
    tdeeOverride,
    snapshot,
  ]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isDirty) return;
    setError(null);
    setLoading(true);

    const payload: Record<string, unknown> = {
      display_name: displayName.trim() || null,
      current_weight_kg: Number(currentWeight),
      goal_weight_kg: goalWeight ? Number(goalWeight) : null,
      height_cm: Number(height),
      age: Number(age),
      biological_sex: biologicalSex || null,
      activity_level: activityLevel,
      target_rate_kg_per_week: targetRate,
      deficit_strategy: deficitStrategy,
      tdee_override: tdeeOverride.trim() ? Number(tdeeOverride) : null,
    };

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save profile');
        return;
      }
      setSnapshot({
        displayName,
        currentWeight,
        goalWeight,
        height,
        age,
        biologicalSex,
        activityLevel,
        targetRate,
        deficitStrategy,
        tdeeOverride,
      });
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
          Display name
        </span>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className={inputClassName}
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-ld-text-sub">
          Current weight (kg)
        </span>
        <input
          type="number"
          step="0.1"
          min="1"
          required
          value={currentWeight}
          onChange={(e) => setCurrentWeight(e.target.value)}
          className={inputClassName}
        />
        <span className="mt-1 block text-[11px] text-ld-text-muted">
          Changing this also adds a weigh-in to your weight log.
        </span>
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-ld-text-sub">
          Goal weight (kg)
        </span>
        <input
          type="number"
          step="0.1"
          min="1"
          value={goalWeight}
          onChange={(e) => setGoalWeight(e.target.value)}
          className={inputClassName}
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-ld-text-sub">
          Height (cm)
        </span>
        <input
          type="number"
          step="1"
          min="1"
          required
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          className={inputClassName}
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-ld-text-sub">Age</span>
        <input
          type="number"
          step="1"
          min="1"
          required
          value={age}
          onChange={(e) => setAge(e.target.value)}
          className={inputClassName}
        />
      </label>

      <fieldset>
        <legend className="text-xs font-semibold text-ld-text-sub">
          Biological sex
        </legend>
        <p className="mt-1 text-[11px] text-ld-text-muted">
          Used only for BMR calculation (Mifflin-St Jeor).
        </p>
        <div className="mt-2 flex gap-2.5">
          {(['male', 'female'] as const).map((sex) => (
            <button
              key={sex}
              type="button"
              onClick={() => setBiologicalSex(sex)}
              className={`flex-1 rounded-[14px] border px-3 py-2.5 text-sm capitalize ${
                biologicalSex === sex ? chipSelected : chipIdle
              }`}
            >
              {sex}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-xs font-semibold text-ld-text-sub">
          Daily activity level
        </legend>
        <div className="mt-2 space-y-2">
          {ACTIVITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setActivityLevel(opt.value)}
              className={`w-full rounded-[14px] border px-3.5 py-3 text-left ${
                activityLevel === opt.value ? cardSelected : cardIdle
              }`}
            >
              <span className="block text-sm font-bold text-ld-text">
                {opt.label}
              </span>
              <span className="mt-0.5 block text-xs text-ld-text-sub">
                {opt.description}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-xs font-semibold text-ld-text-sub">
          Weight loss rate target
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {RATE_OPTIONS.map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => setTargetRate(rate)}
              className={`rounded-[14px] border px-3 py-2.5 text-sm ${
                targetRate === rate ? chipSelected : chipIdle
              }`}
            >
              {rate} kg / week
            </button>
          ))}
        </div>
        <p className="mt-2 text-[13px] text-ld-text-sub">
          Estimated weekly deficit:{' '}
          <span className="font-semibold text-ld-text">
            ~{weeklyDeficitKcal(targetRate).toLocaleString()} kcal
          </span>
        </p>
      </fieldset>

      <fieldset>
        <legend className="text-xs font-semibold text-ld-text-sub">
          Deficit strategy
        </legend>
        <div className="mt-2 space-y-2">
          <button
            type="button"
            onClick={() => setDeficitStrategy('cycling')}
            className={`w-full rounded-[14px] border px-3.5 py-3 text-left ${
              deficitStrategy === 'cycling' ? cardSelected : cardIdle
            }`}
          >
            <span className="block text-sm font-bold text-ld-text">
              Cycling deficit
            </span>
            <span className="mt-0.5 block text-xs text-ld-text-sub">
              Eat at maintenance on hard training days; apply the deficit on
              rest and moderate days.
            </span>
          </button>
          <button
            type="button"
            onClick={() => setDeficitStrategy('uniform')}
            className={`w-full rounded-[14px] border px-3.5 py-3 text-left ${
              deficitStrategy === 'uniform' ? cardSelected : cardIdle
            }`}
          >
            <span className="block text-sm font-bold text-ld-text">
              Uniform deficit
            </span>
            <span className="mt-0.5 block text-xs text-ld-text-sub">
              Same calorie target every day, regardless of training load.
            </span>
          </button>
        </div>
      </fieldset>

      <label className="block">
        <span className="text-xs font-semibold text-ld-text-sub">
          TDEE override (kcal){' '}
          <span className="font-normal text-ld-text-muted">(optional)</span>
        </span>
        <input
          type="number"
          step="1"
          min="1"
          value={tdeeOverride}
          onChange={(e) => setTdeeOverride(e.target.value)}
          placeholder="Leave blank to use Mifflin-St Jeor"
          className={inputClassName}
        />
        <span className="mt-1 block text-[11px] text-ld-text-muted">
          Override the calculated TDEE with your own estimate from a metabolic
          test or tracker. Leave blank to use Mifflin-St Jeor.
        </span>
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
        {loading ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  );
}
