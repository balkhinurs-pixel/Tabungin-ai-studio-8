
'use client';

import Header from '@/components/layout/Header';
import AppSidebar from '@/components/layout/AppSidebar';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const MainContent = (
    <main className="p-4 sm:p-6 lg:p-8 pb-24 sm:pb-6">{children}</main>
  );

  return (
    <>
      {/* Mobile View with bottom nav */}
      <div className="sm:hidden">
        <div className="flex min-h-screen w-full flex-col">
          <Header />
          {MainContent}
          <MobileBottomNav />
        </div>
      </div>

      {/* Desktop View with sidebar */}
      <div className="hidden sm:block">
        <SidebarProvider>
          <Sidebar>
            <AppSidebar />
          </Sidebar>
          <SidebarInset>
            <Header />
            {MainContent}
          </SidebarInset>
        </SidebarProvider>
      </div>
    </>
  );
}
