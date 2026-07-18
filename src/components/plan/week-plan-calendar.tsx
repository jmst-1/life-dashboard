'use client';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { useState } from 'react';
import { CategoryGlyph } from '@/components/categories/category-glyph';
import { dayLabel } from '@/lib/plan-context';
import type { Category, Session } from '@/types';

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export type CalendarSession = Session & {
  category: Category;
};

type WeekPlanCalendarBaseProps = {
  sessions: CalendarSession[];
  disabled?: boolean;
};

type WeekPlanCalendarEditableProps = WeekPlanCalendarBaseProps & {
  readOnly?: false;
  editingSessionId: string | null;
  editTitle: string;
  editDuration: string;
  editSaving: boolean;
  onEditTitleChange: (value: string) => void;
  onEditDurationChange: (value: string) => void;
  onStartEdit: (session: Session) => void;
  onSaveEdit: (session: Session) => void;
  onCancelEdit: () => void;
  onMoveToDay: (sessionId: string, day: number) => void;
  onDeleteSession: (sessionId: string) => void;
};

type WeekPlanCalendarReadOnlyProps = WeekPlanCalendarBaseProps & {
  readOnly: true;
};

export type WeekPlanCalendarProps =
  | WeekPlanCalendarEditableProps
  | WeekPlanCalendarReadOnlyProps;

function groupSessionsByDay(
  sessions: CalendarSession[]
): Record<number, CalendarSession[]> {
  const byDay: Record<number, CalendarSession[]> = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  };
  for (const session of sessions) {
    if (session.day_of_week >= 0 && session.day_of_week <= 6) {
      byDay[session.day_of_week].push(session);
    }
  }
  for (const day of DAYS) {
    byDay[day].sort((a, b) => {
      if (a.category.name !== b.category.name) {
        return a.category.name.localeCompare(b.category.name);
      }
      return a.sort_order - b.sort_order;
    });
  }
  return byDay;
}

function SessionChipContent({ item }: { item: CalendarSession }) {
  return (
    <>
      <div className="flex items-center gap-1.5">
        <CategoryGlyph
          icon={item.category.icon}
          color={item.category.color}
          size={14}
          aria-hidden
        />
        <span className="truncate text-[11px] text-gray-400">
          {item.category.name}
        </span>
      </div>
      <p className="mt-0.5 truncate text-sm text-gray-200">{item.title}</p>
      <p className="text-xs text-gray-500">
        {item.planned_duration_min != null
          ? `${item.planned_duration_min} min`
          : '—'}
      </p>
    </>
  );
}

function ReadOnlySessionChip({ item }: { item: CalendarSession }) {
  return (
    <div className="rounded border border-gray-700 bg-gray-950 px-2 py-1.5">
      <SessionChipContent item={item} />
    </div>
  );
}

