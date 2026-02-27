import { supabase } from '@/integrations/supabase/client';
import { AIWallPreset, formatPresetForAIPrompt } from '@/lib/aiWallPresets';
import { AIWallVariant, AIWallGeneration, ChatMessageMetadata } from '@/stores/aiWallStore';
import { v4 as uuidv4 } from 'uuid';

// ═══════════════════════════════════════════════════════════════
// CURATED IMAGE CATALOG - Working Unsplash CDN URLs
// ═══════════════════════════════════════════════════════════════
const CURATED_IMAGES: Record<string, string[]> = {
  business: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1560472355-536de3962603?w=1200&h=800&fit=crop',
  ],
  tech: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&h=800&fit=crop',
  ],
  nature: [
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=800&fit=crop',
  ],
  people: [
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
  ],
  architecture: [
    'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&h=800&fit=crop',
  ],
  abstract: [
    'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&h=800&fit=crop',
  ],
  product: [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop',
  ],
};

function getWorkingImageUrl(imagePrompt: string, width = 1200, height = 800): string {
  const prompt = (imagePrompt || '').toLowerCase();
  const categoryMatches: Record<string, string[]> = {
    business: ['business', 'office', 'corporate', 'work', 'meeting', 'professional'],
    tech: ['tech', 'code', 'software', 'digital', 'computer', 'data', 'cyber', 'ai'],
    nature: ['nature', 'landscape', 'mountain', 'forest', 'ocean', 'outdoor', 'green'],
    people: ['people', 'team', 'person', 'portrait', 'man', 'woman', 'face'],
    architecture: ['building', 'architecture', 'interior', 'house', 'city', 'urban'],
    abstract: ['abstract', 'pattern', 'gradient', 'color', 'texture', 'art'],
    product: ['product', 'item', 'headphone', 'watch', 'camera', 'gadget', 'device'],
  };
  let matchedCategory = 'abstract';
  for (const [category, keywords] of Object.entries(categoryMatches)) {
    if (keywords.some(kw => prompt.includes(kw))) { matchedCategory = category; break; }
  }
  const urls = CURATED_IMAGES[matchedCategory] || CURATED_IMAGES.abstract;
  const randomUrl = urls[Math.floor(Math.random() * urls.length)];
  return randomUrl.replace(/w=\d+/, `w=${width}`).replace(/h=\d+/, `h=${height}`);
}

const COMPONENT_PATTERNS: Record<string, RegExp> = {
  hero: /hero|banner|landing|headline|main\s*section|header\s*section/i,
  pricing: /pricing|plan|subscription|tier|payment|price/i,
  features: /feature|benefit|capability|service|what\s*we\s*(do|offer)/i,
  testimonials: /testimonial|review|feedback|quote|customer\s*story|social\s*proof/i,
  cta: /cta|call\s*to\s*action|signup|subscribe|get\s*started|newsletter/i,
  footer: /footer|bottom\s*section/i,
  navigation: /nav|header|menu|navigation|navbar/i,
  contact: /contact|form|inquiry|message|reach\s*out/i,
  faq: /faq|frequently\s*asked|questions|accordion|q\s*&\s*a/i,
  team: /team|staff|member|about\s*us|people|founder/i,
  cards: /card|tile|box|grid\s*item|product\s*card/i,
  gallery: /gallery|portfolio|showcase|project|work/i,
  stats: /stat|metric|number|counter|achievement/i,
  logo: /logo|brand|partner|client|trust/i,
};

function detectComponentType(prompt: string): string {
  for (const [type, pattern] of Object.entries(COMPONENT_PATTERNS)) {
    if (pattern.test(prompt)) return type;
  }
  return 'hero';
}

export interface GenerateDesignParams {
  prompt: string;
  preset: AIWallPreset | null;
  referenceImage?: string;
  savedStyle?: any;
  totalDesigns?: number;
  onDesignComplete?: (variant: AIWallVariant, index: number, total: number, layoutName?: string, sectionCount?: number) => void;
  onBatchComplete?: (variants: AIWallVariant[]) => void;
  onSectionPlanReady?: (sectionPlan: string[]) => void;
}

export interface GenerateDesignResult {
  generation: AIWallGeneration;
  reasoning: {
    intent?: ChatMessageMetadata['intent'];
    tokens?: ChatMessageMetadata['tokens'];
    agentResults?: ChatMessageMetadata['agentResults'];
  };
}

