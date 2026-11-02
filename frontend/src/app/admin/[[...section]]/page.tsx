import { notFound } from "next/navigation";
import { AdminConsole } from "@/components/admin/console";
const sections = ["", "users", "plans", "orders", "payments", "subscriptions", "reconciliation", "config/integrations", "config/operations", "config/calendar", "audit", "scheduled-tasks", "jobs", "demo"];
export default async function Page({ params }: { params: Promise<{ section?: string[] }> }) {
  const section = ((await params).section || []).join("/");
  if (!sections.includes(section)) notFound();
  return <AdminConsole key={section} section={section} />;
}
