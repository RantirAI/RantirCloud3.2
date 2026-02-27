import { corsHeaders } from '../_shared/cors.ts';
import { searchUnsplashImages, clearUnsplashCache } from '../_shared/unsplash.ts';

// ═══════════════════════════════════════════════════════════════
// CURATED IMAGE CATALOG - Working Unsplash CDN URLs (no API key needed)
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
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&h=800&fit=crop',
  ],
  food: [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1493770348161-369560ae357d?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=1200&h=800&fit=crop',
  ],
  abstract: [
    'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&h=800&fit=crop',
  ],
  product: [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&h=800&fit=crop',
  ],
  creative: [
    'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1561998338-13ad7883b20f?w=1200&h=800&fit=crop',
  ],
};

// ═══════════════════════════════════════════════════════════════
// PROCEDURAL DESIGN DIMENSIONS — used as fallback if Phase 2 fails
// ═══════════════════════════════════════════════════════════════

const COLOR_MOODS = [
  { mood: 'midnight', bg: '#0a0a0f', surface: '#161622', text: '#e4e4e7', accent: '#818cf8', muted: '#52525b' },
  { mood: 'arctic', bg: '#f0f9ff', surface: '#ffffff', text: '#0c4a6e', accent: '#0ea5e9', muted: '#94a3b8' },
  { mood: 'ember', bg: '#1c1210', surface: '#2a1f1b', text: '#fef3c7', accent: '#f59e0b', muted: '#78716c' },
  { mood: 'forest', bg: '#0f1a10', surface: '#1a2e1c', text: '#ecfdf5', accent: '#22c55e', muted: '#6b7280' },
  { mood: 'dusk', bg: '#1e1028', surface: '#2d1b3d', text: '#f5f3ff', accent: '#c084fc', muted: '#7c72a0' },
  { mood: 'slate', bg: '#f8fafc', surface: '#ffffff', text: '#1e293b', accent: '#3b82f6', muted: '#94a3b8' },
  { mood: 'blush', bg: '#fdf2f8', surface: '#ffffff', text: '#831843', accent: '#ec4899', muted: '#a78bfa' },
  { mood: 'carbon', bg: '#09090b', surface: '#18181b', text: '#fafafa', accent: '#f43f5e', muted: '#52525b' },
  { mood: 'sand', bg: '#fefbf3', surface: '#ffffff', text: '#44403c', accent: '#d97706', muted: '#a8a29e' },
  { mood: 'ocean', bg: '#0c1222', surface: '#132035', text: '#e0f2fe', accent: '#06b6d4', muted: '#64748b' },
  { mood: 'ivory', bg: '#fffbeb', surface: '#ffffff', text: '#292524', accent: '#a16207', muted: '#78716c' },
  { mood: 'neon', bg: '#020617', surface: '#0f172a', text: '#e2e8f0', accent: '#4ade80', muted: '#475569' },
  { mood: 'wine', bg: '#1a0a10', surface: '#2d1420', text: '#fce7f3', accent: '#be185d', muted: '#6b7280' },
  { mood: 'cloud', bg: '#ffffff', surface: '#f9fafb', text: '#111827', accent: '#6366f1', muted: '#9ca3af' },
  { mood: 'copper', bg: '#1c1412', surface: '#2c211c', text: '#fed7aa', accent: '#ea580c', muted: '#a8a29e' },
  { mood: 'mint', bg: '#f0fdfa', surface: '#ffffff', text: '#134e4a', accent: '#14b8a6', muted: '#94a3b8' },
];

const LAYOUT_STRATEGIES = [
  'two-column-split: Left 55% text, right 45% image. Use flexDirection:"row" with gap.',
  'centered-stack: Everything centered vertically. Badge → heading → text → buttons → optional image below.',
  'alternating-rows: Row 1 image-left text-right, row 2 reversed. Creates Z-scanning pattern.',
  'hero-overlay: Full-width background image with dark overlay. Content centered on top with position relative.',
  'card-collection: Centered title + description above 3-4 cards in flex-wrap row layout.',
  'asymmetric-grid: Use gridTemplateColumns with unequal fractions. Mix content blocks and images.',
  'stacked-bands: Full-width horizontal bands with alternating backgrounds. First band hero-sized.',
  'offset-composition: Large heading offset left, image floating right. Tension through asymmetry.',
  'minimal-focus: Maximum whitespace. Only heading + one line + one button. Restraint is the design.',
  'three-column: Three equal columns side by side, each with icon/image + heading + text.',
  'sidebar-content: Narrow left column (30%) with nav/list, wide right (70%) with main content.',
  'masonry-feel: Items of varying heights in a multi-column layout using grid with auto-rows.',
  'diagonal-flow: Content arranged in a descending diagonal with staggered positioning.',
  'feature-spotlight: One large featured item (60% width) beside 2 stacked smaller items (40%).',
];

const TYPOGRAPHY_STYLES = [
  { label: 'bold-impact', headingWeight: '800', headingSize: '56px', bodySize: '18px', letterSpacing: '-0.02em' },
  { label: 'light-elegant', headingWeight: '300', headingSize: '60px', bodySize: '17px', letterSpacing: '0.04em' },
  { label: 'compact-sharp', headingWeight: '700', headingSize: '40px', bodySize: '15px', letterSpacing: '0' },
  { label: 'editorial-massive', headingWeight: '900', headingSize: '72px', bodySize: '16px', letterSpacing: '-0.04em' },
  { label: 'balanced-medium', headingWeight: '600', headingSize: '48px', bodySize: '16px', letterSpacing: '-0.01em' },
  { label: 'wide-spaced', headingWeight: '500', headingSize: '44px', bodySize: '18px', letterSpacing: '0.08em' },
  { label: 'condensed-bold', headingWeight: '800', headingSize: '52px', bodySize: '14px', letterSpacing: '-0.03em' },
  { label: 'tall-airy', headingWeight: '400', headingSize: '64px', bodySize: '20px', letterSpacing: '0.02em' },
];

const SPACING_DENSITIES = [
  { label: 'spacious', sectionPad: '100px 60px', gap: '40px', cardPad: '36px' },
  { label: 'balanced', sectionPad: '80px 48px', gap: '32px', cardPad: '28px' },
  { label: 'compact', sectionPad: '56px 32px', gap: '20px', cardPad: '20px' },
  { label: 'generous', sectionPad: '120px 64px', gap: '48px', cardPad: '40px' },
  { label: 'tight', sectionPad: '40px 24px', gap: '16px', cardPad: '16px' },
];

const BORDER_RADIUS_STYLES = [
  { label: 'sharp', value: '0px' },
  { label: 'subtle', value: '6px' },
  { label: 'rounded', value: '12px' },
  { label: 'soft', value: '20px' },
  { label: 'pill', value: '999px' },
];

const VISUAL_EFFECTS = [
  'none — clean flat design, rely on spacing and typography',
  'subtle-shadow — light box-shadows on cards (0 4px 20px rgba(0,0,0,0.08))',
  'glassmorphism — semi-transparent surfaces with backdropFilter:"blur(16px)" and subtle borders',
  'gradient-accents — use linear gradients on buttons and accent elements',
  'outlined — no fill backgrounds, use borders to define card boundaries',
  'elevated — strong drop-shadows creating depth layers (0 20px 60px rgba(0,0,0,0.15))',
  'duotone — limit to two colors plus white/black. High contrast.',
  'texture-overlay — add subtle opacity patterns via background overlays',
];

// ═══════════════════════════════════════════════════════════════
// DESIGN STYLES — 15 curated aesthetic directions for variety
// ═══════════════════════════════════════════════════════════════
const DESIGN_STYLES = [
  { id: 'minimalism', name: 'Minimalism', directive: 'Ultra-clean, maximum whitespace. Remove all unnecessary elements. Focus on typography and spacing. No gradients, no shadows, no decorative elements. Let content breathe.' },
  { id: 'neumorphism', name: 'Neumorphism (Soft UI)', directive: 'Soft, extruded UI elements that appear to push out from the background. Use matching background color on elements with dual box-shadows: one light (top-left, white/light offset) and one dark (bottom-right, darker shade). Subtle, tactile feel. Background and elements share similar hue.' },
  { id: 'glassmorphism', name: 'Glassmorphism', directive: 'Frosted glass effect on cards/containers. Use backdropFilter:"blur(16px)", semi-transparent backgrounds (rgba with 0.1-0.3 alpha), subtle 1px borders with rgba white. Layer elements over colorful or gradient backgrounds for the glass effect to shine.' },
  { id: 'skeuomorphism', name: 'Skeuomorphism', directive: 'Realistic, textured design that mimics physical materials. Use gradients to simulate depth, inner shadows for inset effects, realistic button styling with pressed states. Rich shadows and highlights to create 3D depth.' },
  { id: 'flat-design', name: 'Flat Design', directive: 'Bold solid colors, zero shadows, zero gradients, zero textures. Sharp edges (0px border-radius). Strong color blocks. Simple geometric shapes. Typography-driven hierarchy.' },
  { id: 'material-design', name: 'Material Design', directive: 'Layered surfaces with systematic elevation shadows. Use 8px grid system. Floating action buttons. Card-based layout with consistent 4dp/8dp/16dp elevation. Bold primary color with lighter/darker variants. Ripple-ready interactive elements.' },
  { id: 'dark-mode', name: 'Dark Mode / Dark UI', directive: 'Rich dark backgrounds (#0a0a0f to #1a1a2e). Subtle surface elevation through lighter dark shades. Vibrant accent colors that pop against dark. Careful contrast ratios. Subtle borders (rgba white 0.1) to define surfaces.' },
  { id: 'cyberpunk', name: 'Cyberpunk / Futuristic', directive: 'Neon accents (cyan #00fff5, magenta #ff00ff, electric green #39ff14) on deep dark backgrounds. Glitch-inspired elements. Sharp angular shapes. Glowing borders and text shadows with neon colors. Tech-grid patterns. Monospace fonts for data.' },
  { id: 'retro-vintage', name: 'Retro / Vintage', directive: 'Warm muted color palette (burnt orange, olive, cream, mustard, brown). Serif or slab-serif typography. Textured/aged feel. Rounded corners. Nostalgic 60s-80s aesthetic. Decorative borders and ornamental details.' },
  { id: 'bauhaus-swiss', name: 'Bauhaus / Swiss (International Typographic)', directive: 'Strict grid system. Bold geometric shapes (circles, squares, triangles). Primary colors (red, blue, yellow) with black/white. Sans-serif typography with extreme weight contrast. Asymmetric but balanced layouts.' },
  { id: 'editorial', name: 'Editorial / Magazine Style', directive: 'Large editorial typography with dramatic size contrasts. Multi-column layouts. Pull quotes. Generous line-heights. Serif headings with sans-serif body. Black and white with one accent color. Photo-driven storytelling.' },
  { id: 'maximalism', name: 'Maximalism', directive: 'Bold, busy, layered design. Mix multiple colors, patterns, and textures. Large dramatic typography. Overlapping elements. Gradient backgrounds. Rich decorative details. More is more — fill the space with visual interest.' },
  { id: 'claymorphism', name: 'Claymorphism', directive: 'Soft, clay-like 3D elements. Pastel backgrounds. Elements with inner shadows and outer shadows creating a puffy/inflated look. Rounded corners (20px+). Soft color palette. Playful, toy-like aesthetic.' },
  { id: 'monochrome', name: 'Monochrome Design', directive: 'Single color family with varying shades/tints. Rely on contrast within one hue for hierarchy. Can be any color — not just grey. Use saturation and lightness variations. Clean and cohesive.' },
  { id: 'immersive-3d', name: 'Immersive / 3D Interactive', directive: 'Deep perspective and depth effects. Large hero imagery. Parallax-ready spacing. Dramatic shadows creating depth layers. Dark backgrounds with bright focal elements. Cinematic feel with wide aspect ratios on images.' },
];

