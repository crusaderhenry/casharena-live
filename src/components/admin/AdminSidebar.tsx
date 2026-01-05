import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Zap, 
  Monitor, 
  Users, 
  Wallet, 
  Trophy, 
  BarChart3, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { label: 'Finger Control', icon: Zap, path: '/admin/finger-control' },
  { label: 'Live Monitor', icon: Monitor, path: '/admin/live-monitor' },
  { label: 'Users', icon: Users, path: '/admin/users' },
  { label: 'Role Management', icon: ShieldAlert, path: '/admin/roles' },
  { label: 'KYC Verification', icon: ShieldCheck, path: '/admin/kyc' },
  { label: 'Wallet & Payouts', icon: Wallet, path: '/admin/wallet' },
  { label: 'Pending Withdrawals', icon: Clock, path: '/admin/withdrawals' },
  { label: 'Rank & Rewards', icon: Trophy, path: '/admin/rank' },
  { label: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
  { label: 'Audit Logs', icon: Shield, path: '/admin/audit-logs' },
  { label: 'Settings', icon: Settings, path: '/admin/settings' },
];

export const AdminSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside 
      className={cn(
        "h-screen bg-card border-r border-border flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && (
          <div>
            <h1 className="text-lg font-black text-foreground">
              <span className="text-primary">Fortunes</span>HQ
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Admin Console</p>
          </div>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/admin' && location.pathname.startsWith(item.path));
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                isActive 
                  ? "bg-primary/15 text-primary border border-primary/30" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5 shrink-0", isActive && "text-primary")} />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm">
              👑
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">Super Admin</p>
              <p className="text-[10px] text-muted-foreground">Full Access</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
