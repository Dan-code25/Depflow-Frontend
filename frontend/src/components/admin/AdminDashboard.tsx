import { AdminLayout } from "../layout/AdminLayout";

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div>
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <p>
          Welcome to the admin dashboard! Here you can manage users, view
          reports, and configure settings.
        </p>
      </div>
    </AdminLayout>
  );
}
