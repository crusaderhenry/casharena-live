import { Suspense, lazy } from "react";
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
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { TestModeBanner } from "@/components/wallet/TestModeBanner";
import { PushNotificationBanner } from "@/components/PushNotificationBanner";
import { GlobalConfetti } from "@/components/GlobalConfetti";
import { GlobalSoundPlayer } from "@/components/GlobalSoundPlayer";

// Eagerly loaded - core pages
import { AuthPage } from "@/pages/AuthPage";
import { Home } from "@/pages/Home";
import NotFound from "./pages/NotFound";

// Lazy loaded - Arena pages
const ArenaListing = lazy(() => import("@/pages/arena/ArenaListing").then(m => ({ default: m.ArenaListing })));
const CycleLobby = lazy(() => import("@/pages/arena/CycleLobby").then(m => ({ default: m.CycleLobby })));
const CycleArena = lazy(() => import("@/pages/arena/CycleArena").then(m => ({ default: m.CycleArena })));
const CycleResults = lazy(() => import("@/pages/arena/CycleResults").then(m => ({ default: m.CycleResults })));
const WinnerCelebration = lazy(() => import("@/pages/arena/WinnerCelebration").then(m => ({ default: m.WinnerCelebration })));

// Lazy loaded - Other screens
const RankScreen = lazy(() => import("@/pages/RankScreen").then(m => ({ default: m.RankScreen })));
const ProfileScreen = lazy(() => import("@/pages/ProfileScreen").then(m => ({ default: m.ProfileScreen })));
const WalletMain = lazy(() => import("@/pages/wallet/WalletMain").then(m => ({ default: m.WalletMain })));
const TransactionHistory = lazy(() => import("@/pages/wallet/TransactionHistory").then(m => ({ default: m.TransactionHistory })));
const DepositCallback = lazy(() => import("@/pages/wallet/DepositCallback").then(m => ({ default: m.DepositCallback })));

// Lazy loaded - Admin pages
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout").then(m => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const AdminRumbleControl = lazy(() => import("@/pages/admin/AdminFingerControl").then(m => ({ default: m.AdminRumbleControl })));
const AdminLiveMonitor = lazy(() => import("@/pages/admin/AdminLiveMonitor").then(m => ({ default: m.AdminLiveMonitor })));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers").then(m => ({ default: m.AdminUsers })));
const AdminMockUsers = lazy(() => import("@/pages/admin/AdminMockUsers").then(m => ({ default: m.AdminMockUsers })));
const AdminRoleManagement = lazy(() => import("@/pages/admin/AdminRoleManagement").then(m => ({ default: m.AdminRoleManagement })));
const AdminKyc = lazy(() => import("@/pages/admin/AdminKyc").then(m => ({ default: m.AdminKyc })));
const AdminWallet = lazy(() => import("@/pages/admin/AdminWallet").then(m => ({ default: m.AdminWallet })));
const AdminPendingWithdrawals = lazy(() => import("@/pages/admin/AdminPendingWithdrawals").then(m => ({ default: m.AdminPendingWithdrawals })));
const AdminRank = lazy(() => import("@/pages/admin/AdminRank").then(m => ({ default: m.AdminRank })));
const AdminAnalytics = lazy(() => import("@/pages/admin/AdminAnalytics").then(m => ({ default: m.AdminAnalytics })));
const AdminAuditLogs = lazy(() => import("@/pages/admin/AdminAuditLogs").then(m => ({ default: m.AdminAuditLogs })));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings").then(m => ({ default: m.AdminSettings })));
const AdminCommunication = lazy(() => import("@/pages/admin/AdminCommunication").then(m => ({ default: m.AdminCommunication })));
const AdminEmailTemplates = lazy(() => import("@/pages/admin/AdminEmailTemplates"));

// Lazy loaded - Moderator pages
const ModeratorLayout = lazy(() => import("@/pages/moderator/ModeratorLayout").then(m => ({ default: m.ModeratorLayout })));
const ModeratorDashboard = lazy(() => import("@/pages/moderator/ModeratorDashboard").then(m => ({ default: m.ModeratorDashboard })));
const ModeratorUsers = lazy(() => import("@/pages/moderator/ModeratorUsers").then(m => ({ default: m.ModeratorUsers })));
const ModeratorComments = lazy(() => import("@/pages/moderator/ModeratorComments").then(m => ({ default: m.ModeratorComments })));
const ModeratorFlagged = lazy(() => import("@/pages/moderator/ModeratorFlagged").then(m => ({ default: m.ModeratorFlagged })));

const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
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

// Session manager component - handles activity tracking and inactivity logout
const SessionManager = () => {
  useActivityTracker();
  useInactivityLogout();
  return null;
};

const AppRoutes = () => (
  <Suspense fallback={<PageLoader />}>
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
      
      {/* Royal Rumble Arena - Public access */}
      <Route path="/arena" element={<ArenaListing />} />
      <Route path="/arena/:cycleId" element={<CycleLobby />} />
      <Route path="/arena/:cycleId/live" element={<ProtectedRoute><CycleArena /></ProtectedRoute>} />
      <Route path="/arena/:cycleId/winner" element={<ProtectedRoute><WinnerCelebration /></ProtectedRoute>} />
      <Route path="/arena/:cycleId/results" element={<CycleResults />} />
      
      {/* Other screens */}
      <Route path="/rank" element={<RankScreen />} />
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
        <Route path="email-templates" element={<AdminEmailTemplates />} />
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
  </Suspense>
);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WalletProvider>
            <GameProvider>
              <AudioProvider>
                <NotificationProvider>
                  <Toaster />
                  <Sonner />
                  <GlobalConfetti />
                  <GlobalSoundPlayer />
                  <BrowserRouter>
                    <SessionManager />
                    <TestModeBanner />
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
};

export default App;
