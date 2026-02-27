/**
 * Design Token Store
 * Manages project-level design tokens (colors, typography, spacing, etc.)
 * Tokens set defaults for newly created components
 */

import { create } from 'zustand';
import { designTokenService, DesignToken } from '@/services/designTokenService';

// Map token names to CSS properties they can control
export const TOKEN_PROPERTY_MAP: Record<string, string[]> = {
  // Color tokens
  'primary': ['backgroundColor', 'color', 'borderColor', 'fill'],
  'primary-foreground': ['color'],
  'secondary': ['backgroundColor', 'color', 'borderColor', 'fill'],
  'secondary-foreground': ['color'],
  'accent': ['backgroundColor', 'color', 'fill'],
  'accent-foreground': ['color'],
  'background': ['backgroundColor'],
  'foreground': ['color'],
  'surface': ['backgroundColor'],
  'muted': ['backgroundColor', 'color'],
  'muted-foreground': ['color'],
  'destructive': ['backgroundColor', 'color', 'borderColor'],
  'destructive-foreground': ['color'],
  'border': ['borderColor', 'stroke'],
  'ring': ['outlineColor'],
  
  // Typography tokens
  'font-heading': ['fontFamily'],
  'font-body': ['fontFamily'],
  'font-mono': ['fontFamily'],
  
  // Heading size tokens
  'heading-1-size': ['fontSize'],
  'heading-2-size': ['fontSize'],
  'heading-3-size': ['fontSize'],
  'heading-4-size': ['fontSize'],
  'heading-5-size': ['fontSize'],
  'heading-6-size': ['fontSize'],
  
  // Root body tokens
  'font-size-base': ['fontSize'],
  'body-line-height': ['lineHeight'],
  'body-color': ['color'],
  'page-background': ['backgroundColor'],
  
  // Spacing tokens
  'section-gap': ['gap', 'marginBottom'],
  'container-padding': ['padding', 'paddingLeft', 'paddingRight'],
  
  // Button tokens
  'button-bg': ['backgroundColor'],
  'button-color': ['color'],
  'button-font': ['fontFamily'],
  'button-padding-y': ['paddingTop', 'paddingBottom'],
  
  // Border tokens
  'button-radius': ['borderRadius'],
  'card-radius': ['borderRadius'],
  'input-radius': ['borderRadius'],
  
  // Shadow tokens
  'shadow-sm': ['boxShadow'],
  'shadow-md': ['boxShadow'],
  'shadow-lg': ['boxShadow'],
};

// Reverse map: CSS property -> possible token names
export const PROPERTY_TOKEN_MAP: Record<string, string[]> = {};
Object.entries(TOKEN_PROPERTY_MAP).forEach(([tokenName, properties]) => {
  properties.forEach(prop => {
    if (!PROPERTY_TOKEN_MAP[prop]) {
      PROPERTY_TOKEN_MAP[prop] = [];
    }
    PROPERTY_TOKEN_MAP[prop].push(tokenName);
  });
});

export interface ActiveToken {
  name: string;
  value: string;
  category: string;
  description?: string;
}

interface DesignTokenStore {
  // Active tokens for current project
  activeTokens: Map<string, ActiveToken>;
  
  // Loading state
  isLoading: boolean;
  
  // Current project ID
  currentProjectId: string | null;
  
