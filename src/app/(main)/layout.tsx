'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/layout/Header';
import AppSidebar from '@/components/layout/AppSidebar';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDashboard = pathname === '/dashboard';

  return (
    <>
      {/* Mobile View with Curved Blue Backdrop & Bottom Nav */}
      <div className="sm:hidden">
        <div className="relative flex min-h-screen w-full flex-col bg-[#EEF5FF] overflow-x-hidden">
          {isDashboard && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 inset-x-0 h-[232px] z-0 overflow-hidden"
            >
              <svg
                viewBox="0 0 390 232"
                fill="none"
                preserveAspectRatio="none"
                className="h-full w-full"
              >
                <defs>
                  <linearGradient
                    id="tabungin-top-wave"
                    x1="0"
                    y1="0"
                    x2="390"
                    y2="220"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor="#074AB8" />
                    <stop offset="55%" stopColor="#146EE6" />
                    <stop offset="100%" stopColor="#3B9DF8" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 0H390V174C305 214 140 225 0 184V0Z"
                  fill="url(#tabungin-top-wave)"
                />
                <path
                  d="M-20 40C90 -10 215 110 410 35V0H-20V40Z"
                  fill="#FFFFFF"
                  fillOpacity="0.06"
                />
                <path
                  d="M-10 158C105 204 260 198 400 132V178C265 224 100 228 -10 186V158Z"
                  fill="#67BFFF"
                  fillOpacity="0.22"
                />
              </svg>
            </div>
          )}

          {/* Subtle Decorative Bottom Wave above MobileBottomNav */}
          <div
            aria-hidden="true"
            className="pointer-events-none fixed bottom-[60px] inset-x-0 h-[86px] z-0 opacity-90"
          >
            <svg
              viewBox="0 0 390 86"
              fill="none"
              preserveAspectRatio="none"
              className="h-full w-full"
            >
              <path
                d="M0 44C95 8 235 66 390 18V86H0V44Z"
                fill="#D4E8FF"
                fillOpacity="0.55"
              />
              <path
                d="M0 58C125 26 265 76 390 38V86H0V58Z"
                fill="#B8DAFF"
                fillOpacity="0.45"
              />
            </svg>
          </div>

          <Header />
          <main className="relative z-10 flex-1 px-4 pt-1.5 pb-28">
            {children}
          </main>
          <MobileBottomNav />
        </div>
      </div>

      {/* Desktop View with sidebar */}
      <div className="hidden sm:block">
        <SidebarProvider>
          <Sidebar>
            <AppSidebar />
          </Sidebar>
          <SidebarInset className="bg-[#F6F9FE]">
            <Header />
            <main className="p-6 lg:p-8 pb-8">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </>
  );
}
