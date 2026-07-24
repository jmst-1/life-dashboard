'use client';

import { useState } from 'react';
import { CategoryGlyph } from '@/components/categories/category-glyph';
import { Divider } from '@/components/ui/divider';
import { Sheet } from '@/components/ui/sheet';
import { Toggle } from '@/components/ui/toggle';
import {
  CATEGORY_COLOR_PRESETS,
  CATEGORY_ICON_PRESETS,
  type CategoryIconKey,
} from '@/lib/category-templates';
import {
  getCategoryMode,
  modeLabel,
  trackingTypeFromMode,
} from '@/lib/category-mode';
import type {
  Category,
  CategoryMode,
  EffortType,
  TaskTemplateItem,
} from '@/types';
import { Check, Plus, Sparkles, ListChecks, Trash2 } from 'lucide-react';

export type CategoryCreatePayload = {
  name: string;
  icon: string;
  color: string;
  color_dim: string;
  mode: CategoryMode;
  tracking_type: Category['tracking_type'];
  effort_type: EffortType;
  sessions_per_week: number;
  timed_session: boolean;
  task_template: TaskTemplateItem[];
  ai_enabled: boolean;
  affects_nutrition: boolean;
  nutrition_met: number;
  nutrition_hard_threshold_min: number;
};

type CategoryCreateSheetProps = {
  onClose: () => void;
  onSave: (payload: CategoryCreatePayload) => Promise<void> | void;
  editing?: Category | null;
  saving?: boolean;
};

const STEPS = ['Identity', 'Setup', 'Tasks'] as const;

