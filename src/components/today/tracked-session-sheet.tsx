'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { CategoryGlyph } from '@/components/categories/category-glyph';
import { Divider } from '@/components/ui/divider';
import { Sheet } from '@/components/ui/sheet';
import { TimerWidget } from '@/components/ui/timer-widget';
import { fmtElapsed } from '@/hooks/use-timer';
import { isTimedSession } from '@/lib/category-mode';
import type { Category, Session } from '@/types';

type TrackedSessionSheetProps = {
  session: Session;
  category: Category;
  onClose: () => void;
  onSaved: (session: Session) => void;
  readOnly?: boolean;
};

export function TrackedSessionSheet({
  session,
  category,
  onClose,
  onSaved,
  readOnly = false,
}: TrackedSessionSheetProps) {
  const template = category.task_template ?? [];
  const [ticked, setTicked] = useState<Set<string>>(
    new Set(session.tasks_done ?? [])
  );
  const [notes, setNotes] = useState(session.execution_notes ?? '');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [timedDuration, setTimedDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const showTimer = isTimedSession(category) && !readOnly;

  function toggle(id: string) {
    if (readOnly) return;
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const pct =
    template.length > 0
      ? Math.round((ticked.size / template.length) * 100)
      : 0;
  const canLog = ticked.size > 0 || template.length === 0;

  async function handleLog() {
    if (readOnly || !canLog || saving) return;
    setSaving(true);
    setError(null);
    try {
      const actualDurationMin =
        timedDuration > 0
          ? Math.round(timedDuration / 60)
          : session.planned_duration_min ?? 0;

      const res = await fetch(`/api/sessions/${session.id}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actual_duration_min: actualDurationMin,
          completed: true,
          skipped: false,
          tasks_done: Array.from(ticked),
          timed_duration_sec: timedDuration > 0 ? timedDuration : null,
          execution_notes: notes.trim() || null,
        }),
      });
      const json = (await res.json()) as { session?: Session; error?: string };
      if (!res.ok || !json.session) {
        setError(json.error ?? 'Failed to log session');
        setSaving(false);
        return;
      }
      onSaved(json.session);
      setSaved(true);
    } catch {
      setError('Failed to log session');
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <Sheet onClose={onClose}>
        <div className="px-0 pb-2 pt-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-ld-green bg-ld-green-dim">
            <Check size={28} className="text-ld-green" />
          </div>
          <div className="mb-1.5 text-[18px] font-extrabold text-ld-text">
            Session logged
          </div>
          <div className="mb-7 text-[13px] text-ld-text-sub">
            {ticked.size}/{template.length} tasks
            {timedDuration > 0 ? ` · ${fmtElapsed(timedDuration)}` : ''}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: category.color }}
            className="w-full rounded-2xl py-4 text-[15px] font-extrabold text-white"
          >
            Done
          </button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose} maxH="96vh">
      <div className="pt-1">
        <div className="mb-4 flex items-center gap-3">
          <div
            className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[13px] border"
            style={{
              background: category.color_dim ?? `${category.color}18`,
              borderColor: `${category.color}55`,
            }}
          >
            <CategoryGlyph icon={category.icon} color={category.color} size={20} />
          </div>
          <div className="flex-1">
            <div className="text-[16px] font-extrabold text-ld-text">
              {category.name} session
            </div>
            <div className="mt-0.5 text-[11px] text-ld-text-sub">
              {category.sessions_per_week}× per week target
            </div>
          </div>
        </div>

        {showTimer && (
          <TimerWidget
            color={category.color}
            onStop={(elapsedSec) => setTimedDuration(elapsedSec)}
          />
        )}

        {template.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 flex justify-between">
              <span className="text-[12px] font-semibold text-ld-text-sub">
                Tasks
              </span>
              <span
                className="text-[12px] font-bold"
                style={{
                  color:
                    ticked.size === template.length
                      ? 'var(--ld-green)'
                      : category.color,
                }}
              >
                {ticked.size}/{template.length}
              </span>
            </div>
            <div className="h-1 rounded-sm bg-ld-border">
              <div
                className="h-full rounded-sm transition-[width] duration-300"
                style={{ background: category.color, width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        <div className="mb-5 flex flex-col gap-2">
          {template.map((task) => {
            const taskDone = ticked.has(task.id);
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => toggle(task.id)}
                className="flex items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-colors"
                style={{
                  background: taskDone
                    ? `${category.color_dim ?? category.color}44`
                    : 'var(--ld-surface-high)',
                  borderColor: taskDone
                    ? `${category.color}55`
                    : 'var(--ld-border)',
                }}
              >
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors"
                  style={{
                    background: taskDone ? category.color : 'var(--ld-border)',
                    borderColor: taskDone
                      ? category.color
                      : 'var(--ld-border-bright)',
                  }}
                >
                  {taskDone && <Check size={13} className="text-white" />}
                </div>
                <div className="flex-1">
                  <div
                    className={`text-[14px] font-bold transition-colors ${
                      taskDone
                        ? 'text-ld-text-sub line-through'
                        : 'text-ld-text'
                    }`}
                  >
                    {task.label}
                  </div>
                  <div className="mt-0.5 text-[11px] text-ld-text-muted">
                    {task.duration}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <Divider />
        <div className="mb-5">
          <div className="mb-2 text-[12px] font-semibold text-ld-text-sub">
            Notes{' '}
            <span className="font-normal text-ld-text-muted">
              (optional — coach reads these)
            </span>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you work on? Any breakthroughs or struggles?"
            rows={3}
            disabled={readOnly}
            className="w-full resize-none rounded-xl border border-ld-border bg-ld-surface-high p-3.5 text-[13px] leading-relaxed text-ld-text outline-none disabled:opacity-70"
          />
        </div>

        {error && (
          <p className="mb-3 text-[12px] text-ld-red" role="alert">
            {error}
          </p>
        )}

        {readOnly ? (
          <p className="py-2 text-center text-[12px] text-ld-text-muted">
            Preview only — log from Today when this day arrives.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => void handleLog()}
            disabled={!canLog || saving}
            style={{
              background: canLog ? category.color : 'var(--ld-border)',
              color: canLog ? '#fff' : 'var(--ld-text-muted)',
            }}
            className="w-full rounded-2xl py-[17px] text-[15px] font-extrabold"
          >
            {saving
              ? 'Saving…'
              : canLog
                ? 'Log session →'
                : 'Tick at least one task to log'}
          </button>
        )}
      </div>
    </Sheet>
  );
}
