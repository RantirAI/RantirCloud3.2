/**
 * Design System Types
 * 
 * Centralized, project-level design system architecture.
 * Variables cascade properly, remain override-safe, and update all linked instances in real-time.
 */

// ============================================================
// TOKEN CATEGORIES
// ============================================================

export type TokenCategory = 
  | 'colors'
  | 'typography'
  | 'spacing'
  | 'borderRadius'
  | 'shadows'
  | 'breakpoints'
  | 'interactionStates';

// ============================================================
// COLOR TOKENS
// ============================================================

export interface ColorToken {
  id: string;
  name: string;
  value: string; // HSL format: "222.2 84% 4.9%"
  cssVar: string; // CSS variable name: "--primary"
  category: 'brand' | 'semantic' | 'neutral' | 'surface';
  description?: string;
  isActive: boolean;
}

export interface ColorTokenGroup {
  brand: ColorToken[];
  semantic: ColorToken[];
  neutral: ColorToken[];
  surface: ColorToken[];
}

// ============================================================
// TYPOGRAPHY TOKENS
// ============================================================

export interface TypographyToken {
  id: string;
  name: string;
  cssVar: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing?: string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  category: 'display' | 'heading' | 'body' | 'label' | 'code';
  description?: string;
  isActive: boolean;
}

export interface FontFamilyToken {
  id: string;
  name: string;
  cssVar: string;
  value: string; // Font stack
  category: 'heading' | 'body' | 'mono';
  isActive: boolean;
}

export interface TypographyScale {
  fontFamilies: FontFamilyToken[];
  typeStyles: TypographyToken[];
}

// ============================================================
// SPACING TOKENS
// ============================================================

export interface SpacingToken {
  id: string;
  name: string; // xs, sm, md, lg, xl, 2xl, etc.
  cssVar: string;
  value: string; // rem or px
  pixels: number;
  category: 'micro' | 'small' | 'medium' | 'large' | 'macro';
  description?: string;
  isActive: boolean;
}

export interface SpacingConfig {
  baseUnit: number; // 4 or 8 px
  scale: SpacingToken[];
  containerPadding: {
    desktop: string;
    tablet: string;
    mobile: string;
  };
  sectionGap: string;
  gridGap: string;
}

// ============================================================
// BORDER RADIUS TOKENS
// ============================================================

export interface BorderRadiusToken {
  id: string;
  name: string; // none, sm, md, lg, xl, 2xl, full
  cssVar: string;
  value: string;
  pixels: number;
  category: 'subtle' | 'moderate' | 'pronounced' | 'pill';
  description?: string;
  isActive: boolean;
}

export interface BorderRadiusConfig {
  scale: BorderRadiusToken[];
  componentDefaults: {
    button: string; // Token name reference
    card: string;
    input: string;
    modal: string;
    badge: string;
  };
}

// ============================================================
// SHADOW TOKENS
// ============================================================

export interface ShadowToken {
  id: string;
  name: string; // none, sm, md, lg, xl, 2xl
  cssVar: string;
  value: string; // CSS box-shadow value
  category: 'elevation' | 'inset' | 'glow';
  description?: string;
  isActive: boolean;
}

export interface ShadowConfig {
  scale: ShadowToken[];
  componentDefaults: {
    card: string;
    dropdown: string;
    modal: string;
    button: string;
  };
}

// ============================================================
// BREAKPOINT TOKENS
// ============================================================

export interface BreakpointToken {
  id: string;
  name: 'desktop' | 'tablet' | 'mobile';
  label: string;
  minWidth: number;
  maxWidth: number | null;
  cssMediaQuery: string;
  canvasWidth: number; // Default preview width
  icon: string;
  isActive: boolean;
}

export interface BreakpointConfig {
  breakpoints: BreakpointToken[];
  defaultBreakpoint: 'desktop' | 'tablet' | 'mobile';
}

// ============================================================
// INTERACTION STATE TOKENS
// ============================================================

export type InteractionStateName = 'hover' | 'active' | 'focus' | 'disabled' | 'loading';

export interface InteractionStateToken {
  id: string;
  stateName: InteractionStateName;
  property: string; // CSS property affected
  value: string; // Value change
  transition?: string; // Transition timing
  isActive: boolean;
}

export interface InteractionConfig {
  transitionDuration: string; // e.g., "150ms"
  transitionEasing: string; // e.g., "ease-in-out"
  states: {
    hover: {
      opacity?: string;
      transform?: string;
      backgroundColor?: string;
    };
    active: {
      opacity?: string;
      transform?: string;
      backgroundColor?: string;
    };
    focus: {
      outline?: string;
      ringColor?: string;
      ringWidth?: string;
    };
    disabled: {
      opacity: string;
      cursor: string;
    };
  };
}

