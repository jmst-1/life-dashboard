import { differenceInWeeks } from 'date-fns';
import type { TrainingPhase } from '@/types';

export function derivePhase(
  goalEventDate: string | null,
  today: Date = new Date()
): TrainingPhase | null {
  if (!goalEventDate) return null;
  const weeksOut = differenceInWeeks(new Date(goalEventDate), today);
  if (weeksOut < 0) return 'recovery';
  if (weeksOut === 0) return 'race_week';
  if (weeksOut <= 2) return 'taper';
  if (weeksOut <= 6) return 'peak';
  if (weeksOut <= 12) return 'build';
  return 'base';
}
