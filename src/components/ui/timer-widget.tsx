'use client';

import { Pause, Play, Square } from 'lucide-react';
import { useTimer } from '@/hooks/use-timer';

type TimerWidgetProps = {
  color: string;
  onStop: (elapsedSec: number) => void;
};

/** Session timer used inside tracked/seeded/AI sheets. Reports elapsed seconds on stop. */
export function TimerWidget({ color, onStop }: TimerWidgetProps) {
  const { state, elapsed, start, pause, resume, stop, fmt } = useTimer();

  function handleStop() {
    stop();
    onStop(elapsed);
  }

  return (
    <div className="mb-4 rounded-[14px] border border-ld-border bg-ld-surface-high p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1 text-[11px] tracking-wide text-ld-text-muted">
            SESSION TIMER
          </div>
          <div
            className="tabular-nums text-[28px] font-black transition-colors"
            style={{ color: state === 'running' ? color : undefined }}
          >
            <span className={state === 'running' ? '' : 'text-ld-text-sub'}>
              {fmt(elapsed)}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {state === 'idle' && (
            <button
              type="button"
              onClick={start}
              style={{ background: color }}
              className="flex items-center gap-1.5 rounded-[10px] px-4 py-2.5 text-[13px] font-bold text-white"
            >
              <Play size={13} className="fill-white" />
              Start
            </button>
          )}
          {state === 'running' && (
            <button
              type="button"
              onClick={pause}
              className="flex items-center gap-1.5 rounded-[10px] border border-ld-border bg-ld-surface-pop px-4 py-2.5 text-[13px] font-bold text-ld-text"
            >
              <Pause size={13} className="fill-ld-text" />
              Pause
            </button>
          )}
          {state === 'paused' && (
            <button
              type="button"
              onClick={resume}
              style={{ background: color }}
              className="flex items-center gap-1.5 rounded-[10px] px-4 py-2.5 text-[13px] font-bold text-white"
            >
              <Play size={13} className="fill-white" />
              Resume
            </button>
          )}
          {state !== 'idle' && (
            <button
              type="button"
              onClick={handleStop}
              className="flex items-center gap-1.5 rounded-[10px] border border-ld-red/40 bg-ld-red-dim px-3.5 py-2.5 text-[13px] font-bold text-ld-red"
            >
              <Square size={13} className="fill-ld-red" />
              Stop
            </button>
          )}
        </div>
      </div>
      {state === 'running' && (
        <div className="mt-2.5 h-[3px] overflow-hidden rounded-sm bg-ld-border">
          <div
            className="h-full transition-[width] duration-1000 ease-linear"
            style={{
              background: color,
              width: `${Math.min(100, (elapsed / 3600) * 100)}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}
