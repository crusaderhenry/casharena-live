import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WalletProvider } from "@/contexts/WalletContext";
import { GameProvider } from "@/contexts/GameContext";
import { AudioProvider } from "@/contexts/AudioContext";
import { NotificationProvider } from "@/components/PushNotification";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { TestModeBanner } from "@/components/wallet/TestModeBanner";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { PushNotificationBanner } from "@/components/PushNotificationBanner";

// Auth
import { AuthPage } from "@/pages/AuthPage";

// Main
import { Home } from "@/pages/Home";

// Royal Rumble Arena
import { ArenaListing } from "@/pages/arena/ArenaListing";
import { CycleLobby } from "@/pages/arena/CycleLobby";
import { CycleArena } from "@/pages/arena/CycleArena";
import { CycleResults } from "@/pages/arena/CycleResults";

// Other screens
import { RankScreen } from "@/pages/RankScreen";
import { ProfileScreen } from "@/pages/ProfileScreen";
import { WalletMain } from "@/pages/wallet/WalletMain";
import { TransactionHistory } from "@/pages/wallet/TransactionHistory";
import { DepositCallback } from "@/pages/wallet/DepositCallback";

// Admin
import { AdminLayout } from "@/pages/admin/AdminLayout";
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { AdminRumbleControl } from "@/pages/admin/AdminFingerControl";
import { AdminLiveMonitor } from "@/pages/admin/AdminLiveMonitor";
import { AdminUsers } from "@/pages/admin/AdminUsers";
import { AdminMockUsers } from "@/pages/admin/AdminMockUsers";
import { AdminRoleManagement } from "@/pages/admin/AdminRoleManagement";
import { AdminKyc } from "@/pages/admin/AdminKyc";
import { AdminWallet } from "@/pages/admin/AdminWallet";
import { AdminPendingWithdrawals } from "@/pages/admin/AdminPendingWithdrawals";
import { AdminRank } from "@/pages/admin/AdminRank";
import { AdminAnalytics } from "@/pages/admin/AdminAnalytics";
import { AdminAuditLogs } from "@/pages/admin/AdminAuditLogs";
import { AdminSettings } from "@/pages/admin/AdminSettings";
import { AdminCommunication } from "@/pages/admin/AdminCommunication";
// Moderator
import { ModeratorLayout } from "@/pages/moderator/ModeratorLayout";
import { ModeratorDashboard } from "@/pages/moderator/ModeratorDashboard";
import { ModeratorUsers } from "@/pages/moderator/ModeratorUsers";
import { ModeratorComments } from "@/pages/moderator/ModeratorComments";
import { ModeratorFlagged } from "@/pages/moderator/ModeratorFlagged";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// Admin route wrapper - requires authentication AND admin role
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You don't have permission to access the admin panel.</p>
          <button 
            onClick={() => window.location.href = '/home'}
            className="btn-primary"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Moderator route wrapper - requires authentication AND moderator OR admin role
const ModeratorRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { isModerator, loading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isModerator) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🛡️</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Moderator Access Required</h1>
          <p className="text-muted-foreground mb-6">You don't have permission to access the moderator panel.</p>
          <button 
            onClick={() => window.location.href = '/home'}
            className="btn-primary"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Redirect authenticated users away from auth page
const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    {/* Redirect root to home */}
    <Route path="/" element={<Navigate to="/home" replace />} />
    
    {/* Auth */}
    <Route path="/auth" element={<AuthRoute><AuthPage /></AuthRoute>} />
    
    {/* Protected Routes */}
    <Route path="/home" element={<Home />} />
    
    {/* Legacy finger routes - redirect to new arena */}
    <Route path="/finger" element={<Navigate to="/arena" replace />} />
    <Route path="/finger/*" element={<Navigate to="/arena" replace />} />
    
    {/* Royal Rumble Arena */}
    <Route path="/arena" element={<ProtectedRoute><ArenaListing /></ProtectedRoute>} />
    <Route path="/arena/:cycleId" element={<ProtectedRoute><CycleLobby /></ProtectedRoute>} />
    <Route path="/arena/:cycleId/live" element={<ProtectedRoute><CycleArena /></ProtectedRoute>} />
    <Route path="/arena/:cycleId/results" element={<ProtectedRoute><CycleResults /></ProtectedRoute>} />
    
    {/* Other screens */}
    <Route path="/rank" element={<ProtectedRoute><RankScreen /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>} />
    <Route path="/wallet" element={<ProtectedRoute><WalletMain /></ProtectedRoute>} />
    <Route path="/wallet/history" element={<ProtectedRoute><TransactionHistory /></ProtectedRoute>} />
    <Route path="/wallet/callback" element={<ProtectedRoute><DepositCallback /></ProtectedRoute>} />
    
    {/* Admin Dashboard - Requires admin role */}
    <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
      <Route index element={<AdminDashboard />} />
      <Route path="finger-control" element={<AdminRumbleControl />} />
      <Route path="live-monitor" element={<AdminLiveMonitor />} />
      <Route path="users" element={<AdminUsers />} />
      <Route path="mock-users" element={<AdminMockUsers />} />
      <Route path="roles" element={<AdminRoleManagement />} />
      <Route path="kyc" element={<AdminKyc />} />
      <Route path="wallet" element={<AdminWallet />} />
      <Route path="withdrawals" element={<AdminPendingWithdrawals />} />
      <Route path="rank" element={<AdminRank />} />
      <Route path="analytics" element={<AdminAnalytics />} />
      <Route path="audit-logs" element={<AdminAuditLogs />} />
      <Route path="settings" element={<AdminSettings />} />
      <Route path="communication" element={<AdminCommunication />} />
    </Route>
    
    {/* Moderator Dashboard - Requires moderator or admin role */}
    <Route path="/moderator" element={<ModeratorRoute><ModeratorLayout /></ModeratorRoute>}>
      <Route index element={<ModeratorDashboard />} />
      <Route path="users" element={<ModeratorUsers />} />
      <Route path="comments" element={<ModeratorComments />} />
      <Route path="flagged" element={<ModeratorFlagged />} />
    </Route>
    
    {/* Catch-all */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <WalletProvider>
          <GameProvider>
            <AudioProvider>
              <NotificationProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <TestModeBanner />
                  <PWAInstallPrompt />
                  <PushNotificationBanner />
                  <AppRoutes />
                </BrowserRouter>
              </NotificationProvider>
            </AudioProvider>
          </GameProvider>
        </WalletProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;