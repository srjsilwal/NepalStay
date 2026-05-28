import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SessionProvider  from "@/components/providers/SessionProvider";
import { CalendarProvider } from "@/components/providers/CalendarContext";
import { ToastProvider }   from "@/components/providers/ToastContext";
import { RealtimeProvider } from "@/components/providers/RealtimeProvider";
import { QueryClientProvider } from "@/components/providers/QueryClientProvider";
import "./globals.css";
import { CompareProvider } from "@/components/features/CompareContext";
import dynamicLib from "next/dynamic";

export const dynamic = "force-dynamic";

const CompareBar = dynamicLib(() => import("@/components/features/CompareBar"), { ssr: false });
const ServiceWorkerRegister = dynamicLib(() => import("@/components/features/ServiceWorkerRegister"), { ssr: false });
const ChatWidget = dynamicLib(() => import("@/components/features/ChatWidget"), { ssr: false });

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "NepalStay — Book Hotels Across Nepal",
    template: "%s | NepalStay",
  },
  description:
    "Nepal's dedicated hotel booking portal. Search, compare, and book hotels in Kathmandu, Pokhara, Chitwan, and beyond. Khalti & cash payments supported.",
  manifest: "/manifest.json",
  openGraph: {
    title: "NepalStay",
    description: "Book hotels across Nepal — Khalti payments, BS calendar, FNMIS compliant.",
    type: "website",
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

// Separate viewport export — recommended for Next.js 14 App Router
export const viewport: Viewport = {
  themeColor: "#f59e0b",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        {/* Preconnect to UploadThing CDN for faster hotel image loading */}
        <link rel="preconnect" href="https://utfs.io" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://utfs.io" />
      </head>
      <body className={inter.className}>
        <ServiceWorkerRegister />
        <SessionProvider session={session}>
          <QueryClientProvider>
            <CalendarProvider>
              <ToastProvider>
                <RealtimeProvider>
                  <CompareProvider>
                    {children}
                    <CompareBar />
                    <ChatWidget />
                  </CompareProvider>
                </RealtimeProvider>
              </ToastProvider>
            </CalendarProvider>
          </QueryClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
