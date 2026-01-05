import { AlertTriangle } from 'lucide-react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

export const TestModeBanner = () => {
  const { isTestMode, loading } = usePlatformSettings();

  if (loading || !isTestMode) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-950 py-1.5 px-4 text-center">
      <div className="flex items-center justify-center gap-2 text-sm font-medium">
        <AlertTriangle className="w-4 h-4" />
        <span>Test Mode Active — No Real Money</span>
      </div>
    </div>
  );
};
