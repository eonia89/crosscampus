import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crosscampus — 학교 밖에서 시작하는 우리 팀",
  description:
    "관심사가 만나는 곳. 다른 학교 친구와 작은 프로젝트를 시작하세요.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
