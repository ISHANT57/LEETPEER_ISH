import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

interface CachedQueryOptions<T> {
  queryKey: string | string[];
  localStorageKey?: string;
  showCacheIndicator?: boolean;
  staleTime?: number;
  gcTime?: number;
  enabled?: boolean;
}

interface CachedQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
  refetch: () => void;
  isFromCache: boolean;
  cacheAge?: number;
  refetchInBackground: () => void;
}

/**
 * Custom hook that provides instant loading with cached data while fresh data loads in background
 * 
 * Features:
 * - Instant display of cached data from localStorage
 * - Background refresh with fresh data from server
 * - Cache age indicators
 * - Stale-while-revalidate pattern
 */
export function useCachedQuery<T>({
  queryKey,
  localStorageKey,
  showCacheIndicator = true,
  staleTime = 5 * 60 * 1000, // 5 minutes
  gcTime = 10 * 60 * 1000, // 10 minutes  
  ...queryOptions
}: CachedQueryOptions<T>): CachedQueryResult<T> {
  const [cachedData, setCachedData] = useState<T | null>(null);
  const [cacheAge, setCacheAge] = useState<number | undefined>();
  const [isFromCache, setIsFromCache] = useState(false);

  // Generate cache key
  const cacheKey = localStorageKey || (Array.isArray(queryKey) ? queryKey.join('_') : queryKey);
  const cacheTimestampKey = `${cacheKey}_timestamp`;

  // Load cached data from localStorage on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      const timestamp = localStorage.getItem(cacheTimestampKey);
      
      if (cached && timestamp) {
        const parsedData = JSON.parse(cached);
        const cacheTimestamp = parseInt(timestamp);
        const age = Date.now() - cacheTimestamp;
        
        setCachedData(parsedData);
        setCacheAge(age);
        setIsFromCache(true);
        
        // If cache is too old, clear it
        if (age > gcTime) {
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(cacheTimestampKey);
          setCachedData(null);
          setIsFromCache(false);
        }
      }
    } catch (error) {
      console.warn('Failed to load cached data:', error);
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(cacheTimestampKey);
    }
  }, [cacheKey, cacheTimestampKey, gcTime]);

  // Main query with background refetch
  const query = useQuery({
    queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
    staleTime,
    gcTime,
    ...queryOptions,
    enabled: queryOptions.enabled !== false,
  });

  // Save fresh data to localStorage when query succeeds
  useEffect(() => {
    if (query.data && query.isSuccess) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(query.data));
        localStorage.setItem(cacheTimestampKey, Date.now().toString());
        
        // If we were showing cached data, now we have fresh data
        if (isFromCache) {
          setIsFromCache(false);
          setCacheAge(undefined);
        }
      } catch (error) {
        console.warn('Failed to cache data:', error);
      }
    }
  }, [query.data, query.isSuccess, cacheKey, cacheTimestampKey, isFromCache]);

  // Function to force background refresh
  const refetchInBackground = () => {
    query.refetch();
  };

  // Return cached data immediately if available, otherwise use query data
  const dataToShow = (isFromCache && cachedData ? cachedData : query.data) as T | undefined;
  const isLoadingToShow = isFromCache ? false : query.isLoading;

  return {
    data: dataToShow,
    isLoading: isLoadingToShow,
    isError: query.isError,
    error: query.error,
    isSuccess: query.isSuccess,
    refetch: query.refetch,
    isFromCache,
    cacheAge,
    refetchInBackground,
  };
}

/**
 * Hook specifically for dashboard data with optimized caching
 */
export function useCachedDashboard<T>(
  endpoint: string,
  options?: Omit<CachedQueryOptions<T>, 'queryKey' | 'localStorageKey'>
) {
  return useCachedQuery<T>({
    queryKey: [endpoint],
    localStorageKey: `dashboard_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`,
    staleTime: 3 * 60 * 1000, // 3 minutes for dashboards
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}