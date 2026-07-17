'use client';

import { FormEvent, useState } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { CategoryGlyph } from '@/components/categories/category-glyph';
import type { Category, Week } from '@/types';

const inputClassName =
  'mt-1 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-gray-500';

type PlanningWizardProps = {
  week: Week;
  currentWeightKg: number | null;
  categories: Category[];
};

export function PlanningWizard({
  week,
  currentWeightKg,
  categories,
}: PlanningWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [planningNotes, setPlanningNotes] = useState(
    week.planning_notes ?? ''
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<
    Record<string, boolean>
  >(() =>
    Object.fromEntries(categories.map((category) => [category.id, true]))
  );
  const [displayWeight, setDisplayWeight] = useState(currentWeightKg);
  const [showWeighIn, setShowWeighIn] = useState(false);
  const [weighInDate, setWeighInDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [weighInWeight, setWeighInWeight] = useState('');
  const [weighInLoading, setWeighInLoading] = useState(false);
  const [weighInError, setWeighInError] = useState<string | null>(null);
  const [nextLoading, setNextLoading] = useState(false);
  const [nextError, setNextError] = useState<string | null>(null);

  function toggleCategory(id: string) {
    setSelectedCategoryIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  async function handleWeighIn(e: FormEvent) {
    e.preventDefault();
    setWeighInError(null);
    setWeighInLoading(true);

    try {
      const weightKg = Number(weighInWeight);
      const res = await fetch('/api/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight_kg: weightKg,
          logged_date: weighInDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWeighInError(data.error ?? 'Failed to log weight');
        return;
      }
      setDisplayWeight(weightKg);
      setWeighInWeight('');
      setShowWeighIn(false);
      router.refresh();
    } catch {
      setWeighInError('Something went wrong. Please try again.');
    } finally {
      setWeighInLoading(false);
    }
  }

  async function handleNextGeneratePlans() {
    setNextError(null);
    setNextLoading(true);

    try {
      const res = await fetch(`/api/weeks/${week.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planning_notes: planningNotes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNextError(data.error ?? 'Failed to save planning notes');
        return;
      }
      setStep(2);
    } catch {
      setNextError('Something went wrong. Please try again.');
    } finally {
      setNextLoading(false);
    }
  }

  const step1 = (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Step 1 — Context
        </p>
        <h2 className="mt-1 text-lg font-semibold text-white">
          What should your coaches know this week?
        </h2>
      </div>

      <label className="block text-sm">
        <span className="sr-only">Planning notes</span>
        <textarea
          value={planningNotes}
          onChange={(e) => setPlanningNotes(e.target.value)}
          rows={5}
          placeholder="Travel, illness, race, schedule constraints…"
          className={inputClassName}
        />
      </label>

      <div className="text-sm text-gray-300">
        <p>
          Current weight:{' '}
          <span className="font-medium text-white">
            {displayWeight != null ? `${displayWeight} kg` : 'Not set'}
          </span>
        </p>
        {!showWeighIn ? (
          <button
            type="button"
            onClick={() => setShowWeighIn(true)}
            className="mt-1 text-sm text-gray-400 underline underline-offset-2 hover:text-white"
          >
            Log a weigh-in
          </button>
        ) : (
          <form onSubmit={handleWeighIn} className="mt-3 space-y-3">
            <label className="block text-sm">
              <span className="text-gray-400">Date</span>
              <input
                type="date"
                required
                value={weighInDate}
                onChange={(e) => setWeighInDate(e.target.value)}
                className={inputClassName}
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-400">Weight (kg)</span>
              <input
                type="number"
                step="0.1"
                min="1"
                required
                value={weighInWeight}
                onChange={(e) => setWeighInWeight(e.target.value)}
                className={inputClassName}
              />
            </label>
            {weighInError && (
              <p className="text-sm text-red-400" role="alert">
                {weighInError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={weighInLoading}
                className="rounded bg-white px-3 py-2 text-sm font-medium text-gray-950 hover:bg-gray-200 disabled:opacity-50"
              >
                {weighInLoading ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowWeighIn(false);
                  setWeighInError(null);
                }}
                className="rounded border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:border-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );

  const step2 = (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Step 2 — Scope
        </p>
        <h2 className="mt-1 text-lg font-semibold text-white">
          Which categories are you training this week?
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Turn off any category you&apos;re skipping this week — travel,
          illness, or just a planned rest. This doesn&apos;t affect future
          weeks.
        </p>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-gray-500">
          No active categories. Add some in Settings first.
        </p>
      ) : (
        <ul className="space-y-2">
          {categories.map((category) => {
            const on = selectedCategoryIds[category.id] !== false;
            return (
              <li
                key={category.id}
                className="flex items-center gap-3 rounded border border-gray-700 bg-gray-900 px-4 py-3"
              >
                <CategoryGlyph
                  icon={category.icon}
                  color={category.color}
                  size={22}
                  aria-label={`${category.name} icon`}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                  {category.name}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`Include ${category.name} this week`}
                  onClick={() => toggleCategory(category.id)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    on ? 'bg-white' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full transition-transform ${
                      on
                        ? 'translate-x-5 bg-gray-950'
                        : 'translate-x-0 bg-gray-400'
                    }`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {nextError && (
        <p className="text-sm text-red-400" role="alert">
          {nextError}
        </p>
      )}

      <button
        type="button"
        onClick={handleNextGeneratePlans}
        disabled={nextLoading}
        className="w-full rounded bg-white px-4 py-2.5 text-sm font-medium text-gray-950 hover:bg-gray-200 disabled:opacity-50"
      >
        {nextLoading ? 'Saving…' : 'Next: Generate Plans'}
      </button>
    </section>
  );

  const step3 = (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Step 3 — Generate Plans
        </p>
        <h2 className="mt-1 text-lg font-semibold text-white">
          Generating plans…
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Plan generation comes next. Your notes are saved
          {Object.values(selectedCategoryIds).some((v) => v === false)
            ? ' and category scope is ready'
            : ''}
          .
        </p>
      </div>
    </section>
  );

  return (
    <div className="space-y-10">
      {/* Desktop: all completed steps visible; Step 3 only after advance */}
      <div className="hidden space-y-10 md:block">
        {step1}
        {step2}
        {step >= 2 && step3}
      </div>

      {/* Mobile: one step at a time */}
      <div className="md:hidden">
        {step === 0 && (
          <div className="space-y-6">
            {step1}
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full rounded bg-white px-4 py-2.5 text-sm font-medium text-gray-950 hover:bg-gray-200"
            >
              Next
            </button>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-6">
            {step2}
            <button
              type="button"
              onClick={() => setStep(0)}
              className="w-full rounded border border-gray-700 px-4 py-2.5 text-sm text-gray-300 hover:border-gray-500"
            >
              Back
            </button>
          </div>
        )}
        {step >= 2 && step3}
      </div>
    </div>
  );
}
