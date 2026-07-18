import type { Metadata } from "next";
import { SecurityDashboard } from "@/components/dashboard/SecurityDashboard";
import { fetchKeys } from "@/lib/dashboard/mockData";
import "./dashboard.css";
export const metadata: Metadata = {
  title: "Connected Keys — KeyBridge",
  description: "Manage your connected API keys",
};

/**
 * /dashboard — Security Dashboard page
 *
 * Server component wrapper. The SecurityDashboard itself is a client component
 * because it manages interactive state (delete flow, loading states).
 *
 * Auth: in production this page must be protected by middleware that checks
 * the session and redirects unauthenticated users to /login.
 */
export default async function DashboardPage() {
  const initialKeys = await fetchKeys();
  // @ts-ignore
  return <SecurityDashboard initialKeys={initialKeys} />;
}