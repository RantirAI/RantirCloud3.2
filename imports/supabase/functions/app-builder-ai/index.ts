import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { injectUnsplashImages, resetImageTracker, buildImageCatalogForPrompt } from "./unsplashImages.ts";

// ═══════════════════════════════════════════════════════════════════════════════
// PROCEDURAL DESIGN SEED SYSTEM - Ensures unique designs per generation
// Adapted from AI Wall's procedural generation architecture
// ═══════════════════════════════════════════════════════════════════════════════

const PAGE_COLOR_MOODS = [
  // Light themes
  { mood: 'arctic', hero: '#f0f9ff', surface: '#ffffff', text: '#0c4a6e', accent: '#0ea5e9', muted: '#94a3b8', dark: false },
  { mood: 'slate', hero: '#f8fafc', surface: '#ffffff', text: '#1e293b', accent: '#3b82f6', muted: '#94a3b8', dark: false },
  { mood: 'blush', hero: '#fdf2f8', surface: '#ffffff', text: '#831843', accent: '#ec4899', muted: '#a78bfa', dark: false },
  { mood: 'cloud', hero: '#ffffff', surface: '#f9fafb', text: '#111827', accent: '#6366f1', muted: '#9ca3af', dark: false },
  { mood: 'mint', hero: '#f0fdfa', surface: '#ffffff', text: '#134e4a', accent: '#14b8a6', muted: '#94a3b8', dark: false },
  { mood: 'sage', hero: '#f0fdf4', surface: '#ffffff', text: '#14532d', accent: '#16a34a', muted: '#6b7280', dark: false },
  { mood: 'lavender', hero: '#faf5ff', surface: '#ffffff', text: '#581c87', accent: '#a855f7', muted: '#7c72a0', dark: false },
  { mood: 'rose', hero: '#fff1f2', surface: '#ffffff', text: '#881337', accent: '#e11d48', muted: '#6b7280', dark: false },
  { mood: 'copper', hero: '#fefbf3', surface: '#ffffff', text: '#44403c', accent: '#ea580c', muted: '#a8a29e', dark: false },
  { mood: 'sand', hero: '#fefce8', surface: '#ffffff', text: '#713f12', accent: '#eab308', muted: '#a8a29e', dark: false },
  // Dark themes — allow the AI to generate dramatic dark designs
  { mood: 'midnight', hero: '#0f172a', surface: '#1e293b', text: '#f1f5f9', accent: '#38bdf8', muted: '#94a3b8', dark: true },
  { mood: 'obsidian', hero: '#09090b', surface: '#18181b', text: '#fafafa', accent: '#a855f7', muted: '#71717a', dark: true },
  { mood: 'void', hero: '#020617', surface: '#0f172a', text: '#e2e8f0', accent: '#06b6d4', muted: '#475569', dark: true },
  { mood: 'charcoal', hero: '#111827', surface: '#1f2937', text: '#f9fafb', accent: '#f97316', muted: '#6b7280', dark: true },
  { mood: 'noir', hero: '#000000', surface: '#111111', text: '#ffffff', accent: '#facc15', muted: '#525252', dark: true },
  { mood: 'forest-dark', hero: '#052e16', surface: '#14532d', text: '#dcfce7', accent: '#4ade80', muted: '#86efac', dark: true },
  { mood: 'deep-purple', hero: '#1e0936', surface: '#2d1352', text: '#f5f3ff', accent: '#c084fc', muted: '#a78bfa', dark: true },
  { mood: 'volcanic', hero: '#1c0a00', surface: '#2c1810', text: '#fef2e4', accent: '#fb923c', muted: '#9a7560', dark: true },
];

const PAGE_LAYOUT_STRATEGIES = [
  'split-screen: 50/50 or 60/40 split hero with image on one side. Use flexDirection:"row" with gap.',
  'centered-stack: Everything centered vertically with stacked content. Badge → heading → text → buttons.',
  'bento-grid: Asymmetric grid boxes with mixed content sizes. Use gridTemplateColumns with unequal fractions.',
  'hero-overlay: Full-width background image with content overlay and dark scrim.',
  'asymmetric-offset: Large heading offset left with floating elements creating tension through asymmetry.',
  'minimal-focus: Maximum whitespace, restraint-driven design. Only heading + one line + one button.',
  'editorial-columns: Magazine-style multi-column layouts with rich typography hierarchy.',
  'feature-spotlight: One large featured item (60% width) beside 2 stacked smaller items (40%).',
  // New strategies ported from AI Wall
  'alternating-rows: Row 1 image-left text-right, row 2 reversed. Creates Z-scanning pattern.',
  'card-collection: Centered title + description above 3-4 cards in flex-wrap row layout.',
  'stacked-bands: Full-width horizontal bands with alternating backgrounds. First band hero-sized.',
  'three-column: Three equal columns side by side, each with icon/image + heading + text.',
  'diagonal-flow: Content arranged in a descending diagonal with staggered positioning.',
  'offset-composition: Large heading offset left, image floating right. Tension through asymmetry.',
];

const PAGE_TYPOGRAPHY_STYLES = [
  { label: 'bold-impact', headingSize: '56px', headingWeight: '800', bodySize: '18px', letterSpacing: '-0.02em' },
  { label: 'light-elegant', headingSize: '60px', headingWeight: '300', bodySize: '17px', letterSpacing: '0.04em' },
  { label: 'compact-sharp', headingSize: '40px', headingWeight: '700', bodySize: '15px', letterSpacing: '0' },
  { label: 'editorial-massive', headingSize: '72px', headingWeight: '900', bodySize: '16px', letterSpacing: '-0.04em' },
  { label: 'balanced-medium', headingSize: '48px', headingWeight: '600', bodySize: '16px', letterSpacing: '-0.01em' },
  { label: 'wide-spaced', headingSize: '44px', headingWeight: '500', bodySize: '18px', letterSpacing: '0.08em' },
  { label: 'condensed-bold', headingSize: '52px', headingWeight: '800', bodySize: '14px', letterSpacing: '-0.03em' },
  { label: 'tall-airy', headingSize: '64px', headingWeight: '400', bodySize: '20px', letterSpacing: '0.02em' },
];

const PAGE_CARD_STYLES = [
  'elevated: Strong drop-shadows, white backgrounds, depth',
  'outlined: No fills, border-only card definitions',
  'minimal-flat: No shadows, no borders, pure typography hierarchy',
  'soft-shadow: Gentle shadows with white card backgrounds',
  'accent-border: White cards with subtle accent-colored left border',
];

const PAGE_VISUAL_EFFECTS = [
  'clean-flat: No effects, rely on spacing and typography alone',
  'elevated-shadows: Strong drop-shadows creating depth layers (0 20px 60px rgba(0,0,0,0.15))',
  'subtle-depth: Gentle layered shadows for premium feel (0 4px 20px rgba(0,0,0,0.08))',
  'glassmorphism: Semi-transparent surfaces with backdropFilter blur(16px) and subtle borders',
  'gradient-accents: Use linear gradients on buttons and accent elements only',
  'outlined: No fill backgrounds, use borders to define card boundaries',
  'duotone: Limit to two colors plus white/black for high contrast',
  'texture-overlay: Add subtle opacity patterns via background overlays',
];

const PAGE_FONT_PAIRINGS = [
  { label: 'editorial-luxury', heading: '"Playfair Display", Georgia, serif', body: '"Inter", system-ui, sans-serif' },
  { label: 'tech-modern', heading: '"Inter", -apple-system, sans-serif', body: '"Inter", system-ui, sans-serif' },
  { label: 'geometric-creative', heading: '"Poppins", "Montserrat", sans-serif', body: '"Inter", system-ui, sans-serif' },
  { label: 'bold-display', heading: '"Space Grotesk", "DM Sans", sans-serif', body: '"DM Sans", system-ui, sans-serif' },
  { label: 'corporate-clean', heading: '"Helvetica Neue", Arial, sans-serif', body: '"Roboto", Arial, sans-serif' },
  { label: 'friendly-rounded', heading: '"Nunito", "Outfit", sans-serif', body: '"Nunito", system-ui, sans-serif' },
  { label: 'minimal-elegant', heading: '"Outfit", "Sora", sans-serif', body: '"Inter", system-ui, sans-serif' },
  { label: 'neo-brutalist', heading: '"Space Grotesk", monospace', body: '"Inter", system-ui, sans-serif' },
  { label: 'warm-editorial', heading: '"Merriweather", Georgia, serif', body: '"Source Sans 3", system-ui, sans-serif' },
  { label: 'futuristic-sharp', heading: '"JetBrains Mono", "Fira Code", monospace', body: '"Inter", system-ui, sans-serif' },
  { label: 'premium-sans', heading: '"Plus Jakarta Sans", system-ui, sans-serif', body: '"Figtree", system-ui, sans-serif' },
  { label: 'sharp-contrast', heading: '"Manrope", system-ui, sans-serif', body: '"Sora", system-ui, sans-serif' },
];

const PAGE_SPACING_DENSITIES = [
  { label: 'spacious', sectionPad: '100px 60px', gap: '40px', cardPad: '36px' },
  { label: 'balanced', sectionPad: '80px 48px', gap: '32px', cardPad: '28px' },
  { label: 'compact', sectionPad: '56px 32px', gap: '20px', cardPad: '20px' },
  { label: 'generous', sectionPad: '120px 64px', gap: '48px', cardPad: '40px' },
  { label: 'tight', sectionPad: '40px 24px', gap: '16px', cardPad: '16px' },
];

const PAGE_BORDER_RADIUS = [
  { label: 'sharp', value: '0' },
  { label: 'subtle', value: '6' },
  { label: 'rounded', value: '12' },
  { label: 'soft', value: '20' },
  { label: 'pill', value: '999' },
];

const CREATIVE_PATTERNS = [
  'letter-badges', 'trust-bar', 'numbered-steps', 'split-interactive',
  'glass-cards', 'status-indicators', 'outlined-badges', 'bento-asymmetry'
];

function generatePageDesignSeed() {
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const shuffledPatterns = [...CREATIVE_PATTERNS].sort(() => Math.random() - 0.5);
  const colorMood = pick(PAGE_COLOR_MOODS);
  const effect = pick(PAGE_VISUAL_EFFECTS);
  const isDarkMood = colorMood.dark === true;
  
  // Section backgrounds — alternate between hero and surface tones
  const hero = colorMood.hero;
  const surface = colorMood.surface;
  const accent = colorMood.accent;
  const sectionBackgrounds = [
    hero,
    surface,
    isDarkMood ? colorMood.surface : `${accent}10`,
    hero,
  ];
  
  return {
    colorMood,
    layout: pick(PAGE_LAYOUT_STRATEGIES),
    typography: pick(PAGE_TYPOGRAPHY_STYLES),
    fonts: pick(PAGE_FONT_PAIRINGS),
    cardStyle: pick(PAGE_CARD_STYLES),
    effect,
    spacing: pick(PAGE_SPACING_DENSITIES),
    radius: pick(PAGE_BORDER_RADIUS),
    creativePatterns: shuffledPatterns.slice(0, 3),
    sectionBackgrounds,
    glowColor: accent,
    isDarkMood,
  };
}

/**
 * Bridge user's design system tokens into the design seed so they override random seed colors.
 * Called at get-phases time when context.designSystem is available.
 * Returns a seed with the user's primary/accent/background colors substituted in.
 */
function bridgeDesignSystemIntoSeed(
  seed: ReturnType<typeof generatePageDesignSeed>,
  designSystem: any
): ReturnType<typeof generatePageDesignSeed> {
  if (!designSystem) return seed;
  
  const colors: any[] = designSystem.colors || [];
  const fonts: any[] = designSystem.fonts || [];
  
  // Extract user tokens by name (case-insensitive)
  const getToken = (names: string[]): string | null => {
    for (const name of names) {
      const found = colors.find((c: any) => c.name?.toLowerCase() === name.toLowerCase());
      if (found?.value) return found.value;
    }
    return null;
  };
  
  const getFontToken = (names: string[]): string | null => {
    for (const name of names) {
      const found = fonts.find((f: any) => f.name?.toLowerCase() === name.toLowerCase());
      if (found?.value) return found.value;
    }
    return null;
  };

  // Extract user design tokens
  const userPrimary = getToken(['primary', 'accent', 'brand']);
  const userBackground = getToken(['background', 'bg', 'hero', 'base']);
  const userSurface = getToken(['surface', 'card', 'secondary']);
  const userText = getToken(['text', 'foreground', 'on-background']);
  const userMuted = getToken(['muted', 'muted-foreground', 'subtle']);
  const userFontHeading = getFontToken(['font-heading', 'heading-font', 'font-display']);
  const userFontBody = getFontToken(['font-body', 'body-font', 'font-base']);
  
  // Only override if user actually has tokens — preserve seed variety otherwise
  const hasUserColors = userPrimary || userBackground || userSurface;
  const hasUserFonts = userFontHeading || userFontBody;
  
  if (!hasUserColors && !hasUserFonts) return seed;
  
  // Build overridden colorMood — keep seed's mood name but swap colors
  const bridgedColorMood = {
    ...seed.colorMood,
    ...(userBackground && { hero: userBackground }),
    ...(userSurface && { surface: userSurface }),
    ...(userText && { text: userText }),
    ...(userPrimary && { accent: userPrimary }),
    ...(userMuted && { muted: userMuted }),
    mood: seed.colorMood.mood + (hasUserColors ? '+ds' : ''), // Mark as design-system-driven
  };
  
  // Bridge fonts — if user has font tokens, override seed font pairings
  const bridgedFonts = hasUserFonts ? {
    ...seed.fonts,
    ...(userFontHeading && { heading: userFontHeading }),
    ...(userFontBody && { body: userFontBody }),
    label: 'project-design-system',
  } : seed.fonts;
  
  // Rebuild section backgrounds using bridged colors
  const bridgedSectionBackgrounds = [
    bridgedColorMood.hero,
    bridgedColorMood.surface,
    `${bridgedColorMood.accent}10`,
    bridgedColorMood.hero,
  ];
  
  return {
    ...seed,
    colorMood: bridgedColorMood,
    fonts: bridgedFonts,
    sectionBackgrounds: bridgedSectionBackgrounds,
    glowColor: bridgedColorMood.accent,
  };
}

function formatDesignSeedForPrompt(
  seed: ReturnType<typeof generatePageDesignSeed>,
  designSystem?: any
): string {
  // If user has a design system, bridge its tokens into the seed before building prompt
  const resolvedSeed = designSystem ? bridgeDesignSystemIntoSeed(seed, designSystem) : seed;
  
  // Generate button variety directive (ported from AI Wall)
  const buttonShapes = ['sharp (borderRadius:"0")', 'subtle ("6px")', 'rounded ("12px")', 'pill ("999px")'];
  const buttonStyles = ['solid filled', 'outlined (border + transparent bg)', 'ghost (no bg)', 'elevated (boxShadow)'];
  const buttonSizes = ['compact (padding:"10px 20px")', 'standard ("14px 32px")', 'large ("18px 44px")'];
  const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const primaryButtonStyle = `${pickRandom(buttonShapes)}, ${pickRandom(buttonStyles)}, ${pickRandom(buttonSizes)}`;

  const hasDesignSystem = !!designSystem && (
    (designSystem.colors?.length > 0) || (designSystem.fonts?.length > 0)
  );
  
  return `
---------------------------------------------------
DESIGN DIRECTION FOR THIS BUILD (APPLY CONSISTENTLY):
---------------------------------------------------
- Color Mood: "${resolvedSeed.colorMood.mood}"
  Hero background: ${resolvedSeed.colorMood.hero}
  Surface/cards: ${resolvedSeed.colorMood.surface}
  Text color: ${resolvedSeed.colorMood.text}
  Accent color: ${resolvedSeed.colorMood.accent}
  Muted color: ${resolvedSeed.colorMood.muted}
- Layout Strategy: ${resolvedSeed.layout}
- Typography: ${resolvedSeed.typography.label}
  Headings: fontSize ${resolvedSeed.typography.headingSize.replace('px','')}, fontWeight ${resolvedSeed.typography.headingWeight}, letterSpacing ${resolvedSeed.typography.letterSpacing}
  Body: fontSize ${resolvedSeed.typography.bodySize.replace('px','')}, letterSpacing 0
- Typography Fonts: ${resolvedSeed.fonts.label}
  Heading font: ${resolvedSeed.fonts.heading}
  Body font: ${resolvedSeed.fonts.body}
- Card Style: ${resolvedSeed.cardStyle}
- Visual Effect: ${resolvedSeed.effect}
- Spacing Density: ${resolvedSeed.spacing.label} — Section padding: ${resolvedSeed.spacing.sectionPad}, Gap: ${resolvedSeed.spacing.gap}, Card padding: ${resolvedSeed.spacing.cardPad}
- Border Radius: ${resolvedSeed.radius.label} (${resolvedSeed.radius.value}px) — Apply to ALL cards, buttons, badges, inputs

BUTTON VARIETY DIRECTIVE:
- Primary button style: ${primaryButtonStyle}
- DO NOT make all buttons look the same. Primary and secondary buttons MUST differ visually.
- If you have 3+ buttons, each should differ in at least shape OR style.

${hasDesignSystem ? `
⚠️ THIS PROJECT HAS A CUSTOM DESIGN SYSTEM — COLOR AUTHORITY OVERRIDE:
- The PROJECT DESIGN SYSTEM colors below are the SINGLE SOURCE OF TRUTH for this build.
- The design seed colors above were pre-loaded with those design system tokens.
- DO NOT invent new colors. DO NOT use random hex values. ONLY use the colors from the design system.
- The navbar background MUST complement the hero background from the design system — do NOT force white or #ffffff on the navbar.
- The design seed layout strategies, typography scale, and card style still apply — only colors are design-system-driven.
` : `
DESIGN SEED COLOR ENFORCEMENT:
- Use these EXACT colors. Do NOT fall back to hsl(var(--card)), hsl(var(--muted-foreground)), #fafafa, or #3b82f6.
- Use accent (${resolvedSeed.colorMood.accent}) for buttons, badges, links, interactive elements.
- Use muted (${resolvedSeed.colorMood.muted}) for secondary text, captions, and less important elements.
- Use surface (${resolvedSeed.colorMood.surface}) for card backgrounds, NOT hsl(var(--card)).
- Use text color (${resolvedSeed.colorMood.text}) for body text, NOT hsl(var(--foreground)).
`}
- Apply border radius ${resolvedSeed.radius.value}px to all rounded elements.
- Apply letter-spacing ${resolvedSeed.typography.letterSpacing} to all headings.
- Use spacing density: section padding ${resolvedSeed.spacing.sectionPad}, card padding ${resolvedSeed.spacing.cardPad}, gaps ${resolvedSeed.spacing.gap}.
- Footer uses darkest shade from this palette.
- Use heading fontFamily ${resolvedSeed.fonts.heading} for ALL h1, h2, h3 elements.
- Use body fontFamily ${resolvedSeed.fonts.body} for ALL paragraph text, descriptions, nav links.
- NEVER omit fontFamily — every text element MUST have an explicit fontFamily prop in its typography object.

GRADIENT FREEDOM:
- Gradients are ENCOURAGED on hero sections, CTA sections, and as card accents.
- Use backgroundGradient prop for section gradients: { "type": "linear", "angle": 135, "stops": [{"color":"#hex","position":0},{"color":"#hex","position":100}] }
- Alternatively use solid backgroundColor for sections that don't need gradients.
- Mix gradient and solid sections for visual rhythm — NOT every section must be the same.

TEXT CONTRAST ENFORCEMENT (ABSOLUTE -- NO EXCEPTIONS):
- ${resolvedSeed.isDarkMood ? 'THIS IS A DARK THEME. ALL text MUST be light colored (#ffffff, #f0f0f0, #e4e4e7, or similar light hex).' : 'THIS IS A LIGHT THEME. Body text must be dark; on dark hero/footer backgrounds text MUST be light.'}
- On ANY dark background (hero, footer, dark cards): text color MUST be #ffffff or light (#e4e4e7+).
- On ANY light background (white, cream, light gray): text color MUST be dark (#1a1a2e or darker).
- NEVER use dark text on dark backgrounds. NEVER use light text on light backgrounds.
- Muted/secondary text on dark bg: use rgba(255,255,255,0.7) or #a1a1aa.
- Muted/secondary text on light bg: use ${resolvedSeed.colorMood.muted} or #9ca3af.

CREATIVE PATTERNS FOR THIS BUILD (Apply at least 2 across different sections):
${resolvedSeed.creativePatterns.map((p: string, i: number) => `  ${i + 1}. ${p}`).join('\n')}
  Use these patterns to create NON-PREDICTIVE, visually rich designs. Each section should feel unique.

GLASS & GLOW DESIGN LAYER:
- Card Hover: ALL cards get transform translateY(-4px) + enhanced shadow on hover

SECTION BACKGROUNDS (alternate between these, gradients allowed on hero/CTA):
${resolvedSeed.sectionBackgrounds.map((bg: string, i: number) => `  ${i + 1}. ${bg}`).join('\n')}
  Alternate between these backgrounds. Do NOT use the same background for adjacent sections.
`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEMANTIC CLASS NAME NORMALIZATION
// Maps AI-generated class names to standardized semantic names
// ═══════════════════════════════════════════════════════════════════════════════

const CLASS_NAME_MAPPINGS: Record<string, string> = {
  // Typography - normalize to size-based names
  'page-title': 'heading-xl',
  'hero-title': 'heading-xl',
  'hero-headline': 'heading-xl',
  'main-title': 'heading-xl',
  'section-title': 'heading-lg',
  'features-title': 'heading-lg',
  'testimonials-title': 'heading-lg',
  'pricing-title': 'heading-lg',
  'about-title': 'heading-lg',
  'cta-title': 'heading-lg',
  'faq-title': 'heading-lg',
  'contact-title': 'heading-lg',
  'card-title': 'heading-md',
  'feature-title': 'heading-md',
  'testimonial-title': 'heading-md',
  'product-title': 'heading-md',
  'team-title': 'heading-md',
  'section-subtitle': 'body-lg',
  'hero-subtitle': 'body-lg',
  'card-description': 'body-base',
  'card-text': 'body-base',
  'feature-text': 'body-base',
  'testimonial-text': 'body-base',
  'body-text': 'body-base',
  'description-text': 'body-base',
  'small-text': 'body-sm',
  'caption-text': 'body-sm',
  'badge-text': 'label',
  
  // Buttons - normalize to purpose-based names
  'primary-button': 'btn-primary',
  'main-button': 'btn-primary',
  'cta-button': 'btn-primary',
  'hero-button': 'btn-primary',
  'secondary-button': 'btn-secondary',
  'outline-button': 'btn-secondary',
  'ghost-button': 'btn-ghost',
  'link-button': 'btn-link',
  'nav-link': 'btn-link',
  
  // Cards - normalize to style-based names
  'feature-card': 'card',
  'testimonial-card': 'card',
  'pricing-card': 'card',
  'team-card': 'card',
  'product-card': 'card',
  'project-card': 'card',
  'content-card': 'card',
  'card-base': 'card',
  'card-primary': 'card',
  
  // Sections - normalize to background-based names  
  'hero-section': 'section-hero',
  'cta-section': 'section-accent',
  'features-section': 'section-light',
  'testimonials-section': 'section-light',
  'about-section': 'section-light',
  'pricing-section': 'section-muted',
  'footer-section': 'section-dark',
  'section-container': 'section',
  'dark-section': 'section-dark',
  'light-section': 'section-light',
  
  // Layout - normalize to function-based names
  'card-grid': 'flex-row',
  'features-grid': 'flex-row',
  'products-grid': 'flex-row',
  'testimonials-grid': 'flex-row',
  'team-grid': 'flex-row',
  'flex-row-center': 'flex-row',
  'flex-center': 'flex-center',
  'container-narrow': 'container',
  'container-wide': 'container',
};

// Pattern-based class name normalization (for numbered variants)
function normalizeClassName(className: string): string {
  if (!className) return className;
  
  // CRITICAL: Catch sanitized-* and timestamp-based patterns first
  // These are fallback IDs that should NEVER become class names
  const sanitizedPattern = /^(sanitized|text|heading|div|section|container|button|image|link|icon)[-_]?\d{10,}/i;
  const timestampSuffixPattern = /[-_]\d{10,}[-_]?[a-z0-9]*$/i;
  const randomHashSuffixPattern = /[-_][a-z0-9]{6,}$/;
  
  if (sanitizedPattern.test(className)) {
    // Extract component type and return semantic name
    const typeMatch = className.match(/^(sanitized[-_]?)?(text|heading|div|section|container|button|image|link|icon)/i);
    if (typeMatch) {
      const componentType = typeMatch[2].toLowerCase();
      switch (componentType) {
        case 'heading': return 'heading-md';
        case 'text': return 'body-base';
        case 'button': return 'btn-primary';
        case 'container':
        case 'div': return 'flex-col';
        case 'section': return 'section';
        case 'image': return 'img';
        case 'link': return 'link';
        case 'icon': return 'icon';
        default: return 'element';
      }
    }
  }
  
  // Clean up timestamp-based suffixes from any class name
  if (timestampSuffixPattern.test(className)) {
    const cleanedName = className.replace(timestampSuffixPattern, '');
    // Recurse to apply further normalization
    return normalizeClassName(cleanedName);
  }
  
  // Clean up random hash suffixes (but only if name is long enough to have meaningful base)
  if (randomHashSuffixPattern.test(className) && className.length > 15) {
    const cleanedName = className.replace(randomHashSuffixPattern, '');
    return normalizeClassName(cleanedName);
  }
  
  // Check direct mapping first
  if (CLASS_NAME_MAPPINGS[className]) {
    return CLASS_NAME_MAPPINGS[className];
  }
  
  // Strip numeric suffixes (feature-card-1 → feature-card)
  const baseNameMatch = className.match(/^(.+?)-?\d+$/);
  if (baseNameMatch) {
    const baseName = baseNameMatch[1];
    if (CLASS_NAME_MAPPINGS[baseName]) {
      return CLASS_NAME_MAPPINGS[baseName];
    }
  }
  
  // Pattern-based normalization for common patterns
  const patterns: Array<{pattern: RegExp, replacement: string}> = [
    // Typography patterns
    { pattern: /^(hero|page|main)[-_]?(title|heading|headline)[-_]?\d*$/i, replacement: 'heading-xl' },
    { pattern: /^(section|features|about|testimonials|pricing|cta|faq|contact)[-_]?(title|heading)[-_]?\d*$/i, replacement: 'heading-lg' },
    { pattern: /^(card|feature|product|team|testimonial|project)[-_]?(title|heading)[-_]?\d*$/i, replacement: 'heading-md' },
    { pattern: /^(hero|section)[-_]?(subtitle|description|text)[-_]?\d*$/i, replacement: 'body-lg' },
    { pattern: /^(card|feature|product|testimonial|body)[-_]?(text|description|content)[-_]?\d*$/i, replacement: 'body-base' },
    { pattern: /^(small|caption|helper)[-_]?(text)[-_]?\d*$/i, replacement: 'body-sm' },
    { pattern: /^(badge|label|tag)[-_]?(text)?[-_]?\d*$/i, replacement: 'label' },
    
    // Button patterns
    { pattern: /^(primary|main|cta|hero)[-_]?(button|btn)[-_]?\d*$/i, replacement: 'btn-primary' },
    { pattern: /^(secondary|outline)[-_]?(button|btn)[-_]?\d*$/i, replacement: 'btn-secondary' },
    { pattern: /^(ghost|transparent)[-_]?(button|btn)[-_]?\d*$/i, replacement: 'btn-ghost' },
    { pattern: /^(link|nav)[-_]?(button|btn|link)[-_]?\d*$/i, replacement: 'btn-link' },
    
    // Card patterns
    { pattern: /^(feature|testimonial|pricing|team|product|project|content)[-_]?(card)[-_]?\d*$/i, replacement: 'card' },
    
    // Section patterns
    { pattern: /^(hero|cta)[-_]?(section|container)[-_]?\d*$/i, replacement: 'section-accent' },
    { pattern: /^(features|testimonials|about|contact)[-_]?(section|container)[-_]?\d*$/i, replacement: 'section-light' },
    { pattern: /^(footer|dark)[-_]?(section|container)[-_]?\d*$/i, replacement: 'section-dark' },
    
    // Layout patterns  
    { pattern: /^(card|feature|product|testimonial|team)[-_]?(grid|row|container)[-_]?\d*$/i, replacement: 'flex-row' },
  ];
  
  for (const {pattern, replacement} of patterns) {
    if (pattern.test(className)) {
      return replacement;
    }
  }
  
  return className;
}

// Normalize all class names in a component tree
function normalizeComponentClassNames(comp: any): any {
  if (!comp || typeof comp !== 'object') return comp;
  
  // Normalize appliedClasses
  if (comp.props?.appliedClasses && Array.isArray(comp.props.appliedClasses)) {
    comp.props.appliedClasses = comp.props.appliedClasses.map(normalizeClassName);
    // Remove duplicates after normalization
    comp.props.appliedClasses = [...new Set(comp.props.appliedClasses)];
  }
  
  // Recursively process children
  if (Array.isArray(comp.children)) {
    comp.children = comp.children.map(normalizeComponentClassNames);
  }
  
  return comp;
}

// Normalize class definition names
function normalizeClassDefinition(classStep: any): any {
  if (!classStep?.data?.name) return classStep;
  
  const originalName = classStep.data.name;
  const normalizedName = normalizeClassName(originalName);
  
  if (originalName !== normalizedName) {
    console.log(`[ClassNormalize] Renamed class: "${originalName}" → "${normalizedName}"`);
    classStep.data.name = normalizedName;
  }
  
  return classStep;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAVBAR STRUCTURE GUIDELINES (Reference, not mandatory copying)
// Provides structural best practices for responsive navigation
// ═══════════════════════════════════════════════════════════════════════════════

const NAVBAR_STRUCTURE_GUIDELINES = `
---------------------------------------------------
NAVIGATION BAR STRUCTURE GUIDELINES (Structural Reference)
---------------------------------------------------

For proper responsive navigation, use this 3-part structure:
[logo, nav-links-container, actions-container]

Group links in a nav-links div rather than placing them directly in nav-horizontal.

STRUCTURAL EXAMPLE (Adapt content and styling freely):
{
  "id": "main-nav",
  "type": "nav-horizontal",
  "props": { 
    "display": "flex", 
    "justifyContent": "space-between", 
    "alignItems": "center",
    "width": "100%",
    "spacingControl": { "padding": { "top": "16", "right": "32", "bottom": "16", "left": "32", "unit": "px" } }
  },
  "children": [
    {
      "id": "nav-logo",
      "type": "heading",
      "props": { 
        "content": "[YOUR BRAND NAME]",  // ⚠️ USE UNIQUE BRAND NAME - never "BrandName" or "Link text"
        "tag": "h1", 
        "typography": { "fontSize": "24", "fontWeight": "700" }
      }
    },
    {
      "id": "nav-links",
      "type": "div",
      "props": { 
        "display": "flex", 
        "flexDirection": "row", 
        "gap": "32",
        "alignItems": "center",
        "mobileStyles": { "display": "none" }
      },
      "children": [
        // ⚠️ CREATE MEANINGFUL LINK NAMES based on user's industry/context
        // Examples: "Shop", "Collections", "Pricing", "Features", "About Us", "Blog"
        // NEVER use generic "Link text" or placeholder content
      ]
    },
    {
      "id": "nav-actions",
      "type": "div", 
      "props": { "display": "flex", "gap": "12", "alignItems": "center" },
      "children": [
        { "id": "nav-cta", "type": "button", "props": { "text": "[INDUSTRY-SPECIFIC CTA]", "variant": "default" } },
        { "id": "hamburger", "type": "button", "props": { "text": "", "icon": "Menu", "variant": "ghost", "display": "none", "mobileStyles": { "display": "flex" } } }
      ]
    }
  ]
}

NAVBAR BEST PRACTICES:
1. Use 3 top-level children: [logo, nav-links-container, actions-container]
2. Group links in a nav-links div for responsive behavior
3. nav-links should hide on mobile (mobileStyles: { "display": "none" })
4. hamburger shows on mobile only (display: "none", mobileStyles: { "display": "flex" })
5. Create MEANINGFUL content - brand name, relevant nav links, appropriate CTA
6. ⚠️ CRITICAL: Never use placeholder text like "Link text", "BrandName", "Link 1"
`;

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT INTENT DETECTION - Understand what the user ACTUALLY wants
// ═══════════════════════════════════════════════════════════════════════════════

type PromptIntent = 'full_page' | 'single_section' | 'component';

interface PromptAnalysis {
  intent: PromptIntent;
  focusedElement?: string; // e.g., "login form", "pricing table"
  pageType?: string; // e.g., "portfolio", "landing", "ecommerce"
}

function analyzePromptIntent(prompt: string): PromptAnalysis {
  const lowerPrompt = prompt.toLowerCase().trim();
  
  // FOCUSED COMPONENT/SECTION indicators
  const focusedPatterns = [
    // Form patterns
    { pattern: /(?:create|make|build|add|design)\s+(?:a\s+)?(?:simple\s+)?(?:login|signin|sign-in)\s*(?:form|page)?/i, element: 'login form' },
    { pattern: /(?:create|make|build|add|design)\s+(?:a\s+)?(?:simple\s+)?(?:signup|sign-up|registration|register)\s*(?:form|page)?/i, element: 'signup form' },
    { pattern: /(?:create|make|build|add|design)\s+(?:a\s+)?(?:simple\s+)?(?:contact)\s*(?:form|section)?/i, element: 'contact form' },
    { pattern: /(?:create|make|build|add|design)\s+(?:a\s+)?(?:simple\s+)?(?:newsletter|email\s*signup)\s*(?:form|section)?/i, element: 'newsletter form' },
    { pattern: /(?:create|make|build|add|design)\s+(?:a\s+)?(?:simple\s+)?(?:subscription)\s*(?:form)?/i, element: 'subscription form' },
    
    // Component patterns
    { pattern: /(?:create|make|build|add|design)\s+(?:a\s+)?(?:simple\s+)?(?:pricing)\s*(?:table|section|cards?)?/i, element: 'pricing section' },
    { pattern: /(?:create|make|build|add|design)\s+(?:a\s+)?(?:simple\s+)?(?:testimonial)\s*(?:section|cards?|slider)?/i, element: 'testimonials section' },
    { pattern: /(?:create|make|build|add|design)\s+(?:a\s+)?(?:simple\s+)?(?:feature)\s*(?:section|cards?|list)?/i, element: 'features section' },
    { pattern: /(?:create|make|build|add|design)\s+(?:a\s+)?(?:simple\s+)?(?:faq)\s*(?:section|accordion)?/i, element: 'faq section' },
    { pattern: /(?:create|make|build|add|design)\s+(?:a\s+)?(?:simple\s+)?(?:hero)\s*(?:section|banner)?/i, element: 'hero section' },
    { pattern: /(?:create|make|build|add|design)\s+(?:a\s+)?(?:simple\s+)?(?:footer)/i, element: 'footer' },
    { pattern: /(?:create|make|build|add|design)\s+(?:a\s+)?(?:simple\s+)?(?:navbar|nav|navigation|header)/i, element: 'navigation' },
    { pattern: /(?:create|make|build|add|design)\s+(?:a\s+)?(?:simple\s+)?(?:card|product\s*card)/i, element: 'card component' },
    { pattern: /(?:create|make|build|add|design)\s+(?:a\s+)?(?:simple\s+)?(?:modal|dialog|popup)/i, element: 'modal' },
    { pattern: /(?:create|make|build|add|design)\s+(?:a\s+)?(?:simple\s+)?(?:sidebar)/i, element: 'sidebar' },
    { pattern: /(?:create|make|build|add|design)\s+(?:a\s+)?(?:simple\s+)?(?:dashboard\s*widget)/i, element: 'dashboard widget' },
    
    // "Just a" or "only a" patterns
    { pattern: /(?:just|only)\s+(?:a\s+)?(?:simple\s+)?(\w+(?:\s+\w+)?)\s*(?:form|section|component)?/i, element: null },
  ];
  
  // Check for focused intent
  for (const { pattern, element } of focusedPatterns) {
    const match = lowerPrompt.match(pattern);
    if (match) {
      const focusedElement = element || match[1] || 'component';
      console.log(`[Intent Detection] Focused request detected: "${focusedElement}"`);
      return {
        intent: element?.includes('section') ? 'single_section' : 'component',
        focusedElement
      };
    }
  }
  
  // FULL PAGE indicators
  const fullPagePatterns = [
    /(?:create|make|build|design)\s+(?:a\s+)?(?:full|complete|entire)\s+(?:website|page|site)/i,
    /(?:portfolio|landing\s*page|website|homepage|home\s*page)/i,
    /(?:ecommerce|e-commerce|online\s*store|shop)\s+(?:website|page|site)?/i,
    /(?:saas|startup|company|business)\s+(?:website|page|landing)?/i,
    /(?:marketing|product)\s+(?:website|page|landing)?/i,
    /(?:for\s+my)\s+(?:company|business|startup|brand)/i,
    // Short prompt page-type keywords - catches "create portfolio", "build landing page", etc.
    /(?:create|make|build|design)\s+(?:a\s+)?(?:my\s+)?(?:portfolio|website|homepage|landing\s*page|storefront|blog|ecommerce|e-commerce|online\s*store|shop|saas|startup|agency|restaurant|gym|fitness|real\s*estate|travel|photography)/i,
  ];
  
  for (const pattern of fullPagePatterns) {
    if (pattern.test(lowerPrompt)) {
      console.log(`[Intent Detection] Full page request detected`);
      
      // Determine page type
      let pageType = 'generic';
      if (/portfolio|developer|freelancer|photography/i.test(lowerPrompt)) pageType = 'portfolio';
      else if (/ecommerce|e-commerce|shop|store|storefront/i.test(lowerPrompt)) pageType = 'ecommerce';
      else if (/landing|saas|startup|marketing|agency/i.test(lowerPrompt)) pageType = 'landing';
      else if (/blog/i.test(lowerPrompt)) pageType = 'blog';
      else if (/restaurant|gym|fitness|real\s*estate|travel/i.test(lowerPrompt)) pageType = 'business';
      
      return { intent: 'full_page', pageType };
    }
  }
  
  // Default: If prompt is short and mentions a single thing, treat as focused
  const wordCount = lowerPrompt.split(/\s+/).length;
  if (wordCount <= 8) {
    console.log(`[Intent Detection] Short prompt, treating as focused component`);
    return { intent: 'single_section', focusedElement: lowerPrompt };
  }
  
  // Default to full page for ambiguous requests
  return { intent: 'full_page', pageType: 'generic' };
}

// Store the prompt analysis globally for use in enrichment phase
let currentPromptAnalysis: PromptAnalysis = { intent: 'full_page' };

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE-LEVEL STYLE → PROPS CONVERSION (Reusable in enrichment phase)
// ═══════════════════════════════════════════════════════════════════════════════

const fixComponentGlobal = (comp: any): any => {
  if (!comp || typeof comp !== 'object') return comp;
  
  comp.props = comp.props || {};
  
  // Fix button props: convert "content" to "text"
  if (comp.type === 'button' && comp.props?.content && !comp.props?.text) {
    comp.props.text = comp.props.content;
    delete comp.props.content;
  }
  
  // Fix button icon props: convert "iconName" to "icon" for buttons
  if (comp.type === 'button' && comp.props?.iconName && !comp.props?.icon) {
    comp.props.icon = comp.props.iconName;
    delete comp.props.iconName;
  }
  
  // Ensure icon-only buttons have empty text to prevent "Button" fallback
  if (comp.type === 'button' && (comp.props?.icon || comp.props?.brandIcon)) {
    if (!comp.props.text && !comp.props.content) {
      comp.props.text = '';
    }
  }
  
  // ═══════════════════════════════════════════════════
  // STYLE → PROPS CONVERSION (ALL NESTED OBJECTS)
  // ═══════════════════════════════════════════════════
  if (comp.style) {
    // Convert style.layout to flat props
    if (comp.style.layout) {
      const layout = comp.style.layout;
      if (layout.display) comp.props.display = layout.display;
      if (layout.flexDirection) comp.props.flexDirection = layout.flexDirection;
      if (layout.gap) comp.props.gap = String(layout.gap);
      if (layout.justifyContent) comp.props.justifyContent = layout.justifyContent;
      if (layout.alignItems) comp.props.alignItems = layout.alignItems;
      if (layout.flexWrap) comp.props.flexWrap = layout.flexWrap;
      if (layout.gridTemplateColumns) comp.props.gridTemplateColumns = layout.gridTemplateColumns;
      if (layout.gridTemplateRows) comp.props.gridTemplateRows = layout.gridTemplateRows;
      if (layout.gridAutoFlow) comp.props.gridAutoFlow = layout.gridAutoFlow;
      if (layout.overflow) comp.props.overflow = layout.overflow;
      delete comp.style.layout;
    }
    
    // Convert style.sizing to flat props
    if (comp.style.sizing) {
      const sizing = comp.style.sizing;
      if (sizing.width) comp.props.width = sizing.width;
      if (sizing.height) comp.props.height = sizing.height;
      if (sizing.minWidth) comp.props.minWidth = sizing.minWidth;
      if (sizing.maxWidth) comp.props.maxWidth = sizing.maxWidth;
      if (sizing.minHeight) comp.props.minHeight = sizing.minHeight;
      if (sizing.maxHeight) comp.props.maxHeight = sizing.maxHeight;
      delete comp.style.sizing;
    }
    
    // Convert style.spacing to spacingControl
    if (comp.style.spacing) {
      const spacing = comp.style.spacing;
      if (spacing.padding) {
        const p = spacing.padding;
        comp.props.spacingControl = comp.props.spacingControl || {};
        if (typeof p === 'object') {
          comp.props.spacingControl.padding = {
            top: String(p.top || 0),
            right: String(p.right || 0),
            bottom: String(p.bottom || 0),
            left: String(p.left || 0),
            unit: 'px'
          };
        } else {
          const val = String(p);
          comp.props.spacingControl.padding = { top: val, right: val, bottom: val, left: val, unit: 'px' };
        }
      }
      if (spacing.margin) {
        const m = spacing.margin;
        comp.props.spacingControl = comp.props.spacingControl || {};
        if (typeof m === 'object') {
          comp.props.spacingControl.margin = {
            top: String(m.top || 0),
            right: String(m.right || 0),
            bottom: String(m.bottom || 0),
            left: String(m.left || 0),
            unit: 'px'
          };
        } else {
          const val = String(m);
          comp.props.spacingControl.margin = { top: val, right: val, bottom: val, left: val, unit: 'px' };
        }
      }
      delete comp.style.spacing;
    }
    
    // Convert style.background to backgroundColor/backgroundGradient
    if (comp.style.background) {
      const bg = comp.style.background;
      if (bg.color && !comp.props.backgroundColor) {
        comp.props.backgroundColor = { type: 'solid', value: bg.color, opacity: 100 };
      }
      if (bg.gradient && !comp.props.backgroundGradient) {
        comp.props.backgroundGradient = bg.gradient;
      }
      delete comp.style.background;
    }
    
    // Convert style.typography to props.typography
    if (comp.style.typography) {
      const typo = comp.style.typography;
      comp.props.typography = comp.props.typography || {};
      if (typo.fontSize) comp.props.typography.fontSize = String(typo.fontSize).replace('px', '');
      if (typo.fontWeight) comp.props.typography.fontWeight = String(typo.fontWeight);
      if (typo.color) comp.props.typography.color = typo.color;
      if (typo.textAlign) comp.props.typography.textAlign = typo.textAlign;
      if (typo.lineHeight) comp.props.typography.lineHeight = String(typo.lineHeight);
      if (typo.letterSpacing) comp.props.typography.letterSpacing = String(typo.letterSpacing);
      if (typo.fontFamily) comp.props.typography.fontFamily = typo.fontFamily;
      delete comp.style.typography;
    }
    
    // Convert style.border to borderRadius and border
    if (comp.style.border) {
      const border = comp.style.border;
      if (border.radius && !comp.props.borderRadius) {
        const r = String(border.radius);
        comp.props.borderRadius = { topLeft: r, topRight: r, bottomRight: r, bottomLeft: r, unit: 'px' };
      }
      if (border.width && !comp.props.border) {
        comp.props.border = {
          width: String(border.width),
          style: border.style || 'solid',
          color: border.color || 'hsl(var(--border))',
          unit: 'px',
          sides: { top: true, right: true, bottom: true, left: true }
        };
      }
      delete comp.style.border;
    }
    
    // Convert style.shadow to boxShadows
    if (comp.style.shadow && !comp.props.boxShadows) {
      const s = comp.style.shadow;
      comp.props.boxShadows = [{
        enabled: true,
        type: 'outer',
        x: s.x || 0,
        y: s.y || 8,
        blur: s.blur || 24,
        spread: s.spread || -4,
        color: s.color || 'rgba(0,0,0,0.12)'
      }];
      delete comp.style.shadow;
    }
    
    // Convert style.effects to flat props
    if (comp.style.effects) {
      const effects = comp.style.effects;
      if (effects.filter) comp.props.filter = effects.filter;
      if (effects.backdropFilter) comp.props.backdropFilter = effects.backdropFilter;
      if (effects.opacity !== undefined) comp.props.opacity = effects.opacity;
      if (effects.pointerEvents) comp.props.pointerEvents = effects.pointerEvents;
      delete comp.style.effects;
    }
    
    // Convert style.position to flat position props
    if (comp.style.position) {
      const pos = comp.style.position;
      if (pos.position) comp.props.position = pos.position;
      if (pos.top !== undefined) comp.props.top = pos.top;
      if (pos.right !== undefined) comp.props.right = pos.right;
      if (pos.bottom !== undefined) comp.props.bottom = pos.bottom;
      if (pos.left !== undefined) comp.props.left = pos.left;
      if (pos.zIndex !== undefined) comp.props.zIndex = pos.zIndex;
      delete comp.style.position;
    }
    
    // Move flat style properties to props
    const flatKeys = ['backdropFilter', 'opacity', 'cursor', 'pointerEvents', 'position', 
                     'top', 'right', 'bottom', 'left', 'zIndex', 'transform', 'transition',
                     'hoverTransform', 'hoverShadow', 'filter'];
    flatKeys.forEach(key => {
      if (comp.style[key] !== undefined && comp.props[key] === undefined) {
        comp.props[key] = comp.style[key];
        delete comp.style[key];
      }
    });
    
    // Clean up empty style object
    if (Object.keys(comp.style).length === 0) {
      delete comp.style;
    }
  }
  
  // ═══════════════════════════════════════════════════
  // CARD PROTECTION: Add minWidth to prevent squishing
  // ═══════════════════════════════════════════════════
  const id = (comp.id || '').toLowerCase();
  const isCard = comp.type === 'div' && (
    id.includes('card') ||
    id.includes('product-') ||
    id.includes('feature-') ||
    id.includes('testimonial-') ||
    id.includes('pricing-') ||
    id.includes('project-') ||
    id.includes('team-') ||
    id.includes('service-') ||
    (comp.props?.display === 'flex' && comp.props?.flexDirection === 'column' && comp.props?.backgroundColor)
  );
  
  if (isCard && !comp.props.minWidth) {
    comp.props.minWidth = '200px';
    comp.props.width = comp.props.width || '100%';
  }
  
   // ═══════════════════════════════════════════════════
   // CARD SAFETY: Minimal guards — DO NOT override AI-generated styling
   // ═══════════════════════════════════════════════════
   if (isCard) {
     // Text overflow protection only
     comp.props.wordBreak = 'break-word';
     
     // Ensure cards have flex-column for internal layout IF not already set
     if (!comp.props.display) {
       comp.props.display = 'flex';
       comp.props.flexDirection = 'column';
     }
     comp.props.gap = comp.props.gap || '16';
   }
   
   // ═══════════════════════════════════════════════════
   // GRID SAFETY: Add responsive fallbacks without destroying layout choice
   // ═══════════════════════════════════════════════════
   const isGrid = comp.props?.display === 'grid';
   const hasMultipleChildren = Array.isArray(comp.children) && comp.children.length >= 3;
   
   if (isGrid && hasMultipleChildren) {
     // Add responsive styles if missing — do NOT convert grid to flex
     if (!comp.props.gridTemplateColumns) {
       const childCount = comp.children.length;
       const columns = childCount >= 4 ? 4 : childCount >= 3 ? 3 : 2;
       comp.props.gridTemplateColumns = `repeat(${columns}, 1fr)`;
     }
     comp.props.tabletStyles = comp.props.tabletStyles || {};
     comp.props.tabletStyles.gridTemplateColumns = comp.props.tabletStyles.gridTemplateColumns || 'repeat(2, 1fr)';
     comp.props.mobileStyles = comp.props.mobileStyles || {};
     comp.props.mobileStyles.gridTemplateColumns = comp.props.mobileStyles.gridTemplateColumns || '1fr';
     comp.props.width = comp.props.width || '100%';
     comp.props.maxWidth = comp.props.maxWidth || '1400px';
     comp.props.gap = comp.props.gap || '24';
   }
   
   // ═══════════════════════════════════════════════════
   // CARD CONTAINER SAFETY: Fix stacking only, preserve AI-generated visual styling
   // ═══════════════════════════════════════════════════
   const isCardContainer = id.includes('-grid') || id.includes('-cards') || id.includes('-row') ||
                           id.includes('features-') || id.includes('products-') || 
                           id.includes('testimonials-') || id.includes('team-');
   const hasCardChildren = Array.isArray(comp.children) && comp.children.length >= 3 && 
     comp.children.some((c: any) => {
       const cid = (c.id || '').toLowerCase();
       return cid.includes('card') || cid.includes('item') || cid.includes('feature') || cid.includes('product');
     });
   
   if (isCardContainer && hasCardChildren && comp.type === 'div') {
     // Only fix vertical stacking — if container is flex-column with cards, switch to row
     if (comp.props.display === 'flex' && comp.props.flexDirection === 'column') {
       comp.props.flexDirection = 'row';
       comp.props.flexWrap = 'wrap';
       comp.props.justifyContent = comp.props.justifyContent || 'center';
       comp.props.alignItems = comp.props.alignItems || 'stretch';
       comp.props.gap = comp.props.gap || '24';
       // Add responsive fallbacks
       comp.props.tabletStyles = comp.props.tabletStyles || {};
       comp.props.tabletStyles.flexWrap = 'wrap';
       comp.props.mobileStyles = comp.props.mobileStyles || {};
       comp.props.mobileStyles.flexDirection = 'column';
       comp.props.mobileStyles.alignItems = 'stretch';
     }
   }
  
  // Force links to have no underline by default
  if (comp.type === 'link') {
    if (!comp.props.underline) {
      comp.props.underline = 'none';
    }
    if (comp.props.typography?.textDecoration === 'underline') {
      comp.props.typography.textDecoration = 'none';
    }
  }

  // ═══════════════════════════════════════════════════
  // PLACEHOLDER TEXT SANITIZER — Safety net for banned text
  // ═══════════════════════════════════════════════════
  const bannedPatterns = /^(link\s*text|link\s*\d+|button|brandname|logo\s*text|company\s*name|sample\s*text|click\s*here|submit|your\s*brand|placeholder)$/i;
  
  const textProp = comp.props?.content || comp.props?.text;
  if (typeof textProp === 'string' && bannedPatterns.test(textProp.trim())) {
    const parentId = (comp._parentId || comp.id || '').toLowerCase();
    
    if (comp.type === 'link') {
      const navFallbacks = ['Features', 'Pricing', 'About', 'Blog', 'Contact'];
      const footerFallbacks = ['Privacy Policy', 'Terms of Service', 'Documentation', 'Support'];
      const fallbacks = parentId.includes('footer') ? footerFallbacks : navFallbacks;
      const idx = Math.floor(Math.random() * fallbacks.length);
      const replacement = fallbacks[idx];
      if (comp.props.content) comp.props.content = replacement;
      if (comp.props.text) comp.props.text = replacement;
    } else if (comp.type === 'button') {
      const buttonFallbacks = ['Learn More', 'Get Started', 'Explore', 'Try It Free', 'See Plans'];
      const idx = Math.floor(Math.random() * buttonFallbacks.length);
      comp.props.text = buttonFallbacks[idx];
      if (comp.props.content) delete comp.props.content;
    } else if (comp.type === 'heading') {
      const brandFallbacks = ['Meridian', 'Praxis', 'Luminary', 'Atelier', 'Archetype'];
      const idx = Math.floor(Math.random() * brandFallbacks.length);
      comp.props.content = brandFallbacks[idx];
    }
  }

  // Recursively fix children — pass parent ID context for sanitizer
  if (Array.isArray(comp.children)) {
    comp.children = comp.children.map((child: any) => {
      if (child && typeof child === 'object') {
        child._parentId = comp.id || '';
      }
      return fixComponentGlobal(child);
    });
  }
  
  // Clean up internal marker
  delete comp._parentId;
  
  return comp;
};

// GRADIENTS ARE NOW ALLOWED — stripGradients has been removed.
// The AI is encouraged to use gradients on hero/CTA sections.

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRAST ENFORCEMENT — Ensure text is readable on all backgrounds
// ═══════════════════════════════════════════════════════════════════════════════

function hexLuminance(hex: string): number {
  if (!hex || typeof hex !== 'string') return 0.5;
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  if (hex.length !== 6) return 0.5;
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function isDarkBackground(bgValue: any): boolean {
  if (!bgValue) return false;
  let hex = '';
  if (typeof bgValue === 'string') {
    hex = bgValue;
  } else if (typeof bgValue === 'object' && bgValue.value) {
    hex = bgValue.value;
  }
  if (!hex) return false;
  // Handle rgba/rgb strings
  if (hex.includes('rgb')) {
    const match = hex.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1]) / 255;
      const g = parseInt(match[2]) / 255;
      const b = parseInt(match[3]) / 255;
      const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      const lum = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
      return lum < 0.45;
    }
    return false;
  }
  if (hex.includes('var(') || hex.includes('hsl')) return false;
  return hexLuminance(hex) < 0.45;
}

function enforceTextContrast(comp: any, parentIsDark: boolean = false): any {
  if (!comp || typeof comp !== 'object') return comp;
  
  comp.props = comp.props || {};
  
  // Determine if THIS component has a dark background
  const bg = comp.props.backgroundColor;
  const thisBgIsDark = isDarkBackground(bg);
  const effectiveDark = thisBgIsDark || (parentIsDark && !bg);
  
  // For text-bearing components, enforce contrast
  const isTextComponent = ['text', 'heading', 'link', 'label', 'blockquote'].includes(comp.type);
  const isButton = comp.type === 'button';
  
  if (isTextComponent && effectiveDark) {
    comp.props.typography = comp.props.typography || {};
    const currentColor = comp.props.typography.color || comp.props.color;
    
    // Check if current text color is dark (bad contrast on dark bg)
    if (!currentColor || isDarkTextColor(currentColor)) {
      comp.props.typography.color = '#ffffff';
    }
  }
  
  // For nav links on dark backgrounds
  if (comp.type === 'link' && effectiveDark) {
    comp.props.typography = comp.props.typography || {};
    if (!comp.props.typography.color || isDarkTextColor(comp.props.typography.color)) {
      comp.props.typography.color = 'rgba(255,255,255,0.85)';
    }
  }
  
  // Button contrast: if button has dark bg, ensure text is light
  if (isButton && isDarkBackground(comp.props.backgroundColor)) {
    comp.props.typography = comp.props.typography || {};
    if (!comp.props.typography.color || isDarkTextColor(comp.props.typography.color)) {
      comp.props.typography.color = '#ffffff';
    }
  }
  
  // Recursively process children, passing dark context down
  if (Array.isArray(comp.children)) {
    comp.children = comp.children.map((child: any) => enforceTextContrast(child, effectiveDark));
  }
  
  return comp;
}

function isDarkTextColor(color: string): boolean {
  if (!color || typeof color !== 'string') return false;
  // Common dark colors that would be invisible on dark backgrounds
  const darkPatterns = ['#000', '#111', '#1a1', '#1e2', '#0c0', '#0f1', '#222', '#333', '#0a0', '#09'];
  const lowerColor = color.toLowerCase();
  if (darkPatterns.some(p => lowerColor.startsWith(p))) return true;
  if (lowerColor.startsWith('#') && lowerColor.length >= 7) {
    return hexLuminance(lowerColor) < 0.35;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRICING LAYOUT ENFORCEMENT — Force pricing cards into horizontal row
// ═══════════════════════════════════════════════════════════════════════════════

function enforcePricingLayout(comp: any): any {
  if (!comp || typeof comp !== 'object') return comp;
  
  const id = (comp.id || '').toLowerCase();
  
  // Detect pricing sections
  if (id.includes('pricing')) {
    // Find card container (div with 2-3+ card children)
    if (Array.isArray(comp.children)) {
      comp.children = comp.children.map((child: any) => {
        if (!child || typeof child !== 'object') return child;
        const childId = (child.id || '').toLowerCase();
        const hasCardChildren = Array.isArray(child.children) && child.children.length >= 2 &&
          child.children.some((c: any) => {
            const cid = (c.id || '').toLowerCase();
            return cid.includes('card') || cid.includes('pricing') || cid.includes('tier') || cid.includes('plan');
          });
        
        if (hasCardChildren && child.type === 'div') {
          // Force row layout
          child.props = child.props || {};
          child.props.display = 'flex';
          child.props.flexDirection = 'row';
          child.props.flexWrap = 'wrap';
          child.props.justifyContent = 'center';
          child.props.gap = child.props.gap || '24';
          child.props.width = '100%';
          child.props.maxWidth = child.props.maxWidth || '1200px';
          
          // Fix each card child sizing
          child.children = child.children.map((card: any) => {
            if (!card || typeof card !== 'object') return card;
            card.props = card.props || {};
            const cardCount = child.children.length;
            const basis = cardCount >= 3 ? 'calc(33.333% - 16px)' : 'calc(50% - 12px)';
            card.props.flexBasis = basis;
            card.props.minWidth = '280px';
            card.props.maxWidth = '400px';
            
            // Responsive
            card.props.tabletStyles = card.props.tabletStyles || {};
            card.props.tabletStyles.flexBasis = 'calc(50% - 12px)';
            card.props.mobileStyles = card.props.mobileStyles || {};
            card.props.mobileStyles.flexBasis = '100%';
            card.props.mobileStyles.minWidth = '100%';
            
            // Fix badge sizing inside pricing cards
            if (Array.isArray(card.children)) {
              card.children = card.children.map((grandchild: any) => {
                if (!grandchild || typeof grandchild !== 'object') return grandchild;
                const gcId = (grandchild.id || '').toLowerCase();
                const gcContent = (grandchild.props?.content || grandchild.props?.text || '').toLowerCase();
                const isBadge = grandchild.type === 'badge' || 
                  gcId.includes('badge') || gcId.includes('popular') ||
                  gcContent.includes('popular') || gcContent.includes('recommended') || gcContent.includes('best');
                
                if (isBadge) {
                  grandchild.props = grandchild.props || {};
                  grandchild.props.width = 'auto';
                  grandchild.props.alignSelf = 'flex-start';
                  grandchild.props.display = 'inline-flex';
                  if (!grandchild.props.spacingControl) {
                    grandchild.props.spacingControl = {
                      padding: { top: '6', right: '16', bottom: '6', left: '16', unit: 'px' }
                    };
                  }
                  if (!grandchild.props.borderRadius) {
                    grandchild.props.borderRadius = { topLeft: '999', topRight: '999', bottomRight: '999', bottomLeft: '999', unit: 'px' };
                  }
                }
                return grandchild;
              });
            }
            
            return card;
          });
          
          // Responsive on container
          child.props.tabletStyles = child.props.tabletStyles || {};
          child.props.tabletStyles.flexWrap = 'wrap';
          child.props.mobileStyles = child.props.mobileStyles || {};
          child.props.mobileStyles.flexDirection = 'column';
          child.props.mobileStyles.alignItems = 'stretch';
        }
        
        return enforcePricingLayout(child);
      });
    }
  } else if (Array.isArray(comp.children)) {
    comp.children = comp.children.map(enforcePricingLayout);
  }
  
  return comp;
}


// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSIVE DEFAULTS INJECTION — Ported from AI Wall for safety-net responsive coverage
// Injects mobileStyles/tabletStyles on every component type when LLM omits them
// ═══════════════════════════════════════════════════════════════════════════════

function injectResponsiveDefaults(component: any): any {
  if (!component || typeof component !== 'object') return component;

  const props = component.props || {};
  const styles = props.styles || props.style || {};
  const type = component.type || '';
  const children = component.children || [];
  const childCount = Array.isArray(children) ? children.length : 0;

  // Initialize responsive style objects if missing
  if (!props.mobileStyles) props.mobileStyles = {};
  if (!props.tabletStyles) props.tabletStyles = {};

  const mobile = props.mobileStyles;
  const tablet = props.tabletStyles;

  // ── Flex row containers with multiple children → stack on mobile ──
  const isFlexContainer = styles.display === 'flex' || props.display === 'flex';
  const fd = styles.flexDirection || props.flexDirection || (isFlexContainer ? 'row' : null);
  if (fd === 'row' && childCount >= 2) {
    if (!mobile.flexDirection) mobile.flexDirection = 'column';
    if (childCount >= 3 && !tablet.flexDirection) tablet.flexDirection = 'column';
    if (!mobile.flexWrap) mobile.flexWrap = 'wrap';
  }

  // ── Any flex container with nowrap and 2+ children → wrap on mobile ──
  if (isFlexContainer && childCount >= 2) {
    const fw = styles.flexWrap || props.flexWrap;
    if (!fw || fw === 'nowrap') {
      if (!mobile.flexWrap) mobile.flexWrap = 'wrap';
    }
  }

  // ── Grid layouts → single column on mobile, 2-col on tablet ──
  const gtc = styles.gridTemplateColumns || props.gridTemplateColumns;
  if (gtc && typeof gtc === 'string' && (gtc.includes('fr') || gtc.includes('repeat'))) {
    if (!mobile.gridTemplateColumns) mobile.gridTemplateColumns = '1fr';
    if (!tablet.gridTemplateColumns) tablet.gridTemplateColumns = 'repeat(2, 1fr)';
  }

  // ── Large headings → scale down font size ──
  if (type === 'heading' || type === 'h1' || type === 'h2' || type === 'h3') {
    const fs = parseFloat(styles.fontSize || props.fontSize);
    if (fs && fs > 36) {
      if (!mobile.fontSize) mobile.fontSize = String(Math.round(fs * 0.5));
      if (!tablet.fontSize) tablet.fontSize = String(Math.round(fs * 0.7));
    } else if (fs && fs > 24) {
      if (!mobile.fontSize) mobile.fontSize = String(Math.round(fs * 0.65));
      if (!tablet.fontSize) tablet.fontSize = String(Math.round(fs * 0.8));
    }
    if (!mobile.wordBreak) mobile.wordBreak = 'break-word';
    if (!mobile.overflowWrap) mobile.overflowWrap = 'break-word';
    if (!mobile.lineHeight) mobile.lineHeight = '1.2';
  }

  // ── Text / labels / badges / spans with large font → scale ──
  if (type === 'text' || type === 'p' || type === 'span' || type === 'label' || type === 'badge') {
    const fs = parseFloat(styles.fontSize || props.fontSize);
    if (fs && fs > 20) {
      if (!mobile.fontSize) mobile.fontSize = String(Math.round(fs * 0.75));
      if (!tablet.fontSize) tablet.fontSize = String(Math.round(fs * 0.85));
    }
    if (!mobile.wordBreak) mobile.wordBreak = 'break-word';
  }

  // ── ALL images → always fluid on mobile (safety net) ──
  if (type === 'image' || type === 'img') {
    if (!mobile.width) mobile.width = '100%';
    if (!mobile.height) mobile.height = 'auto';
    if (!mobile.maxWidth) mobile.maxWidth = '100%';
  }

  // ── Buttons → full width on mobile; reset minWidth if large ──
  if (type === 'button') {
    if (!mobile.width) mobile.width = '100%';
    const mw = parseFloat(styles.minWidth || props.minWidth);
    if (mw && mw > 100) {
      if (!mobile.minWidth) mobile.minWidth = 'unset';
    }
  }

  // ── Links → full width on mobile ──
  if (type === 'link') {
    if (!mobile.width) mobile.width = '100%';
  }

  // ── Absolute-positioned children → relative on mobile to prevent off-screen ──
  const pos = styles.position || props.position;
  if (pos === 'absolute') {
    if (!mobile.position) mobile.position = 'relative';
    if (!mobile.top) mobile.top = 'auto';
    if (!mobile.left) mobile.left = 'auto';
    if (!mobile.right) mobile.right = 'auto';
    if (!mobile.bottom) mobile.bottom = 'auto';
  }

  // ── Cards / containers with fixed width or flex-basis → fluid on mobile ──
  if (type === 'card' || type === 'div' || type === 'column') {
    const w = styles.width || props.width;
    const fb = styles.flexBasis || props.flexBasis;
    const mw = styles.minWidth || props.minWidth;
    if ((w && !String(w).includes('%') && w !== 'auto') ||
        (fb && fb !== 'auto' && !String(fb).includes('%')) ||
        (mw && !String(mw).includes('%') && mw !== '0' && mw !== 'auto')) {
      if (!mobile.width) mobile.width = '100%';
      if (!mobile.flexBasis) mobile.flexBasis = 'auto';
      if (!mobile.minWidth) mobile.minWidth = 'unset';
      if (!mobile.maxWidth) mobile.maxWidth = '100%';
    }
  }

  // ── Any element with explicit width > 300px → fluid on mobile ──
  const explicitWidth = parseFloat(styles.width || props.width);
  if (explicitWidth && explicitWidth > 300 && type !== 'image' && type !== 'img') {
    if (!mobile.width) mobile.width = '100%';
    if (!mobile.maxWidth) mobile.maxWidth = '100%';
  }

  // ── Sections / containers → side padding + overflow safety ──
  if (type === 'section' || type === 'container' || type === 'div') {
    if (!mobile.paddingLeft && !styles.paddingLeft) mobile.paddingLeft = '16';
    if (!mobile.paddingRight && !styles.paddingRight) mobile.paddingRight = '16';
    if (!mobile.overflow) mobile.overflow = 'hidden';
  }

  // ── Form wrappers → ensure children stack on mobile ──
  if (type === 'form-wrapper') {
    if (!mobile.flexDirection) mobile.flexDirection = 'column';
    if (!mobile.width) mobile.width = '100%';
  }

  // ── Button containers (flex rows with mostly button children) → stack on mobile ──
  if (isFlexContainer && fd === 'row' && childCount >= 2) {
    const buttonChildren = Array.isArray(children) ? children.filter((c: any) => c?.type === 'button') : [];
    if (buttonChildren.length >= 2) {
      if (!mobile.flexDirection) mobile.flexDirection = 'column';
      if (!mobile.alignItems) mobile.alignItems = 'stretch';
      buttonChildren.forEach((btn: any) => {
        if (!btn.props) btn.props = {};
        if (!btn.props.mobileStyles) btn.props.mobileStyles = {};
        if (!btn.props.mobileStyles.width) btn.props.mobileStyles.width = '100%';
      });
    }
  }

  // ── Large gaps → reduce on mobile ──
  const gap = parseFloat(styles.gap || props.gap);
  if (gap && gap > 32) {
    if (!mobile.gap) mobile.gap = String(Math.round(gap * 0.5));
  } else if (gap && gap > 16) {
    if (!mobile.gap) mobile.gap = String(Math.round(gap * 0.65));
  }

  // ── Large padding → reduce on mobile ──
  const pt = parseFloat(styles.paddingTop || props.paddingTop);
  const pb = parseFloat(styles.paddingBottom || props.paddingBottom);
  if (pt && pt > 60) {
    if (!mobile.paddingTop) mobile.paddingTop = String(Math.round(pt * 0.5));
  }
  if (pb && pb > 60) {
    if (!mobile.paddingBottom) mobile.paddingBottom = String(Math.round(pb * 0.5));
  }

  // Clean up empty responsive objects
  if (Object.keys(mobile).length === 0) delete props.mobileStyles;
  if (Object.keys(tablet).length === 0) delete props.tabletStyles;

  // Recurse into children
  if (Array.isArray(children)) {
    component.children = children.map((child: any) => injectResponsiveDefaults(child));
  }

  return component;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CARD LAYOUT QUALITY ENFORCEMENT — Ported from AI Wall
// Prevents squeezed card layouts by enforcing proper flex sizing on card grids
// ═══════════════════════════════════════════════════════════════════════════════

function enforceCardLayoutQuality(component: any): any {
  if (!component || typeof component !== 'object') return component;

  const props = component.props || {};
  const children = Array.isArray(component.children) ? component.children : [];

  // ── Detect flex-row containers with multiple card-like children ──
  const isFlexContainer = props.display === 'flex' || props.style?.display === 'flex';
  const fd = props.flexDirection || props.style?.flexDirection;
  const isFlexRow = isFlexContainer && (fd === 'row' || !fd);

  const cardTypes = ['div', 'card', 'column'];
  const cardLikeChildren = children.filter((c: any) => c && typeof c === 'object' && cardTypes.includes(c.type));

  if (isFlexRow && cardLikeChildren.length >= 2) {
    // Fix container
    props.flexWrap = 'wrap';
    const currentGap = parseInt(props.gap || '0', 10);
    if (!props.gap || currentGap < 16) props.gap = '24';
    if (!props.alignItems) props.alignItems = 'stretch';

    // Calculate flex basis based on child count
    const gapPx = parseInt(props.gap || '24', 10);
    let flexBasis: string;
    if (cardLikeChildren.length === 2) {
      flexBasis = `calc(50% - ${gapPx}px)`;
    } else if (cardLikeChildren.length === 3) {
      flexBasis = `calc(33.333% - ${gapPx}px)`;
    } else {
      flexBasis = `calc(25% - ${gapPx}px)`;
    }

    // Fix each card child
    for (const card of cardLikeChildren) {
      if (!card.props) card.props = {};
      const cp = card.props;

      const currentMin = parseInt(cp.minWidth || '0', 10);
      if (!cp.minWidth || currentMin < 200) {
        cp.minWidth = '280px';
      }

      if (!cp.flex) {
        cp.flex = `1 1 ${flexBasis}`;
      }

      cp.overflow = 'visible';

      const hasPadding = cp.padding || cp.paddingTop || cp.paddingLeft || cp.paddingRight || cp.paddingBottom;
      if (!hasPadding) {
        cp.padding = '24px';
      }
    }
  }

  // ── Detect grid containers with narrow columns → enforce minWidth ──
  const gtc = props.gridTemplateColumns || props.style?.gridTemplateColumns || '';
  if (typeof gtc === 'string' && gtc.includes('1fr')) {
    const frCount = (gtc.match(/1fr/g) || []).length;
    if (frCount >= 3) {
      for (const child of children) {
        if (child && typeof child === 'object') {
          if (!child.props) child.props = {};
          if (!child.props.minWidth) child.props.minWidth = '250px';
        }
      }
    }
  }

  // Recurse into children
  if (Array.isArray(component.children)) {
    component.children = component.children.map((child: any) => enforceCardLayoutQuality(child));
  }

  return component;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Feature Card Icon Sanitizer — fixes oversized icon containers, replaces
// images with proper icons, and ensures icon variety across sibling cards.
// ═══════════════════════════════════════════════════════════════════════════════

const FEATURE_ICON_POOL = [
  'Zap', 'Shield', 'Globe', 'TrendingUp', 'Users', 'Lock', 'BarChart',
  'Sparkles', 'Layers', 'Target', 'Compass', 'Rocket', 'Lightbulb',
  'Award', 'Star', 'Activity', 'Cpu', 'Mail', 'Eye', 'Clock', 'Puzzle', 'Flame'
];

function sanitizeFeatureCardIcons(component: any, seenIcons: Set<string> = new Set()): any {
  if (!component || typeof component !== 'object') return component;

  const id = (component.id || '').toLowerCase();
  const cType = (component.type || '').toLowerCase();

  // Detect feature card containers (parent holding multiple feature cards)
  const isFeatureContainer = (id.includes('feature') && (id.includes('container') || id.includes('grid') || id.includes('cards')))
    && Array.isArray(component.children) && component.children.length >= 2;

  if (isFeatureContainer) {
    // Process sibling cards together so we can enforce icon variety
    const siblingSeenIcons = new Set<string>();
    component.children = component.children.map((child: any) => {
      return sanitizeSingleFeatureCard(child, siblingSeenIcons);
    });
  }

  // Also detect individual feature cards at any depth
  const isFeatureCard = !isFeatureContainer &&
    (id.includes('feature-card') || id.includes('feature-item') ||
     (id.includes('feature') && ['div', 'card', 'column'].includes(cType)));

  if (isFeatureCard) {
    return sanitizeSingleFeatureCard(component, seenIcons);
  }

  // Recurse into children
  if (Array.isArray(component.children)) {
    component.children = component.children.map((child: any) => sanitizeFeatureCardIcons(child, seenIcons));
  }

  return component;
}

function sanitizeSingleFeatureCard(card: any, seenIcons: Set<string>): any {
  if (!card || typeof card !== 'object' || !Array.isArray(card.children) || card.children.length === 0) {
    return card;
  }

  const firstChild = card.children[0];
  if (!firstChild) return card;

  // Case 1: First child is an image — replace with icon container
  if (firstChild.type === 'image') {
    const iconName = getNextUniqueIcon(seenIcons);
    card.children[0] = makeIconContainer(card.id || 'feature', iconName);
    console.log(`[FeatureCardFix] Replaced image with icon "${iconName}" in ${card.id}`);
  }
  // Case 2: First child is a div containing an icon (icon container) — check size
  else if ((firstChild.type === 'div' || firstChild.type === 'column') && firstChild.props) {
    const props = firstChild.props;
    const w = parseInt(String(props.width || '0'), 10);
    const h = parseInt(String(props.height || '0'), 10);

    // Cap oversized containers
    if (w > 64 || h > 64) {
      props.width = '48';
      props.height = '48';
      console.log(`[FeatureCardFix] Capped oversized icon container (${w}x${h} → 48x48) in ${card.id}`);
    }

    // Ensure flex centering
    if (!props.display) props.display = 'flex';
    if (!props.alignItems) props.alignItems = 'center';
    if (!props.justifyContent) props.justifyContent = 'center';

    // Check icon child for duplicates
    if (Array.isArray(firstChild.children)) {
      const iconChild = firstChild.children.find((c: any) => c?.type === 'icon');
      if (iconChild?.props?.iconName) {
        const currentIcon = iconChild.props.iconName;
        if (seenIcons.has(currentIcon)) {
          const newIcon = getNextUniqueIcon(seenIcons);
          iconChild.props.iconName = newIcon;
          console.log(`[FeatureCardFix] Swapped duplicate icon "${currentIcon}" → "${newIcon}" in ${card.id}`);
        } else {
          seenIcons.add(currentIcon);
        }
      }
    }
  }
  // Case 3: First child is a naked icon (no container) — wrap it
  else if (firstChild.type === 'icon') {
    const iconName = firstChild.props?.iconName || getNextUniqueIcon(seenIcons);
    if (seenIcons.has(iconName)) {
      const newIcon = getNextUniqueIcon(seenIcons);
      card.children[0] = makeIconContainer(card.id || 'feature', newIcon);
    } else {
      seenIcons.add(iconName);
      card.children[0] = makeIconContainer(card.id || 'feature', iconName);
    }
    console.log(`[FeatureCardFix] Wrapped naked icon in container in ${card.id}`);
  }

  // Recurse deeper in case of nested structures
  if (Array.isArray(card.children)) {
    card.children = card.children.map((child: any, idx: number) => {
      if (idx === 0) return child; // Already processed
      return sanitizeFeatureCardIcons(child, seenIcons);
    });
  }

  return card;
}

function getNextUniqueIcon(seenIcons: Set<string>): string {
  for (const icon of FEATURE_ICON_POOL) {
    if (!seenIcons.has(icon)) {
      seenIcons.add(icon);
      return icon;
    }
  }
  // All used — pick a random one
  const icon = FEATURE_ICON_POOL[Math.floor(Math.random() * FEATURE_ICON_POOL.length)];
  seenIcons.add(icon);
  return icon;
}

function makeIconContainer(parentId: string, iconName: string): any {
  return {
    id: `${parentId}-icon-container`,
    type: 'div',
    props: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '48',
      height: '48',
      borderRadius: { topLeft: '10', topRight: '10', bottomRight: '10', bottomLeft: '10', unit: 'px' },
      backgroundColor: { type: 'solid', value: 'rgba(99,102,241,0.12)', opacity: 100 },
    },
    style: {},
    children: [{
      id: `${parentId}-icon`,
      type: 'icon',
      props: { iconName, size: 'md', color: '#6366f1' },
      style: {},
      children: []
    }]
  };
}


// Ported from AI Wall generator for rate-limit resilience
// ═══════════════════════════════════════════════════════════════════════════════

type ProviderName = 'google' | 'openai' | 'anthropic' | 'minimax';

function getApiKeys(provider: ProviderName): string[] {
  const envMap: Record<ProviderName, string> = {
    google: 'GOOGLE_API_KEY',
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    minimax: 'MINIMAX_API_KEY',
  };
  const raw = Deno.env.get(envMap[provider]) || '';
  return raw.split(',').map(k => k.trim()).filter(Boolean);
}

function pickRandomKey(keys: string[], exclude?: string): string | null {
  const available = exclude ? keys.filter(k => k !== exclude) : keys;
  if (available.length === 0) return keys.length > 0 ? keys[0] : null;
  return available[Math.floor(Math.random() * available.length)];
}

// Legacy accessors for compatibility (getFallbackModelKeys checks these)
const anthropicApiKey = (Deno.env.get('ANTHROPIC_API_KEY') || '').split(',')[0]?.trim() || '';
const openaiApiKey = (Deno.env.get('OPENAI_API_KEY') || '').split(',')[0]?.trim() || '';
const googleApiKey = (Deno.env.get('GOOGLE_API_KEY') || '').split(',')[0]?.trim() || '';

// Supabase client for fetching design templates
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Model routing configuration with provider-specific token limits
type ModelConfig = {
  provider: 'anthropic' | 'openai' | 'google' | 'minimax';
  model: string;
  endpoint: string;
  maxTokens: number;
};

const MODEL_CONFIG: Record<string, ModelConfig> = {
  'gemini-3-pro': {
    provider: 'google',
    model: 'gemini-3-pro-preview',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent',
    maxTokens: 65535,
  },
  'gemini-3-flash': {
    provider: 'google',
    model: 'gemini-3-flash-preview',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent',
    maxTokens: 65535,
  },
  'gemini-2.5-flash': {
    provider: 'google',
    model: 'gemini-2.5-flash',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    maxTokens: 65535,
  },
  'gemini-2.5-pro': {
    provider: 'google',
    model: 'gemini-2.5-pro',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
    maxTokens: 65535,
  },
  'claude-sonnet-4': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    endpoint: 'https://api.anthropic.com/v1/messages',
    maxTokens: 64000,
  },
  'gpt-5': {
    provider: 'openai',
    model: 'gpt-5',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    maxTokens: 128000,
  },
  'gpt-5-mini': {
    provider: 'openai',
    model: 'gpt-5-mini',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    maxTokens: 128000,
  },
  'gemini-deep-research': {
    provider: 'google',
    model: 'gemini-2.5-pro',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
    maxTokens: 65535,
  },
  'openai-deep-research': {
    provider: 'openai',
    model: 'o3',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    maxTokens: 100000,
  },
  'minimax-m2.5': {
    provider: 'minimax',
    model: 'MiniMax-M2.5',
    endpoint: 'https://api.minimax.io/v1/chat/completions',
    maxTokens: 65535,
  },
  // Default fallback
  'default': {
    provider: 'google',
    model: 'gemini-3-pro-preview',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent',
    maxTokens: 65535,
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-STEP GENERATION SYSTEM - Generate page in phases for reliability
// ═══════════════════════════════════════════════════════════════════════════════

interface GenerationPhase {
  name: string;
  sections: string[];
  instructions: string;
  timeoutMs: number;
  required: boolean;
}

function buildDynamicPhases(userPrompt: string, websiteBlueprint?: ReturnType<typeof detectWebsiteType>): GenerationPhase[] {
  const lowerPrompt = userPrompt.toLowerCase();
  
  const foundation: GenerationPhase = {
    name: 'foundation',
    sections: ['nav-section', 'hero-section', 'footer-section'],
    instructions: `Generate ONLY: Navigation bar, Hero section, and Footer.
    
    THINK LIKE A CREATIVE DIRECTOR:
    Before generating, answer these questions internally:
    - What industry is this? What does "premium" look like in this space?
    - What emotion should the hero evoke? (Trust, excitement, sophistication, warmth)
    - What would make someone screenshot this and share it?
    
    ---------------------------------------------------
    NAVIGATION (The brand's first impression):
    ---------------------------------------------------
    - Brand name: Invent a DISTINCTIVE name that sounds like a real funded startup.
      Good: "Meridian", "Atelier", "Praxis", "Luminary", "Archetype", "Continuum"
      Bad: "BrandName", "MyCompany", "Sample", "TechCo", "Link text", "Company Name"
    - Each nav link MUST have a REAL label like "Features", "Pricing", "About", "Blog" -- if you use "Link text" the build will FAIL.
    - Each button MUST have a specific CTA like "Start Free Trial", "Book Demo" -- if you use "Button" the build will FAIL.
    - Nav links: 4-5 specific terms that signal the industry (e.g., "Solutions", "Case Studies", "Pricing", "Resources")
    - CTA button in nav: specific action verb ("Talk to Sales", "Get a Demo", "Try Free")
    - Style: height 64-72px, clean, sticky with glass blur. Logo fontWeight "800".
    - BANNED: "Link text", "Link 1", "Page", "Menu Item", "Sample Heading", "Sample text", "Company Name", "BrandName"
    
    ---------------------------------------------------
    HERO (The money shot -- this section sells the entire page):
    ---------------------------------------------------
    
    STRUCTURE (top to bottom):
    1. SECTION LABEL (pill badge above headline):
       - Small text, uppercase, letterSpacing "0.1em", fontSize "12", fontWeight "600"
       - Thin accent-colored border (1px), borderRadius "999", padding "6px 16px"
       - Content = platform category: "NEXT-GEN ANALYTICS", "DESIGN INFRASTRUCTURE", "AI-POWERED COMMERCE"
    
    2. HEADLINE (the single most important element on the page):
       - fontSize 56-72, fontWeight 700-900, lineHeight "1.1"
       - 4-8 words that create DESIRE, not describe features
       - Great: "Ship Products That Users Love", "Where Ideas Become Reality", "The Future of Enterprise AI"
       - Bad: "Welcome to Our Platform", "The Best Solution", "Your All-In-One Tool"
    
    3. SUBHEADING (value prop in one breath):
       - fontSize 18-20, fontWeight 400, lineHeight "1.6", muted color (70% opacity of text color)
       - 15-25 words. Explain the OUTCOME, not the process.
       - Great: "Join 10,000+ teams who reduced deployment time by 90% with zero configuration."
       - Bad: "We provide tools and services to help your business grow and succeed."
    
    4. CTA ROW (two buttons, clear hierarchy):
       - Primary: filled with accent, specific action ("Start Building Free", "See It In Action")
       - Secondary: outline/ghost variant, lower commitment ("Watch Demo", "Read Case Study")
       - Gap "16" between buttons, both with borderRadius matching design seed
    
    5. OPTIONAL TRUST SIGNAL below CTAs:
       - Small text with logos/avatars: "Trusted by teams at" + 3-4 company names
       - Or metric: "★ 4.9/5 from 2,000+ reviews" 
    
    HERO LAYOUT — Choose based on industry:
    
      SPLIT HERO (SaaS, tech, platforms — the most common premium pattern):
        * flexDirection "row", alignItems "center", gap "64", flexWrap "wrap"
        * Left: flexBasis "55%", minWidth "320px" — badge, heading, subtext, CTAs, trust
        * Right: flexBasis "40%", minWidth "300px" — product screenshot or abstract visual
        * Image: maxHeight "480", borderRadius "16", boxShadow "0 24px 80px rgba(0,0,0,0.15)"
    
      CENTERED HERO (portfolios, agencies, minimal brands):
        * flexDirection "column", alignItems "center", textAlign "center"
        * Heading centered, body maxWidth "640px" centered
        * Optional small accent visual below CTAs or NO image (just bold type + solid accent bg)
    
      CINEMATIC HERO (hospitality, events, creative, luxury):
        * position "relative", minHeight "85vh"
        * Background: imagePrompt with descriptive scene, objectFit "cover"
        * Overlay: solid dark overlay (backgroundColor rgba(0,0,0,0.5))
        * Content: position "relative", zIndex "2", white text, centered
    
      EDITORIAL HERO (blogs, media, editorial):
        * Asymmetric 40/60 split, larger visual area
        * Image side flexBasis "55%", full height cover image
        * Text side flexBasis "40%", vertically centered, generous padding
    
    ---------------------------------------------------
    FOOTER (Organized, informative, dark):
    ---------------------------------------------------
    - Dark background (darkest shade from palette)
    - Content: flexDirection "row", flexWrap "wrap", gap "48", maxWidth "1200px"
    - Brand column (35%): Logo, 2-line company description, social icons row
    - 3 Link columns (18% each): category headings (fontWeight "600") + 4-5 real links each
      Column 1 "Product": Features, Integrations, Pricing, Changelog, API Docs
      Column 2 "Company": About, Careers, Blog, Press, Partners
      Column 3 "Legal": Privacy Policy, Terms of Service, Cookie Settings, Security
    - Bottom: separator + "© 2026 [Brand]. All rights reserved." + social icon row
    - NEVER use "Link text", "Link 1", "Link 2", "Button", "Sample text", "Sample Heading" -- every link and button MUST have real descriptive text. Using placeholder text will cause a BUILD FAILURE.
    - CRITICAL: footer-content uses flexDirection "row", individual columns use "column"`,
    timeoutMs: 50000,
    required: true
  };

  // Pool of optional middle sections
  const middleSectionPool: GenerationPhase[] = [
    {
      name: 'features',
      sections: ['features-section'],
      instructions: `Generate ONLY: Features section.
      
      MANDATORY LAYOUT (CRITICAL -- controls how cards are arranged):
      - Section wrapper: display "flex", flexDirection "column", alignItems "center", width "100%"
      - Card CONTAINER (the div holding all cards): display "flex", flexDirection "row", flexWrap "wrap", justifyContent "center", gap "24", width "100%", maxWidth "1200px"
      - Each card: flexBasis "calc(33.333% - 16px)", minWidth "280px", maxWidth "400px"
      - For 4 cards: flexBasis "calc(25% - 18px)"; for 2 cards: flexBasis "calc(50% - 12px)"
      - tabletStyles on container: { flexWrap: "wrap" }; on cards: { flexBasis: "calc(50% - 12px)" }
      - mobileStyles on container: { flexDirection: "column" }; on cards: { flexBasis: "100%", minWidth: "100%" }
      
      CONTENT REQUIREMENTS (CRITICAL - NO PLACEHOLDER TEXT):
      - Section label: Use OUTLINED BADGE pattern
      - Section heading: Industry-relevant title (e.g., "Why Choose Us", "Our Capabilities", "What We Offer")
      - 3-6 feature cards, each with this INTERNAL ANATOMY:
        - Icon in a CONTAINER: a div (width "48", height "48" -- NEVER LARGER than 48x48), borderRadius "10", 
          background matching accent at 10% opacity or rgba(255,255,255,0.06) on dark themes),
          with display "flex", alignItems "center", justifyContent "center", containing one icon child.
          ❌ NEVER place a naked icon without a container div.
          ❌ NEVER use type "image" inside feature cards -- ONLY use type "icon" with an iconName prop.
          ❌ NEVER make the icon container larger than 48x48 pixels.
          ✅ Each card MUST use a DIFFERENT, context-relevant icon. Example variety: Zap, Shield, Globe, TrendingUp, Users, Lock, BarChart, Sparkles, Layers, Target, Compass, Rocket, Lightbulb, Award, Activity, Cpu, Mail, Eye, Clock.
          ✅ Pick icons that semantically match each feature's meaning (e.g., security feature → Shield, analytics → BarChart, speed → Zap).
        - Specific feature title (3-5 words, bold fontWeight "600"): "Real-Time Analytics", "24/7 Expert Support"
        - Descriptive text (15-25 words, muted color) explaining the BENEFIT to the user
        - On dark themes: cards MUST have border "1px solid rgba(255,255,255,0.08)"
      - Consider BENTO ASYMMETRY: make one feature card larger (spanning 2 columns) with more detail
      
      NEVER use "Sample text", "Feature 1", "Description here", or any placeholder text.`,
      timeoutMs: 18000,
      required: false
    },
    {
      name: 'about',
      sections: ['about-section'],
      instructions: `Generate ONLY: About section.
      
      MANDATORY LAYOUT:
      - Section: display "flex", flexDirection "column", alignItems "center", width "100%"
      - Content area: display "grid", gridTemplateColumns "1fr 1fr", gap "64", maxWidth "1200px", width "100%"
        tabletStyles: { gridTemplateColumns: "1fr" }, mobileStyles: { gridTemplateColumns: "1fr" }
      - Stats row: display "flex", flexDirection "row", gap "32", flexWrap "wrap", justifyContent "flex-start"
        Each stat: display "flex", flexDirection "column", minWidth "120px"
        Stat number: fontSize "36"-"48", fontWeight "800"; label: fontSize "14", muted color
      
      CONTENT REQUIREMENTS (CRITICAL - NO PLACEHOLDER TEXT):
      - Company story or mission statement (30-50 words)
      - Team avatars with REAL-SOUNDING names: "Sarah Chen", "Marcus Rivera", "Emily Watson"
      - Job titles relevant to the industry
      - Stats row with 3 impressive metrics in the HORIZONTAL layout above
      
      NEVER use "Sample text" or any placeholder.`,
      timeoutMs: 18000,
      required: false
    },
    {
      name: 'testimonials',
      sections: ['testimonials-section'],
      instructions: `Generate ONLY: Testimonials section.
      
      MANDATORY LAYOUT (CRITICAL -- testimonial cards MUST be side-by-side, NEVER stacked vertically):
      - Section wrapper: display "flex", flexDirection "column", alignItems "center", width "100%"
      - Cards CONTAINER (for 2-3 cards): display "flex", flexDirection "row", flexWrap "wrap", justifyContent "center", gap "24", width "100%", maxWidth "1200px"
      - Each testimonial card: flexBasis "calc(33.333% - 16px)", minWidth "280px", display "flex", flexDirection "column"
      - tabletStyles on container: { flexWrap: "wrap" }; on cards: { flexBasis: "calc(50% - 12px)" }
      - mobileStyles on container: { flexDirection: "column" }; on cards: { flexBasis: "100%", minWidth: "100%" }
      
      CONTENT REQUIREMENTS (CRITICAL - NO PLACEHOLDER TEXT):
      - Consider GLASS CARDS pattern: cards with semi-transparent white bg, backdropFilter blur, subtle borders
      - 1-4 testimonial items (vary the count for visual interest), each with:
        - Real-sounding full name: "Jennifer Martinez", "David Thompson", "Aisha Patel"
        - Job title AND company: "CEO at TechVentures Inc.", "Design Lead at Bloom Studio"
        - Specific, believable quote (25-40 words) about RESULTS or EXPERIENCE
        - Optional: star rating or STATUS INDICATOR showing verification
      - For 4+ items, use carousel layout with PROPER slide structure:
        - Each carousel-slide MUST contain a carousel-slide-content with CHILD COMPONENTS (not just a content string):
          - Avatar: image component with imagePrompt "Professional headshot portrait", width "48", height "48", borderRadius "999"
          - Quote: text component with the testimonial quote (25-40 words), fontSize "16", fontStyle "italic"
          - Name: heading tag h4 with reviewer name, fontWeight "600"
          - Role: text with job title + company, fontSize "14", muted color
        - NEVER set only a "content" string prop on carousel-slide-content -- always use child components
      
      NEVER use "Client Name", "Sample testimonial", or any placeholder.`,
      timeoutMs: 18000,
      required: false
    },
    {
      name: 'projects',
      sections: ['projects-section'],
      instructions: `Generate ONLY: Projects/Portfolio section.
      
      MANDATORY LAYOUT (CRITICAL -- project cards MUST be in a horizontal row, NEVER stacked vertically):
      - Section wrapper: display "flex", flexDirection "column", alignItems "center", width "100%"
      - Cards CONTAINER: display "flex", flexDirection "row", flexWrap "wrap", justifyContent "center", gap "24", width "100%", maxWidth "1200px"
      - Each project card: flexBasis "calc(33.333% - 16px)", minWidth "280px", display "flex", flexDirection "column"
      - tabletStyles on container: { flexWrap: "wrap" }; on cards: { flexBasis: "calc(50% - 12px)" }
      - mobileStyles on container: { flexDirection: "column" }; on cards: { flexBasis: "100%", minWidth: "100%" }
      
      CONTENT REQUIREMENTS (CRITICAL - NO PLACEHOLDER TEXT):
      - 3-4 project cards, each with:
        - Creative project name: "Urban Oasis E-Commerce", "FinFlow Dashboard"
        - Description (15-25 words) explaining what it does
        - Technology badges if relevant
        - Use imagePrompt for project thumbnails
      
      NEVER use "Project Title" or placeholder text.`,
      timeoutMs: 15000,
      required: false
    },
    {
      name: 'pricing',
      sections: ['pricing-section'],
      instructions: `Generate ONLY: Pricing section.
      
      MANDATORY LAYOUT (CRITICAL -- pricing cards MUST be side-by-side, NEVER stacked vertically):
      - Section wrapper: display "flex", flexDirection "column", alignItems "center", width "100%"
      - Cards CONTAINER: display "flex", flexDirection "row", flexWrap "wrap", justifyContent "center", gap "24", width "100%", maxWidth "1200px"
      - Each pricing card: flexBasis "calc(33.333% - 16px)", minWidth "280px", maxWidth "400px", display "flex", flexDirection "column"
      - tabletStyles on container: { flexWrap: "wrap" }; on cards: { flexBasis: "calc(50% - 12px)" }
      - mobileStyles on container: { flexDirection: "column" }; on cards: { flexBasis: "100%", minWidth: "100%" }
      
      CONTENT REQUIREMENTS:
      - Section heading + optional subtitle
      - 2-3 pricing tier CARDS in the flex row container, each card containing:
        - Optional badge for the recommended tier (e.g., "Most Popular")
        - Tier name heading (e.g., "Starter", "Professional", "Enterprise")
        - Price heading with large font: "$19/month", "$49/month", "Custom"
        - Description text (15-25 words)
        - 4-6 feature items, each as a div with: icon (Check) + text describing the feature
        - CTA button at the bottom: "Get Started", "Choose Plan", "Contact Sales"
      - Highlight one tier with accent background or border
      - Use industry-appropriate pricing (SaaS: $19/$49/$99, Agency: custom)
      - NEVER generate empty cards with only a name and price`,
      timeoutMs: 15000,
      required: false
    },
    {
      name: 'stats',
      sections: ['stats-section'],
      instructions: `Generate ONLY: Statistics/metrics section.
      
      MANDATORY LAYOUT (CRITICAL -- stats MUST be in a HORIZONTAL row, NEVER stacked vertically):
      - Section wrapper: display "flex", flexDirection "column", alignItems "center", width "100%"
      - Stats CONTAINER (the div holding all stat items): display "flex", flexDirection "row", flexWrap "wrap", justifyContent "center", gap "48", width "100%", maxWidth "1200px"
      - Each stat item: display "flex", flexDirection "column", alignItems "center", minWidth "160px", flexBasis "calc(25% - 36px)"
      - Stat number: fontSize "48"-"72", fontWeight "800", lineHeight "1.1"
      - Stat label: fontSize "14"-"16", muted color, marginTop "8"
      - tabletStyles on container: { gap: "32" }; on items: { flexBasis: "calc(50% - 16px)" }
      - mobileStyles on container: { gap: "24" }; on items: { flexBasis: "calc(50% - 12px)" }
      
      CONTENT REQUIREMENTS:
      - 3-5 impressive stat items with large numbers
      - Examples: "10K+ Customers", "99.9% Uptime", "150+ Countries"
      - Industry-appropriate metrics
      - Consider TRUST BAR pattern: horizontal strip with dot indicators + metric labels
      - Optional: subtle counter animation hint via opacity transitions`,
      timeoutMs: 15000,
      required: false
    },
    {
      name: 'faq',
      sections: ['faq-section'],
      instructions: `Generate ONLY: FAQ section.
      
      CONTENT REQUIREMENTS:
      - Section heading: "Frequently Asked Questions" or industry-specific variant
      - Use accordion component with type "single", collapsible true
      - Generate 4-6 accordion-item children, each with:
        - type "accordion-item" with props: { title: "The actual question text here?" }
        - Two children inside each item:
          1. type "accordion-header" with props: { content: "Same question text" }
          2. type "accordion-content" with props: { content: "Detailed answer text, 25-40 words" }
      - Questions must be REAL, industry-relevant questions users would ask
      - Answers must be helpful and specific, not generic
      - NEVER use "Section 1", "Section 2", or any placeholder titles`,
      timeoutMs: 15000,
      required: false
    },
    {
      name: 'team',
      sections: ['team-section'],
      instructions: `Generate ONLY: Team section.
      
      MANDATORY LAYOUT (CRITICAL -- team cards MUST be in a horizontal row, NEVER stacked vertically):
      - Section wrapper: display "flex", flexDirection "column", alignItems "center", width "100%"
      - Cards CONTAINER: display "flex", flexDirection "row", flexWrap "wrap", justifyContent "center", gap "24", width "100%", maxWidth "1200px"
      - Each team card: flexBasis "calc(25% - 18px)", minWidth "240px", display "flex", flexDirection "column", alignItems "center"
      - tabletStyles on container: { flexWrap: "wrap" }; on cards: { flexBasis: "calc(50% - 12px)" }
      - mobileStyles on container: { flexDirection: "column" }; on cards: { flexBasis: "100%" }
      
      CONTENT REQUIREMENTS:
      - 3-6 team member cards with avatars
      - Real-sounding names and job titles
      - Use imagePrompt for professional headshots
      - Brief bio or social links per member`,
      timeoutMs: 15000,
      required: false
    },
    {
      name: 'trust-bar',
      sections: ['trust-bar-section'],
      instructions: `Generate ONLY: Trust/Credential Bar section, a slim horizontal accent strip.
      
      MANDATORY LAYOUT (CRITICAL -- items MUST be in a horizontal row, NEVER stacked):
      - Section wrapper: display "flex", justifyContent "center", width "100%", padding "20px 32px"
      - Items CONTAINER: display "flex", flexDirection "row", flexWrap "wrap", justifyContent "center", gap "32", alignItems "center"
      - Each item: display "flex", flexDirection "row", alignItems "center", gap "8"
      - mobileStyles on container: { gap: "16" }
      
      CONTENT REQUIREMENTS:
      - 3-5 credential items in the horizontal container above
      - Each item is a small dot icon (8x8, borderRadius "999") next to uppercase label text
      - Use letter spacing "0.08em" and small font size "12"-"13" for the labels
      - Example labels: DATA-BACKED INSIGHTS, ENTERPRISE READY, SOC2 CERTIFIED, 99.9% UPTIME
      - Subtle contrasting background, compact vertical padding
      - This is NOT a full section, keep it slim and accent-like`,
      timeoutMs: 15000,
      required: false
    },
    {
      name: 'how-it-works',
      sections: ['how-it-works-section'],
      instructions: `Generate ONLY: How It Works / Workflow section.
      
      MANDATORY LAYOUT (CRITICAL -- step cards MUST be in a horizontal row, NEVER stacked vertically):
      - Section wrapper: display "flex", flexDirection "column", alignItems "center", width "100%"
      - Steps CONTAINER: display "flex", flexDirection "row", flexWrap "wrap", justifyContent "center", gap "24", width "100%", maxWidth "1200px"
      - Each step card: flexBasis "calc(33.333% - 16px)", minWidth "280px", display "flex", flexDirection "column"
      - tabletStyles on container: { flexWrap: "wrap" }; on cards: { flexBasis: "calc(50% - 12px)" }
      - mobileStyles on container: { flexDirection: "column" }; on cards: { flexBasis: "100%", minWidth: "100%" }
      - Progress bars inside cards: width "100%" (NOT full section width), contained within the card
      
      CONTENT REQUIREMENTS:
      - Section label badge above the heading with thin border and uppercase text
      - Section heading like How It Works or industry-specific equivalent
      - 3 step cards in the flex row container above, each containing:
        - Card header row: div with display "flex", justifyContent "space-between", alignItems "center"
          containing step title left-aligned (bold fontWeight "600") + step number right-aligned 
          ("01", "02", "03") as small muted text (fontSize "14", color rgba(255,255,255,0.3))
        - Description of 15-25 words explaining the step
        - Status element at bottom (VARY across cards for visual richness):
          Card 1: colored uppercase badge text (e.g. "DRAFTING" in accent color, fontSize "11", letterSpacing "0.08em")
          Card 2: progress bar component (type "progress") at 60-80% fill, width "100%"
          Card 3: small colored dot (8x8, borderRadius "999", green bg) + status text (e.g. "Verified")
        - On dark themes: cards MUST have border "1px solid rgba(255,255,255,0.08)"
      - Industry-specific workflow steps, NOT generic`,
      timeoutMs: 15000,
      required: false
    },
    {
      name: 'partners',
      sections: ['partners-section'],
      instructions: `Generate ONLY: Partners/Logos/Trusted By section.
      
      MANDATORY LAYOUT (CRITICAL -- partner items MUST be in a horizontal row):
      - Section wrapper: display "flex", flexDirection "column", alignItems "center", width "100%"
      - Partners CONTAINER: display "flex", flexDirection "row", flexWrap "wrap", justifyContent "center", gap "48", alignItems "center", width "100%", maxWidth "1000px"
      - Each partner logo: type "image", height "32", objectFit "contain", opacity "0.6"
      - mobileStyles on container: { gap: "24" }
      
      BRAND LOGO CATALOG -- use these REAL logo URLs as image src:
      Figma: https://cdn.simpleicons.org/figma
      Slack: https://cdn.simpleicons.org/slack
      Notion: https://cdn.simpleicons.org/notion
      Stripe: https://cdn.simpleicons.org/stripe
      Shopify: https://cdn.simpleicons.org/shopify
      GitHub: https://cdn.simpleicons.org/github
      Google: https://cdn.simpleicons.org/google
      Microsoft: https://cdn.simpleicons.org/microsoft
      Apple: https://cdn.simpleicons.org/apple
      Amazon: https://cdn.simpleicons.org/amazon
      Netflix: https://cdn.simpleicons.org/netflix
      Spotify: https://cdn.simpleicons.org/spotify
      Airbnb: https://cdn.simpleicons.org/airbnb
      Uber: https://cdn.simpleicons.org/uber
      Dropbox: https://cdn.simpleicons.org/dropbox
      Zoom: https://cdn.simpleicons.org/zoom
      Salesforce: https://cdn.simpleicons.org/salesforce
      Adobe: https://cdn.simpleicons.org/adobe
      HubSpot: https://cdn.simpleicons.org/hubspot
      Twilio: https://cdn.simpleicons.org/twilio
      Vercel: https://cdn.simpleicons.org/vercel
      Linear: https://cdn.simpleicons.org/linear
      Framer: https://cdn.simpleicons.org/framer
      Intercom: https://cdn.simpleicons.org/intercom
      Loom: https://cdn.simpleicons.org/loom
      
      CONTENT REQUIREMENTS:
      - Section heading like "Trusted By Industry Leaders"
      - 4-6 partner logos in the horizontal container above
      - Each partner: an IMAGE component with src from the catalog above, height "32"-"40", objectFit "contain"
      - Add brand name text below each logo image (fontSize "12", muted color)
      - NEVER use letter badges or circles with initials -- always use real logo images from the catalog
      - Muted styling with lower opacity (0.6) to keep focus on other sections
      - Keep compact, single row, minimal vertical padding`,
      timeoutMs: 15000,
      required: false
    },
    {
      name: 'newsletter',
      sections: ['newsletter-section'],
      instructions: `Generate ONLY: Newsletter/Contact capture section.
      
      CONTENT REQUIREMENTS:
      - Compelling heading: "Stay Ahead of the Curve", "Get Weekly Insights", etc.
      - Supporting text (15-25 words) explaining what subscribers receive
      - Input + button row: email input with contextual placeholder + action button
      - Optional: "Join 5,000+ subscribers" or similar social proof text
      - Can use a contrasting solid background color to stand out. NO gradients.`,
      timeoutMs: 15000,
      required: false
    },
  ];

  // Context-aware filtering: boost relevance based on prompt keywords
  const relevanceBoosts: Record<string, string[]> = {
    'features': ['features', 'benefits', 'capabilities', 'what we offer', 'services', 'telecom', 'telecommunication', 'app'],
    'about': ['about', 'story', 'mission', 'who we are', 'team'],
    'testimonials': ['testimonials', 'reviews', 'customers', 'clients', 'social proof'],
    'projects': ['portfolio', 'projects', 'work', 'showcase', 'case studies'],
    'pricing': ['pricing', 'plans', 'subscription', 'cost', 'packages', 'telecom', 'telecommunication'],
    'stats': ['statistics', 'numbers', 'metrics', 'achievements', 'results'],
    'faq': ['faq', 'questions', 'help', 'support', 'answers'],
    'team': ['team', 'people', 'staff', 'employees', 'leadership'],
    'trust-bar': ['trust', 'secure', 'enterprise', 'compliance', 'certified'],
    'how-it-works': ['how', 'process', 'steps', 'workflow', 'getting started'],
    'partners': ['partners', 'clients', 'brands', 'trusted', 'logos'],
    'newsletter': ['newsletter', 'subscribe', 'updates', 'contact', 'email'],
  };

  // ═══ WEBSITE BLUEPRINT INTEGRATION ═══
  // If we have a blueprint, inject its required/optional sections and exclude irrelevant ones
  if (websiteBlueprint) {
    const excluded = new Set(websiteBlueprint.excludedSections || []);
    
    // Add extra section definitions from blueprints that aren't in the default pool
    for (const sectionName of [...(websiteBlueprint.requiredSections || []), ...(websiteBlueprint.optionalSections || [])]) {
      const extraDef = EXTRA_SECTION_DEFINITIONS[sectionName];
      if (extraDef && !middleSectionPool.some(p => p.name === sectionName)) {
        middleSectionPool.push({
          name: sectionName,
          sections: extraDef.sections,
          instructions: extraDef.instructions,
          timeoutMs: extraDef.timeoutMs,
          required: false,
        });
      }
    }
    
    // Remove excluded sections
    const filteredPool = middleSectionPool.filter(p => !excluded.has(p.name));
    middleSectionPool.length = 0;
    middleSectionPool.push(...filteredPool);
  }

  // Score each section by relevance
  const requiredSet = new Set(websiteBlueprint?.requiredSections || []);
  const scored = middleSectionPool.map(phase => {
    // Blueprint-required sections always come first
    if (requiredSet.has(phase.name)) return { phase, score: 100 };
    const boostKeywords = relevanceBoosts[phase.name] || [];
    const score = boostKeywords.some(kw => lowerPrompt.includes(kw)) ? 10 : Math.random();
    return { phase, score };
  });

  // Sort by score descending, then take 4-6 sections
  scored.sort((a, b) => b.score - a.score);
  const sectionCount = 5 + Math.floor(Math.random() * 4); // 5-8 sections for fuller pages
  const selectedMiddle = scored.slice(0, sectionCount).map(s => s.phase);
  
  // Shuffle the selected middle sections for order variety (but keep required ones near top)
  for (let i = selectedMiddle.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selectedMiddle[i], selectedMiddle[j]] = [selectedMiddle[j], selectedMiddle[i]];
  }

  const cta: GenerationPhase = {
    name: 'cta',
    sections: ['cta-section'],
    instructions: `Generate ONLY: Call-to-action section.
    
    This is the CLOSING ARGUMENT — the last chance to convert a visitor.
    
    DESIGN PATTERNS (choose one):
    
    A) BOLD SOLID BANNER: Full-width section with a bold SOLID accent background color.
       White text, centered. Large headline (fontSize 40-48), supporting text, prominent CTA button.
       Button: filled white with dark text, large padding, strong borderRadius.
       🚫 NO gradients — use a single solid accent color.
    
    B) SPLIT WITH VISUAL: 60/40 split. Left side: compelling headline + CTA.
       Right side: abstract pattern, product mockup, or decorative element.
    
    C) CARD-STYLE: A centered card with generous padding (48-64px), subtle shadow or glass effect,
       floating on a contrasting section background. Creates a contained, premium feel.
    
    CONTENT:
    - Headline: Create desire + urgency (5-8 words):
      "Ready to Build Something Extraordinary?", "Your Next Chapter Starts Here",
      "Join 10,000+ Teams Already Shipping Faster"
    - Subtext: 15-20 words, outcome-focused
    - Primary CTA: specific action with value ("Start Building Free", "Book Your Strategy Call", "Get Early Access")
    - Optional secondary CTA: lower commitment ("See Pricing", "Read Case Studies")
    - BANNED: "Let's Work Together", "Contact Us", "Get Started", "Submit", "Click Here"
    - NO GRADIENTS on any background or button`,
    timeoutMs: 25000,
    required: true
  };

  console.log(`[AI Build] Dynamic phases: foundation → ${selectedMiddle.map(p => p.name).join(' → ')} → cta`);
  
  return [foundation, ...selectedMiddle, cta];
}

// Model-specific timeout multipliers — flattened to 1.0 to prevent compounding with higher base timeouts
const MODEL_PHASE_TIMEOUTS: Record<string, number> = {
  'gemini-3-pro': 1.0,
  'gemini-3-flash': 1.0,
  'gemini-2.5-flash': 1.0,
  'gemini-2.5-pro': 1.0,
  'gemini-deep-research': 1.0,
  'claude-sonnet-4': 1.0,
  'gpt-5': 1.0,
  'gpt-5-mini': 1.0,
  'openai-deep-research': 1.0,
  'default': 1.0
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT SANITIZER — Strip Unicode from prompt strings before sending to AI
// ═══════════════════════════════════════════════════════════════════════════════

function sanitizePromptString(str: string): string {
  return str
    .replace(/[\u2500-\u257F\u2550]/g, '-')  // box drawing chars
    .replace(/\u2192/g, '->').replace(/\u2190/g, '<-')  // arrows
    .replace(/\u2014/g, '--').replace(/\u2013/g, '-')  // dashes
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')  // quotes
    .replace(/\u2026/g, '...')  // ellipsis
    .replace(/[\u2714\u2713]/g, '[YES]').replace(/[\u2716\u2717\u2718]/g, '[NO]')  // checks/crosses
    .replace(/[\u25A0-\u25FF]/g, '-')  // geometric shapes (□ etc.)
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')  // all emoji
    .replace(/[\u{2600}-\u{27BF}]/gu, '')  // misc symbols
    .replace(/[\u{FE00}-\u{FE0F}\u{200D}]/gu, '');  // variation selectors, ZWJ
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLAT-PROP NORMALIZATION -- Converts AI Wall-style flat props to builder schema
// ═══════════════════════════════════════════════════════════════════════════════

function normalizeAIWallStyleProps(comp: any): any {
  if (!comp || typeof comp !== 'object') return comp;
  comp.props = comp.props || {};

  // String backgroundColor -> structured object
  if (typeof comp.props.backgroundColor === 'string' && 
      !comp.props.backgroundColor.includes('var(') &&
      !comp.props.backgroundColor.includes('gradient')) {
    comp.props.backgroundColor = { 
      type: 'solid', 
      value: comp.props.backgroundColor, 
      opacity: 100 
    };
  }

  // Flat color/fontSize/fontWeight on text components -> typography
  const isTextType = ['text', 'heading', 'link', 'label', 'blockquote'].includes(comp.type);
  if (isTextType) {
    comp.props.typography = comp.props.typography || {};
    if (comp.props.color && !comp.props.typography.color) {
      comp.props.typography.color = comp.props.color;
      delete comp.props.color;
    }
    if (comp.props.fontSize && !comp.props.typography.fontSize) {
      comp.props.typography.fontSize = String(comp.props.fontSize).replace('px', '');
      delete comp.props.fontSize;
    }
    if (comp.props.fontWeight && !comp.props.typography.fontWeight) {
      comp.props.typography.fontWeight = String(comp.props.fontWeight);
      delete comp.props.fontWeight;
    }
    if (comp.props.fontFamily && !comp.props.typography.fontFamily) {
      comp.props.typography.fontFamily = comp.props.fontFamily;
      delete comp.props.fontFamily;
    }
    if (comp.props.lineHeight && !comp.props.typography.lineHeight) {
      comp.props.typography.lineHeight = String(comp.props.lineHeight);
      delete comp.props.lineHeight;
    }
    if (comp.props.textAlign && !comp.props.typography.textAlign) {
      comp.props.typography.textAlign = comp.props.textAlign;
      delete comp.props.textAlign;
    }
    if (comp.props.letterSpacing && !comp.props.typography.letterSpacing) {
      comp.props.typography.letterSpacing = String(comp.props.letterSpacing);
      delete comp.props.letterSpacing;
    }
  }

  // String padding -> spacingControl
  if (typeof comp.props.padding === 'string' && !comp.props.spacingControl) {
    const parts = comp.props.padding.replace(/px/g, '').trim().split(/\s+/);
    comp.props.spacingControl = { 
      padding: { 
        top: parts[0], right: parts[1] || parts[0], 
        bottom: parts[2] || parts[0], left: parts[3] || parts[1] || parts[0], 
        unit: 'px' 
      } 
    };
    delete comp.props.padding;
  }

  // String margin -> spacingControl
  if (typeof comp.props.margin === 'string' && (!comp.props.spacingControl || !comp.props.spacingControl.margin)) {
    const parts = comp.props.margin.replace(/px/g, '').trim().split(/\s+/);
    comp.props.spacingControl = comp.props.spacingControl || {};
    comp.props.spacingControl.margin = { 
      top: parts[0], right: parts[1] || parts[0], 
      bottom: parts[2] || parts[0], left: parts[3] || parts[1] || parts[0], 
      unit: 'px' 
    };
    delete comp.props.margin;
  }

  // String borderRadius -> structured object
  if (typeof comp.props.borderRadius === 'string') {
    const r = comp.props.borderRadius.replace('px', '');
    comp.props.borderRadius = { topLeft: r, topRight: r, bottomRight: r, bottomLeft: r, unit: 'px' };
  } else if (typeof comp.props.borderRadius === 'number') {
    const r = String(comp.props.borderRadius);
    comp.props.borderRadius = { topLeft: r, topRight: r, bottomRight: r, bottomLeft: r, unit: 'px' };
  }

  // Recurse children
  if (Array.isArray(comp.children)) {
    comp.children = comp.children.map(normalizeAIWallStyleProps);
  }
  return comp;
}

// ═══════════════════════════════════════════════════════════════
// INTENT EXTRACTION — Ported from AI Wall's Phase 1
// ═══════════════════════════════════════════════════════════════

interface AppBuilderIntent {
  industry: string;
  brandMood: string;
  componentTypes: string[];
  keywords: string[];
  imageCategories: string[];
}

const APP_BUILDER_INTENT_PROMPT = `You are a product strategist. Extract structured intent from the user's design prompt.

Return a JSON object with these fields:
- industry: string (e.g. "FinTech", "HealthTech", "SaaS", "E-commerce", "AI/ML", "Education", "NGO", "Creative Agency", "Real Estate")
- brandMood: string (e.g. "Futuristic", "Minimal", "Corporate", "Playful", "Luxurious", "Brutalist", "Editorial", "Organic", "Bold", "Elegant")
- componentTypes: string[] (relevant section types like "hero", "features", "pricing", "stats", "cta", "testimonials", "faq", "team", "footer", "cards", "gallery")
- keywords: string[] (3-5 key terms extracted from the prompt)
- imageCategories: string[] (matching categories from: business, tech, nature, people, architecture, abstract, product)

Return ONLY valid JSON. No markdown, no explanation.`;

async function extractAppBuilderIntent(
  userPrompt: string,
  modelKey: string
): Promise<AppBuilderIntent | null> {
  try {
    console.log('[AI Build] Intent extraction: analyzing prompt...');
    const response = await callAIModelWithTimeout(
      modelKey,
      APP_BUILDER_INTENT_PROMPT,
      `Extract structured intent from this design prompt: "${userPrompt}"`,
      2000,
      0.3,
      10000
    );
    const parsed = resilientJsonParse(response);
    if (parsed?.industry && parsed?.brandMood) {
      console.log(`[AI Build] Intent ✓ Industry: ${parsed.industry}, Mood: ${parsed.brandMood}`);
      return parsed as AppBuilderIntent;
    }
    console.warn('[AI Build] Intent extraction returned invalid schema');
    return null;
  } catch (err: any) {
    console.warn('[AI Build] Intent extraction failed, continuing without:', err.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// DESIGN TOKEN GENERATION — Ported from AI Wall's Phase 2
// ═══════════════════════════════════════════════════════════════

interface AppBuilderTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    muted: string;
    contrast: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    headingWeight: string;
    headingSize: string;
    bodySize: string;
    letterSpacing: string;
  };
  spacing: {
    sectionPadding: string;
    elementGap: string;
    cardPadding: string;
  };
  borderRadius: { small: string; medium: string; large: string };
  shadows: { subtle: string; medium: string; dramatic: string };
  gradients: string[];
}

const APP_BUILDER_TOKEN_PROMPT = `You are a senior design system architect. Given a project's industry and brand mood, generate a cohesive Design Token System.

Return a JSON object with:
- colors: { primary (hex), secondary (hex), accent (hex), background (hex), surface (hex), text (hex), muted (hex), contrast (hex) }
- typography: { headingFont (web-safe font name), bodyFont (web-safe font name), headingWeight (CSS weight), headingSize (px string), bodySize (px string), letterSpacing (em string) }
- spacing: { sectionPadding (CSS value), elementGap (CSS value), cardPadding (CSS value) }
- borderRadius: { small (px string), medium (px string), large (px string) }
- shadows: { subtle (CSS box-shadow), medium (CSS box-shadow), dramatic (CSS box-shadow) }
- gradients: string[] (2-3 CSS linear-gradient values using the color palette)

Design for premium, high-end aesthetics. Colors must have strong contrast for accessibility.
Return ONLY valid JSON. No markdown, no explanation.`;

async function generateAppBuilderTokens(
  intent: AppBuilderIntent,
  modelKey: string
): Promise<AppBuilderTokens | null> {
  try {
    console.log('[AI Build] Token generation: creating design system...');
    const response = await callAIModelWithTimeout(
      modelKey,
      APP_BUILDER_TOKEN_PROMPT,
      `Generate a design token system for:\nIndustry: ${intent.industry}\nBrand Mood: ${intent.brandMood}\nKeywords: ${intent.keywords.join(', ')}\nTarget components: ${intent.componentTypes.join(', ')}`,
      3000,
      0.5,
      12000
    );
    const parsed = resilientJsonParse(response);
    if (parsed?.colors && parsed?.typography) {
      console.log('[AI Build] Tokens ✓ Design system generated');
      return parsed as AppBuilderTokens;
    }
    console.warn('[AI Build] Token generation returned invalid schema');
    return null;
  } catch (err: any) {
    console.warn('[AI Build] Token generation failed, falling back to seed:', err.message);
    return null;
  }
}

function formatTokensForPrompt(tokens: AppBuilderTokens): string {
  return `
**AI-GENERATED DESIGN SYSTEM (USE THESE EXACT VALUES):**
Colors: bg=${tokens.colors.background}, surface=${tokens.colors.surface}, text=${tokens.colors.text}, primary=${tokens.colors.primary}, secondary=${tokens.colors.secondary}, accent=${tokens.colors.accent}, muted=${tokens.colors.muted}, contrast=${tokens.colors.contrast}
Typography: heading="${tokens.typography.headingFont}" w${tokens.typography.headingWeight} ${tokens.typography.headingSize}, body="${tokens.typography.bodyFont}" ${tokens.typography.bodySize}, ls=${tokens.typography.letterSpacing}
Spacing: section=${tokens.spacing.sectionPadding}, gap=${tokens.spacing.elementGap}, card=${tokens.spacing.cardPadding}
Radius: sm=${tokens.borderRadius.small}, md=${tokens.borderRadius.medium}, lg=${tokens.borderRadius.large}
Shadows: subtle="${tokens.shadows.subtle}", medium="${tokens.shadows.medium}", dramatic="${tokens.shadows.dramatic}"
Gradients: ${tokens.gradients.join(' | ')}
`;
}

// Premium system prompt — condensed constraints-not-recipes format (ported from AI Wall's compact architecture)
const STATIC_SYSTEM_PROMPT = `You are a Premium UI/UX Architect. Generate sections as JSON component trees. Philosophy: simplicity as architecture, intentional whitespace, 2-second focal point hierarchy.
Return ONLY valid JSON.

CREATIVE MANDATE: You are a CREATIVE DIRECTOR who invents unique visual identities. Every design must feel crafted by a professional agency.
Push beyond the obvious: rich gradient backgrounds, glassmorphism cards, bold typographic statements, layered depth, dramatic whitespace, color contrast that stops scrolling.

COMPONENT TYPES (type: key props):
section(backgroundColor,padding,display,flexDirection,alignItems,justifyContent,gap,minHeight) | div(display,flexDirection,alignItems,justifyContent,gap,padding,backgroundColor,borderRadius,maxWidth,width,boxShadow,flexWrap,gridTemplateColumns,flex,minWidth) | heading(content,tag,fontSize,fontWeight,color,textAlign,letterSpacing,lineHeight) | text(content,fontSize,fontWeight,color,textAlign,lineHeight,opacity) | button(text,backgroundColor,color,padding,borderRadius,fontSize,fontWeight,border,minWidth,hoverTransform,variant) | image(src,alt,width,height,objectFit,borderRadius) | icon(iconName,size,color) | link(content,href,color,fontSize) | badge(text,variant) | avatar(src,fallback,size) | nav-horizontal(backgroundColor,padding) | accordion>accordion-item(value)>accordion-header(content)+accordion-content | tabs(defaultValue)>div[tab-triggers]+tab-content(value) | carousel(autoplay,interval,showDots,showArrows)>carousel-slide | form-wrapper(submitButtonText)>input+textarea+select+checkbox | blockquote(content) | alert(title,description,variant) | progress(value) | switch(label) | separator | spacer(height) | container(maxWidth,padding)

Valid iconName: Star,Check,ArrowRight,Mail,Phone,MapPin,Shield,Zap,Heart,Users,Globe,Clock,Award,Target,Layers,Code,Briefcase,TrendingUp,BarChart,MessageCircle,ChevronRight,Play,Download,ExternalLink,Sparkles,Rocket,Lightbulb,Activity,Cpu,Eye,Lock,Compass

RESPONSE: { "success": true, "steps": [{ "type": "component", "data": { "id": "section-id", "type": "section", "props": {...}, "children": [...] } }] }

PROPERTY FORMAT:
- backgroundColor: { "type": "solid", "value": "#hex", "opacity": 100 }
- backgroundGradient: { "type": "linear", "angle": 135, "stops": [{"color":"#hex","position":0},{"color":"#hex","position":100}] }
- typography: { "fontSize": "48", "fontWeight": "700", "color": "#hex", "textAlign": "center", "fontFamily": "Inter", "lineHeight": "1.2" }
- spacingControl: { "padding": { "top": "80", "right": "48", "bottom": "80", "left": "48", "unit": "px" } }
- borderRadius: { "topLeft": "12", "topRight": "12", "bottomRight": "12", "bottomLeft": "12", "unit": "px" }
- Layout FLAT on props: display, flexDirection, justifyContent, alignItems, gap, flexWrap, flexBasis, gridTemplateColumns
- Sizing FLAT: width, height, minWidth, maxWidth, minHeight, maxHeight

RULES:
1. Buttons: "text" prop (NOT "content"), variant ("default","outline","ghost")
2. Headings/text: "content" prop, heading "tag" h1/h2/h3
3. fontSize: STRING without "px" (e.g. "48" not "48px")
4. No "style":{} wrapper. No flat backgroundColor string. No flat fontSize on text.
5. BANNED: "Lorem ipsum", "Feature 1", "BrandName", "Get Started", "Click Here", "Submit", "Link text", "Link 1", "Button", "Company Name", "Sample Heading", "Sample text", "Description here"
6. Sections full-width, maxWidth "1200px" centered. Card grids: flex row wrap, 3 cards=flexBasis "calc(33.333% - 16px)", minWidth "280px"
7. Every heading needs mobileStyles + tabletStyles for responsive typography
8. appliedClasses on every component (section-hero, heading-xl, heading-lg, body-base, btn-primary, card, flex-row, flex-col, img, icon, link, label)
9. Glass effect: backdropFilter "blur(16px)", backgroundColor rgba surfaces
10. Nav: nav-horizontal, sticky top 0 zIndex 50. Footer: flexDirection "row", brand+link columns+copyright
11. Invent DISTINCTIVE brand names — NOT "BrandName"/"MyCompany". Every link/button needs REAL text.
12. Creative patterns: glass cards, letter badges, bento asymmetry, gradient hero, dark/light alternation, oversized numbers, split layouts, trust bar
`;


// Multi-step generation function
async function generatePageInPhases(
  userPrompt: string,
  selectedModel: string
): Promise<{ success: boolean; steps: any[]; warning?: string; summary?: string }> {
  const allSteps: any[] = [];
  const failedPhases: string[] = [];
  const modelMultiplier = MODEL_PHASE_TIMEOUTS[selectedModel] || MODEL_PHASE_TIMEOUTS.default;
  
  // ── Phase 0a: AI-driven intent extraction (like AI Wall Phase 1) ──
  let aiIntent: AppBuilderIntent | null = null;
  let aiTokens: AppBuilderTokens | null = null;
  let aiTokenDirective = '';
  
  try {
    aiIntent = await extractAppBuilderIntent(userPrompt, selectedModel);
    if (aiIntent) {
      // ── Phase 0b: AI-driven design token generation (like AI Wall Phase 2) ──
      aiTokens = await generateAppBuilderTokens(aiIntent, selectedModel);
      if (aiTokens) {
        aiTokenDirective = formatTokensForPrompt(aiTokens);
        console.log(`[AI Build] AI tokens generated: ${aiTokens.colors.primary}, font: ${aiTokens.typography.headingFont}`);
      }
    }
  } catch (err: any) {
    console.warn('[AI Build] Intent/token pre-phases failed, using seed fallback:', err.message);
  }
  
  // Generate a procedural design seed for this entire build (fallback if AI tokens fail)
  const designSeed = generatePageDesignSeed();
  const designDirective = formatDesignSeedForPrompt(designSeed);
  console.log(`[AI Build] Design seed: ${designSeed.colorMood.mood}, ${designSeed.layout.split(':')[0]}, ${designSeed.typography.label}, ${designSeed.cardStyle.split(':')[0]}, patterns: ${designSeed.creativePatterns.join(', ')}`);
  
  // Build the design context — prefer AI-generated tokens, fall back to procedural seed
  const designContext = aiTokenDirective || designDirective;
  const intentContext = aiIntent 
    ? `\nINDUSTRY: ${aiIntent.industry} | Mood: ${aiIntent.brandMood} | Themes: ${aiIntent.keywords.join(', ')}` 
    : '';
  
  // ── Anti-repetition memory: track layouts used across phases ──
  const completedLayouts: string[] = [];
  
  // Reset image tracker for fresh Unsplash selections
  resetImageTracker();
  
  // Cache image catalog ONCE before the phase loop
  console.log('[AI Build] Pre-fetching Unsplash image catalog...');
  const cachedImageCatalog = await buildImageCatalogForPrompt();
  console.log('[AI Build] Image catalog cached');
  
  // Build dynamic phases based on user prompt
  const dynamicPhases = buildDynamicPhases(userPrompt);
  
  console.log(`[AI Build] Starting multi-step generation with model: ${selectedModel} (multiplier: ${modelMultiplier})`);
  
  // Separate foundation (required, runs first) from other phases
  const foundationPhase = dynamicPhases.find(p => p.name === 'foundation');
  const otherPhases = dynamicPhases.filter(p => p.name !== 'foundation');
  
  // Helper to execute a single phase
  const executePhase = async (phase: GenerationPhase, modelOverride?: string): Promise<{ steps: any[]; failed: boolean; name: string }> => {
    const phaseModel = modelOverride || selectedModel;
    const maxTimeout = phase.name === 'foundation' ? 55000 : 35000;
    const adjustedTimeout = Math.min(Math.round(phase.timeoutMs * modelMultiplier), maxTimeout);
    console.log(`[AI Build] Phase ${phase.name}: timeout ${adjustedTimeout}ms`);
    
    // Generate per-phase entropy seed for non-predictive output
    const phaseEntropySeed = Math.floor(1000 + Math.random() * 9000);
    const layoutVariants = ['A', 'B', 'C', 'D', 'E'];
    const phaseLayoutVariant = layoutVariants[Math.floor(Math.random() * layoutVariants.length)];
    
    // Anti-repetition directive from completed phases
    const antiRepetition = completedLayouts.length > 0
      ? `\nANTI-REPETITION: Previous sections used: ${completedLayouts.join(', ')}. Use a COMPLETELY different composition and layout structure.`
      : '';
    
    const phasePrompt = sanitizePromptString(`
${STATIC_SYSTEM_PROMPT}

${designContext}
${intentContext}

USER REQUEST: ${userPrompt}
Analyze: Industry, Purpose, Target audience, Brand personality. Use this context for industry-appropriate content.

IMAGE CATALOG -- Use ONLY these real Unsplash URLs for images (pick the most relevant category):
${cachedImageCatalog}

For image components, set "src" to one of these URLs directly. For avatars, use URLs from the "people" category.
You may also use "imagePrompt" as a fallback description -- the system will auto-replace it with a matching URL.

CREATIVITY ENTROPY SEED: ${phaseEntropySeed}
Use this seed to make unique creative choices — different seeds MUST produce different designs.
Vary layout proportions, content ordering, visual emphasis, and section structure based on this number.

LAYOUT VARIANT PREFERENCE: ${phaseLayoutVariant}
For hero sections use variant ${phaseLayoutVariant}. For features/about/pricing/testimonials, pick a DIFFERENT variant than your default.
Do NOT always use the same layout — variety is mandatory.
${antiRepetition}

PHASE: ${phase.name.toUpperCase()}
GENERATE ONLY: ${phase.sections.join(', ')}

${phase.instructions}

IMPORTANT:
- Generate ONLY the sections listed above
- Return valid JSON with "success": true and "steps" array
- Each step: { type: "component", data: { id, type, props, children } }
- NO placeholder text. ALL content must be specific and contextual.
- Every heading needs tabletStyles and mobileStyles for responsive typography.
`);

    try {
      // Dynamic token budget per phase complexity
      // Raised features/testimonials/pricing/team to 8k: complex sections with 4-6 cards
      // can hit 5-6k tokens in JSON output alone, causing truncation and parse failures
      const PHASE_TOKEN_BUDGETS: Record<string, number> = {
        'foundation': 12000, // Raised from 8000 — navbar+hero in one shot needs more room
        'hero': 8000,
        'features': 10000,  // Raised from 8000 — 6 feature cards + section header = ~5-6k tokens
        'pricing': 8000,    // Raised from 6000 — 3 pricing tiers with details = ~5k tokens
        'team': 8000,       // Raised from 6000 — team cards with bios = ~4-5k tokens
        'testimonials': 8000, // Raised from 6000 — testimonials with long quotes = ~4-5k tokens
        'stats': 4000,
        'trust-bar': 4000,
        'newsletter': 4000,
        'cta': 4000,
        'footer': 4000,
        'section-edit': 6000,
      };
      const phaseMaxTokens = PHASE_TOKEN_BUDGETS[phase.name] || 6000;
      // Use higher temperature for non-foundation phases to encourage creativity
      const phaseTemperature = phase.name === 'foundation' ? 0.85 : 0.95;
      const response = await callAIModelWithTimeout(
        phaseModel,
        phasePrompt,
        userPrompt,
        phaseMaxTokens,
        phaseTemperature,
        adjustedTimeout
      );
      
      // Parse response
      const parsed = resilientJsonParse(response);
      
      if (parsed.steps && Array.isArray(parsed.steps)) {
        const validSteps = parsed.steps.filter((step: any) => {
          if (step.type !== 'component') return true;
          if (!step.data || typeof step.data !== 'object' || !step.data.type) {
            console.warn(`[Phase ${phase.name}] Skipping invalid step:`, typeof step.data, step.data);
            return false;
          }
          return true;
        });
        
        // POST-GENERATION: Fix button content→text, normalize style props
        // NOTE: Full style→props conversion (fixComponentGlobal) runs in the final post-enrichment
        // pass. We only do essential early fixes here to avoid double-conversion conflicts.
        const enhancedSteps = validSteps.map((step: any) => {
          if (step.type !== 'component' || !step.data) return step;
          
          const fixButtonProps = (comp: any): any => {
            if (!comp || typeof comp !== 'object') return comp;
            comp.props = comp.props || {};
            // Fix button props: convert "content" to "text"
            if (comp.type === 'button' && comp.props?.content && !comp.props?.text) {
              comp.props.text = comp.props.content;
              delete comp.props.content;
            }
            if (Array.isArray(comp.children)) {
              comp.children = comp.children.map(fixButtonProps);
            }
            return comp;
          };
          
          // normalizeAIWallStyleProps handles style:{} → props conversion early
          // This is NOT duplicated by fixComponentGlobal (which is a superset but fine to run twice
          // for the style:{} wrapper pattern — normalizeAIWallStyleProps is lightweight)
          step.data = normalizeAIWallStyleProps(step.data);
          step.data = fixButtonProps(step.data);
          return step;
        });
        
        // Design seed enhancement + responsive safety net + card quality
        const finalSteps = enhancedSteps.map(step => {
          if (step.data) {
            step.data = enhanceWithDesignSeed(step.data, designSeed);
            step.data = injectResponsiveDefaults(step.data);
            step.data = enforceCardLayoutQuality(step.data);
            step.data = sanitizeFeatureCardIcons(step.data);
          }
          return step;
        });
        
        console.log(`[AI Build] Phase ${phase.name} completed: ${finalSteps.length} valid components`);
        return { steps: finalSteps, failed: false, name: phase.name };
      } else if (Array.isArray(parsed)) {
        const steps = parsed.map((item: any) => ({ type: 'component', data: item }));
        console.log(`[AI Build] Phase ${phase.name} completed (bare array): ${steps.length} components`);
        return { steps, failed: false, name: phase.name };
      }
      
      return { steps: [], failed: true, name: phase.name };
    } catch (error: any) {
      console.warn(`[AI Build] Phase ${phase.name} failed:`, error.message);
      if (phase.required) {
        throw new Error(`Required phase "${phase.name}" failed: ${error.message}`);
      }
      return { steps: [], failed: true, name: phase.name };
    }
  };
  
  // Move enhanceWithDesignSeed BEFORE executePhase calls (it's used inside)
  const GENERIC_BG_VALUES_PHASE = ['hsl(var(--card))', 'hsl(var(--background))', 'hsl(var(--muted))', 'hsl(var(--secondary))', '#fafafa', '#f8f9fa', '#f9fafb', '#ffffff', '#fff', 'transparent', 'rgba(255,255,255,1)', 'rgb(255,255,255)'];
  const GENERIC_ACCENT_VALUES_PHASE = ['#3b82f6', '#2563eb', '#6366f1', 'hsl(var(--primary))', 'hsl(var(--accent))'];
  
  const isGenericBgPhase = (val: string | undefined): boolean => {
    if (!val) return true;
    const v = String(val).toLowerCase().trim();
    if (v.startsWith('hsl(var(--')) return true;
    return GENERIC_BG_VALUES_PHASE.some(g => v === g.toLowerCase()) || v === '';
  };
  
  const isGenericAccentPhase = (val: string | undefined): boolean => {
    if (!val) return true;
    const v = String(val).toLowerCase().trim();
    if (v.startsWith('hsl(var(--')) return true;
    return GENERIC_ACCENT_VALUES_PHASE.some(g => v === g.toLowerCase());
  };
  
  const enhanceWithDesignSeed = (comp: any, seed: any, parentBg?: string): any => {
    if (!comp || typeof comp !== 'object') return comp;
    comp.props = comp.props || {};
    
    const id = (comp.id || '').toLowerCase();
    const isCard = comp.type === 'div' && (
      id.includes('card') || id.includes('feature') || id.includes('testimonial') ||
      id.includes('pricing') || id.includes('service') || id.includes('step') ||
      id.includes('project') || id.includes('team') || id.includes('product')
    );
    const isSection = comp.type === 'section';
    const isHeading = comp.type === 'heading';
    const isText = comp.type === 'text';
    const isButton = comp.type === 'button';
    
    // Inject section padding only if missing — DO NOT override AI-chosen backgrounds/colors
    if (isSection) {
      parentBg = comp.props.backgroundColor?.value || comp.props.backgroundGradient || seed.colorMood.hero;
      if (!comp.props.spacingControl?.padding) {
        const pad = seed.spacing?.sectionPad?.replace('px','') || '80';
        comp.props.spacingControl = comp.props.spacingControl || {};
        comp.props.spacingControl.padding = { top: pad, right: '24', bottom: pad, left: '24', unit: 'px' };
      }
    }
    
    // Inject font families ONLY if missing — never override AI-chosen fonts
    if (isHeading) {
      comp.props.typography = comp.props.typography || {};
      if (!comp.props.typography.fontFamily) comp.props.typography.fontFamily = seed.fonts?.heading;
    }
    if (isText) {
      comp.props.typography = comp.props.typography || {};
      if (!comp.props.typography.fontFamily) comp.props.typography.fontFamily = seed.fonts?.body;
    }
    
    // Add button transition ONLY if missing
    if (isButton && !comp.props.transition) {
      comp.props.transition = 'all 0.2s ease';
    }
    
    // Add card hover effect ONLY if missing
    if (isCard && !comp.props.stateStyles?.hover) {
      comp.props.transition = comp.props.transition || 'all 0.3s ease';
      comp.props.stateStyles = comp.props.stateStyles || {};
      comp.props.stateStyles.hover = { transform: 'translateY(-4px)', boxShadow: '0 12px 40px rgba(0,0,0,0.15)' };
    }
    
    // Footer: ensure it has a dark background if the AI left it light/empty
    const isFooter = id.includes('footer');
    if (isFooter && isSection) {
      const footerBg = comp.props.backgroundColor?.value || comp.props.backgroundColor;
      const footerBgStr = typeof footerBg === 'string' ? footerBg : '';
      const isLightOrMissing = !footerBgStr || footerBgStr === '#ffffff' || footerBgStr === '#fff' || 
        footerBgStr === '#f9fafb' || footerBgStr === '#f3f4f6' || footerBgStr === '#fafafa' ||
        footerBgStr.startsWith('#f') || footerBgStr.startsWith('#e');
      if (isLightOrMissing && !comp.props.backgroundGradient) {
        comp.props.backgroundColor = { type: 'solid', value: seed.isDarkMood ? seed.colorMood.surface : '#111827', opacity: 100 };
        // Fix text colors inside the forced-dark footer
        const fixFooterText = (child: any) => {
          if (['text', 'heading', 'label', 'paragraph'].includes(child.type)) {
            child.props = child.props || {};
            child.props.typography = child.props.typography || {};
            if (!child.props.typography.color) {
              child.props.typography.color = child.type === 'heading' ? '#ffffff' : 'rgba(255,255,255,0.85)';
            }
          }
          if (child.type === 'link') {
            child.props = child.props || {};
            child.props.typography = child.props.typography || {};
            if (!child.props.typography.color) child.props.typography.color = 'rgba(255,255,255,0.7)';
          }
          if (Array.isArray(child.children)) child.children.forEach(fixFooterText);
        };
        if (Array.isArray(comp.children)) comp.children.forEach(fixFooterText);
      }
    }

    if (Array.isArray(comp.children)) {
      comp.children = comp.children.map((c: any) => enhanceWithDesignSeed(c, seed, parentBg));
    }
    
    // Responsive defaults for flex-row containers
    if ((comp.props.display === 'flex' || comp.props.flexDirection) && comp.props.flexDirection !== 'column') {
      const childCount = Array.isArray(comp.children) ? comp.children.length : 0;
      if (childCount >= 2) {
        comp.props.mobileStyles = comp.props.mobileStyles || {};
        if (!comp.props.mobileStyles.flexDirection) comp.props.mobileStyles.flexDirection = 'column';
        if (comp.props.gap) {
          const gapNum = parseInt(String(comp.props.gap));
          if (gapNum > 16 && !comp.props.mobileStyles.gap) {
            comp.props.mobileStyles.gap = String(Math.max(16, Math.round(gapNum * 0.5)));
          }
        }
      }
    }
    
    // Responsive defaults for grid containers
    if (comp.props.display === 'grid' && comp.props.gridTemplateColumns) {
      const cols = comp.props.gridTemplateColumns;
      if (cols && cols !== '1fr' && !cols.includes('auto-fit')) {
        comp.props.mobileStyles = comp.props.mobileStyles || {};
        if (!comp.props.mobileStyles.gridTemplateColumns) {
          comp.props.mobileStyles.gridTemplateColumns = '1fr';
        }
      }
    }

    // Responsive: scale heading/text font sizes on mobile
    if (isHeading || isText || comp.type === 'paragraph') {
      comp.props.mobileStyles = comp.props.mobileStyles || {};
      if (!comp.props.mobileStyles.wordBreak) comp.props.mobileStyles.wordBreak = 'break-word';
      const desktopFontSize = comp.props.typography?.fontSize ? parseInt(String(comp.props.typography.fontSize)) : 0;
      if (desktopFontSize > 20 && !comp.props.mobileStyles.fontSize) {
        comp.props.mobileStyles.fontSize = String(Math.round(desktopFontSize * 0.65));
      }
      comp.props.tabletStyles = comp.props.tabletStyles || {};
      if (desktopFontSize > 28 && !comp.props.tabletStyles.fontSize) {
        comp.props.tabletStyles.fontSize = String(Math.round(desktopFontSize * 0.8));
      }
    }

    // Responsive: sections get mobile padding
    if (isSection || comp.type === 'container') {
      comp.props.mobileStyles = comp.props.mobileStyles || {};
      if (!comp.props.mobileStyles.paddingLeft) comp.props.mobileStyles.paddingLeft = '16';
      if (!comp.props.mobileStyles.paddingRight) comp.props.mobileStyles.paddingRight = '16';
      if (!comp.props.overflow) comp.props.overflow = 'hidden';
    }

    // Responsive: fluid images
    if (comp.type === 'image' && comp.props.width && comp.props.width !== '100%' && comp.props.width !== 'auto') {
      comp.props.mobileStyles = comp.props.mobileStyles || {};
      if (!comp.props.mobileStyles.width) comp.props.mobileStyles.width = '100%';
      if (!comp.props.mobileStyles.height) comp.props.mobileStyles.height = 'auto';
    }

    // Responsive: fluid cards
    if (comp.props.flexBasis && comp.props.flexBasis !== 'auto') {
      comp.props.mobileStyles = comp.props.mobileStyles || {};
      if (!comp.props.mobileStyles.flexBasis) comp.props.mobileStyles.flexBasis = 'auto';
      if (!comp.props.mobileStyles.width) comp.props.mobileStyles.width = '100%';
    }
    
    return comp;
  };
  
  // STEP 1: Execute foundation phase with provider-level retry
  if (foundationPhase) {
    const available = getAvailableModelKeys();
    let foundationSuccess = false;
    
    for (let provIdx = 0; provIdx < Math.min(available.length, 3); provIdx++) {
      try {
        const model = provIdx === 0 ? selectedModel : available[provIdx];
        console.log(`[AI Build] Foundation attempt ${provIdx + 1} with model: ${model}`);
        const foundationResult = await executePhase(foundationPhase, model);
        allSteps.push(...foundationResult.steps);
        // Track completed layout for anti-repetition
        completedLayouts.push('foundation:nav+hero+footer');
        if (foundationResult.failed) {
          failedPhases.push(foundationResult.name);
        }
        foundationSuccess = !foundationResult.failed;
        if (foundationSuccess) break;
      } catch (err: any) {
        console.warn(`[AI Build] Foundation attempt ${provIdx + 1} failed: ${err.message}`);
        if (provIdx < Math.min(available.length, 3) - 1) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        throw err;
      }
    }
  }
  
   // STEP 2: Execute remaining phases SEQUENTIALLY with rate-limit-friendly delays
  // Running phases one at a time prevents multiple simultaneous API calls from
  // exhausting a single provider's rate limit bucket.
  if (otherPhases.length > 0) {
    console.log(`[AI Build] Running ${otherPhases.length} phases sequentially with 1s inter-phase delays...`);
    const availableForFallback = getAvailableModelKeys().filter(k => k !== selectedModel);
    
    for (let i = 0; i < otherPhases.length; i++) {
      const phase = otherPhases[i];
      const globalIdx = i + 1; // +1 because foundation was phase 0
      const rotatedModel = getModelForPhase(globalIdx, selectedModel);
      console.log(`[AI Build] Phase ${phase.name} using model: ${rotatedModel}`);
      
      let phaseSucceeded = false;
      
      // Primary attempt
      try {
        const result = await executePhase(phase, rotatedModel);
        if (!result.failed) {
          allSteps.push(...result.steps);
          phaseSucceeded = true;
          completedLayouts.push(phase.name);
        }
      } catch (err: any) {
        console.warn(`[AI Build] Phase ${phase.name} primary attempt failed: ${err?.message}`);
      }
      
      // Fallback attempt with a different provider if primary failed
      if (!phaseSucceeded && availableForFallback.length > 0) {
        const fbModel = availableForFallback[i % availableForFallback.length];
        console.log(`[AI Build] Phase ${phase.name} retrying with fallback model: ${fbModel}`);
        await new Promise(r => setTimeout(r, 1000));
        try {
          const fbResult = await executePhase(phase, fbModel);
          if (!fbResult.failed) {
            allSteps.push(...fbResult.steps);
            phaseSucceeded = true;
            completedLayouts.push(phase.name);
          }
        } catch (fbErr: any) {
          console.warn(`[AI Build] Phase ${phase.name} fallback also failed: ${fbErr?.message}`);
        }
      }
      
      if (!phaseSucceeded) {
        failedPhases.push(phase.name);
      }
      
      // 1s gap between phases — gives rate limits time to breathe
      if (i < otherPhases.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }
  
  const warning = failedPhases.length > 0 
    ? `Some sections may be incomplete: ${failedPhases.join(', ')}` 
    : undefined;
    
  console.log(`[AI Build] Multi-step complete: ${allSteps.length} total components, ${failedPhases.length} failed phases`);
  
  return {
    success: allSteps.length > 0,
    steps: allSteps,
    warning,
    summary: `Generated ${allSteps.length} components across ${dynamicPhases.length - failedPhases.length} phases`
  };
}
// Get all available model keys based on configured API keys
function getAvailableModelKeys(): string[] {
  const available: string[] = [];
  if (googleApiKey) available.push('gemini-3-pro', 'gemini-3-flash', 'gemini-2.5-flash');
  if (openaiApiKey) available.push('gpt-5');
  if (anthropicApiKey) available.push('claude-sonnet-4');
  if (Deno.env.get('MINIMAX_API_KEY')) available.push('minimax-m2.5');
  if (googleApiKey) available.push('gemini-deep-research');
  if (openaiApiKey) available.push('openai-deep-research');
  return available.length > 0 ? available : ['default'];
}

// Use the user's selected model for ALL phases — no forced rotation
function getModelForPhase(phaseIndex: number, primaryModel: string): string {
  // Provider rotation was causing phases to hit rate-limited/unconfigured providers
  // When a user selects a model, every phase should use that model
  return primaryModel;
}

// Get fallback model keys for cross-provider failover
// Prioritize cross-provider fallbacks FIRST (different rate-limit buckets),
// then same-provider alternatives
function getFallbackModelKeys(primaryKey: string): string[] {
  const primaryConfig = MODEL_CONFIG[primaryKey] || MODEL_CONFIG['default'];
  const crossProvider: string[] = [];
  const sameProvider: string[] = [];
  // Candidates include all viable models + deep-research variants with independent rate limits
  const candidates = [
    'gpt-5', 'claude-sonnet-4', 'gemini-3-pro', 'gemini-3-flash',
    'gemini-2.5-flash', 'minimax-m2.5',
    'gemini-deep-research',   // gemini-2.5-pro (separate rate limit)
    'openai-deep-research',   // o3 (separate rate limit)
  ];
  for (const key of candidates) {
    if (key === primaryKey) continue;
    const cfg = MODEL_CONFIG[key];
    if (!cfg) continue;
    const hasKey = (cfg.provider === 'google' && googleApiKey) ||
                   (cfg.provider === 'openai' && openaiApiKey) ||
                   (cfg.provider === 'anthropic' && anthropicApiKey) ||
                   (cfg.provider === 'minimax' && Deno.env.get('MINIMAX_API_KEY'));
    if (!hasKey) continue;
    
    if (cfg.provider !== primaryConfig.provider) {
      crossProvider.push(key);
    } else {
      sameProvider.push(key);
    }
  }
  // Cross-provider first for maximum rate-limit diversity, limit to 3 to prevent timeout
  return [...crossProvider, ...sameProvider].slice(0, 3);
}

// AI model caller with custom timeout for phases (with retry on rate limit + KEY ROTATION + cross-provider fallback)
async function callAIModelWithTimeout(
  modelKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 8000,
  temperature: number = 0.85,
  timeoutMs: number = 30000
): Promise<string> {
  const config = MODEL_CONFIG[modelKey] || MODEL_CONFIG['default'];
  const keyPool = getApiKeys(config.provider as ProviderName);
  const MAX_RETRIES = 2;
  const RETRY_DELAYS = [1500, 3000];
  let lastUsedKey: string | undefined;
  let authFailed = false;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Pick a random key, preferring one different from last attempt
    const key = pickRandomKey(keyPool, lastUsedKey) || undefined;
    lastUsedKey = key;
    if (key) console.log(`[AI Build] Key rotation: using key ...${key.slice(-4)} (attempt ${attempt + 1}/${MAX_RETRIES})`);
    
    try {
      return await _callAIModelOnce(modelKey, systemPrompt, userPrompt, maxTokens, temperature, timeoutMs, key);
    } catch (err: any) {
      if (err.message === 'AUTH_FAILED') {
        console.warn(`[AI Build] Auth failed for ${modelKey}, skipping retries and going to fallbacks`);
        authFailed = true;
        break;
      }
      if (err.message === 'RATE_LIMIT') {
        // If we have more keys in the pool, try a different key immediately
        if (keyPool.length > 1 && attempt < MAX_RETRIES - 1) {
          console.warn(`[AI Build] Rate limited, rotating to different key from pool of ${keyPool.length}...`);
          await new Promise(r => setTimeout(r, 1000)); // brief 1s pause for key rotation
          continue;
        }
        if (attempt < MAX_RETRIES - 1) {
          const backoff = RETRY_DELAYS[attempt] || 10000;
          const jitteredBackoff = backoff + Math.floor(Math.random() * backoff * 0.3);
          console.warn(`[AI Build] Rate limited (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${jitteredBackoff / 1000}s...`);
          await new Promise(r => setTimeout(r, jitteredBackoff));
          continue;
        }
        console.warn(`[AI Build] All ${MAX_RETRIES} retries exhausted for ${modelKey}, falling through to fallbacks`);
        break;
      }
      if (err.message === 'OUTPUT_TRUNCATED') {
        const configMax = Number.isFinite(config.maxTokens) ? config.maxTokens : 65535;
        const doubledTokens = Math.min(maxTokens * 2, configMax);
        if (doubledTokens > maxTokens) {
          console.warn(`[AI Build] OUTPUT TRUNCATED: retrying with ${doubledTokens} tokens`);
          try {
            return await _callAIModelOnce(modelKey, systemPrompt, userPrompt, doubledTokens, temperature, timeoutMs, key);
          } catch (retryErr: any) {
            if (retryErr.message === 'OUTPUT_TRUNCATED' && retryErr.partialText) {
              console.warn(`[AI Build] Still truncated after retry, returning partial text for salvage`);
              return retryErr.partialText;
            }
            throw retryErr;
          }
        } else {
          console.warn(`[AI Build] Truncated but already at model max (${configMax}), returning partial text`);
          if (err.partialText) return err.partialText;
        }
      }
      throw err;
    }
  }
  
  // Primary exhausted — try fallback providers with key rotation
  const skipProvider = authFailed ? config.provider : undefined;
  const fallbacks = getFallbackModelKeys(modelKey);
  for (const fbKey of fallbacks) {
    const fbConfig = MODEL_CONFIG[fbKey];
    if (skipProvider && fbConfig?.provider === skipProvider) {
      console.log(`[AI Build] Skipping fallback ${fbKey} (same provider as auth-failed: ${skipProvider})`);
      continue;
    }
    await new Promise(r => setTimeout(r, 500));
    // Use key rotation for fallback too
    const fbPool = getApiKeys(fbConfig?.provider as ProviderName);
    const fbKey2 = pickRandomKey(fbPool) || undefined;
    try {
      console.log(`[AI Build] Primary exhausted, falling back to ${fbKey}`);
      return await _callAIModelOnce(fbKey, systemPrompt, userPrompt, maxTokens, temperature, timeoutMs, fbKey2);
    } catch (fbErr: any) {
      console.warn(`[AI Build] Fallback ${fbKey} failed: ${fbErr.message}`);
      continue;
    }
  }
  throw new Error('RATE_LIMIT');
}

async function _callAIModelOnce(
  modelKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  temperature: number,
  timeoutMs: number,
  apiKeyOverride?: string
): Promise<string> {
  const config = MODEL_CONFIG[modelKey] || MODEL_CONFIG['default'];
  const configuredMaxTokens = Number.isFinite(config.maxTokens) ? config.maxTokens : 4096;
  const effectiveMaxTokens = Math.min(maxTokens, configuredMaxTokens);

  console.log(`[AI Build Phase] Provider: ${config.provider}, model: ${config.model}, keyPool rotation active`);
  
  try {
    switch (config.provider) {
      case 'anthropic': {
        const key = apiKeyOverride || pickRandomKey(getApiKeys('anthropic'));
        if (!key) throw new Error('ANTHROPIC_API_KEY not configured');
        const response = await fetch(config.endpoint, {
          method: 'POST',
          headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: effectiveMaxTokens,
            temperature,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
          }),
        });
        if (!response.ok) {
          const errorText = await response.text();
          if (response.status === 401 || response.status === 403) {
            console.error(`[AI Build] Anthropic auth failed (${response.status})`);
            throw new Error('AUTH_FAILED');
          }
          if (response.status === 429) throw new Error('RATE_LIMIT');
          throw new Error(`Anthropic error: ${response.status}`);
        }
        const data = await response.json();
        const anthropicText = data.content?.[0]?.text?.trim() || '';
        if (data.stop_reason === 'max_tokens') {
          console.warn(`[AI Build] Anthropic output truncated (stop_reason=max_tokens)`);
          const err: any = new Error('OUTPUT_TRUNCATED');
          err.partialText = anthropicText;
          throw err;
        }
        return anthropicText;
      }
      
      case 'openai': {
        const key = apiKeyOverride || pickRandomKey(getApiKeys('openai'));
        if (!key) throw new Error('OPENAI_API_KEY not configured');
        const openAiBody: Record<string, unknown> = {
          model: config.model,
          max_tokens: effectiveMaxTokens,
          temperature,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        };
        if (config.model === 'gpt-4o' || config.model.startsWith('gpt-4o-')) {
          openAiBody.response_format = { type: 'json_object' };
        }
        const response = await fetch(config.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(openAiBody),
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            console.error(`[AI Build] OpenAI auth failed (${response.status})`);
            throw new Error('AUTH_FAILED');
          }
          if (response.status === 429) throw new Error('RATE_LIMIT');
          throw new Error(`OpenAI error: ${response.status}`);
        }
        const data = await response.json();
        const openaiText = data.choices?.[0]?.message?.content?.trim() || '';
        if (data.choices?.[0]?.finish_reason === 'length') {
          console.warn(`[AI Build] OpenAI output truncated (finish_reason=length)`);
          const err: any = new Error('OUTPUT_TRUNCATED');
          err.partialText = openaiText;
          throw err;
        }
        return openaiText;
      }
      
      case 'google': {
        const key = apiKeyOverride || pickRandomKey(getApiKeys('google'));
        if (!key) throw new Error('GOOGLE_API_KEY not configured');
        const url = `${config.endpoint}?key=${key}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }],
            generationConfig: {
              maxOutputTokens: effectiveMaxTokens,
              temperature,
              responseMimeType: 'application/json',
            },
          }),
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            console.error(`[AI Build] Google auth failed (${response.status})`);
            throw new Error('AUTH_FAILED');
          }
          if (response.status === 429) throw new Error('RATE_LIMIT');
          throw new Error(`Google error: ${response.status}`);
        }
        const data = await response.json();
        const googleText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
          console.warn(`[AI Build] Google output truncated (finishReason=MAX_TOKENS)`);
          const err: any = new Error('OUTPUT_TRUNCATED');
          err.partialText = googleText;
          throw err;
        }
        return googleText;
      }
      
      case 'minimax': {
        const key = apiKeyOverride || pickRandomKey(getApiKeys('minimax'));
        if (!key) throw new Error('MINIMAX_API_KEY not configured');
        
        // Removed redundant minimaxDirective — COMPACT_PHASE_PROMPT already covers
        // all schema requirements. The old directive wasted ~500 tokens and conflicted
        // with design seed colors (hsl(var(--token)) vs explicit hex).
        
        const response = await fetch(config.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: effectiveMaxTokens,
            temperature: 0.7,
            top_p: 0.9,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
        });
        if (!response.ok) {
          const errBody = await response.text().catch(() => '');
          console.error(`[AI Build] MiniMax HTTP ${response.status}: ${errBody.substring(0, 300)}`);
          if (response.status === 401 || response.status === 403) {
            console.error(`[AI Build] MiniMax API key is invalid or expired.`);
            throw new Error('AUTH_FAILED');
          }
          if (response.status === 429) throw new Error('RATE_LIMIT');
          throw new Error(`MiniMax error: ${response.status}`);
        }
        const data = await response.json();
        const minimaxText = data.choices?.[0]?.message?.content?.trim() || '';
        if (data.choices?.[0]?.finish_reason === 'length') {
          console.warn(`[AI Build] MiniMax output truncated (finish_reason=length)`);
          const err: any = new Error('OUTPUT_TRUNCATED');
          err.partialText = minimaxText;
          throw err;
        }
        return minimaxText;
      }
      
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  } catch (error: any) {
    throw error;
  }
}

// JSON sanitizer for phase responses with enhanced repair capabilities
function sanitizeJsonForPhase(jsonStr: string): string {
  let cleaned = jsonStr.trim();
  
  // Remove markdown code blocks (including mid-string occurrences)
  cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
  
  // Strip everything before the first { or [
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  const jsonStart = Math.min(
    firstBrace >= 0 ? firstBrace : Infinity,
    firstBracket >= 0 ? firstBracket : Infinity
  );
  if (jsonStart !== Infinity && jsonStart > 0) {
    cleaned = cleaned.substring(jsonStart);
  }
  
  // Strip everything after the last } or ]
  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  const jsonEnd = Math.max(lastBrace, lastBracket);
  if (jsonEnd > 0 && jsonEnd < cleaned.length - 1) {
    cleaned = cleaned.substring(0, jsonEnd + 1);
  }
  
  // Remove single-line comments (// ...)
  cleaned = cleaned.replace(/^\s*\/\/.*$/gm, '');
  cleaned = cleaned.replace(/,\s*\/\/[^\n\r]*/g, ',');
  cleaned = cleaned.replace(/([}\]])\s*\/\/[^\n\r]*/g, '$1');
  cleaned = cleaned.replace(/\/\/[^\n\r]*/g, '');
  // Remove multi-line comments
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // FIX: Remove Unicode arrows/special chars EARLY (before string parsing)
  // These come from the AI echoing prompt formatting into its JSON output
  cleaned = cleaned.replace(/\u2192/g, '-'); // right arrow
  cleaned = cleaned.replace(/\u2190/g, '-'); // left arrow
  cleaned = cleaned.replace(/\u2014/g, '-'); // em-dash
  cleaned = cleaned.replace(/\u2013/g, '-'); // en-dash
  cleaned = cleaned.replace(/\u2018/g, "'"); // left single quote
  cleaned = cleaned.replace(/\u2019/g, "'"); // right single quote
  cleaned = cleaned.replace(/\u201C/g, "'"); // left double quote -> single quote (safe in JSON strings)
  cleaned = cleaned.replace(/\u201D/g, "'"); // right double quote -> single quote (safe in JSON strings)
  cleaned = cleaned.replace(/\u2026/g, '...'); // ellipsis
  cleaned = cleaned.replace(/\u2550/g, '-'); // box drawing double horizontal
  cleaned = cleaned.replace(/\u2551/g, '|'); // box drawing double vertical
  cleaned = cleaned.replace(/[\u2500-\u257F]/g, '-'); // all box drawing chars
  cleaned = cleaned.replace(/[\u2714\u2716\u2713\u2717]/g, ''); // check/cross marks
  cleaned = cleaned.replace(/[\u25A0-\u25FF]/g, ''); // geometric shapes (squares, circles)
  // Strip ALL emoji and symbol blocks that could break JSON
  cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}]/gu, ''); // misc symbols, emoticons, transport, etc.
  cleaned = cleaned.replace(/[\u{2600}-\u{27BF}]/gu, ''); // misc symbols, dingbats
  cleaned = cleaned.replace(/[\u{FE00}-\u{FE0F}]/gu, ''); // variation selectors
  cleaned = cleaned.replace(/[\u{200D}]/gu, ''); // zero-width joiner (emoji sequences)
  
  // FIX: Escape unescaped control characters INSIDE string values
  cleaned = cleaned.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, content) => {
    const escaped = content
      .replace(/(?<!\\)\n/g, '\\n')
      .replace(/(?<!\\)\r/g, '\\r')
      .replace(/(?<!\\)\t/g, '\\t')
      .replace(/[\x00-\x1F\x7F]/g, (char: string) => {
        if (char === '\n' || char === '\r' || char === '\t') return char;
        return '';
      });
    return `"${escaped}"`;
  });
  
  // Remove remaining control characters outside strings
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, (char) => {
    if (char === '\n' || char === '\r' || char === '\t') return char;
    return '';
  });
  
  // Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  
  // FIX: Convert unquoted property names to quoted
  // Uses capture-group approach (no lookbehind) — safe in all V8 versions.
  // The [\{,] delimiter cannot be `"`, so already-quoted keys are never matched.
  cleaned = cleaned.replace(/([\{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:(?!\s*:))/g,
    (_m, pre, key, suffix) => `${pre}"${key}"${suffix}`
  );
  
  // FIX: Replace single-quoted string values with double quotes
  cleaned = cleaned.replace(/:\s*'([^'\\]*(\\.[^'\\]*)*)'/g, ': "$1"');
  
  // FIX: Handle undefined and NaN values
  cleaned = cleaned.replace(/:\s*undefined\b/g, ': null');
  cleaned = cleaned.replace(/:\s*NaN\b/g, ': null');
  
  // FIX: Repair truncated string values
  cleaned = repairTruncatedStrings(cleaned);
  
  // FIX: Attempt to repair truncated JSON by balancing brackets
  const openBrackets = (cleaned.match(/\[/g) || []).length;
  const closeBrackets = (cleaned.match(/\]/g) || []).length;
  const openBraces = (cleaned.match(/\{/g) || []).length;
  const closeBraces = (cleaned.match(/\}/g) || []).length;
  
  if (openBrackets > closeBrackets || openBraces > closeBraces) {
    console.log(`[JSON Repair] Truncated JSON - brackets: ${openBrackets}/${closeBrackets}, braces: ${openBraces}/${closeBraces}`);
    
    // Find last valid position
    let lastValidPos = cleaned.length - 1;
    while (lastValidPos > 0 && !/[}\]"0-9]/.test(cleaned[lastValidPos])) {
      lastValidPos--;
    }
    cleaned = cleaned.substring(0, lastValidPos + 1);
    cleaned = cleaned.replace(/,\s*$/, '');
    
    // Add missing closing brackets/braces
    const bracketsToAdd = openBrackets - (cleaned.match(/\]/g) || []).length;
    const bracesToAdd = openBraces - (cleaned.match(/\}/g) || []).length;
    
    for (let i = 0; i < bracketsToAdd; i++) cleaned += ']';
    for (let i = 0; i < bracesToAdd; i++) cleaned += '}';
    
    console.log(`[JSON Repair] Added ${bracketsToAdd} ] and ${bracesToAdd} }`);
  }
  
  // FINAL FALLBACK: Try to parse; if it fails, attempt aggressive recovery
  try {
    JSON.parse(cleaned);
  } catch (e: any) {
    console.warn(`[JSON Repair] Initial parse failed: ${e.message}`);
    
    // Try to extract just the steps array from the JSON
    const stepsMatch = cleaned.match(/"steps"\s*:\s*(\[[\s\S]*)/);
    if (stepsMatch) {
      let stepsStr = stepsMatch[1];
      // Balance brackets
      const ob = (stepsStr.match(/\[/g) || []).length;
      const cb = (stepsStr.match(/\]/g) || []).length;
      const oB = (stepsStr.match(/\{/g) || []).length;
      const cB = (stepsStr.match(/\}/g) || []).length;
      for (let i = 0; i < ob - cb; i++) stepsStr += ']';
      for (let i = 0; i < oB - cB; i++) stepsStr += '}';
      stepsStr = stepsStr.replace(/,\s*([}\]])/g, '$1');
      
      try {
        const steps = JSON.parse(stepsStr);
        if (Array.isArray(steps) && steps.length > 0) {
          console.log(`[JSON Repair] Recovered ${steps.length} steps via extraction`);
          return JSON.stringify({ success: true, steps });
        }
      } catch {
        // Fall through
      }
    }
  }
  
  return cleaned;
}

// Resilient JSON parser with multi-stage fallback
function resilientJsonParse(raw: string): any {
  const sanitized = sanitizeJsonForPhase(raw);
  
  // Attempt 1: Direct parse
  try {
    return JSON.parse(sanitized);
  } catch (e1: any) {
    console.warn(`[JSON Parse] First attempt failed: ${e1.message}`);
  }
  
  // Attempt 2: Strip ALL non-ASCII from string values
  let aggressive = sanitized.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (_match: string, content: string) => {
    const cleaned = content.replace(/[^\x20-\x7E\\]/g, '');
    return `"${cleaned}"`;
  });
  aggressive = aggressive.replace(/,\s*([}\]])/g, '$1');
  
  try {
    return JSON.parse(aggressive);
  } catch (e2: any) {
    console.error(`[JSON Parse] Second attempt failed: ${e2.message}`);
  }
  
  // Attempt 3: Extract steps array with bracket balancing
  const stepsMatch = aggressive.match(/"steps"\s*:\s*(\[[\s\S]*)/);
  if (stepsMatch) {
    let stepsStr = stepsMatch[1];
    const ob = (stepsStr.match(/\[/g) || []).length;
    const cb = (stepsStr.match(/\]/g) || []).length;
    const oB = (stepsStr.match(/\{/g) || []).length;
    const cB = (stepsStr.match(/\}/g) || []).length;
    for (let i = 0; i < ob - cb; i++) stepsStr += ']';
    for (let i = 0; i < oB - cB; i++) stepsStr += '}';
    stepsStr = stepsStr.replace(/,\s*([}\]])/g, '$1');
    try {
      const steps = JSON.parse(stepsStr);
      if (Array.isArray(steps)) {
        console.log(`[JSON Parse] Recovered ${steps.length} steps via extraction`);
        return { success: true, steps };
      }
    } catch {}
  }

  // Attempt 4: Salvage individual items from truncated steps array
  // Split by top-level array item boundaries and parse each one
  if (stepsMatch) {
    console.warn('[JSON Parse] Attempting individual item salvage from truncated array');
    const rawArray = stepsMatch[1];
    const salvaged: any[] = [];
    let depth = 0;
    let itemStart = -1;
    
    for (let i = 0; i < rawArray.length; i++) {
      const ch = rawArray[i];
      if (ch === '{') {
        if (depth === 1 && itemStart === -1) itemStart = i; // top-level item start (depth 1 = inside the outer array)
        if (depth === 0 && itemStart === -1) itemStart = i;
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0 && itemStart !== -1) {
          // Found a complete top-level object
          const itemStr = rawArray.substring(itemStart, i + 1);
          try {
            const item = JSON.parse(itemStr);
            if (item && typeof item === 'object') {
              salvaged.push(item);
            }
          } catch {
            // This item is malformed, skip it
          }
          itemStart = -1;
        }
      }
    }
    
    if (salvaged.length > 0) {
      console.log(`[JSON Parse] Salvaged ${salvaged.length} items from truncated output`);
      return { success: true, steps: salvaged };
    }
  }
  
  // Final fallback: empty result (phase will be marked as failed, not crash)
  console.error('[JSON Parse] All attempts failed, returning empty steps');
  return { success: true, steps: [] };
}

// Helper function to repair truncated string values
function repairTruncatedStrings(json: string): string {
  let result = '';
  let inString = false;
  let escaped = false;
  let stringStart = -1;
  let parenDepth = 0; // FIX: track CSS function call depth, e.g. linear-gradient(...), rgba(...)
  let repairCount = 0;
  
  for (let i = 0; i < json.length; i++) {
    const char = json[i];
    
    if (escaped) {
      escaped = false;
      result += char;
      continue;
    }
    
    if (char === '\\' && inString) {
      escaped = true;
      result += char;
      continue;
    }
    
    if (char === '"') {
      if (!inString) {
        inString = true;
        stringStart = i;
        parenDepth = 0; // FIX: reset paren depth on every new string
      } else {
        inString = false;
        stringStart = -1;
        parenDepth = 0;
      }
      result += char;
      continue;
    }
    
    // FIX: Track parenthesis depth inside strings to avoid misfiring on
    // CSS values like "linear-gradient(-45deg, #ee7752, #e73c7e{" 
    if (inString) {
      if (char === '(') {
        parenDepth++;
        result += char;
        continue;
      }
      if (char === ')') {
        parenDepth = Math.max(0, parenDepth - 1);
        result += char;
        continue;
      }
    }
    
    // If we're in a string and hit a structural char, apply strict heuristics
    // before deciding to close the string.
    // FIX: Only apply when NOT inside a CSS function call (parenDepth === 0)
    if (inString && parenDepth === 0 && (char === '{' || char === '}' || char === '[' || char === ']')) {
      const stringLength = i - stringStart;
      
      // Short strings (under 5 chars) are very unlikely to be truncated;
      // they probably just contain bracket characters in text
      if (stringLength < 5) {
        result += char;
        continue;
      }
      
      // Only close if followed by a strong JSON structure indicator:
      // - A property name pattern like `"key":` within the next few chars
      // - Or a closing bracket followed by comma/bracket (end of structure)
      const nextChars = json.substring(i, Math.min(i + 20, json.length));
      const isStrongStructuralIndicator = 
        // Opening bracket followed by a property name: [{"key" or {"key"
        /^[\[{]\s*"[a-zA-Z_]\w*"\s*:/.test(nextChars) ||
        // Closing bracket followed by structural continuation: }], },, ]}
        /^[\]}]\s*[,}\]]/.test(nextChars) ||
        // Closing bracket at end of input
        /^[\]}]\s*$/.test(nextChars);
      
      if (isStrongStructuralIndicator) {
        repairCount++;
        console.log(`[JSON Repair] Closing truncated string at position ${i} (repair #${repairCount})`);
        result += '"';
        inString = false;
        stringStart = -1;
        parenDepth = 0;
      }
    }
    
    result += char;
  }
  
  // If we ended while still in a string, close it
  if (inString) {
    console.log(`[JSON Repair] Closing unclosed string at end of JSON`);
    result += '"';
  }
  
  if (repairCount > 0) {
    console.log(`[JSON Repair] Total string repairs: ${repairCount}`);
  }
  
  return result;
}

// Fetch design template from database by name
async function fetchDesignTemplate(templateName: string): Promise<any | null> {
  if (!supabaseUrl || !supabaseKey) {
    console.log('[Design Templates] Supabase not configured, skipping template fetch');
    return null;
  }
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/design_system_templates?name=eq.${encodeURIComponent(templateName)}&is_active=eq.true&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.log('[Design Templates] Failed to fetch template:', response.status);
      return null;
    }
    
    const data = await response.json();
    if (data && data.length > 0) {
      console.log(`[Design Templates] Found template: ${data[0].name}`);
      return data[0];
    }
    
    return null;
  } catch (error) {
    console.error('[Design Templates] Error fetching template:', error);
    return null;
  }
}

// Unified AI model caller function with retry on rate limit + KEY ROTATION + cross-provider fallback
async function callAIModel(
  modelKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokensOverride?: number,
  temperature: number = 0.7,
  isFallbackAttempt: boolean = false
): Promise<string> {
  const config = MODEL_CONFIG[modelKey] || MODEL_CONFIG['default'];
  const keyPool = getApiKeys(config.provider as ProviderName);
  const MAX_RETRIES = 2;
  const BASE_DELAY_MS = 1500;
  let lastUsedKey: string | undefined;
  let authFailed = false;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const key = pickRandomKey(keyPool, lastUsedKey) || undefined;
    lastUsedKey = key;
    try {
      return await _callAIModelOnce2(modelKey, systemPrompt, userPrompt, maxTokensOverride, temperature, isFallbackAttempt, key);
    } catch (err: any) {
      if (err.message === 'AUTH_FAILED') {
        console.warn(`[AI Build] Auth failed for ${modelKey}, skipping to fallbacks`);
        authFailed = true;
        break;
      }
      if (err.message === 'RATE_LIMIT') {
        if (keyPool.length > 1 && attempt < MAX_RETRIES - 1) {
          console.warn(`[AI Build] Rate limited, rotating key from pool of ${keyPool.length}...`);
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        if (attempt < MAX_RETRIES - 1) {
          const backoff = BASE_DELAY_MS * Math.pow(2, attempt);
          // Jittered backoff: add random 0-30% to prevent thundering herd
          const jitter = backoff * Math.random() * 0.3;
          console.warn(`[AI Build] Rate limited (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${(backoff + jitter).toFixed(0)}ms...`);
          await new Promise(r => setTimeout(r, backoff + jitter));
          continue;
        }
        console.warn(`[AI Build] All ${MAX_RETRIES} retries exhausted for ${modelKey}, falling through to fallbacks`);
        break;
      }
      throw err;
    }
  }
  
  // Primary exhausted — try fallback providers with key rotation
  const skipProvider = authFailed ? config.provider : undefined;
  const fallbacks = getFallbackModelKeys(modelKey);
  for (const fbKey of fallbacks) {
    const fbConfig = MODEL_CONFIG[fbKey];
    if (skipProvider && fbConfig?.provider === skipProvider) {
      console.log(`[AI Build] Skipping fallback ${fbKey} (same provider as auth-failed: ${skipProvider})`);
      continue;
    }
    await new Promise(r => setTimeout(r, 500));
    const fbPool = getApiKeys(fbConfig?.provider as ProviderName);
    for (let fbAttempt = 0; fbAttempt < 2; fbAttempt++) {
      const fbKeyVal = pickRandomKey(fbPool, fbAttempt > 0 ? lastUsedKey : undefined) || undefined;
      lastUsedKey = fbKeyVal;
      try {
        console.log(`[AI Build] Primary rate-limited, falling back to ${fbKey} (attempt ${fbAttempt + 1}/2)`);
        return await _callAIModelOnce2(fbKey, systemPrompt, userPrompt, maxTokensOverride, temperature, true, fbKeyVal);
      } catch (fbErr: any) {
        console.warn(`[AI Build] Fallback ${fbKey} attempt ${fbAttempt + 1} failed: ${fbErr.message}`);
        if (fbErr.message === 'AUTH_FAILED') break; // skip this provider entirely
        if (fbErr.message === 'RATE_LIMIT' && fbAttempt === 0) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        break;
      }
    }
  }
  throw new Error('RATE_LIMIT');
}

async function _callAIModelOnce2(
  modelKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokensOverride?: number,
  temperature: number = 0.7,
  isFallbackAttempt: boolean = false,
  apiKeyOverride?: string
): Promise<string> {
  const config = MODEL_CONFIG[modelKey] || MODEL_CONFIG['default'];
  const configuredMaxTokens = Number.isFinite(config.maxTokens) ? config.maxTokens : 4096;
  const requestedMaxTokens = Number.isFinite(maxTokensOverride)
    ? (maxTokensOverride as number)
    : configuredMaxTokens;
  const maxTokens = config.provider === 'openai'
    ? Math.min(requestedMaxTokens, configuredMaxTokens)
    : requestedMaxTokens;

  console.log(
    `[AI Build] Using provider: ${config.provider}, model: ${config.model}, maxTokens: ${maxTokens}, keyPool rotation active`
  );
  
  try {
    switch (config.provider) {
      case 'anthropic': {
        const key = apiKeyOverride || pickRandomKey(getApiKeys('anthropic'));
        if (!key) throw new Error('ANTHROPIC_API_KEY is not configured');
        const response = await fetch(config.endpoint, {
          method: 'POST',
          headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
            'anthropic-beta': 'prompt-caching-2024-07-31', // Enable caching
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: maxTokens,
            temperature: temperature,
            system: [
              {
                type: 'text',
                text: systemPrompt,
                cache_control: { type: 'ephemeral' } // Cache the static system prompt
              }
            ],
            messages: [{ role: 'user', content: userPrompt }],
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Anthropic API error:', response.status, errorText);
          if (response.status === 401 || response.status === 403) throw new Error('AUTH_FAILED');
          if (response.status === 429) throw new Error('RATE_LIMIT');
          throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        return data.content?.[0]?.text?.trim() || '';
      }
      
      case 'openai': {
        const key = apiKeyOverride || pickRandomKey(getApiKeys('openai'));
        if (!key) throw new Error('OPENAI_API_KEY is not configured');

        const openAiBody: Record<string, unknown> = {
          model: config.model,
          max_tokens: maxTokens,
          temperature: temperature,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        };

        if (config.model === 'gpt-4o' || config.model.startsWith('gpt-4o-')) {
          openAiBody.response_format = { type: 'json_object' };
        }

        const openaiResponse = await fetch(config.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(openAiBody),
        });
        
        if (!openaiResponse.ok) {
          const errorText = await openaiResponse.text();
          console.error('OpenAI API error:', openaiResponse.status, errorText);
          if (openaiResponse.status === 401 || openaiResponse.status === 403) throw new Error('AUTH_FAILED');
          if (openaiResponse.status === 429) throw new Error('RATE_LIMIT');
          throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
        }
        
        const openaiData = await openaiResponse.json();
        const openaiFinishReason = openaiData.choices?.[0]?.finish_reason;
        
        if (openaiFinishReason === 'length') {
          console.warn('[AI Build] OpenAI output was truncated due to token limit');
        }
        
        return openaiData.choices?.[0]?.message?.content?.trim() || '';
      }
      
      case 'google': {
        const key = apiKeyOverride || pickRandomKey(getApiKeys('google'));
        if (!key) throw new Error('GOOGLE_API_KEY is not configured');
        const url = `${config.endpoint}?key=${key}`;
        const googleResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] }, // Use systemInstruction for auto-caching
            contents: [
              { role: 'user', parts: [{ text: userPrompt }] }
            ],
            generationConfig: {
              maxOutputTokens: maxTokens,
              temperature: temperature,
              responseMimeType: 'application/json',
            },
          }),
        });
        
        if (!googleResponse.ok) {
          const errorText = await googleResponse.text();
          console.error('Google API error:', googleResponse.status, errorText);
          if (googleResponse.status === 401 || googleResponse.status === 403) throw new Error('AUTH_FAILED');
          if (googleResponse.status === 429) throw new Error('RATE_LIMIT');
          throw new Error(`Google API error: ${googleResponse.status} - ${errorText}`);
        }
        
        const googleData = await googleResponse.json();
        const googleFinishReason = googleData.candidates?.[0]?.finishReason;
        
        if (googleFinishReason === 'MAX_TOKENS') {
          console.warn('[AI Build] Gemini output was truncated due to token limit');
        }
        
        return googleData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      }
      
      case 'minimax': {
        const key = apiKeyOverride || pickRandomKey(getApiKeys('minimax'));
        if (!key) throw new Error('MINIMAX_API_KEY is not configured');
        
        const minimaxDirective2 = ``; // Removed redundant directive to save tokens
        
        const minimaxBody: Record<string, unknown> = {
          model: config.model,
          max_tokens: maxTokens,
          temperature: 0.7,
          top_p: 0.9,
          messages: [
            { role: 'system', content: systemPrompt + minimaxDirective2 },
            { role: 'user', content: userPrompt },
          ],
        };
        const minimaxResponse = await fetch(config.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(minimaxBody),
        });
        if (!minimaxResponse.ok) {
          const errorText = await minimaxResponse.text();
          console.error('MiniMax API error:', minimaxResponse.status, errorText);
          if (minimaxResponse.status === 401 || minimaxResponse.status === 403) throw new Error('AUTH_FAILED');
          if (minimaxResponse.status === 429) throw new Error('RATE_LIMIT');
          throw new Error(`MiniMax API error: ${minimaxResponse.status} - ${errorText}`);
        }
        const minimaxData = await minimaxResponse.json();
        const minimaxFinishReason = minimaxData.choices?.[0]?.finish_reason;
        if (minimaxFinishReason === 'length') {
          console.warn('[AI Build] MiniMax output was truncated due to token limit');
        }
        return minimaxData.choices?.[0]?.message?.content?.trim() || '';
      }
      
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  } catch (error: any) {
    throw error;
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Connection': 'keep-alive',
};

// Complete list of available component types
const AVAILABLE_COMPONENTS = `
LAYOUT COMPONENTS:
- div: Basic container (use for cards, sections, wrappers)
- section: Semantic section with full-width capability
- container: Centered container with max-width
- spacer: Vertical spacing element
- separator: Horizontal divider line

TYPOGRAPHY:
- text: Paragraph/span text element
- heading: Headings (H1-H6 via "tag" prop)
- blockquote: Styled quote block
- code: Inline code snippet
- codeblock: Multi-line code block
- link: Hyperlink with href
- icon: Lucide icon (iconName prop: "Check", "Star", "ArrowRight", "Zap", etc.)

FORM ELEMENTS:
- form-wrapper: Smart form with submission handling
- button: Interactive button (variant: default/outline/secondary/ghost)
- input: Text input (type: text/email/number/tel)
- password-input: Password field with visibility toggle
- textarea: Multi-line text input
- select: Dropdown (options: [{label, value}])
- checkbox: Single checkbox
- checkbox-group: Multiple checkboxes
- radio-group: Radio button group
- switch: Toggle switch
- slider: Range slider
- label: Form field label
- datepicker: Date picker input

MEDIA:
- image: Image element
  CRITICAL: For AI-generated images, use "imagePrompt" instead of "src":
  { "type": "image", "props": { "imagePrompt": "Professional headshot of a developer in modern office setting" } }
  
  For placeholder/icon images, use "src":
  { "type": "image", "props": { "src": "/placeholder.svg", "alt": "Placeholder" } }
  
  ALWAYS use imagePrompt for: hero images, avatars, product photos, portfolio thumbnails, team photos
  
- video: Video player

DATA DISPLAY:
- badge: Status/label badge (variant: default/secondary/outline/destructive)
- alert: Alert message box
- progress: Progress bar
- calendar: Calendar display

NAVIGATION:
- nav-horizontal: Header navigation bar
- tabs: Tabbed content
- accordion: Collapsible sections
- carousel: Image/content slideshow
`;

// CRITICAL: Formal component prop schemas - AI must use EXACT property names
const COMPONENT_PROP_SCHEMAS = `
═══════════════════════════════════════════════════════════════════════════════
⚠️ COMPONENT PROP SCHEMAS (CRITICAL - USE EXACT PROPERTY NAMES)
═══════════════════════════════════════════════════════════════════════════════

These schemas define the EXACT props each component type accepts.
DO NOT invent properties not listed here. The renderer will IGNORE unknown props.

⚠️ SCHEMA ENFORCEMENT - CRITICAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ONLY use props listed in these schemas. DO NOT invent new properties.

COMMON MISTAKES TO AVOID:
❌ "label" on buttons → Use "text" instead
❌ "content" on buttons → Use "text" instead  
❌ "iconName" on buttons → Use "icon" instead
❌ "icon" on standalone icons → Use "iconName" instead
❌ "src" for AI images → Use "imagePrompt" instead

────────────────────────────────────────────────────────────────────────────────
BUTTON
────────────────────────────────────────────────────────────────────────────────
{
  "type": "button",
  "props": {
    "text": "Button Label",                    // REQUIRED - button label (NOT "content" or "label")
    "variant": "default",                      // "default" | "outline" | "secondary" | "ghost" | "destructive" | "link"
    "size": "default",                         // "sm" | "default" | "lg"
    "icon": "ArrowRight",                      // Lucide icon name (Menu, Search, ChevronDown, etc.)
    "iconPosition": "left",                    // "left" | "right"
    "brandIcon": "github",                     // Social brand: google, apple, github, linkedin, twitter, x, facebook, instagram, youtube, dribbble, behance, discord
    "disabled": false,                         // boolean
    "fullWidth": false,                        // boolean
    "backgroundColor": { "type": "solid", "value": "#3b82f6" },
    "textColor": "#ffffff",
    "typography": { "fontSize": "14", "fontWeight": "500" },
    "borderRadius": { "topLeft": "8", "topRight": "8", "bottomRight": "8", "bottomLeft": "8", "unit": "px" },
    "spacingControl": { "padding": { "top": "12", "right": "24", "bottom": "12", "left": "24", "unit": "px" } }
  }
}

BUTTON ICON RULES:
- Text button with icon: Use "icon" prop → { "text": "Learn More", "icon": "ArrowRight" }
- Icon-only button: Use "icon" with empty text → { "text": "", "icon": "Menu", "variant": "ghost" }
- Social login button: Use "brandIcon" → { "brandIcon": "google", "text": "Sign in with Google" }
- Social icon-only: Use "brandIcon" with empty text → { "brandIcon": "github", "text": "", "variant": "ghost" }

COMMON LUCIDE ICONS: Menu, X, ArrowRight, ArrowLeft, ChevronDown, ChevronRight, Search, Plus, Minus, Check, ExternalLink, Mail, Phone, Star, Heart, Share, Download, Upload, Settings, User, Home, ShoppingCart, CreditCard, Clock, Calendar, MapPin, Globe, Play, Pause, Volume2, Bell, Lock, Unlock, Eye, EyeOff, Edit, Trash, Copy, Save, Send, Sparkles, Zap, Award, TrendingUp

────────────────────────────────────────────────────────────────────────────────
HEADING
────────────────────────────────────────────────────────────────────────────────
{
  "type": "heading",
  "props": {
    "content": "Heading Text",                 // REQUIRED - heading text
    "tag": "h1",                               // "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
    "typography": {
      "fontSize": "48",                        // string without px
      "fontWeight": "700",                     // "300" | "400" | "500" | "600" | "700" | "800"
      "fontFamily": "Inter, sans-serif",       // or "Playfair Display, serif" for editorial
      "lineHeight": "1.1",
      "letterSpacing": "-0.02",
      "textAlign": "center",                   // "left" | "center" | "right"
      "color": "hsl(var(--foreground))"
    }
  }
}

────────────────────────────────────────────────────────────────────────────────
TEXT
────────────────────────────────────────────────────────────────────────────────
{
  "type": "text",
  "props": {
    "content": "Paragraph text content",       // REQUIRED - text content
    "tag": "p",                                // "p" | "span" | "div"
    "typography": {
      "fontSize": "16",
      "fontWeight": "400",
      "fontFamily": "Inter, sans-serif",
      "lineHeight": "1.6",
      "textAlign": "left",
      "color": "hsl(var(--muted-foreground))"
    }
  }
}

────────────────────────────────────────────────────────────────────────────────
IMAGE
────────────────────────────────────────────────────────────────────────────────
{
  "type": "image",
  "props": {
    "imagePrompt": "Professional photo description",  // Use for AI-generated images (hero, products, avatars)
    "src": "/placeholder.svg",                        // OR use for explicit URLs/placeholders
    "alt": "Image description",                       // REQUIRED - accessibility
    "objectFit": "cover",                             // "cover" | "contain" | "fill" | "none"
    "width": "100%",
    "height": "300px",
    "borderRadius": { "topLeft": "12", "topRight": "12", "bottomRight": "12", "bottomLeft": "12", "unit": "px" }
  }
}

IMAGE RULES:
- Hero images, product photos, avatars, portfolios: Use "imagePrompt" (system converts to Unsplash URL)
- Icons, placeholders, logos: Use "src" with actual URL
- ALWAYS include "alt" for accessibility

────────────────────────────────────────────────────────────────────────────────
ICON (Standalone)
────────────────────────────────────────────────────────────────────────────────
{
  "type": "icon",
  "props": {
    "iconName": "Star",                        // REQUIRED - Lucide icon name (NOT "icon")
    "iconVariant": "Bold",                     // "Linear" | "Outline" | "Bold" | "Bulk" | "Broken" | "TwoTone"
    "size": "md",                              // "xs" | "sm" | "md" | "lg" | "xl" OR number
    "color": "#3b82f6",                        // hex color
    "typography": { "fontSize": "24" }         // Alternative sizing via fontSize
  }
}

⚠️ ICON vs BUTTON ICON:
- Standalone icon element: Use "iconName" → { "type": "icon", "props": { "iconName": "Star" } }
- Button with icon: Use "icon" → { "type": "button", "props": { "text": "Save", "icon": "Check" } }

────────────────────────────────────────────────────────────────────────────────
BADGE
────────────────────────────────────────────────────────────────────────────────
{
  "type": "badge",
  "props": {
    "text": "New",                             // REQUIRED - badge text (NOT "content" or "label")
    "variant": "default",                      // "default" | "secondary" | "destructive" | "outline"
    "size": "default"                          // "sm" | "default" | "lg"
  }
}

────────────────────────────────────────────────────────────────────────────────
AVATAR
────────────────────────────────────────────────────────────────────────────────
{
  "type": "avatar",
  "props": {
    "src": "https://...",                      // Image URL
    "fallback": "JD",                          // Fallback initials (2 chars)
    "size": "default"                          // "sm" | "default" | "lg" | "xl"
  }
}

────────────────────────────────────────────────────────────────────────────────
PROGRESS
────────────────────────────────────────────────────────────────────────────────
{
  "type": "progress",
  "props": {
    "value": 75,                               // 0-100
    "max": 100,
    "showValue": true,
    "animated": false
  }
}

────────────────────────────────────────────────────────────────────────────────
SEPARATOR
────────────────────────────────────────────────────────────────────────────────
{
  "type": "separator",
  "props": {
    "lineStyle": "solid"                       // "solid" | "dotted" | "dashed"
  }
}

────────────────────────────────────────────────────────────────────────────────
SPACER
────────────────────────────────────────────────────────────────────────────────
{
  "type": "spacer",
  "props": {
    "height": "48px"                           // Vertical space
  }
}

────────────────────────────────────────────────────────────────────────────────
CAROUSEL
────────────────────────────────────────────────────────────────────────────────
{
  "type": "carousel",
  "props": {
    "slidesToShow": 3,                         // Number of visible slides
    "autoplay": false,
    "autoplaySpeed": 3000,
    "showArrows": true,
    "showDots": true,
    "loop": true,
    "gap": 16
  },
  "children": [
    { "type": "carousel-slide", "children": [...] },
    { "type": "carousel-slide", "children": [...] }
  ]
}

────────────────────────────────────────────────────────────────────────────────
ACCORDION
────────────────────────────────────────────────────────────────────────────────
{
  "type": "accordion",
  "props": {
    "type": "single",                          // "single" | "multiple"
    "collapsible": true,
    "defaultValue": "item-1"
  },
  "children": [
    {
      "type": "accordion-item",
      "props": { "value": "item-1" },
      "children": [
        { "type": "accordion-header", "props": { "content": "Question text?" } },
        { "type": "accordion-content", "children": [{ "type": "text", "props": { "content": "Answer text" } }] }
      ]
    }
  ]
}

────────────────────────────────────────────────────────────────────────────────
TABS
────────────────────────────────────────────────────────────────────────────────
{
  "type": "tabs",
  "props": {
    "defaultValue": "tab-1"
  },
  "children": [
    {
      "type": "div",
      "props": { "display": "flex", "gap": "8" },
      "children": [
        { "type": "tab-trigger", "props": { "value": "tab-1", "content": "Tab 1" } },
        { "type": "tab-trigger", "props": { "value": "tab-2", "content": "Tab 2" } }
      ]
    },
    { "type": "tab-content", "props": { "value": "tab-1" }, "children": [...] },
    { "type": "tab-content", "props": { "value": "tab-2" }, "children": [...] }
  ]
}

────────────────────────────────────────────────────────────────────────────────
ALERT
────────────────────────────────────────────────────────────────────────────────
{
  "type": "alert",
  "props": {
    "title": "Alert Title",
    "description": "Alert message content",
    "variant": "default"                       // "default" | "destructive"
  }
}

────────────────────────────────────────────────────────────────────────────────
SWITCH
────────────────────────────────────────────────────────────────────────────────
{
  "type": "switch",
  "props": {
    "label": "Enable notifications",
    "checked": false,
    "disabled": false,
    "size": "default"                          // "sm" | "default" | "lg"
  }
}

────────────────────────────────────────────────────────────────────────────────
SLIDER
────────────────────────────────────────────────────────────────────────────────
{
  "type": "slider",
  "props": {
    "min": 0,
    "max": 100,
    "step": 1,
    "defaultValue": 50,
    "disabled": false,
    "showValue": true
  }
}

────────────────────────────────────────────────────────────────────────────────
INPUT
────────────────────────────────────────────────────────────────────────────────
{
  "type": "input",
  "props": {
    "label": "Email Address",                  // Optional label above input
    "placeholder": "Enter your email",
    "inputType": "email",                      // "text" | "email" | "password" | "number" | "tel" | "url"
    "defaultValue": "",
    "required": false,
    "disabled": false
  }
}

────────────────────────────────────────────────────────────────────────────────
TEXTAREA
────────────────────────────────────────────────────────────────────────────────
{
  "type": "textarea",
  "props": {
    "label": "Message",
    "placeholder": "Enter your message",
    "rows": 4,
    "defaultValue": "",
    "required": false,
    "disabled": false
  }
}

────────────────────────────────────────────────────────────────────────────────
SELECT
────────────────────────────────────────────────────────────────────────────────
{
  "type": "select",
  "props": {
    "label": "Country",
    "placeholder": "Select a country",
    "options": [
      { "label": "United States", "value": "us" },
      { "label": "United Kingdom", "value": "uk" }
    ],
    "defaultValue": "",
    "required": false,
    "disabled": false
  }
}

────────────────────────────────────────────────────────────────────────────────
CHECKBOX
────────────────────────────────────────────────────────────────────────────────
{
  "type": "checkbox",
  "props": {
    "label": "I agree to the terms",
    "checked": false,
    "disabled": false,
    "required": false
  }
}

────────────────────────────────────────────────────────────────────────────────
FORM-WRAPPER
────────────────────────────────────────────────────────────────────────────────
{
  "type": "form-wrapper",
  "props": {
    "submitButtonText": "Submit",
    "showSuccessMessage": true,
    "successMessage": "Form submitted successfully!"
  },
  "children": [
    { "type": "input", "props": { "label": "Name", "placeholder": "Your name" } },
    { "type": "input", "props": { "label": "Email", "inputType": "email", "placeholder": "your@email.com" } },
    { "type": "textarea", "props": { "label": "Message", "rows": 4 } }
  ]
}

────────────────────────────────────────────────────────────────────────────────
LINK
────────────────────────────────────────────────────────────────────────────────
{
  "type": "link",
  "props": {
    "content": "Click here",                   // REQUIRED - link text
    "href": "/page",                           // URL or path
    "target": "_self",                         // "_self" | "_blank"
    "typography": {
      "fontSize": "14",
      "fontWeight": "500",
      "color": "hsl(var(--primary))"
    }
  }
}

────────────────────────────────────────────────────────────────────────────────
BLOCKQUOTE
────────────────────────────────────────────────────────────────────────────────
{
  "type": "blockquote",
  "props": {
    "content": "Quote text here",              // REQUIRED - quote text
    "author": "Author Name",                   // Optional attribution
    "typography": {
      "fontSize": "18",
      "fontStyle": "italic",
      "color": "hsl(var(--muted-foreground))"
    }
  }
}
`;

// CRITICAL: Professional styling system with gradients and glass-morphism
const STYLE_SYSTEM = `
═══════════════════════════════════════════════════════════════════════════════
CRITICAL: COMPONENT PROPS FORMAT - USE EXACTLY AS SHOWN
═══════════════════════════════════════════════════════════════════════════════

The App Builder uses SPECIFIC property formats. You MUST output components in this EXACT structure.
DO NOT nest styles in a "style" object. Put all properties in "props" using the formats below.

COMPONENT STRUCTURE:
{
  "id": "semantic-id-name",
  "type": "section",
  "props": {
    // === LAYOUT (FLAT on props - NOT nested in layout object) ===
    "display": "flex",
    "flexDirection": "column",
    "justifyContent": "center",
    "alignItems": "center",
    "gap": "24",
    "gridTemplateColumns": "repeat(3, 1fr)",
    
    // === SPACING (spacingControl object with STRING values) ===
    "spacingControl": {
      "padding": { "top": "80", "right": "24", "bottom": "80", "left": "24", "unit": "px" },
      "margin": { "top": "0", "right": "auto", "bottom": "0", "left": "auto", "unit": "px" }
    },
    
    // === SIZING (FLAT on props) ===
    "width": "100%",
    "height": "auto",
    "maxWidth": "1200px",
    "minHeight": "70vh",
    
    // === TYPOGRAPHY (typography object - fontSize is STRING without px) ===
    "typography": {
      "fontFamily": "Inter, sans-serif",
      "fontSize": "48",
      "fontWeight": "700",
      "lineHeight": "1.1",
      "textAlign": "center",
      "letterSpacing": "-0.02",
      "color": "hsl(var(--foreground))"
    },
    
    // === BACKGROUND (backgroundColor object) ===
    "backgroundColor": { "type": "solid", "value": "#1a1a2e", "opacity": 100 },
    // OR for gradients:
    "backgroundGradient": "linear-gradient(135deg, #0d9488 0%, #3b82f6 100%)",
    "backgroundLayerOrder": ["gradient", "fill"],
    
    // === BORDER (border object - width is STRING) ===
    "border": {
      "width": "1",
      "style": "solid",
      "color": "hsl(var(--border))",
      "unit": "px",
      "sides": { "top": true, "right": true, "bottom": true, "left": true }
    },
    "borderRadius": {
      "topLeft": "16", "topRight": "16", "bottomRight": "16", "bottomLeft": "16", "unit": "px"
    },
    
    // === BOX SHADOW (array of shadow objects) ===
    "boxShadows": [
      { "enabled": true, "type": "outer", "x": 0, "y": 4, "blur": 24, "spread": -4, "color": "rgba(0,0,0,0.1)" }
    ],
    
    // === RESPONSIVE (tabletStyles, mobileStyles) ===
    "tabletStyles": {
      "typography": { "fontSize": "36" },
      "spacingControl": { "padding": { "top": "48", "right": "16", "bottom": "48", "left": "16", "unit": "px" } }
    },
    "mobileStyles": {
      "typography": { "fontSize": "28" },
      "gridTemplateColumns": "1fr"
    },
    
    // === CLASS ASSIGNMENT ===
    "appliedClasses": ["hero-section"]
  },
  "children": []
}

═══════════════════════════════════════════════════════════════════════════════
PROPERTY FORMAT RULES (CRITICAL - FOLLOW EXACTLY):
═══════════════════════════════════════════════════════════════════════════════

SPACING (spacingControl):
✓ CORRECT: { "spacingControl": { "padding": { "top": "80", "right": "24", "bottom": "80", "left": "24", "unit": "px" } } }
✗ WRONG: { "spacing": { "padding": { "top": 80, "right": 24 } } } - missing unit, wrong type, wrong property name
✗ WRONG: { "padding": "80px" } - not in spacingControl format

TYPOGRAPHY:
✓ CORRECT: { "typography": { "fontSize": "48", "fontWeight": "700", "lineHeight": "1.1", "color": "hsl(var(--foreground))" } }
✗ WRONG: { "typography": { "fontSize": "48px" } } - should NOT include 'px' in fontSize
✗ WRONG: { "fontSize": 48, "fontWeight": 700 } - values must be STRINGS

LAYOUT:
✓ CORRECT: { "display": "flex", "flexDirection": "column", "gap": "24" }
✗ WRONG: { "layout": { "display": "flex" } } - should NOT be nested in layout object

SIZING:
✓ CORRECT: { "width": "100%", "maxWidth": "1200px", "minHeight": "70vh" }
✗ WRONG: { "sizing": { "width": "100%" } } - should NOT be nested in sizing object

BACKGROUND:
✓ CORRECT: { "backgroundColor": { "type": "solid", "value": "#1a1a2e", "opacity": 100 } }
✓ CORRECT: { "backgroundGradient": "linear-gradient(135deg, #0d9488 0%, #3b82f6 100%)" }
✗ WRONG: { "background": { "color": "#1a1a2e" } } - wrong structure

BORDER:
✓ CORRECT: { "border": { "width": "1", "style": "solid", "color": "hsl(var(--border))", "unit": "px", "sides": {...} } }
✓ CORRECT: { "borderRadius": { "topLeft": "16", "topRight": "16", "bottomRight": "16", "bottomLeft": "16", "unit": "px" } }
✗ WRONG: { "border": { "radius": 16 } } - radius should be separate borderRadius object

BOX SHADOW:
✓ CORRECT: { "boxShadows": [{ "enabled": true, "type": "outer", "x": 0, "y": 4, "blur": 24, "spread": -4, "color": "rgba(0,0,0,0.1)" }] }
✗ WRONG: { "shadow": { "x": 0, "y": 4, "blur": 24 } } - wrong property name, wrong structure

SEMANTIC COLOR TOKENS (ALWAYS USE - NEVER HARDCODE):
- "hsl(var(--background))" - Page background
- "hsl(var(--foreground))" - Primary text color
- "hsl(var(--card))" - Card background
- "hsl(var(--primary))" - Brand/accent color
- "hsl(var(--primary-foreground))" - Text on primary background
- "hsl(var(--muted))" - Subtle backgrounds
- "hsl(var(--muted-foreground))" - Secondary text
- "hsl(var(--border))" - Border color

═══════════════════════════════════════════════════════════════════════════════
⚠️ FORBIDDEN PATTERNS - NEVER USE THESE (WILL CAUSE RENDERING FAILURES):
═══════════════════════════════════════════════════════════════════════════════

These patterns are EXPLICITLY BANNED. The AI MUST NOT use them:

❌ WRONG: "style": { "layout": {...}, "sizing": {...} }
✓ RIGHT: Put ALL properties flat in "props" - no "style" object!

❌ WRONG: "spacing": { "padding": 24 }
✓ RIGHT: "spacingControl": { "padding": { "top": "24", "right": "24", "bottom": "24", "left": "24", "unit": "px" } }

❌ WRONG: "sizing": { "width": "100%" }
✓ RIGHT: "width": "100%" (flat on props)

❌ WRONG: "layout": { "display": "flex" }
✓ RIGHT: "display": "flex" (flat on props)

❌ WRONG: "typography": { "fontSize": "48px" }
✓ RIGHT: "typography": { "fontSize": "48" } (no px suffix - system adds it)

❌ WRONG: "border": { "radius": 16 }
✓ RIGHT: "borderRadius": { "topLeft": "16", "topRight": "16", "bottomRight": "16", "bottomLeft": "16", "unit": "px" }

❌ WRONG: Numbers in spacing: { "top": 120 }
✓ RIGHT: Strings in spacing: { "top": "120" }

❌ WRONG: "background": { "color": "#000" }
✓ RIGHT: "backgroundColor": { "type": "solid", "value": "#000", "opacity": 100 }

❌ WRONG: Button with "content" prop for label
✓ RIGHT: Button with "text" prop for label

===============================================================================
RESPONSIVE BREAKPOINTS - CRITICAL FOR MOBILE-FRIENDLY DESIGN:
===============================================================================

BREAKPOINTS:
- Desktop: 1024px and above (default styles)
- Tablet: 768px to 1023px
- Mobile: below 768px

RESPONSIVE OVERRIDES STRUCTURE (use tabletStyles and mobileStyles in props):
{
  "props": {
    "display": "grid",
    "gridTemplateColumns": "repeat(3, 1fr)",
    "tabletStyles": {
      "gridTemplateColumns": "repeat(2, 1fr)"
    },
    "mobileStyles": {
      "display": "flex",
      "flexDirection": "column",
      "gridTemplateColumns": "1fr"
    }
  }
}

NAVIGATION BAR RESPONSIVE (HAMBURGER MENU):
For navigation bars, add mobileStyles to show hamburger on mobile:
{
  "id": "nav-links",
  "type": "div",
  "props": {
    "display": "flex",
    "flexDirection": "row",
    "gap": "24",
    "mobileStyles": {
      "display": "none"
    }
  }
}

{
  "id": "hamburger-menu",
  "type": "button",
  "props": {
    "text": "",
    "iconName": "Menu",
    "variant": "ghost",
    "display": "none",
    "mobileStyles": {
      "display": "flex"
    }
  }
}

GRID RESPONSIVE PATTERNS (use tabletStyles and mobileStyles):

4-Column Grid → 2-Column → 1-Column:
{
  "props": {
    "gridTemplateColumns": "repeat(4, 1fr)",
    "tabletStyles": { "gridTemplateColumns": "repeat(2, 1fr)" },
    "mobileStyles": { "gridTemplateColumns": "1fr" }
  }
}

3-Column Grid → 2-Column → 1-Column:
{
  "props": {
    "gridTemplateColumns": "repeat(3, 1fr)",
    "tabletStyles": { "gridTemplateColumns": "repeat(2, 1fr)" },
    "mobileStyles": { "gridTemplateColumns": "1fr" }
  }
}

Split-Screen → Stacked:
{
  "props": {
    "gridTemplateColumns": "1fr 1fr",
    "tabletStyles": { "gridTemplateColumns": "1fr" },
    "mobileStyles": { "gridTemplateColumns": "1fr" }
  }
}

═══════════════════════════════════════════════════
GRID CONTAINER SIZING (NON-NEGOTIABLE):
═══════════════════════════════════════════════════

ALL grid containers (products, testimonials, features, cards) MUST have:
1. width: "100%" - Grid must fill its parent container
2. maxWidth: "1200px" - Prevents grids from stretching too wide on large screens  
3. margin: "0 auto" - Centers the grid horizontally

Grid children (cards) MUST have:
- width: "100%" - Fill their grid cell
- minWidth: "200px" - Prevents cramped/tiny cards

CORRECT Grid Container Example (ALL props flat - NO style object):
{
  "id": "products-grid",
  "type": "div",
  "props": {
    "display": "grid",
    "gridTemplateColumns": "repeat(3, 1fr)",
    "gap": "32",
    "width": "100%",
    "maxWidth": "1400px",
    "spacingControl": { "margin": { "top": "0", "right": "auto", "bottom": "0", "left": "auto", "unit": "px" } },
    "tabletStyles": { "gridTemplateColumns": "repeat(2, 1fr)" },
    "mobileStyles": { "gridTemplateColumns": "1fr" }
  },
  "children": [
    {
      "id": "product-card-1",
      "type": "div", 
      "props": { "width": "100%", "minWidth": "200px" },
      "children": [...]
    }
  ]
}

WRONG (will cause squished layouts - NEVER DO THIS):
{
  "id": "products-grid",
  "type": "div",
  "style": {  // ❌ WRONG - should be "props"
    "layout": { "display": "grid" },  // ❌ WRONG - "display" should be flat
    "gridTemplateColumns": "repeat(3, 1fr)"
    // ❌ MISSING width, maxWidth, margin!
  }
}

TYPOGRAPHY RESPONSIVE (fontSize is STRING without px):
{
  "typography": { "fontSize": "48", "fontWeight": "700", "lineHeight": "1.1" },
  "tabletStyles": { "typography": { "fontSize": "36" } },
  "mobileStyles": { "typography": { "fontSize": "28" } }
}

SPACING RESPONSIVE (use spacingControl with STRING values):
{
  "spacingControl": { "padding": { "top": "120", "right": "64", "bottom": "120", "left": "64", "unit": "px" } },
  "tabletStyles": { "spacingControl": { "padding": { "top": "80", "right": "32", "bottom": "80", "left": "32", "unit": "px" } } },
  "mobileStyles": { "spacingControl": { "padding": { "top": "48", "right": "16", "bottom": "48", "left": "16", "unit": "px" } } }
}

SEMANTIC COLOR TOKENS (ALWAYS USE THESE - NEVER HARDCODE COLORS except for gradients):
- "hsl(var(--background))" - Page background
- "hsl(var(--foreground))" - Primary text color
- "hsl(var(--card))" - Card/elevated surface background
- "hsl(var(--card-foreground))" - Card text color
- "hsl(var(--primary))" - Brand/accent color (buttons, highlights)
- "hsl(var(--primary-foreground))" - Text on primary background
- "hsl(var(--secondary))" - Secondary surfaces
- "hsl(var(--muted))" - Subtle backgrounds
- "hsl(var(--muted-foreground))" - Subtle/secondary text
- "hsl(var(--accent))" - Accent surfaces
- "hsl(var(--border))" - Border color
- "hsl(var(--destructive))" - Error/danger color

═══════════════════════════════════════════════════
GRADIENT PRESETS (USE FOR HERO SECTIONS, SPLIT LAYOUTS):
═══════════════════════════════════════════════════

Teal-Blue Professional (Healthcare, Finance, SaaS):
"gradient": "linear-gradient(135deg, #0d9488 0%, #06b6d4 50%, #3b82f6 100%)"

Purple-Pink Modern (Creative, Marketing, Lifestyle):
"gradient": "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)"

Dark Gradient Sleek (Tech, Dark Mode, Premium):
"gradient": "linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e293b 100%)"

Sunset Warm (E-commerce, Food, Entertainment):
"gradient": "linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%)"

Ocean Blue (Corporate, Business, Professional):
"gradient": "linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #6366f1 100%)"

Emerald Fresh (Health, Wellness, Nature):
"gradient": "linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #06b6d4 100%)"

═══════════════════════════════════════════════════
GLASS-MORPHISM EFFECTS (CORRECT FORMAT - all in props):
═══════════════════════════════════════════════════

Glass Card on Gradient:
{
  "props": {
    "backgroundColor": { "type": "solid", "value": "rgba(255,255,255,0.1)", "opacity": 100 },
    "backdropFilter": "blur(12px)",
    "border": { "width": "1", "style": "solid", "color": "rgba(255,255,255,0.2)", "unit": "px", "sides": { "top": true, "right": true, "bottom": true, "left": true } },
    "borderRadius": { "topLeft": "16", "topRight": "16", "bottomRight": "16", "bottomLeft": "16", "unit": "px" }
  }
}

Dark Glass Effect:
{
  "props": {
    "backgroundColor": { "type": "solid", "value": "rgba(0,0,0,0.2)", "opacity": 100 },
    "backdropFilter": "blur(8px)",
    "border": { "width": "1", "style": "solid", "color": "rgba(255,255,255,0.1)", "unit": "px", "sides": { "top": true, "right": true, "bottom": true, "left": true } },
    "borderRadius": { "topLeft": "12", "topRight": "12", "bottomRight": "12", "bottomLeft": "12", "unit": "px" }
  }
}


═══════════════════════════════════════════════════
INTELLIGENT SECTION SIZING - CONTEXT-AWARE HEIGHT DECISIONS
═══════════════════════════════════════════════════

CRITICAL: Do NOT always use minHeight: "90vh" on sections. Choose sizing based on content type and user request.

WHEN TO USE minHeight: "70vh" (portfolio/landing hero):
- User explicitly requests a "full-screen hero", "landing page", or "portfolio"
- Marketing landing pages designed to capture attention above the fold
- When user says "make it big", "fill the screen", or "dramatic"
- NOTE: Use 70vh, NOT 90vh, to reduce empty space and leave room for scrolling

WHEN TO USE height: "auto" (content-driven sizing):
- Simple interactive apps (counters, calculators, todo lists, forms)
- Multi-section pages where content naturally stacks
- Dashboard layouts with multiple data widgets
- Settings pages or configuration panels
- Any page with 6+ sections (reduce hero, use auto for rest)
- When user requests a "compact" or "minimal" layout
- Admin panels, data entry forms, utility apps

SIZING DECISION MATRIX:

| Page Type                | Hero Section         | Other Sections    |
|--------------------------|----------------------|-------------------|
| Portfolio/Personal Site  | minHeight: "70vh"    | height: "auto"    |
| Landing Page (marketing) | minHeight: "70vh"    | height: "auto"    |
| Login/Auth Page          | minHeight: "100vh"   | N/A (single)      |
| Dashboard                | height: "auto"       | height: "auto"    |
| Simple App (counter)     | height: "auto"       | height: "auto"    |
| Form/Data Entry          | height: "auto"       | height: "auto"    |
| Settings Page            | height: "auto"       | height: "auto"    |
| Multi-section (6+)       | minHeight: "65vh"    | height: "auto"    |

SECTION COUNT RULES:
- 1-2 sections → Compact layout, center content, height: "auto"
- 3-5 sections → Hero can be 70vh, rest MUST be height: "auto"
- 6+ sections → Hero at 65vh max, ALL others strictly height: "auto"

HERO SECTION STYLING RULES:
- ALWAYS use justifyContent: "center" to vertically center content
- Use padding: 80px top/bottom (NOT 120px)
- minHeight: "70vh" for most cases (NOT 90vh)
- Hero content wrapper (hero-content) MUST have alignItems: "center" for horizontal centering
- ALL hero text elements MUST have textAlign: "center"
- CTA button rows MUST be centered within hero content

SOCIAL ICON BUTTON RULES (CRITICAL):
- Social icon buttons (github, linkedin, twitter, dribbble, instagram, youtube) MUST use brandIcon property
- Social icon buttons MUST NOT have "content" or "text" properties - icon only!
- Example: { "id": "social-github", "type": "button", "props": { "brandIcon": "github", "variant": "ghost" } }
- NEVER add text content like "GitHub" or "Build" to social icon buttons
- Social buttons should use variant: "ghost" or "outline"
- Social icon buttons should be grouped in a flex row with gap: 12-16

BUTTON ICON RULES (CRITICAL):
- Lucide icons on buttons: Use "icon" property (NOT "iconName")
  ✓ CORRECT: { "type": "button", "props": { "text": "", "icon": "Menu" } }
  ✗ WRONG: { "type": "button", "props": { "iconName": "Menu" } }
  
- Social brand icons on buttons: Use "brandIcon" property
  ✓ CORRECT: { "type": "button", "props": { "brandIcon": "github" } }
  Available brandIcons: google, apple, github, microsoft, facebook, twitter, x, linkedin, instagram, youtube, dribbble, behance, discord
  
- Icon element (standalone): Use "iconName" property
  ✓ CORRECT: { "type": "icon", "props": { "iconName": "Star" } }
  
SUMMARY:
- Button + Lucide icon → "icon" prop
- Button + Social brand → "brandIcon" prop  
- Icon element → "iconName" prop
- Common Lucide icons: "Menu", "X", "ArrowRight", "ChevronDown", "Search", "ExternalLink", "Mail", "Phone"

NAVIGATION CTA BUTTON VISIBILITY RULES:
- Nav CTA buttons like "Hire Me" or "Contact" MUST have visible styling
- On light backgrounds: use variant: "default" (solid primary color)
- On dark backgrounds: use variant: "outline" with textColor: "rgba(255,255,255,0.95)"
- NEVER use variant: "ghost" for important CTA buttons - too invisible

HERO CONTENT CENTERING RULES (CRITICAL):
- hero-content wrapper MUST use: alignItems: "center", textAlign: "center"
- ALL children inside hero-content should inherit centering
- CTA button row (hero-cta-row) should use: display: flex, flexDirection: row, gap: 16
- Social links row should use: display: flex, flexDirection: row, gap: 12

MANDATORY COMPONENT IDs FOR VALIDATION (CRITICAL - MUST USE THESE EXACT NAMES):
- Hero content wrapper: "hero-content" (not hero-wrapper, hero-inner, hero-text)
- CTA button row: "cta-row" or "hero-cta-row" (not button-group, actions-row)
- Social links row: "social-links" (not social-icons, social-row)
- Navigation container: "nav-container" (not nav-inner, navbar-wrapper)
- Navigation links: "nav-links" (not menu-items, nav-items)
- Project cards: "project-card-1", "project-card-2", etc.
Using these EXACT IDs ensures client-side validation rules apply correctly for centering, spacing, and layout.

PROJECT CARD CRITICAL RULES (PREVENT TEXT/IMAGE OVERLAP):
- Image container MUST be a separate child from text container
- NEVER position text content on top of images using position: absolute
- Use flexDirection: "column" so image stacks ABOVE text content
- Image container: { sizing: { height: "200px", width: "100%" }, flexShrink: 0 }
- Text container: { spacing: { padding: 16 }, flexDirection: "column" }
- Card wrapper should have overflow: "hidden" and border radius
- Example structure:
  {
    "id": "project-card-1",
    "type": "div",
    "style": { "layout": { "display": "flex", "flexDirection": "column" }, "overflow": "hidden", "border": { "radius": 12 } },
    "children": [
      { "id": "project-1-image", "type": "image", "props": { "src": "..." }, "style": { "sizing": { "height": "200px", "width": "100%" } } },
      { "id": "project-1-content", "type": "div", "style": { "spacing": { "padding": 16 } }, "children": [...] }
    ]
  }

CRITICAL JSON OUTPUT RULES:
- Your response must be PURE JSON only
- Do NOT include JavaScript comments (// or /* */) - they are INVALID in JSON and will cause parsing errors
- Do NOT add explanatory text before or after the JSON
- Start your response with { and end with }

COMPACT APP PATTERN (for simple apps like counters, calculators):
{
  "id": "app-container",
  "type": "section",
  "style": {
    "layout": { "display": "flex", "justifyContent": "center", "alignItems": "center" },
    "sizing": { "width": "100%", "minHeight": "100vh" },
    "spacing": { "padding": 24 }
  },
  "children": [
    {
      "type": "div",
      "style": {
        "sizing": { "width": "100%", "maxWidth": "400px" },
        "spacing": { "padding": 32 },
        "background": { "color": "hsl(var(--card))" },
        "border": { "radius": 16 }
      }
    }
  ]
}

CONTENT SECTIONS (About, Skills, Projects, Testimonials, CTA, Footer):
ALWAYS USE height: "auto" with generous padding for breathing room:
{
  "style": {
    "sizing": { "width": "100%", "height": "auto" },
    "spacing": { "padding": { "top": 80, "right": 24, "bottom": 80, "left": 24 } }
  }
}

NEVER use minHeight: "100vh" on content sections!
Use padding (80-120px vertical) to create visual spacing, NOT viewport heights.

PREVENT SECTION OVERLAP:
- NEVER use position: "absolute" on sections
- NEVER use negative margins that cause overlap
- NEVER use minHeight: "100vh" on multiple sections
- ALWAYS let content determine section height (except hero when appropriate)

═══════════════════════════════════════════════════
CRITICAL SECTION GENERATION RULES - PREVENT OVERLAP AND DUPLICATES
═══════════════════════════════════════════════════

1. SECTION ORDER ENFORCEMENT:
   - All sections MUST be generated as siblings (same level in component tree)
   - NEVER nest sections inside other sections
   - Order: nav-section → hero-section → content-sections → cta-section → footer-section

2. UNIQUE SECTION IDS:
   - EVERY section MUST have a unique ID
   - Use pattern: "nav-section", "hero-section", "about-section", "skills-section", "projects-section", "cta-section", "footer-section"
   - NEVER duplicate section IDs

3. NO DUPLICATE NAVBARS OR FOOTERS:
   - Generate EXACTLY ONE navigation bar at the top (if needed)
   - Generate EXACTLY ONE footer at the bottom (if needed)
   - NEVER add additional nav or footer elements

4. SECTION POSITION RULES:
   - NEVER use position: "absolute" on sections
   - NEVER use position: "fixed" on sections
   - ALWAYS let sections stack in normal document flow
   - Only nav-horizontal can use position: "sticky" if needed

5. HEIGHT DISTRIBUTION:
    - Hero section: minHeight "70vh" MAX for portfolios/landing pages
    - All other sections: height "auto" with vertical padding (80-100px)
    - NEVER give multiple sections viewport-based heights
    - ALWAYS add justifyContent: "center" to hero sections for vertical centering

6. SECTION TEMPLATE FOR NON-HERO SECTIONS:
   Always use this pattern for content sections (about, skills, projects, etc.):
   {
     "id": "about-section",
     "type": "section",
     "props": {
       "display": "flex",
       "flexDirection": "column",
       "alignItems": "center",
       "gap": "32",
       "width": "100%",
       "height": "auto",
       "spacingControl": { "padding": { "top": "80", "right": "24", "bottom": "80", "left": "24", "unit": "px" } },
       "backgroundColor": { "type": "solid", "value": "hsl(var(--background))", "opacity": 100 }
     }
   }
`;

// CLASS SYSTEM - Reusable style classes
const CLASS_SYSTEM = `
CLASS SYSTEM - CREATE REUSABLE STYLES:

Classes are reusable style definitions that can be applied to multiple components.
When creating components, ALWAYS define classes for consistent styling.

═══════════════════════════════════════════════════
CLASS REUSE RULES (CRITICAL FOR CLEAN CSS):
═══════════════════════════════════════════════════

RULE 1: REUSE CLASSES when elements share the same visual style
- If multiple text elements have same font size, weight, and color → USE SAME CLASS
- Cards with similar styling CAN share classes, but varied styling is encouraged for visual interest
- CSS classes enable reusability - use them for common patterns while allowing creative variation

RULE 2: Create SEMANTIC class names based on ROLE, not position
- "section-title" for all section titles with same style (not "hero-title", "about-title", etc.)
- "feature-card" for all feature cards with same style (not "feature-card-1", "feature-card-2")
- "body-text" for body paragraphs with same style
- "primary-button" for all primary action buttons

RULE 3: ID and Class are DIFFERENT concepts
- ID = unique identifier for the element (e.g., "feature-card-1", "feature-card-2")
- Class = reusable style (e.g., "feature-card" shared by all feature cards)
- CORRECT: id="feature-card-1", appliedClasses=["feature-card"]
- CORRECT: id="feature-card-2", appliedClasses=["feature-card"]

RULE 4: Create SHARED classes for repeated patterns
- All section titles → "section-title" class
- All card containers → "card-base" or "feature-card" class  
- All body text → "body-text" class
- All buttons of same type → "primary-button" or "secondary-button" class
- All avatars → "avatar" class

RULE 5: Only create UNIQUE class when style is truly different
- "hero-headline" = unique because hero titles are typically larger
- "cta-section" = unique because CTA sections have special backgrounds
- But testimonial cards in the same section → ALL use "testimonial-card"

═══════════════════════════════════════════════════
SHARED CLASS NAMING CONVENTION:
═══════════════════════════════════════════════════

TYPOGRAPHY CLASSES (share across similar elements):
- "section-title" - for all section headings (h2 level)
- "section-subtitle" - for all section descriptions  
- "card-title" - for all card headings
- "card-text" - for all card descriptions
- "body-text" - for general body paragraphs
- "small-text" - for captions, labels
- "hero-headline" - unique for main hero title (usually larger)

CONTAINER CLASSES (share across similar containers):
- "feature-card" - for all feature/benefit cards
- "testimonial-card" - for all testimonial cards
- "pricing-card" - for all pricing cards
- "team-card" - for all team member cards
- "project-card" - for all project/portfolio cards
- "section-container" - for section wrappers with consistent padding
- "card-grid" - for grid containers holding cards

BUTTON CLASSES (share by type):
- "primary-button" - main action buttons
- "secondary-button" - secondary actions
- "ghost-button" - subtle/transparent buttons
- "nav-link" - navigation links

═══════════════════════════════════════════════════
MANDATORY CLASS APPLICATION - EVERY COMPONENT MUST HAVE appliedClasses:
═══════════════════════════════════════════════════

CRITICAL: Every component MUST have appliedClasses with a REUSABLE class name:
{
  "id": "hero-headline",
  "type": "heading",
  "props": {
    "content": "Welcome",
    "appliedClasses": ["hero-headline"]  // Unique - hero is special
  },
  "style": { ... }
}

{
  "id": "feature-card-1",
  "type": "container",
  "props": {
    "appliedClasses": ["feature-card"]  // SHARED - all feature cards use this
  },
  "children": [
    {
      "id": "feature-1-title",
      "type": "heading",
      "props": {
        "content": "Fast Performance",
        "appliedClasses": ["card-title"]  // SHARED - all card titles use this
      }
    }
  ]
}

{
  "id": "feature-card-2",
  "type": "container", 
  "props": {
    "appliedClasses": ["feature-card"]  // SAME CLASS as feature-card-1!
  }
}

CLASS DEFINITION (for creating shared reusable classes):
{
  "type": "class",
  "data": {
    "name": "feature-card",
    "styles": {
      "layout": { "display": "flex", "flexDirection": "column", "gap": 16 },
      "spacing": { "padding": 24 },
      "background": { "color": "hsl(var(--card))" },
      "border": { "width": 1, "style": "solid", "color": "hsl(var(--border))", "radius": 12 },
      "shadow": { "x": 0, "y": 4, "blur": 16, "spread": 0, "color": "rgba(0,0,0,0.08)" }
    },
    "reusable": true  // This class is designed to be shared!
  }
}

EXAMPLE: 4 FEATURE CARDS SHARING ONE CLASS:
// First, define the shared class ONCE:
{
  "type": "class",
  "data": {
    "name": "feature-card",
    "styles": { /* full card styles */ }
  }
}

// Then all 4 cards reference the SAME class:
{
  "id": "feature-card-1",
  "props": { "appliedClasses": ["feature-card"] }
}
{
  "id": "feature-card-2", 
  "props": { "appliedClasses": ["feature-card"] }  // REUSES feature-card!
}
{
  "id": "feature-card-3",
  "props": { "appliedClasses": ["feature-card"] }  // REUSES feature-card!
}
{
  "id": "feature-card-4",
  "props": { "appliedClasses": ["feature-card"] }  // REUSES feature-card!
}

EXAMPLE: TYPOGRAPHY REUSE ACROSS SECTIONS:
// Define shared typography classes:
{
  "type": "class",
  "data": {
    "name": "section-title",
    "styles": {
      "typography": { "fontSize": 36, "fontWeight": "700", "lineHeight": "1.2" }
    }
  }
}

// Then ALL section titles use it:
{ "id": "features-title", "appliedClasses": ["section-title"] }
{ "id": "testimonials-title", "appliedClasses": ["section-title"] }  // REUSES!
{ "id": "pricing-title", "appliedClasses": ["section-title"] }       // REUSES!
{ "id": "faq-title", "appliedClasses": ["section-title"] }           // REUSES!

PRIMARY vs SECONDARY CLASSES:
- First class in appliedClasses array = PRIMARY (base styles)
- Additional classes = SECONDARY (override specific properties)
- Example: ["card-primary", "card-highlighted"] - primary is locked, secondary overrides

REUSABLE CLASS NAMING (REQUIRED):
- Containers: "section-dark", "section-light", "section-gradient" (by background type)
- Typography: "heading-xl", "heading-lg", "heading-md", "body-lg", "body-base", "body-sm"
- Cards: "card", "card-elevated", "card-bordered" (shared - NOT "feature-card-1")
- Buttons: "btn-primary", "btn-secondary", "btn-ghost"
- Layout: "flex-center", "flex-row-wrap", "container-narrow", "container-wide"

⚠️ MAXIMUM 15-20 CLASSES PER PAGE - REUSE AGGRESSIVELY!

❌ WRONG CLASS NAMES (never create these):
- "hero-title", "about-title", "features-title" → Use "heading-lg" for ALL
- "feature-card-1", "feature-card-2", "feature-card-3" → Use "card" for ALL
- "hero-text", "about-text", "cta-text" → Use "body-base" for ALL
- "feature-1-title", "testimonial-2-name" → Use "heading-md" for ALL

✓ CORRECT CLASS NAMES (use these semantic names):
Typography by SIZE:
- "heading-xl" = 48-72px titles (hero headlines)
- "heading-lg" = 32-40px titles (ALL section titles)
- "heading-md" = 24-28px titles (ALL card titles)
- "heading-sm" = 18-20px titles (subtitles)
- "body-lg" = 18-20px body text
- "body-base" = 16px body text (ALL descriptions)
- "body-sm" = 14px captions
- "label" = 12-14px labels/badges

Cards by STYLE:
- "card" = base card (white bg, padding, radius)
- "card-elevated" = card with shadow
- "card-hover" = card with hover effect

Buttons by PURPOSE:
- "btn-primary" = main CTA (solid color)
- "btn-secondary" = secondary (outlined)
- "btn-ghost" = transparent

Layout containers:
- "section" = standard section padding
- "container" = max-width container
- "flex-center" = centered flex
- "flex-row" = horizontal flex with wrap
`;

// COMPLETE VARIABLE SYSTEM
const COMPLETE_VARIABLE_SYSTEM = `
VARIABLE SYSTEM - FULL CAPABILITIES:

VARIABLE DEFINITION:
{
  "type": "variable",
  "data": {
    "name": "variableName",           // camelCase, unique per scope
    "scope": "app" | "page",          // app = global, page = current page only
    "dataType": "string" | "number" | "boolean" | "array" | "object",
    "initialValue": <value>,          // Must match dataType
    "description": "What this variable does",
    "preserveOnNavigation": true,     // Keep value when navigating (app scope only)
    "persistToStorage": false         // Save to localStorage (page scope only)
  }
}

VARIABLE BINDING SYNTAX:
- App variable: "{{app.userName}}"
- Page variable: "{{page.searchQuery}}"
- Data context: "{{data.fieldName}}"
- Environment: "{{env.API_KEY}}"
- URL parameter: "{{param.id}}"

USING VARIABLES IN COMPONENTS:
{
  "type": "text",
  "props": {
    "content": "Hello, {{app.userName}}!"
  }
}

{
  "type": "text",
  "props": {
    "content": "Items in cart: {{app.cartCount}}"
  }
}

VISIBILITY CONDITIONS (show/hide based on variables):
{
  "type": "div",
  "props": {
    "visibility": {
      "variableBinding": "{{app.isLoggedIn}}",
      "operator": "equals",
      "value": true
    }
  }
}

Visibility operators: "equals", "notEquals", "greaterThan", "lessThan", "contains", "isEmpty", "isNotEmpty"

EXAMPLE VARIABLE PATTERNS:

Counter Variable:
{ "name": "count", "scope": "page", "dataType": "number", "initialValue": 0, "description": "Tracks button clicks" }

Toggle Variable:
{ "name": "isModalOpen", "scope": "page", "dataType": "boolean", "initialValue": false, "description": "Controls modal visibility" }

Form Input Variable:
{ "name": "email", "scope": "page", "dataType": "string", "initialValue": "", "description": "Email input value" }

List Variable:
{ "name": "todoItems", "scope": "app", "dataType": "array", "initialValue": [], "description": "List of todo items" }

User State Variable:
{ "name": "currentUser", "scope": "app", "dataType": "object", "initialValue": null, "description": "Current logged in user", "preserveOnNavigation": true }
`;

// COMPLETE ACTION FLOW SYSTEM
const COMPLETE_ACTION_SYSTEM = `
ACTION FLOW SYSTEM - ALL AVAILABLE ACTIONS:

ACTION FLOW STRUCTURE:
{
  "type": "flow",
  "data": {
    "componentId": "button-1",
    "trigger": "onClick" | "onSubmit" | "onChange" | "onMount" | "onHover",
    "actions": [
      { "type": "action-type", "config": { ... } }
    ]
  }
}

AVAILABLE TRIGGERS:
- onClick: Button clicks, link clicks, any clickable element
- onSubmit: Form submissions
- onChange: Input value changes
- onMount: Component first renders
- onHover: Mouse enter/leave

ALL ACTION TYPES:

═══════════════════════════════════════════════════
1. VARIABLE ACTIONS:
═══════════════════════════════════════════════════

set-variable (set value):
{ "type": "set-variable", "config": { "scope": "app", "variableName": "count", "value": 5 } }

increment (add to number):
{ "type": "set-variable", "config": { "scope": "app", "variableName": "count", "operation": "increment", "amount": 1 } }

decrement (subtract from number):
{ "type": "set-variable", "config": { "scope": "app", "variableName": "count", "operation": "decrement", "amount": 1 } }

toggle (flip boolean):
{ "type": "set-variable", "config": { "scope": "app", "variableName": "isOpen", "operation": "toggle" } }

append (add to array):
{ "type": "set-variable", "config": { "scope": "app", "variableName": "items", "operation": "append", "value": "new item" } }

═══════════════════════════════════════════════════
2. NAVIGATION ACTIONS:
═══════════════════════════════════════════════════

navigate (internal page):
{ "type": "navigate", "config": { "url": "/dashboard" } }

navigateToPage (by page id):
{ "type": "navigateToPage", "config": { "pageId": "page-id-here" } }

openUrl (external link):
{ "type": "openUrl", "config": { "url": "https://example.com", "target": "_blank" } }

redirect:
{ "type": "redirect", "config": { "url": "/login" } }

═══════════════════════════════════════════════════
3. UI ACTIONS:
═══════════════════════════════════════════════════

showAlert (toast notification):
{ "type": "showAlert", "config": { "message": "Success!", "type": "success" } }
Types: "success" | "error" | "warning" | "info"

openModal:
{ "type": "openModal", "config": { "modalId": "modal-1" } }

closeModal:
{ "type": "closeModal", "config": { "modalId": "modal-1" } }

showComponent:
{ "type": "showComponent", "config": { "componentId": "comp-1" } }

hideComponent:
{ "type": "hideComponent", "config": { "componentId": "comp-1" } }

═══════════════════════════════════════════════════
4. DATA ACTIONS:
═══════════════════════════════════════════════════

apiCall:
{ "type": "apiCall", "config": { 
    "url": "https://api.example.com/data",
    "method": "GET" | "POST" | "PUT" | "DELETE",
    "headers": { "Authorization": "Bearer {{app.token}}" },
    "body": { "email": "{{page.email}}" },
    "storeResultIn": "app.apiResponse"
} }

insertRecord:
{ "type": "insertRecord", "config": { "table": "users", "data": { "name": "{{page.name}}" } } }

updateRecord:
{ "type": "updateRecord", "config": { "table": "users", "id": "{{data.id}}", "data": { "name": "{{page.name}}" } } }

deleteRecord:
{ "type": "deleteRecord", "config": { "table": "users", "id": "{{data.id}}" } }

═══════════════════════════════════════════════════
5. FLOW CONTROL:
═══════════════════════════════════════════════════

delay (wait):
{ "type": "delay", "config": { "duration": 1000 } }

condition (if/else):
{ "type": "condition", "config": { 
    "variable": "{{app.count}}",
    "operator": "greaterThan" | "lessThan" | "equals" | "notEquals",
    "value": 10
} }

═══════════════════════════════════════════════════
6. FORM ACTIONS:
═══════════════════════════════════════════════════

submitForm:
{ "type": "submitForm", "config": { "formId": "contact-form" } }

resetForm:
{ "type": "resetForm", "config": { "formId": "contact-form" } }

═══════════════════════════════════════════════════
7. AUTH ACTIONS:
═══════════════════════════════════════════════════

login:
{ "type": "login", "config": { "email": "{{page.email}}", "password": "{{page.password}}" } }

logout:
{ "type": "logout", "config": {} }

signup:
{ "type": "signup", "config": { "email": "{{page.email}}", "password": "{{page.password}}" } }
`;

// PROFESSIONAL PAGE TEMPLATES - REMOVED (was injecting 1,600 lines of template JSON)
// Replaced by getCreativeSeed() which gives directional guidance without prescribing exact structures
const PROFESSIONAL_PAGE_TEMPLATES = ``
// MANDATORY_TEMPLATE_COMPLIANCE - REMOVED (was injecting 48 lines of redundant rules)
const MANDATORY_TEMPLATE_COMPLIANCE = ``;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION CREATIVITY RULES - MANDATORY FOR UNIQUE DESIGNS
// ═══════════════════════════════════════════════════════════════════════════════
const SECTION_CREATIVITY_RULES = `
═══════════════════════════════════════════════════════════════════════════════
🎨 SECTION CREATIVITY RULES (MANDATORY - READ CAREFULLY)
═══════════════════════════════════════════════════════════════════════════════

1. NEVER GENERATE THE SAME LAYOUT TWICE
   - Each generation must feel UNIQUE and FRESH
   - Vary section layouts, item counts, and arrangements

2. READ THE USER'S PROMPT FOR CONTEXT CLUES:
   | Prompt Contains     | Layout Approach                              |
   |---------------------|----------------------------------------------|
   | "minimalist"        | Fewer items (3-4), more whitespace           |
   | "busy" / "full"     | More items (6-8), fill available space       |
   | "modern"            | Bento/asymmetric layouts, creative           |
   | "classic"           | Traditional grid layouts, balanced           |
   | "showcase"          | Featured hero + smaller items                |
   | "catalog"           | Compact items, more quantity                 |

3. FILL AVAILABLE SPACE:
   - If 4 items leave gaps → USE 5-6 ITEMS
   - If 3 features look sparse → USE 4-5 FEATURES
   - NEVER leave obvious empty space on right side of grids
   - Use flexWrap with appropriate flexBasis for automatic filling

4. VARY LAYOUTS BETWEEN SECTIONS:
   - If features use icon grid → testimonials use carousel or single quote
   - Alternate between centered and asymmetric layouts
   - Mix card sizes within applicable sections

5. CARD COUNT GUIDELINES (FLEXIBLE - ADAPT TO LAYOUT):
   | Section Type    | Min | Max | Notes                              |
   |-----------------|-----|-----|-------------------------------------|
   | Features        | 3   | 6   | 3-6 cards, adapt to layout style    |
   | Products        | 3   | 6   | 3-6 cards, use flexWrap for flow    |
   | Testimonials    | 1   | 4   | 1 large quote OR 3-4 small cards    |
   | Team Members    | 3   | 6   | 3-6 members based on context        |
   | Pricing Plans   | 2   | 3   | 2-3 tiers only                      |
   
   Cards use flexBasis or grid for responsive layouts.
   Vary counts between generations for visual freshness.

6. GAP VALUES - ALWAYS INCLUDE UNITS:
   - CORRECT: gap: "32px"
   - WRONG: gap: "32" (missing unit!)
   - ALL gap values must include "px" suffix
`;

// COMPLETE_SECTION_TEMPLATES - REMOVED (was injecting 162 lines of JSON examples)
const COMPLETE_SECTION_TEMPLATES = ``;

// ═══════════════════════════════════════════════════════════════════════════════
// MODERN DESIGN INSPIRATION - Creative Patterns for Unique Designs
// ═══════════════════════════════════════════════════════════════════════════════
const MODERN_DESIGN_INSPIRATION = `
═══════════════════════════════════════════════════════════════════════════════
🎨 MODERN DESIGN INSPIRATION - CREATIVE PATTERNS FOR UNIQUE DESIGNS
═══════════════════════════════════════════════════════════════════════════════

Use these patterns for VARIETY - mix and match to create unique designs!

PATTERN 1: DARK FEATURE CARDS WITH LETTER BADGES (Enterprise/SaaS)
───────────────────────────────────────────────────────────────────
- Dark card backgrounds (#1a1a1a, #2d2d2d, #1e1e1e)
- Single letter badges in colored circles (C, D, E, T, A, S)
- Light text on dark cards
- Subtle rounded corners (12-16px)
- Minimal shadows, rely on color contrast
- Great for: Tech platforms, frameworks, enterprise tools

PATTERN 2: SPLIT HERO WITH INTERACTIVE ELEMENT
───────────────────────────────────────────────────────────────────
- Left side: Badge, headline, description, CTAs
- Right side: Interactive card/form/product preview (NOT just an image)
- Progress bars, radio buttons, or mini-UI elements
- Creates depth and engagement
- Great for: SaaS, tools, dashboards

PATTERN 3: TRUST BAR WITH DOT INDICATORS
───────────────────────────────────────────────────────────────────
- Horizontal row of trust items
- Small colored dot + uppercase text
- Subtle background or no background
- Items like: "DATA-BACKED INSIGHTS", "ROLE-AWARE SCORING", "SOC2 SECURE"
- Use letter-spacing: 0.05em for uppercase text

PATTERN 4: MINIMAL OUTLINED BADGES
───────────────────────────────────────────────────────────────────
- Thin border (1px) instead of filled background
- Uppercase text with letter-spacing
- Subtle, sophisticated look
Example props:
{ "border": { "width": "1", "style": "solid", "color": "#333" }, "backgroundColor": "transparent" }

PATTERN 5: GRADIENT ACCENT LINES
───────────────────────────────────────────────────────────────────
- Thin gradient bar under hero text
- Orange/coral accents on dark backgrounds
- Progress indicators with gradient fills
- Subtle glow effects behind important elements

PATTERN 6: GLASS CARDS ON CREAM BACKGROUNDS
───────────────────────────────────────────────────────────────────
- Soft cream/beige section backgrounds (#faf8f5, #f5f3f0)
- White cards with subtle shadows
- Clean, luxury aesthetic
- Great for: Fashion, wellness, premium products

PATTERN 7: NUMBERED SECTIONS WITH LARGE TYPOGRAPHY
───────────────────────────────────────────────────────────────────
- Large semi-transparent numbers (01, 02, 03)
- Step-by-step or "how it works" sections
- Numbers at fontSize: 64-96px with opacity: 0.1-0.2
- Content positioned beside or overlapping numbers

PATTERN 8: BENTO GRID LAYOUTS
───────────────────────────────────────────────────────────────────
- Mixed card sizes using gridColumn/gridRow span
- One large card spanning 2 columns + smaller cards
- Creates visual interest and hierarchy
- Great for: Features, portfolios, dashboards

═══════════════════════════════════════════════════════════════════════════════
DESIGN VARIETY CHECKLIST (Mix these in each generation):
═══════════════════════════════════════════════════════════════════════════════
□ Try dark cards on light backgrounds (or vice versa)
□ Use letter badges instead of icons sometimes
□ Create asymmetric layouts occasionally
□ Use minimal/outlined styles vs filled styles
□ Vary between 2-column, 3-column, and bento grids
□ Include interactive elements in heroes (not just images)
□ Mix sharp (border-radius: 0) and rounded (12-24px) styles
□ Use gradient accents strategically
□ Try glass-morphism on gradient backgrounds
□ Experiment with large typography for impact
`;

// COMPONENT HIERARCHY RULES
const COMPONENT_HIERARCHY_RULES = `
═══════════════════════════════════════════════════════════════════════════════
COMPONENT HIERARCHY RULES - ALWAYS FOLLOW FOR PROFESSIONAL DESIGN
═══════════════════════════════════════════════════════════════════════════════

CRITICAL: NEVER place raw components directly on page. ALWAYS use proper hierarchy.

1. PAGE-LEVEL LAYOUTS:
   - AUTH PAGES (login, signup): USE SPLIT-SCREEN LAYOUT
     * Left panel: Gradient background + hero content + trust badges + stats cards
     * Right panel: Form card with social login buttons
   - Landing pages: Multiple sections with alternating backgrounds, hero with gradient
   - Dashboards: Container with stat cards grid + content area
   - Forms: Card with shadow, proper padding, labels above inputs

2. SPLIT-SCREEN PATTERN (FOR AUTH, CONTACT, SIGNUP):
   - Use section with display "grid", gridTemplateColumns "1fr 1fr", minHeight "100vh"
   - Left child: hero-panel with backgroundGradient
   - Right child: form-panel with backgroundColor from DESIGN DIRECTION surface color
   - Responsive: mobileStyles { gridTemplateColumns "1fr" }

3. TRUST ELEMENTS (INCLUDE IN AUTH/LANDING PAGES):
   - Trust badge row at top (e.g., "✓ Secure", "✓ Encrypted", "✓ HIPAA compliant")
   - Stats cards (e.g., "4.8/5 rating", "2M+ users", "SOC 2 certified")
   - Feature pills (e.g., "🔒 Encrypted data", "📱 Mobile app")
   - Social proof logos

4. FORM STRUCTURE:
   - NEVER place raw inputs directly on page
   - ALWAYS: form-wrapper → field-group (div) → label + input
   - Add "Forgot password?" link for login forms
   - Include social login section with divider ("OR CONTINUE WITH")
   - Add "Create account" / "Sign in" link at bottom

5. CARD COMPONENTS:
   - ALWAYS include: background, border, borderRadius, padding, shadow
   - Use larger border-radius: 16-24px for modern look
   - Deep shadows: { y: 12-16, blur: 40-48, spread: -10 to -12 }

6. GRADIENT BACKGROUNDS:
   - Use on hero panels, not on form panels
   - Pair with white/light text
   - Include glass-morphism cards on gradient backgrounds

═══════════════════════════════════════════════════════════════════════════════
BRAND ICONS - SOCIAL MEDIA & COMPANIES:
═══════════════════════════════════════════════════════════════════════════════

For social media icons, use BUTTONS with brandIcon prop (NOT the icon component):

GitHub: { "type": "button", "props": { "brandIcon": "github", "variant": "ghost", "width": "44px", "height": "44px" } }
LinkedIn: { "type": "button", "props": { "brandIcon": "linkedin", "variant": "ghost", "width": "44px", "height": "44px" } }
Twitter: { "type": "button", "props": { "brandIcon": "twitter", "variant": "ghost", "width": "44px", "height": "44px" } }

Available brandIcon values: github, google, apple, facebook, twitter, linkedin, instagram, youtube, dribbble, figma

SOCIAL LINKS ROW: Use a div with display "flex", flexDirection "row", gap "12", containing brandIcon buttons.

CRITICAL: Social icon buttons MUST NOT have "content" or "text" props - the brandIcon is the ONLY content!

═══════════════════════════════════════════════════════════════════════════════
AI IMAGE GENERATION:
═══════════════════════════════════════════════════════════════════════════════

You can generate AI images by creating image components with an imagePrompt prop.
The system will automatically generate the image using AI.

SYNTAX: Use flat props — { "type": "image", "props": { "imagePrompt": "...", "alt": "...", "width": "200px", "height": "200px", "borderRadius": {...}, "objectFit": "cover" } }

IMAGE PROMPT BEST PRACTICES:
- Be descriptive: "A modern abstract background with blue and purple gradients"
- Specify style: "Minimalist illustration of a laptop, flat design, soft colors"
- Include context: "Professional team meeting in modern office, diverse group"
- Add quality markers: "high quality, 4K, professional photography"

Use imagePrompt for: hero backgrounds, team avatars, project thumbnails, product showcases.
Use gradient backgrounds instead for: simple decorative backgrounds, solid color blocks.

WHEN TO USE AI IMAGES:
- Portfolio hero sections (abstract backgrounds)
- Team/about sections (placeholder avatars)
- Project cards (mockup thumbnails)
- Testimonial sections (avatar placeholders)
- Product showcases (product mockups)

WHEN NOT TO USE (use gradient backgrounds instead):
- Simple decorative backgrounds (use CSS gradients)
- Solid color blocks
- When fast loading is critical
`;

// DESIGN_PATTERNS - REMOVED (was injecting 605 lines of JSON template examples)
const DESIGN_PATTERNS = ``;

// INDUSTRY_DESIGN_RECIPES - REMOVED (replaced with lean industry context hint in getCreativeSeed)
const INDUSTRY_DESIGN_RECIPES = `
INDUSTRY CONTEXT: Match your design aesthetic to the user's industry.
For luxury/fashion: elegant typography, refined spacing, editorial layouts.
For tech/SaaS: gradients, glass effects, bold headlines.
For healthcare: calm colors, trustworthy feel, clean layout.
For food: warm, rich photography-driven design.
The AI model already knows these conventions — use your training.
`;

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATION SYSTEM - Mandatory animations per component type
// ═══════════════════════════════════════════════════════════════════════════════
const ANIMATION_SYSTEM = `
═══════════════════════════════════════════════════════════════════════════════
🎬 COMPONENT ANIMATION SYSTEM - MANDATORY FOR ALL INTERACTIVE ELEMENTS
═══════════════════════════════════════════════════════════════════════════════

CRITICAL: Every interactive element MUST include transitions and stateStyles.
Animations should feel natural, performant (CSS transforms), and enhance UX.

═══════════════════════════════════════════════════
BUTTONS - MANDATORY ANIMATIONS:
═══════════════════════════════════════════════════
EVERY button MUST include:
- transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
- stateStyles.hover: { transform: "translateY(-2px)", shadow: { y: 6, blur: 16, spread: -4, color: "rgba(0,0,0,0.15)" } }
- stateStyles.pressed: { transform: "scale(0.98)" }
- stateStyles.focused: { border: { width: 2, color: "hsl(var(--primary))" }, shadow: { x: 0, y: 0, blur: 0, spread: 2, color: "hsl(var(--primary) / 0.3)" } }

Button Animation Variants (randomly select one):
1. LIFT: translateY(-2px) + enhanced shadow on hover
2. GLOW: subtle glow effect using shadow with accent color
3. SCALE: scale(1.02) on hover, scale(0.98) on press

═══════════════════════════════════════════════════
CARDS/CONTAINERS - MANDATORY HOVER LIFT:
═══════════════════════════════════════════════════
All clickable cards and interactive containers MUST include:
- transition: "transform 0.3s ease, box-shadow 0.3s ease"
- stateStyles.hover: { transform: "translateY(-4px)" OR "translateY(-8px)", shadow: { y: 12, blur: 32, spread: -8, color: "rgba(0,0,0,0.12)" } }

Card Animation Variants:
1. SUBTLE LIFT: translateY(-2px) + shadow increase
2. STANDARD LIFT: translateY(-4px) + shadow increase
3. DRAMATIC LIFT: translateY(-8px) + large shadow expansion
4. SCALE: scale(1.02) + shadow increase

═══════════════════════════════════════════════════
IMAGES - MANDATORY ZOOM EFFECT (in containers):
═══════════════════════════════════════════════════
Image containers MUST include:
- Container: overflow: "hidden", borderRadius: defined
- Image: transition: "transform 0.4s ease"
- stateStyles.hover: { transform: "scale(1.05)" }

CRITICAL: The scale effect should be on the image, not the container.
The container's overflow: hidden clips the scaled image.

═══════════════════════════════════════════════════
LINKS/NAV ITEMS - UNDERLINE/COLOR ANIMATION:
═══════════════════════════════════════════════════
All links and navigation items MUST include:
- transition: "color 0.2s ease, opacity 0.2s ease"
- stateStyles.hover: { typography: { color: "hsl(var(--primary))" } } OR opacity change

Link Animation Variants:
1. COLOR SHIFT: Change to primary color on hover
2. OPACITY: Reduce opacity to 0.7 on hover
3. UNDERLINE: Add textDecoration on hover (for nav items)

═══════════════════════════════════════════════════
ICONS - SUBTLE TRANSFORM:
═══════════════════════════════════════════════════
Interactive icons MUST include:
- transition: "transform 0.2s ease, color 0.2s ease"
- stateStyles.hover: { transform: "scale(1.1)" } OR { color change }

Icon Animation Variants:
1. SCALE: scale(1.1) on hover
2. ROTATE: rotate(15deg) on hover (for arrows, chevrons)
3. COLOR: Shift to accent color on hover

═══════════════════════════════════════════════════
FORM INPUTS - FOCUS STATES (CRITICAL):
═══════════════════════════════════════════════════
ALL form inputs MUST include:
- transition: "border-color 0.2s ease, box-shadow 0.2s ease"
- stateStyles.focused: { 
    border: { color: "hsl(var(--primary))" }, 
    shadow: { x: 0, y: 0, blur: 0, spread: 3, color: "hsl(var(--primary) / 0.2)" } 
  }

Input Focus Variants:
1. RING: Focus ring around input (spread shadow)
2. GLOW: Subtle glow using blur shadow
3. BORDER-ONLY: Just border color change (minimal)

═══════════════════════════════════════════════════
BADGES - CONDITIONAL ANIMATION:
═══════════════════════════════════════════════════
Static badges: No animation needed
Interactive/clickable badges:
- transition: "opacity 0.15s ease, transform 0.15s ease"
- stateStyles.hover: { opacity: 0.8 } OR { transform: "scale(1.05)" }

═══════════════════════════════════════════════════
PERFORMANCE RULES:
═══════════════════════════════════════════════════
- ALWAYS use CSS transforms (translateY, scale, rotate) - GPU accelerated
- NEVER animate width, height, margin, padding (causes layout reflow)
- Keep transition durations short: 0.15-0.4s
- Use cubic-bezier(0.4, 0, 0.2, 1) for natural motion
- Use ease for simple transitions
`;

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN VARIETY ENFORCEMENT - Prevent repetitive designs
// ═══════════════════════════════════════════════════════════════════════════════
const VARIETY_ENFORCEMENT = `
═══════════════════════════════════════════════════════════════════════════════
🎨 DESIGN VARIETY ENFORCEMENT - CRITICAL FOR UNIQUE GENERATIONS
═══════════════════════════════════════════════════════════════════════════════

CRITICAL: Every design must feel UNIQUE and NON-PREDICTABLE.
Use the design seed to deterministically vary visual choices.

═══════════════════════════════════════════════════
SEED-BASED RANDOMIZATION (Use Design Seed):
═══════════════════════════════════════════════════

Use the provided design seed for deterministic variety:

HERO LAYOUT (Seed % 6):
0 = Split-Left (content left, image right)
1 = Split-Right (image left, content right)
2 = Centered (stacked, center-aligned)
3 = Bento Grid (asymmetric boxes)
4 = Full-Bleed Image (overlaid content)
5 = Editorial (40/60 asymmetric split)

COLOR SCHEME (Seed % 8):
0 = Electric Teal (#0d9488, #06b6d4)
1 = Royal Purple (#8b5cf6, #a855f7)
2 = Warm Orange (#f97316, #fb923c)
3 = Ocean Blue (#3b82f6, #6366f1)
4 = Fresh Green (#10b981, #22c55e)
5 = Coral Pink (#f472b6, #ec4899)
6 = Rich Gold (#d97706, #eab308)
7 = Monochrome (#18181b, #71717a)

CARD STYLE (Seed % 6):
0 = Glass (backdrop blur, translucent)
1 = Elevated (solid with deep shadow)
2 = Gradient Border (gradient outline)
3 = Minimal (thin border, no shadow)
4 = Neon Glow (accent-colored glow)
5 = Neumorphic (inset + outset shadows)

BUTTON STYLE (Seed % 5):
0 = Solid Fill (standard solid color)
1 = Outline (border only, transparent bg)
2 = Gradient Fill (gradient background)
3 = Pill (border-radius: 9999px)
4 = Sharp (border-radius: 0)

SECTION RHYTHM (Seed % 4):
0 = Compact-Dramatic (tight content, tall hero)
1 = Even (consistent 80px padding)
2 = Asymmetric (varying 60-120px padding)
3 = Editorial (extra breathing room, 120px+)

═══════════════════════════════════════════════════
FORBIDDEN REPETITION PATTERNS:
═══════════════════════════════════════════════════

NEVER in the same generation:
- Same card style for ALL cards (mix at least 2 styles)
- Same button variant for ALL buttons (use primary + secondary)
- Same section background treatment (alternate: gradient → light → muted → gradient)
- Same heading size throughout (use 48px → 32px → 24px hierarchy)
- Same spacing pattern for all sections (vary padding)
- Same border-radius on all elements (mix: 8, 12, 16, 24, 9999)

═══════════════════════════════════════════════════
MANDATORY VARIETY CHECKLIST (Must have 3+ variations):
═══════════════════════════════════════════════════

[ ] At least 2 different card styles (e.g., glass + elevated)
[ ] Primary AND Secondary button variants used
[ ] 3+ different section backgrounds (gradient, solid, muted, pattern)
[ ] Typography scale variation (XL headlines → SM captions)
[ ] Mixed layout patterns (centered, split, grid, bento)
[ ] Different icon treatments (colored bg vs inline vs outlined)
[ ] Varied spacing rhythm across sections

═══════════════════════════════════════════════════
UNIQUE ELEMENT STRATEGIES:
═══════════════════════════════════════════════════

1. DECORATIVE ACCENTS (add visual interest):
   - Floating gradient orbs (position: absolute, blur filter)
   - Accent lines/dividers with gradient
   - Geometric shapes as backgrounds
   - Subtle pattern overlays

2. TYPOGRAPHY VARIETY:
   - Mix weights: 300 (light labels) + 600 (body) + 800 (headlines)
   - Letter-spacing: 0.05em on uppercase, -0.02em on large headlines
   - Line-height variety: 1.1 (headlines) → 1.6 (body) → 1.75 (relaxed)

3. SHADOW VARIETY:
   - Subtle: { y: 4, blur: 12, color: "rgba(0,0,0,0.05)" }
   - Standard: { y: 8, blur: 24, color: "rgba(0,0,0,0.1)" }
   - Dramatic: { y: 16, blur: 48, color: "rgba(0,0,0,0.15)" }
   - Colored: Use accent color in shadow for glow effects

4. BORDER-RADIUS SCALE:
   - Sharp: 0 (editorial/luxury)
   - Subtle: 4-8px (corporate/minimal)
   - Rounded: 12-16px (modern/friendly)
   - Soft: 20-24px (organic/approachable)
   - Pill: 9999px (playful/buttons)
`;

// ═══════════════════════════════════════════════════════════════════════════════
// MODERN WEB STANDARDS - CSS Grid, Responsive-First, Accessibility
// ═══════════════════════════════════════════════════════════════════════════════
const MODERN_STANDARDS = `
═══════════════════════════════════════════════════════════════════════════════
🌐 MODERN WEB STANDARDS (2024+) - MANDATORY IMPLEMENTATION
═══════════════════════════════════════════════════════════════════════════════

CRITICAL: All generated designs must follow modern CSS and web standards.

═══════════════════════════════════════════════════
LAYOUT SYSTEM - CSS GRID & FLEXBOX:
═══════════════════════════════════════════════════

USE CSS GRID FOR:
- Product grids (2D layouts)
- Feature sections (multiple rows and columns)
- Gallery/portfolio grids
- Bento-style layouts
- Dashboard widgets

GRID PATTERNS (MANDATORY):
\`\`\`json
{
  "layout": { "display": "grid" },
  "gridTemplateColumns": "repeat(auto-fit, minmax(280px, 1fr))",
  "gap": 24
}
\`\`\`

USE FLEXBOX FOR:
- Navigation bars (1D horizontal)
- Button groups
- Card content stacks
- Form layouts
- Icon + text pairs

SPACING (MANDATORY):
- ALWAYS use "gap" property (NOT margins between flex/grid children)
- Gap values: 8, 12, 16, 24, 32, 48, 64
- NEVER use margin-right/margin-bottom for item spacing in flex/grid

SECTION SPACING (MANDATORY):
- All content sections MUST have 80-100px vertical padding
- Container max-width: 1200px with mx-auto centering
- Grid gap: 24-32px between items
- Navigation: 16-20px vertical padding

VISUAL DEPTH FOR CARDS (MANDATORY):
- ALL cards MUST have visible box-shadow (min opacity 0.12-0.15)
- Shadow example: { "y": 12, "blur": 32, "spread": -6, "color": "rgba(0,0,0,0.15)" }
- ALL cards MUST have border OR strong shadow for visual definition
- Border example: { "width": "1", "style": "solid", "color": "hsl(var(--border))" }
- Hover states MUST increase shadow depth significantly (translateY + deeper shadow)

═══════════════════════════════════════════════════
RESPONSIVE-FIRST RULES - ALWAYS INCLUDE:
═══════════════════════════════════════════════════

EVERY component with layout MUST have responsiveOverrides:

GRID RESPONSIVE PATTERNS:
\`\`\`json
{
  "gridTemplateColumns": "repeat(4, 1fr)",
  "responsiveOverrides": {
    "tablet": { "gridTemplateColumns": "repeat(2, 1fr)" },
    "mobile": { "gridTemplateColumns": "1fr" }
  }
}
\`\`\`

TYPOGRAPHY SCALING:
- Headlines: 48px → 36px (tablet) → 28px (mobile)
- Subheadings: 24px → 20px → 18px
- Body: 16px → 15px → 14px

PADDING SCALING:
- Desktop: 80-120px vertical, 64px horizontal
- Tablet: 60-80px vertical, 32px horizontal
- Mobile: 40-60px vertical, 16-24px horizontal

HERO RESPONSIVE:
- Desktop: Split or bento layout
- Tablet: Stacked with reduced heights
- Mobile: Fully stacked, reduced padding, smaller typography

═══════════════════════════════════════════════════
VISUAL EFFECTS - USE APPROPRIATELY:
═══════════════════════════════════════════════════

BACKDROP BLUR (Glassmorphism):
- Only on dark/gradient backgrounds
- backdropFilter: "blur(12px)" or "blur(16px)"
- Pair with rgba background for translucency

BOX SHADOWS (Multi-layer for depth):
\`\`\`json
{
  "shadow": { 
    "x": 0, 
    "y": 8, 
    "blur": 24, 
    "spread": -6, 
    "color": "rgba(0,0,0,0.1)" 
  }
}
\`\`\`

BORDER-RADIUS (Consistent scale):
- Use 8, 12, 16, or 24 consistently within a design
- Sharp (0) for editorial/luxury
- Pill (9999) for buttons/badges

OPACITY (For layering):
- Text on images: use 0.8-0.95 for readability
- Overlays: 0.3-0.6 for subtle darkening
- Disabled states: 0.5

═══════════════════════════════════════════════════
ACCESSIBILITY BASELINE - MANDATORY:
═══════════════════════════════════════════════════

FOCUS STATES (CRITICAL):
- Every interactive element MUST have stateStyles.focused
- Use visible focus ring or border change
- NEVER remove focus indicators

COLOR CONTRAST:
- Text on backgrounds: Minimum 4.5:1 ratio
- Large text (24px+): Minimum 3:1 ratio
- White text on gradients: Ensure readability across gradient

SEMANTIC HTML:
- Use proper heading hierarchy: H1 once per page, H2 for sections
- Form labels: Every input MUST have a label
- Button content: Every button MUST have text or aria-label

TOUCH TARGETS:
- Minimum 44x44px for buttons on mobile
- Adequate spacing between clickable elements
`;

// ═══════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY REQUIREMENTS - WCAG AA Compliance (NON-NEGOTIABLE)
// ═══════════════════════════════════════════════════════════════════════════════
const ACCESSIBILITY_REQUIREMENTS = `
═══════════════════════════════════════════════════════════════════════════════
♿ ACCESSIBILITY REQUIREMENTS (NON-NEGOTIABLE - WCAG AA COMPLIANCE)
═══════════════════════════════════════════════════════════════════════════════

CRITICAL: Every generated design MUST be accessible. These rules are MANDATORY.

═══════════════════════════════════════════════════
SEMANTIC HTML STRUCTURE:
═══════════════════════════════════════════════════

MANDATORY ELEMENT TYPES:
- Navigation bars: type: "nav-horizontal" (renders as <nav>)
- Sections: type: "section" (renders as <section>)
- Headings: type: "heading" with proper tag (h1-h6)
- Buttons: type: "button" (NEVER use div for clickable actions)
- Links: type: "link" for navigation (NEVER use text with onClick). Always set "underline": "none" in props.
- Forms: type: "form-wrapper" (renders as <form>)

HEADING HIERARCHY (CRITICAL):
- ONE h1 per page (typically hero headline)
- h2 for each major section
- h3 for subsection headings
- NEVER skip heading levels (h1 → h3 is WRONG)

═══════════════════════════════════════════════════
IMAGES - MANDATORY ALT TEXT:
═══════════════════════════════════════════════════

EVERY image component MUST include alt prop:
{
  "type": "image",
  "props": {
    "imagePrompt": "professional team meeting in modern office",
    "alt": "Team collaborating on project in bright office space",
    "width": "100%",
    "height": "400px"
  }
}

ALT TEXT RULES:
- Describe what the image shows, not "image of..."
- For decorative images: alt: "" (empty string)
- For icons with text labels: alt: "" (text provides context)
- For functional icons (buttons): Descriptive alt (e.g., "Close menu")

═══════════════════════════════════════════════════
COLOR CONTRAST - WCAG AA (4.5:1 MINIMUM):
═══════════════════════════════════════════════════

BODY TEXT (under 24px): 4.5:1 contrast ratio minimum
LARGE TEXT (24px+ or 18px bold): 3:1 contrast ratio minimum

SAFE COMBINATIONS (ALWAYS VALID):
- White (#ffffff) on Dark (#0f172a, #1e293b, #18181b) ✓
- Dark (#0f172a) on White (#ffffff, #fafafa) ✓
- Dark (#1e293b) on Light (#f1f5f9, #e2e8f0) ✓

DANGEROUS COMBINATIONS (CHECK CAREFULLY):
- Gray text on gray backgrounds ⚠️
- Light text on gradients (ensure darkest part has contrast) ⚠️
- Pastel text on any background ⚠️

ENFORCEMENT:
- Text on gradients: Use white or ensure background has solid overlay
- Mid-gray text (#64748b) requires white/light backgrounds
- Never use opacity < 0.7 for important text

═══════════════════════════════════════════════════
FOCUS STATES (KEYBOARD NAVIGATION):
═══════════════════════════════════════════════════

EVERY interactive element MUST have stateStyles.focused:

BUTTONS:
"stateStyles": {
  "focused": {
    "outline": "2px solid hsl(var(--primary))",
    "outlineOffset": "2px",
    "boxShadow": "0 0 0 3px hsl(var(--primary) / 0.3)"
  }
}

INPUTS:
"stateStyles": {
  "focused": {
    "borderColor": "hsl(var(--primary))",
    "boxShadow": "0 0 0 3px hsl(var(--primary) / 0.2)"
  }
}

FOCUS RULES:
- NEVER remove focus outlines (outline: none is FORBIDDEN without replacement)
- Focus indicator must be visible on ALL backgrounds
- Focus ring should use brand/primary color with 0.3 opacity spread

═══════════════════════════════════════════════════
TOUCH TARGETS (MOBILE ACCESSIBILITY):
═══════════════════════════════════════════════════

MINIMUM SIZES:
- Buttons: 44px height minimum (48px preferred)
- Clickable cards: Adequate padding (16px+ all sides)
- Form inputs: 44px height minimum
- Icon buttons: 44x44px minimum touch target

SPACING BETWEEN TARGETS:
- Adjacent buttons: 8px minimum gap
- Prevent accidental taps with adequate spacing

═══════════════════════════════════════════════════
FORM ACCESSIBILITY:
═══════════════════════════════════════════════════

EVERY input MUST have:
- Associated label (adjacent or wrapped)
- Placeholder text is NOT a substitute for labels
- Clear focus state
- Error states with descriptive messages

═══════════════════════════════════════════════════
MOTION ACCESSIBILITY (prefers-reduced-motion):
═══════════════════════════════════════════════════

RESPECT USER PREFERENCES:
- All animations should be optional enhancements
- Critical functionality must work without animation
- Transitions should be under 0.3s for essentials
- No autoplaying animations that distract

FORBIDDEN:
- Autoplaying videos with sound
- Flashing content (3+ flashes per second)
- Parallax that causes motion sickness
- Infinite animations without user control
`;

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSIVE REQUIREMENTS - Mobile-First Approach (MANDATORY)
// ═══════════════════════════════════════════════════════════════════════════════
const RESPONSIVE_REQUIREMENTS = `
═══════════════════════════════════════════════════════════════════════════════
📱 RESPONSIVE DESIGN REQUIREMENTS (MOBILE-FIRST APPROACH)
═══════════════════════════════════════════════════════════════════════════════

BREAKPOINT SYSTEM (Use tabletStyles and mobileStyles):

Desktop: Default styles (≥1140px)
Tablet: tabletStyles (768px - 1139px)
Mobile: mobileStyles (<768px)
Small Mobile: Additional adjustments (<375px if needed)

═══════════════════════════════════════════════════
NAVIGATION - RESPONSIVE BEHAVIOR:
═══════════════════════════════════════════════════

DESKTOP NAVIGATION:
- Horizontal link layout
- All nav items visible
- CTA button prominent

MOBILE NAVIGATION (MANDATORY PATTERN):
When generating nav-horizontal, ALWAYS include mobile hamburger pattern:

{
  "id": "nav-section",
  "type": "nav-horizontal",
  "props": {
    "display": "flex",
    "justifyContent": "space-between",
    "alignItems": "center",
    "width": "100%",
    "spacingControl": { "padding": { "top": "16", "right": "24", "bottom": "16", "left": "24", "unit": "px" } }
  },
  "children": [
    { "id": "nav-logo", "type": "heading", "props": { "content": "BrandName", "tag": "h1" } },
    {
      "id": "nav-links",
      "type": "div",
      "props": {
        "display": "flex",
        "gap": "32",
        "alignItems": "center",
        "mobileStyles": { "display": "none" }
      },
      "children": [...]
    },
    {
      "id": "nav-mobile-menu",
      "type": "button",
      "props": {
        "iconName": "Menu",
        "variant": "ghost",
        "display": "none",
        "mobileStyles": { "display": "flex" }
      }
    }
  ]
}

═══════════════════════════════════════════════════
TYPOGRAPHY SCALING (MANDATORY):
═══════════════════════════════════════════════════

EVERY heading MUST include responsive typography:

H1 (Hero Headlines):
{
  "typography": { "fontSize": "72", "fontWeight": "700", "lineHeight": "1.1" },
  "tabletStyles": { "typography": { "fontSize": "56" } },
  "mobileStyles": { "typography": { "fontSize": "40" } }
}

H2 (Section Headers):
{
  "typography": { "fontSize": "48", "fontWeight": "700" },
  "tabletStyles": { "typography": { "fontSize": "36" } },
  "mobileStyles": { "typography": { "fontSize": "28" } }
}

H3 (Subsection):
{
  "typography": { "fontSize": "32", "fontWeight": "600" },
  "tabletStyles": { "typography": { "fontSize": "26" } },
  "mobileStyles": { "typography": { "fontSize": "22" } }
}

BODY TEXT:
- Desktop: 16-18px
- Tablet: 15-16px
- Mobile: 14-16px (never below 14px)

═══════════════════════════════════════════════════
SPACING SCALING (MANDATORY):
═══════════════════════════════════════════════════

SECTION PADDING:
{
  "spacingControl": { "padding": { "top": "100", "right": "64", "bottom": "100", "left": "64", "unit": "px" } },
  "tabletStyles": { "spacingControl": { "padding": { "top": "80", "right": "32", "bottom": "80", "left": "32", "unit": "px" } } },
  "mobileStyles": { "spacingControl": { "padding": { "top": "60", "right": "20", "bottom": "60", "left": "20", "unit": "px" } } }
}

GAP SCALING:
- Desktop grids: gap: 24-32
- Tablet: gap: 20-24
- Mobile: gap: 16-20

═══════════════════════════════════════════════════
LAYOUT ADAPTATION PATTERNS:
═══════════════════════════════════════════════════

SPLIT LAYOUTS → STACK ON MOBILE:
{
  "props": {
    "display": "grid",
    "gridTemplateColumns": "1fr 1fr",
    "gap": "48",
    "alignItems": "center",
    "mobileStyles": { "gridTemplateColumns": "1fr", "gap": "32" }
  }
}

GRIDS → REDUCE COLUMNS:
{
  "props": {
    "display": "grid",
    "gridTemplateColumns": "repeat(4, 1fr)",
    "tabletStyles": { "gridTemplateColumns": "repeat(2, 1fr)" },
    "mobileStyles": { "gridTemplateColumns": "1fr" }
  }
}

CTA POSITIONING:
- Desktop: Side by side buttons
- Mobile: Stack vertically, full width
{
  "props": {
    "display": "flex",
    "gap": "16",
    "mobileStyles": { "flexDirection": "column", "width": "100%" }
  }
}

IMAGE HEIGHTS ON MOBILE:
- Hero images: Reduce from 600px → 400px → 300px
- Card images: Maintain aspect ratio with height: auto
`;

// ═══════════════════════════════════════════════════════════════════════════════
// STRUCTURAL VARIETY - Unique Layout Systems (CRITICAL FOR UNIQUENESS)
// ═══════════════════════════════════════════════════════════════════════════════
const STRUCTURAL_VARIETY = `
═══════════════════════════════════════════════════════════════════════════════
🏗️ STRUCTURAL VARIETY - UNIQUE LAYOUT SYSTEMS
═══════════════════════════════════════════════════════════════════════════════

CRITICAL: Each design must use DIFFERENT layout systems to feel unique.
Never use the same layout pattern for all sections.

═══════════════════════════════════════════════════
LAYOUT SYSTEM OPTIONS (Use 3+ per page):
═══════════════════════════════════════════════════

1. CSS GRID LAYOUTS:
   - Standard grid: repeat(3, 1fr)
   - Bento grid: grid-template-areas with named regions
   - Auto-fit: repeat(auto-fit, minmax(280px, 1fr))
   - Asymmetric: 2fr 1fr or 1fr 2fr

2. FLEXBOX LAYOUTS:
   - Row: Horizontal alignment
   - Column: Vertical stacking
   - Wrap: Multi-line flex
   - Space-between: Distributed spacing

3. ABSOLUTE/RELATIVE LAYERING:
   - Floating decorative elements
   - Overlapping cards
   - Offset positioning
   - Layered depth effects

4. SPLIT LAYOUTS:
   - 50/50 symmetric split
   - 40/60 asymmetric split
   - 30/70 content-heavy split
   - Overlapping split (image bleeds into content)

5. CENTERED LAYOUTS:
   - Single column centered
   - Constrained width with maxWidth
   - Hero-style dramatic centering

═══════════════════════════════════════════════════
MANDATORY VARIETY PER PAGE:
═══════════════════════════════════════════════════

[ ] Hero: Use DIFFERENT layout than features
[ ] Features: Use grid, NOT same as testimonials
[ ] Testimonials: Use DIFFERENT card arrangement
[ ] CTA: Use centered OR asymmetric, NOT same as hero
[ ] Footer: Use multi-column grid

FORBIDDEN:
- All sections using centered column layout
- All grids with same column count
- No asymmetric or creative layouts

═══════════════════════════════════════════════════
DECORATIVE ELEMENTS FOR DEPTH:
═══════════════════════════════════════════════════

ADD visual interest with absolute-positioned elements:

GRADIENT ORB:
{
  "id": "deco-orb",
  "type": "div",
  "props": {
    "position": "absolute",
    "top": "-100px",
    "right": "-150px",
    "width": "400px",
    "height": "400px",
    "backgroundGradient": "radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)",
    "filter": "blur(60px)",
    "pointerEvents": "none"
  }
}

ACCENT LINE:
{
  "id": "deco-line",
  "type": "div",
  "props": {
    "width": "120px",
    "height": "4px",
    "backgroundGradient": "linear-gradient(90deg, #3b82f6, #8b5cf6)",
    "borderRadius": { "topLeft": "9999", "topRight": "9999", "bottomRight": "9999", "bottomLeft": "9999", "unit": "px" }
  }
}

FLOATING BADGE:
{
  "id": "deco-badge",
  "type": "badge",
  "props": {
    "content": "NEW",
    "position": "absolute",
    "top": "-12px",
    "right": "-12px",
    "transform": "rotate(12deg)"
  }
}
`;

// ═══════════════════════════════════════════════════════════════════════════════
// MOTION REQUIREMENTS - Tasteful, Elegant Animations
// ═══════════════════════════════════════════════════════════════════════════════
const MOTION_REQUIREMENTS = `
═══════════════════════════════════════════════════════════════════════════════
🎬 MOTION & ANIMATION REQUIREMENTS - TASTEFUL, ELEGANT ANIMATIONS
═══════════════════════════════════════════════════════════════════════════════

CRITICAL: Animations must be ELEGANT, not aggressive. Respect user preferences.

═══════════════════════════════════════════════════
ANIMATION PRINCIPLES:
═══════════════════════════════════════════════════

1. PURPOSE-DRIVEN: Every animation serves UX (feedback, guidance, delight)
2. SUBTLE: Movements should be felt, not noticed
3. PERFORMANT: Use transform/opacity only (GPU-accelerated)
4. ACCESSIBLE: Respect prefers-reduced-motion preference
5. CONSISTENT: Same easing curves throughout design

═══════════════════════════════════════════════════
ENTRANCE ANIMATIONS (Scroll-triggered when visible):
═══════════════════════════════════════════════════

FADE UP (Default for most elements):
{
  "animation": {
    "type": "fadeUp",
    "duration": 0.6,
    "delay": 0,
    "easing": "easeOut"
  }
}

STAGGER (For grid items, cards):
Each item in grid gets increasing delay:
- Card 1: delay: 0
- Card 2: delay: 0.1
- Card 3: delay: 0.2
- Card 4: delay: 0.3

═══════════════════════════════════════════════════
HOVER ANIMATIONS (Micro-interactions):
═══════════════════════════════════════════════════

BUTTONS - Lift & Glow:
"stateStyles": {
  "hover": {
    "transform": "translateY(-2px)",
    "boxShadow": "0 8px 20px -4px rgba(0,0,0,0.15)"
  }
},
"transition": "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"

CARDS - Lift & Enhance:
"stateStyles": {
  "hover": {
    "transform": "translateY(-4px)",
    "boxShadow": "0 12px 32px -8px rgba(0,0,0,0.12)"
  }
},
"transition": "transform 0.3s ease, box-shadow 0.3s ease"

IMAGES - Subtle Zoom:
"stateStyles": {
  "hover": {
    "transform": "scale(1.03)"
  }
},
"transition": "transform 0.4s ease"

LINKS - Color Shift:
"stateStyles": {
  "hover": {
    "color": "hsl(var(--primary))"
  }
},
"transition": "color 0.2s ease"

═══════════════════════════════════════════════════
ANIMATION TIMING:
═══════════════════════════════════════════════════

DURATIONS:
- Micro-interactions (hover, focus): 0.15-0.25s
- State changes (toggle, expand): 0.2-0.3s
- Entrance animations: 0.4-0.6s
- Complex transitions: 0.5-0.8s

EASING CURVES:
- Standard: cubic-bezier(0.4, 0, 0.2, 1) - natural feel
- Enter: cubic-bezier(0, 0, 0.2, 1) - decelerate
- Exit: cubic-bezier(0.4, 0, 1, 1) - accelerate
- Bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55) - playful

═══════════════════════════════════════════════════
FORBIDDEN ANIMATION PATTERNS:
═══════════════════════════════════════════════════

❌ Animations longer than 1s (feels sluggish)
❌ Bouncy easing on everything (overused)
❌ Autoplaying infinite animations
❌ Flashing or rapid color changes
❌ Animation that blocks content visibility
❌ Multiple animations competing for attention
❌ Animating width/height/margin (causes reflow)

═══════════════════════════════════════════════════
REDUCED MOTION CONSIDERATIONS:
═══════════════════════════════════════════════════

When user has prefers-reduced-motion enabled:
- Replace transforms with opacity fades only
- Reduce durations to <0.2s
- Remove parallax effects entirely
- Keep focus indicators (accessibility requirement)
`;


// ═══════════════════════════════════════════════════════════════════════════════
// STATE STYLES GENERATION RULES - Mandatory for all interactive elements
// ═══════════════════════════════════════════════════════════════════════════════
const STATE_STYLES_RULES = `
═══════════════════════════════════════════════════════════════════════════════
✨ STATE STYLES MANDATORY GENERATION - EVERY INTERACTIVE ELEMENT
═══════════════════════════════════════════════════════════════════════════════

CRITICAL: Generate stateStyles for EVERY button, card, link, input, and icon.
Components without stateStyles feel static and unprofessional.

═══════════════════════════════════════════════════
FOR EVERY BUTTON - INCLUDE ALL STATES:
═══════════════════════════════════════════════════
\`\`\`json
{
  "style": {
    "transition": "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    "stateStyles": {
      "hover": {
        "transform": "translateY(-2px)",
        "shadow": { "x": 0, "y": 6, "blur": 16, "spread": -4, "color": "rgba(0,0,0,0.15)" }
      },
      "pressed": {
        "transform": "scale(0.98)"
      },
      "focused": {
        "shadow": { "x": 0, "y": 0, "blur": 0, "spread": 2, "color": "hsl(var(--primary) / 0.3)" }
      }
    }
  }
}
\`\`\`

═══════════════════════════════════════════════════
FOR EVERY CARD/CONTAINER:
═══════════════════════════════════════════════════
\`\`\`json
{
  "style": {
    "transition": "transform 0.3s ease, box-shadow 0.3s ease",
    "stateStyles": {
      "hover": {
        "transform": "translateY(-4px)",
        "shadow": { "x": 0, "y": 12, "blur": 32, "spread": -8, "color": "rgba(0,0,0,0.12)" }
      }
    }
  }
}
\`\`\`

═══════════════════════════════════════════════════
FOR EVERY LINK/NAV ITEM:
═══════════════════════════════════════════════════
\`\`\`json
{
  "style": {
    "transition": "color 0.2s ease",
    "stateStyles": {
      "hover": {
        "typography": { "color": "hsl(var(--primary))" }
      }
    }
  }
}
\`\`\`

═══════════════════════════════════════════════════
FOR EVERY FORM INPUT:
═══════════════════════════════════════════════════
\`\`\`json
{
  "style": {
    "transition": "border-color 0.2s ease, box-shadow 0.2s ease",
    "stateStyles": {
      "focused": {
        "border": { "color": "hsl(var(--primary))" },
        "shadow": { "x": 0, "y": 0, "blur": 0, "spread": 3, "color": "hsl(var(--primary) / 0.2)" }
      }
    }
  }
}
\`\`\`

═══════════════════════════════════════════════════
FOR IMAGE CONTAINERS (zoom effect):
═══════════════════════════════════════════════════
\`\`\`json
{
  "id": "image-container",
  "type": "div",
  "style": {
    "overflow": "hidden",
    "border": { "radius": 12 }
  },
  "children": [
    {
      "id": "image",
      "type": "image",
      "style": {
        "transition": "transform 0.4s ease",
        "stateStyles": {
          "hover": {
            "transform": "scale(1.05)"
          }
        }
      }
    }
  ]
}
\`\`\`

═══════════════════════════════════════════════════
FOR ICONS:
═══════════════════════════════════════════════════
\`\`\`json
{
  "style": {
    "transition": "transform 0.2s ease, color 0.2s ease",
    "stateStyles": {
      "hover": {
        "transform": "scale(1.1)"
      }
    }
  }
}
\`\`\`

═══════════════════════════════════════════════════
VALIDATION CHECKLIST:
═══════════════════════════════════════════════════

Before returning response, verify:
[ ] Every button has hover + pressed + focused stateStyles
[ ] Every card has hover stateStyles with transform
[ ] Every input has focused stateStyles
[ ] Every link has hover color change
[ ] Every image in container has hover scale
[ ] All interactive elements have transition property
[ ] Transitions use performant properties (transform, opacity)
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, context, mode } = await req.json();

    // Debug logging for context
    console.log('[AI Build] Received context:', JSON.stringify({
      model: context?.model,
      mode: mode,
      isRetry: context?.isRetry,
      forceRebuild: context?.forceRebuild,
      designSeed: context?.designSeed,
      projectName: context?.projectName
    }));

    // ═══════════════════════════════════════════════════════════════════════════════
    // CLASSIFY-INTENT MODE - AI-powered intent detection (fast, cheap)
    // Determines if user wants to edit a specific section or build a full page
    // ═══════════════════════════════════════════════════════════════════════════════
    if (mode === 'classify-intent') {
      console.log('[AI Build] Entering CLASSIFY-INTENT mode');
      const { prompt: userPrompt, canvasSections } = context || {};

      if (!canvasSections || canvasSections.length === 0) {
        return new Response(JSON.stringify({ targetSection: null, confidence: 1.0 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const sectionsDescription = canvasSections.map((s: any, i: number) => 
        `${i + 1}. id="${s.id}", type="${s.type}"${s.hint ? `, content hint: "${s.hint}"` : ''}`
      ).join('\n');

      const classifySystemPrompt = `You are a UI builder assistant that classifies user intent. You will receive:
1. A list of sections currently on the user's canvas
2. The user's message

Your job: Determine if the user wants to modify a SPECIFIC existing section, or if they want a full page/app rebuild.

Rules:
- If they mention or clearly refer to a specific section (by name, position like "top/bottom/first/last", or content like "pricing cards", "the menu", "navigation"), return that section's ID.
- If they want a whole new page/app/website/landing page, return null.
- "First section" or "top part" = first item in the list. "Bottom" / "last section" = last item.
- References to navbars, menus, navigation, header = the nav/header section.
- References to footers, bottom links, copyright = the footer section.
- If the user says "I don't like how X looks" where X maps to a section, that's a section edit.
- If ambiguous but mentions something that could be a section, lean toward section-edit with moderate confidence.
- "Generate/create/build a proper X" where X is a section type = section edit, NOT full page.

Respond with ONLY valid JSON, no markdown: {"targetSection": "section-id-or-null", "confidence": 0.0-1.0}`;

      const classifyUserPrompt = `Sections on canvas:
${sectionsDescription}

User said: "${userPrompt || prompt}"`;

      const openaiKey = pickRandomKey(getApiKeys('openai'));
      if (!openaiKey) {
        console.error('[Classify Intent] No OpenAI API key available');
        return new Response(JSON.stringify({ targetSection: null, confidence: 0 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        const classifyResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: classifySystemPrompt },
              { role: 'user', content: classifyUserPrompt },
            ],
            max_tokens: 60,
            temperature: 0.1,
          }),
        });

        if (!classifyResponse.ok) {
          console.error('[Classify Intent] OpenAI error:', classifyResponse.status);
          return new Response(JSON.stringify({ targetSection: null, confidence: 0 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const classifyData = await classifyResponse.json();
        const rawContent = classifyData.choices?.[0]?.message?.content?.trim() || '{}';
        console.log('[Classify Intent] Raw response:', rawContent);

        // Parse JSON, stripping markdown fences if present
        const cleanJson = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        return new Response(JSON.stringify({
          targetSection: parsed.targetSection || null,
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (classifyError) {
        console.error('[Classify Intent] Error:', classifyError);
        return new Response(JSON.stringify({ targetSection: null, confidence: 0 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION-EDIT MODE - Surgical replacement of a single section
    // ═══════════════════════════════════════════════════════════════════════════════
    if (mode === 'section-edit') {
      console.log('[AI Build] Entering SECTION-EDIT mode');
      
      const { existingSection, sectionType } = context;
      if (!existingSection) {
        throw new Error('existingSection is required for section-edit mode');
      }
      
      // Use GPT-4o or Claude 3.5 Sonnet for precise editing
      const editModel = context.model || 'gpt-4o'; 
      
      // Generate a fresh design seed for consistency if not provided
      const designSeed = context.designSeed || generatePageDesignSeed();
      const designDirective = formatDesignSeedForPrompt(designSeed, context?.designSystem);
      
      // Build the edit prompt
      const systemPrompt = sanitizePromptString(`
${STATIC_SYSTEM_PROMPT}

${designDirective}

TASK: SURGICAL EDIT of a ${sectionType || 'section'} component.
You will receive the EXISTING JSON of the section.
Your job is to MODIFY it based on the user's request while maintaining structural validity.

CRITICAL RULES:
1. Return a "steps" array with a SINGLE component step (the updated section).
2. Maintain the existing ID if possible, or use a semantic ID like "${sectionType}-section".
3. Apply the DESIGN DIRECTION colors/typography to ensure it matches the rest of the app.
4. If the user asks for a style change (e.g. "make it dark"), override the existing styles.
5. If the user asks for content change, update the text/images.

RETURN FORMAT:
{
  "success": true,
  "steps": [
    { "type": "component", "data": { ...updated component json... } }
  ]
}
`);

      // Build neighbor context string so the AI can match adjacent section styles
      const neighborContext = (context.neighborSections as any[] | undefined)?.length
        ? `\n\nPAGE STYLE CONTEXT (surrounding sections — MATCH their colors and typography):\n${
            (context.neighborSections as any[]).map((n: any) =>
              `- ${n.id} (${n.type}): bg=${JSON.stringify(n.backgroundColor || n.backgroundGradient || null)}, color=${JSON.stringify(n.primaryColor || null)}, font=${JSON.stringify(n.fontFamily || null)}, classes=${(n.appliedClasses || []).join(', ')}`
            ).join('\n')
          }`
        : '';

      const userMessage = `
EXISTING COMPONENT JSON:
${JSON.stringify(existingSection, null, 2)}
${neighborContext}

USER REQUEST: "${prompt}"

Update this section to match the request. Preserve the visual style of the page (colors, typography, spacing) unless the user explicitly asks to change them. Keep it as a valid component tree.
`;

      try {
        const response = await callAIModel(
          editModel,
          systemPrompt,
          userMessage,
          8000, // edit token budget — increased from 6000 to prevent truncation on large sections
          0.7
        );
        
        const parsed = resilientJsonParse(response);
        
        return new Response(JSON.stringify(parsed), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      } catch (error: any) {
        console.error('[AI Build] Section edit failed:', error);
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // AI WALL MODE - Multi-variant design generation for AI Wall mini-app
    // ═══════════════════════════════════════════════════════════════════════════════
    if (mode === 'ai-wall') {
      console.log('[AI Wall] Entering AI Wall generation mode');
      
      // Force GPT-4o for reliable JSON output (with fallback to Gemini)
      const primaryModel = 'gpt-5';
      const fallbackModel = 'gemini-2.5-flash';
      
      const requestedVariantCount = Number(context?.variantCount || 1);
      const variantCount = Math.max(1, Math.min(requestedVariantCount, 2));
      const presetId = context?.presetId;
      
      // Get style seeds from context if provided
      const styleSeeds = context?.styleSeeds || [];
      const stylesDescription = styleSeeds.length > 0 
        ? `\n\nSTYLE SEEDS (EACH VARIANT MUST FOLLOW ITS ASSIGNED STYLE EXACTLY):
${styleSeeds.map((s: any) => `${s.name}: Style="${s.style}", Colors="${s.colors}", Layout="${s.layout}"`).join('\n')}

CRITICAL: Make each variant VISUALLY DISTINCT by following its style seed exactly. Do NOT make similar designs.`
        : '';
      
      // Comprehensive system prompt that enforces JSON-only output with component schema
      const aiWallSystemPrompt = `You are a JSON-only API for generating professional UI component structures. Return ONLY valid JSON.

CRITICAL RULES:
1. Output MUST be valid JSON starting with { and ending with }
2. NO markdown code fences (\`\`\`json or \`\`\`), NO explanatory text, NO prose, NO HTML
3. If you cannot comply, return {"success": false, "error": "reason"}
4. Generate VISUALLY DISTINCT designs - each variant must look COMPLETELY DIFFERENT
${stylesDescription}

COMPONENT TYPES ALLOWED:
- section: Full-width page section (use for hero, features, footer, etc.)
- container: Centered container with max-width
- div: Generic container for cards, groups, wrappers
- heading: Headings (use "tag" prop: "h1", "h2", "h3", etc.)
- text: Paragraph/body text
- button: Interactive button (use "variant": "default" | "outline" | "secondary" | "ghost")
- image: Image element (use "imagePrompt" for descriptive keywords that will be used to fetch Unsplash images)
- input: Text input field
- icon: Lucide icon (use "iconName" prop: "Check", "Star", "ArrowRight", "Zap", etc.)
- badge: Status badge
- link: Hyperlink
- separator: Horizontal line divider
- spacer: Vertical spacing element

IMAGE HANDLING:
- For images, use "imagePrompt" with descriptive keywords for Unsplash search
- Example: { "type": "image", "props": { "imagePrompt": "team meeting modern office", "width": "100%", "height": "400px" } }
- The system will automatically convert these to real Unsplash photo URLs

OUTPUT SCHEMA (return this exact structure):
{
  "success": true,
  "variants": [
    {
      "name": "Variant A",
      "layoutType": "standard",
      "description": "Brief description of the design",
      "components": [
        {
          "type": "component",
          "data": {
            "id": "hero-section",
            "type": "section",
            "props": {
              "display": "flex",
              "flexDirection": "column",
              "justifyContent": "center",
              "alignItems": "center",
              "gap": "24",
              "width": "100%",
              "minHeight": "70vh",
              "backgroundColor": { "type": "solid", "value": "#1a1a2e", "opacity": 100 },
              "spacingControl": {
                "padding": { "top": "80", "right": "24", "bottom": "80", "left": "24", "unit": "px" }
              },
              "tabletStyles": { "spacingControl": { "padding": { "top": "48", "right": "16", "bottom": "48", "left": "16", "unit": "px" } } },
              "mobileStyles": { "spacingControl": { "padding": { "top": "32", "right": "12", "bottom": "32", "left": "12", "unit": "px" } } }
            },
            "children": [
              {
                "id": "hero-title",
                "type": "heading",
                "props": {
                  "tag": "h1",
                  "content": "Your Headline Here",
                  "typography": { "fontSize": "48", "fontWeight": "700", "textAlign": "center", "color": "#ffffff" },
                  "tabletStyles": { "typography": { "fontSize": "36" } },
                  "mobileStyles": { "typography": { "fontSize": "28" } }
                }
              }
            ]
          }
        }
      ]
    }
  ]
}

DESIGN REQUIREMENTS:
1. Generate ${variantCount} complete, distinct variant(s)
2. Each variant must include: Hero section, Features section, CTA section, Footer
3. Use RICH styling: gradients, shadows, proper spacing, typography hierarchy
4. All colors as hex values or objects like { "type": "solid", "value": "#hex", "opacity": 100 }
5. Use "imagePrompt" for images with descriptive Unsplash-friendly keywords
6. Include "tabletStyles" and "mobileStyles" for responsive design on ALL sections
7. fontSize values are STRINGS without "px" (e.g., "48" not "48px" or 48)
8. Use semantic IDs like "hero-section", "features-grid", "cta-button"
9. EACH VARIANT MUST HAVE COMPLETELY DIFFERENT COLORS, LAYOUTS, AND STYLING

SECTION DESIGN GUIDELINES (Do's & Don'ts):

HERO / ABOVE-THE-FOLD:
✓ Benefit-focused headline answering "what I get" in one line. Primary CTA above fold, visually dominant. One-sentence value prop + subhead. Contextual high-res imagery reinforcing the message.
✗ No generic greetings ("Welcome to our homepage"). No buried CTAs below fold. No low-contrast or tiny headline type. No decorative-only imagery.
→ Use <header><h1> for headline. CTA focus ring visible. Alt text for hero image. 4.5:1 contrast minimum.

NAVIGATION:
✓ Shallow, predictable menu. Include search/contact CTA. Highlight current page. Mobile hamburger with "Menu" label. Touch targets ≥44px.
✗ No ambiguous nested menus. No jargon labels. No hidden contact info.
→ Use <nav> with skip link. Keyboard + screen-reader support.

FEATURES / VALUE:
✓ Lead with benefit statements, then features with microcopy. 3–6 features per section. Consistent icons + short descriptions.
✗ No feature-only lists without benefits. No long paragraphs. No inconsistent icon styles.
→ Use <section aria-labelledby>. Each feature as own accessible component.

CARDS:
✓ Independent actionable units (clickable, keyboard focus). Consistent dimensions + typographic rhythm. Short title, one-line summary, single clear CTA. Meaningful image/icon.
✗ No inconsistent card heights. No multiple competing CTAs per card. No tiny microcopy or low contrast. No decorative-only images without alt text.
→ Use <article> for cards. Lazy-load images. Subtle hover/focus motion.

PRICING:
✓ Value explainer per tier (who it's for). Price + billing cadence + CTA clearly visible. Highlighted recommended plan. FAQs near pricing.
✗ No hidden fees/taxes. No vague "Contact us" for mainstream plans. Max 3–4 tiers. Don't make cheapest plan visually dominant if not recommended.
→ Table with role="table" semantics. Keyboard navigation for comparisons.

ABOUT / TEAM:
✓ Mission-led opening. Real photos + authentic bios. Concise storytelling with milestones. Social proof/press badges.
✗ No corporate puffery. No fake testimonials or stock headshots. No hidden leadership info.
→ Readable line length ~60–75 chars. Accessible image captions.

TESTIMONIALS:
✓ Short contextual quotes with name, role, company. Logos/ratings/case study links. Place near key CTAs. Curate best 3–5.
✗ No anonymous quotes. No fake metrics. No text-only blocks — add identity signals (photo, logo).
→ Use <blockquote> with cite. Logical screen-reader order.

FORMS / LEAD CAPTURE:
✓ Minimal fields (name, email, purpose). Progressive disclosure for long forms. Inline validation. Privacy copy + response time.
✗ No unnecessary fields. No placeholder-only labels. No hidden error messages. No auto-submit.
→ Semantic <form> with <label>s. ARIA error messages.

FOOTER:
✓ Sitemap + contact + legal (privacy, T&C). Trust badges, newsletter, social links. Repeat critical CTAs. 2–4 columns desktop, stack mobile.
✗ No cramming links in tiny text. No low contrast. No promotional banners.
→ Use <footer> with logical landmarks. Keyboard-reachable links.

FAQ:
✓ Organize by category. Accordion pattern. Concise scannable answers. Search inside FAQ. Link to docs/contact.
✗ No burying critical policy info. No long technical answers. No inaccessible accordions.
→ aria-expanded toggles. Keyboard-friendly.

IMAGERY & ICONS:
✓ Contextual high-res images telling a story. Consistent icon style. Descriptive imagePrompt keywords matching section context.
✗ No generic unrelated stock. No overcompressed images. No mixed illustration styles. No image-only information.
→ Descriptive alt text. Responsive sizing.

MOTION:
✓ Subtle entrance + hover animations. Easing from design tokens. Reduced-motion respect (prefers-reduced-motion).
✗ No heavy long animations delaying interaction. No motion-only feedback. No animations making reading harder.
→ Motion object in component props. Always pair motion with state changes.

ACCESSIBILITY:
✓ Semantic HTML (header, main, nav, section, article, footer). Keyboard focus order + visible indicators. ARIA to augment (not replace) semantics. 4.5:1 color contrast. Captions for media.
✗ No ARIA to fix poor HTML. No non-semantic clickable <div>s. No color-only meaning. No skipping screen-reader testing.

UNIQUENESS / VARIATION:
✓ Consistent tokens across variants (palette, type, spacing). Vary layout, image placement, CTA hierarchy between versions. Track layout signatures to avoid repetition.
✗ No radically different visual languages breaking brand. No repeating same structural skeleton across variants.

PER-SECTION CHECKLIST:
- Hero: headline clear? CTA visible above fold? image contextual?
- Nav: primary paths visible? search/contact accessible? mobile menu usable?
- Features: benefits emphasized? icons consistent? readable bullets?
- Cards: single CTA each? keyboard focus? image alt text?
- Pricing: fees visible? recommended plan highlighted? comparison accessible?
- About: mission succinct? real photos? trust signals?
- Testimonials: identity attached? curated top picks?
- Forms: minimal fields? inline validation? privacy notice?
- Footer: sitemap + contact + legal? readable size?
- Accessibility: semantic HTML? color contrast? keyboard nav?`;

      // Helper function to extract and parse JSON with multi-layer recovery
      function extractAndParseJSON(response: string): any {
        let cleaned = response.trim();
        
        // Layer 1: Strip ALL markdown code fences and backticks
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/gi, '');
        cleaned = cleaned.replace(/\n?```\s*$/gi, '');
        cleaned = cleaned.replace(/```/g, ''); // Remove any remaining triple backticks
        cleaned = cleaned.replace(/`/g, ''); // Remove stray single backticks
        
        // Layer 2: Find JSON object boundaries
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        
        if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
          console.error('[AI Wall] No JSON object found. Response starts with:', cleaned.slice(0, 100));
          throw new Error('No valid JSON object found in response');
        }
        
        cleaned = cleaned.slice(firstBrace, lastBrace + 1);
        
        // Layer 3: Try direct parse
        try {
          return JSON.parse(cleaned);
        } catch (parseError) {
          console.log('[AI Wall] Direct parse failed, attempting repair...');
          
          // Layer 4: Repair truncated JSON
          let repaired = cleaned;
          
          // Close any trailing unclosed strings (common truncation pattern)
          if (repaired.match(/"[^"]*$/)) {
            repaired = repaired.replace(/"[^"]*$/, '""');
            console.log('[AI Wall] Closed unclosed string');
          }
          
          const openBraces = (repaired.match(/{/g) || []).length;
          const closeBraces = (repaired.match(/}/g) || []).length;
          const openBrackets = (repaired.match(/\[/g) || []).length;
          const closeBrackets = (repaired.match(/]/g) || []).length;
          
          const bracketsToAdd = Math.max(0, openBrackets - closeBrackets);
          const bracesToAdd = Math.max(0, openBraces - closeBraces);
          
          repaired += ']'.repeat(bracketsToAdd);
          repaired += '}'.repeat(bracesToAdd);
          
          console.log(`[AI Wall] JSON repair: added ${bracketsToAdd} ] and ${bracesToAdd} }`);
          return JSON.parse(repaired);
        }
      }

      // Build the user prompt with the request
      const userPrompt = `Generate a professional, modern UI design for: "${prompt}"

Return ONLY the JSON structure with ${variantCount} variant(s). Each variant should be visually distinct with different layouts, color schemes, and styling approaches.

Focus on:
- Clean, modern aesthetics
- Strong visual hierarchy
- Responsive design (include tabletStyles and mobileStyles)
- Professional color palette
- Proper spacing and typography

Remember: Return ONLY valid JSON, no explanatory text.`;

      let aiResponse: string = '';
      let usedModel = primaryModel;

      try {
        // Try GPT-4o first (has native JSON mode enabled)
        console.log(`[AI Wall] Attempting generation with primary model: ${primaryModel}`);
        aiResponse = await callAIModel(
          primaryModel,
          aiWallSystemPrompt,
          userPrompt,
          16384,
          0.7
        );
      } catch (primaryError: any) {
        console.warn(`[AI Wall] Primary model (${primaryModel}) failed: ${primaryError.message}`);
        
        // Fallback to Gemini
        try {
          console.log(`[AI Wall] Falling back to: ${fallbackModel}`);
          usedModel = fallbackModel;
          aiResponse = await callAIModel(
            fallbackModel,
            aiWallSystemPrompt,
            userPrompt,
            24000,
            0.7
          );
        } catch (fallbackError: any) {
          console.error(`[AI Wall] Fallback model also failed: ${fallbackError.message}`);
          
          if (fallbackError?.message === 'AI_TIMEOUT' || primaryError?.message === 'AI_TIMEOUT') {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'AI_TIMEOUT',
                variants: [],
                mode: 'ai-wall',
                presetId,
                variantCount,
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          throw fallbackError;
        }
      }

      // Diagnostic logging
      console.log(`[AI Wall] Used model: ${usedModel}`);
      console.log(`[AI Wall] Response length: ${aiResponse.length}`);
      console.log(`[AI Wall] First 300 chars: ${aiResponse.slice(0, 300)}`);

      // Parse AI response with robust extraction
      let result;
      try {
        result = extractAndParseJSON(aiResponse);
      } catch (parseError: any) {
        console.error('[AI Wall] Failed to parse response:', parseError.message);
        console.log('[AI Wall] Raw response (first 1000):', aiResponse.slice(0, 1000));
        
        // Return structured error response
        return new Response(
          JSON.stringify({
            success: false,
            error: `Failed to parse AI response: ${parseError.message}`,
            variants: [],
            debug: {
              responseLength: aiResponse.length,
              firstChars: aiResponse.slice(0, 200),
              usedModel
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Normalize response structure
      if (!result.variants && result.steps) {
        // Convert single design (steps format) to variants format
        result.variants = [
          {
            name: 'Variant A',
            layoutType: 'standard',
            description: 'Generated layout',
            components: result.steps
          }
        ];
      }

      // Validate we have actual components
      const hasComponents = result.variants?.some((v: any) => 
        v.components && Array.isArray(v.components) && v.components.length > 0
      );
      
      if (!hasComponents) {
        console.warn('[AI Wall] No components in variants, checking for other data structures');
        // Try to extract from alternative structures
        if (result.components) {
          result.variants = [{
            name: 'Variant A',
            layoutType: 'standard',
            description: 'Generated layout',
            components: result.components
          }];
        }
      }

      // Ensure success flag
      result.success = true;
      result.mode = 'ai-wall';
      result.presetId = presetId;
      result.usedModel = usedModel;

      console.log(`[AI Wall] Generated ${result.variants?.length || 0} variants with components:`, 
        result.variants?.map((v: any) => v.components?.length || 0));

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // CLIENT-SIDE PHASED MODE - Returns phase list or executes a single phase
    // This mirrors AI Wall's client-side sequential batching to avoid rate limits
    // ═══════════════════════════════════════════════════════════════════════════════
    
    if (mode === 'get-phases') {
      console.log('[AI Build] get-phases mode: computing phase list');
      const dynamicPhases = buildDynamicPhases(prompt);
      const designSeed = generatePageDesignSeed();
      const designDirective = formatDesignSeedForPrompt(designSeed, context?.designSystem);
      
      const phaseList = dynamicPhases.map(p => ({
        name: p.name,
        sections: p.sections,
        required: p.required || false,
        timeoutMs: p.timeoutMs,
        instructions: p.instructions,
      }));
      
      return new Response(JSON.stringify({
        success: true,
        mode: 'get-phases',
        phases: phaseList,
        designSeed: designSeed,
        designDirective,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    if (mode === 'single-phase') {
      // Execute exactly ONE phase and return its components
      const phaseName = context?.phaseName;
      const designSeedData = context?.designSeed;
      const designDirective = context?.designDirective || '';
      const blueprintDirective = context?.blueprintDirective || '';
      const requestedModel = context?.model || 'gemini-3-pro';
      // If the primary model failed (recoverable retry), switch to first fallback
      const selectedModel = context?.retryWithFallback
        ? (getFallbackModelKeys(requestedModel)[0] || requestedModel)
        : requestedModel;
      const modelMultiplier = MODEL_PHASE_TIMEOUTS[selectedModel] || MODEL_PHASE_TIMEOUTS.default;
      
      console.log(`[AI Build] single-phase mode: executing phase "${phaseName}" with model ${selectedModel}`);
      
      if (!phaseName) {
        return new Response(JSON.stringify({ success: false, error: 'phaseName is required' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      // Use phase definition passed from get-phases (avoids randomization mismatch)
      // Fallback to rebuilding if not provided (backward compat)
      const clientPhaseInstructions = context?.phaseInstructions;
      const clientPhaseSections = context?.phaseSections;
      const clientPhaseTimeoutMs = context?.phaseTimeoutMs;
      const clientPhaseRequired = context?.phaseRequired;
      
      let phase: any;
      if (clientPhaseInstructions) {
        phase = {
          name: phaseName,
          sections: clientPhaseSections || [phaseName + '-section'],
          instructions: clientPhaseInstructions,
          timeoutMs: clientPhaseTimeoutMs || 25000,
          required: clientPhaseRequired || false,
        };
      } else {
        // Fallback: rebuild phases (may not match get-phases due to randomization)
        const websiteBlueprint = detectWebsiteType(prompt);
        const dynamicPhases = buildDynamicPhases(prompt, websiteBlueprint);
        phase = dynamicPhases.find(p => p.name === phaseName);
      }
      
      if (!phase) {
        return new Response(JSON.stringify({ success: false, error: `Phase "${phaseName}" not found` }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      // Reset image tracker for fresh Unsplash selections per phase
      resetImageTracker();
      
      // Reconstruct design seed for enhanceWithDesignSeed
      const seed = designSeedData || generatePageDesignSeed();
      
      // Build enhanceWithDesignSeed inline (same logic as generatePageInPhases)
      const GENERIC_BG_VALUES = ['hsl(var(--card))', 'hsl(var(--background))', 'hsl(var(--muted))', 'hsl(var(--secondary))', '#fafafa', '#f8f9fa', '#f9fafb', '#ffffff', '#fff', 'transparent', 'rgba(255,255,255,1)', 'rgb(255,255,255)'];
      const GENERIC_ACCENT_VALUES = ['#3b82f6', '#2563eb', '#6366f1', 'hsl(var(--primary))', 'hsl(var(--accent))'];
      const isGenericBg = (val: string | undefined): boolean => {
        if (!val) return true;
        const v = String(val).toLowerCase().trim();
        if (v.startsWith('hsl(var(--')) return true;
        return GENERIC_BG_VALUES.some(g => v === g.toLowerCase()) || v === '';
      };
      const isGenericAccent = (val: string | undefined): boolean => {
        if (!val) return true;
        const v = String(val).toLowerCase().trim();
        if (v.startsWith('hsl(var(--')) return true;
        return GENERIC_ACCENT_VALUES.some(g => v === g.toLowerCase());
      };
      
      const enhanceSeed = (comp: any, s: any, parentBg?: string): any => {
        if (!comp || typeof comp !== 'object') return comp;
        comp.props = comp.props || {};
        const id = (comp.id || '').toLowerCase();
        const isCard = comp.type === 'div' && (id.includes('card') || id.includes('feature') || id.includes('testimonial') || id.includes('pricing') || id.includes('service') || id.includes('step') || id.includes('project') || id.includes('team') || id.includes('product'));
        const isSection = comp.type === 'section';
        const isHeading = comp.type === 'heading';
        const isText = comp.type === 'text';
        const isButton = comp.type === 'button';
        
        if (isSection) {
          const bg = comp.props.backgroundColor;
          const bgVal = bg?.value || bg;
          if (isGenericBg(typeof bgVal === 'string' ? bgVal : undefined)) {
            const sectionIdx = parseInt(id.replace(/\D/g, '') || '0') || 0;
            if (s.sectionGradients && s.sectionGradients[sectionIdx % s.sectionGradients.length]) {
              comp.props.backgroundGradient = s.sectionGradients[sectionIdx % s.sectionGradients.length];
            } else {
              comp.props.backgroundColor = { type: 'solid', value: sectionIdx % 2 === 0 ? s.colorMood.hero : s.colorMood.surface, opacity: 100 };
            }
          }
          parentBg = comp.props.backgroundColor?.value || comp.props.backgroundGradient || s.colorMood.hero;
          if (!comp.props.spacingControl || !comp.props.spacingControl.padding) {
            const pad = s.spacing?.sectionPad?.replace('px','') || '80';
            comp.props.spacingControl = comp.props.spacingControl || {};
            comp.props.spacingControl.padding = { top: pad, right: '24', bottom: pad, left: '24', unit: 'px' };
          }
        }
        if ((isText || isHeading) && s.isDarkMood) {
          comp.props.typography = comp.props.typography || {};
          const textColor = comp.props.typography.color;
          if (!textColor || textColor === '#000' || textColor === '#000000' || textColor === '#1a1a2e' || textColor === 'hsl(var(--foreground))' || textColor === '#333' || textColor === '#374151') {
            comp.props.typography.color = s.colorMood.text;
          }
        }
        if ((isText || isHeading) && !s.isDarkMood) {
          comp.props.typography = comp.props.typography || {};
          const textColor = comp.props.typography.color;
          if (textColor && (textColor === '#fff' || textColor === '#ffffff' || textColor === 'rgba(255,255,255,0.9)')) {
            comp.props.typography.color = s.colorMood.text;
          }
        }
        if (isHeading) { comp.props.typography = comp.props.typography || {}; if (!comp.props.typography.fontFamily) comp.props.typography.fontFamily = s.fonts?.heading; }
        if (isText) { comp.props.typography = comp.props.typography || {}; if (!comp.props.typography.fontFamily) comp.props.typography.fontFamily = s.fonts?.body; }
        if (isButton) {
          const btnBg = comp.props.backgroundColor; const btnBgVal = btnBg?.value || btnBg;
          if (comp.props.variant !== 'ghost' && comp.props.variant !== 'outline') {
            if (isGenericAccent(typeof btnBgVal === 'string' ? btnBgVal : undefined)) {
              comp.props.backgroundColor = { type: 'solid', value: s.colorMood.accent, opacity: 100 };
            }
          }
          if (!comp.props.transition) comp.props.transition = 'all 0.2s ease';
        }
        if (isCard && !comp.props.stateStyles?.hover) {
          comp.props.transition = comp.props.transition || 'all 0.3s ease';
          comp.props.stateStyles = comp.props.stateStyles || {};
          comp.props.stateStyles.hover = { transform: 'translateY(-4px)', boxShadow: '0 12px 40px rgba(0,0,0,0.15)' };
        }
        if (isCard) {
          const cardBg = comp.props.backgroundColor; const cardBgVal = cardBg?.value || cardBg;
          if (isGenericBg(typeof cardBgVal === 'string' ? cardBgVal : undefined)) {
            comp.props.backgroundColor = { type: 'solid', value: s.colorMood.surface, opacity: 100 };
          }
        }
        if (s.isDarkMood && isCard && comp.type === 'div') {
          if (!comp.props.border) comp.props.border = { width: '1', style: 'solid', color: 'rgba(255,255,255,0.08)', unit: 'px', sides: { top: true, right: true, bottom: true, left: true } };
          const effectStr = typeof s.effect === 'string' ? s.effect : '';
          if (!comp.props.backdropFilter && (effectStr.includes('glassmorphism') || s.glassIntensity === 'frosted')) comp.props.backdropFilter = 'blur(12px)';
        }
        if (s.isDarkMood && isButton && comp.props.variant !== 'ghost' && comp.props.variant !== 'outline') {
          if (!comp.props.stateStyles?.hover?.boxShadow) {
            comp.props.stateStyles = comp.props.stateStyles || {};
            comp.props.stateStyles.hover = comp.props.stateStyles.hover || {};
            comp.props.stateStyles.hover.boxShadow = `0 0 20px ${s.glowColor}40`;
          }
        }
        // GAP 10 FIX (single-phase): Force dark background on footer sections
        const isFooter = id.includes('footer');
        if (isFooter && isSection) {
          const footerBg = comp.props.backgroundColor?.value || comp.props.backgroundColor;
          const footerBgStr = typeof footerBg === 'string' ? footerBg : '';
          const isLightFooter = !footerBgStr || footerBgStr === '#ffffff' || footerBgStr === '#fff' || 
            footerBgStr === '#f9fafb' || footerBgStr === '#f3f4f6' || footerBgStr === '#fafafa' ||
            footerBgStr.startsWith('#f') || footerBgStr.startsWith('#e');
          if (isLightFooter) {
            comp.props.backgroundColor = { type: 'solid', value: '#111827', opacity: 100 };
            console.log(`[enhanceSeed single-phase] Forced dark footer background on ${id}`);
            const fixFooterText = (child: any) => {
              if (['text', 'heading', 'label', 'paragraph'].includes(child.type)) {
                child.props = child.props || {};
                child.props.typography = child.props.typography || {};
                const isHeadingChild = child.type === 'heading';
                child.props.typography.color = isHeadingChild ? '#ffffff' : 'rgba(255,255,255,0.85)';
                child.props.color = child.props.typography.color;
              }
              if (child.type === 'link') {
                child.props = child.props || {};
                child.props.typography = child.props.typography || {};
                child.props.typography.color = 'rgba(255,255,255,0.7)';
                child.props.color = 'rgba(255,255,255,0.7)';
              }
              if (Array.isArray(child.children)) child.children.forEach(fixFooterText);
            };
            if (Array.isArray(comp.children)) comp.children.forEach(fixFooterText);
          }
        }
        if (Array.isArray(comp.children)) comp.children = comp.children.map((c: any) => enhanceSeed(c, s, parentBg));
        return comp;
      };
      
      // Execute the phase
      const adjustedTimeout = Math.min(Math.round(phase.timeoutMs * modelMultiplier), 55000);
      // Generate per-phase entropy seed for non-predictive output
      const spEntropySeed = Math.floor(1000 + Math.random() * 9000);
      const spLayoutVariants = ['A', 'B', 'C', 'D', 'E'];
      const spLayoutVariant = spLayoutVariants[Math.floor(Math.random() * spLayoutVariants.length)];
      
      const phasePrompt = sanitizePromptString(`
${STATIC_SYSTEM_PROMPT}

${designDirective}

${blueprintDirective}

USER REQUEST: ${prompt}
Analyze: Industry, Purpose, Target audience, Brand personality. Use this context for industry-appropriate content.

IMAGE CATALOG -- Use ONLY these real Unsplash URLs for images (pick the most relevant category):
${await buildImageCatalogForPrompt()}

For image components, set "src" to one of these URLs directly. For avatars, use URLs from the "people" category.
You may also use "imagePrompt" as a fallback description -- the system will auto-replace it with a matching URL.

CREATIVITY ENTROPY SEED: ${spEntropySeed}
Use this seed to make unique creative choices — different seeds MUST produce different designs.
Vary layout proportions, content ordering, visual emphasis, and section structure based on this number.

LAYOUT VARIANT PREFERENCE: ${spLayoutVariant}
For hero sections use variant ${spLayoutVariant}. For features/about/pricing/testimonials, pick a DIFFERENT variant than your default.
Do NOT always use the same layout — variety is mandatory.

PHASE: ${phase.name.toUpperCase()}
GENERATE ONLY: ${phase.sections.join(', ')}

${phase.instructions}

IMPORTANT:
- Generate ONLY the sections listed above
- Return valid JSON with "success": true and "steps" array
- Each step: { type: "component", data: { id, type, props, children } }
- NO placeholder text. ALL content must be specific and contextual.
- Every heading needs tabletStyles and mobileStyles for responsive typography.
`);
      
      try {
        const PHASE_TOKEN_BUDGETS_SP: Record<string, number> = {
          'foundation': 12000,
          'hero': 10000,
          'features': 10000,
          'pricing': 8000,
          'testimonials': 8000,
          'about': 8000,
          'team': 7000,
          'cta': 6000,
          'faq': 6000,
          'contact': 6000,
          'section-edit': 8000,
        };
        const phaseMaxTokens = PHASE_TOKEN_BUDGETS_SP[phaseName] || 8000;
        const response = await callAIModelWithTimeout(
          selectedModel,
          phasePrompt,
          prompt,
          phaseMaxTokens,
          0.85,
          adjustedTimeout
        );
        
        const parsed = resilientJsonParse(response);
        
        let steps: any[] = [];
        if (parsed.steps && Array.isArray(parsed.steps)) {
          steps = parsed.steps.filter((step: any) => {
            if (step.type !== 'component') return true;
            if (!step.data || typeof step.data !== 'object' || !step.data.type) return false;
            return true;
          });
        } else if (Array.isArray(parsed)) {
          steps = parsed.map((item: any) => ({ type: 'component', data: item }));
        }
        
        // Apply fixComponent and design seed enhancement
        const finalSteps = steps.map((step: any) => {
          if (step.type !== 'component' || !step.data) return step;
          
          const fixComponent = (comp: any): any => {
            if (!comp || typeof comp !== 'object') return comp;
            comp.props = comp.props || {};
            if (comp.type === 'button' && comp.props?.content && !comp.props?.text) {
              comp.props.text = comp.props.content;
              delete comp.props.content;
            }
            // Style → props conversion (same as generatePageInPhases)
            if (comp.style) {
              if (comp.style.layout) {
                const layout = comp.style.layout;
                ['display','flexDirection','gap','justifyContent','alignItems','flexWrap','gridTemplateColumns','gridTemplateRows','gridAutoFlow','overflow'].forEach(k => { if (layout[k]) comp.props[k] = k === 'gap' ? String(layout[k]) : layout[k]; });
                delete comp.style.layout;
              }
              if (comp.style.sizing) {
                ['width','height','minWidth','maxWidth','minHeight','maxHeight'].forEach(k => { if (comp.style.sizing[k]) comp.props[k] = comp.style.sizing[k]; });
                delete comp.style.sizing;
              }
              if (comp.style.spacing) {
                const spacing = comp.style.spacing;
                if (spacing.padding) {
                  comp.props.spacingControl = comp.props.spacingControl || {};
                  const p = spacing.padding;
                  if (typeof p === 'object') {
                    comp.props.spacingControl.padding = { top: String(p.top || 0), right: String(p.right || 0), bottom: String(p.bottom || 0), left: String(p.left || 0), unit: 'px' };
                  } else {
                    const val = String(p);
                    comp.props.spacingControl.padding = { top: val, right: val, bottom: val, left: val, unit: 'px' };
                  }
                }
                if (spacing.margin) {
                  comp.props.spacingControl = comp.props.spacingControl || {};
                  const m = spacing.margin;
                  if (typeof m === 'object') {
                    comp.props.spacingControl.margin = { top: String(m.top || 0), right: String(m.right || 0), bottom: String(m.bottom || 0), left: String(m.left || 0), unit: 'px' };
                  } else {
                    const val = String(m);
                    comp.props.spacingControl.margin = { top: val, right: val, bottom: val, left: val, unit: 'px' };
                  }
                }
                delete comp.style.spacing;
              }
              if (comp.style.background) {
                const bg = comp.style.background;
                if (bg.color && !comp.props.backgroundColor) comp.props.backgroundColor = { type: 'solid', value: bg.color, opacity: 100 };
                if (bg.gradient && !comp.props.backgroundGradient) comp.props.backgroundGradient = bg.gradient;
                delete comp.style.background;
              }
              if (comp.style.typography) {
                const typo = comp.style.typography;
                comp.props.typography = comp.props.typography || {};
                if (typo.fontSize) comp.props.typography.fontSize = String(typo.fontSize).replace('px', '');
                if (typo.fontWeight) comp.props.typography.fontWeight = String(typo.fontWeight);
                if (typo.color) comp.props.typography.color = typo.color;
                if (typo.textAlign) comp.props.typography.textAlign = typo.textAlign;
                if (typo.lineHeight) comp.props.typography.lineHeight = String(typo.lineHeight);
                if (typo.letterSpacing) comp.props.typography.letterSpacing = String(typo.letterSpacing);
                if (typo.fontFamily) comp.props.typography.fontFamily = typo.fontFamily;
                delete comp.style.typography;
              }
              if (comp.style.border) {
                const border = comp.style.border;
                if (border.radius && !comp.props.borderRadius) {
                  const r = String(border.radius);
                  comp.props.borderRadius = { topLeft: r, topRight: r, bottomRight: r, bottomLeft: r, unit: 'px' };
                }
                if (border.width && !comp.props.border) {
                  comp.props.border = { width: String(border.width), style: border.style || 'solid', color: border.color || 'hsl(var(--border))', unit: 'px', sides: { top: true, right: true, bottom: true, left: true } };
                }
                delete comp.style.border;
              }
              if (comp.style.shadow && !comp.props.boxShadows) {
                const s = comp.style.shadow;
                comp.props.boxShadows = [{ enabled: true, type: 'outer', x: s.x || 0, y: s.y || 8, blur: s.blur || 24, spread: s.spread || -4, color: s.color || 'rgba(0,0,0,0.12)' }];
                delete comp.style.shadow;
              }
              ['backdropFilter','opacity','cursor','pointerEvents','position','top','right','bottom','left','zIndex','transform','transition','hoverTransform','hoverShadow','filter'].forEach(key => {
                if (comp.style[key] !== undefined && comp.props[key] === undefined) { comp.props[key] = comp.style[key]; delete comp.style[key]; }
              });
            }
            if (Array.isArray(comp.children)) comp.children = comp.children.map(fixComponent);
            return comp;
          };
          
          step.data = normalizeAIWallStyleProps(step.data);
          step.data = fixComponent(step.data);
          step.data = enhanceSeed(step.data, seed);
          return step;
        });
        
        console.log(`[AI Build] single-phase "${phaseName}" complete: ${finalSteps.length} components`);
        
        // If phase returned 0 valid components, return empty with recoverable flag
        // (frontend handles retry logic to avoid doubling wait time)
        if (finalSteps.length === 0) {
          console.warn(`[AI Build] single-phase "${phaseName}" returned 0 components — marking recoverable`);
          return new Response(JSON.stringify({
            success: true,
            mode: 'single-phase',
            phaseName,
            steps: [],
            recoverable: true,
            warning: `Phase "${phaseName}" produced 0 components`,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        
        return new Response(JSON.stringify({
          success: true,
          mode: 'single-phase',
          phaseName,
          steps: finalSteps,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        
      } catch (error: any) {
        console.error(`[AI Build] single-phase "${phaseName}" failed:`, error.message);
        
        if (error.message === 'RATE_LIMIT' || error.message.includes('RATE_LIMIT')) {
          return new Response(JSON.stringify({
            success: false,
            mode: 'single-phase',
            phaseName,
            error: 'Rate limited — will retry',
            isRateLimited: true,
            recoverable: true,
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        
        if (phase.required) {
          return new Response(JSON.stringify({
            success: false,
            mode: 'single-phase',
            phaseName,
            error: error.message,
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        
        // Non-required phase failure — return empty steps with diagnostic info
        const isAuthError = error.message === 'AUTH_FAILED' || error.message.includes('AUTH_FAILED');
        return new Response(JSON.stringify({
          success: true,
          mode: 'single-phase',
          phaseName,
          steps: [],
          warning: `Phase "${phaseName}" failed: ${error.message}`,
          authError: isAuthError,
          recoverable: true,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // API key validation is now handled per-provider in callAIModel function

    // ═══════════════════════════════════════════════════════════════════════════════
    // PROMPT INTENT ANALYSIS - Determines if user wants full page or focused component
    // ═══════════════════════════════════════════════════════════════════════════════
    currentPromptAnalysis = analyzePromptIntent(prompt);
    console.log(`[AI Build] Prompt analysis:`, JSON.stringify(currentPromptAnalysis));
    
    // Generate intent-specific prompt section
    const getIntentSpecificPrompt = (): string => {
      if (currentPromptAnalysis.intent === 'single_section' || currentPromptAnalysis.intent === 'component') {
        // FOCUSED PROMPT - Generate ONLY what was asked
        return `
═══════════════════════════════════════════════════════════════════════════════
FOCUSED REQUEST MODE - GENERATE ONLY WHAT WAS ASKED
═══════════════════════════════════════════════════════════════════════════════

The user is asking for a SPECIFIC ${(currentPromptAnalysis.focusedElement || 'COMPONENT').toUpperCase()}.

CRITICAL RULES FOR FOCUSED REQUESTS:
1. Generate ONLY the specific ${currentPromptAnalysis.focusedElement || 'component/section'} requested
2. Do NOT add navigation bars, footers, or other sections
3. Do NOT generate a "complete page" - just the focused element
4. The output should be 1-2 sections MAXIMUM
5. Make it BEAUTIFUL and COMPLETE as a standalone element

CORRECT APPROACH:
- "create a login form" → Generate ONLY a login section (no nav, no footer)
- "make a pricing table" → Generate ONLY the pricing section
- "add a contact form" → Generate ONLY the contact form section

WRONG APPROACH:
- Adding 6 sections when user asked for a form
- Including navigation when user asked for a single component
- Generating a complete website when user asked for one element

═══════════════════════════════════════════════════════════════════════════════
`;
      } else {
        // FULL PAGE PROMPT - Generate complete website
        return `
═══════════════════════════════════════════════════════════════════════════════
CRITICAL ENFORCEMENT - COMPLETE PAGES (READ THIS FIRST!)
═══════════════════════════════════════════════════════════════════════════════

You are generating COMPLETE, PROFESSIONAL WEBSITES - NOT single sections!

FOR ANY PAGE REQUEST, YOU MUST GENERATE ALL OF THESE:
1. Navigation bar (with logo, links, CTA - ALL ON ONE HORIZONTAL LINE using flexDirection: "row")
2. Hero section (with headline, subtitle, CTAs, social icons with brandIcon prop, and visual depth)
3. AT LEAST 3-5 additional content sections based on page type
4. Footer section

NEVER generate just a hero and stop. ALWAYS generate the full page structure.

If the user asks for a "portfolio", generate: Nav + Hero + About + Skills + Projects + Testimonials + Contact + Footer (7-8 sections minimum)

If the user asks for a "landing page", generate: Nav + Hero + Features + How It Works + Pricing + Testimonials + CTA + Footer (7-8 sections minimum)

SOCIAL ICONS ARE MANDATORY FOR PORTFOLIO PAGES:
- Use brandIcon prop on buttons: { "type": "button", "props": { "brandIcon": "github", "variant": "ghost" } }
- Include in hero section: GitHub, LinkedIn, Twitter links

═══════════════════════════════════════════════════════════════════════════════
CRITICAL E-COMMERCE GRID ENFORCEMENT (NON-NEGOTIABLE!)
═══════════════════════════════════════════════════════════════════════════════

For ANY e-commerce, fashion, boutique, luxury, shop, or product page:

1. PRODUCTS MUST USE CSS GRID:
   - display: "grid"
   - gridTemplateColumns: "repeat(4, 1fr)"  (NEVER flex column!)
   - gap: "24px" or "32px"
   
2. PRODUCT GRID RESPONSIVE:
   - Tablet: gridTemplateColumns: "repeat(2, 1fr)"
   - Mobile: gridTemplateColumns: "1fr"

3. EVERY PRODUCT CARD MUST HAVE:
   - Unique, evocative product name (e.g., "Velvet Cascade Dress", "Midnight Ember Coat")
   - Creative 1-2 line description that evokes emotion
   - Realistic price ($79, $129, $245, $389, etc.)
   - imagePrompt for professional product photography
   - Hover state: transform scale(1.02), subtle shadow

4. GENERATE EXACTLY 4 PRODUCT CARDS MINIMUM
   - Never 1, 2, or 3 cards
   - Cards must be visually rich with proper styling

5. PRODUCT CARD STRUCTURE:
   {
     "id": "product-card-1",
     "type": "div",
     "props": {
       "display": "flex",
       "flexDirection": "column",
       "borderRadius": "12px",
       "overflow": "hidden"
     },
     "children": [
       { "type": "image", "props": { "imagePrompt": "..." } },
       { "type": "heading", "props": { "content": "Velvet Cascade Dress", "level": 3 } },
       { "type": "text", "props": { "content": "Flowing silk with hand-stitched details" } },
       { "type": "text", "props": { "content": "$289" } }
     ]
   }

═══════════════════════════════════════════════════════════════════════════════
`;
      }
    };

const systemPrompt = `You are an EXPERT UI DESIGNER creating STUNNING, LOVABLE-QUALITY web applications.

${getIntentSpecificPrompt()}

ANTI-EMPTY CONTENT RULES:
- Every section MUST have real, meaningful content — no placeholder text like "Lorem ipsum"
- Every card/item/feature must have a real title, real description, and real icon
- Pricing sections must have real plan names, real features list, real prices
- Testimonials must have real names, real companies, real quotes
- Never leave children arrays empty — every container must have visible content

VISUAL POLISH STANDARDS:
- Use generous padding to create breathing room (never less than 60px vertical on sections)
- Create clear visual hierarchy: headline → subtext → CTA → supporting content
- Ensure color contrast is high enough for readability
- Use consistent border-radius across all card elements in the same section
- Buttons must have hover states defined via the "hover" prop object

CRITICAL SIZING RULES - NO VIEWPORT HEIGHTS!
═══════════════════════════════════════════════════════════════════════════════

ALL SECTIONS USE CONTENT-DRIVEN HEIGHT:
- NEVER use minHeight: "90vh", "100vh", or any viewport-based heights
- ALL sections including hero MUST use: "sizing": { "width": "100%", "height": "auto" }
- Use generous PADDING (100-120px vertical) to give sections proper visual weight
- Sections should size to their content naturally, like Lovable's own pages
- This prevents excessive empty space and ensures proper stacking

CORRECT HERO EXAMPLE:
{
  "style": {
    "sizing": { "width": "100%", "height": "auto" },
    "spacing": { "padding": { "top": 120, "right": 24, "bottom": 120, "left": 24 } }
  }
}

WRONG (NEVER DO THIS):
{
  "style": { "sizing": { "minHeight": "90vh" } }  // ❌ Creates excessive empty space
}

═══════════════════════════════════════════════════════════════════════════════

YOUR GOAL: Create VISUALLY BEAUTIFUL, PROFESSIONAL, production-ready UI that looks like it was designed by a top agency.

CRITICAL DESIGN PHILOSOPHY:
1. NEVER create plain, unstyled forms directly on a page
2. ALWAYS use split-screen layouts for auth pages (gradient hero left, form right)
3. ALWAYS include trust elements (badges, stats, social proof)
4. ALWAYS add social login options to auth forms
5. ALWAYS use beautiful gradients on hero sections
6. ALWAYS apply glass-morphism effects on gradient backgrounds
7. ALWAYS include social icons in portfolio hero sections using brandIcon prop
8. ALWAYS generate complete multi-section pages (6-8 sections minimum)
9. NEVER use viewport heights (90vh/100vh) - use height: auto with padding

⚠️⚠️⚠️ CRITICAL CONTENT QUALITY - NEVER USE PLACEHOLDER TEXT ⚠️⚠️⚠️

BANNED PLACEHOLDER TEXT (NEVER USE THESE):
- "Link text", "Link 1", "Link 2", "Link 3", "Link 4"
- "BrandName", "Logo Text", "Company Name"
- "Lorem ipsum", "Sample text", "Placeholder"
- "Button text", "Click here", "Learn more" (be more specific)
- "Feature 1", "Feature 2", "Feature 3"
- "Title Here", "Heading", "Subheading"
- Any generic placeholder that doesn't reflect the user's context

ALWAYS CREATE MEANINGFUL CONTENT:
- Brand name: Derive from user prompt or create creative relevant name
- Navigation links: Use industry-appropriate links (Shop, Collections, Features, Pricing, About, Contact)
- Button text: Be specific ("Shop Now", "Start Free Trial", "Book a Call", "Get Started")
- Headings: Create compelling industry-specific copy
- Descriptions: Write relevant, engaging content that matches the user's industry

${NAVBAR_STRUCTURE_GUIDELINES}

${INDUSTRY_DESIGN_RECIPES}

${AVAILABLE_COMPONENTS}

${COMPONENT_PROP_SCHEMAS}

${STYLE_SYSTEM}

${CLASS_SYSTEM}

${COMPLETE_VARIABLE_SYSTEM}

${COMPLETE_ACTION_SYSTEM}

${PROFESSIONAL_PAGE_TEMPLATES}

${MANDATORY_TEMPLATE_COMPLIANCE}

${SECTION_CREATIVITY_RULES}

${COMPLETE_SECTION_TEMPLATES}

${MODERN_DESIGN_INSPIRATION}

${COMPONENT_HIERARCHY_RULES}

${DESIGN_PATTERNS}

${ANIMATION_SYSTEM}

${VARIETY_ENFORCEMENT}

${MODERN_STANDARDS}

${STATE_STYLES_RULES}

═══════════════════════════════════════════════════
DESIGN BEST PRACTICES (Recommended Patterns):
═══════════════════════════════════════════════════

These are proven patterns that work well - use them as guidance while applying your creative vision:

1. AUTH PAGES (Login, Signup, Reset Password):
   - Recommended: split-screen layout (gradient hero left, form right)
   - Consider: trust badges, glass-morphism stats cards, feature pills
   - Include: social login buttons (Google, Apple) with divider
   - Include: "Forgot password?" and "Create account" links
   - Alternative: centered card with gradient background is also valid

2. LANDING PAGES:
   - Recommended: hero section with gradient or strong visual background
   - Consider: announcement badge at top for impact
   - Use: large headline (48-56px) for visual hierarchy
   - Include: dual CTA buttons (primary + secondary)
   - Add: trust logos/social proof for credibility
   - Generate: 6-8 complete sections for comprehensive experience

3. CONTACT/LEAD FORMS:
   - Recommended: split-screen (info panel left, form right)
   - Include: contact methods, office info, map
   - Alternative: centered card with rich surrounding content

4. GENERAL STYLING (Adapt to your creative vision):
   - Cards: border-radius 0 for editorial, 12-24px for modern
   - Shadows: deep for depth, subtle for minimal
   - Typography: Large headlines (32-56px), clear hierarchy
   - Colors: Use semantic tokens for consistency

5. NAVIGATION BAR LAYOUT:
   {
     "id": "nav-section",
     "type": "section",
     "style": { "layout": { "display": "flex", "justifyContent": "center" }, "sizing": { "width": "100%", "height": "auto" }, "spacing": { "padding": { "top": 16, "right": 32, "bottom": 16, "left": 32 } } },
     "children": [{
       "id": "nav-container",
       "type": "div",
       "style": { "layout": { "display": "flex", "flexDirection": "row", "justifyContent": "space-between", "alignItems": "center" }, "sizing": { "width": "100%", "maxWidth": "1200px" } },
       "children": [
          { "id": "nav-logo", "type": "heading", "props": { "content": "BRAND", "tag": "h3" }, "style": { "typography": { "fontSize": "22px", "fontWeight": "800", "letterSpacing": "0.08em", "textTransform": "uppercase" }, "spacing": { "marginRight": 48 } } },
          { "id": "nav-links", "type": "div", "style": { "layout": { "display": "flex", "flexDirection": "row", "gap": 32, "alignItems": "center" } }, "children": [
            { "type": "text", "props": { "content": "About" }, "style": { "typography": { "fontWeight": "400", "fontSize": "15px" } } },
             { "type": "text", "props": { "content": "Work" }, "style": { "typography": { "fontWeight": "400", "fontSize": "15px" } } },
             { "type": "text", "props": { "content": "Contact" }, "style": { "typography": { "fontWeight": "400", "fontSize": "15px" } } }
           ]},
           { "id": "nav-actions", "type": "div", 
             "style": { "layout": { "display": "flex", "flexDirection": "row", "alignItems": "center", "gap": 16 } },
             "children": [
               { "type": "button", "props": { "text": "", "icon": "Search", "variant": "ghost" } },
               { "type": "button", "props": { "text": "", "icon": "ShoppingBag", "variant": "ghost" } },
               { "id": "nav-cta", "type": "button", "props": { "content": "Sign In" } }
             ]
           }
         ]
       }]
     }
   - CRITICAL: nav-container MUST use flexDirection: "row" and justifyContent: "space-between"
   - NEVER use flexDirection: "column" for navigation containers
   
   BRAND LOGO STYLING (MANDATORY - DISTINCTIVE BRAND IDENTITY):
   - nav-logo MUST use fontWeight: 800 (extra-bold) - NEVER the same as nav links
   - nav-logo MUST use letterSpacing: 0.05em to 0.12em for modern appeal
   - nav-logo SHOULD use textTransform: "uppercase" for modern brands
   - nav-logo MUST have marginRight: 48 to visually separate from nav-links
   - Brand names must be CLEAR and DISTINCT from navigation link text
   - Navigation links MUST use lighter weight (400-500) than brand logo (800)
   - NEVER: Same font weight or styling between logo and links
   
   NAVIGATION RIGHT-SIDE GROUPING (MANDATORY):
   - ALWAYS group Search, Cart, Account, and CTA buttons in a wrapper div
   - Use ID like "nav-actions" or "nav-right" for this wrapper
   - The wrapper MUST have: display: flex, flexDirection: row, alignItems: center, gap: 16
   - NEVER place CTA buttons and icons as separate siblings in nav-container - always group them
   - Nav links MUST be in a horizontal row with flexDirection: "row"

6. FORM FIELDS MUST BE WRAPPED:
   {
     "type": "div",
     "style": { "layout": { "display": "flex", "flexDirection": "column", "gap": 6 } },
     "children": [
       { "type": "label", ... },
       { "type": "input", ... }
     ]
   }

6B. EMAIL SIGNUP / NEWSLETTER ROW LAYOUT (CRITICAL - HORIZONTAL NOT VERTICAL):
    - ALWAYS wrap email input + button pairs in a container div
    - The wrapper MUST have flexDirection: "row" (NEVER column in CTA sections)
    - Use IDs like "email-signup-row", "newsletter-row", "signup-form"
    - MANDATORY EXAMPLE:
    {
      "id": "email-signup-row",
      "type": "div",
      "style": {
        "layout": { "display": "flex", "flexDirection": "row", "alignItems": "center", "justifyContent": "center", "gap": 12, "flexWrap": "wrap" }
      },
      "children": [
        { "type": "input", "props": { "placeholder": "Enter your email", "type": "email" }, "style": { "sizing": { "minWidth": "280px" } } },
        { "type": "button", "props": { "content": "Sign Up" } }
      ]
    }
    - NEVER place input and button as direct siblings inside a column-layout CTA section
    - The input+button row should be a child of the centered CTA content container

7. TYPOGRAPHY HIERARCHY:
   - Page title: 40-56px, 700-800 weight
   - Section headings: 28-40px, 600-700 weight
   - Card titles: 20-28px, 600 weight
   - Body text: 15-18px, 400 weight
   - Labels: 14px, 500 weight

8. FOR INTERACTIVE APPS:
   - ALWAYS create variables FIRST
   - Bind inputs to variables with "{{scope.variableName}}"
   - Add action flows for interactivity

9. COMPLETE PAGES (Portfolio, Landing, Marketing, Product):
   - MUST generate 6-8 sections for complete pages
   - MUST include: Nav, Hero, 3+ content sections, CTA, Footer
   - MUST vary section backgrounds and layouts
   - MUST include proper section headers (badge + title + subtitle pattern)
   - NEVER stop after just the hero section
   - NEVER leave empty space - fill with relevant content, cards, testimonials, features

═══════════════════════════════════════════════════════════════════════════════
MANDATORY SECTION CHECKLIST - VERIFY BEFORE RESPONDING (CRITICAL!):
═══════════════════════════════════════════════════════════════════════════════

Before returning your response, CHECK that you have generated ALL required sections:

FOR PORTFOLIO/DEVELOPER PAGES (MUST HAVE ALL):
□ nav-section (navigation bar with logo, links, CTA)
□ hero-section (headline, subtitle, CTAs, social icons with brandIcon)
□ about-section (bio, photo, skills overview)
□ projects-section (3-4 project cards minimum)
□ testimonials-section (3 testimonial cards minimum) - OPTIONAL but recommended
□ contact-section (CTA with buttons OR contact form)
□ footer-section (links, social icons, copyright)

FOR LANDING PAGES (MUST HAVE ALL):
□ nav-section
□ hero-section  
□ features-section (3+ feature cards)
□ how-it-works-section OR pricing-section
□ testimonials-section OR social-proof-section - OPTIONAL but recommended
□ cta-section (final call-to-action)
□ footer-section

FOR E-COMMERCE PAGES (MUST HAVE ALL):
□ nav-section (with search + cart icons)
□ hero-section
□ products-section (4+ product cards)
□ categories-section OR about-section - OPTIONAL
□ newsletter-section OR cta-section
□ footer-section

⚠️ FAILURE TO INCLUDE ALL REQUIRED SECTIONS = INCOMPLETE OUTPUT = REJECTED
⚠️ The client-side validator will AUTO-INJECT missing sections with fallback templates

NEVER skip the Contact/CTA section
NEVER skip the Footer section
NEVER return fewer than 5 top-level sections


═══════════════════════════════════════════════════════════════════════════════
HERO SECTION LAYOUT RULES (CRITICAL - PREVENT EMPTY SPACE):
═══════════════════════════════════════════════════════════════════════════════
- FILL the hero space with content - never leave large empty areas
- Use split-screen layouts (50/50 or 60/40) with image/illustration on one side
- Include MULTIPLE elements: badge, headline, subtext, buttons, stats row, trust logos
- If centered layout, stack MULTIPLE rows of content (headline block + feature pills + CTA row + social proof)
- Target MINIMUM 4-5 distinct visual elements in hero (not just text + button)
- For heroes, explicitly set alignItems and justifyContent based on your design intent
- Use flexDirection: "row" for split-screen, flexDirection: "column" for stacked

SPLIT-SCREEN HERO TEMPLATE (MANDATORY 50/50 STRUCTURE):
For split-screen heroes, ALWAYS use this explicit structure with 50% widths:
{
  "id": "hero-section",
  "type": "section",
  "style": {
    "layout": { "display": "flex", "flexDirection": "row", "alignItems": "stretch", "gap": 0 },
    "sizing": { "width": "100%", "minHeight": "500px" },
    "spacing": { "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 } }
  },
  "children": [
    {
      "id": "hero-image-container",
      "type": "div",
      "style": {
        "sizing": { "width": "50%", "minWidth": "50%", "flexBasis": "50%", "flexShrink": 0, "flexGrow": 0 },
        "layout": { "display": "flex" }
      },
      "children": [
        { "type": "image", "props": { "imagePrompt": "[PRODUCT/HERO IMAGE]", "objectFit": "cover" }, "style": { "sizing": { "width": "100%", "height": "100%" } } }
      ]
    },
    {
      "id": "hero-content",
      "type": "div",
      "style": {
        "sizing": { "width": "50%", "minWidth": "50%", "flexBasis": "50%", "flexShrink": 0, "flexGrow": 0 },
        "layout": { "display": "flex", "flexDirection": "column", "alignItems": "flex-start", "justifyContent": "center", "gap": 24 },
        "spacing": { "padding": { "top": 60, "right": 48, "bottom": 60, "left": 48 } }
      },
      "children": [
        { "id": "hero-title", "type": "heading", "props": { "content": "HEADLINE", "tag": "h1" } },
        { "id": "hero-subtitle", "type": "text", "props": { "content": "Subtitle text" } },
        { "id": "hero-cta-row", "type": "div", "style": { "layout": { "display": "flex", "flexDirection": "row", "gap": 12 } }, "children": [...buttons...] }
      ]
    }
  ]
}

ANTI-EMPTY-SPACE RULES:
- Every section should feel "full" and purposeful
- Use visual elements to fill space: decorative shapes, images, icons, badges
- Include secondary information (stats, social proof, trust badges, floating elements)
- When in doubt, ADD more content elements not fewer
- Prefer compact padding (40-60px vertical) over excessive whitespace

═══════════════════════════════════════════════════════════════════════════════
MANDATORY ITEM COUNTS (NEVER GENERATE LESS - SYSTEM ENFORCES THESE MINIMUMS):
═══════════════════════════════════════════════════════════════════════════════
- Skills/Technology cards: MINIMUM 6 cards (NOT 3! - generate 6-8 skill cards)
- Testimonial cards: MINIMUM 3 testimonials (NOT 1! - generate 3 complete testimonials)
- Project cards: MINIMUM 3 projects (generate 3-4 project cards with full details)
- Feature cards: MINIMUM 4 features (generate 4-6 feature cards)
- Pricing tiers: EXACTLY 3 tiers (Basic, Pro, Enterprise pattern)
- Team members: MINIMUM 3 profiles if including team section
- Stats/Metrics: MINIMUM 4 stat items (e.g., "500+ Projects", "100+ Clients")

⚠️ WARNING: If you generate fewer items than these minimums, they will be auto-duplicated!
Generate COMPLETE content for EACH card - never leave placeholders.

═══════════════════════════════════════════════════════════════════════════════
DECORATIVE ELEMENTS (ADD FOR VISUAL POLISH):
═══════════════════════════════════════════════════════════════════════════════
Add at least 2-3 decorative elements per page for visual interest:
- Gradient orbs/blobs (absolute positioned, blurred radial gradients)
- Grid patterns or dot grids in section backgrounds
- Floating shapes (circles, rectangles at low opacity)
- Divider lines between sections
- Background textures (subtle noise, grain effects)

SECTION MINIMUMS: Skills=6+ cards, Projects=3+ cards, Testimonials=3 cards, Footer=4 columns. Each card: icon+title+description+hover effect. No sparse sections!

10. PORTFOLIO/PERSONAL PAGES MUST INCLUDE ALL OF THESE:
    - Navigation bar (horizontal layout with logo | links | CTA)
    - Hero section with:
      * Availability badge ("✦ Available for freelance work")
      * Large name/headline (56-64px font)
      * Role/subtitle
      * Dual CTA buttons (View Work, Download CV)
      * SOCIAL ICONS ROW using brandIcon prop (GitHub, LinkedIn, Twitter) - MANDATORY!
      * Scroll indicator OR decorative gradient orb
    - About section with bio and image placeholder
    - Skills section with 6-8 technology cards with icons (MINIMUM 6!)
    - Projects grid with 3-4 project cards (image placeholder + title + description)
    - Testimonials section with 3 client quote cards (MINIMUM 3!)
    - Contact/CTA section with centered button group
    - Footer with links and social icons

11. LANDING/MARKETING PAGES MUST INCLUDE:
    - Navigation bar with logo, links, and CTA button
    - Hero with headline, subtitle, dual CTAs, and trust logos
    - Features grid (3-6 features with icons)
    - How it works section (3 numbered steps)
    - Testimonials from customers
    - Pricing section (if applicable)
    - Final CTA section
    - Footer with links, newsletter, and copyright

12. SECTION HEADER PATTERN (USE FOR EACH CONTENT SECTION):
    {
      "type": "div",
      "style": { "layout": { "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": 16 } },
      "children": [
        { "type": "badge", "props": { "content": "SECTION LABEL" }, "style": { "background": { "color": "hsl(var(--primary) / 0.1)" }, "typography": { "fontSize": "12px", "fontWeight": "600", "color": "hsl(var(--primary))" }, "spacing": { "padding": { "top": 6, "right": 12, "bottom": 6, "left": 12 } }, "border": { "radius": 9999 } } },
        { "type": "heading", "props": { "content": "Section Title", "tag": "h2" }, "style": { "typography": { "fontSize": "40px", "fontWeight": "700", "textAlign": "center", "color": "hsl(var(--foreground))" } } },
        { "type": "text", "props": { "content": "Section description goes here" }, "style": { "typography": { "fontSize": "18px", "color": "hsl(var(--muted-foreground))", "textAlign": "center" }, "sizing": { "maxWidth": "600px" } } }
      ]
    }

13. ICON USAGE STANDARDS:
    - Navigation icons: 20-24px
    - Social link icons: Use brandIcon prop on buttons (github, linkedin, twitter)
    - Feature card icons: 32-48px with primary color
    - Hero decorative icons: 48-64px
    - Button icons (iconName prop): 16-20px (match text size)
    - Example: { "type": "icon", "props": { "iconName": "Zap" }, "style": { "sizing": { "width": "40px", "height": "40px" }, "typography": { "color": "hsl(var(--primary))" } } }

PROJECT CARD CRITICAL RULES (NEVER VIOLATE):
    - Project cards MUST use flexDirection: "column" (NOT position absolute)
    - Image section MUST come FIRST with fixed height: "200px" and flexShrink: 0
    - Content section MUST stack BELOW the image (not overlay)
    - NEVER use position: "absolute" for project card images
    - Card structure: { "layout": { "display": "flex", "flexDirection": "column" }, "overflow": "hidden" }

NAVIGATION SPACING CRITICAL RULES:
    - nav-container MUST have gap: 32 between elements
    - Logo and links should NEVER merge together visually
    - Use "text" component for nav links (NOT "link")

═══════════════════════════════════════════════════════════════════════════════
SEMANTIC NAMING RULES - MANDATORY FOR ALL COMPONENTS (CRITICAL!)
═══════════════════════════════════════════════════════════════════════════════

Every component MUST have a meaningful "id" that describes its purpose.
These IDs become layer names in the builder AND class names in exported code.

SECTION IDs (use exactly these patterns):
- "nav-section", "hero-section", "about-section", "skills-section"
- "projects-section", "testimonials-section", "contact-section", "footer-section"
- "features-section", "pricing-section", "cta-section", "faq-section"

CONTAINER IDs (describe their role):
- "nav-container", "hero-content", "hero-cta-row", "about-content-grid"
- "skills-grid", "projects-grid", "testimonials-grid", "footer-links"
- "feature-cards-row", "pricing-cards", "stats-row", "social-links-row"

HEADING IDs (section + purpose):
- "hero-headline", "hero-subheadline", "about-title", "skills-title"
- "projects-title", "testimonials-title", "cta-headline", "footer-brand"

TEXT IDs (section + purpose):
- "hero-description", "about-bio", "hero-tagline", "cta-description"
- "footer-copyright", "nav-link-about", "nav-link-work", "nav-link-contact"

BUTTON IDs (action + context):
- "cta-primary", "cta-secondary", "nav-cta", "contact-submit"
- "hero-view-work", "hero-download-cv", "footer-hire-me"

CARD IDs (item type + number):
- "skill-card-1", "skill-card-2", "project-card-1", "project-card-2"
- "testimonial-card-1", "pricing-card-basic", "pricing-card-pro"
- "feature-card-1", "stat-card-1", "team-member-1"

IMAGE IDs (purpose + context):
- "hero-avatar", "about-photo", "project-1-thumbnail", "project-2-thumbnail"
- "testimonial-1-avatar", "client-logo-1", "team-photo-1"

CHILD ELEMENT IDs (parent-context):
- "project-1-title", "project-1-description", "project-1-link"
- "testimonial-1-quote", "testimonial-1-author", "testimonial-1-role"
- "skill-1-icon", "skill-1-name", "feature-1-title", "feature-1-description"

SOCIAL BUTTON IDs:
- "social-github", "social-linkedin", "social-twitter", "social-dribbble"

FORM ELEMENT IDs:
- "contact-form", "contact-name-input", "contact-email-input"
- "contact-message-input", "contact-submit-btn", "newsletter-input"

BADGES AND DECORATIVE:
- "availability-badge", "hero-badge", "section-badge", "scroll-indicator"

═══════════════════════════════════════════════════════════════════════════════
NEVER USE THESE GENERIC ID PATTERNS:
═══════════════════════════════════════════════════════════════════════════════

❌ FORBIDDEN (Never generate these):
- "div-1", "div-2", "div-123" (generic div with number)
- "section-1", "section-2" (generic section with number)
- "heading-66", "text-145", "button-59" (random numbers)
- "component-abc123" (random hash)
- Any ID with timestamps like "div-1737123456789"
- Any ID with random strings like "container-x8f9k2"

✅ CORRECT (Always use semantic names):
- "hero-section" instead of "section-1"
- "nav-container" instead of "div-1"
- "hero-headline" instead of "heading-1"
- "cta-primary" instead of "button-1"
- "project-card-1" instead of "div-123"
- "skills-grid" instead of "container-x8f9k2"

EXAMPLE - COMPLETE PORTFOLIO PAGE IDs:
{
  "id": "nav-section",
  "children": [
    { "id": "nav-container", "children": [
      { "id": "nav-logo" },
      { "id": "nav-links", "children": [
        { "id": "nav-link-about" },
        { "id": "nav-link-work" },
        { "id": "nav-link-contact" }
      ]},
      { "id": "nav-cta" }
    ]}
  ]
},
{
  "id": "hero-section",
  "children": [
    { "id": "hero-content", "children": [
      { "id": "availability-badge" },
      { "id": "hero-headline" },
      { "id": "hero-description" },
      { "id": "hero-cta-row", "children": [
        { "id": "cta-primary" },
        { "id": "cta-secondary" }
      ]},
      { "id": "social-links-row", "children": [
        { "id": "social-github" },
        { "id": "social-linkedin" },
        { "id": "social-twitter" }
      ]}
    ]}
  ]
},
{
  "id": "projects-section",
  "children": [
    { "id": "projects-header", "children": [
      { "id": "projects-badge" },
      { "id": "projects-title" },
      { "id": "projects-subtitle" }
    ]},
    { "id": "projects-grid", "children": [
      { "id": "project-card-1", "children": [
        { "id": "project-1-thumbnail" },
        { "id": "project-1-content", "children": [
          { "id": "project-1-title" },
          { "id": "project-1-description" },
          { "id": "project-1-tags" },
          { "id": "project-1-link" }
        ]}
      ]},
      { "id": "project-card-2", "children": [...] },
      { "id": "project-card-3", "children": [...] }
    ]}
  ]
}

═══════════════════════════════════════════════════════════════════════════════
COLOR CONTRAST & VISIBILITY RULES (CRITICAL - NEVER VIOLATE):
═══════════════════════════════════════════════════════════════════════════════

RULE: EVERY text element MUST have sufficient contrast with its background.

DARK BACKGROUNDS (gradients, #0-4 hex, slate, navy, dark colors):
  - ALL text MUST be white or light: "white", "rgba(255,255,255,0.9)", "#ffffff"
  - Muted text: "rgba(255,255,255,0.7)" or "rgba(255,255,255,0.6)"
  - NEVER use "hsl(var(--foreground))" on dark backgrounds
  - NEVER use dark colors like "#1a1a2e" or "hsl(var(--muted-foreground))"

LIGHT BACKGROUNDS (hsl(var(--background)), hsl(var(--card)), white, #f-#e hex):
  - ALL text MUST be dark: "hsl(var(--foreground))", "#1a1a2e"
  - Muted text: "hsl(var(--muted-foreground))"
  - NEVER use "white" or light colors on light backgrounds

COLOR PAIRING EXAMPLES:

HERO WITH GRADIENT BACKGROUND:
{
  "background": { "gradient": "linear-gradient(135deg, #0d9488 0%, #06b6d4 50%, #3b82f6 100%)" },
  "children": [
    { "type": "heading", "style": { "typography": { "color": "white" } } },
    { "type": "text", "style": { "typography": { "color": "rgba(255,255,255,0.8)" } } }
  ]
}

CONTENT SECTION WITH LIGHT BACKGROUND:
{
  "background": { "color": "hsl(var(--background))" },
  "children": [
    { "type": "heading", "style": { "typography": { "color": "hsl(var(--foreground))" } } },
    { "type": "text", "style": { "typography": { "color": "hsl(var(--muted-foreground))" } } }
  ]
}

CARD ON DARK SECTION:
{
  "background": { "color": "rgba(255,255,255,0.1)" },
  "backdropFilter": "blur(12px)",
  "children": [
    { "type": "heading", "style": { "typography": { "color": "white" } } },
    { "type": "text", "style": { "typography": { "color": "rgba(255,255,255,0.7)" } } }
  ]
}

═══════════════════════════════════════════════════════════════════════════════
CREATIVE DESIGN PRINCIPLES - UNIQUE, MODERN, NON-PREDICTIVE:
═══════════════════════════════════════════════════════════════════════════════

AVOID GENERIC/PREDICTIVE DESIGNS:
- NO default purple-blue gradients on every hero
- NO cookie-cutter layouts that look like every template
- VARY color palettes based on content/industry
- USE unexpected color combinations that still work

CREATIVE COLOR PALETTE SELECTION (choose based on context):

Tech/Developer Portfolio:
  - Hero: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" (dark slate)
  - Accent: "#10b981" (emerald), "#06b6d4" (cyan), or "#8b5cf6" (purple)
  - Text: white primary, rgba(255,255,255,0.7) secondary

Creative/Designer Portfolio:
  - Hero: "linear-gradient(135deg, #fdf4ff 0%, #fae8ff 50%, #f5d0fe 100%)" (soft pink)
  - Accent: "#d946ef" (fuchsia), "#ec4899" (pink)
  - Text: "#1a1a2e" primary (dark), "hsl(var(--muted-foreground))" secondary

Business/Corporate:
  - Hero: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)" (navy to blue)
  - Accent: "#3b82f6" (blue), "#0ea5e9" (sky)
  - Text: white primary, rgba(255,255,255,0.8) secondary

Wellness/Nature:
  - Hero: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%)" (soft green)
  - Accent: "#10b981" (emerald), "#059669" (teal)
  - Text: "#064e3b" (dark green) primary

Bold/Startup:
  - Hero: "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)" (purple to pink)
  - Accent: "#f97316" (orange), "#fbbf24" (yellow)
  - Text: white primary

Minimalist/Editorial:
  - Hero: "#ffffff" or "#fafafa" (clean white)
  - Accent: "#000000" or "#171717" (black)
  - Text: "#171717" primary, "#737373" secondary

LAYOUT CREATIVITY:
- Asymmetric grids (not always 3 equal columns)
- Overlapping elements with z-index
- Angled backgrounds or clip-path effects
- Large typography as a design element
- Strategic whitespace for breathing room
- Mix card sizes in grids (featured + regular)

MODERN DESIGN TRENDS TO APPLY:
- Glassmorphism on dark backgrounds
- Subtle gradients rather than flat colors
- Large rounded corners (16-24px)
- Generous padding (32-48px in cards)
- Micro-interactions (hover states)
- Typography hierarchy with size contrast (64px headline vs 16px body)

14. DETAILED HERO SECTION FOR PORTFOLIOS (ALL sections use height: auto - content-driven sizing):
    {
      "id": "hero-section",
      "type": "section",
      "comment": "HERO: Uses content-driven height with generous padding - NO viewport heights!",
      "style": {
        "layout": { "display": "flex", "flexDirection": "column", "alignItems": "center", "justifyContent": "center", "gap": 0 },
        "sizing": { "width": "100%", "height": "auto" },
        "spacing": { "padding": { "top": 120, "right": 24, "bottom": 120, "left": 24 } },
        "background": { "gradient": "linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }
      },
      "children": [
        {
          "id": "hero-content",
          "type": "div",
          "comment": "HERO CONTENT WRAPPER - MUST have alignItems: center for horizontal centering",
          "style": {
            "layout": { "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": 24 },
            "sizing": { "width": "100%", "maxWidth": "900px" }
          },
          "children": [
            { "id": "availability-badge", "type": "badge", "props": { "content": "✦ Available for freelance work" }, "style": { "background": { "color": "rgba(16,185,129,0.15)" }, "typography": { "fontSize": "13px", "color": "#10b981" }, "spacing": { "padding": { "top": 8, "right": 16, "bottom": 8, "left": 16 } }, "border": { "width": 1, "style": "solid", "color": "rgba(16,185,129,0.3)", "radius": 9999 } } },
            { "id": "hero-headline", "type": "heading", "props": { "content": "Full Stack Developer\\n& UI Designer", "tag": "h1" }, "style": { "typography": { "fontSize": "64px", "fontWeight": "800", "textAlign": "center", "color": "white", "lineHeight": "1.05" } } },
            { "id": "hero-description", "type": "text", "props": { "content": "I craft beautiful, high-performance web applications that users love." }, "style": { "typography": { "fontSize": "20px", "textAlign": "center", "color": "rgba(255,255,255,0.7)", "lineHeight": "1.6" }, "sizing": { "maxWidth": "600px" } } },
            { "id": "hero-cta-row", "type": "div", "style": { "layout": { "display": "flex", "flexDirection": "row", "alignItems": "center", "gap": 16 }, "spacing": { "margin": { "top": 8 } } }, "children": [
              { "id": "cta-primary", "type": "button", "props": { "text": "View My Work", "icon": "ArrowRight", "iconPosition": "right" }, "style": { "spacing": { "padding": { "top": 16, "right": 28, "bottom": 16, "left": 28 } }, "border": { "radius": 12 } } },
              { "id": "cta-secondary", "type": "button", "props": { "text": "Download CV", "variant": "outline", "icon": "Download", "iconPosition": "left" }, "style": { "spacing": { "padding": { "top": 16, "right": 28, "bottom": 16, "left": 28 } }, "typography": { "color": "white" }, "border": { "width": 1, "style": "solid", "color": "rgba(255,255,255,0.3)", "radius": 12 }, "background": { "color": "transparent" } } }
            ]},
            { "id": "social-links-row", "type": "div", "style": { "layout": { "display": "flex", "flexDirection": "row", "alignItems": "center", "gap": 12 }, "spacing": { "margin": { "top": 16 } } }, "children": [
              { "id": "social-github", "type": "button", "props": { "brandIcon": "github", "variant": "ghost" }, "style": { "sizing": { "width": "44px", "height": "44px" }, "spacing": { "padding": 0 }, "background": { "color": "rgba(255,255,255,0.1)" }, "border": { "radius": 12 } } },
              { "id": "social-linkedin", "type": "button", "props": { "brandIcon": "linkedin", "variant": "ghost" }, "style": { "sizing": { "width": "44px", "height": "44px" }, "spacing": { "padding": 0 }, "background": { "color": "rgba(255,255,255,0.1)" }, "border": { "radius": 12 } } },
              { "id": "social-twitter", "type": "button", "props": { "brandIcon": "twitter", "variant": "ghost" }, "style": { "sizing": { "width": "44px", "height": "44px" }, "spacing": { "padding": 0 }, "background": { "color": "rgba(255,255,255,0.1)" }, "border": { "radius": 12 } } }
            ]}
          ]
        },
        { "id": "scroll-indicator", "type": "div", "style": { "layout": { "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": 8 }, "spacing": { "margin": { "top": 40 } } }, "children": [
          { "id": "scroll-text", "type": "text", "props": { "content": "Scroll to explore" }, "style": { "typography": { "fontSize": "12px", "color": "rgba(255,255,255,0.4)" } } },
          { "id": "scroll-icon", "type": "icon", "props": { "iconName": "ChevronDown" }, "style": { "sizing": { "width": "20px", "height": "20px" }, "typography": { "color": "rgba(255,255,255,0.4)" } } }
        ]}
      ]
    }


15. CONTENT SECTION TEMPLATES (ALL use height: "auto" - NEVER minHeight on content sections):

ABOUT SECTION:
{
  "id": "about-section",
  "type": "section",
  "comment": "CONTENT SECTION: Uses height auto with padding for breathing room",
  "style": {
    "layout": { "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": 48 },
    "sizing": { "width": "100%", "height": "auto" },
    "spacing": { "padding": { "top": 100, "right": 24, "bottom": 100, "left": 24 } },
    "background": { "color": "hsl(var(--background))" }
  }
}

SKILLS/TECH SECTION:
{
  "id": "skills-section",
  "type": "section",
  "style": {
    "layout": { "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": 48 },
    "sizing": { "width": "100%", "height": "auto" },
    "spacing": { "padding": { "top": 100, "right": 24, "bottom": 100, "left": 24 } },
    "background": { "color": "hsl(var(--muted) / 0.3)" }
  }
}

PROJECTS SECTION:
{
  "id": "projects-section",
  "type": "section",
  "style": {
    "layout": { "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": 48 },
    "sizing": { "width": "100%", "height": "auto" },
    "spacing": { "padding": { "top": 100, "right": 24, "bottom": 100, "left": 24 } },
    "background": { "color": "hsl(var(--background))" }
  }
}

TESTIMONIALS SECTION:
{
  "id": "testimonials-section",
  "type": "section",
  "style": {
    "layout": { "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": 48 },
    "sizing": { "width": "100%", "height": "auto" },
    "spacing": { "padding": { "top": 100, "right": 24, "bottom": 100, "left": 24 } },
    "background": { "color": "hsl(var(--muted) / 0.3)" }
  }
}

CTA SECTION:
{
  "id": "cta-section",
  "type": "section",
  "style": {
    "layout": { "display": "flex", "flexDirection": "column", "alignItems": "center", "justifyContent": "center", "gap": 32 },
    "sizing": { "width": "100%", "height": "auto" },
    "spacing": { "padding": { "top": 100, "right": 24, "bottom": 100, "left": 24 } },
    "background": { "gradient": "linear-gradient(135deg, #0d9488 0%, #3b82f6 100%)" }
  }
}

FOOTER SECTION (COMPLETE STRUCTURE - ALWAYS GENERATE):
{
  "id": "footer-section",
  "type": "section",
  "style": {
    "layout": { "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": 48 },
    "sizing": { "width": "100%", "height": "auto" },
    "spacing": { "padding": { "top": 64, "right": 24, "bottom": 32, "left": 24 } },
    "background": { "color": "hsl(var(--card))" },
    "border": { "width": 1, "style": "solid", "color": "hsl(var(--border))" }
  },
  "children": [
    {
      "type": "div",
      "style": { "layout": { "display": "flex", "flexDirection": "row", "justifyContent": "space-between", "alignItems": "flex-start", "gap": 64 }, "sizing": { "width": "100%", "maxWidth": "1200px" } },
      "children": [
        {
          "type": "div",
          "style": { "layout": { "display": "flex", "flexDirection": "column", "gap": 16 }, "sizing": { "maxWidth": "300px" } },
          "children": [
            { "type": "heading", "props": { "content": "BRAND", "tag": "h4" }, "style": { "typography": { "fontSize": "20px", "fontWeight": "700" } } },
            { "type": "text", "props": { "content": "Building amazing products for the web." }, "style": { "typography": { "color": "hsl(var(--muted-foreground))" } } }
          ]
        },
        {
          "type": "div",
          "style": { "layout": { "display": "flex", "flexDirection": "row", "gap": 64 } },
          "children": [
            {
              "type": "div",
              "style": { "layout": { "display": "flex", "flexDirection": "column", "gap": 12 } },
              "children": [
                { "type": "text", "props": { "content": "Links" }, "style": { "typography": { "fontWeight": "600", "fontSize": "14px" } } },
                { "type": "text", "props": { "content": "About" }, "style": { "typography": { "color": "hsl(var(--muted-foreground))", "fontSize": "14px" } } },
                { "type": "text", "props": { "content": "Projects" }, "style": { "typography": { "color": "hsl(var(--muted-foreground))", "fontSize": "14px" } } },
                { "type": "text", "props": { "content": "Contact" }, "style": { "typography": { "color": "hsl(var(--muted-foreground))", "fontSize": "14px" } } }
              ]
            }
          ]
        },
        {
          "type": "div",
          "style": { "layout": { "display": "flex", "flexDirection": "row", "gap": 12 } },
          "children": [
            { "type": "button", "props": { "brandIcon": "github", "variant": "ghost" }, "style": { "sizing": { "width": "40px", "height": "40px" }, "spacing": { "padding": 0 } } },
            { "type": "button", "props": { "brandIcon": "linkedin", "variant": "ghost" }, "style": { "sizing": { "width": "40px", "height": "40px" }, "spacing": { "padding": 0 } } },
            { "type": "button", "props": { "brandIcon": "twitter", "variant": "ghost" }, "style": { "sizing": { "width": "40px", "height": "40px" }, "spacing": { "padding": 0 } } }
          ]
        }
      ]
    },
    { "type": "separator", "style": { "sizing": { "width": "100%", "maxWidth": "1200px" } } },
    { "type": "text", "props": { "content": "© 2024 Brand. All rights reserved." }, "style": { "typography": { "fontSize": "14px", "color": "hsl(var(--muted-foreground))" } } }
  ]
}

═══════════════════════════════════════════════════
MANDATORY VARIETY RULES - NEVER REPEAT THE SAME DESIGN:
═══════════════════════════════════════════════════

CRITICAL: Each generation MUST be unique AND richly styled. NEVER produce basic/plain output.

⚠️ ABSOLUTE MINIMUM VISUAL REQUIREMENTS (NON-NEGOTIABLE):
- EVERY hero MUST have a visible background (gradient, solid color, or image with overlay)
- EVERY button MUST have explicit styling (background color + text color + padding + border radius)
- EVERY section MUST alternate backgrounds (never all white/transparent)
- EVERY card MUST have shadow OR border styling
- Use RICH details: badges, icons, separators, overlays, captions

Randomly select from these options:

1. HERO LAYOUT VARIATIONS (pick one randomly each time):
   A) Split-screen asymmetric (60/40) - content left with stacked badge/headline/description, large image right with floating product overlay
   B) Centered dramatic - massive headline with animated background gradient
   C) Bento grid hero - content in asymmetric grid boxes with different sizes
   D) Full-bleed immersive - text overlay on gradient with floating UI mockups
   E) Stacked editorial - left-aligned text stack with right-side accent shapes
   F) Fashion/Luxury split (40/60) - minimal left content, large right image with overlays

2. BUTTON STYLE ROTATION (vary per generation):
   - PILL buttons: { "border": { "radius": 9999 } } - playful, modern
   - ROUNDED buttons: { "border": { "radius": 12 } } - balanced, SaaS feel
   - SHARP buttons: { "border": { "radius": 0 } } - editorial, luxury, fashion
   - MIXED buttons: Primary pill + Secondary sharp - sophisticated contrast
   - MINIMAL buttons: Sharp edges, thin border, no fill - high-end boutique

3. COLOR PALETTE SELECTION (select ONE palette per page, stick with it):
   - ELECTRIC TEAL: "#0d9488" primary, "#06b6d4" accent, dark navy "#0f172a" background
   - ROYAL PURPLE: "#7c3aed" primary, "#ec4899" accent, deep purple "#0c0a1d" background
   - SUNSET ORANGE: "#f97316" primary, "#fbbf24" accent, charcoal "#18181b" background
   - OCEAN BLUE: "#3b82f6" primary, "#0ea5e9" accent, slate "#1e293b" background
   - NEON GREEN: "#22c55e" primary, "#a855f7" accent, pure black "#0a0a0a" background
   - CORAL PINK: "#f43f5e" primary, "#fb923c" accent, warm gray "#292524" background
   - WARM NEUTRAL: "#c9a96e" gold accent, "#f5f5dc" cream bg, "#1a1a1a" black text - LUXURY/FASHION
   - ELEGANT MONO: "#2d2d2d" primary, "#f8f8f8" background, "#8b8b8b" muted - MINIMALIST EDITORIAL
   - SOFT TERRACOTTA: "#c4a373" warm tan, "#faf8f5" off-white, "#3d3d3d" dark - LIFESTYLE BRANDS
   - REFINED OLIVE: "#5c6b4a" olive green, "#f9f7f4" cream, "#2c2c2c" charcoal - SUSTAINABLE/ORGANIC

4. CARD STYLE VARIATIONS (use ONE style consistently):
   - GLASS: { "background": "rgba(255,255,255,0.05)", "border": "1px solid rgba(255,255,255,0.1)", "backdropFilter": "blur(12px)" }
   - SOLID SHADOW: { "background": "hsl(var(--card))", "shadow": "0 8px 32px rgba(0,0,0,0.25)", "border": "none" }
   - GRADIENT BORDER: { "background": "hsl(var(--card))", "borderImage": "linear-gradient(135deg, #0d9488, #3b82f6) 1" }
   - MINIMAL: { "background": "transparent", "border": "1px solid hsl(var(--border))" }
   - ELEVATED: { "background": "hsl(var(--card))", "shadow": "0 25px 50px -12px rgba(0,0,0,0.5)", "transform": "translateZ(0)" }
   - PRODUCT CARD: { "background": "transparent", "overflow": "hidden" } - clean product showcase

5. SECTION BACKGROUND VARIATION (alternate between):
   - Solid color with subtle gradient overlay
   - Gradient mesh background with floating shapes
   - Pattern overlay (dots, grid lines, noise texture via opacity)
   - Split background (left color, right different color)
   - Image background with dark overlay
   - Clean cream/off-white for luxury/fashion sites

6. NAVIGATION STYLES (pick one):
   - FLOATING: Centered nav with glass background, pill-shaped, floating with shadow
   - MINIMAL: Full-width, logo left, links right, no background until scroll
   - BOLD: Full-width, colored background, white text, prominent CTA button
   - SPLIT: Logo and primary links left, CTA buttons right, clear visual hierarchy
   - EDITORIAL: Logo center, links distributed, subtle bottom border, icon buttons (search, cart)

7. FOOTER STYLES (pick one):
   - 4-COLUMN: Traditional layout with logo, links, contact, social
   - MINIMAL: Single row with copyright left, links center, social right
   - MEGA: Full newsletter section + 6 columns + bottom bar
   - CTA-FOCUSED: Large CTA section above standard footer

8. TYPOGRAPHY COMBINATIONS (pick one pair):
   - Modern: "Inter" headings + "Inter" body - clean, tech-forward
   - Editorial: "Playfair Display" headings + "Inter" body - elegant, luxury
   - Bold: "Space Grotesk" headings + "DM Sans" body - creative, energetic
   - Corporate: "Merriweather" headings + "Source Sans Pro" body - trustworthy, professional
   - Futuristic: "Outfit" headings + "Inter" body - modern, innovative
   - Fashion Magazine: "Cormorant Garamond" headings + "Montserrat" body - HIGH-END FASHION
   - Luxury Minimal: "Italiana" headings + "Lato" body - LUXURY BRANDS
   - Classic Editorial: "Libre Baskerville" headings + "Source Sans Pro" body - TIMELESS SOPHISTICATION

═══════════════════════════════════════════════════
INDUSTRY-AWARE DESIGN SELECTION - AUTO-DETECT CONTEXT:
═══════════════════════════════════════════════════

CRITICAL: Detect keywords in user prompt and apply matching design language:

FASHION / E-COMMERCE / LUXURY KEYWORDS:
"fashion", "clothing", "boutique", "luxury", "shop", "store", "e-commerce", "product", "collection", "brand", "apparel", "jewelry", "beauty", "cosmetics", "lifestyle"
→ Use WARM NEUTRAL or ELEGANT MONO palette
→ Use serif typography (Playfair Display, Cormorant Garamond)
→ Use SHARP buttons (border-radius: 0)
→ Use asymmetric split-screen hero (40/60)
→ Use product cards with hover overlays
→ Use EDITORIAL navigation style
→ Add letter-spacing: 0.1em to headings/badges
→ Use subtle, refined animations

TECH / SAAS / STARTUP KEYWORDS:
"saas", "startup", "app", "platform", "dashboard", "software", "api", "developer", "tech"
→ Use ELECTRIC TEAL or OCEAN BLUE palette
→ Use sans-serif typography (Inter, Space Grotesk)
→ Use PILL or ROUNDED buttons
→ Use gradient hero backgrounds
→ Use GLASS cards

PORTFOLIO / CREATIVE KEYWORDS:
"portfolio", "developer", "designer", "creative", "agency", "freelance"
→ Use dark gradients with accent colors
→ Use bold typography combinations
→ Use BENTO or SPLIT hero layouts

═══════════════════════════════════════════════════
CREATIVE DESIGN GUIDELINES - ADDITIONAL VARIETY:
═══════════════════════════════════════════════════

1. DECORATIVE ELEMENTS - Add visual interest:
   - Floating gradient orbs: { "type": "div", "style": { "sizing": {"width": "300px", "height": "300px"}, "background": {"gradient": {"type": "radial", "stops": [{"color": "#8b5cf6", "position": 0}, {"color": "transparent", "position": 70}]}}, "position": {"position": "absolute", "top": "-100px", "right": "-100px"}, "effects": {"filter": "blur(60px)"} }}
   - Accent lines: { "type": "div", "style": { "sizing": {"width": "100px", "height": "4px"}, "background": {"gradient": {"type": "linear", "angle": 90, "stops": [{"color": "#0d9488", "position": 0}, {"color": "#3b82f6", "position": 100}]}}, "border": {"radius": 2} }}

2. SPACING PATTERNS - Vary vertical rhythm:
   - Compact sections: 60-80px padding
   - Dramatic sections: 120-160px padding  
   - Mix compact content sections with dramatic hero/CTA sections

3. TRUST ELEMENTS - Use contextually:
   - Badges: "🚀 New Feature", "⚡ Fast", "🔐 Secure", "🏆 Award Winner"
   - Stats with icons: Combine icon + number + label
   - Client logos row (placeholder blocks)

4. ANIMATION HINTS - Add motion suggestions:
   - Cards: "hover: translateY(-8px), shadow increase"
   - Buttons: "hover: scale(1.02) or translateY(-2px)"
   - Images: "hover: scale(1.05) with overflow hidden"

═══════════════════════════════════════════════════
BUTTON CRITICAL RULES - ALWAYS PROVIDE CONTENT:
═══════════════════════════════════════════════════

CRITICAL: Every button MUST have explicit "content" or "text" prop. Empty buttons will show "Button" fallback.

CORRECT button examples:
{ "type": "button", "props": { "content": "Get Started" } }
{ "type": "button", "props": { "content": "View Projects", "variant": "outline" } }
{ "type": "button", "props": { "content": "Contact Me", "variant": "secondary" } }
{ "type": "button", "props": { "content": "", "brandIcon": "github", "variant": "ghost" } } // Icon-only button - empty string OK when brandIcon present

WRONG (will show "Button" fallback - NEVER DO THIS):
{ "type": "button", "props": { "variant": "outline" } } // Missing content!
{ "type": "button", "props": {} } // Missing content!
{ "type": "button" } // Missing props entirely!

FOR ICON-ONLY BUTTONS:
- Social icons: Use brandIcon + empty content: { "props": { "content": "", "brandIcon": "github" } }
- Lucide icons: Use icon (NOT iconName) + empty content: { "props": { "content": "", "icon": "Menu" } }
- CRITICAL: Use "icon" property, NOT "iconName" - iconName is deprecated!

HERO CTA BUTTONS - Always provide unique, descriptive text:
- Primary: "Get Started", "Start Building", "Try Free", "Book a Demo"
- Secondary: "Learn More", "Watch Demo", "View Examples", "See How It Works"
- NEVER leave CTA buttons without content!

═══════════════════════════════════════════════════
⚠️ NON-NEGOTIABLE VISUAL MINIMUMS - STRICT REQUIREMENTS:
═══════════════════════════════════════════════════

CRITICAL: Every generation MUST include ALL of these. Failure = low quality output.

1. SECTION BACKGROUND VARIATION (MANDATORY):
   - At MINIMUM 3 sections MUST have explicit background treatments (NOT all white/transparent)
   - Use alternating pattern: Section 1 gradient/dark → Section 2 cream/muted → Section 3 gradient → etc.
   - Hero MUST have: gradient background OR split-screen with colored panel
   - CTA section MUST have: gradient background OR strong accent color
   - At least ONE section must use a tinted background (cream, muted, soft color)
   
   FORBIDDEN: All-white pages. All-transparent sections. Generic unstyled output.

2. BUTTON STYLING (MANDATORY - NO UNSTYLED BUTTONS):
   PRIMARY CTA BUTTONS MUST HAVE:
   - Explicit backgroundColor: "#1a1a1a" (black) OR gradient OR accent color
   - Explicit textColor: "white" OR contrasting color  
   - Explicit padding: { "top": 14, "right": 28, "bottom": 14, "left": 28 } (generous)
   - Explicit borderRadius: 0 (sharp) OR 8 (rounded) OR 9999 (pill)
   
   SECONDARY BUTTONS MUST HAVE:
   - Explicit border: { "width": 1, "style": "solid", "color": "#1a1a1a" }
   - Explicit backgroundColor: "transparent"
   - Explicit textColor matching border
   
   FORBIDDEN: Buttons without explicit background/border styling. Default unstyled buttons.

3. RICH DETAIL ELEMENTS (MANDATORY - 2+ per section):
   Every major section MUST include at least 2 of these:
   - Badges/labels with background color and border
   - Separators/dividers between content groups
   - Cards with shadows or borders
   - Icons with colored backgrounds
   - Subtle borders on containers
   - Overlay elements on images
   - Caption text under images/products
   
   FORBIDDEN: Plain text-only sections. No visual hierarchy. No detail elements.

4. TYPOGRAPHY HIERARCHY (MANDATORY):
   - Headlines: 40px+ with fontWeight 600-800
   - Subheadings: 20-24px with fontWeight 500-600
   - Body: 14-16px with lineHeight 1.5-1.7
   - Captions/labels: 11-13px with letterSpacing 0.05em+ and uppercase
   
   FORBIDDEN: All same-size text. No weight variation. No letter-spacing on labels.

5. SPACING & BREATHING ROOM (MANDATORY):
   - Section padding: minimum 80px vertical
   - Card padding: minimum 24px
   - Element gaps: minimum 16px between items
   - Content max-width: 1200px centered
   
   FORBIDDEN: Cramped layouts. No padding. Edge-to-edge text.

6. VISUAL POLISH CHECKLIST (MUST INCLUDE 3+):
   □ Box shadows on cards (y: 8-24, blur: 16-48)
   □ Border radius on containers (8-24px)
   □ Hover state hints in comments
   □ Color-tinted icon backgrounds
   □ Gradient accents on at least one element
   □ Letter-spacing on uppercase text
   □ Backdrop blur on overlays (glassmorphism)
   
═══════════════════════════════════════════════════
MANDATORY PAGE COMPLETENESS - CRITICAL RULE:
═══════════════════════════════════════════════════

EVERY full page build MUST include AT LEAST 6 SECTIONS:
1. NAVIGATION (nav-section) - Always first
2. HERO (hero-section) - Immediately after nav
3. CONTENT SECTION 1 (features/about/services)
4. CONTENT SECTION 2 (testimonials/portfolio/stats)
5. CTA SECTION (newsletter/contact/pricing)
6. FOOTER (footer-section) - Always last

NEVER skip sections. NEVER return fewer than 6 top-level section components.
If you're unsure what content to add, generate placeholder content rather than omitting sections.

FORBIDDEN: 
- Returning fewer than 4 sections for any page request
- Skipping navigation or footer
- Returning only a hero section
- Empty or partial builds

═══════════════════════════════════════════════════
ADAPTIVE CONTENT DENSITY - FILL SPACE INTELLIGENTLY:
═══════════════════════════════════════════════════

GRID SECTIONS FLEXIBLE ITEM COUNTS (CONTEXT-AWARE):
- Products grid: 4-8 products (fill available width, NO empty gaps)
- Features grid: 3-6 features (adapt to viewport width)
- Testimonials grid: 3-5 testimonials OR 1 large featured quote
- Pricing grid: 2-4 tiers (context dependent)
- Projects grid: 3-6 projects (fill the row completely)
- Team grid: 3-6 team members
- Gallery grid: 4-9 items (fill entire grid)

ITEM COUNT SELECTION RULES:
1. "online store" / "marketplace" → 6-8 products (busy, filled)
2. "boutique" / "luxury" → 3-4 products (larger cards, more whitespace)
3. "featured products" → 3-4 highlighted items
4. "full catalog" → 8+ products in dense grid
5. User mentions specific number → USE EXACTLY that number
6. DEFAULT: 5-6 items (fills typical viewport without gaps)

SPACE-FILLING PRIORITY (CRITICAL):
- NEVER leave visible empty columns in a grid
- If 4 items leave gaps → use 5 or 6 items
- Match item count to flex-wrap/grid layout width
- Larger cards (showcase) = fewer items, smaller cards = more items

PRODUCT CARD REQUIREMENTS:
- EVERY product card MUST have a styled DESCRIPTION element
- Use evocative, sensory language for descriptions
- VARY card styles using STYLE A-E templates
- Each card should feel unique and non-predictive

ALWAYS:
- Fill entire row width with actual content (no gaps)
- Generate complete, detailed content for each card
- Vary item counts between 3-8 based on layout variant and context
- Each card must have unique, realistic content
- Include unique product DESCRIPTIONS with materials, origin, or features
- Mix card visual styles for non-predictive modern layouts

═══════════════════════════════════════════════════
RESPONSE FORMAT - CRITICAL - FOLLOW EXACTLY:
═══════════════════════════════════════════════════

⚠️ YOUR RESPONSE MUST BE A SINGLE JSON OBJECT WITH THIS EXACT TOP-LEVEL STRUCTURE:

{
  "success": true,
  "steps": [ ... ],
  "summary": "..."
}

⚠️ CRITICAL REQUIREMENTS:
1. "success" field MUST be present and set to true
2. "steps" field MUST be an array (never null, never omitted)
3. "summary" field MUST be a brief description string
4. DO NOT return just the steps array without the wrapper object!
5. DO NOT omit any of these three fields!
6. DO NOT add any text, comments, or explanations before or after the JSON!

FULL EXAMPLE:

{
  "success": true,
  "steps": [
    { "type": "progress", "message": "Creating variables..." },
    
    { "type": "variable", "data": { "name": "count", "scope": "page", "dataType": "number", "initialValue": 0, "description": "Counter value" } },
    
    { "type": "class", "data": { "name": "card-primary", "styles": { ... } } },
    
    { "type": "progress", "message": "Building components..." },
    
    { "type": "component", "data": { "id": "counter-display", "type": "text", "props": { "content": "Count: {{page.count}}" }, "style": { ... } } },
    
    { "type": "component", "data": { "id": "increment-btn", "type": "button", "props": { "content": "+" }, "style": { ... } } },
    
    { "type": "flow", "data": { "componentId": "increment-btn", "trigger": "onClick", "actions": [{ "type": "set-variable", "config": { "scope": "page", "variableName": "count", "operation": "increment", "amount": 1 } }] } }
  ],
  "summary": "Created interactive counter with increment/decrement"
}

STEP TYPES:
- "progress": Status message for UI feedback
- "variable": Create app/page variable  
- "class": Create reusable style class
- "component": Add UI component with props, style, children
- "binding": Apply variable binding to component
- "flow": Create action flow for component

CURRENT CONTEXT: ${context ? JSON.stringify(context) : 'New page'}

═══════════════════════════════════════════════════
DESIGN SEED: ${context?.designSeed || Math.floor(Math.random() * 10000)}
Use this seed to determine your design choices:
- Seed % 5 = Hero layout variant (0=Split, 1=Centered, 2=Bento, 3=Full-bleed, 4=Editorial)
- Seed % 6 = Color palette (0=Teal, 1=Purple, 2=Orange, 3=Blue, 4=Green, 5=Coral)
- Seed % 5 = Card style (0=Glass, 1=Solid, 2=Gradient, 3=Minimal, 4=Elevated)
- Seed % 4 = Nav style (0=Floating, 1=Minimal, 2=Bold, 3=Split)
${context?.forceRebuild ? '\n⚡ FORCE REBUILD: Create a COMPLETELY DIFFERENT design from any previous generation!' : ''}
═══════════════════════════════════════════════════

CANVAS SIZE AWARENESS:
- Current Viewport: ${context?.viewportContext?.currentViewport || 'desktop'}
- Canvas Width: ${context?.viewportContext?.canvasWidth || 1140}px
- Always design components to fit within this width
- Use maxWidth constraints that respect canvas boundaries
- Sections should use width: "100%" with maxWidth: "${context?.viewportContext?.canvasWidth || 1200}px"
- Never generate content wider than the canvas allows

${context?.designSystem ? `
╔═══════════════════════════════════════════════════════════════════╗
║  ⚠️  MANDATORY DESIGN SYSTEM OVERRIDE — READ BEFORE GENERATING  ║
╚═══════════════════════════════════════════════════════════════════╝

This project has a CUSTOM DESIGN SYSTEM. The following tokens are the SINGLE SOURCE OF TRUTH.
You MUST use these colors and fonts exclusively throughout the entire page.
DO NOT use colors from the design seed, DO NOT invent hex values, DO NOT fall back to defaults.

${context.designSystem.colors?.length > 0 ? `
▶ COLOR MANDATE — USE ONLY THESE COLORS:
${context.designSystem.colors.map((c: any) => `  • ${c.name}: ${c.value}${c.description ? ` → ${c.description}` : ''}`).join('\n')}

  ➜ Navbar background MUST complement the hero background from these tokens — NEVER force white (#fff) on the navbar when a surface/background token exists.
  ➜ Hero section background MUST use the "background" or "base" token if present — NOT a random color from the seed.
  ➜ Buttons MUST use the "primary" or "accent" token — NOT a random accent from the seed.
  ➜ DO NOT use any hex color that is not listed above or derivable from above tokens.
` : ''}

${context.designSystem.fonts?.length > 0 ? `
▶ TYPOGRAPHY MANDATE — USE ONLY THESE FONTS:
${context.designSystem.fonts.map((f: any) => `  • ${f.name}: ${f.value}${f.description ? ` → ${f.description}` : ''}`).join('\n')}

  ➜ Find "font-heading" or equivalent above — use it for ALL h1, h2, h3, h4 elements. NEVER use a different font family for headings.
  ➜ Find "font-body" or equivalent above — use it for ALL paragraph text, descriptions, nav links, button labels. NEVER use a different font family for body text.
  ➜ Every text component MUST have an explicit fontFamily prop matching one of the tokens above.
  ➜ DO NOT use any font family that is not listed above.
` : ''}

▶ UNIQUENESS MANDATE:
  ➜ This design MUST be unique and visually distinct from any "default" or "template" output.
  ➜ DO NOT generate the same hero layout structure you would use by default. Apply the layout strategy from the design seed above.
  ➜ Each section must feel visually different from adjacent sections (alternate backgrounds, different content arrangements).
  ➜ DO NOT repeat the same card pattern or CTA button style across more than 2 sections.

${context.designSystem.spacing?.length > 0 ? `
▶ SPACING TOKENS:
${context.designSystem.spacing.map((s: any) => `  • ${s.name}: ${s.value}${s.description ? ` → ${s.description}` : ''}`).join('\n')}

═══════════════════════════════════════════════════
SPACING TOKEN USAGE GUIDE (MANDATORY):
═══════════════════════════════════════════════════
When project has these spacing tokens, ALWAYS use their values:
- section-gap: Use for "gap" between section child containers (default: 48px)
- container-padding: Use for "spacingControl.padding" vertical on sections (default: 80px)
- form-gap: Use for "gap" in form-wrapper and form layouts (default: 12px)
- modal-padding: Use for "spacingControl.padding" inside cards and modal components (default: 24px)
- input-height: Use for "height" on input, textarea, select components (default: 34px)
- input-padding: Use for horizontal padding on form inputs (default: 12px)

EXAMPLE - Applying section-gap token (e.g., value: 64):
{
  "id": "features-section",
  "type": "section",
  "props": {
    "display": "flex",
    "flexDirection": "column",
    "gap": "64"
  }
}

EXAMPLE - Applying container-padding token (e.g., value: 100):
{
  "id": "hero-section",
  "type": "section",
  "props": {
    "spacingControl": {
      "padding": {
        "top": "100",
        "bottom": "100",
        "left": "48",
        "right": "48",
        "unit": "px"
      }
    }
  }
}

EXAMPLE - Applying form-gap token (e.g., value: 16):
{
  "id": "contact-form",
  "type": "form-wrapper",
  "props": {
    "display": "flex",
    "flexDirection": "column",
    "gap": "16"
  }
}

EXAMPLE - Applying modal-padding token (e.g., value: 32):
{
  "id": "feature-card",
  "type": "card",
  "props": {
    "spacingControl": {
      "padding": {
        "top": "32",
        "right": "32",
        "bottom": "32",
        "left": "32",
        "unit": "px"
      }
    }
  }
}
` : ''}

${context.designSystem.borders?.length > 0 ? `
▶ BORDER TOKENS:
${context.designSystem.borders.map((b: any) => `  • ${b.name}: ${b.value}${b.description ? ` → ${b.description}` : ''}`).join('\n')}
` : ''}

${context.designSystem.shadows?.length > 0 ? `
▶ SHADOW TOKENS:
${context.designSystem.shadows.map((s: any) => `  • ${s.name}: ${s.value}${s.description ? ` → ${s.description}` : ''}`).join('\n')}
` : ''}

${context.designSystem.buttonPresets?.length > 0 ? `
▶ BUTTON PRESETS (USE THESE EXACT STYLES FOR BUTTONS):
${context.designSystem.buttonPresets.map((b: any) => `
  • ${b.name} (variant: ${b.variant}):
    styles: ${JSON.stringify(b.styles)}
    ${b.states?.hover ? `hover: ${JSON.stringify(b.states.hover)}` : ''}
`).join('\n')}
` : ''}

╔═══════════════════════════════════════════════════════════════════╗
║  The design system above OVERRIDES all seed defaults.            ║
║  Seed layout/typography scale still applies — COLORS DO NOT.     ║
╚═══════════════════════════════════════════════════════════════════╝
` : ''}

${getCreativeSeed(prompt)}

Now create BEAUTIFUL, LOVABLE-QUALITY, FULLY FUNCTIONAL UI for the user's request:`;

    // ═══════════════════════════════════════════════════
    // CREATIVE SEED - Replaces the 635-line getPreSelectedRecipeInstructions()
    // Gives the AI directional guidance without prescribing exact structures/colors
    // ═══════════════════════════════════════════════════
    function getCreativeSeed(userPrompt: string): string {
      const randomSeed = Math.floor(Math.random() * 1000000);
      const layouts = ['split-screen', 'centered-stack', 'bento-grid', 'editorial-columns', 'asymmetric-offset', 'minimal-focus'];
      const vibes = ['bold and dramatic', 'clean and minimal', 'dark and premium', 'warm and inviting', 'futuristic and techy', 'editorial and magazine-like', 'playful and energetic', 'elegant and refined'];
      const colorApproaches = ['dark theme with strong accent', 'light theme with vibrant accent', 'monochromatic with single pop color', 'gradient-rich with depth', 'ultra-minimal near-white palette', 'earthy warm tones', 'electric neon on dark'];

      const layout = layouts[randomSeed % layouts.length];
      const vibe = vibes[(randomSeed >> 2) % vibes.length];
      const colorApproach = colorApproaches[(randomSeed >> 4) % colorApproaches.length];

      return `
CREATIVE DIRECTION FOR THIS BUILD (Seed: ${randomSeed}):
- Hero layout approach: ${layout}
- Overall design vibe: ${vibe}
- Color approach: ${colorApproach}
- Card count variety: Use ${3 + (randomSeed % 4)} feature cards, ${2 + (randomSeed % 3)} pricing tiers
- Use your creative judgment for all colors, typography, spacing, and visual style
- DO NOT copy any patterns — invent something original for this specific prompt
`;
    }

    // Get selected model from context (passed from client)
    const selectedModel = context?.model || 'gemini-3-pro';
    console.log(`[AI Build] Selected model from client: ${selectedModel}`);

    // ═══════════════════════════════════════════════════════════════════════════════
    // MULTI-STEP GENERATION - Generate page in phases for better reliability
    // ═══════════════════════════════════════════════════════════════════════════════
    
    let result: any;
    let generationWarning: string | undefined;
    
    // Determine if we should use multi-step based on prompt intent
    const shouldUseMultiStep = currentPromptAnalysis.intent === 'full_page';
    
    if (shouldUseMultiStep) {
      console.log('[AI Build] Using MULTI-STEP generation for full page');
      
      try {
        const multiStepResult = await generatePageInPhases(prompt, selectedModel);
        
        if (!multiStepResult.success || multiStepResult.steps.length === 0) {
          throw new Error('No components generated in any phase');
        }
        
        result = {
          success: true,
          steps: multiStepResult.steps
        };
        generationWarning = multiStepResult.warning;
        
        console.log(`[AI Build] Multi-step complete: ${result.steps.length} components`);
        
      } catch (multiStepError: any) {
        console.error('[AI Build] Multi-step generation failed:', multiStepError.message);
        
        if (multiStepError.message.includes('RATE_LIMIT')) {
          return new Response(
            JSON.stringify({ success: false, error: 'All AI providers are currently rate-limited. Please wait a moment and try again.', isRateLimited: true, suggestion: 'Wait 30 seconds and retry, or try a different model.', recoverable: true }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Check if it's a missing API key error
        const isMissingKey = multiStepError.message.includes('not configured');
        const isJsonError = multiStepError.message.includes('JSON') || multiStepError.message.includes('Expected');
        const isTimeout = multiStepError.message.includes('TIMEOUT');
        
        let suggestion = 'Please try again — generation times can vary.';
        if (isMissingKey) {
          suggestion = 'The selected model requires an API key that is not configured. Please check your environment variables or switch to a different model.';
        } else if (isTimeout) {
          suggestion = 'The request timed out. Please try again — the model may be under heavy load.';
        } else if (isJsonError) {
          // JSON parse error - retry once with the same model before giving up
          console.log('[AI Build] JSON parse error, retrying generation once...');
          try {
            const retryResult = await generatePageInPhases(prompt, selectedModel);
            if (retryResult.success && retryResult.steps.length > 0) {
              result = { success: true, steps: retryResult.steps };
              generationWarning = retryResult.warning;
              console.log(`[AI Build] Retry succeeded: ${result.steps.length} components`);
              // Skip the error response below - continue to normal flow
            } else {
              throw new Error('Retry produced no components');
            }
          } catch (retryError: any) {
            console.error('[AI Build] Retry also failed:', retryError.message);
            suggestion = 'The AI produced malformed output. Please try again — results vary between attempts.';
            return new Response(
              JSON.stringify({
                success: false,
                error: `Generation failed. ${suggestion}`,
                isTimeout: false,
                suggestion,
                recoverable: true
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
        
        if (!result) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Generation failed: ${multiStepError.message}`,
              isTimeout: multiStepError.message.includes('TIMEOUT'),
              suggestion,
              recoverable: true
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
    } else {
      // Single-shot generation for focused requests (forms, single sections)
      console.log('[AI Build] Using SINGLE-SHOT generation for focused request');
      
      let aiResponse: string;
      try {
        aiResponse = await callAIModel(
          selectedModel,
          sanitizePromptString(systemPrompt),
          prompt,
          undefined,
          0.85
        );
      } catch (apiError: any) {
        console.error('AI API call failed:', apiError);
        if (apiError.message === 'AI_TIMEOUT') {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'AI generation timed out. Please try a simpler prompt.',
              isTimeout: true,
              suggestion: 'Simplify your request or try Gemini 3.1 Flash.',
              recoverable: true
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (apiError.message === 'RATE_LIMIT') {
          return new Response(
            JSON.stringify({ success: false, error: 'All AI providers are currently rate-limited. Please wait a moment and try again.', isRateLimited: true, suggestion: 'Wait 30 seconds and retry, or try a different model.', recoverable: true }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw apiError;
      }
      
      // Parse single-shot response
      if (!aiResponse || aiResponse.trim().length < 100) {
        console.error('[AI Build] Empty or too short response from AI');
        return new Response(
          JSON.stringify({
            success: false,
            error: 'AI model returned an empty response. Please try again.'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Parse the response using shared sanitizer
      // Log raw response for debugging
      console.log(`[AI Build] Raw response (first 500 chars): ${aiResponse.substring(0, 500)}`);

      try {
        // Use resilientJsonParse for multi-stage fallback recovery instead of basic sanitize+parse
        result = resilientJsonParse(aiResponse);

        // Normalize response
        if (result.steps && Array.isArray(result.steps) && result.success === undefined) {
          result.success = true;
        }
        if (Array.isArray(result) && result.length > 0) {
          result = { success: true, steps: result };
        }

        // If resilient parse returned empty steps, treat as parse failure
        if (!result.steps || result.steps.length === 0) {
          throw new Error('resilientJsonParse returned empty steps');
        }
      } catch (parseError) {
        console.error('[AI Build] JSON parsing failed for single-shot:', parseError);
        
        // Check if this prompt might actually be a full-page request that was misclassified
        const fullPageKeywords = /portfolio|website|homepage|landing\s*page|storefront|blog|ecommerce|e-commerce|shop|store|saas|startup|agency|page|site/i;
        if (fullPageKeywords.test(prompt)) {
          console.log('[AI Build] Single-shot parse failed for page-like prompt, retrying with multi-step generation');
          try {
            const multiStepRetry = await generatePageInPhases(prompt, selectedModel);
            if (multiStepRetry.success && multiStepRetry.steps.length > 0) {
              result = {
                success: true,
                steps: multiStepRetry.steps
              };
              generationWarning = multiStepRetry.warning;
              console.log(`[AI Build] Multi-step retry succeeded: ${result.steps.length} components`);
            } else {
              throw new Error('Multi-step retry produced no components');
            }
          } catch (retryError: any) {
            console.error('[AI Build] Multi-step retry also failed:', retryError.message);
            return new Response(
              JSON.stringify({
                success: true,
                action: 'chat',
                message: 'I encountered an issue generating the layout. Please try again with a simpler request.'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          return new Response(
            JSON.stringify({
              success: true,
              action: 'chat',
              message: 'I encountered an issue generating the layout. Please try again with a simpler request.'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Validate response structure - AFTER multi-step or single-shot generation
    if (!result || !result.success || !Array.isArray(result.steps)) {
      console.warn('[AI Build] Invalid structure:', { 
        hasResult: !!result,
        hasSuccess: !!result?.success, 
        hasSteps: !!result?.steps,
        isArray: Array.isArray(result?.steps)
      });
      return new Response(
        JSON.stringify({
          success: true,
          action: 'chat',
          message: result?.message || 'Unable to generate layout. Please try a different prompt.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[AI Build] Response validated:', { 
      stepCount: result.steps.length,
      componentCount: result.steps.filter((s: any) => s.type === 'component').length,
      warning: generationWarning
    });

    // ═══════════════════════════════════════════════════
    // SECTION COMPLETENESS CHECK - Detect truncation and inject missing sections
    // ═══════════════════════════════════════════════════
    
    const MINIMUM_SECTIONS = 5;
    const componentSteps = result.steps?.filter((s: any) => s.type === 'component') || [];
    const sectionCount = componentSteps.filter((s: any) => 
      s.data?.type === 'section' || 
      String(s.data?.id || '').includes('-section') ||
      s.data?.type === 'nav-horizontal'
    ).length;
    
    console.log(`[AI Build] Section count check: ${sectionCount} sections found (minimum: ${MINIMUM_SECTIONS})`);
    
    // Check which critical sections exist
    const existingSectionIds = componentSteps
      .map((s: any) => String(s.data?.id || '').toLowerCase())
      .filter((id: string) => id);
    
    const hasNavbar = existingSectionIds.some((id: string) => id.includes('nav'));
    const hasFooter = existingSectionIds.some((id: string) => id.includes('footer'));
    const hasContact = existingSectionIds.some((id: string) => id.includes('contact') || id.includes('cta'));
    const hasNewsletter = existingSectionIds.some((id: string) => id.includes('newsletter') || id.includes('subscribe'));
    
    // Also check component types for nav-horizontal
    const hasNavType = componentSteps.some((s: any) => s.data?.type === 'nav-horizontal');
    const hasNav = hasNavbar || hasNavType;
    
    // Detect if page appears to be e-commerce
    const isEcommerce = existingSectionIds.some((id: string) => 
      id.includes('product') || id.includes('shop') || id.includes('cart')
    );
    
    // Log missing sections
    const missingSections: string[] = [];
    if (!hasNav) missingSections.push('navbar');
    if (!hasFooter) missingSections.push('footer');
    if (!hasContact) missingSections.push('contact/cta');
    if (isEcommerce && !hasNewsletter) missingSections.push('newsletter');
    
    if (missingSections.length > 0 || sectionCount < MINIMUM_SECTIONS) {
      console.warn(`[AI Build] Incomplete page detected! Missing sections: ${missingSections.join(', ')}, Total sections: ${sectionCount}`);
      
      // Inject navbar FIRST (should always be at the top)
      if (!hasNav) {
        const navbarSection = {
          type: 'component',
          data: {
            id: 'nav-section',
            type: 'section',
            props: {
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              height: '64px',
              backgroundColor: { type: 'solid', value: 'hsl(var(--background))', opacity: 100 },
              spacingControl: { padding: { top: '16', right: '32', bottom: '16', left: '32', unit: 'px' } },
              position: 'sticky',
              top: '0',
              zIndex: '50',
              backdropFilter: 'blur(12px)',
            },
            children: [
              { id: 'nav-logo', type: 'heading', props: { content: 'Brand', tag: 'h3', typography: { fontSize: '20', fontWeight: '700' } } },
              { id: 'nav-links', type: 'div', props: { display: 'flex', flexDirection: 'row', gap: '32', alignItems: 'center' }, children: [
                { id: 'nav-link-1', type: 'text', props: { content: 'Features', typography: { fontSize: '14', fontWeight: '500' } } },
                { id: 'nav-link-2', type: 'text', props: { content: 'Pricing', typography: { fontSize: '14', fontWeight: '500' } } },
                { id: 'nav-link-3', type: 'text', props: { content: 'About', typography: { fontSize: '14', fontWeight: '500' } } },
                { id: 'nav-link-4', type: 'text', props: { content: 'Contact', typography: { fontSize: '14', fontWeight: '500' } } },
              ]},
              { id: 'nav-cta', type: 'button', props: { text: 'Get Started', variant: 'default' } },
            ],
          }
        };
        // Navbar always goes at the beginning
        result.steps.unshift(navbarSection);
        console.log('[AI Build] Injected nav-section at beginning');
      }
      
      // Helper to find footer index for proper section insertion order
      const findFooterIndex = (): number => {
        for (let i = 0; i < result.steps.length; i++) {
          const step = result.steps[i];
          const stepId = String(step.data?.id || '').toLowerCase();
          if (stepId.includes('footer') || step.data?.type === 'footer') {
            return i;
          }
        }
        return -1;
      };
      
      // Helper to find contact section index
      const findContactIndex = (): number => {
        for (let i = 0; i < result.steps.length; i++) {
          const step = result.steps[i];
          const stepId = String(step.data?.id || '').toLowerCase();
          if (stepId.includes('contact') || stepId.includes('cta-section')) {
            return i;
          }
        }
        return -1;
      };
      
      // Inject newsletter FIRST (should come before contact and footer)
      if (isEcommerce && !hasNewsletter) {
        const newsletterSection = {
          type: 'component',
          data: {
            id: 'newsletter-section',
            type: 'section',
            props: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '32px',
              width: '100%',
              backgroundColor: 'hsl(var(--card))',
              spacingControl: { padding: { top: 80, right: 48, bottom: 80, left: 48, unit: 'px' } },
            },
            children: [
              { id: 'newsletter-headline', type: 'heading', props: { content: 'Stay Updated', tag: 'h2', fontSize: '32px', fontWeight: '700', textAlign: 'center' } },
              { id: 'newsletter-description', type: 'text', props: { content: 'Subscribe to our newsletter for the latest updates and exclusive offers.', fontSize: '16px', color: 'hsl(var(--muted-foreground))', textAlign: 'center' } },
              { id: 'newsletter-form-row', type: 'div', props: { display: 'flex', flexDirection: 'row', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }, children: [
                { id: 'newsletter-input', type: 'input', props: { placeholder: 'Enter your email', type: 'email', minWidth: '280px' } },
                { id: 'newsletter-button', type: 'button', props: { content: 'Subscribe' } },
              ]},
            ],
          }
        };
        
        // Insert before contact or footer (whichever comes first)
        const contactIdx = findContactIndex();
        const footerIdx = findFooterIndex();
        let insertIdx = result.steps.length;
        if (contactIdx !== -1) insertIdx = contactIdx;
        else if (footerIdx !== -1) insertIdx = footerIdx;
        
        result.steps.splice(insertIdx, 0, newsletterSection);
        console.log(`[AI Build] Injected newsletter-section at index ${insertIdx}`);
      }
      
      // Inject contact section (should come before footer)
      if (!hasContact) {
        const contactSection = {
          type: 'component',
          data: {
            id: 'contact-section',
            type: 'section',
            props: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '32px',
              width: '100%',
              background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%)',
              spacingControl: { padding: { top: 80, right: 48, bottom: 80, left: 48, unit: 'px' } },
            },
            children: [
              { id: 'contact-headline', type: 'heading', props: { content: "Let's Work Together", tag: 'h2', fontSize: '40px', fontWeight: '700', color: 'white', textAlign: 'center' } },
              { id: 'contact-description', type: 'text', props: { content: 'Have a project in mind? I would love to hear from you and discuss how we can collaborate.', fontSize: '18px', color: 'hsl(0 0% 100% / 0.9)', textAlign: 'center', maxWidth: '500px' } },
              { id: 'contact-cta-row', type: 'div', props: { display: 'flex', flexDirection: 'row', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }, children: [
                { id: 'contact-btn-1', type: 'button', props: { content: 'Send Message', variant: 'secondary', iconName: 'Mail' } },
                { id: 'contact-btn-2', type: 'button', props: { content: 'Schedule Call', variant: 'outline', iconName: 'Calendar' } },
              ]},
            ],
          }
        };
        
        // Insert before footer
        const footerIdx = findFooterIndex();
        if (footerIdx !== -1) {
          result.steps.splice(footerIdx, 0, contactSection);
          console.log(`[AI Build] Injected contact-section at index ${footerIdx} (before footer)`);
        } else {
          result.steps.push(contactSection);
          console.log('[AI Build] Injected contact-section at end (no footer found)');
        }
      }
      
      // Inject footer LAST (should always be at the end)
      if (!hasFooter) {
        const footerSection = {
          type: 'component',
          data: {
            id: 'footer-section',
            type: 'section',
            props: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '48px',
              width: '100%',
              backgroundColor: 'hsl(var(--card))',
              borderTop: '1px solid hsl(var(--border))',
              spacingControl: { padding: { top: 64, right: 48, bottom: 64, left: 48, unit: 'px' } },
            },
            children: [
              {
                id: 'footer-content',
                type: 'div',
                props: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '48px', maxWidth: '1200px', width: '100%' },
                children: [
                  { id: 'footer-brand', type: 'div', props: { display: 'flex', flexDirection: 'column', gap: '16px' }, children: [
                    { id: 'footer-logo', type: 'heading', props: { content: 'Brand', tag: 'h3', fontSize: '24px', fontWeight: '700' } },
                    { id: 'footer-tagline', type: 'text', props: { content: 'Creating exceptional experiences through design and technology.', fontSize: '14px', color: 'hsl(var(--muted-foreground))', lineHeight: '1.6' } },
                  ]},
                  { id: 'footer-links-1', type: 'div', props: { display: 'flex', flexDirection: 'column', gap: '12px' }, children: [
                    { id: 'footer-col1-title', type: 'text', props: { content: 'Quick Links', fontWeight: '600', fontSize: '14px' } },
                    { id: 'footer-col1-link1', type: 'link', props: { content: 'Home', href: '#' } },
                    { id: 'footer-col1-link2', type: 'link', props: { content: 'About', href: '#' } },
                    { id: 'footer-col1-link3', type: 'link', props: { content: 'Projects', href: '#' } },
                  ]},
                  { id: 'footer-links-2', type: 'div', props: { display: 'flex', flexDirection: 'column', gap: '12px' }, children: [
                    { id: 'footer-col2-title', type: 'text', props: { content: 'Resources', fontWeight: '600', fontSize: '14px' } },
                    { id: 'footer-col2-link1', type: 'link', props: { content: 'Blog', href: '#' } },
                    { id: 'footer-col2-link2', type: 'link', props: { content: 'FAQ', href: '#' } },
                    { id: 'footer-col2-link3', type: 'link', props: { content: 'Support', href: '#' } },
                  ]},
                  { id: 'footer-social', type: 'div', props: { display: 'flex', flexDirection: 'column', gap: '12px' }, children: [
                    { id: 'footer-social-title', type: 'text', props: { content: 'Connect', fontWeight: '600', fontSize: '14px' } },
                    { id: 'footer-social-row', type: 'div', props: { display: 'flex', gap: '12px' }, children: [
                      { id: 'social-icon-1', type: 'icon', props: { iconName: 'Twitter', width: '20px', height: '20px' } },
                      { id: 'social-icon-2', type: 'icon', props: { iconName: 'Github', width: '20px', height: '20px' } },
                      { id: 'social-icon-3', type: 'icon', props: { iconName: 'Linkedin', width: '20px', height: '20px' } },
                    ]},
                  ]},
                ],
              },
              { id: 'footer-copyright', type: 'text', props: { content: '© 2024 Brand. All rights reserved.', fontSize: '12px', color: 'hsl(var(--muted-foreground))', textAlign: 'center' } },
            ],
          }
        };
        // Footer always goes at the end
        result.steps.push(footerSection);
        console.log('[AI Build] Injected footer-section at end');
      }
      
      console.log(`[AI Build] After injection: ${result.steps.filter((s: any) => s.type === 'component').length} components`);
    }

    // ═══════════════════════════════════════════════════
    // CREATIVE DESIGN VARIETY SYSTEM - Uses pre-selected recipe from prompt injection
    // ═══════════════════════════════════════════════════
    
    // 12 DISTINCT DESIGN RECIPES for maximum variety (matches pre-selection)
    const DESIGN_RECIPES = [
      {
        id: 'modern-minimal',
        hero: 'centered-gradient',
        palette: 'electric-teal',
        buttons: { style: 'pill', primary: '#0d9488', textColor: 'white', radius: 9999 },
        cards: 'glass',
        heroBackground: { gradient: 'linear-gradient(135deg, #0d9488 0%, #06b6d4 50%, #3b82f6 100%)' },
        sectionBackgrounds: [
          { color: '#f8fafc' },
          { color: '#f1f5f9' },
          { gradient: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }
        ],
        ctaBackground: { gradient: 'linear-gradient(135deg, #0d9488 0%, #06b6d4 100%)' }
      },
      {
        id: 'luxury-editorial',
        hero: 'split-screen-40-60',
        palette: 'warm-neutral',
        buttons: { style: 'sharp', primary: '#1a1a1a', textColor: 'white', radius: 0 },
        cards: 'elevated-shadow',
        heroBackground: { gradient: 'linear-gradient(180deg, #faf8f5 0%, #f0ebe4 100%)' },
        sectionBackgrounds: [
          { color: '#ffffff' },
          { color: '#faf8f5' },
          { gradient: 'linear-gradient(180deg, #f9f7f4 0%, #f0ebe4 100%)' }
        ],
        ctaBackground: { color: '#1a1a1a' }
      },
      {
        id: 'bold-gradient',
        hero: 'full-gradient-mesh',
        palette: 'sunset-vibrant',
        buttons: { style: 'rounded', primary: '#f97316', textColor: 'white', radius: 12 },
        cards: 'glass-dark',
        heroBackground: { gradient: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%)' },
        sectionBackgrounds: [
          { color: '#fefce8' },
          { color: '#fef3c7' },
          { gradient: 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)' }
        ],
        ctaBackground: { gradient: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)' }
      },
      {
        id: 'corporate-clean',
        hero: 'centered-image-overlay',
        palette: 'ocean-blue',
        buttons: { style: 'soft-rounded', primary: '#3b82f6', textColor: 'white', radius: 8 },
        cards: 'bordered-minimal',
        heroBackground: { gradient: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #6366f1 100%)' },
        sectionBackgrounds: [
          { color: '#f8fafc' },
          { color: '#eff6ff' },
          { gradient: 'linear-gradient(180deg, #f8fafc 0%, #eff6ff 100%)' }
        ],
        ctaBackground: { gradient: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' }
      },
      {
        id: 'dark-premium',
        hero: 'bento-grid',
        palette: 'dark-elegant',
        buttons: { style: 'outline-glow', primary: '#06b6d4', textColor: '#06b6d4', radius: 4, isOutline: true, glowColor: '#06b6d4' },
        cards: 'dark-glass',
        heroBackground: { gradient: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e293b 100%)' },
        sectionBackgrounds: [
          { color: '#0f172a' },
          { color: '#1e293b' },
          { gradient: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }
        ],
        ctaBackground: { gradient: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' },
        isDark: true,
        glassStyle: 'frosted-dark',
        glowAccent: '#06b6d4'
      },
      {
        id: 'fresh-nature',
        hero: 'asymmetric-split',
        palette: 'emerald-fresh',
        buttons: { style: 'rounded', primary: '#10b981', textColor: 'white', radius: 10 },
        cards: 'soft-shadow',
        heroBackground: { gradient: 'linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #06b6d4 100%)' },
        sectionBackgrounds: [
          { color: '#f0fdf4' },
          { color: '#ecfdf5' },
          { gradient: 'linear-gradient(180deg, #f0fdf4 0%, #ecfdf5 100%)' }
        ],
        ctaBackground: { gradient: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' }
      },
      {
        id: 'creative-bold',
        hero: 'diagonal-split',
        palette: 'purple-pink',
        buttons: { style: 'gradient', primary: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', textColor: 'white', radius: 8, isGradient: true },
        cards: 'hover-lift',
        heroBackground: { gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)' },
        sectionBackgrounds: [
          { color: '#faf5ff' },
          { color: '#fdf4ff' },
          { gradient: 'linear-gradient(180deg, #faf5ff 0%, #fdf4ff 100%)' }
        ],
        ctaBackground: { gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)' }
      },
      {
        id: 'tech-futuristic',
        hero: 'grid-overlay',
        palette: 'cyber-blue',
        buttons: { style: 'neon-outline', primary: '#06b6d4', textColor: '#06b6d4', radius: 4, isOutline: true, glowColor: '#06b6d4' },
        cards: 'glass-border',
        heroBackground: { gradient: 'linear-gradient(180deg, #020617 0%, #0f172a 50%, #1e293b 100%)' },
        sectionBackgrounds: [
          { color: '#0f172a' },
          { color: '#1e293b' },
          { gradient: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }
        ],
        ctaBackground: { gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' },
        isDark: true,
        glassStyle: 'deep-dark',
        glowAccent: '#06b6d4',
        gridOverlay: true
      },
      // 4 NEW RECIPES for expanded variety
      {
        id: 'magazine-editorial',
        hero: 'asymmetric-60-40-right-image',
        palette: 'refined-charcoal',
        buttons: { style: 'sharp-minimal', primary: '#2d2d2d', textColor: 'white', radius: 0 },
        cards: 'borderless-hover',
        heroBackground: { color: '#faf9f7' },
        sectionBackgrounds: [
          { color: '#ffffff' },
          { color: '#faf9f7' },
          { color: '#f5f5f5' }
        ],
        ctaBackground: { color: '#2d2d2d' }
      },
      {
        id: 'brutalist-bold',
        hero: 'stacked-large-type',
        palette: 'high-contrast-mono',
        buttons: { style: 'blocky', primary: '#000000', textColor: '#ffffff', radius: 0 },
        cards: 'raw-borders',
        heroBackground: { color: '#ffffff' },
        sectionBackgrounds: [
          { color: '#ffffff' },
          { color: '#f0f0f0' },
          { color: '#e0e0e0' }
        ],
        ctaBackground: { color: '#000000' },
        isDark: false
      },
      {
        id: 'organic-soft',
        hero: 'overlapping-cards',
        palette: 'warm-earth',
        buttons: { style: 'rounded-soft', primary: '#92400e', textColor: 'white', radius: 20 },
        cards: 'soft-rounded',
        heroBackground: { gradient: 'linear-gradient(180deg, #fefdf8 0%, #f5f0e8 100%)' },
        sectionBackgrounds: [
          { color: '#fefdf8' },
          { color: '#f5f0e8' },
          { gradient: 'linear-gradient(180deg, #fefdf8 0%, #f5f0e8 100%)' }
        ],
        ctaBackground: { gradient: 'linear-gradient(135deg, #92400e 0%, #c4a373 100%)' }
      },
      {
        id: 'neo-retro',
        hero: 'asymmetric-collage',
        palette: 'vintage-pop',
        buttons: { style: 'retro-rounded', primary: '#e63946', textColor: 'white', radius: 8 },
        cards: 'playful-colored',
        heroBackground: { color: '#fdf6ec' },
        sectionBackgrounds: [
          { color: '#fdf6ec' },
          { color: '#fff8e7' },
          { gradient: 'linear-gradient(180deg, #fdf6ec 0%, #fff8e7 100%)' }
        ],
        ctaBackground: { gradient: 'linear-gradient(135deg, #e63946 0%, #f4a261 100%)' }
      }
    ];
    
    // Generate a fresh seed for this enrichment pass — no globalThis dependency
    // (globalThis mutations cause concurrency data races between concurrent builds)
    const preSelectedRecipeId: string | undefined = undefined; // Recipe selected independently
    const preSelectedSeed = Math.floor(Math.random() * 1000000);
    
    // Find the matching recipe, fallback to random if not found
    let selectedRecipe = preSelectedRecipeId 
      ? DESIGN_RECIPES.find(r => r.id === preSelectedRecipeId)
      : undefined;
    if (!selectedRecipe) {
      const fallbackIndex = preSelectedSeed % DESIGN_RECIPES.length;
      selectedRecipe = DESIGN_RECIPES[fallbackIndex];
      console.log(`[Enrichment] Selected recipe: ${selectedRecipe.id} (seed: ${preSelectedSeed})`);
    }
    
    const randomSeed = preSelectedSeed;
    
    console.log(`[Design Variety] Using pre-selected recipe: ${selectedRecipe.id} (seed: ${randomSeed})`);
    console.log(`[Design Variety] Hero layout: ${selectedRecipe.hero}, Palette: ${selectedRecipe.palette}`);
    console.log(`[Design Variety] Button style: ${selectedRecipe.buttons.style}, radius: ${selectedRecipe.buttons.radius}`);
    
    // Helper to check if background is basic/missing (RELAXED to preserve intentional light themes)
    const isBasicBackground = (style: any): boolean => {
      if (!style?.background) return true;
      const bg = style.background;
      
      // If has gradient, it's NOT basic - AI made a design choice
      if (bg.gradient) return false;
      
      // If has image, it's NOT basic
      if (bg.image) return false;
      
      const color = (bg.color || '').toLowerCase().trim();
      
      // No color at all
      if (!color) return true;
      
      // Only pure transparent/white are truly "basic" - CSS variables are design choices
      const explicitBasic = [
        'transparent', 'white', '#ffffff', '#fff',
        'rgb(255, 255, 255)', 'rgb(255,255,255)',
        'rgba(255, 255, 255, 1)', 'rgba(255,255,255,1)'
      ];
      if (explicitBasic.includes(color)) return true;
      
      // CSS variable usage is an intentional design choice - NOT basic
      if (color.includes('var(--') || color.includes('hsl(var(--')) {
        console.log(`[isBasicBackground] Preserved AI's CSS variable choice: ${color}`);
        return false;
      }
      
      // Check if it's a pure white hex color (brightness > 252 only)
      // This preserves cream, off-white, light gray etc as intentional choices
      if (color.startsWith('#')) {
        const hex = color.replace('#', '');
        let r = 0, g = 0, b = 0;
        
        if (hex.length === 3) {
          r = parseInt(hex[0] + hex[0], 16);
          g = parseInt(hex[1] + hex[1], 16);
          b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) {
          r = parseInt(hex.slice(0, 2), 16);
          g = parseInt(hex.slice(2, 4), 16);
          b = parseInt(hex.slice(4, 6), 16);
        }
        
        const brightness = (r + g + b) / 3;
        // Only pure white (brightness > 252) is basic - preserve intentional light themes
        if (brightness > 252) {
          console.log(`[isBasicBackground] Detected pure white: ${color} (brightness: ${brightness})`);
          return true;
        }
        
        // Intentional color choice (cream, off-white, light gray)
        console.log(`[isBasicBackground] Preserved AI's light color choice: ${color} (brightness: ${brightness})`);
        return false;
      }
      
      // Any other color is an intentional choice
      return false;
    };
    
    // Helper to check if AI already applied rich button styling
    const hasRichButtonStyling = (style: any): boolean => {
      if (!style) return false;
      
      // Check for explicit background color (not transparent or CSS var)
      const hasSolidBg = style.background?.color && 
        !['transparent', 'hsl(var(--background))'].includes(style.background.color);
      
      // Check for gradient
      const hasGradient = !!style.background?.gradient;
      
      // Check for explicit border styling
      const hasStyledBorder = style.border?.width > 0 && style.border?.color;
      
      // Check for glow/shadow effects
      const hasGlow = Array.isArray(style.shadow) || (style.shadow?.blur > 12);
      
      return hasSolidBg || hasGradient || hasStyledBorder || hasGlow;
    };
    
    // ═══════════════════════════════════════════════════
    // SPARSE SECTION ENRICHMENT - Fix empty/sparse sections
    // ═══════════════════════════════════════════════════
    const enrichSparseSection = (component: any): any => {
      if (!component) return component;
      
      const id = (component.id || '').toLowerCase();
      
      // ═══════════════════════════════════════════════════════════════
      // CARD STYLING ENRICHMENT - Ensure visible shadows and borders
      // ═══════════════════════════════════════════════════════════════
      if (component.type === 'div' && id.includes('card')) {
        component.props = component.props || {};
        
        // ALWAYS ensure visible shadow (not too subtle)
        if (!component.props.boxShadows || component.props.boxShadows.length === 0) {
          component.props.boxShadows = [{
            enabled: true, 
            type: 'outer',
            x: 0, 
            y: 12, 
            blur: 32, 
            spread: -6,
            color: 'rgba(0,0,0,0.15)' // More visible than 0.08
          }];
          console.log(`[Card Enrichment] Added visible shadow to card: ${id}`);
        } else {
          // Fix existing shadows that are too subtle
          component.props.boxShadows = component.props.boxShadows.map((shadow: any) => {
            if (shadow.color && typeof shadow.color === 'string') {
              // Increase opacity if too low (0.08 or less)
              const opacityMatch = shadow.color.match(/rgba\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([0-9.]+)\)/);
              if (opacityMatch && parseFloat(opacityMatch[4]) <= 0.1) {
                shadow.color = shadow.color.replace(/,[^)]+\)$/, ', 0.15)');
                console.log(`[Card Enrichment] Increased shadow opacity for card: ${id}`);
              }
            }
            return shadow;
          });
        }
        
        // ALWAYS ensure border for definition
        if (!component.props.border || !component.props.border.width || component.props.border.width === '0') {
          component.props.border = {
            width: '1', 
            style: 'solid',
            color: 'hsl(var(--border))',
            unit: 'px',
            sides: { top: true, right: true, bottom: true, left: true }
          };
          console.log(`[Card Enrichment] Added border to card: ${id}`);
        }
        
        // Ensure borderRadius
        if (!component.props.borderRadius) {
          component.props.borderRadius = {
            topLeft: '16', topRight: '16', bottomRight: '16', bottomLeft: '16', unit: 'px'
          };
        }
        
        // Ensure hover state for cards - use DIRECT PROPS that renderer actually checks
        if (!component.props.hoverTransform) {
          component.props.hoverTransform = 'translateY(-6px) scale(1.02)';
        }
        if (!component.props.hoverShadow) {
          component.props.hoverShadow = '0 20px 40px -12px rgba(0,0,0,0.2)';
        }
        
        // Also set stateStyles for backwards compatibility
        component.props.stateStyles = component.props.stateStyles || {};
        component.props.stateStyles.hover = component.props.stateStyles.hover || {
          transform: component.props.hoverTransform,
          boxShadow: component.props.hoverShadow
        };
        
        // Ensure transition
        if (!component.props.transition) {
          component.props.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        }
        
        // CRITICAL: Mark as AI-generated so renderer respects inline backgroundColor
        component.props._aiGenerated = true;
      }
      
      // Check if section is sparse (missing background, too few children, etc.)
      const isSparse = (
        component.type === 'section' &&
        !component.props?.backgroundColor && 
        !component.props?.backgroundGradient &&
        !component.style?.background?.color &&
        !component.style?.background?.gradient
      );
      
      const hasTooFewChildren = (
        component.type === 'section' &&
        (!component.children || component.children.length < 2)
      );
      
      if (isSparse) {
        // Add default rich background based on section ID
        const sectionBackgrounds: Record<string, any> = {
          'hero': { 
            props: { backgroundGradient: 'linear-gradient(135deg, #0d9488 0%, #06b6d4 50%, #3b82f6 100%)' }
          },
          'cta': { 
            props: { backgroundGradient: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)' }
          },
          'features': { 
            props: { backgroundColor: { type: 'solid', value: '#f8fafc' } }
          },
          'testimonials': { 
            props: { backgroundColor: { type: 'solid', value: '#fafafa' } }
          },
          'about': { 
            props: { backgroundColor: { type: 'solid', value: '#f8fafc' } }
          },
          'pricing': { 
            props: { backgroundColor: { type: 'solid', value: '#fafafa' } }
          },
          'projects': { 
            props: { backgroundColor: { type: 'solid', value: '#f8fafc' } }
          },
          'footer': { 
            props: { backgroundColor: { type: 'solid', value: '#0f172a' } }
          }
        };
        
        // Find matching background
        let matchedBg = null;
        for (const [key, bg] of Object.entries(sectionBackgrounds)) {
          if (id.includes(key)) {
            matchedBg = bg;
            break;
          }
        }
        
        if (matchedBg) {
          component.props = { ...component.props, ...matchedBg.props };
          console.log(`[Sparse Enrichment] Added background to sparse section: ${id}`);
        } else {
          // Default fallback for unknown sections
          component.props = { 
            ...component.props, 
            backgroundColor: { type: 'solid', value: '#f8fafc' } 
          };
          console.log(`[Sparse Enrichment] Added default background to section: ${id}`);
        }
      }
      
      // Fix sections with too few children by adding scaffold content
      if (hasTooFewChildren) {
        // NEW: Check if there's already a header div - avoid duplicating scaffolds
        const existingHeader = (component.children || []).find((c: any) => {
          const childId = String(c.id || '').toLowerCase();
          return childId.includes('-header') || childId.includes('header-');
        });
        
        if (existingHeader) {
          // Complete existing header if incomplete (has no heading)
          const hasHeading = (existingHeader.children || []).some((c: any) => 
            ['heading', 'h1', 'h2', 'h3', 'h4'].includes(c.type)
          );
          
          if (!hasHeading) {
            console.log(`[Sparse Enrichment] Completing incomplete header: ${existingHeader.id}`);
            existingHeader.children = existingHeader.children || [];
            existingHeader.children.push(
              { id: `${existingHeader.id}-title`, type: 'heading', props: { content: 'Section Title', tag: 'h2', typography: { fontSize: '40', fontWeight: '700', textAlign: 'center', color: 'hsl(var(--foreground))' } } },
              { id: `${existingHeader.id}-desc`, type: 'text', props: { content: 'Discover what we have to offer.', typography: { fontSize: '18', textAlign: 'center', color: 'hsl(var(--muted-foreground))', lineHeight: '1.6' } } }
            );
          } else {
            console.log(`[Sparse Enrichment] Section already has complete header: ${existingHeader.id} - skipping scaffold`);
          }
          // Don't add new scaffold if header already exists
        } else {
          // No existing header - add scaffold as before
          console.warn(`[Sparse Enrichment] Section has too few children (${component.children?.length || 0}): ${id} - adding scaffold`);
          
          // Create minimal section content based on ID
          const scaffoldChildren: any[] = [];
          
          // Always add a header div
          scaffoldChildren.push({
            id: `${id}-header`,
            type: 'div',
            props: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12', width: '100%', maxWidth: '600px' },
            children: [
              { id: `${id}-title`, type: 'heading', props: { content: 'Section Title', tag: 'h2', typography: { fontSize: '40', fontWeight: '700', textAlign: 'center', color: 'hsl(var(--foreground))' } } },
              { id: `${id}-desc`, type: 'text', props: { content: 'Add descriptive content here to engage your audience.', typography: { fontSize: '18', textAlign: 'center', color: 'hsl(var(--muted-foreground))', lineHeight: '1.6' } } }
            ]
          });
          
          // Keep existing children if any
          if (component.children && component.children.length > 0) {
            scaffoldChildren.push(...component.children);
          }
          
          component.children = scaffoldChildren;
        }
      }
      
      // ═══════════════════════════════════════════════════
      // DESIGN SYSTEM TOKEN APPLICATION - Apply spacing tokens from project
      // ═══════════════════════════════════════════════════
      
      // Helper to extract token value
      const getSpacingToken = (tokenName: string): string | null => {
        const token = context?.designSystem?.spacing?.find((s: any) => s.name === tokenName);
        return token?.value ? String(token.value).replace('px', '') : null;
      };
      
      // Section: Apply section-gap and container-padding tokens
      if (component.type === 'section' && component.props) {
        const sectionGap = getSpacingToken('section-gap');
        const containerPadding = getSpacingToken('container-padding');
        
        // Apply section-gap if no gap specified
        if (!component.props.gap && sectionGap) {
          component.props.gap = sectionGap;
          console.log(`[Token Application] Applied section-gap token (${sectionGap}) to section: ${id}`);
        }
        
        // Apply container-padding if no padding specified
        if (!component.props.spacingControl?.padding) {
          const verticalPadding = containerPadding || '80';
          component.props.spacingControl = component.props.spacingControl || {};
          component.props.spacingControl.padding = {
            top: verticalPadding,
            right: '24', 
            bottom: verticalPadding,
            left: '24',
            unit: 'px'
          };
          console.log(`[Token Application] Applied container-padding token (${verticalPadding}) to section: ${id}`);
        }
      }
      
      // Form: Apply form-gap token
      if (['form-wrapper', 'form-wizard'].includes(component.type) && component.props) {
        const formGap = getSpacingToken('form-gap');
        if (!component.props.gap && formGap) {
          component.props.gap = formGap;
          console.log(`[Token Application] Applied form-gap token (${formGap}) to form: ${id}`);
        }
      }
      
      // Card/Modal: Apply modal-padding token
      const isCard = id.includes('card') || id.includes('modal') || component.type === 'card';
      if (isCard && component.props) {
        const modalPadding = getSpacingToken('modal-padding');
        if (!component.props.spacingControl?.padding && modalPadding) {
          component.props.spacingControl = component.props.spacingControl || {};
          component.props.spacingControl.padding = {
            top: modalPadding,
            right: modalPadding,
            bottom: modalPadding,
            left: modalPadding,
            unit: 'px'
          };
          console.log(`[Token Application] Applied modal-padding token (${modalPadding}) to card: ${id}`);
        }
      }
      
      // Recursively process children
      if (component.children && Array.isArray(component.children)) {
        component.children = component.children.map(enrichSparseSection);
      }
      
      return component;
    };
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // COMPONENT SANITIZER - Prevent "Cannot create property 'props' on string" crashes
    // ═══════════════════════════════════════════════════════════════════════════════
    const sanitizeComponent = (comp: any): any => {
      // Handle primitives - convert to text component
      if (comp === null || comp === undefined) return null;
      
      if (typeof comp === 'string' || typeof comp === 'number' || typeof comp === 'boolean') {
        const textValue = String(comp).trim();
        if (!textValue) return null;
        console.warn(`[Sanitizer] Converting primitive to text: "${textValue.slice(0, 50)}..."`);
        return {
          id: `sanitized-text-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'text',
          props: { content: textValue },
          style: {},
          children: []
        };
      }
      
      // Must be an object
      if (typeof comp !== 'object') return null;
      
      // Ensure type exists
      if (!comp.type || typeof comp.type !== 'string') {
        comp.type = 'div';
      }
      
      // Ensure ID exists
      if (!comp.id || typeof comp.id !== 'string') {
        comp.id = `sanitized-${comp.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      }
      
      // Ensure props is an object
      if (!comp.props || typeof comp.props !== 'object') {
        const oldProps = comp.props;
        comp.props = {};
        if (typeof oldProps === 'string') {
          if (['heading', 'text', 'label', 'paragraph', 'span'].includes(comp.type)) {
            comp.props.content = oldProps;
          } else if (['button', 'link'].includes(comp.type)) {
            comp.props.text = oldProps;
          }
          console.warn(`[Sanitizer] Fixed non-object props for ${comp.id}`);
        }
      }
      
      // Ensure style is an object
      if (!comp.style || typeof comp.style !== 'object') {
        comp.style = {};
      }
      
      // Handle non-array children
      if (comp.children !== undefined && !Array.isArray(comp.children)) {
        const oldChildren = comp.children;
        if (typeof oldChildren === 'string' || typeof oldChildren === 'number') {
          if (['heading', 'text', 'label', 'paragraph', 'span'].includes(comp.type) && !comp.props.content) {
            comp.props.content = String(oldChildren);
            comp.children = [];
          } else if (['button', 'link'].includes(comp.type) && !comp.props.text) {
            comp.props.text = String(oldChildren);
            comp.children = [];
          } else {
            comp.children = [];
          }
          console.warn(`[Sanitizer] Fixed non-array children for ${comp.id}`);
        } else {
          comp.children = [];
        }
      }
      
      // Recursively sanitize children, filtering out primitives
      if (Array.isArray(comp.children)) {
        comp.children = comp.children
          .map((child: any) => sanitizeComponent(child))
          .filter((child: any) => child !== null);
      } else {
        comp.children = [];
      }
      
      return comp;
    };
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // PRE-ENRICHMENT SANITIZATION - Sanitize all steps before any mutation
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log(`[Sanitization] Pre-enrichment sanitization pass starting...`);
    result.steps = result.steps.filter((step: any) => {
      if (step.type !== 'component') return true;
      
      if (!step.data || typeof step.data !== 'object') {
        console.warn(`[Sanitization] Dropping step with invalid data type: ${typeof step.data}`);
        return false;
      }
      
      step.data = sanitizeComponent(step.data);
      return step.data !== null;
    });
    console.log(`[Sanitization] ${result.steps.filter((s: any) => s.type === 'component').length} valid component steps after sanitization`);
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION STRUCTURE VALIDATOR - Enforces template compliance
    // ═══════════════════════════════════════════════════════════════════════════════
    const validateSectionStructure = (component: any): any => {
      if (!component || typeof component !== 'object') return component;
      
      const id = (component.id || '').toLowerCase();
      const type = component.type || '';
      
      // Only validate sections
      if (type !== 'section') {
        // Recursively validate children of non-sections
        if (component.children && Array.isArray(component.children)) {
          component.children = component.children.map((child: any) => validateSectionStructure(child));
        }
        return component;
      }
      
      component.props = component.props || {};
      
      // ═══════════════════════════════════════════════════
      // ENFORCE: width 100% always; preserve AI layout choices
      // Only apply flex-column-center as a DEFAULT if AI omitted display entirely
      // ═══════════════════════════════════════════════════
      component.props.width = '100%';
      if (!component.props.display) {
        // AI did not specify a layout — apply safe default
        component.props.display = 'flex';
        component.props.flexDirection = 'column';
        component.props.alignItems = 'center';
      }
      // Preserve intentional grid, split-screen, and bento layouts from the AI
      
      // ═══════════════════════════════════════════════════
      // ENFORCE: Gap must be reasonable (32-64px, not 100+)
      // ═══════════════════════════════════════════════════
      const gap = parseInt(String(component.props.gap || '48'));
      if (gap > 64 || gap < 24) {
        console.log(`[Section Validator] Fixed excessive gap ${gap} -> 48 on: ${id}`);
        component.props.gap = '48';
      }
      
      // ═══════════════════════════════════════════════════
      // ENFORCE: Must have background color
      // ═══════════════════════════════════════════════════
      const isFooter = id.includes('footer');
      const isCTA = id.includes('cta');
      const isHero = id.includes('hero');
      
      if (!component.props.backgroundColor && !component.props.backgroundGradient) {
        if (isFooter) {
          component.props.backgroundColor = { type: 'solid', value: '#0f172a' };
        } else if (isCTA) {
          component.props.backgroundGradient = 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)';
        } else if (!isHero) {
          component.props.backgroundColor = { type: 'solid', value: '#f8fafc' };
        }
        console.log(`[Section Validator] Added background to section: ${id}`);
      }
      
      // ═══════════════════════════════════════════════════
      // ENFORCE: Header children must be centered
      // ═══════════════════════════════════════════════════
      if (Array.isArray(component.children)) {
        for (const child of component.children) {
          if (!child || typeof child !== 'object') continue;
          
          const childId = (child.id || '').toLowerCase();
          
          // Fix header wrappers - MUST be centered
          if (childId.includes('header') || childId.includes('-head')) {
            child.props = child.props || {};
            child.props.display = 'flex';
            child.props.flexDirection = 'column';
            child.props.alignItems = 'center'; // FORCE centered
            child.props.gap = child.props.gap || '12';
            child.props.maxWidth = child.props.maxWidth || '700px';
            child.props.width = '100%';
            
            // Also ensure text inside header is centered
            if (Array.isArray(child.children)) {
              for (const headerChild of child.children) {
                if (!headerChild?.props?.typography) continue;
                headerChild.props.typography.textAlign = 'center';
              }
            }
            
            console.log(`[Section Validator] Fixed header alignment to center: ${childId}`);
          }
          
          // Fix grid containers
          if (childId.includes('grid') || childId.includes('cards') || childId.includes('features')) {
            child.props = child.props || {};
            if (child.props.display === 'grid') {
              child.props.alignItems = 'start';
              child.props.gridAutoRows = 'auto';
            }
            
            // Fix cards inside grid
            if (Array.isArray(child.children)) {
              for (const card of child.children) {
                if (!card || typeof card !== 'object') continue;
                const cardId = (card.id || '').toLowerCase();
                if (cardId.includes('card') || cardId.includes('item') || cardId.includes('feature')) {
                  card.props = card.props || {};
                  card.props.alignSelf = 'start';
                  card.props.minWidth = card.props.minWidth || '200px';
                  
                  // Ensure cards have shadows
                  if (!card.props.boxShadows || (Array.isArray(card.props.boxShadows) && card.props.boxShadows.length === 0)) {
                    card.props.boxShadows = [{ enabled: true, type: 'outer', x: 0, y: 4, blur: 16, spread: -4, color: 'rgba(0,0,0,0.06)' }];
                  }
                  
                  // Ensure cards have hover
                  if (!card.props.stateStyles?.hover) {
                    card.props.stateStyles = card.props.stateStyles || {};
                    card.props.stateStyles.hover = { transform: 'translateY(-4px)' };
                  }
                  
                  // Ensure transition
                  if (!card.props.transition) {
                    card.props.transition = 'all 0.3s ease';
                  }
                }
              }
            }
          }
        }
        
        // Recursively validate children
        component.children = component.children.map((child: any) => validateSectionStructure(child));
      }
      
      return component;
    };
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // APPLY SECTION VALIDATION - Run before enrichment
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log(`[Section Validator] Validating section structures...`);
    for (const step of result.steps) {
      if (step.type === 'component' && step.data) {
        step.data = validateSectionStructure(step.data);
      }
    }
    console.log(`[Section Validator] Validation complete`);
    
    let sectionIndex = 0;
    
    const enrichComponent = (component: any, parentId?: string): any => {
      // Use sanitizer to handle any remaining edge cases
      if (!component || typeof component !== 'object') {
        return sanitizeComponent(component);
      }
      
      const id = (component.id || '').toLowerCase();
      const isHero = id.includes('hero');
      const isCTA = id.includes('cta') && component.type === 'section';
      const isFooter = id.includes('footer');
      const isNav = id.includes('nav');
      
      // ═══════════════════════════════════════════════════
      // SECTION ENRICHMENT - AGGRESSIVE RECIPE-BASED backgrounds
      // ═══════════════════════════════════════════════════
      if (component.type === 'section') {
        component.props = component.props || {};
        
        // HERO - Only apply recipe background if AI didn't provide a rich one
        if (isHero) {
          // Check if AI provided a rich background (check both style and props)
          const hasRichBg = component.props?.backgroundColor || component.props?.backgroundGradient || 
                            !isBasicBackground(component.style || {});
          if (!hasRichBg) {
            // AI didn't provide a rich background, use recipe fallback - WRITE TO PROPS
            if (selectedRecipe.heroBackground?.gradient) {
              component.props.backgroundGradient = selectedRecipe.heroBackground.gradient;
            } else if (selectedRecipe.heroBackground?.color) {
              component.props.backgroundColor = { type: 'solid', value: selectedRecipe.heroBackground.color, opacity: 100 };
            }
            console.log(`[Enrichment] Applied ${selectedRecipe.id} fallback hero background to PROPS`);
          } else {
            console.log(`[Enrichment] PRESERVED AI-generated hero background`);
          }
          
          // Ensure minHeight - CONDITIONAL (only if AI didn't specify ANY height) - WRITE TO PROPS
          const hasAnyHeight = component.props?.height || component.props?.minHeight || component.props?.maxHeight;
          if (!hasAnyHeight) {
            component.props.minHeight = '60vh';
          }
          
          // CRITICAL: Ensure hero has position:relative for absolute children (gradient orbs) - WRITE TO PROPS
          if (!component.props.position) {
            component.props.position = 'relative';
          }
          if (!component.props.overflow) {
            component.props.overflow = 'hidden'; // Prevent orbs from bleeding outside
          }
          
          // DECORATIVE ELEMENT INJECTION - Add floating gradient orbs using PROPS format
          const hasOrb = component.children?.some((c: any) => c.id?.includes('gradient-orb'));
          if (!hasOrb && Array.isArray(component.children)) {
            // Add decorative gradient orb 1 (top right) - using PROPS format
            component.children.unshift({
              id: 'hero-gradient-orb-1',
              type: 'div',
              props: {
                width: '400px',
                height: '400px',
                position: 'absolute',
                top: '-100px',
                right: '-100px',
                zIndex: 0,
                backgroundGradient: `radial-gradient(circle, ${selectedRecipe.buttons.primary}30 0%, transparent 70%)`,
                filter: 'blur(80px)',
                pointerEvents: 'none'
              },
              children: []
            });
            // Add decorative gradient orb 2 (bottom left) - using PROPS format
            component.children.unshift({
              id: 'hero-gradient-orb-2',
              type: 'div',
              props: {
                width: '300px',
                height: '300px',
                position: 'absolute',
                bottom: '-50px',
                left: '-100px',
                zIndex: 0,
                backgroundGradient: `radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)`,
                filter: 'blur(60px)',
                pointerEvents: 'none'
              },
              children: []
            });
            console.log(`[Enrichment] Injected decorative gradient orbs into hero section (PROPS format)`);
          }
        }
        
        // CTA sections - Only apply recipe if AI didn't provide rich styling - WRITE TO PROPS
        if (isCTA && !isHero) {
          const hasRichBg = component.props?.backgroundColor || component.props?.backgroundGradient || 
                            !isBasicBackground(component.style || {});
          if (!hasRichBg) {
            if (selectedRecipe.ctaBackground?.gradient) {
              component.props.backgroundGradient = selectedRecipe.ctaBackground.gradient;
            } else if (selectedRecipe.ctaBackground?.color) {
              component.props.backgroundColor = { type: 'solid', value: selectedRecipe.ctaBackground.color, opacity: 100 };
            }
            console.log(`[Enrichment] Applied ${selectedRecipe.id} fallback CTA background to PROPS`);
          } else {
            console.log(`[Enrichment] PRESERVED AI-generated CTA background`);
          }
          
          // CTA CONTENT CENTERING - CONDITIONAL (only if AI didn't specify layout) - WRITE TO PROPS
          if (!component.props.display) {
            component.props.display = 'flex';
            component.props.flexDirection = 'column';
          }
          if (!component.props.alignItems) {
            component.props.alignItems = 'center';
          }
          if (!component.props.justifyContent) {
            component.props.justifyContent = 'center';
          }
          if (!component.props.typography?.textAlign) {
            component.props.typography = component.props.typography || {};
            component.props.typography.textAlign = 'center';
          }
          console.log(`[Enrichment] CTA section layout applied to PROPS: ${id}`);
        }
        
        // Regular sections - Only apply recipe backgrounds when AI output is basic - WRITE TO PROPS
        if (!isHero && !isCTA && !isFooter && !isNav) {
          const bgIndex = sectionIndex % selectedRecipe.sectionBackgrounds.length;
          
          // Only apply fallback if background is truly basic
          const hasRichBg = component.props?.backgroundColor || component.props?.backgroundGradient || 
                            !isBasicBackground(component.style || {});
          if (!hasRichBg) {
            const bgRecipe = selectedRecipe.sectionBackgrounds[bgIndex];
            if (bgRecipe?.gradient) {
              component.props.backgroundGradient = bgRecipe.gradient;
            } else if (bgRecipe?.color) {
              component.props.backgroundColor = { type: 'solid', value: bgRecipe.color, opacity: 100 };
            }
            console.log(`[Enrichment] Applied ${selectedRecipe.id} fallback section background ${bgIndex} to PROPS:`, id);
          } else {
            console.log(`[Enrichment] PRESERVED AI-generated section background for:`, id);
          }
          
          // ═══════════════════════════════════════════════════════════════════════════
          // CRITICAL: Section Isolation - ALL sections need position:relative and overflow:hidden
          // This creates a stacking context and prevents content bleeding between sections
          // ═══════════════════════════════════════════════════════════════════════════
          if (!component.props.position) {
            component.props.position = 'relative';
          }
          if (!component.props.overflow) {
            component.props.overflow = 'hidden';
          }
          
          sectionIndex++;
        }
        
        // Dark theme text color fix - WRITE TO PROPS
        if (selectedRecipe.isDark && (isHero || isCTA)) {
          component.props.typography = component.props.typography || {};
          if (!component.props.typography.color) {
            component.props.typography.color = 'rgba(255,255,255,0.95)';
          }
        }
        
        // Ensure sections have proper padding - WRITE TO PROPS
        if (!component.props?.spacingControl?.padding) {
          component.props.spacingControl = component.props.spacingControl || {};
          component.props.spacingControl.padding = { top: '80', right: '24', bottom: '80', left: '24', unit: 'px' };
        }
      }
      
      // ═══════════════════════════════════════════════════
      // BUTTON ENRICHMENT - RECIPE-BASED button styling (ADDITIVE)
      // ═══════════════════════════════════════════════════
      if (component.type === 'button') {
        const variant = component.props?.variant;
        const buttonId = id;
        
        // Check if AI already provided rich button styling
        if (hasRichButtonStyling(component.style)) {
          console.log(`[Enrichment] PRESERVED AI-generated button styling for:`, buttonId);
          // Skip recipe application - AI made intentional design choices
        } else {
          // AI didn't provide rich styling - apply recipe fallback
          const isPrimaryCTA = buttonId.includes('cta') || 
                               buttonId.includes('primary') || 
                               buttonId.includes('submit') || 
                               buttonId.includes('get-started') ||
                               buttonId.includes('shop') || 
                               buttonId.includes('hire') ||
                               buttonId.includes('book') ||
                               buttonId.includes('start');
          component.style = component.style || {};
          
          if (variant === 'outline' || variant === 'secondary') {
            // Secondary button - use recipe colors for outline
            const outlineColor = selectedRecipe.isDark ? 'rgba(255,255,255,0.6)' : selectedRecipe.buttons.primary;
            const textColor = selectedRecipe.isDark ? 'rgba(255,255,255,0.9)' : selectedRecipe.buttons.primary;
            
            component.style.background = { color: 'transparent' };
            component.style.typography = { color: textColor, fontSize: '14px', fontWeight: '500' };
            component.style.spacing = { padding: { top: 14, right: 28, bottom: 14, left: 28 } };
            component.style.border = { width: 1, style: 'solid', color: outlineColor, radius: selectedRecipe.buttons.radius };
            console.log(`[Enrichment] Applied ${selectedRecipe.id} secondary button style to:`, buttonId);
          } else if (variant === 'ghost') {
            // Ghost buttons keep their styling, just ensure padding
            component.style.spacing = component.style.spacing || {};
            if (!component.style.spacing.padding) {
              component.style.spacing.padding = { top: 8, right: 16, bottom: 8, left: 16 };
            }
          } else if (isPrimaryCTA || variant === 'default' || !variant) {
            // Primary button - use RECIPE-SPECIFIC styling
            if (selectedRecipe.buttons.isGradient) {
              component.style.background = { gradient: selectedRecipe.buttons.primary };
            } else if (selectedRecipe.buttons.isOutline) {
              component.style.background = { color: 'transparent' };
              component.style.border = { width: 2, style: 'solid', color: selectedRecipe.buttons.primary, radius: selectedRecipe.buttons.radius };
            } else {
              component.style.background = { color: selectedRecipe.buttons.primary };
            }
            component.style.typography = { color: selectedRecipe.buttons.textColor, fontSize: '14px', fontWeight: '500' };
            component.style.spacing = { padding: { top: 14, right: 28, bottom: 14, left: 28 } };
            component.style.border = { ...component.style.border, radius: selectedRecipe.buttons.radius };
            console.log(`[Enrichment] Applied ${selectedRecipe.id} primary button style (${selectedRecipe.buttons.style}) to:`, buttonId);
          }
        }
        
        // Ensure button has content (prevent "Button" fallback)
        if (!component.props?.content && !component.props?.text && 
            !component.props?.brandIcon && !component.props?.icon) {
          component.props = component.props || {};
          component.props.content = 'Get Started';
        }
      }
      
      // ═══════════════════════════════════════════════════
      // CARD ENRICHMENT - RECIPE-BASED card styling + HOVER STATES
      // (WRITES TO PROPS, NOT STYLE)
      // ═══════════════════════════════════════════════════
      if (component.type === 'div' && id.includes('card')) {
        component.props = component.props || {};
        const hasShadow = component.props.boxShadows?.length > 0;
        const hasBorder = component.props.border?.width;
        
        if (!hasShadow && !hasBorder) {
          // Apply recipe-specific card style to PROPS
          const cardStyle = selectedRecipe.cards;
          if (cardStyle === 'glass' || cardStyle === 'glass-dark' || cardStyle === 'dark-glass') {
            component.props.backgroundColor = { type: 'solid', value: selectedRecipe.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)', opacity: 100 };
            component.props.backdropFilter = 'blur(12px)';
            component.props.border = { width: '1', style: 'solid', color: selectedRecipe.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', unit: 'px', sides: { top: true, right: true, bottom: true, left: true } };
            component.props.borderRadius = { topLeft: '16', topRight: '16', bottomRight: '16', bottomLeft: '16', unit: 'px' };
          } else if (cardStyle === 'bordered-minimal' || cardStyle === 'glass-border') {
            component.props.border = { width: '1', style: 'solid', color: 'hsl(var(--border))', unit: 'px', sides: { top: true, right: true, bottom: true, left: true } };
            component.props.borderRadius = { topLeft: '12', topRight: '12', bottomRight: '12', bottomLeft: '12', unit: 'px' };
          } else {
            // Default elevated shadow
            component.props.boxShadows = [{ enabled: true, type: 'outer', x: 0, y: 8, blur: 24, spread: -4, color: 'rgba(0,0,0,0.12)' }];
            component.props.borderRadius = component.props.borderRadius || { topLeft: '12', topRight: '12', bottomRight: '12', bottomLeft: '12', unit: 'px' };
          }
          console.log(`[Enrichment] Applied ${selectedRecipe.id} card style (${cardStyle}) to:`, id);
        }
        
        // ALWAYS add hover states and minWidth to cards - use DIRECT PROPS
        component.props.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        component.props.hoverTransform = component.props.hoverTransform || 'translateY(-6px) scale(1.02)';
        component.props.hoverShadow = component.props.hoverShadow || '0 24px 48px -12px rgba(0,0,0,0.18)';
        // Also set stateStyles for backwards compatibility
        component.props.stateStyles = component.props.stateStyles || {};
        component.props.stateStyles.hover = component.props.stateStyles.hover || {
          transform: component.props.hoverTransform,
          boxShadow: component.props.hoverShadow
        };
        component.props.cursor = 'pointer';
        component.props.minWidth = component.props.minWidth || '240px';
        component.props.width = component.props.width || '100%';
        component.props._aiGenerated = true; // CRITICAL: Enable inline background rendering
        console.log(`[Enrichment] Added hover state + minWidth to card: ${id}`);
      }
      
      // ═══════════════════════════════════════════════════
      // PRODUCT CATALOG - Diverse products for unique content
      // ═══════════════════════════════════════════════════
      const PRODUCT_CATALOG = [
        { name: 'Velvet Cascade Dress', description: 'Flowing silk with hand-stitched details', price: '$289.00', imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&h=400&fit=crop' },
        { name: 'Midnight Ember Coat', description: 'Tailored wool blend with satin lining', price: '$425.00', imageUrl: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=600&h=400&fit=crop' },
        { name: 'Aurora Silk Blouse', description: 'Lightweight elegance for any occasion', price: '$185.00', imageUrl: 'https://images.unsplash.com/photo-1564584217132-2271feaeb3c5?w=600&h=400&fit=crop' },
        { name: 'Coastal Linen Set', description: 'Breezy comfort meets refined style', price: '$245.00', imageUrl: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&h=400&fit=crop' },
        { name: 'Obsidian Chronograph', description: 'Swiss movement, sapphire crystal', price: '$599.00', imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=400&fit=crop' },
        { name: 'Artisan Leather Tote', description: 'Hand-crafted Italian leather', price: '$375.00', imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=400&fit=crop' },
        { name: 'Nova Running Shoes', description: 'Ultra-lightweight with cushioning', price: '$159.00', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=400&fit=crop' },
        { name: 'Pearl Drop Earrings', description: 'Freshwater pearls in 18k gold', price: '$128.00', imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&h=400&fit=crop' }
      ];
      
      // ═══════════════════════════════════════════════════
      // TESTIMONIAL PROFILES - Diverse clients with avatars
      // ═══════════════════════════════════════════════════
      const TESTIMONIAL_PROFILES = [
        { name: 'Sarah Chen', role: 'CEO, TechVentures Inc.', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face' },
        { name: 'Marcus Williams', role: 'Founder, Horizon Labs', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face' },
        { name: 'Emily Rodriguez', role: 'Marketing Director, Bloom', avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face' },
        { name: 'David Park', role: 'CTO, CloudScale Systems', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face' },
        { name: 'Aisha Johnson', role: 'VP Product, Innovate.io', avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face' },
        { name: 'James Mitchell', role: 'Head of Design, Artistry', avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face' }
      ];
      
      // ═══════════════════════════════════════════════════
      // PRODUCT CARD ENRICHMENT - Ensure unique images & content
      // ═══════════════════════════════════════════════════
      const isProductCard = id.includes('product-card') || id.includes('product-item');
      if (isProductCard && component.type === 'div') {
        component.props = component.props || {};
        
        // Extract product index from ID (e.g., product-card-1, product-card-2)
        const indexMatch = id.match(/(\d+)/);
        const productIndex = indexMatch ? parseInt(indexMatch[1]) - 1 : Math.floor(Math.random() * PRODUCT_CATALOG.length);
        const productData = PRODUCT_CATALOG[productIndex % PRODUCT_CATALOG.length];
        
        // Check if product card has an image child
        const hasImageChild = (children: any[]): boolean => {
          for (const c of children || []) {
            if (c.type === 'image') return true;
            if (c.children && hasImageChild(c.children)) return true;
          }
          return false;
        };
        
        if (!hasImageChild(component.children || [])) {
          // Inject UNIQUE product image based on index
          const productImage = {
            id: `${id}-image-enriched`,
            type: 'image',
            props: {
              src: productData.imageUrl,
              imagePrompt: `Professional product photography, ${productData.name}, studio lighting`,
              alt: productData.name,
              width: '100%',
              height: '220px',
              objectFit: 'cover',
              backgroundColor: 'hsl(var(--muted))',
              borderRadius: { topLeft: '12', topRight: '12', bottomRight: '0', bottomLeft: '0', unit: 'px' },
              _aiGenerated: true,
              transition: 'transform 0.3s ease',
              stateStyles: { hover: { transform: 'scale(1.05)' } }
            },
            style: {},
            children: []
          };
          component.children = component.children || [];
          component.children.unshift(productImage);
          console.log(`[Enrichment] Injected UNIQUE product image: ${productData.name}`);
        }
        
        // Update generic content in children
        const updateProductContent = (children: any[]) => {
          for (const child of children || []) {
            if (child.type === 'text' || child.type === 'heading') {
              const content = String(child.props?.content || '').toLowerCase().trim();
              if (content === 'product name' || content === 'product title' || content.includes('product name')) {
                child.props = child.props || {};
                child.props.content = productData.name;
                console.log(`[Enrichment] Updated product name: ${productData.name}`);
              }
            }
            if (child.children) updateProductContent(child.children);
          }
        };
        updateProductContent(component.children || []);
        
        // Ensure proper card styling for products
        component.props.display = 'flex';
        component.props.flexDirection = 'column';
        component.props.overflow = 'hidden';
        component.props.minWidth = '260px';
        component.props.width = '100%';
        if (!component.props.backgroundColor) {
          component.props.backgroundColor = { type: 'solid', value: 'hsl(var(--card))' };
        }
        if (!component.props.borderRadius) {
          component.props.borderRadius = { topLeft: '12', topRight: '12', bottomRight: '12', bottomLeft: '12', unit: 'px' };
        }
        if (!component.props.boxShadows || component.props.boxShadows.length === 0) {
          component.props.boxShadows = [{ enabled: true, type: 'outer', x: 0, y: 12, blur: 28, spread: -5, color: 'rgba(0,0,0,0.15)' }];
        }
        if (!component.props.border?.width) {
          component.props.border = { width: '1', style: 'solid', color: 'hsl(var(--border))', unit: 'px', sides: { top: true, right: true, bottom: true, left: true } };
        }
        component.props._aiGenerated = true;
      }
      
      // ═══════════════════════════════════════════════════
      // TESTIMONIAL CARD ENRICHMENT - Ensure avatars & visible shadows
      // ═══════════════════════════════════════════════════
      const isTestimonialCard = id.includes('testimonial-card') || id.includes('review-card');
      if (isTestimonialCard && component.type === 'div') {
        component.props = component.props || {};
        
        // Extract testimonial index from ID
        const indexMatch = id.match(/(\d+)/);
        const testimonialIndex = indexMatch ? parseInt(indexMatch[1]) - 1 : Math.floor(Math.random() * TESTIMONIAL_PROFILES.length);
        const profile = TESTIMONIAL_PROFILES[testimonialIndex % TESTIMONIAL_PROFILES.length];
        
        // Check if testimonial has avatar
        const hasAvatar = (children: any[]): boolean => {
          for (const c of children || []) {
            if (c.type === 'avatar') return true;
            if (c.type === 'image' && (c.id || '').toLowerCase().includes('avatar')) return true;
            if (c.children && hasAvatar(c.children)) return true;
          }
          return false;
        };
        
        if (!hasAvatar(component.children || [])) {
          // Find or create author section
          let authorSection = (component.children || []).find((c: any) => {
            const cid = (c.id || '').toLowerCase();
            return cid.includes('author') || cid.includes('client') || cid.includes('user');
          });
          
          const avatarComponent = {
            id: `${id}-avatar-enriched`,
            type: 'avatar',
            props: {
              src: profile.avatarUrl,
              alt: profile.name,
              size: 'md',
              fallback: profile.name.split(' ').map((n: string) => n[0]).join(''),
              width: '48px',
              height: '48px'
            },
            style: {},
            children: []
          };
          
          if (authorSection && authorSection.type === 'div') {
            authorSection.children = authorSection.children || [];
            
            // Check if author section has name/role texts
            const hasNameRole = (children: any[]): boolean => {
              for (const c of children || []) {
                if ((c.type === 'text' || c.type === 'heading') && c.id?.toLowerCase().includes('name')) return true;
                if (c.type === 'div' && c.children?.length > 0) return true; // Info div with children
              }
              return false;
            };
            
            // Add avatar at the beginning
            authorSection.children.unshift(avatarComponent);
            
            // Add name/role if missing
            if (!hasNameRole(authorSection.children)) {
              const infoDivComponent = {
                id: `${id}-author-info`,
                type: 'div',
                props: { display: 'flex', flexDirection: 'column', gap: '4px' },
                style: {},
                children: [
                  { id: `${id}-name`, type: 'text', props: { content: profile.name, typography: { fontSize: '15', fontWeight: '600', color: 'hsl(var(--foreground))' } }, style: {}, children: [] },
                  { id: `${id}-role`, type: 'text', props: { content: profile.role, typography: { fontSize: '13', color: 'hsl(var(--muted-foreground))' } }, style: {}, children: [] }
                ]
              };
              authorSection.children.push(infoDivComponent);
              console.log(`[Enrichment] Added missing name/role: ${profile.name}`);
            }
            
            authorSection.props = authorSection.props || {};
            authorSection.props.display = 'flex';
            authorSection.props.alignItems = 'center';
            authorSection.props.gap = '16px';
            console.log(`[Enrichment] Added avatar to testimonial: ${profile.name}`);
          } else {
            // Create new author section with avatar at end of card
            const newAuthorSection = {
              id: `${id}-author-enriched`,
              type: 'div',
              props: { display: 'flex', alignItems: 'center', gap: '16px', spacingControl: { margin: { top: '16', right: '0', bottom: '0', left: '0', unit: 'px' } } },
              style: {},
              children: [
                avatarComponent,
                {
                  id: `${id}-author-info`,
                  type: 'div',
                  props: { display: 'flex', flexDirection: 'column', gap: '4px' },
                  style: {},
                  children: [
                    { id: `${id}-name`, type: 'text', props: { content: profile.name, typography: { fontSize: '15', fontWeight: '600', color: 'hsl(var(--foreground))' } }, style: {}, children: [] },
                    { id: `${id}-role`, type: 'text', props: { content: profile.role, typography: { fontSize: '13', color: 'hsl(var(--muted-foreground))' } }, style: {}, children: [] }
                  ]
                }
              ]
            };
            component.children = component.children || [];
            component.children.push(newAuthorSection);
            console.log(`[Enrichment] Created author section with avatar: ${profile.name}`);
          }
        }
        
        // Fix weak shadow opacity
        if (component.props.boxShadows?.length > 0) {
          for (const shadow of component.props.boxShadows) {
            if (shadow.color && (shadow.color.includes('0.06') || shadow.color.includes('0.08'))) {
              shadow.color = 'rgba(0,0,0,0.12)';
            }
          }
        } else {
          component.props.boxShadows = [{ enabled: true, type: 'outer', x: 0, y: 10, blur: 28, spread: -4, color: 'rgba(0,0,0,0.12)' }];
        }
        
        // Ensure proper styling
        component.props.width = '100%';
        component.props.minWidth = '280px';
        if (!component.props.backgroundColor) {
          component.props.backgroundColor = { type: 'solid', value: 'hsl(var(--card))' };
        }
        if (!component.props.border?.width) {
          component.props.border = { width: '1', style: 'solid', color: 'hsl(var(--border))', unit: 'px', sides: { top: true, right: true, bottom: true, left: true } };
        }
        if (!component.props.borderRadius) {
          component.props.borderRadius = { topLeft: '16', topRight: '16', bottomRight: '16', bottomLeft: '16', unit: 'px' };
        }
        if (!component.props.spacingControl?.padding?.top || parseInt(String(component.props.spacingControl.padding.top)) < 24) {
          component.props.spacingControl = component.props.spacingControl || {};
          component.props.spacingControl.padding = { top: '28', right: '28', bottom: '28', left: '28', unit: 'px' };
        }
        component.props._aiGenerated = true;
        
        console.log(`[Enrichment] Enhanced testimonial card: ${id}`);
      }
      
      // ═══════════════════════════════════════════════════
      // FORM ROW / SIGNUP WRAPPER LAYOUT ENFORCEMENT (WRITES TO PROPS)
      // ═══════════════════════════════════════════════════
      const isFormRowById = id.includes('form-row') || 
                        id.includes('signup-row') || 
                        id.includes('newsletter-row') ||
                        id.includes('email-row') ||
                        id.includes('input-row') ||
                        id.includes('subscribe-row') ||
                        id.includes('cta-row') ||
                        id.includes('cta-form') ||
                        id.includes('email-form') ||
                        id.includes('signup-form') ||
                        id.includes('newsletter-form') ||
                        id.includes('input-group') ||
                        id.includes('form-group') ||
                        id.includes('action-row');

      const isSignupWrapper = id.includes('signup-wrapper') ||
                              id.includes('newsletter-wrapper') ||
                              id.includes('email-wrapper') ||
                              id.includes('subscribe-wrapper') ||
                              id.includes('form-wrapper') ||
                              id.includes('input-wrapper') ||
                              id.includes('cta-inputs');

      // SMART DETECTION: Any div containing BOTH input AND button as children
      const hasInputChild = component.children?.some(
        (c: any) => c.type === 'input' || c.type === 'textarea'
      );
      const hasButtonChild = component.children?.some(
        (c: any) => c.type === 'button'
      );
      const isSmartFormRow = component.type === 'div' && hasInputChild && hasButtonChild;
      
      const isFormRow = isFormRowById || isSignupWrapper || isSmartFormRow;

      if (isFormRow && component.type === 'div') {
        component.props = component.props || {};
        component.props.display = 'flex';
        component.props.flexDirection = 'row'; // FORCE horizontal
        component.props.alignItems = 'center';
        component.props.justifyContent = 'center';
        component.props.gap = component.props.gap || '12';
        component.props.flexWrap = 'wrap'; // Wrap on mobile
        console.log(`[Enrichment] Forced form row layout: ${id} (smart=${isSmartFormRow})`);
      }
      
      // ═══════════════════════════════════════════════════
      // HERO CONTENT CONTAINER CENTERING (WRITES TO PROPS)
      // ═══════════════════════════════════════════════════
      const isHeroContentContainer = id.includes('hero-content') || 
                                      id.includes('hero-text') ||
                                      id.includes('hero-left') ||
                                      id.includes('hero-info') ||
                                      id.includes('hero-main');

      // Check if parent appears to be split-screen (has width < 100%)
      const hasPartialWidth = component.props?.width && 
                              component.props.width !== '100%' &&
                              !String(component.props.width).includes('100');

      if (isHeroContentContainer && component.type === 'div') {
        component.props = component.props || {};
        
        // CONDITIONAL centering - only if AI didn't specify layout AND no partial width
        if (!hasPartialWidth) {
          if (!component.props.alignItems) {
            component.props.alignItems = 'center';
          }
          if (!component.props.justifyContent) {
            component.props.justifyContent = 'center';
          }
          if (!component.props.typography?.textAlign) {
            component.props.typography = component.props.typography || {};
            component.props.typography.textAlign = 'center';
          }
          console.log(`[Enrichment] Hero content layout (conditional fallback): ${id}`);
        }
      }
      
      // ═══════════════════════════════════════════════════
      // CTA CONTENT CONTAINER CENTERING (WRITES TO PROPS)
      // ═══════════════════════════════════════════════════
      const isCtaContent = id.includes('cta-content') || 
                           id.includes('cta-wrapper') ||
                           id.includes('cta-inner') ||
                           id.includes('newsletter-content') ||
                           id.includes('subscribe-content');
      
      if (isCtaContent && component.type === 'div') {
        component.props = component.props || {};
        if (!component.props.display) {
          component.props.display = 'flex';
          component.props.flexDirection = 'column';
        }
        if (!component.props.alignItems) {
          component.props.alignItems = 'center';
        }
        if (!component.props.justifyContent) {
          component.props.justifyContent = 'center';
        }
        component.props.gap = component.props.gap || '24';
        if (!component.props.typography?.textAlign) {
          component.props.typography = component.props.typography || {};
          component.props.typography.textAlign = 'center';
        }
        console.log(`[Enrichment] CTA content layout (conditional fallback): ${id}`);
      }
      
      // ═══════════════════════════════════════════════════
      // HEADING ENRICHMENT - Ensure proper typography (WRITES TO PROPS)
      // ═══════════════════════════════════════════════════
      if (component.type === 'heading') {
        component.props = component.props || {};
        component.props.typography = component.props.typography || {};
        
        // Ensure headings have proper weight
        if (!component.props.typography.fontWeight) {
          const tag = component.props?.tag || 'h2';
          component.props.typography.fontWeight = tag === 'h1' ? '800' : tag === 'h2' ? '700' : '600';
        }
      }
      
      // Recursively process children - with sanitization
      if (Array.isArray(component.children)) {
        component.children = component.children
          .map((child: any) => {
            // Sanitize primitive children before recursion
            if (typeof child === 'string' || typeof child === 'number' || typeof child === 'boolean') {
              const textValue = String(child).trim();
              if (!textValue) return null;
              return {
                id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                type: 'text',
                props: { content: textValue },
                style: {},
                children: []
              };
            }
            return enrichComponent(child, component.id);
          })
          .filter((child: any) => child !== null);
      }
      
      return component;
    };
    
    // Apply enrichment to all component steps
    result.steps = result.steps.map((step: any) => {
      if (step.type === 'component' && step.data) {
        step.data = enrichComponent(step.data);
      }
      return step;
    });
    
    // ═══════════════════════════════════════════════════
    // SPARSE SECTION ENRICHMENT - Fix empty/sparse sections
    // ═══════════════════════════════════════════════════
    result.steps = result.steps.map((step: any) => {
      if (step.type === 'component' && step.data) {
        step.data = enrichSparseSection(step.data);
      }
      return step;
    });
    console.log(`[Enrichment] Applied sparse section enrichment pass`);
    
    // ═══════════════════════════════════════════════════
    // DESIGN QUALITY VALIDATION - Score and log quality
    // ═══════════════════════════════════════════════════
    const componentStepsForQuality = result.steps.filter((s: any) => s.type === 'component' && s.data);
    
    const findAllByType = (steps: any[], type: string): any[] => {
      const results: any[] = [];
      const searchComponent = (comp: any) => {
        if (!comp) return;
        if (comp.type === type) results.push(comp);
        if (Array.isArray(comp.children)) comp.children.forEach(searchComponent);
      };
      steps.forEach(s => searchComponent(s.data));
      return results;
    };
    
    const sections = findAllByType(componentStepsForQuality, 'section');
    const buttons = findAllByType(componentStepsForQuality, 'button');
    
    const heroSection = sections.find((s: any) => s.id?.toLowerCase().includes('hero'));
    const heroHasBackground = heroSection && !isBasicBackground(heroSection.style);
    
    const sectionsWithBg = sections.filter((s: any) => !isBasicBackground(s.style));
    const styledButtons = buttons.filter((b: any) => 
      b.style?.background?.color || b.style?.border?.width
    );
    
    console.log(`[Design Quality] Hero has background: ${heroHasBackground}`);
    console.log(`[Design Quality] Sections with backgrounds: ${sectionsWithBg.length}/${sections.length}`);
    console.log(`[Design Quality] Styled buttons: ${styledButtons.length}/${buttons.length}`);
    console.log(`[Enrichment Complete] Applied ${selectedRecipe.id} design recipe (seed: ${randomSeed})`);

    // ═══════════════════════════════════════════════════
    // VARIETY-AWARE ITEM VALIDATION (Log but DON'T force duplicates)
    // AI should generate varied counts - only warn if extremely sparse
    // ═══════════════════════════════════════════════════
    const validateItemCounts = (steps: any[]): any[] => {
      // Minimum thresholds for warning only (NOT enforcement)
      const warningThresholds: Record<string, number> = {
        'testimonial': 2,
        'skill': 3,
        'project': 2,
        'feature': 2,
        'pricing': 2,
        'stat': 2,
        'team': 2,
        'product': 3
      };
      
      const findGridContainers = (comp: any, results: any[] = []): any[] => {
        if (!comp) return results;
        const id = (comp.id || '').toLowerCase();
        
        for (const type of Object.keys(warningThresholds)) {
          if ((id.includes(type) && (id.includes('grid') || id.includes('cards') || id.includes('row') || id.includes('container'))) ||
              id === `${type}s-grid` || id === `${type}-cards`) {
            if (Array.isArray(comp.children) && comp.children.length > 0) {
              results.push({ container: comp, type });
            }
          }
        }
        
        if (Array.isArray(comp.children)) {
          comp.children.forEach((child: any) => findGridContainers(child, results));
        }
        return results;
      };
      
      steps.forEach(step => {
        if (step.type !== 'component' || !step.data) return;
        
        const grids = findGridContainers(step.data);
        
        grids.forEach(({ container, type }) => {
          const threshold = warningThresholds[type];
          const actualCount = container.children.length;
          
          // Log for monitoring - DON'T duplicate, trust AI variety selection
          if (actualCount < threshold) {
            console.log(`[Item Count Warning] ${type} has ${actualCount} items (min threshold: ${threshold})`);
          } else {
            console.log(`[Item Count OK] ${type}: ${actualCount} items`);
          }
        });
      });
      
      return steps;
    };
    
    // Validate item counts (warning only - no forced duplication)
    result.steps = validateItemCounts(result.steps);
    
    // ═══════════════════════════════════════════════════
    // CARD LIMIT ENFORCEMENT - Max 6 cards per grid section
    // ═══════════════════════════════════════════════════
    const enforceCardLimits = (steps: any[]): any[] => {
      const MAX_CARDS = 6; // Raised from 3 — the prompt asks for 4-8 items, 3 made sections sparse
      
      const processComponent = (comp: any): any => {
        if (!comp || typeof comp !== 'object') return comp;
        
        const id = (comp.id || '').toLowerCase();
        const isCardContainer = 
          (id.includes('grid') || id.includes('cards') || id.includes('row') || id.includes('container')) &&
          (id.includes('feature') || id.includes('product') || id.includes('testimonial') || 
           id.includes('team') || id.includes('pricing') || id.includes('project'));
        
        // Limit children to MAX_CARDS for card containers
        if (isCardContainer && Array.isArray(comp.children) && comp.children.length > MAX_CARDS) {
          const originalCount = comp.children.length;
          comp.children = comp.children.slice(0, MAX_CARDS);
          console.log(`[Card Limit] Truncated ${id} from ${originalCount} to ${MAX_CARDS} cards`);
        }
        
        // Recurse into children
        if (Array.isArray(comp.children)) {
          comp.children = comp.children.map(processComponent);
        }
        
        return comp;
      };
      
      return steps.map((step: any) => {
        if (step.type === 'component' && step.data) {
          step.data = processComponent(step.data);
        }
        return step;
      });
    };
    
    result.steps = enforceCardLimits(result.steps);
    
    // ═══════════════════════════════════════════════════
    // CTA BUTTON CONTAINER CENTERING FIX (WRITES TO PROPS)
    // ═══════════════════════════════════════════════════
    const centerCtaButtonContainers = (steps: any[]): any[] => {
      const processCTA = (comp: any) => {
        if (!comp) return;
        const id = (comp.id || '').toLowerCase();
        
        // Find button containers within CTA sections
        if (comp.type === 'div' && comp.children?.some((c: any) => c.type === 'button')) {
          comp.props = comp.props || {};
          comp.props.display = 'flex';
          comp.props.justifyContent = 'center';
          comp.props.alignItems = 'center';
          comp.props.gap = comp.props.gap || '16';
          console.log(`[CTA Fix] Centered button container: ${comp.id}`);
        }
        
        if (Array.isArray(comp.children)) {
          comp.children.forEach(processCTA);
        }
      };
      
      steps.forEach(step => {
        if (step.type === 'component' && step.data) {
          const id = (step.data.id || '').toLowerCase();
          if (id.includes('cta') || id.includes('contact')) {
            processCTA(step.data);
          }
        }
      });
      
      return steps;
    };
    
    result.steps = centerCtaButtonContainers(result.steps);
    
    // ═══════════════════════════════════════════════════
    // FLEXBOX LAYOUT ENFORCEMENT - Auto-fix card containers (NOT grid!)
    // ═══════════════════════════════════════════════════
    const enforceFlexboxLayouts = (steps: any[]): any[] => {
      const processComponent = (comp: any): any => {
        if (!comp || typeof comp !== 'object') return comp;
        
        const id = (comp.id || '').toLowerCase();
        const isCardContainer = Array.isArray(comp.children) && 
          comp.children.length >= 2 &&
          comp.children.filter((c: any) => {
            const childId = (c.id || '').toLowerCase();
            return childId.includes('card') || childId.includes('item') || 
                   childId.includes('feature') || childId.includes('product') ||
                   childId.includes('testimonial') || childId.includes('pricing');
          }).length >= 2;
        
        // Force FLEXBOX layout for card containers — but PRESERVE intentional grid/bento layouts
        const hasIntentionalGrid = comp.props?.display === 'grid' && comp.props?.gridTemplateColumns;
        if (isCardContainer && comp.type === 'div' && !hasIntentionalGrid) {
          comp.props = comp.props || {};
          
          // Only remove grid properties if we're enforcing flex (AI didn't set grid)
          // Do NOT delete gridTemplateColumns if AI intentionally set display:grid
          
          // Apply flexbox layout
          comp.props.display = 'flex';
          comp.props.flexDirection = 'row';
          comp.props.flexWrap = 'wrap';
          comp.props.justifyContent = 'center';
          comp.props.alignItems = 'stretch';
          comp.props.gap = '32px';  // WITH UNITS!
          comp.props.width = '100%';
          comp.props.maxWidth = '1400px';
          
          // Responsive styles
          comp.props.tabletStyles = { flexWrap: 'wrap', justifyContent: 'center' };
          comp.props.mobileStyles = { flexDirection: 'column', alignItems: 'stretch' };
          
          console.log(`[Flexbox Enforcement] Applied flex layout to: ${id}`);
        }
        
        // Ensure all card children have proper flex properties
        if (Array.isArray(comp.children)) {
          comp.children = comp.children.map((child: any) => {
            if (child && typeof child === 'object') {
              const childId = (child.id || '').toLowerCase();
              if (childId.includes('card') || childId.includes('product-') || 
                  childId.includes('feature-') || childId.includes('testimonial-') ||
                  childId.includes('pricing-')) {
                child.props = child.props || {};
                
                // Flex card sizing
                child.props.flexBasis = 'calc(33.333% - 22px)';
                child.props.minWidth = '280px';
                child.props.maxWidth = '400px';
                child.props.flexGrow = '1';
                child.props.flexShrink = '0';
                child.props.alignSelf = 'stretch';
                child.props.height = '100%';
                
                // Remove conflicting width
                if (child.props.width === '100%') {
                  delete child.props.width;
                }
              }
            }
            return processComponent(child);
          });
        }
        
        return comp;
      };
      
      return steps.map((step: any) => {
        if (step.type === 'component' && step.data) {
          step.data = processComponent(step.data);
        }
        return step;
      });
    };
    
    result.steps = enforceFlexboxLayouts(result.steps);
    
    // ═══════════════════════════════════════════════════
    // SECTION DIVIDER INJECTION (WRITES TO PROPS)
    // ═══════════════════════════════════════════════════
    const injectSectionDividers = (steps: any[]): any[] => {
      const contentSections = steps.filter((s: any) => {
        if (s.type !== 'component' || !s.data) return false;
        const id = (s.data.id || '').toLowerCase();
        return (s.data.type === 'section' || id.includes('-section')) && 
               !id.includes('nav') && !id.includes('footer') && !id.includes('hero');
      });
      
      contentSections.forEach((step: any, i: number) => {
        if (i > 0 && step.data?.children && Array.isArray(step.data.children)) {
          const hasDivider = step.data.children.some((c: any) => c.id?.includes('section-divider'));
          if (!hasDivider) {
            step.data.children.unshift({
              id: `section-divider-${i}`,
              type: 'div',
              props: {
                width: '100px',
                height: '4px',
                maxWidth: '100%',
                backgroundGradient: `linear-gradient(90deg, transparent 0%, ${selectedRecipe.buttons.primary}40 50%, transparent 100%)`,
                borderRadius: { topLeft: '9999', topRight: '9999', bottomRight: '9999', bottomLeft: '9999', unit: 'px' },
                spacingControl: { margin: { top: '0', right: '0', bottom: '40', left: '0', unit: 'px' } }
              },
              children: []
            });
            console.log(`[Enrichment] Injected section divider into: ${step.data.id}`);
          }
        }
      });
      
      return steps;
    };
    
    result.steps = injectSectionDividers(result.steps);
    
    // ═══════════════════════════════════════════════════
    // GAP UNIT NORMALIZATION - Ensure all gaps have 'px' unit
    // ═══════════════════════════════════════════════════
    const normalizeGapUnits = (steps: any[]): any[] => {
      const normalizeGap = (gap: any): string | undefined => {
        if (!gap) return undefined;
        if (typeof gap === 'number') return `${gap}px`;
        if (typeof gap === 'string') {
          // Already has unit
          if (/[a-z%]/i.test(gap)) return gap;
          // Pure number string - append px
          if (/^\d+(\.\d+)?$/.test(gap.trim())) {
            return `${gap.trim()}px`;
          }
          return gap;
        }
        return undefined;
      };
      
      const processComponent = (comp: any): any => {
        if (!comp || typeof comp !== 'object') return comp;
        
        if (comp.props?.gap) {
          const original = comp.props.gap;
          comp.props.gap = normalizeGap(comp.props.gap);
          if (original !== comp.props.gap) {
            console.log(`[Gap Normalize] Fixed gap: "${original}" -> "${comp.props.gap}" in ${comp.id}`);
          }
        }
        
        if (Array.isArray(comp.children)) {
          comp.children = comp.children.map(processComponent);
        }
        
        return comp;
      };
      
      return steps.map((step: any) => {
        if (step.type === 'component' && step.data) {
          step.data = processComponent(step.data);
        }
        return step;
      });
    };
    
    result.steps = normalizeGapUnits(result.steps);

    // ═══════════════════════════════════════════════════
    // FINAL STYLE → PROPS CONVERSION (Post-Enrichment Pass)
    // This catches any remaining style:{} objects added during enrichment
    // ═══════════════════════════════════════════════════
    result.steps = await Promise.all(result.steps.map(async (step: any) => {
      if (step.type === 'component' && step.data) {
        step.data = fixComponentGlobal(step.data);
        // Enforce text contrast on dark backgrounds
        step.data = enforceTextContrast(step.data);
        // Enforce pricing card row layout + badge sizing
        step.data = enforcePricingLayout(step.data);
        // Inject responsive defaults (safety net for LLM omissions)
        step.data = injectResponsiveDefaults(step.data);
        // Enforce card layout quality (prevent squeezed card grids)
        step.data = enforceCardLayoutQuality(step.data);
        step.data = sanitizeFeatureCardIcons(step.data);
        // Inject real Unsplash images for all imagePrompt fields
        step.data = await injectUnsplashImages(step.data);
        // Normalize class names to semantic shared names
        step.data = normalizeComponentClassNames(step.data);
      }
      if (step.type === 'class' && step.data) {
        // Normalize class definition names
        step = normalizeClassDefinition(step);
      }
      return step;
    }));
    console.log(`[Post-Enrichment] Applied style → props conversion, gradient stripping, contrast enforcement, and class normalization to ${result.steps.length} steps`);
    
    // ═══════════════════════════════════════════════════
    // CLASS DEDUPLICATION - Merge duplicate class definitions
    // ═══════════════════════════════════════════════════
    const classSteps = result.steps.filter((s: any) => s.type === 'class' && s.data?.name);
    const uniqueClasses = new Map<string, any>();
    
    classSteps.forEach((step: any) => {
      const name = step.data.name;
      if (!uniqueClasses.has(name)) {
        uniqueClasses.set(name, step);
      } else {
        // Merge styles from duplicate into existing (newer styles override)
        const existing = uniqueClasses.get(name);
        existing.data.styles = { ...existing.data.styles, ...step.data.styles };
        console.log(`[ClassDedup] Merged duplicate class: "${name}"`);
      }
    });
    
    // Remove duplicate class steps and keep only unique ones
    const classNames = new Set<string>();
    result.steps = result.steps.filter((step: any) => {
      if (step.type === 'class' && step.data?.name) {
        if (classNames.has(step.data.name)) {
          return false; // Skip duplicate
        }
        classNames.add(step.data.name);
      }
      return true;
    });
    
    console.log(`[ClassDedup] Unique classes after dedup: ${classNames.size}`);

    // ═══════════════════════════════════════════════════
    // MINIMUM SECTION COUNT VALIDATION & AUTO-RETRY
    // ═══════════════════════════════════════════════════
    
    const validationComponentSteps = result.steps.filter((s: any) => s.type === 'component' && s.data);
    const sectionSteps = validationComponentSteps.filter((s: any) => 
      s.data?.type === 'section' || 
      s.data?.id?.includes('-section') ||
      s.data?.id?.includes('nav') ||
      s.data?.id?.includes('hero') ||
      s.data?.id?.includes('footer')
    );
    
    console.log(`[AI Build Validation] Total components: ${validationComponentSteps.length}, Sections: ${sectionSteps.length}, Intent: ${currentPromptAnalysis.intent}`);
    
    // Log generation stats and add warning if incomplete (no auto-retry - client handles this)
    // SKIP validation for focused requests - they should have fewer sections by design
    const isFocusedRequest = currentPromptAnalysis.intent === 'single_section' || currentPromptAnalysis.intent === 'component';
    
    if (!isFocusedRequest && (sectionSteps.length < 4 || validationComponentSteps.length < 6)) {
      console.warn(`[AI Build] Incomplete generation: ${sectionSteps.length} sections, ${validationComponentSteps.length} components. Returning partial result.`);
      result.warning = 'Generation may be incomplete. Consider regenerating with a more specific prompt.';
    } else if (isFocusedRequest) {
      console.log(`[AI Build] Focused request detected - skipping section count validation`);
    }
    
    // Check if we have zero usable content - this is an error state
    if (validationComponentSteps.length === 0) {
      console.error('[AI Build] No components generated - returning error');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'AI failed to generate any components. Please try again with a different prompt or model.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Add design recipe info to response for debugging & tracking
    result.designRecipe = {
      id: selectedRecipe.id,
      seed: randomSeed,
      hero: selectedRecipe.hero,
      palette: selectedRecipe.palette,
      buttonStyle: selectedRecipe.buttons.style,
      buttonRadius: selectedRecipe.buttons.radius,
      cardStyle: selectedRecipe.cards
    };
    
    // Add prompt analysis to response for debugging
    result.promptAnalysis = currentPromptAnalysis;

    // FIX: Prune null/undefined props and empty non-children arrays to reduce response size
    // Prevents "connection closed before message completed" caused by 2-5MB payloads
    // in Deno std@0.168.0 which has an undocumented buffering threshold.
    function pruneNullProps(obj: any): any {
      if (obj === null || obj === undefined) return obj;
      if (Array.isArray(obj)) return obj.map(pruneNullProps);
      if (typeof obj === 'object') {
        const out: any = {};
        for (const [k, v] of Object.entries(obj)) {
          if (v === null || v === undefined) continue;
          // Keep empty children arrays (canvas expects them); prune other empty arrays
          if (Array.isArray(v) && (v as any[]).length === 0 && k !== 'children') continue;
          out[k] = pruneNullProps(v);
        }
        return out;
      }
      return obj;
    }

    if (result.steps) {
      result.steps = result.steps.map(pruneNullProps);
    }

    const responseJson = JSON.stringify(result);
    console.log(`[AI Build] Response size: ${(responseJson.length / 1024).toFixed(1)}KB`);

    return new Response(
      responseJson,
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Content-Length': String(responseJson.length) } }
    );
  } catch (error) {
    console.error('Error in app-builder-ai:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