function EditableSessionChip({
  item,
  disabled,
  editing,
  editTitle,
  editDuration,
  editSaving,
  onEditTitleChange,
  onEditDurationChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: {
  item: CalendarSession;
  disabled: boolean;
  editing: boolean;
  editTitle: string;
  editDuration: string;
  editSaving: boolean;
  onEditTitleChange: (value: string) => void;
  onEditDurationChange: (value: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: item.id,
      disabled: disabled || editing,
      data: {
        sessionId: item.id,
        categoryId: item.category_id,
        day: item.day_of_week,
      },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  if (editing) {
    return (
      <div className="space-y-2 rounded border border-gray-600 bg-gray-950 p-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <CategoryGlyph
            icon={item.category.icon}
            color={item.category.color}
            size={14}
            aria-hidden
          />
          {item.category.name}
        </div>
        <input
          type="text"
          value={editTitle}
          onChange={(e) => onEditTitleChange(e.target.value)}
          className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1 text-sm text-white outline-none focus:border-gray-400"
          aria-label="Session title"
        />
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={editDuration}
            onChange={(e) => onEditDurationChange(e.target.value)}
            className="w-16 rounded border border-gray-600 bg-gray-900 px-2 py-1 text-sm text-white outline-none focus:border-gray-400"
            aria-label="Duration minutes"
          />
          <button
            type="button"
            disabled={editSaving}
            onClick={onSaveEdit}
            className="text-xs text-white underline underline-offset-2 disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-xs text-gray-400 underline underline-offset-2"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded border border-gray-700 bg-gray-950 px-2 py-1.5 ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          disabled={disabled}
          className="mt-0.5 shrink-0 cursor-grab touch-none text-gray-500 hover:text-gray-300 disabled:cursor-not-allowed disabled:opacity-40 active:cursor-grabbing"
          aria-label={`Drag ${item.title} to another day`}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onStartEdit}
          className="min-w-0 flex-1 text-left"
        >
          <SessionChipContent item={item} />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onDelete}
          className="shrink-0 text-xs text-gray-500 underline underline-offset-2 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
          aria-label={`Delete ${item.title}`}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function ReadOnlyDayColumn({
  day,
  items,
}: {
  day: number;
  items: CalendarSession[];
}) {
  return (
    <div className="rounded border border-gray-700 bg-gray-900/60 p-2">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {dayLabel(day)}
      </p>
      <ul className="mt-2 min-h-[3rem] space-y-1.5">
        {items.length === 0 ? (
          <li className="text-xs text-gray-600">No sessions</li>
        ) : (
          items.map((item) => (
            <li key={item.id}>
              <ReadOnlySessionChip item={item} />
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function EditableDayColumn({
  day,
  items,
  disabled,
  editingSessionId,
  editTitle,
  editDuration,
  editSaving,
  onEditTitleChange,
  onEditDurationChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDeleteSession,
}: {
  day: number;
  items: CalendarSession[];
  disabled: boolean;
  editingSessionId: string | null;
  editTitle: string;
  editDuration: string;
  editSaving: boolean;
  onEditTitleChange: (value: string) => void;
  onEditDurationChange: (value: string) => void;
  onStartEdit: (session: Session) => void;
  onSaveEdit: (session: Session) => void;
  onCancelEdit: () => void;
  onDeleteSession: (sessionId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${day}`,
    data: { day },
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded border p-2 ${
        isOver
          ? 'border-white/40 bg-gray-800/80'
          : 'border-gray-700 bg-gray-900/60'
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {dayLabel(day)}
      </p>
      <ul className="mt-2 min-h-[3rem] space-y-1.5">
        {items.length === 0 ? (
          <li className="text-xs text-gray-600">No sessions</li>
        ) : (
          items.map((item) => (
            <li key={item.id}>
              <EditableSessionChip
                item={item}
                disabled={disabled}
                editing={editingSessionId === item.id}
                editTitle={editTitle}
                editDuration={editDuration}
                editSaving={editSaving}
                onEditTitleChange={onEditTitleChange}
                onEditDurationChange={onEditDurationChange}
                onStartEdit={() => onStartEdit(item)}
                onSaveEdit={() => onSaveEdit(item)}
                onCancelEdit={onCancelEdit}
                onDelete={() => onDeleteSession(item.id)}
              />
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export function WeekPlanCalendar(props: WeekPlanCalendarProps) {
  const { sessions, disabled = false } = props;
  const byDay = groupSessionsByDay(sessions);

  if (props.readOnly) {
    return (
      <div className="space-y-2">
        {DAYS.map((day) => (
          <ReadOnlyDayColumn key={day} day={day} items={byDay[day]} />
        ))}
      </div>
    );
  }

  return (
    <EditableWeekPlanCalendar
      sessions={sessions}
      byDay={byDay}
      disabled={disabled}
      editingSessionId={props.editingSessionId}
      editTitle={props.editTitle}
      editDuration={props.editDuration}
      editSaving={props.editSaving}
      onEditTitleChange={props.onEditTitleChange}
      onEditDurationChange={props.onEditDurationChange}
      onStartEdit={props.onStartEdit}
      onSaveEdit={props.onSaveEdit}
      onCancelEdit={props.onCancelEdit}
      onMoveToDay={props.onMoveToDay}
      onDeleteSession={props.onDeleteSession}
    />
  );
}

function EditableWeekPlanCalendar({
  sessions,
  byDay,
  disabled,
  editingSessionId,
  editTitle,
  editDuration,
  editSaving,
  onEditTitleChange,
  onEditDurationChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onMoveToDay,
  onDeleteSession,
}: {
  sessions: CalendarSession[];
  byDay: Record<number, CalendarSession[]>;
  disabled: boolean;
  editingSessionId: string | null;
  editTitle: string;
  editDuration: string;
  editSaving: boolean;
  onEditTitleChange: (value: string) => void;
  onEditDurationChange: (value: string) => void;
  onStartEdit: (session: Session) => void;
  onSaveEdit: (session: Session) => void;
  onCancelEdit: () => void;
  onMoveToDay: (sessionId: string, day: number) => void;
  onDeleteSession: (sessionId: string) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const activeSession = activeId
    ? (sessions.find((s) => s.id === activeId) ?? null)
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const overId = String(over.id);
    if (!overId.startsWith('day-')) return;

    const day = Number(overId.replace('day-', ''));
    if (!Number.isInteger(day) || day < 0 || day > 6) return;

    const sessionId = String(active.id);
    const session = sessions.find((s) => s.id === sessionId);
    if (!session || session.day_of_week === day) return;

    onMoveToDay(sessionId, day);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="space-y-2">
        {DAYS.map((day) => (
          <EditableDayColumn
            key={day}
            day={day}
            items={byDay[day]}
            disabled={disabled || editingSessionId != null}
            editingSessionId={editingSessionId}
            editTitle={editTitle}
            editDuration={editDuration}
            editSaving={editSaving}
            onEditTitleChange={onEditTitleChange}
            onEditDurationChange={onEditDurationChange}
            onStartEdit={onStartEdit}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onDeleteSession={onDeleteSession}
          />
        ))}
      </div>

      <DragOverlay>
        {activeSession ? (
          <div className="rounded border border-gray-500 bg-gray-900 px-2 py-1.5 shadow-lg">
            <p className="text-[11px] text-gray-400">
              {activeSession.category.name}
            </p>
            <p className="text-sm text-white">{activeSession.title}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
