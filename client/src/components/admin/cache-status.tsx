import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Database, RefreshCw, Trash2, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface CacheStatus {
  key: string;
  expired: boolean;
  hasData: boolean;
}

interface CacheStatusResponse {
  cacheStatus: CacheStatus[];
}

export default function CacheStatusComponent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isWarming, setIsWarming] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  // Get cache status
  const { data: cacheData, isLoading, refetch } = useQuery<CacheStatusResponse>({
    queryKey: ['/api/cache/status'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Warm up cache mutation
  const warmUpMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/cache/warm-up'),
    onMutate: () => setIsWarming(true),
    onSuccess: () => {
      toast({
        title: "Cache warmed up",
        description: "All dashboard caches have been refreshed with latest data.",
      });
      refetch();
    },
    onError: () => {
      toast({
        title: "Warm up failed",
        description: "Failed to warm up cache. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => setIsWarming(false),
  });

  // Clear all cache mutation
  const clearAllMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/cache/clear'),
    onMutate: () => setIsClearingAll(true),
    onSuccess: () => {
      toast({
        title: "Cache cleared",
        description: "All cached data has been cleared.",
      });
      refetch();
      // Invalidate all queries to force refresh
      queryClient.invalidateQueries();
    },
    onError: () => {
      toast({
        title: "Clear failed",
        description: "Failed to clear cache. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => setIsClearingAll(false),
  });

  // Clear specific cache mutation
  const clearSpecificMutation = useMutation({
    mutationFn: (cacheKey: string) => apiRequest('POST', '/api/cache/clear', { cacheKey }),
    onSuccess: (_, cacheKey) => {
      toast({
        title: "Cache cleared",
        description: `Cache cleared for: ${cacheKey}`,
      });
      refetch();
      // Invalidate related queries
      if (cacheKey === 'admin') {
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/admin'] });
      } else if (cacheKey === 'university') {
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/university'] });
      } else if (cacheKey.startsWith('batch_')) {
        const batch = cacheKey.replace('batch_', '');
        queryClient.invalidateQueries({ queryKey: [`/api/dashboard/batch/${batch}`] });
      }
    },
    onError: () => {
      toast({
        title: "Clear failed",
        description: "Failed to clear specific cache.",
        variant: "destructive",
      });
    },
  });

  const getCacheStatusIcon = (cache: CacheStatus) => {
    if (!cache.hasData) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (cache.expired) {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getCacheStatusBadge = (cache: CacheStatus) => {
    if (!cache.hasData) {
      return <Badge variant="destructive">No Data</Badge>;
    }
    if (cache.expired) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Fresh</Badge>;
  };

  const formatCacheKey = (key: string) => {
    switch (key) {
      case 'admin':
        return 'Admin Dashboard';
      case 'university':
        return 'University Dashboard';
      case 'batch_2027':
        return 'Batch 2027 Dashboard';
      case 'batch_2028':
        return 'Batch 2028 Dashboard';
      default:
        return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Cache Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-200 dark:bg-slate-700 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 dark:border-slate-700">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Cache Status
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cache Status List */}
        <div className="space-y-3">
          {cacheData?.cacheStatus?.map((cache) => (
            <div
              key={cache.key}
              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {getCacheStatusIcon(cache)}
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {formatCacheKey(cache.key)}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {cache.key}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getCacheStatusBadge(cache)}
                <Button
                  onClick={() => clearSpecificMutation.mutate(cache.key)}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  disabled={clearSpecificMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Management Actions */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <div className="flex gap-3">
            <Button
              onClick={() => warmUpMutation.mutate()}
              disabled={isWarming}
              className="flex-1 gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isWarming ? 'animate-spin' : ''}`} />
              {isWarming ? 'Warming Up...' : 'Warm Up Cache'}
            </Button>
            <Button
              onClick={() => clearAllMutation.mutate()}
              disabled={isClearingAll}
              variant="destructive"
              className="flex-1 gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isClearingAll ? 'Clearing...' : 'Clear All'}
            </Button>
          </div>
        </div>

        {/* Cache Info */}
        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <p>• Fresh cache provides instant loading for users</p>
          <p>• Expired cache still shows data while refreshing in background</p>
          <p>• Warm up cache after major data changes for best performance</p>
        </div>
      </CardContent>
    </Card>
  );
}