  // Actions
  loadProjectTokens: (projectId: string) => Promise<void>;
  getTokenByName: (tokenName: string) => ActiveToken | undefined;
  getTokenForProperty: (propertyName: string, currentValue?: string) => { tokenName: string; value: string } | null;
  isPropertyTokenControlled: (propertyName: string, currentValue?: string) => boolean;
  getTokenIndicator: (propertyName: string, currentValue?: string) => { isTokenControlled: boolean; tokenName?: string; tokenValue?: string };
  updateToken: (tokenName: string, value: string) => Promise<void>;
  addToken: (token: Omit<DesignToken, 'id' | 'appProjectId' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  clearTokens: () => void;
  
  // Token utility functions
  getAllTokensByCategory: (category: string) => ActiveToken[];
  getColorTokens: () => ActiveToken[];
  getTypographyTokens: () => ActiveToken[];
  getBorderTokens: () => ActiveToken[];
  getSpacingTokens: () => ActiveToken[];
}

export const useDesignTokenStore = create<DesignTokenStore>((set, get) => ({
  activeTokens: new Map(),
  isLoading: false,
  currentProjectId: null,

  loadProjectTokens: async (projectId: string) => {
    set({ isLoading: true, currentProjectId: projectId });
    
    try {
      const tokens = await designTokenService.loadDesignTokens(projectId);
      const tokenMap = new Map<string, ActiveToken>();
      
      tokens.forEach(token => {
        if (token.isActive) {
          tokenMap.set(token.name, {
            name: token.name,
            value: token.value,
            category: token.category,
            description: token.description,
          });
        }
      });
      
      set({ activeTokens: tokenMap, isLoading: false });
    } catch (error) {
      console.error('Failed to load design tokens:', error);
      set({ isLoading: false });
    }
  },

  getTokenByName: (tokenName: string) => {
    return get().activeTokens.get(tokenName);
  },

  getTokenForProperty: (propertyName: string, currentValue?: string) => {
    const { activeTokens } = get();
    const possibleTokens = PROPERTY_TOKEN_MAP[propertyName];
    
    if (!possibleTokens || possibleTokens.length === 0) {
      return null;
    }
    
    // Check if current value matches any token value
    for (const tokenName of possibleTokens) {
      const token = activeTokens.get(tokenName);
      if (token) {
        // If current value matches token value, it's token-controlled
        if (currentValue && normalizeColorValue(currentValue) === normalizeColorValue(token.value)) {
          return { tokenName: token.name, value: token.value };
        }
      }
    }
    
    return null;
  },

  isPropertyTokenControlled: (propertyName: string, currentValue?: string) => {
    const result = get().getTokenForProperty(propertyName, currentValue);
    return result !== null;
  },

  getTokenIndicator: (propertyName: string, currentValue?: string) => {
    const result = get().getTokenForProperty(propertyName, currentValue);
    
    if (result) {
      return {
        isTokenControlled: true,
        tokenName: result.tokenName,
        tokenValue: result.value,
      };
    }
    
    return { isTokenControlled: false };
  },

  updateToken: async (tokenName: string, value: string) => {
    const { activeTokens, currentProjectId } = get();
    const existingToken = activeTokens.get(tokenName);
    
    if (!currentProjectId) return;
    
    try {
      const tokens = await designTokenService.loadDesignTokens(currentProjectId);
      const dbToken = tokens.find(t => t.name === tokenName);
      
      if (dbToken) {
        // Update existing token
        await designTokenService.updateDesignToken(dbToken.id, { value });
        
        const newTokens = new Map(activeTokens);
        if (existingToken) {
          newTokens.set(tokenName, { ...existingToken, value });
        } else {
          newTokens.set(tokenName, { name: tokenName, value, category: dbToken.category });
        }
        set({ activeTokens: newTokens });
      } else {
        // Token doesn't exist - create it
        const category = getTokenCategory(tokenName);
        const newToken = await designTokenService.saveDesignToken(currentProjectId, {
          name: tokenName,
          value,
          category,
          isActive: true,
        });
        
        const newTokens = new Map(activeTokens);
        newTokens.set(tokenName, { name: tokenName, value, category });
        set({ activeTokens: newTokens });
      }
    } catch (error) {
      console.error('Failed to update token:', error);
    }
  },

  addToken: async (token) => {
    const { currentProjectId } = get();
    if (!currentProjectId) return;
    
    try {
      const newToken = await designTokenService.saveDesignToken(currentProjectId, token);
      
      // Update local state
      const { activeTokens } = get();
      const newTokens = new Map(activeTokens);
      newTokens.set(newToken.name, {
        name: newToken.name,
        value: newToken.value,
        category: newToken.category,
        description: newToken.description,
      });
      set({ activeTokens: newTokens });
    } catch (error) {
      console.error('Failed to add token:', error);
    }
  },

  clearTokens: () => {
    set({ activeTokens: new Map(), currentProjectId: null });
  },

  getAllTokensByCategory: (category: string) => {
    const { activeTokens } = get();
    return Array.from(activeTokens.values()).filter(t => t.category === category);
  },

  getColorTokens: () => get().getAllTokensByCategory('color'),
  getTypographyTokens: () => get().getAllTokensByCategory('font'),
  getBorderTokens: () => get().getAllTokensByCategory('border'),
  getSpacingTokens: () => get().getAllTokensByCategory('spacing'),
}));

/**
 * Normalize color values for comparison
 * Handles hex, rgb, hsl formats
 */
function normalizeColorValue(value: string): string {
  if (!value) return '';
  
  // Trim and lowercase
  const normalized = value.trim().toLowerCase();
  
  // Convert 3-digit hex to 6-digit
  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    return `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`;
  }
  
