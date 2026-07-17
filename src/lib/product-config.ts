export type ProductMode = 'fitness' | 'dashboard';

export const PRODUCT_MODE = (process.env.NEXT_PUBLIC_PRODUCT_MODE ??
  'dashboard') as ProductMode;

export const PRODUCT_CONFIG: Record<
  ProductMode,
  {
    appName: string;
    tagline: string;
    allowCustomCategories: boolean;
    starterCategories: string[];
  }
> = {
  fitness: {
    appName: 'Fitness Coach',
    tagline: 'AI-coached training and nutrition',
    allowCustomCategories: false,
    starterCategories: ['cycling', 'strength', 'mobility', 'morning_stretch'],
  },
  dashboard: {
    appName: 'Life Dashboard',
    tagline: 'Your weekly operating system',
    allowCustomCategories: true,
    starterCategories: ['cycling', 'strength', 'mobility', 'morning_stretch'],
  },
};
