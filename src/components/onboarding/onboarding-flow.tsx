'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category, Profile } from '@/types';
import { AddCategoryFlow } from '@/components/categories/add-category-flow';
import { CategoryGlyph } from '@/components/categories/category-glyph';
import { normalizeCategoryIcon } from '@/lib/category-templates';
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

type OnboardingFlowProps = {
  displayName: string | null;
  allowCustomCategories: boolean;
  initialProfile: Profile | null;
};

type Step = 1 | 2 | 3;

export function OnboardingFlow({
  displayName,
  allowCustomCategories,
  initialProfile,
}: OnboardingFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addedCategories, setAddedCategories] = useState<Category[]>([]);

  const [currentWeight, setCurrentWeight] = useState(
    initialProfile?.current_weight_kg?.toString() ?? ''
  );
  const [goalWeight, setGoalWeight] = useState(
    initialProfile?.goal_weight_kg?.toString() ?? ''
  );
  const [height, setHeight] = useState(
    initialProfile?.height_cm?.toString() ?? ''
  );
  const [age, setAge] = useState(initialProfile?.age?.toString() ?? '');
  const [biologicalSex, setBiologicalSex] = useState<
    'male' | 'female' | ''
  >(initialProfile?.biological_sex ?? '');
  const [activityLevel, setActivityLevel] = useState<
    Profile['activity_level']
  >(initialProfile?.activity_level ?? 'moderate');
  const [targetRate, setTargetRate] = useState<number>(
    initialProfile?.target_rate_kg_per_week ?? 0.5
  );
  const [dietaryNotes, setDietaryNotes] = useState(
    initialProfile?.dietary_notes ?? ''
  );
  const [savedGoalWeight, setSavedGoalWeight] = useState<number | null>(
    initialProfile?.goal_weight_kg ?? null
  );
  const [savedDisplayName, setSavedDisplayName] = useState(displayName);

  async function handleAboutSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const current_weight_kg = Number(currentWeight);
    const goal_weight_kg = Number(goalWeight);
    const height_cm = Number(height);
    const ageNum = Number(age);

    if (
      !currentWeight ||
      !goalWeight ||
      !height ||
      !age ||
      !biologicalSex ||
      Number.isNaN(current_weight_kg) ||
      Number.isNaN(goal_weight_kg) ||
      Number.isNaN(height_cm) ||
      Number.isNaN(ageNum)
    ) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_weight_kg,
          goal_weight_kg,
          height_cm,
          age: ageNum,
          biological_sex: biologicalSex,
          activity_level: activityLevel,
          target_rate_kg_per_week: targetRate,
          dietary_notes: dietaryNotes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save profile');
        return;
      }
      setSavedGoalWeight(goal_weight_kg);
      if (data.profile?.display_name) {
        setSavedDisplayName(data.profile.display_name);
      }
      setStep(2);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleCategoryAdded(category: Category) {
    setAddedCategories((prev) => [...prev, category]);
  }

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          {([1, 2, 3] as const).map((n) => (
            <div key={n} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step === n
                    ? 'bg-white text-gray-950'
                    : step > n
                      ? 'bg-gray-600 text-white'
                      : 'border border-gray-600 text-gray-400'
                }`}
              >
                {n}
              </div>
              {n < 3 && (
                <div
                  className={`h-px w-8 ${
                    step > n ? 'bg-gray-500' : 'bg-gray-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {step === 1 && (
          <form onSubmit={handleAboutSubmit} className="space-y-5">
            <div>
              <h1 className="text-xl font-semibold">About you</h1>
              <p className="mt-1 text-sm text-gray-400">
                We use this to set calorie targets. Required to unlock the app.
              </p>
            </div>

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
            </label>

            <label className="block text-sm">
              <span className="text-gray-300">Goal weight (kg)</span>
              <input
                type="number"
                step="0.1"
                min="1"
                required
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
              <legend className="text-sm text-gray-300">
                Daily activity level
              </legend>
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

            <label className="block text-sm">
              <span className="text-gray-300">
                Dietary notes{' '}
                <span className="text-gray-500">(optional)</span>
              </span>
              <textarea
                rows={3}
                value={dietaryNotes}
                onChange={(e) => setDietaryNotes(e.target.value)}
                placeholder="Any food preferences, restrictions, or kitchen notes the meal-prep coach should know?"
                className={inputClassName}
              />
            </label>

            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-white px-4 py-2.5 text-sm font-medium text-gray-950 hover:bg-gray-200 disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Continue'}
            </button>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-semibold">Add your first category</h1>
              <p className="mt-1 text-sm text-gray-400">
                Pick activities to track. You can add more later in Settings.
              </p>
            </div>

            {addedCategories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {addedCategories.map((cat) => (
                  <span
                    key={cat.id}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-600 bg-gray-900 px-3 py-1.5 text-sm"
                  >
                    <CategoryGlyph
                      icon={normalizeCategoryIcon(cat.icon)}
                      color={cat.color}
                      size={16}
                    />
                    {cat.name}
                  </span>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="w-full rounded border border-gray-600 px-4 py-2.5 text-sm text-white hover:border-gray-400"
            >
              Add category
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 rounded border border-gray-600 px-4 py-2.5 text-sm text-gray-300 hover:border-gray-400"
              >
                Skip for now
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 rounded bg-white px-4 py-2.5 text-sm font-medium text-gray-950 hover:bg-gray-200"
              >
                Continue
              </button>
            </div>

            <AddCategoryFlow
              allowCustomCategories={allowCustomCategories}
              open={addOpen}
              onClose={() => setAddOpen(false)}
              onCategoryAdded={handleCategoryAdded}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 text-center">
            <div>
              <h1 className="text-xl font-semibold">You&apos;re set</h1>
              <p className="mt-1 text-sm text-gray-400">
                Here&apos;s a quick summary before you start.
              </p>
            </div>

            <dl className="space-y-3 rounded border border-gray-700 bg-gray-900 p-4 text-left text-sm">
              <div>
                <dt className="text-gray-500">Name</dt>
                <dd className="mt-0.5 text-white">
                  {savedDisplayName ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Goal weight</dt>
                <dd className="mt-0.5 text-white">
                  {savedGoalWeight != null ? `${savedGoalWeight} kg` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">First category</dt>
                <dd className="mt-0.5 text-white">
                  {addedCategories[0]?.name ?? 'None yet — add from Settings'}
                </dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={() => router.push('/week/current')}
              className="w-full rounded bg-white px-4 py-2.5 text-sm font-medium text-gray-950 hover:bg-gray-200"
            >
              Start my week
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
