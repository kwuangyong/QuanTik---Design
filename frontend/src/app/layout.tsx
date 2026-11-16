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

import "katex/dist/katex.min.css";
import { Preferences } from "@/components/preferences";
import { Analytics } from "@/components/analytics";
import { siteUrl, siteName, siteDescription, siteTitle, openGraphBase } from "@/lib/site";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: siteTitle, template: `%s · ${siteName}` },
  description: siteDescription,
  applicationName: siteName,
  keywords: ["kiểm định cổ phiếu", "phân tích định lượng", "quant", "chứng khoán Việt Nam", "lọc cổ phiếu", "quản trị rủi ro", "HOSE", "HNX", "UPCOM"],
  icons: { icon: "/quantik-logo.jpg" },
  openGraph: openGraphBase,
  twitter: { card: "summary_large_image", title: siteTitle, description: siteDescription },
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
        <Analytics />
      </body>
    </html>
  );
}
