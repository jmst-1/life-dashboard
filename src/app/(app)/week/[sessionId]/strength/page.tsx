import { notFound, redirect } from 'next/navigation';
import { SetHeader } from '@/components/layout/header-context';
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
    <div className="px-5 pb-8 pt-4 text-ld-text">
      <SetHeader title={session.title} backHref="/today" backLabel="Back to Today" />
      <StrengthSessionForm session={session} canEdit={!!canEdit} />
    </div>
  );
}
