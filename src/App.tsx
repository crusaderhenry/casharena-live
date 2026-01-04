import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WalletProvider } from "@/contexts/WalletContext";
import { GameProvider } from "@/contexts/GameContext";
import { AudioProvider } from "@/contexts/AudioContext";
import { NotificationProvider } from "@/components/PushNotification";

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

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <WalletProvider>
        <GameProvider>
          <AudioProvider>
            <NotificationProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  {/* Redirect root to home */}
                  <Route path="/" element={<Navigate to="/home" replace />} />
                  
                  {/* Home */}
                  <Route path="/home" element={<Home />} />
                  
                  {/* Fastest Finger - The main game */}
                  <Route path="/finger" element={<FingerMain />} />
                  <Route path="/finger/lobby" element={<FingerLobby />} />
                  <Route path="/finger/arena" element={<FingerArena />} />
                  <Route path="/finger/results" element={<FingerResults />} />
                  
                  {/* Other screens */}
                  <Route path="/rank" element={<RankScreen />} />
                  <Route path="/profile" element={<ProfileScreen />} />
                  <Route path="/wallet" element={<WalletMain />} />
                  <Route path="/wallet/history" element={<TransactionHistory />} />
                  
                  {/* Catch-all */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </NotificationProvider>
          </AudioProvider>
        </GameProvider>
      </WalletProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