export function CategoryCreateSheet({
  onClose,
  onSave,
  editing = null,
  saving = false,
}: CategoryCreateSheetProps) {
  const isRealEdit = Boolean(editing?.id);
  const lockedMode = editing ? getCategoryMode(editing) : null;

  const [step, setStep] = useState(0);
  const [name, setName] = useState(editing?.name ?? '');
  const [icon, setIcon] = useState<CategoryIconKey>(
    (editing?.icon as CategoryIconKey) ?? 'book-open'
  );
  const [color, setColor] = useState(editing?.color ?? '#60A5FA');
  const [mode, setMode] = useState<CategoryMode>(() => {
    if (editing) return getCategoryMode(editing);
    return 'tracked';
  });
  const [effortType, setEffortType] = useState<EffortType>(
    editing?.effort_type ?? 'duration'
  );
  const [spw, setSpw] = useState(editing?.sessions_per_week ?? 3);
  const [affectsNutrition, setAN] = useState(
    editing?.affects_nutrition ?? false
  );
  const [timedSession, setTimed] = useState(editing?.timed_session ?? false);
  const [template, setTemplate] = useState<TaskTemplateItem[]>(
    editing?.task_template ?? []
  );
  const [newTask, setNewTask] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isBinary = effortType === 'binary';
  const displayMode = isRealEdit && lockedMode ? lockedMode : mode;

  function addTask() {
    if (!newTask.trim()) return;
    setTemplate((p) => [
      ...p,
      { id: `t${Date.now()}`, label: newTask.trim(), duration: '' },
    ]);
    setNewTask('');
  }

  async function handleSave() {
    setError(null);
    try {
      const saveMode =
        isRealEdit && editing
          ? getCategoryMode(editing)
          : mode;
      const saveTrackingType =
        isRealEdit && editing
          ? editing.tracking_type
          : trackingTypeFromMode(mode);

      await onSave({
        name: name.trim(),
        icon,
        color,
        color_dim: `${color}18`,
        mode: saveMode,
        tracking_type: saveTrackingType,
        effort_type: effortType,
        sessions_per_week: spw,
        timed_session: isBinary ? false : timedSession,
        task_template: isBinary ? [] : template,
        ai_enabled: isRealEdit && editing ? editing.ai_enabled : mode === 'ai',
        affects_nutrition: affectsNutrition,
        nutrition_met: editing?.nutrition_met ?? 6,
        nutrition_hard_threshold_min:
          editing?.nutrition_hard_threshold_min ?? 60,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    }
  }

  return (
    <Sheet onClose={onClose} maxH="96vh">
      <div className="mb-1.5 flex items-center justify-between pt-1">
        <div className="text-[17px] font-extrabold text-ld-text">
          {isRealEdit ? 'Edit category' : 'New category'}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-ld-border bg-ld-surface-high text-ld-text-sub"
        >
          ×
        </button>
      </div>

      <div className="mb-5 flex gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div
              className="mb-1 h-[3px] rounded-sm transition-colors"
              style={{ background: i <= step ? color : 'var(--ld-border)' }}
            />
            <span
              className="text-[9px] font-bold tracking-wider"
              style={{ color: i === step ? color : 'var(--ld-text-muted)' }}
            >
              {s.toUpperCase()}
            </span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div>
          <div className="mb-6 flex justify-center">
            <div className="flex flex-col items-center gap-2.5">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-[18px] border-2"
                style={{
                  background: `${color}22`,
                  borderColor: `${color}55`,
                }}
              >
                <CategoryGlyph icon={icon} color={color} size={28} />
              </div>
              <div
                className={`text-[15px] font-extrabold ${
                  name ? 'text-ld-text' : 'text-ld-text-muted'
                }`}
              >
                {name || 'Category name'}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="mb-2 text-xs font-semibold text-ld-text-sub">
              Name
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Running, Reading, Deep work..."
              className="w-full rounded-xl border bg-ld-surface-high px-4 py-3.5 text-[15px] text-ld-text outline-none"
              style={{
                borderColor: name ? `${color}55` : 'var(--ld-border)',
              }}
            />
          </div>

          <div className="mb-4">
            <div className="mb-2.5 text-xs font-semibold text-ld-text-sub">
              Icon
            </div>
            <div className="grid grid-cols-6 gap-2">
              {CATEGORY_ICON_PRESETS.slice(0, 12).map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className="flex aspect-square items-center justify-center rounded-[10px] border"
                  style={{
                    background:
                      icon === ic ? `${color}33` : 'var(--ld-surface-high)',
                    borderColor: icon === ic ? color : 'var(--ld-border)',
                  }}
                >
                  <CategoryGlyph
                    icon={ic}
                    color={icon === ic ? color : 'var(--ld-text-muted)'}
                    size={18}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-2.5 text-xs font-semibold text-ld-text-sub">
              Colour
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2"
                  style={{
                    background: c,
                    borderColor: color === c ? '#fff' : c,
                    boxShadow: color === c ? `0 0 0 2px ${c}` : undefined,
                  }}
                >
                  {color === c && <Check size={14} color="#fff" />}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => setStep(1)}
            className="w-full rounded-[14px] py-4 text-[15px] font-extrabold text-white disabled:bg-ld-border disabled:text-ld-text-muted"
            style={{ background: name.trim() ? color : undefined }}
          >
            Next →
          </button>
        </div>
      )}

      {step === 1 && (
        <div>
          <div className="mb-1.5 text-base font-extrabold text-ld-text">
            How are sessions planned?
          </div>
          {isRealEdit ? (
            <>
              <div className="mb-5 text-[13px] leading-relaxed text-ld-text-sub">
                Tracking type can&apos;t be changed after creation.
              </div>
              <div
                className="mb-5 rounded-[14px] border px-4 py-3.5"
                style={{
                  background: `${color}18`,
                  borderColor: `${color}66`,
                }}
              >
                <div className="text-sm font-bold text-ld-text">
                  {modeLabel(displayMode)}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mb-5 text-[13px] leading-relaxed text-ld-text-sub">
                AI coaches build full sessions each week. Self-tracked lets you
                set a target and log completions.
              </div>

              <div className="mb-5 flex flex-col gap-2.5">
                {(
                  [
                    {
                      key: 'ai' as const,
                      label: 'AI coached',
                      sub: 'Your coach generates sessions with exercises, sets, and coaching notes each week.',
                      Icon: Sparkles,
                    },
                    {
                      key: 'tracked' as const,
                      label: 'Self-tracked',
                      sub: 'You set a weekly target. Sessions are slots you complete and log yourself.',
                      Icon: ListChecks,
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setMode(opt.key)}
                    className="w-full rounded-[14px] border p-3.5 text-left transition-colors"
                    style={{
                      background:
                        mode === opt.key
                          ? `${color}18`
                          : 'var(--ld-surface-high)',
                      borderColor:
                        mode === opt.key ? `${color}66` : 'var(--ld-border)',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]"
                        style={{
                          background:
                            mode === opt.key
                              ? `${color}33`
                              : 'var(--ld-border)',
                        }}
                      >
                        <opt.Icon
                          size={15}
                          color={
                            mode === opt.key ? color : 'var(--ld-text-muted)'
                          }
                        />
                      </div>
                      <div>
                        <div
                          className={`mb-0.5 text-sm font-bold ${
                            mode === opt.key
                              ? 'text-ld-text'
                              : 'text-ld-text-sub'
                          }`}
                        >
                          {opt.label}
                        </div>
                        <div className="text-xs leading-snug text-ld-text-muted">
                          {opt.sub}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {displayMode === 'tracked' && (
            <div className="mb-4 rounded-[14px] border border-ld-border bg-ld-surface-high p-4">
              <div className="mb-3.5 text-xs font-semibold text-ld-text-sub">
                Target sessions per week
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSpw(Math.max(1, spw - 1))}
                  className="h-10 w-10 rounded-[10px] border border-ld-border bg-ld-surface-pop text-xl text-ld-text"
                >
                  −
                </button>
                <div className="text-center">
                  <div className="text-[32px] font-black" style={{ color }}>
                    {spw}
                  </div>
                  <div className="text-[11px] text-ld-text-muted">
                    days per week
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSpw(Math.min(7, spw + 1))}
                  className="h-10 w-10 rounded-[10px] border border-ld-border bg-ld-surface-pop text-xl text-ld-text"
                >
                  +
                </button>
              </div>
            </div>
          )}

          <div className="mb-4">
            <div className="mb-2.5 text-xs font-semibold text-ld-text-sub">
              Effort tracking
            </div>
            <div className="flex gap-2">
              {(
                [
                  { k: 'rpe' as const, l: 'RPE', sub: 'Physical' },
                  { k: 'duration' as const, l: 'Duration', sub: 'Time-based' },
                  { k: 'binary' as const, l: 'Done/skip', sub: 'Habit' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.k}
                  type="button"
                  onClick={() => setEffortType(opt.k)}
                  className="flex flex-1 flex-col items-center gap-1 rounded-xl border px-1.5 py-2.5"
                  style={{
                    background:
                      effortType === opt.k
                        ? `${color}22`
                        : 'var(--ld-surface-high)',
                    borderColor:
                      effortType === opt.k ? color : 'var(--ld-border)',
                  }}
                >
                  <span
                    className="text-[10px] font-bold"
                    style={{
                      color:
                        effortType === opt.k ? color : 'var(--ld-text-muted)',
                    }}
                  >
                    {opt.l}
                  </span>
                  <span className="text-[9px] text-ld-text-muted">{opt.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {!isBinary && (
            <div className="mb-3.5 flex items-center justify-between rounded-[14px] border border-ld-border bg-ld-surface-high px-4 py-3.5">
              <div>
                <div className="text-[13px] font-bold text-ld-text">
                  Time sessions
                </div>
                <div className="text-[11px] text-ld-text-muted">
                  Show start/stop timer during session
                </div>
              </div>
              <Toggle on={timedSession} onChange={setTimed} />
            </div>
          )}

          <div className="mb-5 flex items-center justify-between rounded-[14px] border border-ld-border bg-ld-surface-high px-4 py-3.5">
            <div>
              <div className="text-[13px] font-bold text-ld-text">
                Affects nutrition
              </div>
              <div className="text-[11px] text-ld-text-muted">
                Include in daily calorie calculation
              </div>
            </div>
            <Toggle on={affectsNutrition} onChange={setAN} />
          </div>

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="flex-1 rounded-[14px] border border-ld-border py-3.5 text-sm text-ld-text-sub"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-[2] rounded-[14px] py-3.5 text-[15px] font-extrabold text-white"
              style={{ background: color }}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="mb-1 text-base font-extrabold text-ld-text">
            Session template
          </div>
          <div className="mb-4 text-[13px] leading-relaxed text-ld-text-sub">
            {isBinary
              ? 'Binary sessions have no sub-tasks — just tap done when complete.'
              : displayMode === 'ai'
                ? 'Optional: add tasks your coach should always include.'
                : "Define tasks that make up each session. You'll tick these off live during the session."}
          </div>

          {isBinary ? (
            <div className="mb-6 rounded-[14px] border border-ld-border bg-ld-surface-high p-5 text-center">
              <div
                className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border"
                style={{
                  background: `${color}22`,
                  borderColor: `${color}44`,
                }}
              >
                <Check size={22} color={color} />
              </div>
              <div className="text-[13px] leading-relaxed text-ld-text-sub">
                One tap to mark done. Optional note for your coach. No tasks
                needed.
              </div>
            </div>
          ) : (
            <>
              {template.length === 0 && (
                <div className="mb-4 rounded-xl border border-dashed border-ld-border bg-ld-surface-high p-5 text-center text-[13px] text-ld-text-muted">
                  No tasks yet. Add your first below.
                </div>
              )}
              <div className="mb-3.5 flex flex-col gap-2">
                {template.map((task, i) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2.5 rounded-xl border border-ld-border bg-ld-surface-high px-3.5 py-3"
                  >
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-extrabold"
                      style={{
                        background: `${color}22`,
                        borderColor: `${color}44`,
                        color,
                      }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 text-[13px] font-bold text-ld-text">
                      {task.label}
                    </div>
                    <input
                      value={task.duration}
                      onChange={(e) =>
                        setTemplate((p) =>
                          p.map((t, ti) =>
                            ti === i ? { ...t, duration: e.target.value } : t
                          )
                        )
                      }
                      placeholder="5 min"
                      className="w-16 rounded-lg border border-ld-border bg-ld-surface-pop px-2 py-1 text-center text-[11px] text-ld-text-sub outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setTemplate((p) => p.filter((_, ti) => ti !== i))
                      }
                      className="p-1 text-ld-red"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mb-6 flex gap-2">
                <input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                  placeholder="Add a task..."
                  className="flex-1 rounded-xl border border-ld-border bg-ld-surface-high px-3.5 py-3 text-[13px] text-ld-text outline-none"
                />
                <button
                  type="button"
                  onClick={addTask}
                  className="flex items-center justify-center rounded-xl px-4"
                  style={{ background: color }}
                >
                  <Plus size={16} color="#fff" />
                </button>
              </div>
            </>
          )}

          {error && (
            <p className="mb-3 text-sm text-ld-red">{error}</p>
          )}

          <Divider />

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-[14px] border border-ld-border py-3.5 text-sm text-ld-text-sub"
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="flex-[2] rounded-[14px] py-3.5 text-[15px] font-extrabold text-white disabled:opacity-60"
              style={{ background: color }}
            >
              {saving
                ? 'Saving…'
                : isRealEdit
                  ? 'Save changes'
                  : 'Create category'}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
