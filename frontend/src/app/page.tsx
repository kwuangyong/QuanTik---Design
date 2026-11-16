import type { Metadata } from "next";
import HomePage from "@/components/home/home-page";
import { openGraphBase } from "@/lib/site";

export const metadata: Metadata = { alternates: { canonical: "/" }, openGraph: { ...openGraphBase, url: "/" } };

export default function Page() {
  return <HomePage />;
}
