import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PreferencesProvider } from "@/components/PreferencesProvider";
import Sidebar from "@/components/Sidebar";
import OllamaStatus from "@/components/OllamaStatus";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CareerLift",
  description: "AI-powered career assistant.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased app-bg`} suppressHydrationWarning>
        <PreferencesProvider>
          <div className="min-h-screen lg:flex">
            <Sidebar />
            <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-12 fade-in">
              {children}
            </div>
          </div>
          <OllamaStatus />
        </PreferencesProvider>
      </body>
    </html>
  );
}
