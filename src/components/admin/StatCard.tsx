import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  variant?: 'default' | 'primary' | 'gold';
}

export const StatCard = ({ label, value, icon: Icon, trend, variant = 'default' }: StatCardProps) => {
  return (
    <div className={cn(
      "p-4 rounded-xl border transition-all hover:border-primary/30",
      variant === 'primary' ? "bg-primary/10 border-primary/30" :
      variant === 'gold' ? "bg-gold/10 border-gold/30" :
      "bg-card border-border"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          variant === 'primary' ? "bg-primary/20" :
          variant === 'gold' ? "bg-gold/20" :
          "bg-muted"
        )}>
          <Icon className={cn(
            "w-5 h-5",
            variant === 'primary' ? "text-primary" :
            variant === 'gold' ? "text-gold" :
            "text-muted-foreground"
          )} />
        </div>
        {trend && (
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            trend.positive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          )}>
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className={cn(
        "text-2xl font-black",
        variant === 'gold' ? "text-gold" : "text-foreground"
      )}>{value}</p>
    </div>
  );
};
