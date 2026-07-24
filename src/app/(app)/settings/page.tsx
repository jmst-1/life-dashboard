import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SetHeader } from '@/components/layout/header-context';
import { getAiUsageCount } from '@/lib/ai-usage';
import { getCategories } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { getCategoryMode } from '@/lib/category-mode';
import { ChevronRight } from 'lucide-react';

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [categories, usage] = await Promise.all([
    getCategories(supabase, user.id, 'active'),
    getAiUsageCount(supabase, user.id),
  ]);
  const aiCats = categories.filter((c) => getCategoryMode(c) === 'ai');

  const rows: { href: string; label: string; description: string }[] = [
    {
      href: '/settings/profile',
      label: 'Profile',
      description: 'Weight, height, activity, deficit strategy',
    },
    {
      href: '/settings/weight',
      label: 'Weight Log',
      description: 'Weigh-ins and history',
    },
    {
      href: '/settings/goals',
      label: 'Goal Events',
      description: 'Races, targets, and key dates',
    },
    {
      href: '/settings/categories',
      label: 'Categories',
      description: `${categories.length} active`,
    },
  ];

  return (
    <div className="px-5 pb-8 pt-4 text-ld-text">
      <SetHeader title="Settings" />
      <p className="text-[13px] text-ld-text-sub">
        Profile, categories, and coach context.
      </p>

      <p className="mt-3 text-[12px] text-ld-text-muted">
        AI calls this week: {usage.used} / {usage.cap} — resets Monday
      </p>

      <nav className="mt-5 flex flex-col gap-2.5">
        {rows.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-3.5 rounded-[14px] border border-ld-border bg-ld-surface px-4 py-[15px]"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">{link.label}</div>
              <div className="text-xs text-ld-text-sub">{link.description}</div>
            </div>
            <ChevronRight size={14} className="text-ld-text-muted" />
          </Link>
        ))}
      </nav>

      <div className="mb-2.5 mt-6 text-[11px] font-bold tracking-wider text-ld-text-muted">
        COACH CONTEXT
      </div>
      <div className="flex flex-col gap-2.5">
        <Link
          href="/settings/coach/nutrition"
          className="flex items-center gap-3 rounded-[14px] border border-ld-border bg-ld-surface px-4 py-3"
        >
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold">Nutrition Coach</div>
            <div className="text-[11px] text-ld-text-sub">
              Dietary prefs for meal prep
            </div>
          </div>
          <ChevronRight size={14} className="text-ld-text-muted" />
        </Link>
        {aiCats.map((cat) => {
          const coachHrefByName: Record<string, string> = {
            Cycling: '/settings/coach/cycling',
            Strength: '/settings/coach/strength',
            Running: '/settings/coach/running',
            Swimming: '/settings/coach/swimming',
            Triathlon: '/settings/coach/triathlon',
          };
          const href =
            coachHrefByName[cat.name] ?? '/settings/categories';
          return (
            <Link
              key={cat.id}
              href={href}
              className="flex items-center gap-3 rounded-[14px] border border-ld-border bg-ld-surface px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold">{cat.name} Coach</div>
                <div className="text-[11px] text-ld-text-sub">
                  Context, equipment, goals
                </div>
              </div>
              <ChevronRight size={14} className="text-ld-text-muted" />
            </Link>
          );
        })}
      </div>

      <form action="/api/auth/signout" method="POST" className="mt-6">
        <button
          type="submit"
          className="w-full rounded-[14px] border border-ld-border py-[15px] text-sm font-bold text-ld-red"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
