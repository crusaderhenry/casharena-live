import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WalletProvider } from "@/contexts/WalletContext";
import { GameProvider } from "@/contexts/GameContext";
import { TestModeProvider } from "@/components/TestModeToggle";

// Main
import { Home } from "@/pages/Home";
import { Rank } from "@/pages/Rank";

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
          <TestModeProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Navigate to="/home" replace />} />
                
                {/* Home */}
                <Route path="/home" element={<Home />} />
                <Route path="/rank" element={<Rank />} />
                
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
          </TestModeProvider>
        </GameProvider>
      </WalletProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
