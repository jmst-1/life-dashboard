'use client';

import { differenceInCalendarWeeks, format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { GoalEvent } from '@/types';

const EVENT_TYPES: GoalEvent['event_type'][] = [
  'cycling',
  'duathlon',
  'triathlon',
  'run',
  'other',
];

type GoalEventsManagerProps = {
  initialEvents: GoalEvent[];
};

type FormState = {
  label: string;
  event_date: string;
  event_type: GoalEvent['event_type'];
  distancesText: string;
};

const emptyForm = (): FormState => ({
  label: '',
  event_date: new Date().toISOString().slice(0, 10),
  event_type: 'other',
  distancesText: '',
});

function parseDistances(text: string): string[] {
  return text
    .split(/[,·\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function GoalEventsManager({ initialEvents }: GoalEventsManagerProps) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Date();

  function startEdit(ev: GoalEvent) {
    setEditingId(ev.id);
    setForm({
      label: ev.label,
      event_date: ev.event_date,
      event_type: ev.event_type,
      distancesText: (ev.distances ?? []).join(', '),
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      label: form.label.trim(),
      event_date: form.event_date,
      event_type: form.event_type,
      distances: parseDistances(form.distancesText),
    };

    try {
      if (editingId) {
        const res = await fetch(`/api/goal-events/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? 'Failed to update');
        setEvents((prev) =>
          prev
            .map((ev) => (ev.id === editingId ? data.event : ev))
            .sort((a, b) => a.event_date.localeCompare(b.event_date))
        );
        cancelEdit();
      } else {
        const res = await fetch('/api/goal-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? 'Failed to create');
        setEvents((prev) =>
          [...prev, data.event as GoalEvent].sort((a, b) =>
            a.event_date.localeCompare(b.event_date)
          )
        );
        setForm(emptyForm());
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this goal event?')) return;
    setError(null);
    const res = await fetch(`/api/goal-events/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? 'Failed to delete');
      return;
    }
    setEvents((prev) => prev.filter((ev) => ev.id !== id));
    if (editingId === id) cancelEdit();
    router.refresh();
  }

  return (
    <div className="mt-6">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="rounded-2xl border border-ld-border bg-ld-surface p-4"
      >
        <div className="mb-3 text-[13px] font-bold text-ld-text">
          {editingId ? 'Edit goal event' : 'Add goal event'}
        </div>
        <label className="mb-3 block">
          <span className="mb-1 block text-[11px] text-ld-text-muted">Label</span>
          <input
            required
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            className="w-full rounded-xl border border-ld-border bg-ld-surface-high px-3 py-2.5 text-[14px] text-ld-text outline-none"
            placeholder="e.g. Ironman 70.3"
          />
        </label>
        <div className="mb-3 grid grid-cols-2 gap-2.5">
          <label className="block">
            <span className="mb-1 block text-[11px] text-ld-text-muted">Date</span>
            <input
              type="date"
              required
              value={form.event_date}
              onChange={(e) =>
                setForm((f) => ({ ...f, event_date: e.target.value }))
              }
              className="w-full rounded-xl border border-ld-border bg-ld-surface-high px-3 py-2.5 text-[14px] text-ld-text outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-ld-text-muted">Type</span>
            <select
              value={form.event_type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  event_type: e.target.value as GoalEvent['event_type'],
                }))
              }
              className="w-full rounded-xl border border-ld-border bg-ld-surface-high px-3 py-2.5 text-[14px] text-ld-text outline-none"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mb-3 block">
          <span className="mb-1 block text-[11px] text-ld-text-muted">
            Distances (comma-separated)
          </span>
          <input
            value={form.distancesText}
            onChange={(e) =>
              setForm((f) => ({ ...f, distancesText: e.target.value }))
            }
            className="w-full rounded-xl border border-ld-border bg-ld-surface-high px-3 py-2.5 text-[14px] text-ld-text outline-none"
            placeholder="1.9km swim, 90km bike, 21.1km run"
          />
        </label>
        {error && (
          <p className="mb-2 text-[12px] text-ld-red" role="alert">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="flex-1 rounded-xl border border-ld-border py-2.5 text-[13px] text-ld-text-sub"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex-[2] rounded-xl bg-ld-orange py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add event'}
          </button>
        </div>
      </form>

      <div className="mt-5 flex flex-col gap-3">
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ld-border bg-ld-surface p-6 text-center text-sm text-ld-text-sub">
            No goal events yet. Add a race or target above — it will appear on
            Ahead.
          </div>
        ) : (
          events.map((ev) => {
            const weeksOut = differenceInCalendarWeeks(
              parseISO(ev.event_date),
              today,
              { weekStartsOn: 1 }
            );
            return (
              <div
                key={ev.id}
                className="rounded-2xl border border-ld-amber/30 bg-ld-amber-dim px-4 py-4"
              >
                <div className="text-sm font-bold text-ld-amber">{ev.label}</div>
                <div className="mt-1 text-xs text-ld-text-sub">
                  {format(parseISO(ev.event_date), 'MMM d, yyyy')}
                  {weeksOut >= 0 ? ` · ${weeksOut} weeks out` : ' · past'}
                  {` · ${ev.event_type}`}
                </div>
                {ev.distances?.length > 0 && (
                  <div className="mt-2 text-[11px] text-ld-text-muted">
                    {ev.distances.join(' · ')}
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(ev)}
                    className="rounded-lg border border-ld-border bg-ld-surface px-3 py-1.5 text-[11px] font-bold text-ld-text"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(ev.id)}
                    className="rounded-lg border border-ld-border bg-ld-surface px-3 py-1.5 text-[11px] font-bold text-ld-red"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
