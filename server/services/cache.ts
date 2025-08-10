import { db } from "../db";
import { dashboardCache, type InsertDashboardCache } from "@shared/schema";
import { eq, lt, sql } from "drizzle-orm";
import { storage } from "../storage";

export class CacheService {
  private readonly DEFAULT_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
  private readonly STALE_CACHE_DURATION = 60 * 60 * 1000; // 1 hour for stale data
  private readonly PRODUCTION_WARMUP_LIMIT = 20; // Limit student cache in production

  /**
   * Get cached data for a specific key
   */
  async getCachedData(cacheKey: string): Promise<any | null> {
    try {
      const cached = await db
        .select()
        .from(dashboardCache)
        .where(eq(dashboardCache.cacheKey, cacheKey))
        .limit(1);

      if (cached.length === 0) {
        return null;
      }

      const cacheEntry = cached[0];
      const now = new Date();
      
      // Return data even if expired (stale-while-revalidate pattern)
      return cacheEntry.cacheData;
    } catch (error) {
      console.error('Error fetching cached data:', error);
      return null;
    }
  }

  /**
   * Check if cache is expired
   */
  async isCacheExpired(cacheKey: string): Promise<boolean> {
    try {
      const cached = await db
        .select({ expiresAt: dashboardCache.expiresAt })
        .from(dashboardCache)
        .where(eq(dashboardCache.cacheKey, cacheKey))
        .limit(1);

      if (cached.length === 0) {
        return true; // No cache means expired
      }

      return new Date() > cached[0].expiresAt;
    } catch (error) {
      console.error('Error checking cache expiry:', error);
      return true; // Assume expired on error
    }
  }

  /**
   * Set cached data with automatic expiry
   */
  async setCachedData(cacheKey: string, data: any, customDuration?: number): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (customDuration || this.DEFAULT_CACHE_DURATION));

      const cacheData: InsertDashboardCache = {
        cacheKey,
        cacheData: data,
        lastUpdated: now,
        expiresAt,
      };

      // Use upsert pattern (INSERT ON CONFLICT UPDATE)
      await db
        .insert(dashboardCache)
        .values(cacheData)
        .onConflictDoUpdate({
          target: dashboardCache.cacheKey,
          set: {
            cacheData: sql`excluded.cache_data`,
            lastUpdated: sql`excluded.last_updated`,
            expiresAt: sql`excluded.expires_at`,
          },
        });

      console.log(`Cache updated for key: ${cacheKey}`);
    } catch (error) {
      console.error('Error setting cached data:', error);
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<number> {
    try {
      const result = await db
        .delete(dashboardCache)
        .where(lt(dashboardCache.expiresAt, new Date()));

      const deletedCount = result.rowCount || 0;
      if (deletedCount > 0) {
        console.log(`Cleared ${deletedCount} expired cache entries`);
      }
      return deletedCount;
    } catch (error) {
      console.error('Error clearing expired cache:', error);
      return 0;
    }
  }

  /**
   * Clear specific cache entry
   */
  async clearCache(cacheKey: string): Promise<void> {
    try {
      await db
        .delete(dashboardCache)
        .where(eq(dashboardCache.cacheKey, cacheKey));
      
      console.log(`Cache cleared for key: ${cacheKey}`);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Clear all cache entries
   */
  async clearAllCache(): Promise<void> {
    try {
      await db.delete(dashboardCache);
      console.log('All cache cleared');
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }

  /**
   * Pre-warm cache with fresh data for all dashboards
   */
  async warmUpCache(): Promise<void> {
    console.log('Starting cache warm-up...');
    
    try {
      // Warm up admin dashboard
      const adminData = await storage.getAdminDashboard();
      await this.setCachedData('admin', adminData);

      // Warm up university dashboard  
      const universityData = await storage.getUniversityDashboard();
      await this.setCachedData('university', universityData);

      // Warm up batch dashboards
      const batch2027Data = await storage.getBatchDashboard('2027');
      await this.setCachedData('batch_2027', batch2027Data);

      const batch2028Data = await storage.getBatchDashboard('2028');
      await this.setCachedData('batch_2028', batch2028Data);

      // Warm up student dashboards for active students (production-optimized)
      const allStudents = await storage.getAllStudents();
      const isProduction = process.env.NODE_ENV === 'production';
      const studentLimit = isProduction ? this.PRODUCTION_WARMUP_LIMIT : 50;
      const recentlyActiveStudents = allStudents.slice(0, studentLimit);

      for (const student of recentlyActiveStudents) {
        try {
          const studentData = await storage.getStudentDashboard(student.id);
          if (studentData) {
            await this.setCachedData(`student_${student.id}`, studentData);
          }
        } catch (error) {
          console.log(`Skipping cache for student ${student.id}:`, error instanceof Error ? error.message : 'Unknown error');
        }
      }

      console.log('Cache warm-up completed successfully');
    } catch (error) {
      console.error('Error during cache warm-up:', error);
    }
  }

  /**
   * Get data with cache-first strategy (instant response with cached data)
   */
  async getDataWithCache<T>(
    cacheKey: string, 
    fetchFreshData: () => Promise<T>
  ): Promise<{ data: T; fromCache: boolean }> {
    // Try to get cached data first
    const cachedData = await this.getCachedData(cacheKey);
    
    if (cachedData) {
      // Return cached data immediately
      const isExpired = await this.isCacheExpired(cacheKey);
      
      if (isExpired) {
        // Start background refresh without waiting
        this.refreshCacheInBackground(cacheKey, fetchFreshData);
      }
      
      return { data: cachedData, fromCache: true };
    }

    // No cache available, fetch fresh data
    try {
      const freshData = await fetchFreshData();
      await this.setCachedData(cacheKey, freshData);
      return { data: freshData, fromCache: false };
    } catch (error) {
      console.error('Error fetching fresh data:', error);
      throw error;
    }
  }

  /**
   * Refresh cache in the background (fire and forget)
   */
  private async refreshCacheInBackground<T>(
    cacheKey: string, 
    fetchFreshData: () => Promise<T>
  ): Promise<void> {
    try {
      const freshData = await fetchFreshData();
      await this.setCachedData(cacheKey, freshData);
      console.log(`Background cache refresh completed for: ${cacheKey}`);
    } catch (error) {
      console.error(`Background cache refresh failed for ${cacheKey}:`, error);
    }
  }

  /**
   * Schedule periodic cache cleanup
   */
  startCacheCleanup(): void {
    // Clean up expired cache every 30 minutes
    setInterval(async () => {
      await this.clearExpiredCache();
    }, 30 * 60 * 1000);

    console.log('Cache cleanup scheduler started');
  }
}

export const cacheService = new CacheService();