import AdminDashboardClient from "@/components/AdminDashboardClient";

export const revalidate = 0; // Fresh metrics fetch

export default function AdminDashboardPage() {
  return <AdminDashboardClient />;
}