// ── Color/contrast utilities ──

function getColorLuminance(color: string): number {
  if (!color || typeof color !== 'string') return 0.5;
  const c = color.trim().toLowerCase();
  let r = 0, g = 0, b = 0;
  if (c === 'white' || c === '#fff' || c === '#ffffff' || c === 'transparent') return 1;
  if (c === 'black' || c === '#000' || c === '#000000') return 0;
  const hexMatch = c.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    r = parseInt(hex.slice(0,2),16); g = parseInt(hex.slice(2,4),16); b = parseInt(hex.slice(4,6),16);
  } else if (c.startsWith('rgb')) {
    const nums = c.match(/[\d.]+/g);
    if (nums && nums.length >= 3) { r = parseFloat(nums[0]); g = parseFloat(nums[1]); b = parseFloat(nums[2]); }
  } else if (c.startsWith('hsl')) {
    const nums = c.match(/[\d.]+/g);
    if (nums && nums.length >= 3) return parseFloat(nums[2]) / 100;
    return 0.5;
  } else if (['black','navy','darkblue','darkslategray','midnightblue'].some(n => c.includes(n))) return 0.1;
  else return 0.5;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function isDarkColor(color: string): boolean {
  return getColorLuminance(color) < 0.4;
}

function isLightColor(color: string): boolean {
  return getColorLuminance(color) > 0.55;
}

