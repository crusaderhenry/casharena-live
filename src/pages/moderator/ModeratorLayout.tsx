import { Outlet } from 'react-router-dom';
import { ModeratorSidebar } from '@/components/moderator/ModeratorSidebar';

export const ModeratorLayout = () => {
  return (
    <div className="min-h-screen bg-background flex">
      <ModeratorSidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};