'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useHeader } from '@/components/layout/header-context';

function defaultsForPath(pathname: string): {
  title: string;
  backHref?: string;
} {
  if (pathname === '/today' || pathname === '/') {
    return { title: 'Today' };
  }
  if (pathname === '/ahead' || pathname.startsWith('/plan')) {
    return { title: 'Ahead' };
  }
  if (pathname === '/log' || pathname.startsWith('/history')) {
    return { title: 'Log' };
  }
  if (pathname === '/settings') {
    return { title: 'Settings' };
  }
  if (pathname === '/settings/profile') {
    return { title: 'Profile', backHref: '/settings' };
  }
  if (pathname === '/settings/weight') {
    return { title: 'Weight Log', backHref: '/settings' };
  }
  if (pathname === '/settings/goals') {
    return { title: 'Goal Events', backHref: '/settings' };
  }
  if (pathname === '/settings/categories') {
    return { title: 'Categories', backHref: '/settings' };
  }
  if (pathname === '/settings/coach/strength') {
    return { title: 'Strength Coach', backHref: '/settings' };
  }
  if (pathname === '/settings/coach/cycling') {
    return { title: 'Cycling Coach', backHref: '/settings' };
  }
  if (pathname.startsWith('/week/') && pathname.endsWith('/strength')) {
    return { title: 'Log strength', backHref: '/today' };
  }
  if (pathname.startsWith('/settings/')) {
    return { title: 'Settings', backHref: '/settings' };
  }
  return { title: '' };
}

export function AppHeader() {
  const pathname = usePathname();
  const { header } = useHeader();
  const fallback = defaultsForPath(pathname);

  const title = header.title || fallback.title;
  const backHref =
    header.backHref !== undefined && header.backHref !== null
      ? header.backHref
      : fallback.backHref;
  const backLabel = header.backLabel ?? 'Back';
  const rightSlot = header.rightSlot;

  return (
    <header className="sticky top-0 z-30 border-b border-ld-border/60 bg-ld-bg/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-phone items-center gap-2 px-3">
        <div className="flex w-10 shrink-0 items-center justify-start">
          {backHref ? (
            <Link
              href={backHref}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-ld-text-sub hover:bg-ld-surface-high hover:text-ld-text"
              aria-label={backLabel}
            >
              <ChevronLeft size={22} strokeWidth={2.25} />
            </Link>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          {title ? (
            <h1 className="truncate text-center text-[17px] font-extrabold text-ld-text">
              {title}
            </h1>
          ) : null}
        </div>

        <div className="flex w-10 shrink-0 items-center justify-end">
          {rightSlot ?? null}
        </div>
      </div>
    </header>
  );
}
