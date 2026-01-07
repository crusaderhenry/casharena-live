import { useState } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { CycleStatusCard } from '@/components/CycleStatusCard';
import { useActiveCycles } from '@/hooks/useActiveCycles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { ArrowLeft, Swords, Radio, Play, Clock, Filter, Search, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

type FilterType = 'all' | 'live' | 'opening' | 'waiting';

export const ArenaListing = () => {
  const navigate = useNavigate();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();
  const { user } = useAuth();
  const { cycles, liveCycles, openingCycles, waitingCycles, loading } = useActiveCycles();
  const [filter, setFilter] = useState<FilterType>('all');
  const [userParticipations, setUserParticipations] = useState<Set<string>>(new Set());

  // Fetch user's participations
  useEffect(() => {
    const fetchParticipations = async () => {
      if (!user) return;
      
      const cycleIds = cycles.map(c => c.id);
      if (cycleIds.length === 0) return;

      const { data } = await supabase
        .from('cycle_participants')
        .select('cycle_id')
        .eq('user_id', user.id)
        .in('cycle_id', cycleIds);

      setUserParticipations(new Set(data?.map(p => p.cycle_id) || []));
    };

    fetchParticipations();
  }, [user, cycles]);

  const getFilteredCycles = () => {
    switch (filter) {
      case 'live':
        return liveCycles;
      case 'opening':
        return openingCycles;
      case 'waiting':
        return waitingCycles;
      default:
        return cycles;
    }
  };

  const filteredCycles = getFilteredCycles();

  const filters: { key: FilterType; label: string; count: number; icon: React.ReactNode; color: string }[] = [
    { key: 'all', label: 'All', count: cycles.length, icon: <Swords className="w-4 h-4" />, color: 'text-primary' },
    { key: 'live', label: 'Live', count: liveCycles.length, icon: <Radio className="w-4 h-4" />, color: 'text-red-400' },
    { key: 'opening', label: 'Open', count: openingCycles.length, icon: <Play className="w-4 h-4" />, color: 'text-green-400' },
    { key: 'waiting', label: 'Soon', count: waitingCycles.length, icon: <Clock className="w-4 h-4" />, color: 'text-blue-400' },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="p-4 flex items-center gap-4">
          <button
            onClick={() => { play('click'); buttonClick(); navigate('/home'); }}
            className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Royal Rumble Arena
            </h1>
            <p className="text-xs text-muted-foreground">
              {cycles.length} game{cycles.length !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => { play('click'); setFilter(f.key); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <span className={filter === f.key ? '' : f.color}>{f.icon}</span>
              {f.label}
              {f.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  filter === f.key ? 'bg-white/20' : 'bg-foreground/10'
                }`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredCycles.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              {filter === 'live' ? <Radio className="w-8 h-8 text-muted-foreground" /> :
               filter === 'opening' ? <Play className="w-8 h-8 text-muted-foreground" /> :
               filter === 'waiting' ? <Clock className="w-8 h-8 text-muted-foreground" /> :
               <Swords className="w-8 h-8 text-muted-foreground" />}
            </div>
            <h3 className="font-bold text-foreground mb-2">
              {filter === 'all' ? 'No Games Available' : `No ${filter === 'live' ? 'Live' : filter === 'opening' ? 'Open' : 'Upcoming'} Games`}
            </h3>
            <p className="text-sm text-muted-foreground">
              {filter === 'all' 
                ? 'New Royal Rumble starting soon!'
                : 'Check back soon or view all games'}
            </p>
          </div>
        ) : (
          filteredCycles.map((cycle) => (
            <CycleStatusCard 
              key={cycle.id} 
              cycle={cycle}
              isParticipant={userParticipations.has(cycle.id)}
            />
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};