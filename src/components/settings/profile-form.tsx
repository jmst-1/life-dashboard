'use client';

import { FormEvent, useState } from 'react';
import type { Profile } from '@/types';
import { weeklyDeficitKcal } from '@/lib/weekly-deficit';

const inputClassName =
  'mt-1 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-gray-500';

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

type ProfileFormProps = {
  profile: Profile;
};

export function ProfileForm({ profile }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? '');
  const [currentWeight, setCurrentWeight] = useState(
    profile.current_weight_kg?.toString() ?? ''
  );
  const [goalWeight, setGoalWeight] = useState(
    profile.goal_weight_kg?.toString() ?? ''
  );
  const [height, setHeight] = useState(profile.height_cm?.toString() ?? '');
  const [age, setAge] = useState(profile.age?.toString() ?? '');
  const [biologicalSex, setBiologicalSex] = useState<
    'male' | 'female' | ''
  >(profile.biological_sex ?? '');
  const [activityLevel, setActivityLevel] = useState<
    Profile['activity_level']
  >(profile.activity_level);
  const [targetRate, setTargetRate] = useState(
    profile.target_rate_kg_per_week
  );
  const [deficitStrategy, setDeficitStrategy] = useState<
    Profile['deficit_strategy']
  >(profile.deficit_strategy);
  const [tdeeOverride, setTdeeOverride] = useState(
    profile.tdee_override?.toString() ?? ''
  );
  const [dietaryNotes, setDietaryNotes] = useState(
    profile.dietary_notes ?? ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
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
      dietary_notes: dietaryNotes.trim() || null,
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
      setSuccess(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="block text-sm">
        <span className="text-gray-300">Display name</span>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className={inputClassName}
        />
      </label>

      <label className="block text-sm">
        <span className="text-gray-300">Current weight (kg)</span>
        <input
          type="number"
          step="0.1"
          min="1"
          required
          value={currentWeight}
          onChange={(e) => setCurrentWeight(e.target.value)}
          className={inputClassName}
        />
        <span className="mt-1 block text-xs text-gray-500">
          Changing this also adds a weigh-in to your weight log.
        </span>
      </label>

      <label className="block text-sm">
        <span className="text-gray-300">Goal weight (kg)</span>
        <input
          type="number"
          step="0.1"
          min="1"
          value={goalWeight}
          onChange={(e) => setGoalWeight(e.target.value)}
          className={inputClassName}
        />
      </label>

      <label className="block text-sm">
        <span className="text-gray-300">Height (cm)</span>
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

      <label className="block text-sm">
        <span className="text-gray-300">Age</span>
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
        <legend className="text-sm text-gray-300">Biological sex</legend>
        <p className="mt-1 text-xs text-gray-500">
          Used only for BMR calculation (Mifflin-St Jeor).
        </p>
        <div className="mt-2 flex gap-3">
          {(['male', 'female'] as const).map((sex) => (
            <button
              key={sex}
              type="button"
              onClick={() => setBiologicalSex(sex)}
              className={`flex-1 rounded border px-3 py-2 text-sm capitalize ${
                biologicalSex === sex
                  ? 'border-white bg-gray-800 text-white'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {sex}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm text-gray-300">Daily activity level</legend>
        <div className="mt-2 space-y-2">
          {ACTIVITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setActivityLevel(opt.value)}
              className={`w-full rounded border px-3 py-2.5 text-left ${
                activityLevel === opt.value
                  ? 'border-white bg-gray-800'
                  : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              <span className="block text-sm font-medium text-white">
                {opt.label}
              </span>
              <span className="mt-0.5 block text-xs text-gray-400">
                {opt.description}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm text-gray-300">
          Weight loss rate target
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {RATE_OPTIONS.map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => setTargetRate(rate)}
              className={`rounded border px-3 py-2 text-sm ${
                targetRate === rate
                  ? 'border-white bg-gray-800 text-white'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {rate} kg / week
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Estimated weekly deficit:{' '}
          <span className="text-gray-300">
            ~{weeklyDeficitKcal(targetRate).toLocaleString()} kcal
          </span>
        </p>
      </fieldset>

      <fieldset>
        <legend className="text-sm text-gray-300">Deficit strategy</legend>
        <div className="mt-2 space-y-2">
          <button
            type="button"
            onClick={() => setDeficitStrategy('cycling')}
            className={`w-full rounded border px-3 py-2.5 text-left ${
              deficitStrategy === 'cycling'
                ? 'border-white bg-gray-800'
                : 'border-gray-700 hover:border-gray-500'
            }`}
          >
            <span className="block text-sm font-medium text-white">
              Cycling deficit
            </span>
            <span className="mt-0.5 block text-xs text-gray-400">
              Eat at maintenance on hard training days; apply the deficit on
              rest and moderate days.
            </span>
          </button>
          <button
            type="button"
            onClick={() => setDeficitStrategy('uniform')}
            className={`w-full rounded border px-3 py-2.5 text-left ${
              deficitStrategy === 'uniform'
                ? 'border-white bg-gray-800'
                : 'border-gray-700 hover:border-gray-500'
            }`}
          >
            <span className="block text-sm font-medium text-white">
              Uniform deficit
            </span>
            <span className="mt-0.5 block text-xs text-gray-400">
              Same calorie target every day, regardless of training load.
            </span>
          </button>
        </div>
      </fieldset>

      <label className="block text-sm">
        <span className="text-gray-300">
          TDEE override (kcal){' '}
          <span className="text-gray-500">(optional)</span>
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
        <span className="mt-1 block text-xs text-gray-500">
          Override the calculated TDEE with your own estimate from a metabolic
          test or tracker. Leave blank to use Mifflin-St Jeor.
        </span>
      </label>

      <label className="block text-sm">
        <span className="text-gray-300">Dietary notes</span>
        <textarea
          rows={3}
          value={dietaryNotes}
          onChange={(e) => setDietaryNotes(e.target.value)}
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
          Profile saved.
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-white px-4 py-2.5 text-sm font-medium text-gray-950 hover:bg-gray-200 disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  );
}
