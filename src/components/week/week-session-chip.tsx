'use client';

import { Check, Circle, MinusCircle, Shuffle } from 'lucide-react';
import { CategoryGlyph } from '@/components/categories/category-glyph';
import { getCategoryRegistryEntry } from '@/lib/category-registry';
import { getSessionStatus } from '@/lib/week-score';
import type { Category, Session } from '@/types';

type WeekSessionChipProps = {
  session: Session;
  category: Category;
  todayIso: string;
  canEdit: boolean;
  onOpen: () => void;
  onShuffle?: () => void;
  shuffleLoading?: boolean;
};

function StatusIcon({
  status,
}: {
  status: ReturnType<typeof getSessionStatus>;
}) {
  switch (status) {
    case 'complete':
      return (
        <Check
          size={12}
          className="shrink-0 text-emerald-400"
          aria-hidden
        />
      );
    case 'skipped':
      return (
        <MinusCircle
          size={12}
          className="shrink-0 text-gray-500"
          aria-hidden
        />
      );
    case 'missed':
      return (
        <span
          className="inline-block size-1.5 shrink-0 rounded-full bg-red-500"
          aria-hidden
        />
      );
    default:
      return (
        <Circle size={12} className="shrink-0 text-gray-600" aria-hidden />
      );
  }
}

export function WeekSessionChip({
  session,
  category,
  todayIso,
  canEdit,
  onOpen,
  onShuffle,
  shuffleLoading,
}: WeekSessionChipProps) {
  const status = getSessionStatus(session, todayIso);
  const renderer = getCategoryRegistryEntry(category).sessionRenderer;
  const label = `${category.name}: ${session.title}`;

  return (
    <div
      className="rounded border border-gray-700 bg-gray-950"
      style={{ borderLeftColor: category.color, borderLeftWidth: 2 }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col items-center gap-0.5 px-0.5 py-1.5 hover:bg-gray-900"
        title={label}
        aria-label={label}
      >
        <CategoryGlyph
          icon={category.icon}
          color={category.color}
          size={14}
          aria-hidden
        />
        <StatusIcon status={status} />
      </button>
      {renderer === 'movement' && canEdit && onShuffle && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onShuffle();
          }}
          disabled={shuffleLoading}
          className="flex w-full items-center justify-center border-t border-gray-800 py-1 text-gray-500 hover:text-white disabled:opacity-50"
          aria-label="Shuffle routine"
          title="Shuffle routine"
        >
          <Shuffle size={11} className={shuffleLoading ? 'animate-spin' : ''} />
        </button>
      )}
    </div>
  );
}
