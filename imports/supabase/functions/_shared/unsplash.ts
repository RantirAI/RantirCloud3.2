// ═══════════════════════════════════════════════════════════════
// UNSPLASH API SEARCH UTILITY
// Uses the Unsplash Search API with stored credentials
// ═══════════════════════════════════════════════════════════════

const UNSPLASH_API_BASE = 'https://api.unsplash.com';

interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string | null;
  description: string | null;
}

interface UnsplashSearchResult {
  total: number;
  total_pages: number;
  results: UnsplashPhoto[];
}

// In-memory cache to avoid repeated API calls for the same query within a request
const searchCache = new Map<string, string[]>();

/**
 * Search Unsplash for images matching a query.
 * Returns an array of CDN URLs sized to the requested dimensions.
 */
export async function searchUnsplashImages(
  query: string,
  options: { width?: number; height?: number; perPage?: number; orientation?: 'landscape' | 'portrait' | 'squarish' } = {}
): Promise<string[]> {
  const { width = 800, height = 600, perPage = 5, orientation = 'landscape' } = options;
  
  const accessKey = Deno.env.get('UNSPLASH_ACCESS_KEY');
  if (!accessKey) {
    console.warn('[Unsplash] UNSPLASH_ACCESS_KEY not configured, falling back to direct CDN URLs');
    return [];
  }

  // Check cache
  const cacheKey = `${query}:${orientation}:${perPage}`;
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }

  try {
    const params = new URLSearchParams({
      query,
      per_page: String(perPage),
      orientation,
    });

    const response = await fetch(`${UNSPLASH_API_BASE}/search/photos?${params}`, {
      headers: {
        'Authorization': `Client-ID ${accessKey}`,
        'Accept-Version': 'v1',
      },
    });

    if (!response.ok) {
      console.error(`[Unsplash] API error ${response.status}: ${await response.text()}`);
      return [];
    }

    const data: UnsplashSearchResult = await response.json();
    
    // Build sized URLs from the raw endpoint
    const urls = data.results.map(photo => 
      `${photo.urls.raw}&w=${width}&h=${height}&fit=crop&auto=format&q=80`
    );

    searchCache.set(cacheKey, urls);
    return urls;
  } catch (err) {
    console.error('[Unsplash] Search failed:', err);
    return [];
  }
}

/**
 * Get a single Unsplash image URL for a prompt/description.
 * Falls back to hardcoded CDN URL if API fails.
 */
export async function getUnsplashImageUrl(
  prompt: string,
  options: { width?: number; height?: number } = {}
): Promise<string | null> {
  const { width = 800, height = 600 } = options;
  
  // Clean prompt for better search results
  const searchQuery = prompt
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 5) // Use first 5 words for more focused results
    .join(' ');

  if (!searchQuery) return null;

  const orientation = width > height * 1.3 ? 'landscape' : width < height * 0.8 ? 'portrait' : 'squarish';
  
  const urls = await searchUnsplashImages(searchQuery, { width, height, perPage: 3, orientation });
  
  if (urls.length === 0) return null;
  
  // Pick a random result for variety
  return urls[Math.floor(Math.random() * urls.length)];
}

/**
 * Build a pre-fetched image catalog for AI prompts.
 * Searches common categories and returns formatted URL strings.
 */
export async function buildUnsplashCatalog(
  categories: string[] = ['business', 'technology', 'nature', 'people', 'architecture', 'food', 'abstract', 'product']
): Promise<string> {
  const results: string[] = [];
  
  for (const category of categories) {
    const urls = await searchUnsplashImages(category, { width: 1200, height: 800, perPage: 4 });
    if (urls.length > 0) {
      results.push(`${category}: ${urls.join(' | ')}`);
    }
  }
  
  return results.join('\n');
}

/**
 * Clear the in-memory search cache (useful between generations)
 */
export function clearUnsplashCache(): void {
  searchCache.clear();
}
