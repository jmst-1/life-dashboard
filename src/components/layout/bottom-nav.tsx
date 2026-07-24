'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Clock, Settings, Sun } from 'lucide-react';

const TABS = [
  { href: '/today', label: 'Today', icon: Sun },
  { href: '/ahead', label: 'Ahead', icon: CalendarDays },
  { href: '/log', label: 'Log', icon: Clock },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === '/settings') {
    return pathname === '/settings' || pathname.startsWith('/settings/');
  }
  if (href === '/today') {
    return (
      pathname === '/today' ||
      pathname.startsWith('/week/') ||
      pathname === '/'
    );
  }
  if (href === '/ahead') {
    return pathname === '/ahead' || pathname.startsWith('/plan');
  }
  if (href === '/log') {
    return pathname === '/log' || pathname.startsWith('/history');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ld-border bg-ld-surface/95 backdrop-blur"
      aria-label="Main"
    >
      <ul className="mx-auto flex max-w-phone items-stretch px-0 pb-[env(safe-area-inset-bottom)] pt-2">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className="flex min-h-[44px] flex-col items-center justify-center gap-1 px-0 py-2"
              >
                <Icon
                  size={21}
                  strokeWidth={active ? 2.25 : 1.75}
                  className={active ? 'text-ld-orange' : 'text-ld-text-muted'}
                  aria-hidden
                />
                <span
                  className={`text-[10px] tracking-wide ${
                    active
                      ? 'font-extrabold text-ld-orange'
                      : 'font-normal text-ld-text-muted'
                  }`}
                >
                  {label}
                </span>
                {active ? (
                  <span className="-mt-0.5 h-0.5 w-4 rounded-sm bg-ld-orange" />
                ) : (
                  <span className="-mt-0.5 h-0.5 w-4" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
