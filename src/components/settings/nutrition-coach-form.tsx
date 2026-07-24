'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Profile } from '@/types';

const inputClassName =
  'mt-1 w-full rounded-xl border border-ld-border bg-ld-surface-high px-4 py-3 text-[15px] text-ld-text outline-none focus:border-ld-border-bright';

type NutritionCoachFormProps = {
  profile: Profile;
};

export function NutritionCoachForm({ profile }: NutritionCoachFormProps) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(profile.dietary_notes ?? '');
  const [dietaryNotes, setDietaryNotes] = useState(snapshot);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = useMemo(
    () => dietaryNotes !== snapshot,
    [dietaryNotes, snapshot]
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isDirty) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dietary_notes: dietaryNotes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save');
        return;
      }
      setSnapshot(dietaryNotes);
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
          Dietary notes
        </span>
        <textarea
          rows={5}
          value={dietaryNotes}
          onChange={(e) => setDietaryNotes(e.target.value)}
          placeholder="Allergies, restrictions, cuisine prefs, kitchen setup…"
          className={inputClassName}
        />
        <span className="mt-1 block text-[11px] text-ld-text-muted">
          Used when generating your weekly meal-prep brief. Calories and macros
          are calculated separately from Profile.
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
        {loading ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}
