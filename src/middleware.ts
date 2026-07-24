import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/** APIs allowed while profile is incomplete (onboarding). */
function isOnboardingApiAllowed(pathname: string, method: string): boolean {
  if (pathname === '/api/auth/signout') return true;
  if (pathname === '/api/profile' && (method === 'GET' || method === 'PATCH')) {
    return true;
  }
  if (pathname === '/api/categories' && method === 'POST') return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { supabase, response } = await updateSession(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const method = request.method;

  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = search;
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('current_weight_kg, height_cm, age, is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (pathname.startsWith('/admin')) {
    if (!profile?.is_admin) {
      const todayUrl = request.nextUrl.clone();
      todayUrl.pathname = '/today';
      todayUrl.search = '';
      return NextResponse.redirect(todayUrl);
    }
    return response;
  }

  const isComplete =
    profile?.current_weight_kg != null &&
    profile?.height_cm != null &&
    profile?.age != null;

  if (isComplete && pathname === '/onboarding') {
    const todayUrl = request.nextUrl.clone();
    todayUrl.pathname = '/today';
    todayUrl.search = '';
    return NextResponse.redirect(todayUrl);
  }

  if (!isComplete) {
    if (pathname.startsWith('/api/')) {
      if (!isOnboardingApiAllowed(pathname, method)) {
        return NextResponse.json(
          { error: 'Complete onboarding first' },
          { status: 403 }
        );
      }
      return response;
    }

    if (pathname !== '/onboarding') {
      const onboardingUrl = request.nextUrl.clone();
      onboardingUrl.pathname = '/onboarding';
      onboardingUrl.search = '';
      return NextResponse.redirect(onboardingUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login|callback|sw\\.js|manifest\\.json|offline\\.html|icon-.*\\.png).*)',
  ],
};
