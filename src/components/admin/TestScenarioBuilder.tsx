import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Play, Timer, Users, Flame, Zap, Clock, Trophy } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TestScenario {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  commentTimer: number;
  gameTimeRemaining: number;
  playerCount: number;
  poolValue: number;
}

const PRESET_SCENARIOS: TestScenario[] = [
  {
    id: 'last-30-seconds',
    name: 'Last 30 Seconds',
    description: 'Intense final moments - comment timer at 30s',
    icon: <Flame className="w-5 h-5 text-orange-400" />,
    commentTimer: 30,
    gameTimeRemaining: 180,
    playerCount: 45,
    poolValue: 150000,
  },
  {
    id: 'final-minute',
    name: 'Final Minute',
    description: 'Game ending soon with 1 minute left',
    icon: <Timer className="w-5 h-5 text-destructive" />,
    commentTimer: 45,
    gameTimeRemaining: 60,
    playerCount: 38,
    poolValue: 120000,
  },
  {
    id: 'critical-10s',
    name: 'Critical 10s',
    description: 'Extreme urgency - winner about to be decided',
    icon: <Zap className="w-5 h-5 text-destructive animate-pulse" />,
    commentTimer: 10,
    gameTimeRemaining: 120,
    playerCount: 52,
    poolValue: 200000,
  },
  {
    id: 'small-lobby',
    name: 'Small Lobby (5 Players)',
    description: 'Intimate game with few competitors',
    icon: <Users className="w-5 h-5 text-blue-400" />,
    commentTimer: 60,
    gameTimeRemaining: 900,
    playerCount: 5,
    poolValue: 15000,
  },
  {
    id: 'packed-arena',
    name: 'Packed Arena (100+ Players)',
    description: 'Massive competition with huge prize pool',
    icon: <Trophy className="w-5 h-5 text-gold" />,
    commentTimer: 60,
    gameTimeRemaining: 1200,
    playerCount: 124,
    poolValue: 500000,
  },
  {
    id: 'mid-game',
    name: 'Mid-Game (10 min left)',
    description: 'Standard gameplay situation',
    icon: <Clock className="w-5 h-5 text-primary" />,
    commentTimer: 55,
    gameTimeRemaining: 600,
    playerCount: 28,
    poolValue: 75000,
  },
];

export const TestScenarioBuilder = () => {
  const navigate = useNavigate();
  const { setTestMode } = useGame();
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customScenario, setCustomScenario] = useState({
    commentTimer: 60,
    gameTimeRemaining: 1200,
    playerCount: 20,
    poolValue: 50000,
  });

  const launchScenario = (scenario: TestScenario) => {
    // Enable test mode and store scenario in session storage for arena to use
    setTestMode(true);
    sessionStorage.setItem('testScenario', JSON.stringify({
      commentTimer: scenario.commentTimer,
      gameTimeRemaining: scenario.gameTimeRemaining,
      playerCount: scenario.playerCount,
      poolValue: scenario.poolValue,
    }));
    
    // Navigate to arena with test mode
    navigate('/finger/arena', { 
      state: { 
        testMode: true,
        scenario: scenario.id,
      } 
    });
  };

  const launchCustomScenario = () => {
    setTestMode(true);
    sessionStorage.setItem('testScenario', JSON.stringify(customScenario));
    setShowCustomDialog(false);
    navigate('/finger/arena', { 
      state: { 
        testMode: true,
        scenario: 'custom',
      } 
    });
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Test Scenario Builder</h2>
        </div>
        
        <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors">
              <Zap className="w-4 h-4" />
              Custom Scenario
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Custom Test Scenario</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customTimer">Comment Timer (seconds)</Label>
                  <Input
                    id="customTimer"
                    type="number"
                    min={1}
                    max={120}
                    value={customScenario.commentTimer}
                    onChange={(e) => setCustomScenario(prev => ({ 
                      ...prev, 
                      commentTimer: parseInt(e.target.value) || 60 
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customGameTime">Game Time Left (seconds)</Label>
                  <Input
                    id="customGameTime"
                    type="number"
                    min={10}
                    max={3600}
                    value={customScenario.gameTimeRemaining}
                    onChange={(e) => setCustomScenario(prev => ({ 
                      ...prev, 
                      gameTimeRemaining: parseInt(e.target.value) || 600 
                    }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customPlayers">Player Count</Label>
                  <Input
                    id="customPlayers"
                    type="number"
                    min={2}
                    max={500}
                    value={customScenario.playerCount}
                    onChange={(e) => setCustomScenario(prev => ({ 
                      ...prev, 
                      playerCount: parseInt(e.target.value) || 20 
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customPool">Prize Pool (₦)</Label>
                  <Input
                    id="customPool"
                    type="number"
                    min={1000}
                    value={customScenario.poolValue}
                    onChange={(e) => setCustomScenario(prev => ({ 
                      ...prev, 
                      poolValue: parseInt(e.target.value) || 50000 
                    }))}
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="p-3 bg-muted/30 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-primary" />
                    <span>Winner in: <strong>{customScenario.commentTimer}s</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>Game ends: <strong>{Math.floor(customScenario.gameTimeRemaining / 60)}m {customScenario.gameTimeRemaining % 60}s</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>Players: <strong>{customScenario.playerCount}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-gold" />
                    <span>Pool: <strong>₦{customScenario.poolValue.toLocaleString()}</strong></span>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <button
                onClick={() => setShowCustomDialog(false)}
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={launchCustomScenario}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                <Play className="w-4 h-4" />
                Launch Test
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Launch pre-configured test scenarios to simulate specific game situations
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {PRESET_SCENARIOS.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => launchScenario(scenario)}
            className="group p-4 bg-muted/30 hover:bg-muted/50 rounded-xl border border-border hover:border-primary/50 transition-all text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              {scenario.icon}
              <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                {scenario.name}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{scenario.description}</p>
            
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Timer className="w-3 h-3" />
                <span>{scenario.commentTimer}s timer</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{Math.floor(scenario.gameTimeRemaining / 60)}m left</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="w-3 h-3" />
                <span>{scenario.playerCount} players</span>
              </div>
              <div className="flex items-center gap-1 text-primary">
                <Trophy className="w-3 h-3" />
                <span>₦{(scenario.poolValue / 1000).toFixed(0)}K</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-border flex items-center justify-center gap-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="w-3 h-3" />
              Launch Scenario
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};