// (Design persona engine removed — using procedural dimensions only)

// ═══════════════════════════════════════════════════════════════
// RESPONSIVE INJECTION — Post-process component trees for mobile/tablet
// ═══════════════════════════════════════════════════════════════

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
    // Ensure flex-wrap on mobile for any remaining row containers
    if (!mobile.flexWrap) mobile.flexWrap = 'wrap';
  }

  // ── Any flex container with nowrap and 2+ children → wrap on mobile ──
  if (isFlexContainer && childCount >= 2) {
    const fw = styles.flexWrap || props.flexWrap;
    if (!fw || fw === 'nowrap') {
      if (!mobile.flexWrap) mobile.flexWrap = 'wrap';
    }
  }

  // ── Grid layouts → single column on mobile ──
  const gtc = styles.gridTemplateColumns || props.gridTemplateColumns;
  if (gtc && typeof gtc === 'string' && (gtc.includes('fr') || gtc.includes('repeat'))) {
    if (!mobile.gridTemplateColumns) mobile.gridTemplateColumns = '1fr';
    if (!tablet.gridTemplateColumns) {
      // On tablet, allow max 2 columns
      tablet.gridTemplateColumns = 'repeat(2, 1fr)';
    }
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

  // ── Badge sanitization — strip oversized styling ──
  if (type === 'badge') {
    // Badges should be small pills — remove any oversized styling
    const badProps = ['width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'display', 'flexDirection', 'alignItems', 'justifyContent', 'gap', 'padding', 'backgroundColor', 'color', 'borderRadius', 'boxShadow', 'border'];
    for (const bp of badProps) {
      if (props[bp]) delete props[bp];
      if (styles[bp]) delete styles[bp];
    }
    const badgeFs = parseFloat(styles.fontSize || props.fontSize);
    if (badgeFs && badgeFs > 14) {
      props.fontSize = '13px';
      if (styles.fontSize) styles.fontSize = '13px';
    }
  }

  // ── Text / labels / badges / spans with large font → scale ──
  if (type === 'text' || type === 'p' || type === 'span' || type === 'label') {
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

  // ── Cards / containers with fixed width or flex-basis ──
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
      // Make each button child full width on mobile
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

// ═══════════════════════════════════════════════════════════════
// ACCESSIBILITY CONTRAST POST-PROCESSOR
// ═══════════════════════════════════════════════════════════════

function hexToLuminance(hex: string): number {
  if (!hex || typeof hex !== 'string') return 0.5;
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length !== 6) return 0.5;
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function isLightColor(color: string): boolean {
  if (!color) return true;
  const lower = color.toLowerCase().trim();
  if (lower === 'white' || lower === '#fff' || lower === '#ffffff' || lower === 'transparent') return true;
  if (lower === 'black' || lower === '#000' || lower === '#000000') return false;
  if (lower.startsWith('rgb')) {
    const nums = lower.match(/\\d+/g)?.map(Number) || [];
    if (nums.length >= 3) {
      const lum = (0.299 * nums[0] + 0.587 * nums[1] + 0.114 * nums[2]) / 255;
      return lum > 0.5;
    }
  }
  return hexToLuminance(color) > 0.45;
}

function enforceTextContrast(component: any, parentBg?: string): any {
  if (!component || typeof component !== 'object') return component;
  
  const props = component.props || {};
  const type = component.type;
  const currentBg = props.backgroundColor || parentBg;
  
  const isTextElement = ['heading', 'text', 'link', 'blockquote'].includes(type);
  const isButton = type === 'button';
  const isNavLink = type === 'link' && props._navRole === 'link';
  
  if ((isTextElement || isNavLink) && currentBg && props.color) {
    const bgLight = isLightColor(currentBg);
    const textLight = isLightColor(props.color);
    if (bgLight && textLight) {
      component.props = { ...props, color: '#111827' };
    } else if (!bgLight && !textLight) {
      component.props = { ...props, color: '#ffffff' };
    }
  }
  
  if (isTextElement && currentBg && !props.color) {
    const bgLight = isLightColor(currentBg);
    component.props = { ...props, color: bgLight ? '#111827' : '#ffffff' };
  }
  
  if (isButton && props.backgroundColor && props.color) {
    const btnBgLight = isLightColor(props.backgroundColor);
    const btnTextLight = isLightColor(props.color);
    if (btnBgLight && btnTextLight) {
      component.props = { ...props, color: '#111827' };
    } else if (!btnBgLight && !btnTextLight) {
      component.props = { ...props, color: '#ffffff' };
    }
  }
  
  if (Array.isArray(component.children)) {
    component.children = component.children.map((child: any) => 
      enforceTextContrast(child, currentBg)
    );
  }
  
  return component;
}

// ═══════════════════════════════════════════════════════════════
// CARD LAYOUT QUALITY POST-PROCESSOR
// ═══════════════════════════════════════════════════════════════

function enforceCardLayoutQuality(component: any): any {
  if (!component || typeof component !== 'object') return component;

  const props = component.props || {};
  const children = Array.isArray(component.children) ? component.children : [];

  // ── Detect flex-row containers with multiple card-like children ──
  const isFlexContainer = props.display === 'flex' || props.style?.display === 'flex';
  const fd = props.flexDirection || props.style?.flexDirection;
  const isFlexRow = isFlexContainer && (fd === 'row' || !fd); // default flex direction is row

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

      // Enforce minWidth
      const currentMin = parseInt(cp.minWidth || '0', 10);
      if (!cp.minWidth || currentMin < 200) {
        cp.minWidth = '280px';
      }

      // Enforce flex sizing
      if (!cp.flex) {
        cp.flex = `1 1 ${flexBasis}`;
      }

      // Ensure overflow is visible
      cp.overflow = 'visible';

      // Ensure minimum padding
      const hasPadding = cp.padding || cp.paddingTop || cp.paddingLeft || cp.paddingRight || cp.paddingBottom;
      if (!hasPadding) {
        cp.padding = '24px';
      }
    }
  }

  // ── Detect grid containers with narrow columns ──
  const gtc = props.gridTemplateColumns || props.style?.gridTemplateColumns || '';
  if (typeof gtc === 'string' && gtc.includes('1fr')) {
    const frCount = (gtc.match(/1fr/g) || []).length;
    if (frCount >= 3) {
      // Ensure grid children have minWidth
      for (const child of children) {
        if (child && typeof child === 'object') {
          if (!child.props) child.props = {};
          if (!child.props.minWidth) child.props.minWidth = '250px';
        }
      }
    }
  }

  // ── Enforce pricing section layout ──
  const sectionId = (props.id || props.name || props.sectionId || component.id || '').toLowerCase();
  if (sectionId.includes('pricing') || sectionId.includes('price') || sectionId.includes('plan')) {
    // Find card container within pricing section and enforce row layout
    for (const child of children) {
      if (child && typeof child === 'object') {
        const childProps = child.props || {};
        const childIsFlexContainer = childProps.display === 'flex' || childProps.style?.display === 'flex';
        const childChildren = Array.isArray(child.children) ? child.children : [];
        const childCards = childChildren.filter((c: any) => c && typeof c === 'object' && cardTypes.includes(c.type));
        if (childIsFlexContainer && childCards.length >= 2) {
          childProps.flexDirection = 'row';
          childProps.flexWrap = 'wrap';
          childProps.justifyContent = 'center';
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

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

interface ProceduralSeed {
  id: string;
  colorMood: typeof COLOR_MOODS[number];
  layout: string;
  typography: typeof TYPOGRAPHY_STYLES[number];
  spacing: typeof SPACING_DENSITIES[number];
  radius: typeof BORDER_RADIUS_STYLES[number];
  effect: string;
  designStyle: typeof DESIGN_STYLES[number];
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateProceduralSeeds(count: number): ProceduralSeed[] {
  const colors = shuffleArray(COLOR_MOODS);
  const layouts = shuffleArray(LAYOUT_STRATEGIES);
  const typographies = shuffleArray(TYPOGRAPHY_STYLES);
  const spacings = shuffleArray(SPACING_DENSITIES);
  const radii = shuffleArray(BORDER_RADIUS_STYLES);
  const effects = shuffleArray(VISUAL_EFFECTS);
  const styles = shuffleArray(DESIGN_STYLES);

  const seeds: ProceduralSeed[] = [];
  for (let i = 0; i < count; i++) {
    seeds.push({
      id: String(i + 1),
      colorMood: colors[i % colors.length],
      layout: layouts[i % layouts.length],
      typography: typographies[i % typographies.length],
      spacing: spacings[i % spacings.length],
      radius: radii[i % radii.length],
      effect: effects[i % effects.length],
      designStyle: styles[i % styles.length],
    });
  }
  return seeds;
}

function generateEntropy(): string {
  return Math.random().toString(36).substring(2, 10);
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT TYPE DETECTION — fallback regex when Phase 1 fails
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// PHASE 1: INTENT EXTRACTION — Product Strategy Layer
// ═══════════════════════════════════════════════════════════════

interface ExtractedIntent {
  industry: string;
  brandMood: string;
  componentTypes: string[];
  keywords: string[];
  imageCategories: string[];
}

const INTENT_EXTRACTION_PROMPT = `You are a product strategist. Extract structured intent from the user's design prompt.

Return a JSON object with these fields:
- industry: string (e.g. "FinTech", "HealthTech", "SaaS", "E-commerce", "AI/ML", "Education", "NGO", "Creative Agency", "Real Estate")
- brandMood: string (e.g. "Futuristic", "Minimal", "Corporate", "Playful", "Luxurious", "Brutalist", "Editorial", "Organic", "Bold", "Elegant")
- componentTypes: string[] (relevant section types like "hero", "features", "pricing", "stats", "cta", "testimonials", "faq", "team", "footer", "cards", "gallery")
- keywords: string[] (3-5 key terms extracted from the prompt)
- imageCategories: string[] (matching categories from: business, tech, nature, people, architecture, food, abstract, product, creative)

Return ONLY valid JSON. No markdown, no explanation.`;

async function extractIntent(
  prompt: string,
  callFn: (systemPrompt: string, userPrompt: string) => Promise<{ content: string; provider: string; errorReason?: string }>
): Promise<ExtractedIntent | null> {
  try {
    console.log('[AI Wall] Phase 1: Extracting intent...');
    const { content, errorReason } = await callFn(
      INTENT_EXTRACTION_PROMPT,
      `Extract structured intent from this design prompt: "${prompt}"`
    );

    if (!content) {
      console.warn('[AI Wall] Phase 1 failed (no content):', errorReason);
      return null;
    }

    const parsed = resilientJsonParse(content);
    if (parsed && parsed.industry && parsed.brandMood) {
      console.log(`[AI Wall] Phase 1 ✓ Industry: ${parsed.industry}, Mood: ${parsed.brandMood}`);
      return parsed as ExtractedIntent;
    }
    console.warn('[AI Wall] Phase 1 failed (invalid schema)');
    return null;
  } catch (err) {
    console.warn('[AI Wall] Phase 1 error, falling back to regex:', err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2: DESIGN TOKEN ARCHITECTING — Design System Layer
// ═══════════════════════════════════════════════════════════════

interface DesignTokens {
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
    bodyWeight: string;
    headingSize: string;
    bodySize: string;
    letterSpacing: string;
    lineHeight: string;
  };
  spacing: {
    base: number;
    sectionPadding: string;
    elementGap: string;
    cardPadding: string;
  };
  borderRadius: {
    small: string;
    medium: string;
    large: string;
    pill: string;
  };
  shadows: {
    subtle: string;
    medium: string;
    dramatic: string;
  };
  motion: {
    easing: string;
    durationFast: string;
    durationNormal: string;
  };
  gradients: string[];
}

const TOKEN_GENERATION_PROMPT = `You are a senior design system architect. Given a project's industry and brand mood, generate a cohesive Design Token System that will be used across ALL design variants.

The tokens must ensure brand cohesion: Variation 1 and Variation 30 must feel like the same brand.

Return a JSON object with:
- colors: { primary (hex), secondary (hex), accent (hex), background (hex), surface (hex), text (hex), muted (hex), contrast (hex) }
- typography: { headingFont (web-safe font name), bodyFont (web-safe font name), headingWeight (CSS weight), bodyWeight (CSS weight), headingSize (px), bodySize (px), letterSpacing (em), lineHeight (unitless ratio) }
- spacing: { base (number, 4 or 8), sectionPadding (CSS value), elementGap (CSS value), cardPadding (CSS value) }
- borderRadius: { small (px), medium (px), large (px), pill (px) }
- shadows: { subtle (CSS box-shadow), medium (CSS box-shadow), dramatic (CSS box-shadow) }
- motion: { easing (CSS cubic-bezier), durationFast (ms string), durationNormal (ms string) }
- gradients: string[] (2-3 CSS linear-gradient values using the color palette)

Design for premium, high-end aesthetics. Colors must have strong contrast ratios for accessibility.
Return ONLY valid JSON. No markdown, no explanation.`;

async function generateDesignTokens(
  intent: ExtractedIntent,
  callFn: (systemPrompt: string, userPrompt: string) => Promise<{ content: string; provider: string; errorReason?: string }>
): Promise<DesignTokens | null> {
  try {
    console.log('[AI Wall] Phase 2: Generating design tokens...');
    const { content, errorReason } = await callFn(
      TOKEN_GENERATION_PROMPT,
      `Generate a design token system for:
Industry: ${intent.industry}
Brand Mood: ${intent.brandMood}
Keywords: ${intent.keywords.join(', ')}
Target components: ${intent.componentTypes.join(', ')}`
    );

    if (!content) {
      console.warn('[AI Wall] Phase 2 failed (no content):', errorReason);
      return null;
    }

    const parsed = resilientJsonParse(content);
    if (parsed && parsed.colors && parsed.typography) {
      console.log('[AI Wall] Phase 2 ✓ Design tokens generated');
      return parsed as DesignTokens;
    }
    console.warn('[AI Wall] Phase 2 failed (invalid token schema)');
    return null;
  } catch (err) {
    console.warn('[AI Wall] Phase 2 error, falling back to procedural seeds:', err);
    return null;
  }
}

// Convert design tokens into a seed-compatible color mood for the system prompt
function tokensToColorDirective(tokens: DesignTokens): string {
  return `**Unified Brand Color System (USE THESE EXACT COLORS):**
- Background: ${tokens.colors.background}
- Surface/Cards: ${tokens.colors.surface}
- Primary Text: ${tokens.colors.text}
- Primary Brand: ${tokens.colors.primary}
- Secondary Brand: ${tokens.colors.secondary}
- Accent: ${tokens.colors.accent}
- Muted: ${tokens.colors.muted}
- Contrast: ${tokens.colors.contrast}`;
}

function tokensToTypographyDirective(tokens: DesignTokens): string {
  return `**Unified Typography System:**
- Heading Font: ${tokens.typography.headingFont}, weight ${tokens.typography.headingWeight}, size ${tokens.typography.headingSize}, letter-spacing ${tokens.typography.letterSpacing}
- Body Font: ${tokens.typography.bodyFont}, weight ${tokens.typography.bodyWeight}, size ${tokens.typography.bodySize}
- Line Height: ${tokens.typography.lineHeight}`;
}

function tokensToSpacingDirective(tokens: DesignTokens): string {
  return `**Unified Spacing System (${tokens.spacing.base}pt base):**
- Section Padding: ${tokens.spacing.sectionPadding}
- Element Gap: ${tokens.spacing.elementGap}
- Card Padding: ${tokens.spacing.cardPadding}`;
}

function tokensToMotionDirective(tokens: DesignTokens): string {
  return `**Motion System:**
- Easing: ${tokens.motion.easing}
- Fast Duration: ${tokens.motion.durationFast}
- Normal Duration: ${tokens.motion.durationNormal}
- Every interactive element MUST include animation props: animationDelay, animationDuration:"${tokens.motion.durationNormal}", animationEasing:"${tokens.motion.easing}"
- Buttons MUST have hoverTransform:"translateY(-2px)" and transition props`;
}

function tokensToShadowDirective(tokens: DesignTokens): string {
  return `**Shadow Elevation System:**
- Subtle: ${tokens.shadows.subtle}
- Medium: ${tokens.shadows.medium}
- Dramatic: ${tokens.shadows.dramatic}
- Use graduated shadows to create depth hierarchy`;
}

// ═══════════════════════════════════════════════════════════════
// RESILIENT JSON PARSER — Multi-stage recovery engine
// ═══════════════════════════════════════════════════════════════

function resilientJsonParse(raw: string): any {
  if (!raw || !raw.trim()) return null;

  // Stage 1: Strip markdown fences, reasoning blocks, and preamble text
  let cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/g, '')  // MiniMax reasoning blocks
    .replace(/```(?:json)?\s*/g, '').replace(/```/g, '')
    .trim();
  
  // Remove any leading text before the first { or [
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  const firstJson = firstBrace >= 0 && firstBracket >= 0
    ? Math.min(firstBrace, firstBracket)
    : Math.max(firstBrace, firstBracket);
  if (firstJson > 0) {
    cleaned = cleaned.substring(firstJson);
  }

  // Remove trailing text after last matching } or ]
  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  const lastJson = Math.max(lastBrace, lastBracket);
  if (lastJson >= 0 && lastJson < cleaned.length - 1) {
    cleaned = cleaned.substring(0, lastJson + 1);
  }

  // Fix trailing commas before } or ] (common LLM mistake)
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  // Stage 2: Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    // Continue to recovery
  }

  // Stage 3: Bracket balancing — auto-close truncated JSON
  let balanced = cleaned;
  let openBraces = 0, openBrackets = 0;
  let inString = false, escaped = false;

  for (const ch of balanced) {
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') openBraces++;
    if (ch === '}') openBraces--;
    if (ch === '[') openBrackets++;
    if (ch === ']') openBrackets--;
  }

  // Remove trailing incomplete key-value pairs
  if (openBraces > 0 || openBrackets > 0) {
    // Remove trailing comma or partial content after last complete value
    balanced = balanced.replace(/,\s*"[^"]*"?\s*:?\s*[^,}\]]*$/, '');
    balanced = balanced.replace(/,\s*$/, '');
  }

  // Close unclosed brackets/braces
  for (let i = 0; i < openBrackets; i++) balanced += ']';
  for (let i = 0; i < openBraces; i++) balanced += '}';

  try {
    return JSON.parse(balanced);
  } catch (_) {
    // Continue to salvage
  }

  // Stage 4: Salvage extraction — find the component object
  const componentMatch = cleaned.match(/"component"\s*:\s*(\{)/);
  if (componentMatch) {
    const startIdx = cleaned.indexOf(componentMatch[0]) + '"component":'.length;
    let depth = 0;
    let endIdx = startIdx;
    let inStr = false, esc = false;

    for (let i = startIdx; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === '{') depth++;
      if (ch === '}') { depth--; if (depth === 0) { endIdx = i + 1; break; } }
    }

    let componentStr = cleaned.substring(startIdx, endIdx);
    // If we didn't close properly, balance it
    if (depth > 0) {
      componentStr = componentStr.replace(/,\s*$/, '');
      for (let i = 0; i < depth; i++) componentStr += '}';
    }

    try {
      const component = JSON.parse(componentStr);
      // Try to extract name/description from the surrounding text
      const nameMatch = cleaned.match(/"name"\s*:\s*"([^"]*)"/);
      const descMatch = cleaned.match(/"description"\s*:\s*"([^"]*)"/);
      return {
        name: nameMatch?.[1] || 'Recovered design',
        description: descMatch?.[1] || 'Salvaged from partial output',
        layoutType: 'standard',
        component,
      };
    } catch (_) {
      // Final fallback
    }
  }

  console.error('[AI Wall] All JSON recovery stages failed');
  return null;
}

// ═══════════════════════════════════════════════════════════════
// BUILD SYSTEM PROMPT — Enhanced with tokens, motion, accessibility
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// SECTION PLANNING — Determine which sections to generate
// ═══════════════════════════════════════════════════════════════

const SECTION_ORDER = ['navigation', 'hero', 'features', 'stats', 'cards', 'testimonials', 'team', 'pricing', 'faq', 'cta', 'contact', 'footer'];

const SINGLE_SECTION_PATTERN = /^(just|only|create|make|design)?\s*(a|an|the)?\s*(hero|pricing|features?|testimonials?|cta|footer|nav|header|contact|faq|team|cards?|gallery|stats?)\s*(section|block|component|area)?$/i;

function planSections(intent: ExtractedIntent | null, prompt: string): string[] {
  // Check if user explicitly asks for a single section
  const singleMatch = prompt.match(SINGLE_SECTION_PATTERN);
  if (singleMatch) {
    const sectionType = singleMatch[3].toLowerCase().replace(/s$/, '');
    const normalized = sectionType === 'feature' ? 'features' : sectionType === 'testimonial' ? 'testimonials' : sectionType === 'card' ? 'cards' : sectionType === 'stat' ? 'stats' : sectionType === 'nav' || sectionType === 'header' ? 'navigation' : sectionType;
    return [normalized];
  }

  // Use intent's componentTypes if available, otherwise default
  const requested = intent?.componentTypes || [];
  
  let sections: string[];
  if (requested.length >= 3) {
    sections = requested.sort((a, b) => {
      const ia = SECTION_ORDER.indexOf(a);
      const ib = SECTION_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    }).slice(0, 5);
  } else {
    // Default: hero + features + cta (minimum 3)
    const defaults = ['hero', 'features', 'cta'];
    const merged = [...new Set([...requested, ...defaults])];
    sections = merged.sort((a, b) => {
      const ia = SECTION_ORDER.indexOf(a);
      const ib = SECTION_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    }).slice(0, 5);
  }

  // Auto-include navigation for multi-section page designs
  if (sections.length > 1 && sections.includes('hero') && !sections.includes('navigation')) {
    sections.unshift('navigation');
  }

  return sections;
}

function buildSystemPrompt(
  componentType: string,
  seed: ProceduralSeed,
  allImages: string,
  tokens: DesignTokens | null,
  contextMemory: string[],
  entropy: string,
  intent: ExtractedIntent | null,
  sectionPlan: string[] | null,
  savedStyle?: any,
): string {
  // If savedStyle provided, use it for colors/typography instead of seed/tokens
  const colorDirective = savedStyle?.tokens?.colors
    ? `**Locked Brand Color System (USE THESE EXACT COLORS):**
- Background: ${savedStyle.tokens.colors.background || savedStyle.tokens.colors.bg || '#ffffff'}
- Surface/Cards: ${savedStyle.tokens.colors.surface || '#f8f9fa'}
- Primary Text: ${savedStyle.tokens.colors.text || '#111827'}
- Primary Brand: ${savedStyle.tokens.colors.primary || savedStyle.tokens.colors.accent || '#6366f1'}
- Secondary Brand: ${savedStyle.tokens.colors.secondary || '#8b5cf6'}
- Accent: ${savedStyle.tokens.colors.accent || '#6366f1'}
- Muted: ${savedStyle.tokens.colors.muted || '#9ca3af'}`
    : tokens
    ? tokensToColorDirective(tokens)
    : `**Color Mood: "${seed.colorMood.mood}"** — BG: ${seed.colorMood.bg}, Surface: ${seed.colorMood.surface}, Text: ${seed.colorMood.text}, Accent: ${seed.colorMood.accent}, Muted: ${seed.colorMood.muted}`;

  const typographyDirective = savedStyle?.tokens?.typography
    ? `**Locked Typography System:**
- Heading Font: ${savedStyle.tokens.typography.headingFont || 'Inter'}, weight ${savedStyle.tokens.typography.headingWeight || '700'}, size ${savedStyle.tokens.typography.headingSize || '48px'}
- Body Font: ${savedStyle.tokens.typography.bodyFont || 'Inter'}`
    : tokens
    ? tokensToTypographyDirective(tokens)
    : `**Typography: "${seed.typography.label}"** — Heading: ${seed.typography.headingSize} w${seed.typography.headingWeight} ls:${seed.typography.letterSpacing}, Body: ${seed.typography.bodySize}`;

  const spacingDirective = savedStyle?.tokens?.spacing
    ? `**Locked Spacing System:**
- Section Padding: ${savedStyle.tokens.spacing.sectionPadding || '80px 48px'}
- Element Gap: ${savedStyle.tokens.spacing.elementGap || '32px'}
- Card Padding: ${savedStyle.tokens.spacing.cardPadding || '28px'}`
    : tokens
    ? tokensToSpacingDirective(tokens)
    : `**Spacing: "${seed.spacing.label}"** — Section: ${seed.spacing.sectionPad}, Gap: ${seed.spacing.gap}, Card: ${seed.spacing.cardPad}`;

  const borderRadiusDirective = savedStyle?.tokens?.borderRadius
    ? `Border radius: "${savedStyle.tokens.borderRadius}"`
    : `Border radius: "${seed.radius.label}" (${seed.radius.value})`;

  const layoutInstruction = seed.layout.split(': ');
  const layoutName = layoutInstruction[0];
  const layoutGuide = layoutInstruction.slice(1).join(': ');

  const memoryDirective = contextMemory.length > 0
    ? `\nANTI-REPETITION: Previous layouts: ${contextMemory.join(', ')}. Use a COMPLETELY different composition.`
    : '';

  const industryDirective = intent
    ? `\nINDUSTRY: ${intent.industry} | Mood: ${intent.brandMood} | Themes: ${intent.keywords.join(', ')} | Images: ${intent.imageCategories.join(', ')}`
    : '';

  // Multi-section or single-section output format
  const sections = sectionPlan && sectionPlan.length > 1 ? sectionPlan : null;
  
  const sectionDirective = sections
    ? `\n\n**CRITICAL — MULTI-SECTION PAGE REQUIRED:**
You MUST generate ALL ${sections.length} sections: [${sections.join(', ')}].
The response MUST use the "sections" array format (NOT a single "component").
Each section is a complete, visually distinct area of the page with its own layout.
Use DIFFERENT layout compositions for each section — hero might use split-layout, features might use card-grid, CTA might use centered-stack.
All sections share the same color palette and typography but each has unique visual treatment.
DO NOT return only one section. DO NOT combine sections into a single component. Each section = separate entry in the "sections" array.`
    : '';

  const outputFormat = sections
    ? `OUTPUT FORMAT (YOU MUST USE THIS EXACT STRUCTURE WITH ${sections.length} ENTRIES IN THE SECTIONS ARRAY):
{"name":"Design Name","description":"Brief description","layoutType":"${layoutName}","sections":[
${sections.map(s => {
  if (s === 'navigation') {
    return `  {"sectionType":"navigation","component":{"id":"navigation-root","type":"nav-horizontal","props":{"backgroundColor":"...","padding":"16px 32px","display":"flex","alignItems":"center","justifyContent":"space-between"},"children":[{"id":"nav-logo","type":"image","props":{"src":"...","alt":"Logo","_navRole":"logo","width":"80px","height":"80px","objectFit":"contain"}},{"id":"nav-link-1","type":"link","props":{"content":"Home","href":"#","_navRole":"link","_navHref":"#","cursor":"pointer","fontSize":"14px"}},{"id":"nav-link-2","type":"link","props":{"content":"About","href":"#about","_navRole":"link","_navHref":"#about","cursor":"pointer","fontSize":"14px"}},{"id":"nav-link-3","type":"link","props":{"content":"Services","href":"#services","_navRole":"link","_navHref":"#services","cursor":"pointer","fontSize":"14px"}},{"id":"nav-cta","type":"button","props":{"text":"Get Started","_navRole":"link","_navHref":"#contact","backgroundColor":"...","color":"...","padding":"10px 24px","borderRadius":"8px","fontSize":"14px"}}]}}`;
  }
  return `  {"sectionType":"${s}","component":{"id":"${s}-root","type":"section","props":{"backgroundColor":"...","padding":"...","display":"flex","flexDirection":"column","alignItems":"center","gap":"32","minHeight":"500px"},"children":[...]}}`;
}).join(',\n')}
]}

NAVIGATION RULES: When sectionType is "navigation", the root type MUST be "nav-horizontal" (NOT "section" or "div"). Children must be FLAT (no nested divs) — just image, link, and button elements directly inside nav-horizontal. Each child MUST have "_navRole" prop: "logo" for the brand image, "link" for navigation links. Links use "content" prop for display text and "_navHref" for the target URL.`
    : `OUTPUT: {"name":"...","description":"...","layoutType":"${layoutName}","component":{"id":"root","type":"section","props":{...},"children":[...]}}`;

  return `${sections ? `CRITICAL INSTRUCTION: You MUST generate a COMPLETE multi-section web page with EXACTLY ${sections.length} sections: [${sections.join(', ')}]. Each section MUST be a separate object in the "sections" array. DO NOT merge sections. DO NOT return only one section. This is NON-NEGOTIABLE.\n\n` : ''}You are a Premium UI/UX Architect. Generate ${sections ? `a COMPLETE multi-section web page` : `a ${componentType} section`} as a JSON component tree. Philosophy: simplicity as architecture, intentional whitespace, 2-second focal point hierarchy.

**DESIGN STYLE: ${seed.designStyle.name}**
${seed.designStyle.directive}
Apply this aesthetic consistently to ALL elements — cards, buttons, backgrounds, typography treatment, shadows, and spacing.

ENTROPY: ${entropy}

DESIGN SYSTEM:
${colorDirective}
${typographyDirective}
${spacingDirective}
${borderRadiusDirective}

LAYOUT: ${layoutName} — ${layoutGuide}
EFFECT: ${seed.effect}
${memoryDirective}${industryDirective}${sectionDirective}

COMPONENT TYPES (type: key props):
section(backgroundColor,padding,display,flexDirection,alignItems,justifyContent,gap,minHeight) | div(display,flexDirection,alignItems,justifyContent,gap,padding,backgroundColor,borderRadius,maxWidth,width,boxShadow,flexWrap,gridTemplateColumns,flex,minWidth) | heading(content,fontSize,fontWeight,color,textAlign,letterSpacing,lineHeight) | text(content,fontSize,fontWeight,color,textAlign,lineHeight,opacity) | button(text,backgroundColor,color,padding,borderRadius,fontSize,fontWeight,border,minWidth,hoverTransform) | image(src,alt,width,height,objectFit,borderRadius) | icon(iconName,size,color) | link(content,href,color,fontSize) | badge(text,variant) — variant:"default"|"secondary"|"outline"|"destructive", renders as small inline pill | avatar(src,fallback,size) | nav-horizontal(backgroundColor,padding) — children: logo div + links div + actions div | accordion>accordion-item(value)>accordion-header(content)+accordion-content | tabs(defaultValue)>div[tab-triggers containing tab-trigger(value,content)]+tab-content(value) | carousel(autoplay,interval,showDots,showArrows)>carousel-slide | form-wrapper(submitButtonText)>input(label,placeholder,type)+textarea(label,placeholder,rows)+select(label,options)+checkbox(label) | blockquote(content,fontSize,fontStyle) | alert(title,description,variant) | progress(value) | switch(label) | separator | spacer(height) | container(maxWidth,padding)

Valid iconName values: Star,Check,ArrowRight,Mail,Phone,MapPin,Shield,Zap,Heart,Users,Globe,Clock,Award,Target,Layers,Code,Briefcase,TrendingUp,BarChart,MessageCircle,ChevronRight,Play,Download,ExternalLink,Github,Twitter,Linkedin

IMAGE CATALOG:
${allImages}

RULES:
1. Return ONLY valid JSON — no markdown, no explanation
2. Root = "section" with backgroundColor for content sections. Root = "nav-horizontal" for navigation sections (NEVER use "section" or "div" for navigation)${sections ? ' (each section is a separate root)' : ''}
3. Use catalog image URLs only
4. button uses "text" prop, heading/text use "content" prop
5. Unique descriptive IDs
6. Minimum 500px section height (except navigation)
7. Flat props only (no nested style objects)
8. appliedClasses: ["semantic-class"] on every component (section-hero, heading-xl, heading-lg, body-base, btn-primary, btn-secondary, card, flex-row, flex-col, img, icon, link, label)
9. Reuse same class for same-styled components (all cards → "card", not "card-1", "card-2")
10. Include mobileStyles on: flex-row containers (flexDirection:"column"), headings >36px (scaled fontSize), images (width:"100%",height:"auto"), buttons (width:"100%"), sections (paddingLeft:"16",paddingRight:"16")
11. Cards in grids: minWidth:"280px", flex:"1 1 280px"
12. Buttons: padding "14px 28px", minWidth "140px", display:"inline-flex", alignItems:"center", justifyContent:"center"
13. Icons use "iconName" prop (NOT "icon" or "name")
14. accordion/tabs/carousel MUST use correct hierarchy
15. navigation → MUST use type "nav-horizontal" with FLAT children (image with _navRole:"logo", link elements with _navRole:"link" and _navHref). NO nested divs inside navigation.
16. FAQ → use accordion, testimonials → prefer carousel+avatar+blockquote
17. Write CREATIVE, SPECIFIC copy — NO placeholder text
18. Include animationDelay, animationDuration, animationEasing on cards and interactive elements
19. hoverTransform:"translateY(-2px)" on buttons
20. **BADGE/LABEL STYLING — CRITICAL:** Badges are SMALL inline pill elements (font-size 12-14px, padding 4px 12px). Do NOT style badges as large buttons or banners. Do NOT add large fontSize, width, height, or padding to badges. Do NOT put badges inside oversized containers. A badge is a TINY label — like "New", "Popular", "Beta". Use variant prop ONLY ("default", "secondary", "outline"). Do NOT apply custom backgroundColor, color, padding, or borderRadius directly to badge components — the variant handles all styling. If you want a styled label that's NOT a small pill, use a "text" component with custom styling instead of "badge".
21. **ACCESSIBILITY — TEXT CONTRAST IS MANDATORY (WCAG AA 4.5:1 minimum):**
    - Light/white backgrounds (#f*, #e*, #d*, white) → text MUST be dark (#111827, #1f2937, #0f172a). NEVER use white/light text on light backgrounds.
    - Dark backgrounds (#0*, #1*, #2*, #3*, black) → text MUST be light (#ffffff, #f9fafb, #e5e7eb). NEVER use dark text on dark backgrounds.
    - Medium backgrounds → choose text color that creates maximum contrast.
    - Navigation links, heading text, body text, button text — ALL must be clearly readable against their direct parent's backgroundColor.
    - When in doubt, use #111827 on light and #ffffff on dark. Gray-on-gray is FORBIDDEN.

${outputFormat}`;
}

// ═══════════════════════════════════════════════════════════════
// MODEL CONFIGURATION — routes to provider APIs directly
// ═══════════════════════════════════════════════════════════════

type ProviderName = 'google' | 'openai' | 'anthropic' | 'minimax';

interface ProviderConfig {
  provider: ProviderName;
  apiModel: string;
}

const MODEL_PROVIDER_MAP: Record<string, ProviderConfig> = {
  'google/gemini-3-flash-preview': { provider: 'google', apiModel: 'gemini-3-flash-preview' },
  'google/gemini-3-pro-preview':   { provider: 'google', apiModel: 'gemini-3.1-pro-preview' },
  'google/gemini-2.5-flash':       { provider: 'google', apiModel: 'gemini-3-flash-preview' },
  'google/gemini-2.5-pro':         { provider: 'google', apiModel: 'gemini-3.1-pro-preview' },
  'anthropic/claude-sonnet':       { provider: 'anthropic', apiModel: 'claude-sonnet-4-5' },
  'anthropic/claude-haiku':        { provider: 'anthropic', apiModel: 'claude-haiku-4' },
  'openai/gpt-5-mini':             { provider: 'openai', apiModel: 'gpt-5-mini-2025-08-07' },
  'openai/gpt-5':                  { provider: 'openai', apiModel: 'gpt-5.2-2025-12-11' },
  'minimax/MiniMax-M2.5':          { provider: 'minimax', apiModel: 'MiniMax-M2.5' },
};

const DEFAULT_MODEL_KEY = 'google/gemini-3-flash-preview';

// ═══════════════════════════════════════════════════════════════
// MULTI-KEY ROTATION — supports comma-separated key pools
// ═══════════════════════════════════════════════════════════════

function getApiKeys(provider: ProviderName): string[] {
  const envMap: Record<string, string> = {
    google: 'GOOGLE_API_KEY',
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    minimax: 'MINIMAX_API_KEY',
  };
  const raw = Deno.env.get(envMap[provider]) || '';
  return raw.split(',').map(k => k.trim()).filter(Boolean);
}

function pickRandomKey(keys: string[], exclude: string[] = []): string | null {
  const available = keys.filter(k => !exclude.includes(k));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

// Track providers with permanent auth failures (401) for this request lifecycle
const deadProviders = new Set<string>();

// ═══════════════════════════════════════════════════════════════
// CALL PROVIDER API DIRECTLY using provided API key
// ═══════════════════════════════════════════════════════════════

class ProviderError extends Error {
  status: number;
  provider: string;
  constructor(message: string, status: number, provider: string) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
    this.provider = provider;
  }
}

async function callGoogleGemini(apiModel: string, systemPrompt: string, userPrompt: string, apiKey: string, maxTokens: number = 16384): Promise<{ content: string; truncated: boolean }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
      ],
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: maxTokens,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new ProviderError(`Google API error ${response.status}: ${errText}`, response.status, 'google');
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const finishReason = data.candidates?.[0]?.finishReason || '';
  const truncated = finishReason === 'MAX_TOKENS';
  return { content, truncated };
}

async function callOpenAI(apiModel: string, systemPrompt: string, userPrompt: string, apiKey: string, maxTokens: number = 16384): Promise<{ content: string; truncated: boolean }> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: apiModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.85,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new ProviderError(`OpenAI API error ${response.status}: ${errText}`, response.status, 'openai');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  const finishReason = data.choices?.[0]?.finish_reason || '';
  const truncated = finishReason === 'length';
  return { content, truncated };
}

async function callAnthropic(apiModel: string, systemPrompt: string, userPrompt: string, apiKey: string, maxTokens: number = 16384): Promise<{ content: string; truncated: boolean }> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: apiModel,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.9,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new ProviderError(`Anthropic API error ${response.status}: ${errText}`, response.status, 'anthropic');
  }

  const data = await response.json();
  const content = data.content?.[0]?.text || '{}';
  const stopReason = data.stop_reason || '';
  const truncated = stopReason === 'max_tokens';
  return { content, truncated };
}

async function callMiniMax(apiModel: string, systemPrompt: string, userPrompt: string, apiKey: string, maxTokens: number = 16384): Promise<{ content: string; truncated: boolean }> {
  const response = await fetch('https://api.minimax.io/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: apiModel,
      messages: [
        { role: 'system', content: systemPrompt + '\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no explanation, no code fences.' },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.85,
      top_p: 0.9,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new ProviderError(`MiniMax API error ${response.status}: ${errText}`, response.status, 'minimax');
  }

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content || '{}';
  // Strip reasoning blocks if present
  content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const finishReason = data.choices?.[0]?.finish_reason || '';
  const truncated = finishReason === 'length';
  return { content, truncated };
}

// ═══════════════════════════════════════════════════════════════
// CROSS-PROVIDER FALLBACK with multi-key rotation
// ═══════════════════════════════════════════════════════════════

const FALLBACK_MODELS: Record<string, string> = {
  minimax: 'MiniMax-M2.5',
  google: 'gemini-3-flash-preview',
  openai: 'gpt-5-mini-2025-08-07',
  anthropic: 'claude-sonnet-4-5',
};

const PROVIDER_ORDER: ProviderName[] = ['minimax', 'google', 'openai', 'anthropic'];

async function callProviderWithKey(
  provider: ProviderName,
  apiModel: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  maxTokens: number = 16384,
): Promise<{ content: string; truncated: boolean }> {
  if (provider === 'minimax') return callMiniMax(apiModel, systemPrompt, userPrompt, apiKey, maxTokens);
  if (provider === 'google') return callGoogleGemini(apiModel, systemPrompt, userPrompt, apiKey, maxTokens);
  if (provider === 'anthropic') return callAnthropic(apiModel, systemPrompt, userPrompt, apiKey, maxTokens);
  return callOpenAI(apiModel, systemPrompt, userPrompt, apiKey, maxTokens);
}

async function callWithFallback(
  preferredProvider: ProviderName,
  preferredModel: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 16384,
): Promise<{ content: string; provider: string; truncated: boolean; errorReason?: string }> {
  const providerChain = [
    preferredProvider,
    ...PROVIDER_ORDER.filter(p => p !== preferredProvider),
  ];

  const errors: string[] = [];

  for (const provider of providerChain) {
    if (deadProviders.has(provider)) {
      continue;
    }

    const keys = getApiKeys(provider);
    if (keys.length === 0) continue;

    const apiModel = provider === preferredProvider ? preferredModel : FALLBACK_MODELS[provider];
    const triedKeys: string[] = [];
    const retryDelays = [2000, 4000];

    for (let attempt = 0; attempt <= Math.min(retryDelays.length, keys.length - 1); attempt++) {
      const key = pickRandomKey(keys, triedKeys);
      if (!key) break;
      triedKeys.push(key);

      try {
        const { content, truncated } = await callProviderWithKey(provider, apiModel, systemPrompt, userPrompt, key, maxTokens);
        return { content, provider, truncated };
      } catch (err) {
        const providerErr = err as ProviderError;
        const status = providerErr.status || 0;

        if (status === 401 || status === 403) {
          deadProviders.add(provider);
          errors.push(`${provider}: AUTH_FAILED (${status})`);
          break;
        }

        if (status === 429) {
          errors.push(`${provider}: RATE_LIMITED`);
          if (attempt < retryDelays.length) {
            await new Promise(r => setTimeout(r, retryDelays[attempt]));
          }
          continue;
        }

        errors.push(`${provider}: ${providerErr.message?.slice(0, 100)}`);
        break;
      }
    }
  }

  const errorSummary = errors.join(' | ');
  console.error(`[AI Wall] All providers failed: ${errorSummary}`);
  return { content: '', provider: 'none', truncated: false, errorReason: errorSummary };
}

// ═══════════════════════════════════════════════════════════════
// CALL SPECIFIC PROVIDER — With retry + fallback to other providers
// ═══════════════════════════════════════════════════════════════
async function callSpecificProvider(
  provider: ProviderName,
  apiModel: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 16384,
): Promise<{ content: string; provider: string; truncated: boolean; errorReason?: string }> {
  // Build a fallback chain: preferred provider first, then others
  const fallbackChain: Array<{ provider: ProviderName; model: string }> = [
    { provider, model: apiModel },
    ...PROVIDER_ORDER
      .filter(p => p !== provider && !deadProviders.has(p))
      .map(p => ({ provider: p, model: FALLBACK_MODELS[p] })),
  ];

  const errors: string[] = [];

  for (const candidate of fallbackChain) {
    const keys = getApiKeys(candidate.provider);
    if (keys.length === 0) continue;

    // Try up to 2 attempts per provider (with jittered backoff on 429)
    for (let attempt = 0; attempt < 2; attempt++) {
      const key = attempt === 0 ? (pickRandomKey(keys) || keys[0]) : (keys[attempt % keys.length]);

      try {
        const { content, truncated } = await callProviderWithKey(candidate.provider, candidate.model, systemPrompt, userPrompt, key, maxTokens);
        return { content, provider: candidate.provider, truncated };
      } catch (err) {
        const providerErr = err as ProviderError;
        const status = providerErr.status || 0;

        if (status === 401 || status === 403) {
          deadProviders.add(candidate.provider);
          errors.push(`${candidate.provider}: AUTH_FAILED`);
          break; // Skip this provider entirely
        }

        if (status === 429) {
          errors.push(`${candidate.provider}: RATE_LIMITED`);
          if (attempt === 0) {
            // Jittered backoff before retry
            const jitter = 1500 + Math.random() * 1500;
            await new Promise(r => setTimeout(r, jitter));
            continue;
          }
          break; // Move to next provider after 2 rate-limit attempts
        }

        errors.push(`${candidate.provider}: ${providerErr.message?.slice(0, 80)}`);
        break; // Move to next provider on other errors
      }
    }
  }

  const errorSummary = errors.join(' | ');
  console.warn(`[AI Wall] All providers failed for agent: ${errorSummary}`);
  return { content: '', provider, truncated: false, errorReason: errorSummary };
}

// ═══════════════════════════════════════════════════════════════
// GENERATE A SINGLE VARIANT — Used by multi-agent fan-out
// ═══════════════════════════════════════════════════════════════
async function generateVariant(
  prompt: string,
  componentType: string,
  seed: ProceduralSeed,
  provider: ProviderName,
  apiModel: string,
  tokens: DesignTokens | null,
  contextMemory: string[],
  intent: ExtractedIntent | null,
  allImages: string,
  sectionPlan?: string[],
  savedStyle?: any,
  maxTokens: number = 16384,
): Promise<{ result: any; layoutName: string; provider: string; errorReason?: string }> {
  const entropy = generateEntropy();

  const buildPrompts = (sections: string[] | undefined) => {
    const sp = buildSystemPrompt(componentType, seed, allImages, tokens, contextMemory, entropy, intent, sections || null, savedStyle);
    const isMulti = sections && sections.length > 1;
    const up = isMulti
      ? `Generate a COMPLETE multi-section web page for: "${prompt}"

MANDATORY SECTIONS (generate ALL ${sections!.length}): ${sections!.join(', ')}.
Each section MUST be a separate entry in the "sections" array.
DO NOT combine them into one component. DO NOT skip any section.
Each section needs distinct layout and visual treatment.
Layout approach for primary section: ${seed.layout.split(':')[0]}.
Visual effect: ${seed.effect}.
Entropy seed: ${entropy}

Write real, compelling copy specific to this prompt. Make it look like a polished, production-ready design.
If you cannot fit all sections, return at minimum 3 sections in the array.
Return ONLY the JSON object with a "sections" array containing EXACTLY ${sections!.length} entries — no markdown fences, no explanation.`
      : `Generate a ${componentType} section for: "${prompt}"

Layout approach: ${seed.layout.split(':')[0]}.
Visual effect: ${seed.effect}.
Entropy seed: ${entropy}

Write real, compelling copy specific to this prompt. Make it look like a polished, production-ready design.
Return ONLY the JSON object — no markdown fences, no explanation.`;
    return { systemPrompt: sp, userPrompt: up };
  };

  const { systemPrompt, userPrompt } = buildPrompts(sectionPlan);

  const { content, provider: usedProvider, truncated, errorReason } = await callSpecificProvider(
    provider, apiModel, systemPrompt, userPrompt, maxTokens
  );

  console.log(`[AI Wall] Provider ${usedProvider} finished with reason: ${truncated ? 'TRUNCATED' : 'complete'}, content length: ${content.length}`);

  if (!content) {
    return { result: null, layoutName: '', provider: usedProvider, errorReason: errorReason || 'Provider failed' };
  }

  let result = resilientJsonParse(content);

  // ── Truncation retry (once) ──
  const needsRetry = (r: any, wasTruncated: boolean): boolean => {
    if (!r) return wasTruncated;
    // Detect partial multi-section: got parsed JSON but far fewer sections than planned
    if (sectionPlan && sectionPlan.length >= 3) {
      const normalized = normalizeResult(r, seed);
      const gotSections = normalized?.sections?.length || (normalized?.component ? 1 : 0);
      // If we planned 4+ sections but only got 1 (likely just navigation), that's a truncation
      if (gotSections <= 1 && sectionPlan.length >= 3) {
        console.warn(`[AI Wall] Partial result detected: got ${gotSections} sections, expected ${sectionPlan.length}. Retrying...`);
        return true;
      }
    }
    return false;
  };

  if (needsRetry(result, truncated)) {
    const sectionCount = sectionPlan?.length || 1;
    if (sectionCount >= 4) {
      // Retry with reduced sections (first 3 only)
      const reducedPlan = sectionPlan!.slice(0, 3);
      console.warn(`[AI Wall] Retrying with reduced sections: [${reducedPlan.join(', ')}]`);
      const { systemPrompt: sp2, userPrompt: up2 } = buildPrompts(reducedPlan);
      const retry = await callSpecificProvider(provider, apiModel, sp2, up2, maxTokens);
      console.log(`[AI Wall] Retry provider ${retry.provider} finished with reason: ${retry.truncated ? 'TRUNCATED' : 'complete'}, content length: ${retry.content.length}`);
      if (retry.content) {
        const retryResult = resilientJsonParse(retry.content);
        if (retryResult) result = retryResult;
      }
    } else {
      // Retry with doubled token budget (up to 65536)
      const doubledTokens = Math.min(maxTokens * 2, 65536);
      console.warn(`[AI Wall] Retrying with doubled tokens: ${doubledTokens}`);
      const retry = await callSpecificProvider(provider, apiModel, systemPrompt, userPrompt, doubledTokens);
      console.log(`[AI Wall] Retry provider ${retry.provider} finished with reason: ${retry.truncated ? 'TRUNCATED' : 'complete'}, content length: ${retry.content.length}`);
      if (retry.content) {
        const retryResult = resilientJsonParse(retry.content);
        if (retryResult) result = retryResult;
      }
    }
  }

  if (result) {
    const normalized = normalizeResult(result, seed);
    const layoutName = normalized?.layoutType || normalized?.name || seed.layout.split(':')[0];
    const sectionCountResult = normalized?.sections?.length || (normalized?.component ? 1 : 0);
    console.log(`[AI Wall] ✓ Variant ${seed.id} generated via ${usedProvider} (layout: ${layoutName}, sections: ${sectionCountResult})`);
    return { result: normalized, layoutName, provider: usedProvider };
  }

  console.error(`[AI Wall] JSON recovery failed for variant ${seed.id}`);
  return { result: null, layoutName: '', provider: usedProvider, errorReason: `PARSE_ERROR: Invalid JSON from ${usedProvider}` };
}

// ═══════════════════════════════════════════════════════════════
// SEMANTIC CLASS NAME NORMALIZATION — matches AI Builder conventions
// ═══════════════════════════════════════════════════════════════

const CLASS_NAME_MAPPINGS: Record<string, string> = {
  // Typography
  'page-title': 'heading-xl', 'hero-title': 'heading-xl', 'hero-headline': 'heading-xl', 'main-title': 'heading-xl',
  'section-title': 'heading-lg', 'features-title': 'heading-lg', 'testimonials-title': 'heading-lg',
  'pricing-title': 'heading-lg', 'about-title': 'heading-lg', 'cta-title': 'heading-lg', 'faq-title': 'heading-lg',
  'card-title': 'heading-md', 'feature-title': 'heading-md', 'testimonial-title': 'heading-md', 'product-title': 'heading-md',
  'section-subtitle': 'body-lg', 'hero-subtitle': 'body-lg', 'hero-description': 'body-lg',
  'card-description': 'body-base', 'card-text': 'body-base', 'feature-text': 'body-base',
  'body-text': 'body-base', 'description-text': 'body-base',
  'small-text': 'body-sm', 'caption-text': 'body-sm',
  'badge-text': 'label',
  // Buttons
  'primary-button': 'btn-primary', 'main-button': 'btn-primary', 'cta-button': 'btn-primary', 'hero-button': 'btn-primary',
  'secondary-button': 'btn-secondary', 'outline-button': 'btn-secondary',
  'ghost-button': 'btn-ghost', 'link-button': 'btn-link', 'nav-link': 'btn-link',
  // Cards
  'feature-card': 'card', 'testimonial-card': 'card', 'pricing-card': 'card', 'team-card': 'card',
  'product-card': 'card', 'project-card': 'card', 'content-card': 'card',
  // Sections
  'hero-section': 'section-hero', 'cta-section': 'section-accent',
  'features-section': 'section-light', 'testimonials-section': 'section-light',
  'pricing-section': 'section-muted', 'footer-section': 'section-dark',
  'dark-section': 'section-dark', 'light-section': 'section-light',
  // Layout
  'card-grid': 'flex-row', 'features-grid': 'flex-row', 'products-grid': 'flex-row',
  'container-narrow': 'container', 'container-wide': 'container',
};

function normalizeClassName(className: string): string {
  if (!className) return className;

  // Strip sanitized/timestamp patterns
  const sanitizedPattern = /^(sanitized|text|heading|div|section|container|button|image|link|icon)[-_]?\d{10,}/i;
  const timestampSuffixPattern = /[-_]\d{10,}[-_]?[a-z0-9]*$/i;

  if (sanitizedPattern.test(className)) {
    const typeMatch = className.match(/^(sanitized[-_]?)?(text|heading|div|section|container|button|image|link|icon)/i);
    if (typeMatch) {
      const t = typeMatch[2].toLowerCase();
      const map: Record<string, string> = { heading: 'heading-md', text: 'body-base', button: 'btn-primary', container: 'flex-col', div: 'flex-col', section: 'section', image: 'img', link: 'link', icon: 'icon' };
      return map[t] || 'element';
    }
  }

  if (timestampSuffixPattern.test(className)) {
    return normalizeClassName(className.replace(timestampSuffixPattern, ''));
  }

  if (CLASS_NAME_MAPPINGS[className]) return CLASS_NAME_MAPPINGS[className];

  // Strip numeric suffixes
  const baseMatch = className.match(/^(.+?)-?\d+$/);
  if (baseMatch && CLASS_NAME_MAPPINGS[baseMatch[1]]) return CLASS_NAME_MAPPINGS[baseMatch[1]];

  // Pattern-based normalization
  const patterns: Array<{ pattern: RegExp; replacement: string }> = [
    { pattern: /^(hero|page|main)[-_]?(title|heading|headline)[-_]?\d*$/i, replacement: 'heading-xl' },
    { pattern: /^(section|features|about|testimonials|pricing|cta|faq|contact)[-_]?(title|heading)[-_]?\d*$/i, replacement: 'heading-lg' },
    { pattern: /^(card|feature|product|team|testimonial|project)[-_]?(title|heading)[-_]?\d*$/i, replacement: 'heading-md' },
    { pattern: /^(hero|section)[-_]?(subtitle|description|text)[-_]?\d*$/i, replacement: 'body-lg' },
    { pattern: /^(card|feature|product|testimonial|body)[-_]?(text|description|content)[-_]?\d*$/i, replacement: 'body-base' },
    { pattern: /^(small|caption|helper)[-_]?(text)[-_]?\d*$/i, replacement: 'body-sm' },
    { pattern: /^(badge|label|tag)[-_]?(text)?[-_]?\d*$/i, replacement: 'label' },
    { pattern: /^(primary|main|cta|hero)[-_]?(button|btn)[-_]?\d*$/i, replacement: 'btn-primary' },
    { pattern: /^(secondary|outline)[-_]?(button|btn)[-_]?\d*$/i, replacement: 'btn-secondary' },
    { pattern: /^(ghost|transparent)[-_]?(button|btn)[-_]?\d*$/i, replacement: 'btn-ghost' },
    { pattern: /^(feature|testimonial|pricing|team|product|project|content)[-_]?(card)[-_]?\d*$/i, replacement: 'card' },
    { pattern: /^(hero|cta)[-_]?(section|container)[-_]?\d*$/i, replacement: 'section-accent' },
    { pattern: /^(features|testimonials|about|contact)[-_]?(section|container)[-_]?\d*$/i, replacement: 'section-light' },
    { pattern: /^(footer|dark)[-_]?(section|container)[-_]?\d*$/i, replacement: 'section-dark' },
    { pattern: /^(card|feature|product|testimonial|team)[-_]?(grid|row|container)[-_]?\d*$/i, replacement: 'flex-row' },
  ];

  for (const { pattern, replacement } of patterns) {
    if (pattern.test(className)) return replacement;
  }

  return className;
}

// Recursively normalize appliedClasses in the component tree
function normalizeComponentClassNames(comp: any): any {
  if (!comp || typeof comp !== 'object') return comp;

  if (comp.props?.appliedClasses && Array.isArray(comp.props.appliedClasses)) {
    comp.props.appliedClasses = [...new Set(comp.props.appliedClasses.map(normalizeClassName))];
  }

  // Auto-assign appliedClasses if missing based on component type + id
  if (!comp.props?.appliedClasses || comp.props.appliedClasses.length === 0) {
    const inferredClass = inferClassFromComponent(comp);
    if (inferredClass) {
      if (!comp.props) comp.props = {};
      comp.props.appliedClasses = [inferredClass];
    }
  }

  if (Array.isArray(comp.children)) {
    comp.children = comp.children.map(normalizeComponentClassNames);
  }

  return comp;
}

// Infer a semantic class name from component type and id
function inferClassFromComponent(comp: any): string | null {
  const type = comp.type?.toLowerCase();
  const id = (comp.id || '').toLowerCase();

  if (type === 'section') {
    if (id.includes('hero')) return 'section-hero';
    if (id.includes('cta')) return 'section-accent';
    if (id.includes('footer') || id.includes('dark')) return 'section-dark';
    return 'section';
  }
  if (type === 'heading') {
    if (id.includes('hero') || id.includes('main') || id.includes('page')) return 'heading-xl';
    if (id.includes('section') || id.includes('feature')) return 'heading-lg';
    return 'heading-md';
  }
  if (type === 'text') {
    if (id.includes('subtitle') || id.includes('description')) return 'body-lg';
    if (id.includes('caption') || id.includes('small')) return 'body-sm';
    if (id.includes('badge') || id.includes('label') || id.includes('tag')) return 'label';
    return 'body-base';
  }
  if (type === 'button') {
    if (id.includes('secondary') || id.includes('outline')) return 'btn-secondary';
    if (id.includes('ghost')) return 'btn-ghost';
    return 'btn-primary';
  }
  if (type === 'div') {
    if (id.includes('card')) return 'card';
    if (id.includes('grid') || id.includes('row')) return 'flex-row';
    if (id.includes('container') || id.includes('wrapper')) return 'container';
    return 'flex-col';
  }
  if (type === 'image') return 'img';

  // New component types
  if (type === 'icon') return 'icon';
  if (type === 'link') return 'link';
  if (type === 'badge') return 'label';
  if (type === 'avatar') return 'avatar';
  if (type === 'accordion') return 'accordion';
  if (type === 'accordion-item') return 'accordion-item';
  if (type === 'accordion-header') return 'accordion-header';
  if (type === 'accordion-content') return 'accordion-content';
  if (type === 'tabs') return 'tabs';
  if (type === 'tab-trigger') return 'tab-trigger';
  if (type === 'tab-content') return 'tab-content';
  if (type === 'carousel') return 'carousel';
  if (type === 'carousel-slide') return 'carousel-slide';
  if (type === 'form-wrapper') return 'form';
  if (type === 'nav-horizontal') return 'nav';
  if (type === 'blockquote') return 'blockquote';
  if (type === 'alert') return 'alert';
  if (type === 'input') return 'input';
  if (type === 'textarea') return 'textarea';
  if (type === 'checkbox') return 'checkbox';
  if (type === 'select') return 'select';
  if (type === 'container') return 'container';
  if (type === 'progress') return 'progress';
  if (type === 'switch') return 'switch';
  if (type === 'separator' || type === 'spacer') return null;

  return null;
}

// Flatten nested divs to extract leaf elements (links, images, buttons, text)
function flattenNavChildren(children: any[]): any[] {
  const result: any[] = [];
  for (const child of children) {
    if (!child) continue;
    const type = (child.type || '').toLowerCase();
    if ((type === 'div' || type === 'section') && Array.isArray(child.children) && child.children.length > 0) {
      // Recurse into container divs to extract their children
      result.push(...flattenNavChildren(child.children));
    } else {
      result.push(child);
    }
  }
  return result;
}

// Normalize a navigation section to use nav-horizontal with proper _navRole props
function normalizeNavigation(section: any): any {
  const comp = section.component;
  if (!comp) return section;

  // Force root type to nav-horizontal
  const rootType = (comp.type || '').toLowerCase();
  if (rootType === 'section' || rootType === 'div') {
    console.log(`[AI Wall] Navigation fix: converting root type "${comp.type}" → "nav-horizontal"`);
    comp.type = 'nav-horizontal';
  }

  // Flatten nested divs into flat children
  if (Array.isArray(comp.children) && comp.children.length > 0) {
    const flat = flattenNavChildren(comp.children);
    
    // Assign _navRole to children based on their type
    for (const child of flat) {
      if (!child.props) child.props = {};
      const cType = (child.type || '').toLowerCase();
      const cId = (child.id || '').toLowerCase();
      
      if (cType === 'image' || cId.includes('logo') || cId.includes('brand')) {
        child.props._navRole = child.props._navRole || 'logo';
      } else if (cType === 'link' || cType === 'button' || cType === 'heading' || cType === 'text') {
        child.props._navRole = child.props._navRole || 'link';
        // For text/heading acting as nav links, convert to link type
        if (cType === 'text' || cType === 'heading') {
          child.type = 'link';
          child.props.content = child.props.content || child.props.text || '';
          child.props._navHref = child.props._navHref || child.props.href || '#';
          child.props.cursor = 'pointer';
        }
        if (cType === 'link' && !child.props._navHref) {
          child.props._navHref = child.props.href || '#';
        }
        if (cType === 'button' && !child.props._navHref) {
          child.props._navHref = child.props.href || '#';
        }
      }
    }
    
    comp.children = flat;
  }

  return section;
}

// Normalize the AI response into our expected shape (supports multi-section)
function normalizeResult(result: any, seed: ProceduralSeed): any {
  let normalized;
  
  // Multi-section response: { sections: [{ sectionType, component }, ...] }
  if (result?.sections && Array.isArray(result.sections)) {
    normalized = {
      name: result.name || `${seed.colorMood.mood} design`,
      description: result.description || 'Multi-section design',
      layoutType: result.layoutType || 'standard',
      sections: result.sections.map((s: any) => {
        const section = {
          sectionType: s.sectionType || 'section',
          component: normalizeComponentClassNames(s.component),
        };
        // Apply navigation normalization for nav sections
        if (section.sectionType === 'navigation') {
          return normalizeNavigation(section);
        }
        return section;
      }),
    };
    return normalized;
  }
  
  // Single component response (legacy)
  if (result?.component) {
    normalized = result;
  } else if (result?.variant?.component) {
    normalized = result.variant;
  } else if (result?.type === 'section' && result?.children) {
    normalized = { name: `${seed.colorMood.mood} design`, description: 'Generated design', layoutType: 'standard', component: result };
  } else {
    normalized = result;
  }

  // Apply semantic class normalization to the component tree
  if (normalized?.component) {
    normalized.component = normalizeComponentClassNames(normalized.component);
  }

  return normalized;
}

// ═══════════════════════════════════════════════════════════════
// MULTI-AGENT VARIANT ASSIGNMENTS
// ═══════════════════════════════════════════════════════════════
interface AgentAssignment {
  provider: ProviderName;
  apiModel: string;
  label: string;
}

const VARIANT_AGENTS: AgentAssignment[] = [
  { provider: 'minimax', apiModel: 'MiniMax-M2.5', label: 'MiniMax M2.5' },
  { provider: 'google', apiModel: 'gemini-3-flash-preview', label: 'Gemini 3 Flash' },
  { provider: 'openai', apiModel: 'gpt-5-mini-2025-08-07', label: 'GPT-5 Mini' },
];

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER — Multi-Agent Pipeline
// ═══════════════════════════════════════════════════════════════
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, componentType: explicitType, variantIndex, cachedIntent, cachedTokens, cachedImages, previousLayouts, savedStyle, sectionPlan: clientSectionPlan } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clear dead providers for each new request
    deadProviders.clear();

    const isSingleVariantMode = typeof variantIndex === 'number';

    console.log(`[AI Wall] ═══ ${isSingleVariantMode ? `Single Variant #${variantIndex}` : 'Multi-Agent Pipeline'} Started ═══`);

    // ─── PHASE 1: Intent — skip if cached ───
    let intent: ExtractedIntent | null = null;
    if (cachedIntent) {
      intent = cachedIntent as ExtractedIntent;
      console.log('[AI Wall] Phase 1: Using cached intent');
    } else {
      const intentCall = (systemPrompt: string, userPrompt: string) =>
        callSpecificProvider('minimax', 'MiniMax-M2.5', systemPrompt, userPrompt);
      intent = await extractIntent(prompt, intentCall);
    }

    const componentType = explicitType
      || (intent?.componentTypes?.[0])
      || detectComponentType(prompt);

    console.log(`[AI Wall] Intent: Type=${componentType}, Industry=${intent?.industry || 'unknown'}`);

    // ─── PHASE 2: Tokens — skip if cached ───
    let tokens: DesignTokens | null = null;
    if (cachedTokens) {
      tokens = cachedTokens as DesignTokens;
      console.log('[AI Wall] Phase 2: Using cached tokens');
    } else if (intent) {
      const architectCall = async (systemPrompt: string, userPrompt: string) => {
        const result = await callSpecificProvider('google', 'gemini-3-flash-preview', systemPrompt, userPrompt);
        if (!result.content) {
          console.log('[AI Wall] Agent 1: Google failed, falling back to MiniMax');
          return callSpecificProvider('minimax', 'MiniMax-M2.5', systemPrompt, userPrompt);
        }
        return result;
      };
      tokens = await generateDesignTokens(intent, architectCall);
    }
    console.log(`[AI Wall] Tokens: ${tokens ? 'available' : 'procedural fallback'}`);

    // ─── Pre-fetch Unsplash images (skip if cached from previous call) ───
    let allImages: string;
    if (cachedImages && typeof cachedImages === 'string' && cachedImages.length > 50) {
      allImages = cachedImages;
      console.log('[AI Wall] Using cached Unsplash images (skipped 9 API calls)');
    } else {
      try {
        const categories = ['business', 'technology', 'nature', 'people', 'architecture', 'food', 'abstract', 'product', 'creative'];
        const apiResults: string[] = [];
        for (const cat of categories) {
          const urls = await searchUnsplashImages(cat, { width: 1200, height: 800, perPage: 3 });
          if (urls.length > 0) {
            apiResults.push(`${cat}: ${urls.join(' | ')}`);
          }
        }
        allImages = apiResults.length > 0
          ? apiResults.join('\n')
          : Object.entries(CURATED_IMAGES).map(([cat, urls]) => `${cat}: ${urls.join(' | ')}`).join('\n');
      } catch {
        allImages = Object.entries(CURATED_IMAGES).map(([cat, urls]) => `${cat}: ${urls.join(' | ')}`).join('\n');
      }
    }

    // ─── Context memory from previous layouts ───
    const contextMemory: string[] = Array.isArray(previousLayouts) ? previousLayouts : [];

    // ─── PHASE 3: Section Planning ───
    const sectionPlan: string[] = clientSectionPlan || planSections(intent, prompt);
    console.log(`[AI Wall] Section plan: [${sectionPlan.join(', ')}]`);

    // ─── Tiered token budget based on section count ───
    const sectionCount = sectionPlan.length;
    const maxTokens = sectionCount <= 1 ? 8192 : sectionCount <= 3 ? 16384 : 32768;
    console.log(`[AI Wall] Token budget: ${maxTokens} (${sectionCount} sections)`);

    if (isSingleVariantMode) {
      // ═══ SINGLE VARIANT MODE — one design per call ═══
      const seeds = generateProceduralSeeds(4);
      const seed = seeds[variantIndex % seeds.length];

      // Rotate through providers based on variantIndex
      const agent = VARIANT_AGENTS[variantIndex % VARIANT_AGENTS.length];

      console.log(`[AI Wall] Generating variant #${variantIndex} via ${agent.label} (${seed.colorMood.mood}, ${seed.layout.split(':')[0]})`);

      const { result, layoutName, provider, errorReason } = await generateVariant(
        prompt, componentType, seed, agent.provider, agent.apiModel,
        tokens, contextMemory, intent, allImages, sectionPlan, savedStyle, maxTokens,
      );

      // Handle multi-section results
      if (result && (result.sections || result.component)) {
        let components: any[];
        if (result.sections && Array.isArray(result.sections)) {
          // Multi-section: each section becomes a component
          components = result.sections.map((s: any) => {
            if (s.component) {
              return enforceTextContrast(enforceCardLayoutQuality(injectResponsiveDefaults(s.component)));
            }
            return null;
          }).filter(Boolean);
        } else {
          // Single component (legacy)
          const responsiveComponent = injectResponsiveDefaults(result.component);
          components = [enforceTextContrast(enforceCardLayoutQuality(responsiveComponent))];
        }

        return new Response(
          JSON.stringify({
            success: true,
            componentType,
            orchestration: 'single-variant',
            intent: variantIndex === 0 ? (intent || undefined) : undefined,
            tokens: variantIndex === 0 ? (tokens || undefined) : undefined,
            images: variantIndex === 0 ? allImages : undefined,
            sectionPlan: variantIndex === 0 ? sectionPlan : undefined,
            sectionCount: components.length,
            variant: {
              id: `variant-${variantIndex}-${Date.now()}`,
              name: result.name || `${seed.colorMood.mood} ${seed.typography.label}`,
              description: result.description || `${seed.colorMood.mood} mood, ${seed.layout.split(':')[0]} layout`,
              layoutType: result.layoutType || 'standard',
              components,
              provider: agent.label,
              sectionCount: components.length,
            },
            layoutName: layoutName || seed.layout.split(':')[0],
            variantIndex,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            variantIndex,
            errorReason: errorReason || 'Generation failed',
            variant: {
              id: `variant-${variantIndex}-${Date.now()}`,
              name: `Variant ${variantIndex + 1} (${agent.label})`,
              description: `Generation failed — ${agent.label}`,
              layoutType: 'standard',
              components: [],
              provider: agent.label,
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ═══ LEGACY MULTI-AGENT MODE (3 parallel variants) ═══
    const seeds = generateProceduralSeeds(3);

    console.log('[AI Wall] Agents 2a-2c: Launching parallel variant generation...');

    const variantPromises = VARIANT_AGENTS.map((agent, i) =>
      generateVariant(
        prompt, componentType, seeds[i], agent.provider, agent.apiModel,
        tokens, contextMemory, intent, allImages, sectionPlan, undefined, maxTokens,
      )
    );

    const variantResults = await Promise.allSettled(variantPromises);

    const variants: any[] = [];
    const errorReasons: string[] = [];

    variantResults.forEach((settled, i) => {
      const agent = VARIANT_AGENTS[i];
      const seed = seeds[i];

      if (settled.status === 'fulfilled') {
        const { result, layoutName, provider, errorReason } = settled.value;

        if (result && result.component) {
          if (layoutName) contextMemory.push(layoutName);

          const responsiveComponent = enforceTextContrast(injectResponsiveDefaults(result.component));

          variants.push({
            id: `variant-${seed.id}-${Date.now()}`,
            name: result.name || `${seed.colorMood.mood} ${seed.typography.label}`,
            description: result.description || `${seed.colorMood.mood} mood, ${seed.layout.split(':')[0]} layout`,
            layoutType: result.layoutType || 'standard',
            components: [responsiveComponent],
            provider: agent.label,
          });
          console.log(`[AI Wall] Agent 2${String.fromCharCode(97 + i)} ✓ ${agent.label} — ${layoutName}`);
        } else {
          if (errorReason) errorReasons.push(errorReason);
          console.warn(`[AI Wall] Agent 2${String.fromCharCode(97 + i)} ✗ ${agent.label} failed: ${errorReason}`);
          variants.push({
            id: `variant-${seed.id}-${Date.now()}`,
            name: `Variant ${i + 1} (${agent.label})`,
            description: `Generation failed — ${agent.label}`,
            layoutType: 'standard',
            components: [],
            provider: agent.label,
          });
        }
      } else {
        const reason = settled.reason?.message || 'Unknown error';
        errorReasons.push(`${agent.provider}: ${reason}`);
        console.error(`[AI Wall] Agent 2${String.fromCharCode(97 + i)} ✗ ${agent.label} crashed: ${reason}`);
        variants.push({
          id: `variant-${seed.id}-${Date.now()}`,
          name: `Variant ${i + 1} (${agent.label})`,
          description: `Generation failed — ${agent.label}`,
          layoutType: 'standard',
          components: [],
          provider: agent.label,
        });
      }
    });

    const successCount = variants.filter(v => v.components.length > 0).length;
    console.log(`[AI Wall] ═══ Pipeline complete: ${successCount}/3 variants ═══`);

    const uniqueErrors = [...new Set(errorReasons)];

    const tokensSummary = tokens ? {
      colors: {
        background: tokens.background,
        surface: tokens.surface,
        text: tokens.text,
        accent: tokens.accent,
        muted: tokens.muted,
      },
      fonts: [tokens.headingFont, tokens.bodyFont].filter(Boolean),
    } : undefined;

    return new Response(
      JSON.stringify({
        success: true,
        componentType,
        orchestration: 'multi-agent',
        agents: VARIANT_AGENTS.map(a => a.label),
        intent: intent || undefined,
        tokens: tokensSummary,
        variants,
        totalGenerated: successCount,
        ...(uniqueErrors.length > 0 ? { errorReasons: uniqueErrors } : {}),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[AI Wall] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Generation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
