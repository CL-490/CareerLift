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
        <div className="min-h-screen flex">
          <Sidebar />
          <div className="flex-1 min-w-0 px-10 py-12 fade-in"><PreferencesProvider>{children}</PreferencesProvider></div>
        </div>
        <OllamaStatus />
      </body>
    </html>
  );
}
