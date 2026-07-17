import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCategories } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const categories = await getCategories(supabase, user.id, 'active');
  const hasCycling = categories.some((c) => c.name === 'Cycling');
  const hasStrength = categories.some((c) => c.name === 'Strength');

  const links: { href: string; label: string; description: string }[] = [
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
      href: '/settings/categories',
      label: 'Categories',
      description: 'Activities you track each week',
    },
  ];

  if (hasCycling) {
    links.push({
      href: '/settings/coach/cycling',
      label: 'Cycling Coach',
      description: 'FTP, phase, equipment, goals',
    });
  }

  if (hasStrength) {
    links.push({
      href: '/settings/coach/strength',
      label: 'Strength Coach',
      description: 'Level, equipment, goals',
    });
  }

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8 pb-24 text-white">
      <div className="mx-auto max-w-md">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-gray-400">
          Profile, categories, and coach context.
        </p>

        <nav className="mt-8 space-y-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded border border-gray-700 bg-gray-900 px-4 py-3 hover:border-gray-500"
            >
              <span className="block text-sm font-medium text-white">
                {link.label}
              </span>
              <span className="mt-0.5 block text-xs text-gray-400">
                {link.description}
              </span>
            </Link>
          ))}
        </nav>

        <form action="/api/auth/signout" method="POST" className="mt-10">
          <button
            type="submit"
            className="w-full rounded border border-gray-600 px-4 py-2.5 text-sm text-gray-300 hover:border-gray-400 hover:text-white"
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );
}
