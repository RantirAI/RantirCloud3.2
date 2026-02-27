/**
 * Design Token Resolver
 * Resolves style values against all design system tokens (colors, typography, spacing, radius, shadows)
 * for real-time canvas updates when tokens change.
 */

import { ActiveToken } from '@/stores/designTokenStore';

/**
 * Token reference value - stores a link to a design token
 */
export interface TokenRefValue {
  tokenRef: string; // Token name e.g., 'primary', 'button-radius', 'font-heading'
  value: string; // Cached resolved value for performance
}

/**
 * Check if a value is a TokenRefValue
 */
export function isTokenRefValue(value: unknown): value is TokenRefValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'tokenRef' in value &&
    typeof (value as any).tokenRef === 'string'
  );
}

/**
 * Extract raw value from string or TokenRefValue
 */
export function extractValue(value: string | TokenRefValue | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (isTokenRefValue(value)) return value.value;
  return '';
}

/**
 * Normalize values for comparison (handles colors, px values, etc.)
 */
export function normalizeValue(value: string): string {
  if (!value) return '';
  const normalized = value.trim().toLowerCase();

  // Convert 3-digit hex to 6-digit
  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    return `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`;
  }

  // Normalize px values (remove spaces)
  if (normalized.includes('px')) {
    return normalized.replace(/\s+/g, '');
  }

  return normalized;
}

const SANS_FALLBACK =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const MONO_FALLBACK =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

