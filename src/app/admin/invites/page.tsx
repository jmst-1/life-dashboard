import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import {
  AdminInvitesClient,
  type InviteRow,
} from '@/components/admin/admin-invites-client';
import { createClient } from '@/lib/supabase/server';

export default async function AdminInvitesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    redirect('/today');
  }

  const { data: invites } = await supabase
    .from('invites')
    .select('*')
    .order('created_at', { ascending: false });

  const hdrs = headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host') ?? 'localhost:3000';
  const proto = hdrs.get('x-forwarded-proto') ?? 'http';
  const origin = `${proto}://${host}`;

  return (
    <div className="mx-auto min-h-screen max-w-phone bg-ld-bg px-5 pb-8 pt-6 text-ld-text">
      <h1 className="text-[26px] font-black">Invites</h1>
      <p className="mt-1 text-[13px] text-ld-text-sub">
        Admin-only invite codes. To grant yourself admin run in Supabase:{' '}
        <code className="text-[11px] text-ld-text-muted">
          update profiles set is_admin = true where id = &apos;your-uid&apos;;
        </code>
      </p>
      <AdminInvitesClient
        initialInvites={(invites ?? []) as InviteRow[]}
        origin={origin}
      />
    </div>
  );
}
