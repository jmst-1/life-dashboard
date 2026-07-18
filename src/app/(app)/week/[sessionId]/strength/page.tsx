import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { StrengthSessionForm } from '@/components/week/strength-session-form';
import { getSessionById, getWeekById } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

type StrengthSessionPageProps = {
  params: { sessionId: string };
};

export default async function StrengthSessionPage({
  params,
}: StrengthSessionPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const session = await getSessionById(supabase, user.id, params.sessionId);
  if (!session || !session.blocks || session.blocks.length === 0) {
    notFound();
  }

  const week = await getWeekById(supabase, user.id, session.week_id);
  const canEdit = week?.status === 'active';

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8 pb-24 text-white">
      <div className="mx-auto max-w-md space-y-4">
        <Link
          href="/week/current"
          className="inline-flex text-sm text-gray-400 underline underline-offset-2 hover:text-white"
        >
          ← Back to week
        </Link>
        <StrengthSessionForm session={session} canEdit={!!canEdit} />
      </div>
    </div>
  );
}
