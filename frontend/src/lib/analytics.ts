// Funnel analytics. No-op unless NEXT_PUBLIC_GA_ID is set at build time.
// Never send personal data (email, name, phone, account id) in event params.
export type AnalyticsEvent =
  | "cta_click"
  | "inspect_submit"
  | "view_pricing"
  | "select_plan"
  | "begin_checkout"
  | "login_start"
  | "faq_open"
  | "sample_report_view";

type Params = Record<string, string | number | boolean | undefined>;
type Gtag = (command: "event", name: string, params?: Params) => void;

export const gaId = process.env.NEXT_PUBLIC_GA_ID || "";

export function track(event: AnalyticsEvent, params: Params = {}) {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  try {
    gtag?.("event", event, params);
  } catch {
    /* Analytics must never break the UI. */
  }
}