function normalizeFontTokenValue(tokenRef: string, rawValue: string): string {
  const trimmed = String(rawValue || '').trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('var(')) return trimmed;

  // If user already provided a full stack, keep it as-is.
  if (trimmed.includes(',')) return trimmed;

  const fontName = trimmed.replace(/["']/g, '');
  const primary = fontName.includes(' ') ? `"${fontName}"` : fontName;
  const fallback = tokenRef === 'font-mono' ? MONO_FALLBACK : SANS_FALLBACK;
  return `${primary}, ${fallback}`;
}

/**
 * Token categories and their CSS properties mapping
 */
const TOKEN_PROPERTY_MAPPING: Record<
  string,
  { properties: string[]; category: string }
> = {
  // Colors
  primary: {
    properties: ['backgroundColor', 'color', 'borderColor', 'fill'],
    category: 'color',
  },
  'primary-foreground': { properties: ['color'], category: 'color' },
  secondary: {
    properties: ['backgroundColor', 'color', 'borderColor', 'fill'],
    category: 'color',
  },
  'secondary-foreground': { properties: ['color'], category: 'color' },
  accent: { properties: ['backgroundColor', 'color', 'fill'], category: 'color' },
  'accent-foreground': { properties: ['color'], category: 'color' },
  background: { properties: ['backgroundColor'], category: 'color' },
  surface: { properties: ['backgroundColor'], category: 'color' },
  foreground: { properties: ['color'], category: 'color' },
  muted: { properties: ['backgroundColor', 'color'], category: 'color' },
  'muted-foreground': { properties: ['color'], category: 'color' },
  destructive: {
    properties: ['backgroundColor', 'color', 'borderColor'],
    category: 'color',
  },
  'destructive-foreground': { properties: ['color'], category: 'color' },
  border: { properties: ['borderColor', 'stroke'], category: 'color' },
  ring: { properties: ['outlineColor'], category: 'color' },

  // Typography
  'font-heading': { properties: ['fontFamily'], category: 'font' },
  'font-body': { properties: ['fontFamily'], category: 'font' },
  'font-mono': { properties: ['fontFamily'], category: 'font' },
  'font-size-base': { properties: ['fontSize'], category: 'font' },
  
  // Heading size tokens (DS-driven defaults per heading level)
  'heading-1-size': { properties: ['fontSize'], category: 'font' },
  'heading-2-size': { properties: ['fontSize'], category: 'font' },
  'heading-3-size': { properties: ['fontSize'], category: 'font' },
  'heading-4-size': { properties: ['fontSize'], category: 'font' },
  'heading-5-size': { properties: ['fontSize'], category: 'font' },
  'heading-6-size': { properties: ['fontSize'], category: 'font' },

  // Root body tokens
  'body-line-height': { properties: ['lineHeight'], category: 'font' },
  'body-color': { properties: ['color'], category: 'color' },
  'page-background': { properties: ['backgroundColor'], category: 'color' },

  // Spacing
  'section-gap': { properties: ['gap', 'rowGap', 'columnGap'], category: 'spacing' },
  'container-padding': {
    properties: ['padding', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'],
    category: 'spacing',
  },
  'input-height': { properties: ['height', 'minHeight'], category: 'spacing' },
  'input-padding': { properties: ['padding', 'paddingLeft', 'paddingRight'], category: 'spacing' },
  'form-gap': { properties: ['gap', 'rowGap'], category: 'spacing' },
  'modal-padding': { properties: ['padding'], category: 'spacing' },
  'button-padding-x': { properties: ['paddingLeft', 'paddingRight'], category: 'spacing' },
  'button-padding-y': { properties: ['paddingTop', 'paddingBottom'], category: 'spacing' },

  // Button tokens
  'button-bg': { properties: ['backgroundColor'], category: 'color' },
  'button-color': { properties: ['color'], category: 'color' },
  'button-font': { properties: ['fontFamily'], category: 'font' },

  // Border/Effects
  'button-radius': { properties: ['borderRadius'], category: 'border' },
  'card-radius': { properties: ['borderRadius'], category: 'border' },
  'input-radius': { properties: ['borderRadius'], category: 'border' },
  'shadow-sm': { properties: ['boxShadow'], category: 'border' },
  'shadow-md': { properties: ['boxShadow'], category: 'border' },
  'shadow-lg': { properties: ['boxShadow'], category: 'border' },
  'shadow-xl': { properties: ['boxShadow'], category: 'border' },
};

/**
 * All CSS properties that can be token-controlled
 */
const ALL_TOKEN_PROPERTIES = new Set<string>();
Object.values(TOKEN_PROPERTY_MAPPING).forEach(({ properties }) => {
  properties.forEach((prop) => ALL_TOKEN_PROPERTIES.add(prop));
});

/**
 * Find matching token for a property value
 */
export function findMatchingToken(
  propertyName: string,
  value: string,
  activeTokens: Map<string, ActiveToken>
): { tokenRef: string; value: string } | null {
  if (!value || !activeTokens || activeTokens.size === 0) return null;
  if (!ALL_TOKEN_PROPERTIES.has(propertyName)) return null;

  const normalizedValue = normalizeValue(value);

  for (const [tokenName, token] of activeTokens.entries()) {
    const mapping = TOKEN_PROPERTY_MAPPING[tokenName];
    if (!mapping) continue;

    // Check if this token applies to this property
    if (!mapping.properties.includes(propertyName)) continue;

    // Check if values match
    if (normalizeValue(token.value) === normalizedValue) {
      return { tokenRef: tokenName, value: token.value };
    }
  }

  return null;
}

/**
 * Resolve a token reference to its current value
 */
export function resolveTokenRef(
  tokenRef: string,
  activeTokens: Map<string, ActiveToken>,
  fallback: string = ''
): string {
  const token = activeTokens.get(tokenRef);
  if (!token) return fallback;

  // Typography tokens should resolve to usable CSS values.
  if (tokenRef === 'font-heading' || tokenRef === 'font-body' || tokenRef === 'font-mono') {
    return normalizeFontTokenValue(tokenRef, token.value);
  }

  return token.value;
}

/**
 * Get typography token for a component type
 * Maps component types to the appropriate font token
 */
export function getTypographyTokenForComponent(
  componentType: string,
  elementTag?: string
): 'font-heading' | 'font-body' | 'font-mono' | null {
  // Heading elements use heading font
  if (componentType === 'heading') return 'font-heading';
  if (elementTag && /^h[1-6]$/.test(elementTag)) return 'font-heading';

  // Code elements use mono font
  if (componentType === 'code' || componentType === 'codeblock') return 'font-mono';
  if (elementTag === 'code' || elementTag === 'pre') return 'font-mono';

  // Text and other elements use body font
  if (componentType === 'text' || componentType === 'paragraph') return 'font-body';
  if (elementTag === 'p' || elementTag === 'span' || elementTag === 'div') return 'font-body';

  // Buttons use body font
  if (componentType === 'button') return 'font-body';

  return null;
}

/** Default heading sizes (used when no DS token is set) */
export const DEFAULT_HEADING_SIZES: Record<number, { fontSize: string; fontWeight: string; lineHeight: string }> = {
  1: { fontSize: '64', fontWeight: '700', lineHeight: '1.1' },
  2: { fontSize: '48', fontWeight: '700', lineHeight: '1.15' },
  3: { fontSize: '40', fontWeight: '600', lineHeight: '1.2' },
  4: { fontSize: '32', fontWeight: '600', lineHeight: '1.25' },
  5: { fontSize: '24', fontWeight: '600', lineHeight: '1.3' },
  6: { fontSize: '18', fontWeight: '600', lineHeight: '1.4' },
};

/**
 * Get the heading size token name for a heading level
 */
export function getHeadingSizeToken(level: number): string {
  return `heading-${Math.min(Math.max(level, 1), 6)}-size`;
}

/**
 * Resolve heading font size from DS token or fallback to defaults
 */
export function resolveHeadingSize(
  level: number,
  activeTokens: Map<string, ActiveToken>
): { fontSize: string; fontWeight: string; lineHeight: string; isTokenControlled: boolean } {
  const tokenName = getHeadingSizeToken(level);
  const token = activeTokens.get(tokenName);
  const defaults = DEFAULT_HEADING_SIZES[level] || DEFAULT_HEADING_SIZES[1];
  
  if (token?.value) {
    const val = token.value.trim().replace(/px$/i, '');
    return {
      fontSize: val,
      fontWeight: defaults.fontWeight,
      lineHeight: defaults.lineHeight,
      isTokenControlled: true,
    };
  }
  
  return { ...defaults, isTokenControlled: false };
}

/** Default body typography values */
export const DEFAULT_BODY_TYPOGRAPHY = {
  fontSize: '16',
  fontWeight: '400',
  lineHeight: '1.5',
  color: '#000000',
};

/**
 * Resolve body typography defaults from DS tokens
 */
export function resolveBodyDefaults(
  activeTokens: Map<string, ActiveToken>
): { fontSize: string; lineHeight: string; color: string; isTokenControlled: boolean } {
  const sizeToken = activeTokens.get('font-size-base');
  const lhToken = activeTokens.get('body-line-height');
  const colorToken = activeTokens.get('body-color');
  
  const hasAnyToken = !!(sizeToken?.value || lhToken?.value || colorToken?.value);
  
  return {
    fontSize: sizeToken?.value?.replace(/px$/i, '') || DEFAULT_BODY_TYPOGRAPHY.fontSize,
    lineHeight: lhToken?.value || DEFAULT_BODY_TYPOGRAPHY.lineHeight,
    color: colorToken?.value || DEFAULT_BODY_TYPOGRAPHY.color,
    isTokenControlled: hasAnyToken,
  };
}

/** Default button styling values */
export const DEFAULT_BUTTON_STYLES = {
  backgroundColor: '#2563eb', // primary blue
  color: '#ffffff',
  paddingLeft: '12',
  paddingRight: '12',
  paddingTop: '8',
  paddingBottom: '8',
  borderRadius: '0',
};

/**
 * Resolve button defaults from DS tokens
 */
export function resolveButtonDefaults(
  activeTokens: Map<string, ActiveToken>
): {
  backgroundColor: string;
  color: string;
  paddingX: string;
  paddingY: string;
  borderRadius: string;
  fontFamily?: string;
  isTokenControlled: boolean;
} {
  const bgToken = activeTokens.get('button-bg');
  const colorToken = activeTokens.get('button-color');
  const pxToken = activeTokens.get('button-padding-x');
  const pyToken = activeTokens.get('button-padding-y');
  const radiusToken = activeTokens.get('button-radius');
  const fontToken = activeTokens.get('button-font');
  
  const hasAnyToken = !!(bgToken?.value || colorToken?.value || pxToken?.value || pyToken?.value || radiusToken?.value || fontToken?.value);
  
  return {
    backgroundColor: bgToken?.value || DEFAULT_BUTTON_STYLES.backgroundColor,
    color: colorToken?.value || DEFAULT_BUTTON_STYLES.color,
    paddingX: pxToken?.value?.replace(/px$/i, '') || DEFAULT_BUTTON_STYLES.paddingLeft,
    paddingY: pyToken?.value?.replace(/px$/i, '') || DEFAULT_BUTTON_STYLES.paddingTop,
    borderRadius: radiusToken?.value?.replace(/px$/i, '') || DEFAULT_BUTTON_STYLES.borderRadius,
    fontFamily: fontToken?.value,
    isTokenControlled: hasAnyToken,
  };
}

/**
 * Resolve default font family from design tokens for a component
 */
export function resolveDefaultFontFamily(
  componentType: string,
  activeTokens: Map<string, ActiveToken>,
  elementTag?: string
): string | undefined {
  const tokenName = getTypographyTokenForComponent(componentType, elementTag);
  if (!tokenName) return undefined;

  const resolved = resolveTokenRef(tokenName, activeTokens);
  return resolved || undefined;
}

/**
 * Resolve default font size from design tokens (base size)
 */
export function resolveDefaultFontSize(activeTokens: Map<string, ActiveToken>): string | undefined {
  const token = activeTokens.get('font-size-base');
  return token?.value;
}

/**
 * Get the border-radius token name for a component type
 */
export function getBorderRadiusTokenForComponent(
  componentType: string
): 'button-radius' | 'card-radius' | 'input-radius' | null {
  if (componentType === 'button') return 'button-radius';
  if (componentType === 'section' || componentType === 'container' || componentType === 'div') return 'card-radius';
  if (componentType === 'input' || componentType === 'textarea' || componentType === 'select') return 'input-radius';
  return null;
}

/**
 * Resolve default border radius from design tokens for a component
 */
export function resolveDefaultBorderRadius(
  componentType: string,
  activeTokens: Map<string, ActiveToken>
): string | undefined {
  const tokenName = getBorderRadiusTokenForComponent(componentType);
  if (!tokenName) return undefined;

  const token = activeTokens.get(tokenName);
  if (!token?.value) return undefined;

  // Ensure value has px unit
  const val = token.value.trim();
  if (/^\d+$/.test(val)) return `${val}px`;
  return val;
}

/**
 * Resolve a spacing/sizing token value, ensuring px unit
 */
function resolveSpacingToken(
  tokenName: string,
  activeTokens: Map<string, ActiveToken>
): string | undefined {
  const token = activeTokens.get(tokenName);
  if (!token?.value) return undefined;
  const val = token.value.trim();
  if (/^\d+$/.test(val)) return `${val}px`;
  return val;
}

/**
 * Resolve default input height from the 'input-height' design token
 */
export function resolveDefaultInputHeight(
  activeTokens: Map<string, ActiveToken>
): string | undefined {
  return resolveSpacingToken('input-height', activeTokens);
}

/**
 * Resolve default input horizontal padding from the 'input-padding' design token
 */
export function resolveDefaultInputPadding(
  activeTokens: Map<string, ActiveToken>
): string | undefined {
  return resolveSpacingToken('input-padding', activeTokens);
}

/**
 * Resolve default form gap from the 'form-gap' design token
 */
export function resolveDefaultFormGap(
  activeTokens: Map<string, ActiveToken>
): string | undefined {
  return resolveSpacingToken('form-gap', activeTokens);
}

/**
 * Resolve default modal/card padding from the 'modal-padding' design token
 */
export function resolveDefaultModalPadding(
  activeTokens: Map<string, ActiveToken>
): string | undefined {
  return resolveSpacingToken('modal-padding', activeTokens);
}

/**
 * Resolve all token-controlled properties in a styles object
 * This is the main function used by useResolvedCSSStyles
 */
export function resolveStylesAgainstTokens(
  styles: Record<string, any>,
  activeTokens: Map<string, ActiveToken>
): Record<string, any> {
  if (!activeTokens || activeTokens.size === 0) return styles;

  const result = { ...styles };

  // First, handle direct CSS properties (backgroundColor, borderColor, etc.)
  for (const prop of ALL_TOKEN_PROPERTIES) {
    const currentValue = result[prop];
    if (!currentValue) continue;

    // Case 1: Direct TokenRefValue - resolve to current token value
    if (isTokenRefValue(currentValue)) {
      const resolved = resolveTokenRef(currentValue.tokenRef, activeTokens, currentValue.value);
      result[prop] = resolved;
      continue;
    }

    // Case 2: Object with value property (ColorAdvancedPicker format)
    if (typeof currentValue === 'object' && currentValue.value !== undefined) {
      const innerValue = currentValue.value;

      // Check if inner value is a TokenRefValue
      if (isTokenRefValue(innerValue)) {
        const resolved = resolveTokenRef(innerValue.tokenRef, activeTokens, innerValue.value);
        result[prop] = { ...currentValue, value: resolved };
        continue;
      }

      // Check if inner string matches a token
      if (typeof innerValue === 'string') {
        const match = findMatchingToken(prop, innerValue, activeTokens);
        if (match) {
          result[prop] = { ...currentValue, value: match.value };
        }
      }
      continue;
    }

    // Case 3: Plain string - check if it matches any token
    if (typeof currentValue === 'string') {
      const match = findMatchingToken(prop, currentValue, activeTokens);
      if (match) {
        result[prop] = match.value;
      }
    }
  }

  // Handle nested border object: { color: TokenRefValue | string, width, style, ... }
  if (result.border && typeof result.border === 'object') {
    const borderColor = result.border.color;
    if (borderColor) {
      if (isTokenRefValue(borderColor)) {
        const resolved = resolveTokenRef(borderColor.tokenRef, activeTokens, borderColor.value);
        result.border = { ...result.border, color: resolved };
      } else if (typeof borderColor === 'string') {
        const match = findMatchingToken('borderColor', borderColor, activeTokens);
        if (match) {
          result.border = { ...result.border, color: match.value };
        }
      }
    }
  }

  return result;
}

/**
 * Create a TokenRefValue for storing in component props
 */
export function createTokenRef(tokenRef: string, value: string): TokenRefValue {
  return { tokenRef, value };
}

/**
 * Get all possible tokens for a CSS property
 */
export function getTokensForProperty(propertyName: string): string[] {
  const tokens: string[] = [];

  for (const [tokenName, mapping] of Object.entries(TOKEN_PROPERTY_MAPPING)) {
    if (mapping.properties.includes(propertyName)) {
      tokens.push(tokenName);
    }
  }

  return tokens;
}

/**
 * Check if a property can be controlled by design tokens
 */
export function isTokenControllableProperty(propertyName: string): boolean {
  return ALL_TOKEN_PROPERTIES.has(propertyName);
}

