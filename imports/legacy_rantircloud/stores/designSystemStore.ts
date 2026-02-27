/**
 * Design System Store
 * 
 * Centralized, project-level design system management.
 * - Variables cascade properly and remain override-safe
 * - Editing a variable updates all linked instances in real-time
 * - No hardcoded fallback values inside components
 */

import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import {
  ColorToken,
  DesignSystemConfig,
  SpacingToken,
  BorderRadiusToken,
  ShadowToken,
  TypographyToken,
  FontFamilyToken,
  BreakpointToken,
  InteractionConfig,
  createDefaultDesignSystem,
  generateDesignSystemCSS,
  DEFAULT_SPACING_SCALE,
  DEFAULT_BORDER_RADIUS_SCALE,
  DEFAULT_SHADOW_SCALE,
  DEFAULT_TYPOGRAPHY_STYLES,
  DEFAULT_FONT_FAMILIES,
  DEFAULT_BREAKPOINTS,
  DEFAULT_INTERACTION_CONFIG,
} from '@/types/designSystem';
import { appBuilderService } from '@/services/appBuilderService';
import { toast } from 'sonner';

// Hex to HSL converter for imported colors
function hexToHSL(hex: string): string {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Debounce timer for saving
let saveTimer: NodeJS.Timeout | null = null;
const SAVE_DEBOUNCE_MS = 500;

interface DesignSystemStore {
  // Current design system config
  config: DesignSystemConfig | null;
  
  // Loading state
  isLoading: boolean;
  
  // Current project ID
  currentProjectId: string | null;
  
  // Panel state
  isPanelOpen: boolean;
  activeCategory: string;
  
  // Generated CSS cache
  generatedCSS: string;
  
  // Actions
  loadDesignSystem: (projectId: string) => Promise<void>;
  saveDesignSystem: () => Promise<void>;
  resetToDefaults: () => void;
  
  // Panel actions
  togglePanel: () => void;
  setActiveCategory: (category: string) => void;
  
  // Spacing tokens
  updateSpacingToken: (id: string, updates: Partial<SpacingToken>) => void;
  addSpacingToken: (token: Omit<SpacingToken, 'id'>) => void;
  removeSpacingToken: (id: string) => void;
  getSpacingValue: (name: string) => string | undefined;
  
  // Border radius tokens
  updateBorderRadiusToken: (id: string, updates: Partial<BorderRadiusToken>) => void;
  addBorderRadiusToken: (token: Omit<BorderRadiusToken, 'id'>) => void;
  removeBorderRadiusToken: (id: string) => void;
  getBorderRadiusValue: (name: string) => string | undefined;
  
  // Shadow tokens
  updateShadowToken: (id: string, updates: Partial<ShadowToken>) => void;
  addShadowToken: (token: Omit<ShadowToken, 'id'>) => void;
  removeShadowToken: (id: string) => void;
  getShadowValue: (name: string) => string | undefined;
  
  // Typography tokens
  updateTypographyToken: (id: string, updates: Partial<TypographyToken>) => void;
  addTypographyToken: (token: Omit<TypographyToken, 'id'>) => void;
  removeTypographyToken: (id: string) => void;
  getTypographyStyle: (name: string) => TypographyToken | undefined;
  
  // Font family tokens
  updateFontFamily: (id: string, updates: Partial<FontFamilyToken>) => void;
  
  // Breakpoint tokens
  updateBreakpointToken: (id: string, updates: Partial<BreakpointToken>) => void;
  getBreakpointConfig: () => BreakpointToken[];
  
  // Interaction config
  updateInteractionConfig: (updates: Partial<InteractionConfig>) => void;
  getInteractionConfig: () => InteractionConfig;
  
  // Container/Section spacing
  updateContainerPadding: (breakpoint: 'desktop' | 'tablet' | 'mobile', value: string) => void;
  updateSectionGap: (value: string) => void;
  updateGridGap: (value: string) => void;
  
  // CSS Generation
  regenerateCSS: () => void;
  getGeneratedCSS: () => string;
  
  // Import CSS variables from external HTML/CSS as design tokens
  importCSSVariables: (cssVariables: Record<string, string>) => void;
  
  // Token linking utilities
  getTokenByVariable: (cssVar: string) => SpacingToken | BorderRadiusToken | ShadowToken | undefined;
  isValueTokenLinked: (value: string, category: 'spacing' | 'borderRadius' | 'shadow') => { linked: boolean; tokenName?: string };
}

export const useDesignSystemStore = create<DesignSystemStore>((set, get) => ({
  config: null,
  isLoading: false,
  currentProjectId: null,
  isPanelOpen: false,
  activeCategory: 'spacing',
  generatedCSS: '',

  loadDesignSystem: async (projectId: string) => {
    set({ isLoading: true, currentProjectId: projectId });
    
    try {
      const project = await appBuilderService.getAppProject(projectId);
      
      if (!project) {
        console.warn('[DesignSystemStore] Project not found:', projectId);
        const defaultConfig = createDefaultDesignSystem(projectId);
        set({ config: defaultConfig, isLoading: false });
        get().regenerateCSS();
        return;
      }
      
      // Load design system from project settings
      const storedConfig = project.settings?.designSystem as DesignSystemConfig | undefined;
      
      if (storedConfig) {
        // Merge with defaults to ensure all properties exist
        const mergedConfig: DesignSystemConfig = {
          ...createDefaultDesignSystem(projectId),
          ...storedConfig,
          typography: {
            fontFamilies: storedConfig.typography?.fontFamilies || [...DEFAULT_FONT_FAMILIES],
            typeStyles: storedConfig.typography?.typeStyles || [...DEFAULT_TYPOGRAPHY_STYLES],
          },
          spacing: {
            baseUnit: storedConfig.spacing?.baseUnit || 8,
            scale: storedConfig.spacing?.scale || [...DEFAULT_SPACING_SCALE],
            containerPadding: storedConfig.spacing?.containerPadding || { desktop: '2rem', tablet: '1.5rem', mobile: '1rem' },
            sectionGap: storedConfig.spacing?.sectionGap || '4rem',
            gridGap: storedConfig.spacing?.gridGap || '1.5rem',
          },
          borderRadius: {
            scale: storedConfig.borderRadius?.scale || [...DEFAULT_BORDER_RADIUS_SCALE],
            componentDefaults: storedConfig.borderRadius?.componentDefaults || { button: 'md', card: 'lg', input: 'md', modal: 'xl', badge: 'full' },
          },
          shadows: {
            scale: storedConfig.shadows?.scale || [...DEFAULT_SHADOW_SCALE],
            componentDefaults: storedConfig.shadows?.componentDefaults || { card: 'sm', dropdown: 'lg', modal: 'xl', button: 'sm' },
          },
          breakpoints: {
            breakpoints: storedConfig.breakpoints?.breakpoints || [...DEFAULT_BREAKPOINTS],
            defaultBreakpoint: storedConfig.breakpoints?.defaultBreakpoint || 'desktop',
          },
          interactions: storedConfig.interactions || { ...DEFAULT_INTERACTION_CONFIG },
        };
        
        set({ config: mergedConfig, isLoading: false });
        get().regenerateCSS();
      } else {
        // Create default design system
        const defaultConfig = createDefaultDesignSystem(projectId);
        set({ config: defaultConfig, isLoading: false });
        get().regenerateCSS();
        
        // Save default config to project
        get().saveDesignSystem();
      }
      
      console.log('[DesignSystemStore] Loaded design system for project:', projectId);
    } catch (error) {
      console.error('[DesignSystemStore] Failed to load design system:', error);
      set({ isLoading: false });
    }
  },

  saveDesignSystem: async () => {
    const { config, currentProjectId } = get();
    if (!config || !currentProjectId) return;
    
    // Debounced save
    if (saveTimer) clearTimeout(saveTimer);
    
    saveTimer = setTimeout(async () => {
      try {
        const project = await appBuilderService.getAppProject(currentProjectId);
        if (!project) return;
        
        const updatedSettings = {
          ...project.settings,
          designSystem: {
            ...config,
            updatedAt: new Date().toISOString(),
          },
        };
        
        await appBuilderService.updateAppProject(currentProjectId, {
          settings: updatedSettings,
        });
        
        // CRITICAL: Also update the local appBuilderStore's currentProject so autosave
        // doesn't overwrite the design system changes with stale data
        const appBuilderStore = await import('./appBuilderStore');
        const { currentProject } = appBuilderStore.useAppBuilderStore.getState();
        if (currentProject && currentProject.id === currentProjectId) {
          appBuilderStore.useAppBuilderStore.setState({
            currentProject: {
              ...currentProject,
              settings: updatedSettings,
            },
          });
        }
        
        console.log('[DesignSystemStore] Saved design system');
      } catch (error) {
        console.error('[DesignSystemStore] Failed to save design system:', error);
      }
    }, SAVE_DEBOUNCE_MS);
  },

  resetToDefaults: () => {
    const { currentProjectId } = get();
    if (!currentProjectId) return;
    
    const defaultConfig = createDefaultDesignSystem(currentProjectId);
    set({ config: defaultConfig });
    get().regenerateCSS();
    get().saveDesignSystem();
    toast.success('Design system reset to defaults');
  },

  togglePanel: () => {
    set(state => ({ isPanelOpen: !state.isPanelOpen }));
  },

  setActiveCategory: (category: string) => {
    set({ activeCategory: category });
  },

  // Spacing tokens
  updateSpacingToken: (id: string, updates: Partial<SpacingToken>) => {
    const { config } = get();
    if (!config) return;
    
    const updatedScale = config.spacing.scale.map(token =>
      token.id === id ? { ...token, ...updates } : token
    );
    
    set({
      config: {
        ...config,
        spacing: { ...config.spacing, scale: updatedScale },
      },
    });
    
    get().regenerateCSS();
    get().saveDesignSystem();
  },

  addSpacingToken: (token: Omit<SpacingToken, 'id'>) => {
    const { config } = get();
    if (!config) return;
    
    const newToken: SpacingToken = {
      ...token,
      id: `spacing-${uuid()}`,
    };
    
    set({
      config: {
        ...config,
        spacing: {
          ...config.spacing,
          scale: [...config.spacing.scale, newToken],
        },
      },
    });
    
    get().regenerateCSS();
    get().saveDesignSystem();
  },

  removeSpacingToken: (id: string) => {
    const { config } = get();
    if (!config) return;
    
    set({
      config: {
        ...config,
        spacing: {
          ...config.spacing,
          scale: config.spacing.scale.filter(t => t.id !== id),
        },
      },
    });
    
    get().regenerateCSS();
    get().saveDesignSystem();
  },

  getSpacingValue: (name: string) => {
    const { config } = get();
    return config?.spacing.scale.find(t => t.name === name)?.value;
  },

  // Border radius tokens
  updateBorderRadiusToken: (id: string, updates: Partial<BorderRadiusToken>) => {
    const { config } = get();
    if (!config) return;
    
    const updatedScale = config.borderRadius.scale.map(token =>
      token.id === id ? { ...token, ...updates } : token
    );
    
    set({
      config: {
        ...config,
        borderRadius: { ...config.borderRadius, scale: updatedScale },
      },
    });
    
    get().regenerateCSS();
    get().saveDesignSystem();
  },

  addBorderRadiusToken: (token: Omit<BorderRadiusToken, 'id'>) => {
    const { config } = get();
    if (!config) return;
    
    const newToken: BorderRadiusToken = {
      ...token,
      id: `radius-${uuid()}`,
    };
    
    set({
      config: {
        ...config,
        borderRadius: {
          ...config.borderRadius,
          scale: [...config.borderRadius.scale, newToken],
        },
      },
    });
    
    get().regenerateCSS();
    get().saveDesignSystem();
  },

  removeBorderRadiusToken: (id: string) => {
    const { config } = get();
    if (!config) return;
    
    set({
      config: {
        ...config,
        borderRadius: {
          ...config.borderRadius,
          scale: config.borderRadius.scale.filter(t => t.id !== id),
        },
      },
    });
    
    get().regenerateCSS();
    get().saveDesignSystem();
  },

  getBorderRadiusValue: (name: string) => {
    const { config } = get();
    return config?.borderRadius.scale.find(t => t.name === name)?.value;
  },

  // Shadow tokens
  updateShadowToken: (id: string, updates: Partial<ShadowToken>) => {
    const { config } = get();
    if (!config) return;
    
    const updatedScale = config.shadows.scale.map(token =>
      token.id === id ? { ...token, ...updates } : token
    );
    
    set({
      config: {
        ...config,
        shadows: { ...config.shadows, scale: updatedScale },
      },
    });
    
    get().regenerateCSS();
    get().saveDesignSystem();
  },

  addShadowToken: (token: Omit<ShadowToken, 'id'>) => {
    const { config } = get();
    if (!config) return;
    
    const newToken: ShadowToken = {
      ...token,
      id: `shadow-${uuid()}`,
    };
    
    set({
      config: {
        ...config,
        shadows: {
          ...config.shadows,
          scale: [...config.shadows.scale, newToken],
        },
      },
    });
    
    get().regenerateCSS();
    get().saveDesignSystem();
  },

  removeShadowToken: (id: string) => {
    const { config } = get();
    if (!config) return;
    
    set({
      config: {
        ...config,
        shadows: {
          ...config.shadows,
          scale: config.shadows.scale.filter(t => t.id !== id),
        },
      },
    });
    
    get().regenerateCSS();
    get().saveDesignSystem();
  },

  getShadowValue: (name: string) => {
    const { config } = get();
    return config?.shadows.scale.find(t => t.name === name)?.value;
  },

  // Typography tokens
  updateTypographyToken: (id: string, updates: Partial<TypographyToken>) => {
    const { config } = get();
    if (!config) return;
    
    const updatedStyles = config.typography.typeStyles.map(token =>
      token.id === id ? { ...token, ...updates } : token
    );
    
    set({
      config: {
        ...config,
        typography: { ...config.typography, typeStyles: updatedStyles },
      },
    });
    
    get().regenerateCSS();
    get().saveDesignSystem();
  },

  addTypographyToken: (token: Omit<TypographyToken, 'id'>) => {
    const { config } = get();
    if (!config) return;
    
    const newToken: TypographyToken = {
      ...token,
      id: `type-${uuid()}`,
    };
    
    set({
      config: {
        ...config,
        typography: {
          ...config.typography,
          typeStyles: [...config.typography.typeStyles, newToken],
        },
      },
    });
    
    get().regenerateCSS();
    get().saveDesignSystem();
  },

  removeTypographyToken: (id: string) => {
    const { config } = get();
    if (!config) return;
    
    set({
      config: {
        ...config,
        typography: {
          ...config.typography,
          typeStyles: config.typography.typeStyles.filter(t => t.id !== id),
        },
      },
    });
    
    get().regenerateCSS();
    get().saveDesignSystem();
  },

  getTypographyStyle: (name: string) => {
    const { config } = get();
    return config?.typography.typeStyles.find(t => t.name === name);
  },

  // Font family tokens
  updateFontFamily: (id: string, updates: Partial<FontFamilyToken>) => {
    const { config } = get();
    if (!config) return;
    
    const updatedFonts = config.typography.fontFamilies.map(font =>
      font.id === id ? { ...font, ...updates } : font
    );
    
    set({
      config: {
        ...config,
        typography: { ...config.typography, fontFamilies: updatedFonts },
      },
    });
    
    get().regenerateCSS();
    get().saveDesignSystem();
  },

  // Breakpoint tokens
  updateBreakpointToken: (id: string, updates: Partial<BreakpointToken>) => {
    const { config } = get();
    if (!config) return;
    
    const updatedBreakpoints = config.breakpoints.breakpoints.map(bp =>
      bp.id === id ? { ...bp, ...updates } : bp
    );
    
    set({
      config: {
        ...config,
        breakpoints: { ...config.breakpoints, breakpoints: updatedBreakpoints },
      },
    });
    
    get().regenerateCSS();
    get().saveDesignSystem();
  },

  getBreakpointConfig: () => {
    const { config } = get();
    return config?.breakpoints.breakpoints || DEFAULT_BREAKPOINTS;
  },

  // Interaction config
  updateInteractionConfig: (updates: Partial<InteractionConfig>) => {
    const { config } = get();
    if (!config) return;
    
    set({
      config: {
        ...config,
        interactions: { ...config.interactions, ...updates },
      },
    });
    
    get().regenerateCSS();
    get().saveDesignSystem();
  },

  getInteractionConfig: () => {
    const { config } = get();
    return config?.interactions || DEFAULT_INTERACTION_CONFIG;
  },

  // Container/Section spacing
  updateContainerPadding: (breakpoint: 'desktop' | 'tablet' | 'mobile', value: string) => {
    const { config } = get();
    if (!config) return;
    
    set({
      config: {
        ...config,
        spacing: {
          ...config.spacing,
          containerPadding: {
            ...config.spacing.containerPadding,
            [breakpoint]: value,
          },
        },
      },
    });
    
    get().regenerateCSS();
    get().saveDesignSystem();
  },

  updateSectionGap: (value: string) => {
    const { config } = get();
    if (!config) return;
    
    set({
      config: {
        ...config,
        spacing: { ...config.spacing, sectionGap: value },
      },
    });
    
    get().regenerateCSS();
    get().saveDesignSystem();
  },

  updateGridGap: (value: string) => {
    const { config } = get();
    if (!config) return;
    
    set({
      config: {
        ...config,
        spacing: { ...config.spacing, gridGap: value },
      },
    });
    
    get().regenerateCSS();
    get().saveDesignSystem();
  },

  // CSS Generation
  regenerateCSS: () => {
    const { config } = get();
    if (!config) {
      set({ generatedCSS: '' });
      return;
    }
    
    const css = generateDesignSystemCSS(config);
    set({ generatedCSS: css });
  },

  getGeneratedCSS: () => {
    return get().generatedCSS;
  },

  // Import CSS variables from external HTML/CSS into the project's design system
  importCSSVariables: (cssVariables: Record<string, string>) => {
    const { config } = get();
    if (!config) return;
    
    const updatedConfig = { ...config };
    const importedColors: ColorToken[] = [...(config.colors || [])];
    let colorsAdded = 0;
    let fontsUpdated = 0;
    let spacingAdded = 0;
    let radiusAdded = 0;
    let shadowsAdded = 0;
    
    for (const [varName, value] of Object.entries(cssVariables)) {
      const cleanName = varName.replace(/^--/, '');
      
      // Colors: bg-*, text-*, border-*, color-*, accent-*, brand-*, surface-*
      if (/^(bg|text|border|color|accent|brand|surface|primary|secondary|muted|card|popover|destructive|ring|input|chart)/.test(cleanName)) {
        if (importedColors.some(c => c.cssVar === varName)) continue;
        
        let hslValue = value;
        if (value.startsWith('#')) {
          hslValue = hexToHSL(value);
        }
        
        let colorCategory: ColorToken['category'] = 'semantic';
        if (/^(bg|surface|card|popover|muted)/.test(cleanName)) colorCategory = 'surface';
        else if (/^(brand|accent|primary|secondary)/.test(cleanName)) colorCategory = 'brand';
        else if (/^(text|border|ring|input)/.test(cleanName)) colorCategory = 'neutral';
        
        importedColors.push({
          id: `imported-${cleanName}-${Date.now()}`,
          name: cleanName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: hslValue,
          cssVar: varName,
          category: colorCategory,
          description: `Imported from HTML: ${varName}`,
          isActive: true,
        });
        colorsAdded++;
      }
      // Font families: font-*
      else if (/^font/.test(cleanName)) {
        const fontCategory = /heading|title|display/i.test(cleanName) ? 'heading' 
          : /mono|code/i.test(cleanName) ? 'mono' : 'body';
        
        const existingFont = updatedConfig.typography.fontFamilies.find(f => f.category === fontCategory);
        if (existingFont) {
          existingFont.value = value;
          existingFont.cssVar = varName;
          fontsUpdated++;
        }
      }
      // Spacing: spacing-*, gap-*, section-gap, grid-gap, padding-*
      else if (/^(spacing|gap|section-gap|grid-gap|padding|container-padding)/.test(cleanName)) {
        const existingSpacing = updatedConfig.spacing.scale.find(s => s.cssVar === varName);
        if (!existingSpacing) {
          updatedConfig.spacing.scale.push({
            id: `imported-spacing-${cleanName}-${Date.now()}`,
            name: cleanName,
            cssVar: varName,
            value: value,
            pixels: parseInt(value) || 0,
            category: parseInt(value) > 48 ? 'macro' : parseInt(value) > 16 ? 'medium' : 'small',
            description: `Imported from HTML`,
            isActive: true,
          });
          spacingAdded++;
        }
        
        if (cleanName === 'section-gap') {
          updatedConfig.spacing.sectionGap = value;
        } else if (cleanName === 'grid-gap') {
          updatedConfig.spacing.gridGap = value;
        }
      }
      // Border radius: radius-*, border-radius-*
      else if (/^(radius|border-radius)/.test(cleanName)) {
        const existingRadius = updatedConfig.borderRadius.scale.find(r => r.cssVar === varName);
        if (!existingRadius) {
          updatedConfig.borderRadius.scale.push({
            id: `imported-radius-${cleanName}-${Date.now()}`,
            name: cleanName,
            cssVar: varName,
            value: value,
            pixels: parseInt(value) || 0,
            category: parseInt(value) > 16 ? 'pronounced' : parseInt(value) > 4 ? 'moderate' : 'subtle',
            description: `Imported from HTML`,
            isActive: true,
          });
          radiusAdded++;
        }
      }
      // Shadows: shadow-*
      else if (/^shadow/.test(cleanName)) {
        const existingShadow = updatedConfig.shadows.scale.find(s => s.cssVar === varName);
        if (!existingShadow) {
          updatedConfig.shadows.scale.push({
            id: `imported-shadow-${cleanName}-${Date.now()}`,
            name: cleanName,
            cssVar: varName,
            value: value,
            category: 'elevation',
            description: `Imported from HTML`,
            isActive: true,
          });
          shadowsAdded++;
        }
      }
      // Max width
      else if (cleanName === 'max-width') {
        updatedConfig.spacing.containerPadding = {
          ...updatedConfig.spacing.containerPadding,
        };
      }
      // Typography size/weight variables: h1-size, body-size, etc.
      else if (/^(h\d|body|display|label)-(size|weight|line-height)/.test(cleanName)) {
        const match = cleanName.match(/^(h\d|body|display|label)-(size|weight|line-height)$/);
        if (match) {
          const [, typeName, prop] = match;
          const typeTokenName = typeName === 'body' ? 'Body' 
            : typeName.startsWith('h') ? typeName.toUpperCase()
            : typeName.charAt(0).toUpperCase() + typeName.slice(1);
          
          const typeToken = updatedConfig.typography.typeStyles.find(t => 
            t.name.toLowerCase() === typeTokenName.toLowerCase()
          );
          if (typeToken) {
            if (prop === 'size') typeToken.fontSize = value;
            else if (prop === 'weight') typeToken.fontWeight = value;
            else if (prop === 'line-height') typeToken.lineHeight = value;
          }
        }
      }
    }
    
    updatedConfig.colors = importedColors;
    updatedConfig.name = 'Imported Design System';
    
    set({ config: updatedConfig });
    get().regenerateCSS();
    get().saveDesignSystem();
    
    const parts: string[] = [];
    if (colorsAdded > 0) parts.push(`${colorsAdded} colors`);
    if (fontsUpdated > 0) parts.push(`${fontsUpdated} fonts`);
    if (spacingAdded > 0) parts.push(`${spacingAdded} spacing tokens`);
    if (radiusAdded > 0) parts.push(`${radiusAdded} radius tokens`);
    if (shadowsAdded > 0) parts.push(`${shadowsAdded} shadow tokens`);
    
    if (parts.length > 0) {
      console.log(`[DesignSystem] Imported: ${parts.join(', ')}`);
    }
  },

  // Token linking utilities
  getTokenByVariable: (cssVar: string) => {
    const { config } = get();
    if (!config) return undefined;
    
    // Check spacing tokens
    const spacingToken = config.spacing.scale.find(t => t.cssVar === cssVar);
    if (spacingToken) return spacingToken;
    
    // Check border radius tokens
    const radiusToken = config.borderRadius.scale.find(t => t.cssVar === cssVar);
    if (radiusToken) return radiusToken;
    
    // Check shadow tokens
    const shadowToken = config.shadows.scale.find(t => t.cssVar === cssVar);
    if (shadowToken) return shadowToken;
    
    return undefined;
  },

  isValueTokenLinked: (value: string, category: 'spacing' | 'borderRadius' | 'shadow') => {
    const { config } = get();
    if (!config) return { linked: false };
    
    // Check if value is a CSS variable reference
    if (value.startsWith('var(')) {
      const cssVar = value.match(/var\((--[^)]+)\)/)?.[1];
      if (cssVar) {
        const token = get().getTokenByVariable(cssVar);
        if (token) {
          return { linked: true, tokenName: token.name };
        }
      }
    }
    
    // Check if value matches a token value directly
    let tokens: Array<{ name: string; value: string }> = [];
    switch (category) {
      case 'spacing':
        tokens = config.spacing.scale;
        break;
      case 'borderRadius':
        tokens = config.borderRadius.scale;
        break;
      case 'shadow':
        tokens = config.shadows.scale;
        break;
    }
    
    const matchingToken = tokens.find(t => t.value === value);
    if (matchingToken) {
      return { linked: true, tokenName: matchingToken.name };
    }
    
    return { linked: false };
  },
}));

// Export convenience hook for checking if design system is loaded
export function useDesignSystemReady(): boolean {
  return useDesignSystemStore(state => state.config !== null && !state.isLoading);
}
