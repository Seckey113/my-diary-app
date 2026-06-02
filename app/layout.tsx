import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Diary!!",
  description: "私だけにしか綴れない体験記",
};

// ⭐️ 新規追加：iPhoneのステータスバーやフチの色をアプリと一体化させる！
export const viewport: Viewport = {
  themeColor: "#FAF9F6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* ⭐️ ここに {children} が無いと画面が真っ暗になります！ */}
        {children}
      </body>
    </html>
  );
}