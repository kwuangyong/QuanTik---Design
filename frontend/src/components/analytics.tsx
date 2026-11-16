import Script from "next/script";
import { gaId } from "@/lib/analytics";

/** Loads GA4 only when NEXT_PUBLIC_GA_ID is configured. Page views use GA4 enhanced measurement (history changes). */
export function Analytics() {
  if (!/^G-[A-Z0-9]+$/.test(gaId)) return null;
  return <>
    <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
    <Script id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}',{anonymize_ip:true});`}</Script>
  </>;
}
