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

// Auth
import { AuthPage } from "@/pages/AuthPage";

// Main
import { Home } from "@/pages/Home";

// Fastest Finger
import { FingerMain } from "@/pages/finger/FingerMain";
import { FingerLobby } from "@/pages/finger/FingerLobby";
import { FingerArena } from "@/pages/finger/FingerArena";
import { FingerResults } from "@/pages/finger/FingerResults";

// Other screens
import { RankScreen } from "@/pages/RankScreen";
import { ProfileScreen } from "@/pages/ProfileScreen";
import { WalletMain } from "@/pages/wallet/WalletMain";
import { TransactionHistory } from "@/pages/wallet/TransactionHistory";

// Admin
import { AdminLayout } from "@/pages/admin/AdminLayout";
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { AdminFingerControl } from "@/pages/admin/AdminFingerControl";
import { AdminLiveMonitor } from "@/pages/admin/AdminLiveMonitor";
import { AdminUsers } from "@/pages/admin/AdminUsers";
import { AdminWallet } from "@/pages/admin/AdminWallet";
import { AdminRank } from "@/pages/admin/AdminRank";
import { AdminAnalytics } from "@/pages/admin/AdminAnalytics";
import { AdminSettings } from "@/pages/admin/AdminSettings";

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
    <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
    
    {/* Fastest Finger - The main game */}
    <Route path="/finger" element={<ProtectedRoute><FingerMain /></ProtectedRoute>} />
    <Route path="/finger/lobby" element={<ProtectedRoute><FingerLobby /></ProtectedRoute>} />
    <Route path="/finger/arena" element={<ProtectedRoute><FingerArena /></ProtectedRoute>} />
    <Route path="/finger/results" element={<ProtectedRoute><FingerResults /></ProtectedRoute>} />
    
    {/* Other screens */}
    <Route path="/rank" element={<ProtectedRoute><RankScreen /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>} />
    <Route path="/wallet" element={<ProtectedRoute><WalletMain /></ProtectedRoute>} />
    <Route path="/wallet/history" element={<ProtectedRoute><TransactionHistory /></ProtectedRoute>} />
    
    {/* Admin Dashboard - No auth required for prototype, would add admin check in production */}
    <Route path="/admin" element={<AdminLayout />}>
      <Route index element={<AdminDashboard />} />
      <Route path="finger-control" element={<AdminFingerControl />} />
      <Route path="live-monitor" element={<AdminLiveMonitor />} />
      <Route path="users" element={<AdminUsers />} />
      <Route path="wallet" element={<AdminWallet />} />
      <Route path="rank" element={<AdminRank />} />
      <Route path="analytics" element={<AdminAnalytics />} />
      <Route path="settings" element={<AdminSettings />} />
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
