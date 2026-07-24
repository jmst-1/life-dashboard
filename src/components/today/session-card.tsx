'use client';

import { Check, ChevronRight, Move as MoveIcon } from 'lucide-react';
import { CategoryGlyph } from '@/components/categories/category-glyph';
import { Pill } from '@/components/ui/pill';
import { colorDim, getCategoryMode, getEffortType } from '@/lib/category-mode';
import type { Category, Session } from '@/types';

type SessionCardProps = {
  session: Session;
  category: Category;
  onTap: () => void;
  onMove: () => void;
};

export function SessionCard({
  session,
  category,
  onTap,
  onMove,
}: SessionCardProps) {
  const mode = getCategoryMode(category);
  const effort = getEffortType(category);
  const isBinary = effort === 'binary';
  const template = category.task_template ?? [];
  const doneCount = session.tasks_done?.length ?? 0;
  const done = session.completed;
  const skipped = session.skipped;
  const dim = colorDim(category);

  return (
    <div
      className={`overflow-hidden rounded-2xl border ${
        done ? 'bg-ld-surface-high' : 'bg-ld-surface'
      }`}
      style={{
        borderColor: done
          ? `${category.color}33`
          : skipped
            ? 'var(--ld-border)'
            : 'var(--ld-border-bright)',
        boxShadow: done ? 'none' : '0 2px 12px rgba(0,0,0,.3)',
      }}
    >
      <button
        type="button"
        onClick={onTap}
        className="flex w-full items-center gap-3.5 p-3.5 text-left"
      >
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
          style={{
            background: dim,
            borderColor: `${category.color}${done ? '44' : '88'}`,
          }}
        >
          <CategoryGlyph
            icon={category.icon}
            color={category.color}
            size={19}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={`mb-1 truncate text-[13px] font-bold ${
              done || skipped
                ? 'text-ld-text-sub line-through'
                : 'text-ld-text'
            }`}
          >
            {session.title}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {session.planned_duration_min != null &&
              session.planned_duration_min > 0 && (
                <span className="text-[11px] text-ld-text-muted">
                  {session.planned_duration_min} min
                </span>
              )}
            {mode === 'ai' && <Pill label="AI" color={category.color} />}
            {mode === 'seeded' && (
              <Pill label="SEEDED" color={category.color} />
            )}
            {isBinary && <Pill label="BINARY" color={category.color} />}
            {mode === 'tracked' && !isBinary && template.length > 0 && (
              <span className="text-[11px] text-ld-text-muted">
                {template.length} tasks
              </span>
            )}
            {done && session.rpe != null && (
              <span className="text-[11px] text-ld-text-sub">
                RPE {session.rpe}
              </span>
            )}
            {mode === 'tracked' && !done && doneCount > 0 && (
              <span
                className="text-[11px] font-bold"
                style={{ color: category.color }}
              >
                {doneCount}/{template.length} tasks
              </span>
            )}
            {skipped && (
              <span className="text-[11px] font-bold text-ld-text-muted">
                Skipped
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full border-[1.5px]"
            style={{
              background: done ? 'var(--ld-green-dim)' : 'var(--ld-surface-pop)',
              borderColor: done ? 'var(--ld-green)' : 'var(--ld-border-bright)',
            }}
          >
            {done && <Check size={12} className="text-ld-green" />}
          </div>
          <ChevronRight size={15} className="text-ld-text-muted" />
        </div>
      </button>
      <div className="flex justify-end border-t border-ld-border px-3.5 py-2">
        <button
          type="button"
          onClick={onMove}
          className="flex items-center gap-1.5 rounded-lg border border-ld-border px-3 py-1 text-[11px] text-ld-text-sub"
        >
          <MoveIcon size={11} className="text-ld-text-muted" />
          Move to another day
        </button>
      </div>
    </div>
  );
}
