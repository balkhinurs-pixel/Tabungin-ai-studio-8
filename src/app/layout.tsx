
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import SplashScreen from '@/components/layout/SplashScreen';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const APP_NAME = "Tabungin";
const APP_DEFAULT_TITLE = "Tabungin - Aplikasi Tabungan Siswa Modern";
const APP_TITLE_TEMPLATE = "%s - Tabungin";
const APP_DESCRIPTION = "Solusi digital cerdas untuk pengelolaan tabungan siswa. Praktis, transparan, dan aman dengan fitur cetak kartu QR, laporan otomatis, dan monitoring saldo real-time.";
const APP_URL = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'https://tabungin.com';

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
    url: APP_URL,
    images: [
      {
        url: "/logo192.png",
        width: 192,
        height: 192,
        alt: "Tabungin App Icon",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
    images: ["/logo192.png"],
  },
  icons: {
    icon: "/logo192.png",
    shortcut: "/logo192.png",
    apple: "/logo192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#3B82F6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`font-sans antialiased ${inter.variable} bg-background`}>
        <SplashScreen />
        {children}
        <Toaster />
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
