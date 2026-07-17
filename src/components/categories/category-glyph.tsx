import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Bike,
  BookOpen,
  ClipboardList,
  Coffee,
  Dumbbell,
  Flame,
  Footprints,
  Gamepad2,
  HeartPulse,
  Medal,
  Moon,
  Mountain,
  Music,
  Pencil,
  PersonStanding,
  Sailboat,
  Snowflake,
  StretchHorizontal,
  Sun,
  Sunrise,
  Target,
  Timer,
  TreePine,
  Trophy,
  Waves,
  Wind,
  Zap,
} from 'lucide-react';
import {
  normalizeCategoryIcon,
  type CategoryIconKey,
} from '@/lib/category-templates';

const ICON_MAP: Record<CategoryIconKey, LucideIcon> = {
  bike: Bike,
  dumbbell: Dumbbell,
  'person-standing': PersonStanding,
  sunrise: Sunrise,
  footprints: Footprints,
  waves: Waves,
  flame: Flame,
  'heart-pulse': HeartPulse,
  timer: Timer,
  'clipboard-list': ClipboardList,
  mountain: Mountain,
  activity: Activity,
  'stretch-horizontal': StretchHorizontal,
  target: Target,
  zap: Zap,
  trophy: Trophy,
  medal: Medal,
  music: Music,
  'book-open': BookOpen,
  coffee: Coffee,
  pencil: Pencil,
  'gamepad-2': Gamepad2,
  snowflake: Snowflake,
  sun: Sun,
  moon: Moon,
  'tree-pine': TreePine,
  wind: Wind,
  sailboat: Sailboat,
};

type CategoryGlyphProps = {
  icon: string;
  color: string;
  size?: number;
  className?: string;
  'aria-label'?: string;
};

export function CategoryGlyph({
  icon,
  color,
  size = 20,
  className = '',
  'aria-label': ariaLabel,
}: CategoryGlyphProps) {
  const key = normalizeCategoryIcon(icon);
  const Icon = ICON_MAP[key];

  return (
    <Icon
      size={size}
      strokeWidth={2}
      absoluteStrokeWidth
      className={`shrink-0 ${className}`.trim()}
      style={{ color }}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    />
  );
}
