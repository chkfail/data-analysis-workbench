import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "数据研判工具集",
  description: "面向数据研判工作的表格碰撞与字段比对工具"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
