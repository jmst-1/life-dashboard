import type { Session } from '@/types';

/** Rest days stored as sessions (common for cycling plans). */
export function isRestSession(session: Session): boolean {
  if (session.planned_duration_min === 0) return true;
  return /^\s*rest(\s+day)?\s*$/i.test(session.title);
}
