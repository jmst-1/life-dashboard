import type { Category, SessionRenderer } from '@/types';
import { buildCyclingPrompt } from '@/lib/prompts/cycling';
import { buildStrengthPrompt } from '@/lib/prompts/strength';
import { buildRunningPrompt } from '@/lib/prompts/running';
import { buildSwimmingPrompt } from '@/lib/prompts/swimming';
import { buildTriathlonPrompt } from '@/lib/prompts/triathlon';
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

const RUNNING_ENTRY: CategoryRegistryEntry = {
  typeKey: 'running',
  promptBuilder: buildRunningPrompt,
  sessionRenderer: 'generic',
};

const SWIMMING_ENTRY: CategoryRegistryEntry = {
  typeKey: 'swimming',
  promptBuilder: buildSwimmingPrompt,
  sessionRenderer: 'generic',
};

const TRIATHLON_ENTRY: CategoryRegistryEntry = {
  typeKey: 'triathlon',
  promptBuilder: buildTriathlonPrompt,
  sessionRenderer: 'generic',
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
  if (category.name === 'Running') return RUNNING_ENTRY;
  if (category.name === 'Swimming') return SWIMMING_ENTRY;
  if (category.name === 'Triathlon') return TRIATHLON_ENTRY;
  if (
    category.tracking_type === 'random_pick' ||
    category.mode === 'seeded'
  ) {
    return MOVEMENT_ENTRY;
  }
  if (category.tracking_type === 'tracked' || category.mode === 'tracked') {
    return {
      typeKey: 'tracked',
      promptBuilder: null,
      sessionRenderer: 'generic',
    };
  }
  return GENERIC_ENTRY;
}