// ============================================================
// COMPLETE DESIGN SYSTEM
// ============================================================

export interface DesignSystemConfig {
  id: string;
  projectId: string;
  name: string;
  version: number;
  
  // Token Collections
  colors: ColorToken[];
  typography: TypographyScale;
  spacing: SpacingConfig;
  borderRadius: BorderRadiusConfig;
  shadows: ShadowConfig;
  breakpoints: BreakpointConfig;
  interactions: InteractionConfig;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// DEFAULT VALUES
// ============================================================

export const DEFAULT_SPACING_SCALE: SpacingToken[] = [
  { id: 'spacing-1', name: 'xs', cssVar: '--spacing-xs', value: '0.25rem', pixels: 4, category: 'micro', isActive: true },
  { id: 'spacing-2', name: 'sm', cssVar: '--spacing-sm', value: '0.5rem', pixels: 8, category: 'micro', isActive: true },
  { id: 'spacing-3', name: 'md', cssVar: '--spacing-md', value: '1rem', pixels: 16, category: 'small', isActive: true },
  { id: 'spacing-4', name: 'lg', cssVar: '--spacing-lg', value: '1.5rem', pixels: 24, category: 'medium', isActive: true },
  { id: 'spacing-5', name: 'xl', cssVar: '--spacing-xl', value: '2rem', pixels: 32, category: 'medium', isActive: true },
  { id: 'spacing-6', name: '2xl', cssVar: '--spacing-2xl', value: '3rem', pixels: 48, category: 'large', isActive: true },
  { id: 'spacing-7', name: '3xl', cssVar: '--spacing-3xl', value: '4rem', pixels: 64, category: 'large', isActive: true },
  { id: 'spacing-8', name: '4xl', cssVar: '--spacing-4xl', value: '6rem', pixels: 96, category: 'macro', isActive: true },
  { id: 'spacing-9', name: '5xl', cssVar: '--spacing-5xl', value: '8rem', pixels: 128, category: 'macro', isActive: true },
];

export const DEFAULT_BORDER_RADIUS_SCALE: BorderRadiusToken[] = [
  { id: 'radius-1', name: 'none', cssVar: '--radius-none', value: '0px', pixels: 0, category: 'subtle', isActive: true },
  { id: 'radius-2', name: 'sm', cssVar: '--radius-sm', value: '2px', pixels: 2, category: 'subtle', isActive: true },
  { id: 'radius-3', name: 'md', cssVar: '--radius-md', value: '6px', pixels: 6, category: 'moderate', isActive: true },
  { id: 'radius-4', name: 'lg', cssVar: '--radius-lg', value: '8px', pixels: 8, category: 'moderate', isActive: true },
  { id: 'radius-5', name: 'xl', cssVar: '--radius-xl', value: '12px', pixels: 12, category: 'pronounced', isActive: true },
  { id: 'radius-6', name: '2xl', cssVar: '--radius-2xl', value: '16px', pixels: 16, category: 'pronounced', isActive: true },
  { id: 'radius-7', name: '3xl', cssVar: '--radius-3xl', value: '24px', pixels: 24, category: 'pronounced', isActive: true },
  { id: 'radius-8', name: 'full', cssVar: '--radius-full', value: '9999px', pixels: 9999, category: 'pill', isActive: true },
];

export const DEFAULT_SHADOW_SCALE: ShadowToken[] = [
  { id: 'shadow-1', name: 'none', cssVar: '--shadow-none', value: 'none', category: 'elevation', isActive: true },
  { id: 'shadow-2', name: 'sm', cssVar: '--shadow-sm', value: '0 1px 2px 0 rgb(0 0 0 / 0.05)', category: 'elevation', description: 'Subtle elevation', isActive: true },
  { id: 'shadow-3', name: 'md', cssVar: '--shadow-md', value: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', category: 'elevation', description: 'Medium elevation', isActive: true },
  { id: 'shadow-4', name: 'lg', cssVar: '--shadow-lg', value: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', category: 'elevation', description: 'Strong elevation', isActive: true },
  { id: 'shadow-5', name: 'xl', cssVar: '--shadow-xl', value: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', category: 'elevation', description: 'Extra strong elevation', isActive: true },
  { id: 'shadow-6', name: '2xl', cssVar: '--shadow-2xl', value: '0 25px 50px -12px rgb(0 0 0 / 0.25)', category: 'elevation', description: 'Maximum elevation', isActive: true },
  { id: 'shadow-7', name: 'inner', cssVar: '--shadow-inner', value: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)', category: 'inset', description: 'Inset shadow', isActive: true },
];

export const DEFAULT_FONT_FAMILIES: FontFamilyToken[] = [
  { id: 'font-1', name: 'Heading', cssVar: '--font-heading', value: '"Inter", system-ui, sans-serif', category: 'heading', isActive: true },
  { id: 'font-2', name: 'Body', cssVar: '--font-body', value: '"Inter", system-ui, sans-serif', category: 'body', isActive: true },
  { id: 'font-3', name: 'Mono', cssVar: '--font-mono', value: '"Inconsolata", monospace', category: 'mono', isActive: true },
];

export const DEFAULT_TYPOGRAPHY_STYLES: TypographyToken[] = [
  { id: 'type-1', name: 'Display', cssVar: '--type-display', fontFamily: 'var(--font-heading)', fontSize: '3.5rem', fontWeight: '700', lineHeight: '1.1', category: 'display', isActive: true },
  { id: 'type-2', name: 'H1', cssVar: '--type-h1', fontFamily: 'var(--font-heading)', fontSize: '2.25rem', fontWeight: '700', lineHeight: '1.2', category: 'heading', isActive: true },
  { id: 'type-3', name: 'H2', cssVar: '--type-h2', fontFamily: 'var(--font-heading)', fontSize: '1.875rem', fontWeight: '600', lineHeight: '1.3', category: 'heading', isActive: true },
  { id: 'type-4', name: 'H3', cssVar: '--type-h3', fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: '600', lineHeight: '1.3', category: 'heading', isActive: true },
  { id: 'type-5', name: 'H4', cssVar: '--type-h4', fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: '600', lineHeight: '1.4', category: 'heading', isActive: true },
  { id: 'type-6', name: 'Body Large', cssVar: '--type-body-lg', fontFamily: 'var(--font-body)', fontSize: '1.125rem', fontWeight: '400', lineHeight: '1.6', category: 'body', isActive: true },
  { id: 'type-7', name: 'Body', cssVar: '--type-body', fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: '400', lineHeight: '1.6', category: 'body', isActive: true },
  { id: 'type-8', name: 'Body Small', cssVar: '--type-body-sm', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: '400', lineHeight: '1.5', category: 'body', isActive: true },
  { id: 'type-9', name: 'Label', cssVar: '--type-label', fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: '500', lineHeight: '1.4', letterSpacing: '0.025em', category: 'label', isActive: true },
  { id: 'type-10', name: 'Code', cssVar: '--type-code', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: '400', lineHeight: '1.5', category: 'code', isActive: true },
];

export const DEFAULT_BREAKPOINTS: BreakpointToken[] = [
  { id: 'bp-1', name: 'desktop', label: 'Desktop', minWidth: 992, maxWidth: null, cssMediaQuery: '@media (min-width: 992px)', canvasWidth: 1440, icon: '🖥️', isActive: true },
  { id: 'bp-2', name: 'tablet', label: 'Tablet', minWidth: 768, maxWidth: 991, cssMediaQuery: '@media (max-width: 991px)', canvasWidth: 768, icon: '📱', isActive: true },
  { id: 'bp-3', name: 'mobile', label: 'Mobile', minWidth: 0, maxWidth: 767, cssMediaQuery: '@media (max-width: 767px)', canvasWidth: 390, icon: '📲', isActive: true },
];

export const DEFAULT_INTERACTION_CONFIG: InteractionConfig = {
  transitionDuration: '150ms',
  transitionEasing: 'ease-in-out',
  states: {
    hover: {
      opacity: '0.9',
      transform: 'translateY(-1px)',
    },
    active: {
      opacity: '0.8',
      transform: 'translateY(0)',
    },
    focus: {
      outline: '2px solid',
      ringColor: 'hsl(var(--ring))',
      ringWidth: '2px',
    },
    disabled: {
      opacity: '0.5',
      cursor: 'not-allowed',
    },
  },
};

// ============================================================
// FACTORY FUNCTIONS
// ============================================================

export function createDefaultDesignSystem(projectId: string): DesignSystemConfig {
  return {
    id: `ds-${Date.now()}`,
    projectId,
    name: 'Default Design System',
    version: 1,
    colors: [],
    typography: {
      fontFamilies: [...DEFAULT_FONT_FAMILIES],
      typeStyles: [...DEFAULT_TYPOGRAPHY_STYLES],
    },
    spacing: {
      baseUnit: 8,
      scale: [...DEFAULT_SPACING_SCALE],
      containerPadding: {
        desktop: '2rem',
        tablet: '1.5rem',
        mobile: '1rem',
      },
      sectionGap: '4rem',
      gridGap: '1.5rem',
    },
    borderRadius: {
      scale: [...DEFAULT_BORDER_RADIUS_SCALE],
      componentDefaults: {
        button: 'md',
        card: 'lg',
        input: 'md',
        modal: 'xl',
        badge: 'full',
      },
    },
    shadows: {
      scale: [...DEFAULT_SHADOW_SCALE],
      componentDefaults: {
        card: 'sm',
        dropdown: 'lg',
        modal: 'xl',
        button: 'sm',
      },
    },
    breakpoints: {
      breakpoints: [...DEFAULT_BREAKPOINTS],
      defaultBreakpoint: 'desktop',
    },
    interactions: { ...DEFAULT_INTERACTION_CONFIG },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================
// CSS GENERATION UTILITIES
// ============================================================

export function generateDesignSystemCSS(config: DesignSystemConfig): string {
  const lines: string[] = [];
  
  lines.push('/* ============================================');
  lines.push('   Design System Variables');
  lines.push('   Auto-generated - Do not edit directly');
  lines.push('   ============================================ */');
  lines.push('');
  lines.push(':root {');
  
  // Typography - Font Families
  lines.push('  /* Font Families */');
  config.typography.fontFamilies.filter(t => t.isActive).forEach(font => {
    lines.push(`  ${font.cssVar}: ${font.value};`);
  });
  lines.push('');
  
  // Spacing Scale
  lines.push('  /* Spacing Scale */');
  config.spacing.scale.filter(t => t.isActive).forEach(space => {
    lines.push(`  ${space.cssVar}: ${space.value};`);
  });
  lines.push('  --container-padding-desktop: ' + config.spacing.containerPadding.desktop + ';');
  lines.push('  --container-padding-tablet: ' + config.spacing.containerPadding.tablet + ';');
  lines.push('  --container-padding-mobile: ' + config.spacing.containerPadding.mobile + ';');
  lines.push('  --section-gap: ' + config.spacing.sectionGap + ';');
  lines.push('  --grid-gap: ' + config.spacing.gridGap + ';');
  lines.push('');
  
  // Border Radius Scale
  lines.push('  /* Border Radius Scale */');
  config.borderRadius.scale.filter(t => t.isActive).forEach(radius => {
    lines.push(`  ${radius.cssVar}: ${radius.value};`);
  });
  lines.push('');
  
  // Shadow Scale
  lines.push('  /* Shadow Scale */');
  config.shadows.scale.filter(t => t.isActive).forEach(shadow => {
    lines.push(`  ${shadow.cssVar}: ${shadow.value};`);
  });
  lines.push('');
  
  // Interaction States
  lines.push('  /* Interaction States */');
  lines.push(`  --transition-duration: ${config.interactions.transitionDuration};`);
  lines.push(`  --transition-easing: ${config.interactions.transitionEasing};`);
  lines.push('');
  
  // Breakpoints
  lines.push('  /* Breakpoints */');
  config.breakpoints.breakpoints.filter(bp => bp.isActive).forEach(bp => {
    if (bp.maxWidth !== null) {
      lines.push(`  --breakpoint-${bp.name}: ${bp.maxWidth}px;`);
    }
  });
  
  lines.push('}');
  lines.push('');
  
  // Typography Classes
  lines.push('/* Typography Classes */');
  config.typography.typeStyles.filter(t => t.isActive).forEach(style => {
    const className = `.type-${style.name.toLowerCase().replace(/\s+/g, '-')}`;
    lines.push(`${className} {`);
    lines.push(`  font-family: ${style.fontFamily};`);
    lines.push(`  font-size: ${style.fontSize};`);
    lines.push(`  font-weight: ${style.fontWeight};`);
    lines.push(`  line-height: ${style.lineHeight};`);
    if (style.letterSpacing) {
      lines.push(`  letter-spacing: ${style.letterSpacing};`);
    }
    if (style.textTransform) {
      lines.push(`  text-transform: ${style.textTransform};`);
    }
    lines.push('}');
    lines.push('');
  });
  
  // Interaction State Classes
  lines.push('/* Interaction States */');
  lines.push('.interactive {');
  lines.push('  transition: all var(--transition-duration) var(--transition-easing);');
  lines.push('}');
  lines.push('');
  lines.push('.interactive:hover {');
  if (config.interactions.states.hover.opacity) {
    lines.push(`  opacity: ${config.interactions.states.hover.opacity};`);
  }
  if (config.interactions.states.hover.transform) {
    lines.push(`  transform: ${config.interactions.states.hover.transform};`);
  }
  lines.push('}');
  lines.push('');
  lines.push('.interactive:active {');
  if (config.interactions.states.active.opacity) {
    lines.push(`  opacity: ${config.interactions.states.active.opacity};`);
  }
  if (config.interactions.states.active.transform) {
    lines.push(`  transform: ${config.interactions.states.active.transform};`);
  }
  lines.push('}');
  lines.push('');
  lines.push('.interactive:disabled, .interactive[disabled] {');
  lines.push(`  opacity: ${config.interactions.states.disabled.opacity};`);
  lines.push(`  cursor: ${config.interactions.states.disabled.cursor};`);
  lines.push('  pointer-events: none;');
  lines.push('}');
  
  return lines.join('\n');
}
