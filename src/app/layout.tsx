import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// 👇 1. 引入 UnreadProvider
import { UnreadProvider } from "@/context/UnreadContext";
// 👇 2. 【关键！】必须引入 AIProvider，不然 AI 不会思考
import { AIProvider } from "@/context/AIContext";

import ClientLayout from "@/components/ClientLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Chat App",
  description: "Chat App",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className={`${inter.className} antialiased`}>
        {/* 
            👇👇👇 核心逻辑层级顺序 👇👇👇
            1. 最外层：UnreadProvider (负责通知和声音)
            2. 中间层：AIProvider (负责思考和发消息，它需要调用 Unread 的功能)
            3. 里层：ClientLayout (负责页面布局)
        */}
        <UnreadProvider>
          <AIProvider>
            <ClientLayout>{children}</ClientLayout>
          </AIProvider>
        </UnreadProvider>
      </body>
    </html>
  );
}
