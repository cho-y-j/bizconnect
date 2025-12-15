import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  // Next.js 16 타입 정의 상 지원되는 subset만 명시
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "비즈커넥트 - 모바일 통합 CRM | 다인",
  description: "월 15만 원의 문자 비용을 0원으로 만드는, 영업인을 위한 가장 쉬운 AI 비서. PC에서 입력하면 내 폰이 자동으로 발송합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansKr.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
