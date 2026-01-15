import { QueryClient } from '@tanstack/react-query';

/**
 * Clear all browser caches including service worker caches
 */
export const clearAllCaches = async (): Promise<void> => {
  // Preserve important user state (badge unlock tracking, welcome shown)
  const preservedKeys: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('unlocked_badges_') || key.startsWith('fortunes_welcome_shown_') || key.startsWith('username_set_'))) {
      preservedKeys[key] = localStorage.getItem(key) || '';
    }
  }

  // Clear service worker caches
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('[Cache] Cleared all service worker caches');
  }

  // Send message to service worker to clear its caches
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
  }

  // Clear localStorage PWA items only
  localStorage.removeItem('pwa-dismissed');
  localStorage.removeItem('pwa-never-show');
  
  // Restore preserved keys
  Object.entries(preservedKeys).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
  
  console.log('[Cache] All caches cleared (user state preserved)');
};

/**
 * Clear React Query cache
 */
export const clearQueryCache = (queryClient: QueryClient): void => {
  queryClient.clear();
  console.log('[Cache] React Query cache cleared');
};

/**
 * Force update the app by clearing all caches and reloading
 */
export const forceUpdate = async (): Promise<void> => {
  console.log('[Cache] Force updating app...');
  
  // Clear all caches
  await clearAllCaches();

  // Unregister all service workers
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(r => r.unregister()));
    console.log('[Cache] Unregistered all service workers');
  }

  // Hard reload - bypass cache
  window.location.reload();
};

/**
 * Check if an update is available
 */
export const checkForUpdate = async (): Promise<boolean> => {
  if (!('serviceWorker' in navigator)) return false;
  
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;
  
  await registration.update();
  return registration.waiting !== null;
};
