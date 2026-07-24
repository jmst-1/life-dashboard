import { redirect } from 'next/navigation';

export default function PlanRedirect({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  const q = searchParams.week
    ? `?plan=${encodeURIComponent(searchParams.week)}`
    : '?plan=1';
  redirect(`/ahead${q}`);
}
