import { AppHeader } from '@/components/layout/app-header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { HeaderProvider } from '@/components/layout/header-context';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HeaderProvider>
      <div className="min-h-screen bg-ld-bg">
        <AppHeader />
        <main className="mx-auto min-h-screen max-w-phone pb-20">{children}</main>
        <BottomNav />
      </div>
    </HeaderProvider>
  );
}
