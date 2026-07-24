'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { CategoryGlyph } from '@/components/categories/category-glyph';
import { Sheet } from '@/components/ui/sheet';
import { Toggle } from '@/components/ui/toggle';
import { getCategoryMode, modeLabel } from '@/lib/category-mode';
import type { Category, Week } from '@/types';

type PlanSheetProps = {
  week: Week;
  categories: Category[];
  currentWeightKg: number | null;
  onClose: () => void;
  onDone: () => void;
};

const STEPS = ['Context', 'Scope', 'Confirm'];

type CapHit = {
  categoryId: string;
  categoryName: string;
  message: string;
  used: number;
  cap: number;
};

export function PlanSheet({
  week,
  categories,
  currentWeightKg,
  onClose,
  onDone,
}: PlanSheetProps) {
  const [step, setStep] = useState(0);
  const [notes, setNotes] = useState(week.planning_notes ?? '');
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(categories.map((c) => [c.id, true]))
  );
  const [showWeighIn, setShowWeighIn] = useState(false);
  const [weighInValue, setWeighInValue] = useState(
    currentWeightKg != null ? String(currentWeightKg) : ''
  );
  const [weight, setWeight] = useState(currentWeightKg);
  const [savingWeighIn, setSavingWeighIn] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capHits, setCapHits] = useState<CapHit[]>([]);

  async function saveWeighIn() {
    const num = Number(weighInValue);
    if (Number.isNaN(num) || num <= 0) {
      setError('Enter a valid weight');
      return;
    }
    setSavingWeighIn(true);
    setError(null);
    try {
      const res = await fetch('/api/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight_kg: num,
          logged_date: new Date().toISOString().slice(0, 10),
        }),
      });
      if (res.ok) {
        setWeight(num);
        setShowWeighIn(false);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Failed to save weigh-in');
      }
    } catch {
      setError('Failed to save weigh-in');
    } finally {
      setSavingWeighIn(false);
    }
  }

  async function copyFromLastWeek(category: Category) {
    setCopyingId(category.id);
    setError(null);
    try {
      const res = await fetch('/api/plan/copy-from-last-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekId: week.id, categoryId: category.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? `Failed to copy ${category.name} plan`);
      }
      setCapHits((prev) => prev.filter((h) => h.categoryId !== category.id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to copy last week’s plan'
      );
    } finally {
      setCopyingId(null);
    }
  }

  async function generatePlans() {
    const selectedCategories = categories.filter((c) => selected[c.id]);
    if (selectedCategories.length === 0) {
      setError('Select at least one category to generate');
      return;
    }

    setGenerating(true);
    setError(null);
    setCapHits([]);
    try {
      const weekUpdate: Record<string, unknown> = {
        planning_notes: notes.trim() || null,
      };
      if (weight != null) weekUpdate.weight_kg_snapshot = weight;

      const weekRes = await fetch(`/api/weeks/${week.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(weekUpdate),
      });
      if (!weekRes.ok) {
        const data = await weekRes.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to save planning notes');
      }

      const aiCats = selectedCategories.filter(
        (c) => getCategoryMode(c) === 'ai'
      );
      const seededCats = selectedCategories.filter(
        (c) => getCategoryMode(c) === 'seeded'
      );
      const trackedCats = selectedCategories.filter(
        (c) => getCategoryMode(c) === 'tracked'
      );

      const hits: CapHit[] = [];
      let generatedCount = 0;

      // AI categories run sequentially — Strength prompts read the Cycling
      // schedule for hard-day coordination.
      const orderedAi = [
        ...aiCats.filter((c) => c.name === 'Cycling'),
        ...aiCats.filter((c) => c.name === 'Strength'),
        ...aiCats.filter((c) => c.name !== 'Cycling' && c.name !== 'Strength'),
      ];
      for (const category of orderedAi) {
        const res = await fetch('/api/plan/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weekId: week.id,
            categoryId: category.id,
            planningNotes: notes.trim() || null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 429 || data.error === 'cap_reached') {
          hits.push({
            categoryId: category.id,
            categoryName: category.name,
            message:
              data.message ??
              'AI limit reached this week. Resets Monday.',
            used: data.used ?? 0,
            cap: data.cap ?? 40,
          });
          continue;
        }
        if (!res.ok) {
          throw new Error(
            data.error ?? `Failed to generate ${category.name} plan`
          );
        }
        generatedCount += 1;
      }

      const seededResults = await Promise.all(
        seededCats.map((category) =>
          fetch('/api/plan/generate-movement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weekId: week.id, categoryId: category.id }),
          })
        )
      );
      for (const res of seededResults) {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? 'Failed to generate seeded sessions');
        }
        generatedCount += 1;
      }

      const trackedResults = await Promise.all(
        trackedCats.map((category) =>
          fetch('/api/plan/generate-tracked', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weekId: week.id, categoryId: category.id }),
          })
        )
      );
      for (const res of trackedResults) {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? 'Failed to generate tracked sessions');
        }
        generatedCount += 1;
      }

      if (selectedCategories.some((c) => c.affects_nutrition)) {
        const nutritionRes = await fetch('/api/nutrition/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weekId: week.id }),
        });
        if (!nutritionRes.ok) {
          const data = await nutritionRes.json().catch(() => ({}));
          if (nutritionRes.status === 429 || data.error === 'cap_reached') {
            // Nutrition brief skipped when capped; week can still activate.
          } else {
            throw new Error(data.error ?? 'Failed to generate nutrition plan');
          }
        }
      }

      if (generatedCount === 0 && hits.length === selectedCategories.length) {
        setCapHits(hits);
        setError(
          'No plans generated — AI cap reached for all selected categories. Copy from last week or try again Monday.'
        );
        return;
      }

      if (generatedCount === 0) {
        throw new Error('No plans were generated. Select at least one category.');
      }

      if (hits.length > 0) {
        setCapHits(hits);
        // Still activate so seeded/tracked/partial AI plans are usable.
      }

      const activateRes = await fetch(`/api/weeks/${week.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      if (!activateRes.ok) {
        const data = await activateRes.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to activate week');
      }

      if (hits.length === 0) {
        setDone(true);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setGenerating(false);
    }
  }

  if (done) {
    return (
      <Sheet onClose={onDone}>
        <div className="px-0 pb-2 pt-5 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-ld-green bg-ld-green-dim">
            <Check size={28} className="text-ld-green" />
          </div>
          <div className="mb-2 text-[18px] font-extrabold text-ld-text">
            Week plan ready
          </div>
          <div className="mb-7 text-[13px] leading-relaxed text-ld-text-sub">
            Sessions plotted. Tap any day to view or reorder.
          </div>
          <button
            type="button"
            onClick={onDone}
            className="w-full rounded-2xl bg-ld-orange py-4 text-[15px] font-extrabold text-white"
          >
            View week →
          </button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose}>
      <div className="mb-[22px] flex gap-1.5 pt-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1">
            <div
              className="mb-1.5 h-[3px] rounded-sm transition-colors"
              style={{
                background:
                  i <= step ? 'var(--ld-orange)' : 'var(--ld-border)',
              }}
            />
            <span
              className={`text-[9px] font-bold tracking-wide ${
                i === step ? 'text-ld-orange' : 'text-ld-text-muted'
              }`}
            >
              {label.toUpperCase()}
            </span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div>
          <div className="mb-1 text-[18px] font-extrabold text-ld-text">
            Plan week of {week.week_start}
          </div>
          <p className="mb-4 text-[13px] leading-relaxed text-ld-text-sub">
            What should your coaches know? Travel, illness, race — leave
            blank for a normal week.
          </p>
          <div className="mb-4 flex items-center justify-between rounded-xl border border-ld-border bg-ld-surface-high px-4 py-3">
            <div>
              <div className="text-[11px] text-ld-text-muted">
                Current weight
              </div>
              <div className="text-[20px] font-extrabold text-ld-text">
                {weight != null ? `${weight} kg` : '—'}
              </div>
            </div>
            {!showWeighIn ? (
              <button
                type="button"
                onClick={() => setShowWeighIn(true)}
                className="rounded-lg border border-ld-border px-3.5 py-2 text-[12px] text-ld-text-sub"
              >
                Log weigh-in
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  value={weighInValue}
                  onChange={(e) => setWeighInValue(e.target.value)}
                  className="w-20 rounded-lg border border-ld-border bg-ld-surface-pop px-2 py-1.5 text-[13px] text-ld-text outline-none"
                />
                <button
                  type="button"
                  disabled={savingWeighIn}
                  onClick={() => void saveWeighIn()}
                  className="rounded-lg bg-ld-orange px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-60"
                >
                  Save
                </button>
              </div>
            )}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Flying to KL on Friday…"
            rows={4}
            className="mb-4 w-full resize-none rounded-xl border border-ld-border bg-ld-surface-high p-3.5 text-[13px] leading-relaxed text-ld-text outline-none"
          />
          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full rounded-2xl bg-ld-orange py-4 text-[15px] font-extrabold text-white"
          >
            Next →
          </button>
        </div>
      )}

      {step === 1 && (
        <div>
          <div className="mb-1.5 text-[18px] font-extrabold text-ld-text">
            Which categories this week?
          </div>
          <p className="mb-4 text-[13px] leading-relaxed text-ld-text-sub">
            Turn off anything you&apos;re skipping.
          </p>
          <div className="mb-5 flex flex-col gap-2.5">
            {categories.map((category) => {
              const on = !!selected[category.id];
              return (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-xl border px-4 py-3.5"
                  style={{
                    background: on
                      ? `${category.color_dim ?? category.color}55`
                      : 'var(--ld-surface-high)',
                    borderColor: on
                      ? `${category.color}44`
                      : 'var(--ld-border)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px]"
                      style={{
                        background: on
                          ? category.color_dim ?? `${category.color}18`
                          : 'var(--ld-border)',
                      }}
                    >
                      <CategoryGlyph
                        icon={category.icon}
                        color={on ? category.color : 'var(--ld-text-muted)'}
                        size={14}
                      />
                    </div>
                    <div>
                      <div
                        className={`text-[14px] font-bold ${
                          on ? 'text-ld-text' : 'text-ld-text-sub'
                        }`}
                      >
                        {category.name}
                      </div>
                      <div className="text-[10px] text-ld-text-muted">
                        {modeLabel(getCategoryMode(category))}
                      </div>
                    </div>
                  </div>
                  <Toggle
                    on={on}
                    onChange={(next) =>
                      setSelected((prev) => ({ ...prev, [category.id]: next }))
                    }
                  />
                </div>
              );
            })}
            {categories.length === 0 && (
              <p className="text-[13px] text-ld-text-sub">
                No active categories yet. Add one from Settings first.
              </p>
            )}
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="flex-1 rounded-2xl border border-ld-border py-3.5 text-[14px] text-ld-text-sub"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-[2] rounded-2xl bg-ld-orange py-3.5 text-[15px] font-extrabold text-white"
            >
              Review →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="mb-1.5 text-[18px] font-extrabold text-ld-text">
            Ready to generate
          </div>
          <p className="mb-4 text-[13px] leading-relaxed text-ld-text-sub">
            Your coaches will plan this week across these categories.
          </p>
          <div className="mb-4 flex flex-col gap-2.5">
            {categories
              .filter((c) => selected[c.id])
              .map((category) => (
                <div
                  key={category.id}
                  className="flex items-center gap-3 rounded-xl border border-ld-border bg-ld-surface-high px-4 py-3"
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{
                      background: category.color_dim ?? `${category.color}18`,
                    }}
                  >
                    <CategoryGlyph icon={category.icon} color={category.color} size={14} />
                  </div>
                  <div className="flex-1">
                    <div className="text-[14px] font-bold text-ld-text">
                      {category.name}
                    </div>
                    <div className="text-[11px] text-ld-text-muted">
                      {modeLabel(getCategoryMode(category))}
                    </div>
                  </div>
                  <Check size={14} className="text-ld-green" />
                </div>
              ))}
            {categories.filter((c) => selected[c.id]).length === 0 && (
              <p className="text-[13px] text-ld-text-sub">
                No categories selected.
              </p>
            )}
          </div>

          {error && (
            <p className="mb-3 text-[12px] text-ld-red" role="alert">
              {error}
            </p>
          )}

          {capHits.length > 0 && (
            <div className="mb-4 flex flex-col gap-2.5">
              {capHits.map((hit) => {
                const category = categories.find((c) => c.id === hit.categoryId);
                return (
                  <div
                    key={hit.categoryId}
                    className="rounded-xl border border-ld-amber/40 bg-ld-amber-dim px-4 py-3"
                  >
                    <div className="text-[13px] font-bold text-ld-amber">
                      {hit.categoryName} — AI limit reached
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-ld-text-sub">
                      {hit.message} ({hit.used}/{hit.cap})
                    </p>
                    {category && (
                      <button
                        type="button"
                        disabled={copyingId === category.id}
                        onClick={() => void copyFromLastWeek(category)}
                        className="mt-2.5 rounded-lg border border-ld-border bg-ld-surface px-3 py-2 text-[12px] font-bold text-ld-text disabled:opacity-60"
                      >
                        {copyingId === category.id
                          ? 'Copying…'
                          : 'Use last week’s plan'}
                      </button>
                    )}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={onDone}
                className="w-full rounded-2xl bg-ld-orange py-3.5 text-[15px] font-extrabold text-white"
              >
                Continue to week →
              </button>
            </div>
          )}

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={generating}
              className="flex-1 rounded-2xl border border-ld-border py-3.5 text-[14px] text-ld-text-sub disabled:opacity-50"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => void generatePlans()}
              disabled={
                generating ||
                categories.filter((c) => selected[c.id]).length === 0
              }
              className="flex-[2] rounded-2xl py-3.5 text-[15px] font-extrabold text-white disabled:opacity-80"
              style={{
                background: generating
                  ? 'var(--ld-orange-mid)'
                  : 'var(--ld-orange)',
              }}
            >
              {generating ? 'Generating…' : 'Generate Plans'}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
