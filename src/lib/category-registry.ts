import type { Category, SessionRenderer } from '@/types';
import { buildCyclingPrompt } from '@/lib/prompts/cycling';
import { buildStrengthPrompt } from '@/lib/prompts/strength';
import { buildGenericPrompt } from '@/lib/prompts/generic';

export type CategoryRegistryEntry = {
  typeKey: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- prompt ctx shapes differ by category
  promptBuilder: ((ctx: any) => string) | null;
  sessionRenderer: SessionRenderer;
};

const CYCLING_ENTRY: CategoryRegistryEntry = {
  typeKey: 'cycling',
  promptBuilder: buildCyclingPrompt,
  sessionRenderer: 'cycling',
};

const STRENGTH_ENTRY: CategoryRegistryEntry = {
  typeKey: 'strength',
  promptBuilder: buildStrengthPrompt,
  sessionRenderer: 'strength',
};

const MOVEMENT_ENTRY: CategoryRegistryEntry = {
  typeKey: 'movement',
  promptBuilder: null,
  sessionRenderer: 'movement',
};

const GENERIC_ENTRY: CategoryRegistryEntry = {
  typeKey: 'generic',
  promptBuilder: buildGenericPrompt,
  sessionRenderer: 'generic',
};

export function getCategoryRegistryEntry(
  category: Category
): CategoryRegistryEntry {
  if (category.name === 'Cycling') return CYCLING_ENTRY;
  if (category.name === 'Strength') return STRENGTH_ENTRY;
  if (category.tracking_type === 'random_pick') return MOVEMENT_ENTRY;
  return GENERIC_ENTRY;
}
