"use client";

import React from "react";
import { AIProvider } from "@/context/AIContext";
// 👇👇👇 1. 注意这里一定要有花括号 { } 👇👇👇
import { MyThemeProvider } from "@/lib/MyTheme";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 2. 结构必须是：AI 包 Theme，Theme 包 Children
    <AIProvider>
      <MyThemeProvider>{children}</MyThemeProvider>
    </AIProvider>
  );
}
