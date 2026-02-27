// ═══════════════════════════════════════════════════════════════════════════════
// UNSPLASH IMAGE INJECTION SYSTEM
// Uses Unsplash Search API for contextual images, with hardcoded fallbacks
// ═══════════════════════════════════════════════════════════════════════════════

import { getUnsplashImageUrl, buildUnsplashCatalog, clearUnsplashCache } from '../_shared/unsplash.ts';

// ─── FALLBACK CATALOG (used when API is unavailable) ─────────────────────────
const UNSPLASH_CATALOG: Record<string, string[]> = {
  'hero': [
    'photo-1451187580459-43490279c0fa',
    'photo-1517245386807-bb43f82c33c4',
    'photo-1497366216548-37526070297c',
    'photo-1553877522-43269d4ea984',
    'photo-1519389950473-47ba0277781c',
    'photo-1531297484001-80022131f5a1',
    'photo-1488590528505-98d2b5aba04b',
  ],
  'people': [
    'photo-1560250097-0b93528c311a',
    'photo-1573496359142-b8d87734a5a2',
    'photo-1494790108377-be9c29b29330',
    'photo-1507003211169-0a1dd7228f2d',
    'photo-1472099645785-5658abf4ff4e',
    'photo-1534528741775-53994a69daeb',
  ],
  'product': [
    'photo-1523275335684-37898b6baf30',
    'photo-1505740420928-5e560c06d30e',
    'photo-1526170375885-4d8ecf77b99f',
    'photo-1542291026-7eec264c27ff',
  ],
  'tech': [
    'photo-1550751827-4bd374c3f58b',
    'photo-1518770660439-4636190af475',
    'photo-1461749280684-dccba630e2f6',
    'photo-1551288049-bebda4e38f71',
  ],
  'workspace': [
    'photo-1497366811353-6870744d04b2',
    'photo-1497215842964-222b430dc094',
    'photo-1524758631624-e2822e304c36',
  ],
  'food': [
    'photo-1504674900247-0877df9cc836',
    'photo-1476224203421-9ac39bcb3327',
    'photo-1414235077428-338989a2e8c0',
  ],
  'travel': [
    'photo-1469474968028-56623f02e42e',
    'photo-1476514525535-07fb3b4ae5f1',
    'photo-1507525428034-b723cf961d3e',
  ],
  'abstract': [
    'photo-1550859492-d5da9d8e45f3',
    'photo-1557672172-298e090bd0f1',
    'photo-1618005182384-a83a8bd57fbe',
    'photo-1579546929518-9e396f3cc809',
  ],
  'finance': [
    'photo-1611974789855-9c2a0a7236a3',
    'photo-1559526324-593bc073d938',
    'photo-1563013544-824ae1b704d3',
  ],
  'healthcare': [
    'photo-1576091160399-112ba8d25d1d',
    'photo-1631815588090-d4bfec5b1ccb',
    'photo-1579684385127-1ef15d508118',
  ],
  'fitness': [
    'photo-1534438327276-14e5300c3a48',
    'photo-1571019614242-c5c5dee9f50b',
    'photo-1517836357463-d25dfeac3438',
  ],
  'realestate': [
    'photo-1560184897-ae75f418493e',
    'photo-1564013799919-ab600027ffc6',
    'photo-1600596542815-ffad4c1539a9',
  ],
  'education': [
    'photo-1523050854058-8df90110c9f1',
    'photo-1503676260728-1c00da094a0b',
    'photo-1427504494785-3a9ca7044f45',
  ],
};

// Map keyword patterns to categories (used for fallback)
const KEYWORD_TO_CATEGORY: Array<{ keywords: RegExp; category: string }> = [
  { keywords: /team|staff|founder|ceo|headshot|portrait|person|people|professional/i, category: 'people' },
  { keywords: /product|item|merchandise|goods|shopping|ecommerce|store|buy/i, category: 'product' },
  { keywords: /tech|software|code|saas|platform|dashboard|analytics|data|api|ai|machine/i, category: 'tech' },
  { keywords: /office|workspace|desk|meeting|coworking|boardroom|collaboration/i, category: 'workspace' },
  { keywords: /food|restaurant|cafe|cuisine|dish|meal|cook|chef|bakery|bistro/i, category: 'food' },
  { keywords: /travel|destination|vacation|beach|mountain|hotel|resort|adventure|tourism/i, category: 'travel' },
  { keywords: /fitness|gym|workout|exercise|yoga|health|sport|training|athletic/i, category: 'fitness' },
  { keywords: /house|home|apartment|real\s*estate|property|interior|architecture|building/i, category: 'realestate' },
  { keywords: /education|school|university|student|learn|course|library|study|teaching/i, category: 'education' },
  { keywords: /abstract|creative|art|design|pattern|geometric|minimal/i, category: 'abstract' },
  { keywords: /finance|bank|money|invest|crypto|stock|trading|payment|fintech/i, category: 'finance' },
  { keywords: /medical|doctor|health|clinic|hospital|patient|dental|therapy/i, category: 'healthcare' },
  { keywords: /hero|banner|landing|background|cover/i, category: 'hero' },
];

