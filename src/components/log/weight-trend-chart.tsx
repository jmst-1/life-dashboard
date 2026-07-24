'use client';

import { format, parseISO, subDays } from 'date-fns';
import type { WeightLog } from '@/types';

type WeightTrendChartProps = {
  logs: WeightLog[];
  goalWeightKg: number | null;
};

const WIDTH = 320;
const HEIGHT = 120;
const PAD_X = 8;
const PAD_Y = 12;

export function WeightTrendChart({ logs, goalWeightKg }: WeightTrendChartProps) {
  const cutoff = subDays(new Date(), 90);
  const points = logs
    .filter((l) => parseISO(l.logged_date) >= cutoff)
    .map((l) => ({
      date: parseISO(l.logged_date),
      weight: Number(l.weight_kg),
    }))
    .filter((p) => !Number.isNaN(p.weight))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (points.length === 0) {
    return (
      <div className="mb-5 rounded-2xl border border-ld-border bg-ld-surface p-4">
        <div className="mb-2 text-[11px] font-bold tracking-wide text-ld-text-muted">
          WEIGHT TREND
        </div>
        <p className="text-[12px] text-ld-text-sub">
          Log weigh-ins in Settings to see a 90-day trend.
        </p>
      </div>
    );
  }

  const weights = points.map((p) => p.weight);
  if (goalWeightKg != null) weights.push(goalWeightKg);
  const minW = Math.min(...weights) - 1;
  const maxW = Math.max(...weights) + 1;
  const rangeW = Math.max(maxW - minW, 0.5);
  const t0 = points[0].date.getTime();
  const t1 = points[points.length - 1].date.getTime();
  const rangeT = Math.max(t1 - t0, 1);

  function xFor(date: Date) {
    return PAD_X + ((date.getTime() - t0) / rangeT) * (WIDTH - PAD_X * 2);
  }
  function yFor(weight: number) {
    return PAD_Y + ((maxW - weight) / rangeW) * (HEIGHT - PAD_Y * 2);
  }

  const linePath = points
    .map((p, i) => {
      const x = xFor(p.date);
      const y = yFor(p.weight);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const goalY =
    goalWeightKg != null ? yFor(goalWeightKg) : null;
  const startWeight = points[0].weight;
  const endWeight = points[points.length - 1].weight;

  return (
    <div className="mb-5 rounded-2xl border border-ld-border bg-ld-surface p-4">
      <div className="mb-1 flex items-baseline justify-between">
        <div className="text-[11px] font-bold tracking-wide text-ld-text-muted">
          WEIGHT TREND
        </div>
        <div className="text-[12px] font-bold text-ld-text">
          {endWeight.toFixed(1)} kg
          <span className="ml-1.5 text-[10px] font-normal text-ld-text-muted">
            {endWeight >= startWeight ? '+' : ''}
            {(endWeight - startWeight).toFixed(1)} · 90d
          </span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 h-auto w-full"
        role="img"
        aria-label="Weight trend last 90 days"
      >
        {goalY != null && (
          <line
            x1={PAD_X}
            y1={goalY}
            x2={WIDTH - PAD_X}
            y2={goalY}
            stroke="var(--ld-amber)"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.7}
          />
        )}
        <path
          d={linePath}
          fill="none"
          stroke="var(--ld-orange)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle
            key={`${p.date.toISOString()}-${i}`}
            cx={xFor(p.date)}
            cy={yFor(p.weight)}
            r={i === points.length - 1 ? 3.5 : 2}
            fill={i === points.length - 1 ? 'var(--ld-orange)' : 'var(--ld-surface-pop)'}
            stroke="var(--ld-orange)"
            strokeWidth={1.5}
          />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[9px] text-ld-text-muted">
        <span>{format(points[0].date, 'MMM d')}</span>
        {goalWeightKg != null && (
          <span className="text-ld-amber">Goal {goalWeightKg} kg</span>
        )}
        <span>{format(points[points.length - 1].date, 'MMM d')}</span>
      </div>
    </div>
  );
}
