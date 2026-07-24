'use client';

import { FormEvent, useState } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import type { WeightLog } from '@/types';

const inputClassName =
  'mt-1 w-full rounded-xl border border-ld-border bg-ld-surface-high px-4 py-3 text-[15px] text-ld-text outline-none focus:border-ld-border-bright';

type WeightLogFormProps = {
  logs: WeightLog[];
};

export function WeightLogForm({ logs }: WeightLogFormProps) {
  const router = useRouter();
  const [loggedDate, setLoggedDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight_kg: Number(weight),
          logged_date: loggedDate,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to log weight');
        return;
      }
      setWeight('');
      setNotes('');
      setLoggedDate(format(new Date(), 'yyyy-MM-dd'));
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-[11px] font-bold tracking-wider text-ld-text-muted">
          LOG WEIGH-IN
        </h2>

        <label className="block">
          <span className="text-xs font-semibold text-ld-text-sub">Date</span>
          <input
            type="date"
            required
            value={loggedDate}
            onChange={(e) => setLoggedDate(e.target.value)}
            className={inputClassName}
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-ld-text-sub">
            Weight (kg)
          </span>
          <input
            type="number"
            step="0.1"
            min="1"
            required
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={inputClassName}
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-ld-text-sub">
            Notes{' '}
            <span className="font-normal text-ld-text-muted">(optional)</span>
          </span>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
          disabled={loading}
          className="w-full rounded-[14px] bg-ld-orange py-3.5 text-[15px] font-extrabold text-white disabled:opacity-60"
        >
          {loading ? 'Saving…' : 'Log weigh-in'}
        </button>
      </form>

      <div>
        <h2 className="text-[11px] font-bold tracking-wider text-ld-text-muted">
          HISTORY
        </h2>
        {logs.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-ld-border bg-ld-surface p-6 text-center text-sm text-ld-text-sub">
            No weigh-ins yet.
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex items-start justify-between gap-4 rounded-[14px] border border-ld-border bg-ld-surface px-4 py-3"
              >
                <div>
                  <p className="text-sm font-bold text-ld-text">
                    {log.weight_kg} kg
                  </p>
                  {log.notes && (
                    <p className="mt-0.5 text-xs text-ld-text-sub">
                      {log.notes}
                    </p>
                  )}
                </div>
                <time className="shrink-0 text-[11px] text-ld-text-muted">
                  {log.logged_date}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
