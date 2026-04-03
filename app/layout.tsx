import type { Metadata } from "next";
import { ThemeRegistry } from "@/components/ThemeRegistry";
import "./globals.css";

export const metadata: Metadata = {
  title: "JP N1 Scanner",
  description: "Scan Japanese text and convert it into structured study notes."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
