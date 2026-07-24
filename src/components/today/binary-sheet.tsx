'use client';

import { useState } from 'react';
import { Check, NotebookPen } from 'lucide-react';
import { CategoryGlyph } from '@/components/categories/category-glyph';
import { Sheet } from '@/components/ui/sheet';
import type { Category, Session } from '@/types';

type BinarySheetProps = {
  session: Session;
  category: Category;
  onClose: () => void;
  onSaved: (session: Session) => void;
  readOnly?: boolean;
};

export function BinarySheet({
  session,
  category,
  onClose,
  onSaved,
  readOnly = false,
}: BinarySheetProps) {
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState(session.execution_notes ?? '');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(session.completed);
  const [error, setError] = useState<string | null>(null);

  async function markDone() {
    if (readOnly || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${session.id}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actual_duration_min: 0,
          completed: true,
          skipped: false,
          execution_notes: note.trim() || null,
        }),
      });
      const json = (await res.json()) as { session?: Session; error?: string };
      if (!res.ok || !json.session) {
        setError(json.error ?? 'Failed to log session');
        setSaving(false);
        return;
      }
      onSaved(json.session);
      setDone(true);
    } catch {
      setError('Failed to log session');
      setSaving(false);
    }
  }

  if (done) {
    return (
      <Sheet onClose={onClose}>
        <div className="px-0 pb-2 pt-8 text-center">
          <div className="mx-auto mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-ld-green bg-ld-green-dim">
            <Check size={32} className="text-ld-green" />
          </div>
          <div className="mb-1.5 text-[18px] font-extrabold text-ld-text">
            {category.name} logged
          </div>
          <div className="mb-7 text-[13px] text-ld-text-sub">
            Marked complete for today.
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
    <Sheet onClose={onClose}>
      <div className="pt-1">
        <div className="mb-6 flex items-center gap-3.5">
          <div
            className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[15px] border"
            style={{
              background: category.color_dim ?? `${category.color}18`,
              borderColor: `${category.color}55`,
            }}
          >
            <CategoryGlyph icon={category.icon} color={category.color} size={24} />
          </div>
          <div>
            <div className="text-[17px] font-extrabold text-ld-text">
              {category.name}
            </div>
            <div className="mt-0.5 text-[12px] text-ld-text-sub">
              {category.sessions_per_week}× per week · today&apos;s session
            </div>
          </div>
        </div>

        {readOnly ? (
          <p className="py-4 text-center text-[12px] text-ld-text-muted">
            Preview only — log from Today when this day arrives.
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void markDone()}
              disabled={saving}
              style={{ background: category.color }}
              className="mb-4 flex w-full items-center justify-center gap-3 rounded-2xl py-[22px] disabled:opacity-70"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/25">
                <Check size={18} className="text-white" />
              </div>
              <span className="text-[18px] font-black text-white">
                {saving ? 'Saving…' : 'Mark as done'}
              </span>
            </button>

            {!showNote ? (
              <button
                type="button"
                onClick={() => setShowNote(true)}
                className="flex w-full items-center justify-center gap-1.5 py-3 text-[13px] text-ld-text-sub"
              >
                <NotebookPen size={13} className="text-ld-text-muted" />
                Add a note for your coach
              </button>
            ) : (
              <div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  autoFocus
                  placeholder="Anything worth flagging? Completed, skipped, partial…"
                  rows={3}
                  className="mb-2.5 w-full resize-none rounded-xl border bg-ld-surface-high p-3.5 text-[13px] leading-relaxed text-ld-text outline-none"
                  style={{ borderColor: `${category.color}44` }}
                />
                <button
                  type="button"
                  onClick={() => void markDone()}
                  disabled={saving}
                  style={{ background: category.color }}
                  className="w-full rounded-2xl py-4 text-[15px] font-extrabold text-white disabled:opacity-70"
                >
                  {saving ? 'Saving…' : 'Save & mark done'}
                </button>
              </div>
            )}
          </>
        )}

        {error && (
          <p className="mt-3 text-[12px] text-ld-red" role="alert">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}
