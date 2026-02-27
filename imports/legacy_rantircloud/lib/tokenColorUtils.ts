/**
 * Token Color Utilities
 * Handles color values that can be linked to design system tokens
 * for real-time updates when tokens change
 */

import { useDesignTokenStore } from '@/stores/designTokenStore';

/**
 * Color value that can be linked to a design token
 */
export interface TokenColorValue {
  tokenRef: string;  // e.g., 'primary', 'secondary', 'accent'
  value: string;     // Current resolved hex value (cached for performance)
}

/**
 * Check if a value is a TokenColorValue
 */
export function isTokenColorValue(value: unknown): value is TokenColorValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'tokenRef' in value &&
    typeof (value as any).tokenRef === 'string'
  );
}

/**
 * Extract the raw color string from a value that could be string or TokenColorValue
 */
export function extractColorValue(value: string | TokenColorValue | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (isTokenColorValue(value)) return value.value;
  return '';
}

/**
 * Resolve a color value against current design tokens
 * If the value has a tokenRef, returns the current token value
 * Otherwise returns the raw color value
 */
export function resolveTokenColor(
  value: string | TokenColorValue | undefined,
  activeTokens: Map<string, { name: string; value: string; category: string }>
): string {
  if (!value) return '';
  
  // If it's a token reference, resolve to current token value
  if (isTokenColorValue(value)) {
    const token = activeTokens.get(value.tokenRef);
    if (token) {
      return token.value;
    }
    // Fallback to cached value if token not found
    return value.value;
  }
  
  // Raw string value
  return value;
}

/**
 * Create a handler that accepts string | TokenColorValue and calls the appropriate callback
 */
export function createColorChangeHandler(
  onChange: (color: string) => void,
  onTokenChange?: (tokenRef: string, value: string) => void
) {
  return (colorOrToken: string | TokenColorValue) => {
    if (isTokenColorValue(colorOrToken)) {
      if (onTokenChange) {
        onTokenChange(colorOrToken.tokenRef, colorOrToken.value);
      } else {
        // If no token handler, just use the value but we lose the linkage
        onChange(colorOrToken.value);
      }
    } else {
      onChange(colorOrToken);
    }
  };
}

/**
 * Normalize color value for comparison (lowercase, expand 3-digit hex)
 */
export function normalizeColor(value: string): string {
  if (!value) return '';
  const normalized = value.trim().toLowerCase();
  // Convert 3-digit hex to 6-digit
  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    return `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`;
  }
  return normalized;
}

/**
 * Check if a color value matches a token by value
 */
export function findMatchingToken(
  colorValue: string,
  activeTokens: Map<string, { name: string; value: string; category: string }>
): { tokenRef: string; value: string } | null {
  if (!colorValue || !activeTokens || activeTokens.size === 0) return null;
  
  const normalizedColor = normalizeColor(colorValue);
  
  for (const [tokenName, token] of activeTokens.entries()) {
    if (token.category === 'color' && normalizeColor(token.value) === normalizedColor) {
      return { tokenRef: tokenName, value: token.value };
    }
  }
  
  return null;
}
