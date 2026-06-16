import AdminAuthGuard from "@/components/admin/AdminAuthGuard";
import AdminPanel from "@/components/admin/AdminPanel";

export default function AdminPage() {
  return (
    <AdminAuthGuard>
      <AdminPanel />
    </AdminAuthGuard>
  );
}
