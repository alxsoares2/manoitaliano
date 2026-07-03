import AdminAuthGuard from "@/components/admin/AdminAuthGuard";
import AdminPanel from "@/components/admin/AdminPanel";
import ZApiStatusBanner from "@/components/admin/ZApiStatusBanner";

export default function AdminPage() {
  return (
    <AdminAuthGuard>
      <ZApiStatusBanner />
      <AdminPanel />
    </AdminAuthGuard>
  );
}
