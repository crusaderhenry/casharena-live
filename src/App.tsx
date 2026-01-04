import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WalletProvider } from "@/contexts/WalletContext";
import { GameProvider } from "@/contexts/GameContext";

// Onboarding
import { Welcome } from "@/pages/onboarding/Welcome";
import { HowItWorks } from "@/pages/onboarding/HowItWorks";
import { PlayStyle } from "@/pages/onboarding/PlayStyle";
import { MockFunding } from "@/pages/onboarding/MockFunding";

// Main
import { Home } from "@/pages/Home";

// Arena
import { ArenaMain } from "@/pages/arena/ArenaMain";
import { ArenaChallenge } from "@/pages/arena/ArenaChallenge";
import { ArenaLeaderboard } from "@/pages/arena/ArenaLeaderboard";

// Streak
import { StreakMain } from "@/pages/streak/StreakMain";
import { StreakDashboard } from "@/pages/streak/StreakDashboard";
import { StreakTask } from "@/pages/streak/StreakTask";
import { StreakBroken } from "@/pages/streak/StreakBroken";

// Pool
import { PoolMain } from "@/pages/pool/PoolMain";
import { PoolDetails } from "@/pages/pool/PoolDetails";
import { PoolResult } from "@/pages/pool/PoolResult";

// Finger
import { FingerMain } from "@/pages/finger/FingerMain";
import { FingerLobby } from "@/pages/finger/FingerLobby";
import { FingerArena } from "@/pages/finger/FingerArena";
import { FingerResults } from "@/pages/finger/FingerResults";

// Wallet
import { WalletMain } from "@/pages/wallet/WalletMain";
import { TransactionHistory } from "@/pages/wallet/TransactionHistory";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <WalletProvider>
        <GameProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Redirect root to onboarding */}
              <Route path="/" element={<Navigate to="/onboarding/welcome" replace />} />
              
              {/* Onboarding */}
              <Route path="/onboarding/welcome" element={<Welcome />} />
              <Route path="/onboarding/how-it-works" element={<HowItWorks />} />
              <Route path="/onboarding/play-style" element={<PlayStyle />} />
              <Route path="/onboarding/funding" element={<MockFunding />} />
              
              {/* Home */}
              <Route path="/home" element={<Home />} />
              
              {/* Arena */}
              <Route path="/arena" element={<ArenaMain />} />
              <Route path="/arena/challenge" element={<ArenaChallenge />} />
              <Route path="/arena/leaderboard" element={<ArenaLeaderboard />} />
              
              {/* Streak */}
              <Route path="/streak" element={<StreakMain />} />
              <Route path="/streak/dashboard" element={<StreakDashboard />} />
              <Route path="/streak/task" element={<StreakTask />} />
              <Route path="/streak/broken" element={<StreakBroken />} />
              
              {/* Pool */}
              <Route path="/pool" element={<PoolMain />} />
              <Route path="/pool/details" element={<PoolDetails />} />
              <Route path="/pool/result" element={<PoolResult />} />
              
              {/* Fastest Finger */}
              <Route path="/finger" element={<FingerMain />} />
              <Route path="/finger/lobby" element={<FingerLobby />} />
              <Route path="/finger/arena" element={<FingerArena />} />
              <Route path="/finger/results" element={<FingerResults />} />
              
              {/* Wallet */}
              <Route path="/wallet" element={<WalletMain />} />
              <Route path="/wallet/history" element={<TransactionHistory />} />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </GameProvider>
      </WalletProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
