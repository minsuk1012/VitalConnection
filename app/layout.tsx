import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="ko">
      <head>
         <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
