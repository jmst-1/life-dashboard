'use client';

import {
  computeWeekScore,
  scoreBandColor,
  scoreBandTextClass,
} from '@/lib/week-score';
import type { Category, Session } from '@/types';

type ScoreRingProps = {
  categories: Category[];
  sessions: Session[];
};

const SIZE = 200;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RADIUS = 78;
const STROKE = 14;
const GAP_DEG = 3;

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number
): string {
  const start = polarToCartesian(cx, cy, r, endDeg);
  const end = polarToCartesian(cx, cy, r, startDeg);
  const largeArc = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export function ScoreRing({ categories, sessions }: ScoreRingProps) {
  const { overall, segments } = computeWeekScore(categories, sessions);
  const bandColor = scoreBandColor(overall);
  const textClass = scoreBandTextClass(overall);

  const totalPlanned = segments.reduce((sum, s) => sum + s.plannedMin, 0);
  const usable = 360 - segments.length * GAP_DEG;

  let cursor = 0;
  const arcs = segments.map((seg) => {
    const share =
      totalPlanned > 0
        ? seg.plannedMin / totalPlanned
        : 1 / Math.max(segments.length, 1);
    const sweep = Math.max(share * usable, 0.5);
    const start = cursor;
    const end = cursor + sweep;
    cursor = end + GAP_DEG;

    const fillRatio =
      seg.plannedMin > 0
        ? Math.min(seg.actualMin / seg.plannedMin, 1)
        : seg.completedSessions > 0
          ? 1
          : 0;
    const filledEnd = start + sweep * fillRatio;

    return { seg, start, end, filledEnd, fillRatio };
  });

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          aria-label={`Week score ${overall}`}
        >
          {arcs.length === 0 ? (
            <circle
              cx={CX}
              cy={CY}
              r={RADIUS}
              fill="none"
              stroke="#374151"
              strokeWidth={STROKE}
            />
          ) : (
            arcs.map(({ seg, start, end, filledEnd, fillRatio }) => (
              <g key={seg.categoryId}>
                <path
                  d={describeArc(CX, CY, RADIUS, start, end)}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={STROKE}
                  strokeOpacity={0.25}
                  strokeLinecap="butt"
                />
                {fillRatio > 0 && (
                  <path
                    d={describeArc(CX, CY, RADIUS, start, filledEnd)}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={STROKE}
                    strokeLinecap="butt"
                  />
                )}
              </g>
            ))
          )}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`text-4xl font-semibold tabular-nums ${textClass}`}
            style={{ color: bandColor }}
          >
            {overall}
          </span>
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
            Score
          </span>
        </div>
      </div>
    </div>
  );
}
