import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createInviteSchema } from '@/lib/validations/invite';

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return {
      supabase,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { supabase, user, error: null as null };
}

function shortCode() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
}

export async function GET() {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { data, error: listError } = await supabase
    .from('invites')
    .select('*')
    .order('created_at', { ascending: false });

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  return NextResponse.json({ invites: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user, error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createInviteSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid invite payload';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const code = (parsed.data.code?.trim() || shortCode()).toUpperCase();
  let expiresAt: string | null = null;
  if (parsed.data.expires_at) {
    expiresAt = parsed.data.expires_at.includes('T')
      ? parsed.data.expires_at
      : `${parsed.data.expires_at}T23:59:59.000Z`;
  }

  const { data, error: insertError } = await supabase
    .from('invites')
    .insert({
      code,
      max_uses: parsed.data.max_uses,
      expires_at: expiresAt,
      created_by: user!.id,
    })
    .select('*')
    .single();

  if (insertError) {
    const status = insertError.code === '23505' ? 409 : 500;
    return NextResponse.json(
      { error: insertError.message },
      { status }
    );
  }

  return NextResponse.json({ invite: data }, { status: 201 });
}