  return normalized;
}

/**
 * Determine token category from name
 */
function getTokenCategory(tokenName: string): DesignToken['category'] {
  if (['primary', 'secondary', 'accent', 'background', 'foreground', 'surface', 'muted', 'destructive', 'border', 'ring', 'card'].some(c => tokenName.includes(c))) {
    return 'color';
  }
  if (tokenName.includes('font') || tokenName.includes('text-') || tokenName.includes('heading-') || tokenName.includes('body-')) {
    return 'font';
  }
  if (tokenName.includes('radius') || tokenName.includes('shadow')) {
    return 'border';
  }
  if (tokenName.includes('gap') || tokenName.includes('padding') || tokenName.includes('height') || tokenName.includes('spacing')) {
    return 'spacing';
  }
  return 'spacing';
}

/**
 * Get display name for a token (capitalize and format)
 */
export function getTokenDisplayName(tokenName: string): string {
  return tokenName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate shadcn-style CSS from active tokens for canvas injection
 */
export function generateThemeCSS(tokens: Map<string, ActiveToken>): string {
  const lines: string[] = [];
  
  lines.push('/* ============================================');
  lines.push('   Design System Theme - Canvas Styles');
  lines.push('   Generated by Rantir App Builder');
  lines.push('   ============================================ */');
  lines.push('');
  lines.push(':root {');
  
  // Color tokens
  const colorTokens = Array.from(tokens.values()).filter(t => t.category === 'color');
  if (colorTokens.length > 0) {
    lines.push('  /* Colors */');
    colorTokens.forEach(token => {
      lines.push(`  --${token.name}: ${token.value};`);
    });
    lines.push('');
  }
  
  // Typography tokens
  const fontTokens = Array.from(tokens.values()).filter(t => t.category === 'font');
  if (fontTokens.length > 0) {
    lines.push('  /* Typography */');
    fontTokens.forEach(token => {
      lines.push(`  --${token.name}: ${token.value};`);
    });
    lines.push('');
  }
  
  // Border/Effects tokens
  const borderTokens = Array.from(tokens.values()).filter(t => t.category === 'border');
  if (borderTokens.length > 0) {
    lines.push('  /* Effects */');
    borderTokens.forEach(token => {
      lines.push(`  --${token.name}: ${token.value};`);
    });
    lines.push('');
  }
  
  // Spacing tokens
  const spacingTokens = Array.from(tokens.values()).filter(t => t.category === 'spacing');
  if (spacingTokens.length > 0) {
    lines.push('  /* Spacing & Sizing */');
    spacingTokens.forEach(token => {
      lines.push(`  --${token.name}: ${token.value};`);
    });
  }
  
  lines.push('}');
  lines.push('');
  
  // Generate utility classes
  lines.push('/* Theme Utility Classes */');
  lines.push('.theme-button {');
  lines.push('  background-color: hsl(var(--primary));');
  lines.push('  color: hsl(var(--primary-foreground));');
  lines.push('  border-radius: var(--button-radius, 6px);');
  lines.push('  padding: var(--input-padding, 12px) calc(var(--input-padding, 12px) * 1.5);');
  lines.push('  font-family: var(--font-body, inherit);');
  lines.push('}');
  lines.push('');
  lines.push('.theme-card {');
  lines.push('  background-color: hsl(var(--card, var(--background)));');
  lines.push('  border-radius: var(--card-radius, 8px);');
  lines.push('  box-shadow: var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1));');
  lines.push('  padding: var(--modal-padding, 16px);');
  lines.push('}');
  lines.push('');
  lines.push('.theme-input {');
  lines.push('  height: var(--input-height, 34px);');
  lines.push('  padding: 0 var(--input-padding, 12px);');
  lines.push('  border-radius: var(--input-radius, 6px);');
  lines.push('  border: 1px solid hsl(var(--border));');
  lines.push('  background-color: hsl(var(--background));');
  lines.push('}');
  lines.push('');
  lines.push('.theme-form {');
  lines.push('  display: flex;');
  lines.push('  flex-direction: column;');
  lines.push('  gap: var(--form-gap, 12px);');
  lines.push('}');
  lines.push('');
  lines.push('.theme-modal {');
  lines.push('  padding: var(--modal-padding, 16px);');
  lines.push('  background-color: hsl(var(--background));');
  lines.push('  border-radius: var(--card-radius, 8px);');
  lines.push('}');
  
  return lines.join('\n');
}
