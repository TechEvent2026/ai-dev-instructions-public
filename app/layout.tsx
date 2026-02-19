import "@/app/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "部品マスタ管理システム",
  description: "部品マスタの登録・変更・削除を行うシステム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        {children}
      </body>
    </html>
  );
}
