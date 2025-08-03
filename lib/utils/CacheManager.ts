import { CacheManager } from '../interfaces/RetrievalStrategy';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class AdvancedCacheManager implements CacheManager {
  private queryCache = new Map<string, CacheEntry<any[]>>();
  private embeddingCache = new Map<string, CacheEntry<number[]>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000; // Maximum number of entries

  async getCachedResults(query: string): Promise<any[] | null> {
    const entry = this.queryCache.get(query);
    if (!entry) return null;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.queryCache.delete(query);
      return null;
    }

    return entry.data;
  }

  async setCachedResults(query: string, results: any[]): Promise<void> {
    // Clean up cache if it's too large
    if (this.queryCache.size >= this.MAX_CACHE_SIZE) {
      this.cleanupCache();
    }

    this.queryCache.set(query, {
      data: results,
      timestamp: Date.now(),
      ttl: this.DEFAULT_TTL
    });
  }

  async getCachedEmbedding(text: string): Promise<number[] | null> {
    const entry = this.embeddingCache.get(text);
    if (!entry) return null;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.embeddingCache.delete(text);
      return null;
    }

    return entry.data;
  }

  async setCachedEmbedding(text: string, embedding: number[]): Promise<void> {
    // Clean up cache if it's too large
    if (this.embeddingCache.size >= this.MAX_CACHE_SIZE) {
      this.cleanupCache();
    }

    this.embeddingCache.set(text, {
      data: embedding,
      timestamp: Date.now(),
      ttl: this.DEFAULT_TTL
    });
  }

  clear(): void {
    this.queryCache.clear();
    this.embeddingCache.clear();
  }

  // Get cache statistics
  getCacheStats(): {
    queryCacheSize: number;
    embeddingCacheSize: number;
    queryCacheHitRate: number;
    embeddingCacheHitRate: number;
  } {
    return {
      queryCacheSize: this.queryCache.size,
      embeddingCacheSize: this.embeddingCache.size,
      queryCacheHitRate: this.calculateHitRate(this.queryCache),
      embeddingCacheHitRate: this.calculateHitRate(this.embeddingCache)
    };
  }

  // Set custom TTL for specific entries
  setCustomTTL(query: string, ttl: number): void {
    const entry = this.queryCache.get(query);
    if (entry) {
      entry.ttl = ttl;
    }
  }

  // Clean up expired entries
  private cleanupCache(): void {
    const now = Date.now();

    // Clean up query cache
    for (const [key, entry] of this.queryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.queryCache.delete(key);
      }
    }

    // Clean up embedding cache
    for (const [key, entry] of this.embeddingCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.embeddingCache.delete(key);
      }
    }

    // If still too large, remove oldest entries
    if (this.queryCache.size > this.MAX_CACHE_SIZE * 0.8) {
      const entries = Array.from(this.queryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, this.MAX_CACHE_SIZE * 0.2);
      toRemove.forEach(([key]) => this.queryCache.delete(key));
    }

    if (this.embeddingCache.size > this.MAX_CACHE_SIZE * 0.8) {
      const entries = Array.from(this.embeddingCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, this.MAX_CACHE_SIZE * 0.2);
      toRemove.forEach(([key]) => this.embeddingCache.delete(key));
    }
  }

  private calculateHitRate(cache: Map<string, CacheEntry<any>>): number {
    // This is a simplified hit rate calculation
    // In a real implementation, you'd track hits and misses
    return cache.size > 0 ? 0.8 : 0; // Placeholder value
  }

  // Export cache for debugging
  exportCache(): string {
    return JSON.stringify({
      queryCache: Array.from(this.queryCache.entries()),
      embeddingCache: Array.from(this.embeddingCache.entries())
    }, null, 2);
  }
} 