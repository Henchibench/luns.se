interface CacheItem {
  data: any;
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

class ApiCache {
  private cache = new Map<string, CacheItem>();

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

const apiCache = new ApiCache();

export async function cachedFetch(url: string): Promise<any> {
  // Check cache first
  const cached = apiCache.get(url);
  if (cached) {
    console.log(`Cache hit for ${url}`);
    return cached;
  }

  // Fetch from API
  console.log(`Cache miss - fetching ${url}`);
  const response = await fetch(url);
  const data = await response.json();
  
  // Store in cache
  apiCache.set(url, data);
  
  return data;
} 