import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { supabase, response } = await updateSession(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = search;
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('current_weight_kg, height_cm, age')
    .eq('id', user.id)
    .maybeSingle();

  const isComplete =
    profile?.current_weight_kg != null &&
    profile?.height_cm != null &&
    profile?.age != null;

  // Allow API routes during onboarding (profile + categories PATCH/POST).
  if (
    !isComplete &&
    pathname !== '/onboarding' &&
    !pathname.startsWith('/api/')
  ) {
    const onboardingUrl = request.nextUrl.clone();
    onboardingUrl.pathname = '/onboarding';
    onboardingUrl.search = '';
    return NextResponse.redirect(onboardingUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login|callback).*)'],
};
