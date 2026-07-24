/**
 * AI usage cap (Session 12).
 * Wire into Claude routes before callClaude(). Movement/tracked paths stay ungated.
 * ai_usage_log is select-only under user RLS; inserts use the service role client.
 */

import { startOfWeek } from 'date-fns';
import { createServiceClient } from '@/lib/supabase/service';

export type AiCallType =
  | 'cycling_plan'
  | 'strength_plan'
  | 'nutrition_brief'
  | 'week_commentary'
  | 'custom_category_plan';

export const WEEKLY_AI_CAP = 40;

export function aiUsageWeekStart(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export async function getAiUsageCount(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string
): Promise<{ used: number; cap: number; error?: string }> {
  const since = aiUsageWeekStart().toISOString();

  const { count, error: countError } = await supabase
    .from('ai_usage_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);

  if (countError) {
    return { used: 0, cap: WEEKLY_AI_CAP, error: countError.message };
  }

  return { used: count ?? 0, cap: WEEKLY_AI_CAP };
}

export async function checkAndLogAiUsage(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  userId: string;
  weekId?: string | null;
  callType: AiCallType;
  estimatedCostUsd?: number;
}): Promise<{ allowed: boolean; used: number; cap: number; error?: string }> {
  const { supabase, userId, weekId, callType, estimatedCostUsd } = args;

  const usage = await getAiUsageCount(supabase, userId);
  if (usage.error) {
    return {
      allowed: false,
      used: usage.used,
      cap: usage.cap,
      error: usage.error,
    };
  }

  if (usage.used >= WEEKLY_AI_CAP) {
    return { allowed: false, used: usage.used, cap: WEEKLY_AI_CAP };
  }

  const service = createServiceClient();
  const { error: insertError } = await service.from('ai_usage_log').insert({
    user_id: userId,
    week_id: weekId ?? null,
    call_type: callType,
    estimated_cost_usd: estimatedCostUsd ?? null,
  });

  if (insertError) {
    return {
      allowed: false,
      used: usage.used,
      cap: WEEKLY_AI_CAP,
      error: insertError.message,
    };
  }

  return { allowed: true, used: usage.used + 1, cap: WEEKLY_AI_CAP };
}

export function capReachedResponse(used: number, cap: number, error?: string) {
  return {
    error: 'cap_reached' as const,
    message:
      error ??
      `Weekly AI usage cap reached (${used}/${cap}). Resets Monday.`,
    used,
    cap,
  };
}
