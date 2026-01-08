import { Skeleton } from '@/components/ui/skeleton';

export const ProfileSkeleton = () => {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-5">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div>
              <Skeleton className="h-6 w-24 mb-1" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>

        {/* Profile Card Skeleton */}
        <div className="card-panel border-primary/30">
          <div className="flex flex-col items-center text-center py-4">
            <Skeleton className="w-20 h-20 rounded-full mb-4" />
            <div className="flex gap-2 mb-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="w-9 h-9 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card-panel text-center">
              <Skeleton className="w-5 h-5 mx-auto mb-2 rounded" />
              <Skeleton className="h-8 w-12 mx-auto mb-1" />
              <Skeleton className="h-3 w-10 mx-auto" />
            </div>
          ))}
        </div>

        {/* Rank Points Skeleton */}
        <div className="card-panel">
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </div>

        {/* Total Earnings Skeleton */}
        <div className="card-panel">
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
        </div>

        {/* KYC Skeleton */}
        <div className="card-panel">
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        </div>

        {/* Audio Settings Skeleton */}
        <div className="card-panel">
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-5 h-5 rounded" />
                  <Skeleton className="w-20 h-4" />
                </div>
                <Skeleton className="w-12 h-6 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
