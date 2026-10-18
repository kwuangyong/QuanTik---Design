import type { Metadata } from "next";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-ext-400.css";
import "@fontsource/inter/latin-ext-500.css";
import "@fontsource/inter/latin-ext-600.css";
import "@fontsource/inter/vietnamese-400.css";
import "@fontsource/inter/vietnamese-500.css";
import "@fontsource/inter/vietnamese-600.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "@fontsource/ibm-plex-mono/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-ext-400.css";
import "@fontsource/ibm-plex-mono/latin-ext-500.css";
import "@fontsource/ibm-plex-mono/latin-ext-600.css";
import "@fontsource/ibm-plex-mono/vietnamese-400.css";
import "@fontsource/ibm-plex-mono/vietnamese-500.css";
import "@fontsource/ibm-plex-mono/vietnamese-600.css";
import "./globals.css";
import "./website-home.css";
import "./website-shell.css";

import "katex/dist/katex.min.css";
import { Preferences } from "@/components/preferences";
export const metadata: Metadata = {
  title: { default: "QuanTik", template: "%s · QuanTik" },
  description: "Kiểm định cổ phiếu trước khi ra quyết định.",
  icons: { icon: "/quantik-logo.jpg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <Preferences>{children}</Preferences>
      </body>
    </html>
  );
}
