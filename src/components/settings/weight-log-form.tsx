'use client';

import { FormEvent, useState } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import type { WeightLog } from '@/types';

const inputClassName =
  'mt-1 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-gray-500';

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
        <h2 className="text-sm font-medium text-gray-300">Log weigh-in</h2>

        <label className="block text-sm">
          <span className="text-gray-400">Date</span>
          <input
            type="date"
            required
            value={loggedDate}
            onChange={(e) => setLoggedDate(e.target.value)}
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
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={inputClassName}
          />
        </label>

        <label className="block text-sm">
          <span className="text-gray-400">
            Notes <span className="text-gray-500">(optional)</span>
          </span>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
          {loading ? 'Saving…' : 'Log weigh-in'}
        </button>
      </form>

      <div>
        <h2 className="text-sm font-medium text-gray-300">History</h2>
        {logs.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No weigh-ins yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-800 rounded border border-gray-700">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex items-start justify-between gap-4 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-white">
                    {log.weight_kg} kg
                  </p>
                  {log.notes && (
                    <p className="mt-0.5 text-xs text-gray-400">{log.notes}</p>
                  )}
                </div>
                <time className="shrink-0 text-xs text-gray-500">
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
