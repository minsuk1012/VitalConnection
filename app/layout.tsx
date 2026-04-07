import type { Metadata } from "next";
import "./globals.css";
import localFont from "next/font/local";
import { cn } from "@/lib/utils";

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VitalConnection | 글로벌 의료 마케팅 솔루션",
  description: "병원 전문 글로벌 마케팅 에이전시",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={cn("font-sans", pretendard.variable)}>
      <head />
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
