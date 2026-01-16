import { ArrowLeft, Target, MessageSquare, Timer, Trophy, Coins, Users, Sparkles, Clock, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';

export default function HowToPlay() {
  const navigate = useNavigate();

  const rules = [
    {
      icon: Target,
      title: 'Objective',
      description: 'Be the last person to comment when the timer hits zero to win the prize pool!',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: MessageSquare,
      title: 'Send Comments',
      description: 'Type and send comments during the live game. Each comment you send resets the countdown timer.',
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
    },
    {
      icon: Timer,
      title: 'The Countdown',
      description: 'A countdown timer runs during the game. When anyone comments, it resets. When it hits 0, the game ends.',
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/10',
    },
    {
      icon: Trophy,
      title: 'Winners',
      description: 'The last commenter(s) before the timer expires win! Some games have multiple winners who split the prize.',
      color: 'text-gold',
      bgColor: 'bg-gold/10',
    },
    {
      icon: Coins,
      title: 'Entry Fees',
      description: 'Most games require an entry fee from your wallet. The fees contribute to the prize pool.',
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
    },
    {
      icon: Sparkles,
      title: 'Sponsored Games',
      description: 'Some games are FREE to join! Sponsors fund the prize pool so you can win without paying.',
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
    },
  ];

  const tips = [
    {
      icon: Clock,
      tip: 'Wait for others to comment, then strike at the last second!',
    },
    {
      icon: Zap,
      tip: 'Watch the countdown closely - timing is everything.',
    },
    {
      icon: Users,
      tip: 'More players = bigger prize pool. Join popular games!',
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">How to Play</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Intro */}
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Fastest Finger Wins!</h2>
          <p className="text-muted-foreground">
            A real-time comment game where the last person to comment wins the prize.
          </p>
        </div>

        {/* Game Rules */}
        <div className="space-y-3">
          <h3 className="font-bold text-foreground text-lg">Game Rules</h3>
          {rules.map((rule, index) => (
            <div key={index} className="card-panel flex items-start gap-4">
              <div className={`p-3 rounded-xl ${rule.bgColor}`}>
                <rule.icon className={`w-5 h-5 ${rule.color}`} />
              </div>
              <div className="flex-1">
                <h4 className={`font-semibold ${rule.color}`}>{rule.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Pro Tips */}
        <div className="space-y-3">
          <h3 className="font-bold text-foreground text-lg">Pro Tips</h3>
          <div className="card-panel bg-primary/5 border-primary/20">
            <div className="space-y-4">
              {tips.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm text-foreground">{item.tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Game Flow */}
        <div className="space-y-3">
          <h3 className="font-bold text-foreground text-lg">Game Flow</h3>
          <div className="card-panel">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">1</div>
                <div>
                  <p className="font-medium text-foreground">Join the Lobby</p>
                  <p className="text-xs text-muted-foreground">Pay entry fee (if required) and wait for game to start</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-sm">2</div>
                <div>
                  <p className="font-medium text-foreground">Game Goes Live</p>
                  <p className="text-xs text-muted-foreground">The countdown starts - begin sending comments!</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold text-sm">3</div>
                <div>
                  <p className="font-medium text-foreground">Keep It Alive</p>
                  <p className="text-xs text-muted-foreground">Each comment resets the timer - don't let it hit zero!</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-sm">4</div>
                <div>
                  <p className="font-medium text-foreground">Win the Prize!</p>
                  <p className="text-xs text-muted-foreground">Last commenter when timer expires wins the pool</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/arena')}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg hover:bg-primary/90 transition-colors"
        >
          Find a Game
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
