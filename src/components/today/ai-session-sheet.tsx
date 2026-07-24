'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Sparkles,
} from 'lucide-react';
import { CategoryGlyph } from '@/components/categories/category-glyph';
import { Pill } from '@/components/ui/pill';
import { Sheet } from '@/components/ui/sheet';
import { TimerWidget } from '@/components/ui/timer-widget';
import { getCategoryMode, getEffortType, isTimedSession } from '@/lib/category-mode';
import type { Category, Session } from '@/types';

type AiSessionSheetProps = {
  session: Session;
  category: Category;
  onClose: () => void;
  onUpdate: (session: Session) => void;
  /** Preview mode — hide log / complete CTAs. */
  readOnly?: boolean;
};

function rpeEffortLabel(rpe: number): string {
  if (rpe <= 3) return 'Easy';
  if (rpe <= 5) return 'Moderate';
  if (rpe <= 7) return 'Hard';
  if (rpe <= 9) return 'Very hard';
  return 'Max';
}

function rpeColor(rpe: number): string {
  if (rpe >= 8) return 'var(--ld-red)';
  if (rpe >= 5) return 'var(--ld-orange)';
  return 'var(--ld-green)';
}

export function AiSessionSheet({
  session,
  category,
  onClose,
  onUpdate,
  readOnly = false,
}: AiSessionSheetProps) {
  const mode = getCategoryMode(category);
  const effort = getEffortType(category);
  const showTimer = isTimedSession(category) && !readOnly;
  const hasBlocks = !!session.blocks && session.blocks.length > 0;
  const hasZones = !!session.zones && session.zones.length > 0;
  const hasSteps = !!session.routine_steps && session.routine_steps.length > 0;
  const stepsPath = hasSteps && !hasBlocks && !hasZones;

  const sortedSteps = useMemo(
    () =>
      hasSteps
        ? [...session.routine_steps!].sort((a, b) => a.order - b.order)
        : [],
    [hasSteps, session.routine_steps]
  );

  const [noteOpen, setNoteOpen] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(() => new Set());
  const [rpe, setRpe] = useState(6);
  const [duration, setDuration] = useState(
    String(session.planned_duration_min ?? 30)
  );
  const [status, setStatus] = useState<'completed' | 'skipped'>('completed');
  const [notes, setNotes] = useState(session.execution_notes ?? '');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [timedDuration, setTimedDuration] = useState(0);
  const [shuffling, setShuffling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleStep(order: number) {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(order)) next.delete(order);
      else next.add(order);
      return next;
    });
  }

  async function handleShuffle() {
    if (shuffling || readOnly) return;
    setShuffling(true);
    setError(null);
    try {
      const res = await fetch('/api/plan/reroll-movement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      });
      const json = (await res.json()) as { session?: Session; error?: string };
      if (!res.ok || !json.session) {
        setError(json.error ?? 'Failed to shuffle');
        setShuffling(false);
        return;
      }
      onUpdate(json.session);
      setDuration(String(json.session.planned_duration_min ?? 30));
      setCheckedSteps(new Set());
    } catch {
      setError('Failed to shuffle');
    } finally {
      setShuffling(false);
    }
  }

  async function completeSession(body: Record<string, unknown>) {
    if (saving || readOnly) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${session.id}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { session?: Session; error?: string };
      if (!res.ok || !json.session) {
        setError(json.error ?? 'Failed to log session');
        setSaving(false);
        return;
      }
      onUpdate(json.session);
      setSaved(true);
    } catch {
      setError('Failed to log session');
      setSaving(false);
    }
  }

  async function handleStepsComplete() {
    if (checkedSteps.size < 1) {
      setError('Tick at least one step to complete');
      return;
    }
    const durationMin =
      timedDuration > 0
        ? Math.round(timedDuration / 60)
        : session.planned_duration_min ?? 0;
    await completeSession({
      actual_duration_min: durationMin,
      completed: true,
      skipped: false,
      execution_notes: notes.trim() || null,
      timed_duration_sec: timedDuration > 0 ? timedDuration : null,
    });
  }

  async function handleSaveLog() {
    const durationNum = Number(duration);
    if (Number.isNaN(durationNum) || durationNum < 0) {
      setError('Duration must be a non-negative number');
      return;
    }

    const body: Record<string, unknown> = {
      actual_duration_min: Math.round(durationNum),
      completed: status === 'completed',
      skipped: status === 'skipped',
      execution_notes: notes.trim() || null,
      timed_duration_sec: timedDuration > 0 ? timedDuration : null,
    };
    if (effort === 'rpe' && status === 'completed') {
      body.rpe = rpe;
    }
    await completeSession(body);
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
            {effort === 'rpe' && status === 'completed' ? `RPE ${rpe} · ` : ''}
            {stepsPath
              ? `${checkedSteps.size} steps`
              : `${duration} min · ${status}`}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-ld-orange py-4 text-[15px] font-extrabold text-white"
          >
            Done
          </button>
        </div>
      </Sheet>
    );
  }

  if (showLog && !stepsPath && !readOnly) {
    return (
      <Sheet onClose={() => setShowLog(false)}>
        <div className="pt-1">
          <div className="mb-5 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowLog(false)}
              className="flex p-1 text-ld-text-sub"
              aria-label="Back"
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <div className="text-[16px] font-extrabold text-ld-text">
                Log session
              </div>
              <div className="text-[11px] text-ld-text-sub">
                {session.title}
              </div>
            </div>
          </div>

          {effort === 'rpe' && status === 'completed' && (
            <div className="mb-[22px]">
              <div className="mb-2.5 flex justify-between">
                <span className="text-[12px] font-semibold text-ld-text-sub">
                  Effort (RPE)
                </span>
                <span
                  className="text-[13px] font-extrabold"
                  style={{ color: rpeColor(rpe) }}
                >
                  {rpe}/10 — {rpeEffortLabel(rpe)}
                </span>
              </div>
              <div
                className="mb-2.5 h-2 rounded-sm"
                style={{
                  background:
                    'linear-gradient(to right, var(--ld-green), var(--ld-amber), var(--ld-orange), var(--ld-red))',
                }}
              />
              <input
                type="range"
                min={1}
                max={10}
                value={rpe}
                onChange={(e) => setRpe(Number(e.target.value))}
                className="mb-1 w-full cursor-pointer"
                style={{ accentColor: rpeColor(rpe) }}
              />
              <div className="flex justify-between">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <span
                    key={n}
                    className={`text-[9px] ${
                      n === rpe
                        ? 'font-extrabold text-ld-text'
                        : 'text-ld-text-muted'
                    }`}
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mb-3.5">
            <div className="mb-2 text-[12px] font-semibold text-ld-text-sub">
              Duration (min)
              {timedDuration > 0 && (
                <span className="ml-2 text-[11px] text-ld-green">
                  · timed: {Math.round(timedDuration / 60)} min
                </span>
              )}
            </div>
            <input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              inputMode="numeric"
              className="w-full rounded-xl border border-ld-border bg-ld-surface-high p-3.5 text-[16px] text-ld-text outline-none"
            />
          </div>

          <div className="mb-3.5 flex gap-2.5">
            {(['completed', 'skipped'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`flex-1 rounded-xl border py-3 text-[13px] font-bold capitalize ${
                  status === s
                    ? s === 'completed'
                      ? 'border-ld-green bg-ld-green-dim text-ld-green'
                      : 'border-ld-red bg-ld-red-dim text-ld-red'
                    : 'border-ld-border bg-ld-surface-high text-ld-text-sub'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="mb-6">
            <div className="mb-2 text-[12px] font-semibold text-ld-text-sub">
              Notes{' '}
              <span className="font-normal text-ld-text-muted">
                (coach reads these)
              </span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it feel? Anything to flag for next week?"
              rows={3}
              className="w-full resize-none rounded-xl border border-ld-border bg-ld-surface-high p-3.5 text-[13px] leading-relaxed text-ld-text outline-none"
            />
          </div>

          {error && (
            <p className="mb-3 text-[12px] text-ld-red" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleSaveLog()}
            disabled={saving}
            className="w-full rounded-2xl bg-ld-orange py-[17px] text-[15px] font-extrabold text-white disabled:opacity-70"
          >
            {saving ? 'Saving…' : 'Save log'}
          </button>
        </div>
      </Sheet>
    );
  }

  const showDescription = !!session.description && !hasBlocks;

  return (
    <Sheet onClose={onClose}>
      <div className="pt-1">
        <div className="mb-5 flex items-start gap-3.5">
          <div
            className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-2xl border"
            style={{
              background: category.color_dim ?? `${category.color}18`,
              borderColor: `${category.color}55`,
            }}
          >
            <CategoryGlyph icon={category.icon} color={category.color} size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 text-[16px] font-extrabold leading-tight text-ld-text">
              {session.title}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {session.planned_duration_min != null && (
                <span className="text-[12px] text-ld-text-sub">
                  {session.planned_duration_min} min planned
                </span>
              )}
              {mode === 'ai' && (
                <Pill label="AI COACHED" color={category.color} />
              )}
              {mode === 'seeded' && (
                <Pill label="SEEDED" color={category.color} />
              )}
              {readOnly && <Pill label="PREVIEW" color="var(--ld-text-muted)" />}
            </div>
          </div>
          {mode === 'seeded' && !readOnly && (
            <button
              type="button"
              onClick={() => void handleShuffle()}
              disabled={shuffling}
              aria-label="Shuffle routine"
              className="shrink-0 rounded-lg border border-ld-border p-2 text-ld-text-sub disabled:opacity-50"
            >
              <Shuffle size={16} className={shuffling ? 'animate-spin' : ''} />
            </button>
          )}
        </div>

        {showTimer && (
          <TimerWidget
            color={category.color}
            onStop={(elapsedSec) => setTimedDuration(elapsedSec)}
          />
        )}

        {error && (
          <p className="mb-3 text-[12px] text-ld-red" role="alert">
            {error}
          </p>
        )}

        {showDescription && (
          <div className="mb-3.5 overflow-hidden rounded-2xl border border-ld-border bg-ld-surface-high">
            <button
              type="button"
              onClick={() => setNoteOpen(!noteOpen)}
              className="flex w-full items-center justify-between px-4 py-3.5"
            >
              <div className="flex items-center gap-2">
                <Sparkles
                  size={13}
                  className="text-ld-orange"
                  style={{ color: category.color }}
                />
                <span className="text-[12px] font-bold text-ld-text-sub">
                  {mode === 'ai' ? "Coach's note" : 'Description'}
                </span>
              </div>
              {noteOpen ? (
                <ChevronDown size={13} className="text-ld-text-muted" />
              ) : (
                <ChevronRight size={13} className="text-ld-text-muted" />
              )}
            </button>
            {noteOpen && (
              <div className="border-t border-ld-border px-4 pb-3.5 pt-3">
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ld-text-sub">
                  {session.description}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mb-2.5 text-[11px] font-bold tracking-wide text-ld-text-muted">
          {hasBlocks
            ? 'EXERCISES'
            : hasZones
              ? 'RIDE PLAN'
              : hasSteps
                ? "TODAY'S ROUTINE"
                : 'SESSION'}
        </div>

        <div className={`flex flex-col gap-2 ${stepsPath ? 'mb-4' : 'mb-6'}`}>
          {hasBlocks &&
            session.blocks!.map((block, bi) => (
              <div key={`${block.name}-${bi}`}>
                <div className="mb-1.5 mt-2 flex items-baseline justify-between px-0.5">
                  <span className="text-[12px] font-bold text-ld-text-sub">
                    {block.name}
                  </span>
                  <span className="text-[11px] text-ld-text-muted">
                    {block.duration_min} min
                  </span>
                </div>
                {block.exercises.map((ex, ei) => (
                  <div
                    key={`${ex.name}-${ei}`}
                    className="mb-2 rounded-xl border border-ld-border bg-ld-surface-high p-3.5"
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <span className="text-[14px] font-bold text-ld-text">
                        {ex.name}
                      </span>
                      <span
                        className="shrink-0 whitespace-nowrap text-[12px] font-bold"
                        style={{ color: category.color }}
                      >
                        {ex.sets}×{ex.reps}
                      </span>
                    </div>
                    {ex.notes && (
                      <div className="mt-1 text-[12px] leading-relaxed text-ld-text-muted">
                        {ex.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}

          {!hasBlocks &&
            hasZones &&
            session.zones!.map((zone, zi) => (
              <div
                key={`${zone.name}-${zi}`}
                className="rounded-xl border border-ld-border bg-ld-surface-high p-3.5"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <span className="text-[14px] font-bold text-ld-text">
                    {zone.name}
                  </span>
                  <span
                    className="shrink-0 whitespace-nowrap text-[12px] font-bold"
                    style={{ color: category.color }}
                  >
                    {zone.duration_min} min
                  </span>
                </div>
                <div className="mt-1 text-[12px] text-ld-text-muted">
                  {zone.pct_ftp_low}–{zone.pct_ftp_high}% FTP
                </div>
              </div>
            ))}

          {stepsPath &&
            sortedSteps.map((step) => {
              const done = checkedSteps.has(step.order);
              return (
                <button
                  key={step.order}
                  type="button"
                  disabled={readOnly}
                  onClick={() => toggleStep(step.order)}
                  className="flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors disabled:opacity-90"
                  style={{
                    background: done
                      ? `${category.color_dim ?? category.color}44`
                      : 'var(--ld-surface-high)',
                    borderColor: done
                      ? `${category.color}55`
                      : 'var(--ld-border)',
                  }}
                >
                  <div
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px]"
                    style={{
                      background: done ? category.color : 'var(--ld-border)',
                      borderColor: done
                        ? category.color
                        : 'var(--ld-border-bright)',
                    }}
                  >
                    {done && <Check size={13} className="text-white" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2.5">
                      <span
                        className={`text-[14px] font-bold ${
                          done
                            ? 'text-ld-text-sub line-through'
                            : 'text-ld-text'
                        }`}
                      >
                        {step.name}
                      </span>
                      <span
                        className="shrink-0 whitespace-nowrap text-[12px] font-bold"
                        style={{ color: category.color }}
                      >
                        {step.duration_sec >= 60
                          ? `${Math.round(step.duration_sec / 60)} min`
                          : `${step.duration_sec} sec`}
                      </span>
                    </div>
                    {step.cue && (
                      <div className="mt-1 text-[12px] leading-relaxed text-ld-text-muted">
                        {step.cue}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}

          {!hasBlocks && !hasZones && !hasSteps && !session.description && (
            <p className="text-[13px] text-ld-text-sub">
              No details for this session yet.
            </p>
          )}
        </div>

        {stepsPath && !readOnly && (
          <>
            <div className="mb-4">
              <div className="mb-2 text-[12px] font-semibold text-ld-text-sub">
                Notes{' '}
                <span className="font-normal text-ld-text-muted">(optional)</span>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How did it feel?"
                rows={2}
                className="w-full resize-none rounded-xl border border-ld-border bg-ld-surface-high p-3.5 text-[13px] leading-relaxed text-ld-text outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleStepsComplete()}
              disabled={saving || checkedSteps.size < 1}
              className="w-full rounded-2xl bg-ld-orange py-[17px] text-[15px] font-extrabold text-white disabled:opacity-60"
            >
              {saving
                ? 'Saving…'
                : checkedSteps.size < 1
                  ? 'Tick at least one step'
                  : 'Complete session'}
            </button>
          </>
        )}

        {!stepsPath && !readOnly && hasBlocks && (
          <Link
            href={`/week/${session.id}/strength`}
            className="block w-full rounded-2xl bg-ld-orange py-[17px] text-center text-[15px] font-extrabold text-white"
          >
            Log sets & reps →
          </Link>
        )}

        {!stepsPath && !readOnly && !hasBlocks && (
          <button
            type="button"
            onClick={() => setShowLog(true)}
            className="w-full rounded-2xl bg-ld-orange py-[17px] text-[15px] font-extrabold text-white"
          >
            Log session →
          </button>
        )}

        {readOnly && (
          <p className="py-2 text-center text-[12px] text-ld-text-muted">
            Preview only — log from Today when this day arrives.
          </p>
        )}
      </div>
    </Sheet>
  );
}
