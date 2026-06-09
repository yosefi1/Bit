import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { he } from "@/lib/i18n/he";

export const metadata: Metadata = {
  title: he.appName,
  description: he.appDescription,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