// Used image tracker to prevent duplicates
let usedImages: Set<string> = new Set();

export function resetImageTracker(): void {
  usedImages = new Set();
  clearUnsplashCache();
}

/**
 * Get a fallback URL from the hardcoded catalog
 */
function getFallbackUrl(prompt: string, width = 800, height = 600): string {
  let category = 'hero';
  for (const { keywords, category: cat } of KEYWORD_TO_CATEGORY) {
    if (keywords.test(prompt)) {
      category = cat;
      break;
    }
  }
  
  const photos = UNSPLASH_CATALOG[category] || UNSPLASH_CATALOG['hero'];
  const available = photos.filter(p => !usedImages.has(p));
  const pool = available.length > 0 ? available : photos;
  const photoId = pool[Math.floor(Math.random() * pool.length)];
  usedImages.add(photoId);
  
  return `https://images.unsplash.com/${photoId}?w=${width}&h=${height}&fit=crop&auto=format&q=80`;
}

/**
 * Get dimensions appropriate for the image context
 */
function getImageDimensions(comp: any): { width: number; height: number } {
  const id = (comp.id || '').toLowerCase();
  
  if (comp.type === 'avatar' || id.includes('avatar') || id.includes('profile-pic')) {
    return { width: 200, height: 200 };
  }
  if (id.includes('hero') || id.includes('banner') || id.includes('cover')) {
    return { width: 1200, height: 800 };
  }
  if (id.includes('product') || id.includes('item')) {
    return { width: 600, height: 600 };
  }
  if (id.includes('card') || id.includes('thumb') || id.includes('portfolio') || id.includes('project')) {
    return { width: 800, height: 500 };
  }
  if (id.includes('team') || id.includes('member') || id.includes('headshot')) {
    return { width: 400, height: 500 };
  }
  return { width: 800, height: 600 };
}

/**
 * Build an image catalog for the AI prompt using the Unsplash API.
 * Falls back to hardcoded catalog if API is unavailable.
 */
export async function buildImageCatalogForPrompt(): Promise<string> {
  // Try API-based catalog first
  const apiCatalog = await buildUnsplashCatalog([
    'business office', 'technology software', 'nature landscape', 'professional people portrait',
    'modern architecture', 'food restaurant', 'abstract art', 'product photography',
    'fitness health', 'finance business', 'healthcare medical', 'education university',
  ]);
  
  if (apiCatalog) {
    return apiCatalog;
  }
  
  // Fallback to hardcoded catalog
  console.warn('[Unsplash] API unavailable, using hardcoded catalog');
  return Object.entries(UNSPLASH_CATALOG).map(([category, photoIds]) => {
    const urls = photoIds.slice(0, 4).map(id => 
      `https://images.unsplash.com/${id}?w=1200&h=800&fit=crop&auto=format&q=80`
    );
    return `${category}: ${urls.join(' | ')}`;
  }).join('\n');
}

/**
 * Recursively inject Unsplash URLs into component trees.
 * Uses Unsplash Search API for contextual images, with hardcoded fallback.
 */
export async function injectUnsplashImages(comp: any): Promise<any> {
  if (!comp || typeof comp !== 'object') return comp;
  
  comp.props = comp.props || {};
  
  // Handle image components with imagePrompt
  if (comp.type === 'image' && comp.props.imagePrompt && !comp.props.src) {
    const dims = getImageDimensions(comp);
    // Try API search first
    const apiUrl = await getUnsplashImageUrl(comp.props.imagePrompt, dims);
    if (apiUrl) {
      comp.props.src = apiUrl;
      usedImages.add(apiUrl);
    } else {
      comp.props.src = getFallbackUrl(comp.props.imagePrompt, dims.width, dims.height);
    }
    comp.props.alt = comp.props.alt || comp.props.imagePrompt;
  }
  
  // Handle avatar components with imagePrompt
  if (comp.type === 'avatar' && comp.props.imagePrompt && !comp.props.src) {
    const apiUrl = await getUnsplashImageUrl(comp.props.imagePrompt, { width: 200, height: 200 });
    if (apiUrl) {
      comp.props.src = apiUrl;
    } else {
      comp.props.src = getFallbackUrl(comp.props.imagePrompt, 200, 200);
    }
  }
  
  // Handle background images via imagePrompt on sections/divs
  if ((comp.type === 'section' || comp.type === 'div') && comp.props.imagePrompt) {
    const apiUrl = await getUnsplashImageUrl(comp.props.imagePrompt, { width: 1920, height: 1080 });
    if (apiUrl) {
      comp.props.backgroundImage = apiUrl;
    } else {
      comp.props.backgroundImage = getFallbackUrl(comp.props.imagePrompt, 1920, 1080);
    }
  }
  
  // Recursively process children
  if (Array.isArray(comp.children)) {
    comp.children = await Promise.all(comp.children.map((child: any) => injectUnsplashImages(child)));
  }
  
  return comp;
}
