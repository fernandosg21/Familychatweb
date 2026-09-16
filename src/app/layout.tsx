import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { PushSubscriber } from "@/components/pwa/PushSubscriber";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Family Chat",
  description: "Chat privado da família — mensagens, fotos, áudios, vídeos e localização em tempo real.",
  applicationName: "Family Chat",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Family Chat",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#008069" },
    { media: "(prefers-color-scheme: dark)", color: "#202c33" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full flex flex-col overscroll-none">
        <SupabaseProvider>
          <ServiceWorkerRegister />
          {children}
          <InstallPrompt />
          <PushSubscriber />
        </SupabaseProvider>
      </body>
    </html>
  );
}
