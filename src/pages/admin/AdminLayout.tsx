import { Outlet } from 'react-router-dom';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminProvider } from '@/contexts/AdminContext';

export const AdminLayout = () => {
  return (
    <AdminProvider>
      <div className="min-h-screen bg-background flex">
        <AdminSidebar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </AdminProvider>
  );
};
