'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PRODUCT_CONFIG, PRODUCT_MODE } from '@/lib/product-config';

type Step = 'invite' | 'credentials';

function formatAuthError(message: string): string {
  const trimmed = message.trim();
  if (!trimmed || trimmed === '{}' || trimmed === '[object Object]') {
    return 'Invalid invite code';
  }
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('invite') ||
    lower.includes('database') ||
    lower.includes('unexpected')
  ) {
    return 'Invalid invite code';
  }
  return trimmed;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteFromUrl = searchParams.get('invite') ?? '';
  const authError = searchParams.get('error');

  const [step, setStep] = useState<Step>(
    inviteFromUrl ? 'credentials' : 'invite'
  );
  const [returningUser, setReturningUser] = useState(false);
  const [inviteCode, setInviteCode] = useState(inviteFromUrl);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    authError === 'auth_error' ? 'Invalid invite code' : null
  );

  function handleInviteContinue(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!inviteCode.trim()) {
      setError('Invite code is required');
      return;
    }
    setStep('credentials');
  }

  async function handleCredentials(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    if (returningUser) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setLoading(false);
        setError(signInError.message);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      let nextPath = '/onboarding';
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('current_weight_kg, height_cm, age')
          .eq('id', user.id)
          .maybeSingle();
        const complete =
          profile?.current_weight_kg != null &&
          profile?.height_cm != null &&
          profile?.age != null;
        if (complete) nextPath = '/today';
      }

      setLoading(false);
      router.push(nextPath);
      router.refresh();
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { invite_code: inviteCode.trim() },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(formatAuthError(signUpError.message));
      return;
    }

    if (!data.session) {
      setError(
        'Account created but no session returned. Disable "Confirm email" in Supabase Auth settings.'
      );
      return;
    }

    router.push('/onboarding');
    router.refresh();
  }

  if (step === 'invite' && !returningUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 text-white">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold">
            {PRODUCT_CONFIG[PRODUCT_MODE].appName}
          </h1>
          <p className="mt-1 text-sm text-gray-400">Enter your invite code</p>

          <form onSubmit={handleInviteContinue} className="mt-8 space-y-4">
            <div>
              <label htmlFor="invite" className="block text-sm text-gray-300">
                Invite code
              </label>
              <input
                id="invite"
                type="text"
                required
                autoFocus
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="mt-1 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-gray-500"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded bg-white px-3 py-2 text-sm font-medium text-gray-950 hover:bg-gray-200"
            >
              Continue
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setReturningUser(true);
              setStep('credentials');
              setError(null);
            }}
            className="mt-4 text-sm text-gray-400 underline hover:text-white"
          >
            I already have an account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 text-white">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold">
          {PRODUCT_CONFIG[PRODUCT_MODE].appName}
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          {returningUser ? 'Sign in' : 'Create your account'}
        </p>

        <form onSubmit={handleCredentials} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-gray-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="mt-1 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-gray-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={
                returningUser ? 'current-password' : 'new-password'
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="mt-1 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-gray-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-white px-3 py-2 text-sm font-medium text-gray-950 hover:bg-gray-200 disabled:opacity-50"
          >
            {loading
              ? 'Please wait…'
              : returningUser
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            if (returningUser) {
              setReturningUser(false);
              setStep(inviteCode ? 'credentials' : 'invite');
            } else {
              setStep('invite');
            }
            setError(null);
          }}
          className="mt-4 text-sm text-gray-400 underline hover:text-white"
        >
          {returningUser ? 'I have an invite code' : 'Back'}
        </button>
      </div>
    </div>
  );
}
