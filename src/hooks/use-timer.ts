'use client';

import { useEffect, useRef, useState } from 'react';

export type TimerState = 'idle' | 'running' | 'paused';

export type UseTimerResult = {
  state: TimerState;
  elapsed: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  fmt: (seconds: number) => string;
};

export function fmtElapsed(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** idle|running|paused stopwatch. `elapsed` ticks once per second while running. */
export function useTimer(): UseTimerResult {
  const [state, setState] = useState<TimerState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearTick() {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function tick() {
    clearTick();
    intervalRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
  }

  function start() {
    setState('running');
    tick();
  }

  function pause() {
    setState('paused');
    clearTick();
  }

  function resume() {
    setState('running');
    tick();
  }

  function stop() {
    setState('idle');
    clearTick();
  }

  useEffect(() => clearTick, []);

  return { state, elapsed, start, pause, resume, stop, fmt: fmtElapsed };
}
