import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseRealTimeAnalyticsOptions {
  enabled?: boolean;
  interval?: number; // in milliseconds
  showNotifications?: boolean;
}

interface RealTimeAnalyticsState {
  lastUpdate: Date | null;
  isOnline: boolean;
  isRefreshing: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export const useRealTimeAnalytics = (
  refreshCallback: () => void,
  options: UseRealTimeAnalyticsOptions = {}
): RealTimeAnalyticsState & {
  refresh: () => void;
  pause: () => void;
  resume: () => void;
  setInterval: (interval: number) => void;
} => {
  const {
    enabled = true,
    interval: defaultInterval = 30000, // 30 seconds
    showNotifications = true
  } = options;

  const [state, setState] = useState<RealTimeAnalyticsState>({
    lastUpdate: null,
    isOnline: navigator.onLine,
    isRefreshing: false,
    connectionStatus: 'connecting'
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPausedRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const isOnlineRef = useRef(navigator.onLine);
  const currentIntervalRef = useRef(defaultInterval);
  const refreshCallbackRef = useRef(refreshCallback);
  const { toast } = useToast();
  
  // Update callback ref when it changes
  useEffect(() => {
    refreshCallbackRef.current = refreshCallback;
  }, [refreshCallback]);
  
  // Update isOnline ref when state changes
  useEffect(() => {
    isOnlineRef.current = state.isOnline;
  }, [state.isOnline]);

  // Refresh function
  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;

    setState(prev => ({ ...prev, isRefreshing: true }));

    try {
      await refreshCallbackRef.current();
      isRefreshingRef.current = false;
      setState(prev => ({
        ...prev,
        lastUpdate: new Date(),
        isRefreshing: false,
        connectionStatus: 'connected'
      }));
    } catch (error) {
      isRefreshingRef.current = false;
      setState(prev => ({
        ...prev,
        isRefreshing: false,
        connectionStatus: 'error'
      }));

      if (showNotifications) {
        toast({
          title: 'Analytics Update Failed',
          description: 'Unable to refresh analytics data. Check your connection.',
          variant: 'destructive'
        });
      }
    }
  }, [showNotifications, toast]);

  // Pause auto-refresh
  const pause = useCallback(() => {
    isPausedRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Resume auto-refresh
  const resume = useCallback(() => {
    isPausedRef.current = false;
    if (enabled && !intervalRef.current) {
      intervalRef.current = setInterval(refresh, currentIntervalRef.current);
    }
  }, [enabled, refresh]);

  // Set new interval
  const setIntervalTime = useCallback((newInterval: number) => {
    currentIntervalRef.current = newInterval;
    if (intervalRef.current && !isPausedRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(refresh, newInterval);
    }
  }, [refresh]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true, connectionStatus: 'connected' }));
      if (enabled && !isPausedRef.current) {
        resume();
      }

      if (showNotifications) {
        toast({
          title: 'Connection Restored',
          description: 'Analytics data will update automatically.',
        });
      }
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false, connectionStatus: 'disconnected' }));
      pause();

      if (showNotifications) {
        toast({
          title: 'Connection Lost',
          description: 'Analytics updates paused. Data will refresh when connection is restored.',
          variant: 'destructive'
        });
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial online status
    setState(prev => ({ ...prev, isOnline: navigator.onLine }));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled, resume, pause, showNotifications, toast]);

  // Handle visibility change (pause when tab is not visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab became hidden, pause updates to save resources
        pause();
      } else {
        // Tab became visible, resume updates and do immediate refresh
        if (enabled) {
          refresh(); // Immediate refresh when tab becomes visible
          resume();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled]);

  // Start/stop interval based on enabled state
  useEffect(() => {
    if (enabled && !isPausedRef.current && isOnlineRef.current) {
      intervalRef.current = setInterval(refresh, currentIntervalRef.current);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, refresh]);

  // Initial refresh - omitted to avoid circular dependencies

  return {
    ...state,
    refresh,
    pause,
    resume,
    setInterval: setIntervalTime
  };
};
