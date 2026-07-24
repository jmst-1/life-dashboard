import { redirect } from 'next/navigation';

export default function WeekCurrentRedirect() {
  redirect('/today');
}