function getBackgroundColor(props: any): string | null {
  if (!props) return null;
  const bg = props.backgroundColor || props.background || props.bg || '';
  if (!bg || typeof bg !== 'string') return null;
  if (bg.includes('gradient')) {
    const colors = bg.match(/#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\)|hsl[a]?\([^)]+\)/g) || [];
    if (colors.length > 0) return colors[0]; // use first color as representative
  }
  return bg;
}

const TEXT_TYPES = ['text', 'heading', 'label', 'paragraph', 'span', 'link', 'blockquote'];

function enforceTextContrast(component: any, parentBg: string | null = null): any {
  if (!component || typeof component !== 'object') return component;

  const props = component.props || {};
  const currentBg = getBackgroundColor(props) || parentBg;
  const isText = TEXT_TYPES.includes(component.type);
  const isButton = component.type === 'button';

  // Fix text elements: ensure text contrasts against background
  if (isText && currentBg) {
    const textColor = props.color || props.textColor || '';
    const bgLight = isLightColor(currentBg);
    const bgDark = isDarkColor(currentBg);

    if (textColor) {
      const textLight = isLightColor(textColor);
      const textDark = isDarkColor(textColor);
      // Light text on light bg → force dark
      if (bgLight && textLight) component.props = { ...props, color: '#111827' };
      // Dark text on dark bg → force light
      else if (bgDark && textDark) component.props = { ...props, color: '#ffffff' };
    } else {
      // No color set — assign based on background
      component.props = { ...props, color: bgLight ? '#111827' : '#ffffff' };
    }
  }

  // Fix buttons
  if (isButton) {
    const textColor = props.textColor || props.color || '';
    const btnBg = props.backgroundColor || currentBg;
    if (btnBg && textColor) {
      const bgLight = isLightColor(btnBg);
      const textLight = isLightColor(textColor);
      if (bgLight && textLight) component.props = { ...props, textColor: '#111827', color: '#111827' };
      else if (isDarkColor(btnBg) && isDarkColor(textColor)) component.props = { ...props, textColor: '#ffffff', color: '#ffffff' };
    }
    // Ensure buttons have minimum padding to prevent cutoff
    if (!props.paddingTop && !props.paddingBottom && !props.padding) {
      component.props = { ...component.props, paddingTop: '12px', paddingBottom: '12px', paddingLeft: '24px', paddingRight: '24px' };
    }
    // Ensure overflow visible
    component.props = { ...component.props, overflow: 'visible' };
  }

  const isContainer = ['section', 'div', 'container', 'column', 'row', 'footer', 'header', 'nav', 'card', 'grid'].includes(component.type);
  const propagateBg = (isContainer && getBackgroundColor(props)) ? getBackgroundColor(props) : parentBg;

  if (Array.isArray(component.children)) {
    component.children = component.children.map((child: any) => enforceTextContrast(child, propagateBg));
  }
  return component;
}

function sanitizeComponent(component: any, parentBg: string | null = null): any {
  if (component === null || component === undefined) return null;
  if (typeof component === 'string' || typeof component === 'number' || typeof component === 'boolean') {
    const textValue = String(component).trim();
    if (!textValue) return null;
    const textColor = parentBg && isLightColor(parentBg) ? '#111827' : parentBg && isDarkColor(parentBg) ? '#ffffff' : undefined;
    return { id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type: 'text', props: { content: textValue, ...(textColor ? { color: textColor } : {}) }, children: [] };
  }
  if (typeof component !== 'object') return null;
  if (!component.props || typeof component.props !== 'object') {
    const oldProps = component.props;
    component.props = {};
    if (typeof oldProps === 'string') {
      if (['heading', 'text', 'label', 'paragraph', 'span'].includes(component.type)) component.props.content = oldProps;
      else if (['button', 'link'].includes(component.type)) component.props.text = oldProps;
    }
  }
  if (component.type === 'image') {
    const src = component.props?.src || '';
    if (!src || src.includes('source.unsplash.com') || src === '/placeholder.svg' || src.startsWith('data:')) {
      const prompt = component.props?.imagePrompt || component.props?.alt || 'modern design';
      component.props.src = getWorkingImageUrl(prompt);
      if (!component.props.alt) component.props.alt = prompt;
    }
  }
  const currentBg = getBackgroundColor(component.props) || parentBg;
  if (component.children !== undefined) {
    if (!Array.isArray(component.children)) {
      const oldChildren = component.children;
      if (typeof oldChildren === 'string' || typeof oldChildren === 'number') {
        if (['heading', 'text', 'label', 'paragraph'].includes(component.type) && !component.props.content) component.props.content = String(oldChildren);
        component.children = [];
      } else { component.children = []; }
    } else {
      component.children = component.children.map((child: any) => sanitizeComponent(child, currentBg)).filter((child: any) => child !== null);
    }
  } else { component.children = []; }
  if (!component.id) component.id = `${component.type || 'el'}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  enforceTextContrast(component, parentBg);
  return component;
}

const TOTAL_DESIGNS = 4;

export async function generateDesign({
  prompt,
  preset,
  referenceImage,
  savedStyle,
  totalDesigns = TOTAL_DESIGNS,
  onDesignComplete,
  onBatchComplete,
  onSectionPlanReady,
}: GenerateDesignParams): Promise<GenerateDesignResult> {
  const generationId = uuidv4();
  const componentType = detectComponentType(prompt);
  const generationStartTime = Date.now();
  console.log(`[AI Wall] Starting optimized ${totalDesigns}-design generation. Type: ${componentType}`);

  const presetContext = preset ? formatPresetForAIPrompt(preset) : '';
  const enhancedPrompt = presetContext ? `${prompt}\n\nDesign Context: ${presetContext}` : prompt;

  const reasoning: GenerateDesignResult['reasoning'] = {};
  const allVariants: AIWallVariant[] = [];
  const previousLayouts: string[] = [];
  let cachedIntent: any = null;
  let cachedTokens: any = null;
  let cachedImages: string | null = null;
  let cachedSectionPlan: string[] | null = null;
  let successCount = 0;
  const agentResults: ChatMessageMetadata['agentResults'] = [];
  const failedIndices: number[] = [];

  // ── Helper: process a single edge function response ──
  const processResult = (data: any, error: any, idx: number): boolean => {
    if (error) {
      console.error(`[AI Wall] Design ${idx + 1} edge function error:`, error);
      failedIndices.push(idx);
      return false;
    }

    if (data?.layoutName) previousLayouts.push(data.layoutName);

    const variant = data?.variant;
    if (variant && variant.components?.length > 0) {
      const sanitizedComponents = (variant.components || []).map(sanitizeComponent).filter(Boolean);
      
      // Check for nav-only results (truncated generation) — treat as failure
      const hasContentSections = sanitizedComponents.some((c: any) => {
        const type = c?.type || '';
        return type !== 'nav-horizontal' && type !== 'nav' && type !== 'navigation';
      });
      if (!hasContentSections && sanitizedComponents.length <= 1) {
        console.warn(`[AI Wall] ✗ Design ${idx + 1} only generated navigation (likely truncated)`);
        failedIndices.push(idx);
        return false;
      }
      
      const sanitizedVariant: AIWallVariant = {
        id: variant.id || uuidv4(),
        name: variant.name || `Design ${idx + 1}`,
        description: variant.description || `Design variant ${idx + 1}`,
        layoutType: variant.layoutType || 'standard',
        components: sanitizedComponents,
        createdAt: new Date(),
      };
      allVariants.push(sanitizedVariant);
      successCount++;
      agentResults.push({
        agent: variant.provider || `Design ${idx + 1}`,
        status: 'success',
        layout: data.layoutName || variant.description?.split(',')[0],
        sectionCount: variant.sectionCount || variant.components?.length || 1,
      });
      if (onBatchComplete) onBatchComplete([...allVariants]);
      if (onDesignComplete) onDesignComplete(sanitizedVariant, idx, totalDesigns, data.layoutName, variant.sectionCount || variant.components?.length || 1);
      console.log(`[AI Wall] ✓ Design ${idx + 1}/${totalDesigns} complete (${variant.provider || 'unknown'}, ${variant.sectionCount || 1} sections)`);
      return true;
    } else {
      failedIndices.push(idx);
      console.warn(`[AI Wall] ✗ Design ${idx + 1} failed: ${data?.errorReason || 'empty response'}`);
      return false;
    }
  };

  // ── Variant 0: Sequential (caches intent + tokens + images) ──
  try {
    console.log(`[AI Wall] Generating design 1/${totalDesigns} (sequential, caching phase)...`);
    const { data, error } = await supabase.functions.invoke('ai-wall-generator', {
      body: {
        prompt: enhancedPrompt,
        componentType,
        variantIndex: 0,
        previousLayouts,
        ...(referenceImage ? { referenceImage } : {}),
        ...(savedStyle ? { savedStyle } : {}),
      },
    });

    if (!error && data) {
      if (data.intent) {
        cachedIntent = data.intent;
        reasoning.intent = {
          industry: data.intent.industry,
          mood: data.intent.brandMood || data.intent.mood,
          keywords: data.intent.keywords,
          componentTypes: data.intent.componentTypes,
        };
      }
      if (data.tokens) {
        cachedTokens = data.tokens;
        reasoning.tokens = {
          colors: data.tokens.colors || {},
          fonts: data.tokens.fonts || [],
        };
      }
      if (data.images) {
        cachedImages = data.images;
        console.log('[AI Wall] Cached Unsplash images for subsequent calls');
      }
      if (data.sectionPlan) {
        cachedSectionPlan = data.sectionPlan;
        console.log(`[AI Wall] Cached section plan: [${data.sectionPlan.join(', ')}]`);
        onSectionPlanReady?.(data.sectionPlan);
      }
    }
    processResult(data, error, 0);
  } catch (err) {
    console.error('[AI Wall] Design 1 error:', err);
    failedIndices.push(0);
  }

  // ── Variants 1-N: Parallel batches of 3 ──
  const BATCH_SIZE = 3;
  const remainingIndices = Array.from({ length: totalDesigns - 1 }, (_, i) => i + 1);

  for (let batchStart = 0; batchStart < remainingIndices.length; batchStart += BATCH_SIZE) {
    const batchIndices = remainingIndices.slice(batchStart, batchStart + BATCH_SIZE);
    console.log(`[AI Wall] Launching parallel batch: designs [${batchIndices.map(i => i + 1).join(', ')}]`);

    const batchResults = await Promise.allSettled(
      batchIndices.map(i =>
        supabase.functions.invoke('ai-wall-generator', {
          body: {
            prompt: enhancedPrompt,
            componentType,
            variantIndex: i,
            ...(cachedIntent ? { cachedIntent } : {}),
            ...(cachedTokens ? { cachedTokens } : {}),
            ...(cachedImages ? { cachedImages } : {}),
            ...(cachedSectionPlan ? { sectionPlan: cachedSectionPlan } : {}),
            previousLayouts,
            ...(referenceImage ? { referenceImage } : {}),
            ...(savedStyle ? { savedStyle } : {}),
          },
        })
      )
    );

    batchResults.forEach((settled, batchIdx) => {
      const idx = batchIndices[batchIdx];
      if (settled.status === 'fulfilled') {
        processResult(settled.value.data, settled.value.error, idx);
      } else {
        console.error(`[AI Wall] Design ${idx + 1} error:`, settled.reason);
        failedIndices.push(idx);
      }
    });
  }

  // ── Single parallel retry round (max 1, with 2-minute guard) ──
  const elapsedMs = Date.now() - generationStartTime;
  if (failedIndices.length > 0 && elapsedMs < 120_000) {
    console.log(`[AI Wall] Retry: ${failedIndices.length} failed design(s) in single parallel batch (elapsed: ${(elapsedMs / 1000).toFixed(1)}s)`);
    const indicesToRetry = [...failedIndices];
    failedIndices.length = 0;

    // Rate-limit protection: wait 2s before retrying
    await new Promise(r => setTimeout(r, 2000));

    const retryResults = await Promise.allSettled(
      indicesToRetry.map(idx =>
        supabase.functions.invoke('ai-wall-generator', {
          body: {
            prompt: enhancedPrompt,
            componentType,
            variantIndex: idx,
            ...(cachedIntent ? { cachedIntent } : {}),
            ...(cachedTokens ? { cachedTokens } : {}),
            ...(cachedImages ? { cachedImages } : {}),
            ...(cachedSectionPlan ? { sectionPlan: cachedSectionPlan } : {}),
            previousLayouts,
            ...(referenceImage ? { referenceImage } : {}),
            ...(savedStyle ? { savedStyle } : {}),
          },
        })
      )
    );

    retryResults.forEach((settled, retryIdx) => {
      const idx = indicesToRetry[retryIdx];
      if (settled.status === 'fulfilled') {
        const ok = processResult(settled.value.data, settled.value.error, idx);
        if (ok) {
          const agentIdx = agentResults.findIndex(
            (a) => a.agent === `Design ${idx + 1}` && a.status === 'failed'
          );
          if (agentIdx !== -1) {
            agentResults[agentIdx] = {
              agent: settled.value.data?.variant?.provider || `Design ${idx + 1}`,
              status: 'success',
              layout: settled.value.data?.layoutName,
            };
          }
        }
      } else {
        failedIndices.push(idx);
      }
    });
  } else if (failedIndices.length > 0) {
    console.log(`[AI Wall] Skipping retries — elapsed ${(elapsedMs / 1000).toFixed(1)}s exceeds 2-minute guard`);
  }

  // Filter agentResults to only include successful entries
  const successfulAgentResults = agentResults.filter(r => r.status === 'success');
  reasoning.agentResults = successfulAgentResults;
  console.log(`[AI Wall] Generation complete: ${successCount}/${totalDesigns} designs in ${((Date.now() - generationStartTime) / 1000).toFixed(1)}s (${failedIndices.length} permanently failed)`);

  const generation: AIWallGeneration = {
    id: generationId,
    prompt,
    presetId: preset?.id || 'none',
    model: 'multi-agent',
    variants: allVariants,
    selectedVariantIndex: 0,
    createdAt: new Date(),
  };

  try {
    const { saveGeneration } = await import('@/services/aiWallPersistence');
    await saveGeneration(generation);
  } catch (err) {
    console.error('[AI Wall] Failed to persist generation:', err);
  }

  return { generation, reasoning };
}

export async function exportToProject(
  generation: AIWallGeneration,
  variantIndex: number,
  projectName?: string
): Promise<string | null> {
  const variant = generation.variants[variantIndex];
  if (!variant || variant.components.length === 0) {
    console.error('[AI Wall] No components to export');
    return null;
  }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    const { data: project, error } = await supabase.from('app_projects').insert({
      name: projectName || `AI Wall - ${generation.prompt.slice(0, 30)}...`,
      description: `Generated by AI Wall using ${variant.layoutType} layout`,
      user_id: user.id,
      pages: [{ id: 'home', name: 'Home', path: '/', isDefault: true, elements: variant.components }],
    }).select('id').single();
    if (error) throw error;
    return project?.id || null;
  } catch (error) {
    console.error('[AI Wall] Export failed:', error);
    return null;
  }
}

export async function regenerateSection(
  generation: AIWallGeneration,
  variantIndex: number,
  sectionId: string,
  model: string
): Promise<AIWallVariant | null> {
  const variant = generation.variants[variantIndex];
  if (!variant) return null;
  console.log('[AI Wall] Section regeneration not yet implemented:', sectionId);
  return variant;
}