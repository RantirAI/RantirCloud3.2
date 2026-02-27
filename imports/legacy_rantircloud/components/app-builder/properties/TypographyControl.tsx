import React, { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/compact/Select';
import { Input } from '@/components/ui/compact/Input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Type, 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  Palette,
  CaseSensitive,
  CaseUpper,
  Move,
  Anchor
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ColorAdvancedPicker } from './ColorAdvancedPicker';
import { useStylePropertyOrigin } from '@/hooks/useStylePropertyOrigin';
import { resolveInheritedProperty } from '@/lib/parentStyleInheritance';
import { useDesignTokenStore } from '@/stores/designTokenStore';
import { getTypographyTokenForComponent, resolveTokenRef, resolveHeadingSize, resolveBodyDefaults, getHeadingSizeToken } from '@/lib/designTokenResolver';
import { DSPropertyIndicator } from './DSPropertyIndicator';

interface TypographyControlProps {
  label: string;
  value: any;
  onChange: (value: any) => void;
  componentProps?: Record<string, any>;
}

// Common Google Fonts + Modern fonts
const googleFonts = [
  // Geist fonts (loaded via Vercel CDN - must be imported separately)
  { label: 'Geist', value: 'Geist, system-ui, sans-serif' },
  { label: 'Geist Mono', value: 'Geist Mono, monospace' },
  // TikTok Sans (loaded locally or via system)
  { label: 'TikTok Sans', value: 'TikTokSans, system-ui, sans-serif' },
  // Modern Sans-Serif (Google Fonts)
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Open Sans', value: 'Open Sans, sans-serif' },
  { label: 'Lato', value: 'Lato, sans-serif' },
  { label: 'Montserrat', value: 'Montserrat, sans-serif' },
  { label: 'Poppins', value: 'Poppins, sans-serif' },
  { label: 'Raleway', value: 'Raleway, sans-serif' },
  { label: 'Nunito', value: 'Nunito, sans-serif' },
  { label: 'Nunito Sans', value: 'Nunito Sans, sans-serif' },
  { label: 'Work Sans', value: 'Work Sans, sans-serif' },
  { label: 'DM Sans', value: 'DM Sans, sans-serif' },
  { label: 'Plus Jakarta Sans', value: 'Plus Jakarta Sans, sans-serif' },
  { label: 'Outfit', value: 'Outfit, sans-serif' },
  { label: 'Sora', value: 'Sora, sans-serif' },
  { label: 'Space Grotesk', value: 'Space Grotesk, sans-serif' },
  { label: 'Urbanist', value: 'Urbanist, sans-serif' },
  { label: 'Manrope', value: 'Manrope, sans-serif' },
  { label: 'Figtree', value: 'Figtree, sans-serif' },
  { label: 'Lexend', value: 'Lexend, sans-serif' },
  { label: 'Quicksand', value: 'Quicksand, sans-serif' },
  { label: 'Ubuntu', value: 'Ubuntu, sans-serif' },
  { label: 'PT Sans', value: 'PT Sans, sans-serif' },
  { label: 'Source Sans 3', value: 'Source Sans 3, sans-serif' },
  { label: 'Archivo', value: 'Archivo, sans-serif' },
  { label: 'Barlow', value: 'Barlow, sans-serif' },
  { label: 'Cabin', value: 'Cabin, sans-serif' },
  { label: 'Mulish', value: 'Mulish, sans-serif' },
  { label: 'Rubik', value: 'Rubik, sans-serif' },
  { label: 'Karla', value: 'Karla, sans-serif' },
  { label: 'Josefin Sans', value: 'Josefin Sans, sans-serif' },
  { label: 'Oswald', value: 'Oswald, sans-serif' },
  { label: 'Bebas Neue', value: 'Bebas Neue, sans-serif' },
  { label: 'Instrument Sans', value: 'Instrument Sans, sans-serif' },
  { label: 'Fira Sans', value: 'Fira Sans, sans-serif' },
  // Serif Fonts
  { label: 'Playfair Display', value: 'Playfair Display, serif' },
  { label: 'Merriweather', value: 'Merriweather, serif' },
  { label: 'Lora', value: 'Lora, serif' },
  { label: 'Libre Baskerville', value: 'Libre Baskerville, serif' },
  { label: 'Crimson Text', value: 'Crimson Text, serif' },
  { label: 'EB Garamond', value: 'EB Garamond, serif' },
  { label: 'Cormorant Garamond', value: 'Cormorant Garamond, serif' },
  { label: 'Bitter', value: 'Bitter, serif' },
  { label: 'DM Serif Display', value: 'DM Serif Display, serif' },
  { label: 'Fraunces', value: 'Fraunces, serif' },
  // System fonts
  { label: 'System UI', value: 'system-ui, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  // Monospace
  { label: 'JetBrains Mono', value: 'JetBrains Mono, monospace' },
  { label: 'Fira Code', value: 'Fira Code, monospace' },
  { label: 'Source Code Pro', value: 'Source Code Pro, monospace' },
  { label: 'IBM Plex Mono', value: 'IBM Plex Mono, monospace' },
  { label: 'Space Mono', value: 'Space Mono, monospace' },
  { label: 'Inconsolata', value: 'Inconsolata, monospace' },
];

// Typography presets (matches DS heading scale)
const typographyPresets = [
  { id: 'h1', label: 'Heading 1', fontSize: '64', fontWeight: '700', lineHeight: '1.1' },
  { id: 'h2', label: 'Heading 2', fontSize: '48', fontWeight: '700', lineHeight: '1.15' },
  { id: 'h3', label: 'Heading 3', fontSize: '40', fontWeight: '600', lineHeight: '1.2' },
  { id: 'h4', label: 'Heading 4', fontSize: '32', fontWeight: '600', lineHeight: '1.25' },
  { id: 'h5', label: 'Heading 5', fontSize: '24', fontWeight: '600', lineHeight: '1.3' },
  { id: 'h6', label: 'Heading 6', fontSize: '18', fontWeight: '600', lineHeight: '1.4' },
  { id: 'body-large', label: 'Body Large', fontSize: '18', fontWeight: '400', lineHeight: '1.6' },
  { id: 'body', label: 'Body', fontSize: '16', fontWeight: '400', lineHeight: '1.5' },
  { id: 'body-small', label: 'Body Small', fontSize: '14', fontWeight: '400', lineHeight: '1.5' },
  { id: 'caption', label: 'Caption', fontSize: '12', fontWeight: '400', lineHeight: '1.4' },
];

const fontWeights = [
  { label: 'Thin', value: '100' },
  { label: 'Extra Light', value: '200' },
  { label: 'Light', value: '300' },
  { label: 'Regular', value: '400' },
  { label: 'Medium', value: '500' },
  { label: 'Semi Bold', value: '600' },
  { label: 'Bold', value: '700' },
  { label: 'Extra Bold', value: '800' },
  { label: 'Black', value: '900' },
];

export function TypographyControl({ label, value, onChange, componentProps }: TypographyControlProps) {
  const [selectedPreset, setSelectedPreset] = useState('');
  const { getPropertyOrigin } = useStylePropertyOrigin(componentProps);
  const { activeTokens } = useDesignTokenStore();

  const rawTypography = (value && typeof value === 'object') ? value : {};

  // Parent inherited styles/sources are injected by the canvas renderer, and we also
  // compute them in the Styles panel for reliability.
  const parentInheritedStyles = (componentProps as any)?._inheritedStyles || {};
  const parentInheritedSources = (componentProps as any)?._inheritedStyleSources || {};

  // Determine which design token applies based on component type
  const componentType = (componentProps as any)?._componentType || 'text';
  const typographyTokenName = useMemo(() => 
    getTypographyTokenForComponent(componentType), 
    [componentType]
  );
  
  // Get the design token default font
  const designTokenFont = useMemo(() => {
    if (!typographyTokenName) return undefined;
    return resolveTokenRef(typographyTokenName, activeTokens) || undefined;
  }, [typographyTokenName, activeTokens]);

  // Resolve heading size from DS token
  const headingLevel = componentType === 'heading' ? ((componentProps as any)?.level || 1) : null;
  
  const headingSizeInfo = useMemo(() => {
    if (!headingLevel) return null;
    return resolveHeadingSize(headingLevel, activeTokens);
  }, [headingLevel, activeTokens]);
  
  // Resolve body defaults from DS tokens
  const bodyDefaults = useMemo(() => {
    if (componentType !== 'text' && componentType !== 'paragraph') return null;
    return resolveBodyDefaults(activeTokens);
  }, [componentType, activeTokens]);

  const baseFontSizeToken = useMemo(() => {
    const raw = activeTokens.get('font-size-base')?.value;
    if (!raw) return undefined;
    const m = String(raw).trim().match(/^([0-9]+)(px)?$/);
    return m?.[1] ?? undefined;
  }, [activeTokens]);

  const getOwnValue = (key: string) => {
    // Allow either typography object or flat props as the "own" value.
    return rawTypography?.[key] ?? (componentProps as any)?.[key];
  };

  // Check if font size is coming from DS heading token (no explicit override)
  const isUsingDSHeadingSize = useMemo(() => {
    if (!headingSizeInfo?.isTokenControlled) return false;
    const ownFontSize = rawTypography?.fontSize ?? (componentProps as any)?.fontSize;
    return !ownFontSize || ownFontSize === headingSizeInfo.fontSize;
  }, [headingSizeInfo, rawTypography, componentProps]);

  const normalizeForControl = (key: string, v: any) => {
    if (v == null) return v;
    if (typeof v === 'string' && (key === 'fontSize' || key === 'letterSpacing')) {
      const t = v.trim();
      if (t.endsWith('px')) return t.slice(0, -2);
    }
    return v;
  };

  // Check if component has any applied CSS classes
  const appliedClasses = useMemo(() => {
    const classes = (componentProps as any)?.appliedClasses;
    return Array.isArray(classes) ? classes : [];
  }, [componentProps]);
  
  const hasAppliedClasses = appliedClasses.length > 0;

  const typographyParentSummary = useMemo(() => {
    // Only show parent inheritance badges for text-like elements.
    if (componentType !== 'text' && componentType !== 'heading') {
      return { inherited: false, overridden: false, source: undefined as any };
    }

    const keys = [
      'fontFamily',
      'fontSize',
      'fontWeight',
      'lineHeight',
      'letterSpacing',
      'textAlign',
      'fontStyle',
      'textDecoration',
      'textTransform',
      'color',
    ];

    let hasParentTypography = false;
    let hasClassOverride = false;
    let source: any = undefined;

    for (const key of keys) {
      const hasParent =
        !!(parentInheritedSources as any)?.[key] &&
        (parentInheritedStyles as any)?.[key] !== undefined &&
        (parentInheritedStyles as any)?.[key] !== null &&
        (parentInheritedStyles as any)?.[key] !== '';

      if (!hasParent) continue;
      hasParentTypography = true;
      source = source ?? (parentInheritedSources as any)?.[key];

      // Only check for override if component HAS applied classes
      // AND the property origin indicates this component's class defines it
      if (hasAppliedClasses) {
        const origin = getPropertyOrigin(key, getOwnValue(key));
        // Blue color (#1677ff) means this component's class explicitly defines the property
        if (origin.color === '#1677ff') {
          hasClassOverride = true;
        }
      }
    }

    // CRITICAL LOGIC:
    // - If no parent typography exists → no badge
    // - If parent typography exists AND component has NO class → show Yellow "Inherited parent styles"
    // - If parent typography exists AND component HAS class AND class overrides at least one property → show Blue "Overrides parent"
    // - If parent typography exists AND component HAS class but NO override → show Yellow "Inherited parent styles"
    
    if (!hasParentTypography) {
      return { inherited: false, overridden: false, source };
    }
    
    if (!hasAppliedClasses) {
      // No class = always inheriting (cannot override)
      return { inherited: true, overridden: false, source };
    }
    
    // Has class - check if actually overriding
    if (hasClassOverride) {
      return { inherited: false, overridden: true, source };
    }
    
    // Has class but not overriding any typography properties
    return { inherited: true, overridden: false, source };
  }, [componentType, parentInheritedSources, parentInheritedStyles, rawTypography, componentProps, hasAppliedClasses, getPropertyOrigin]);

  const getDisplayValue = (key: string, fallback: any) => {
    const ownValue = getOwnValue(key);
    const resolved = resolveInheritedProperty(key, ownValue, parentInheritedStyles, parentInheritedSources);

    // For fontFamily, if no own value or inherited value, use design token
    if (key === 'fontFamily' && !resolved.value && designTokenFont) {
      return designTokenFont;
    }

    // For fontSize, resolve from DS heading token or body token
    if (key === 'fontSize' && (resolved.value == null || resolved.value === '')) {
      // Heading: use DS heading size token
      if (headingSizeInfo) {
        return headingSizeInfo.fontSize;
      }
      // Body: use base size token
      if (baseFontSizeToken) {
        return baseFontSizeToken;
      }
      if (bodyDefaults) {
        return bodyDefaults.fontSize;
      }
    }
    
    // For lineHeight, resolve from DS heading/body defaults
    if (key === 'lineHeight' && (resolved.value == null || resolved.value === '')) {
      if (headingSizeInfo) return headingSizeInfo.lineHeight;
      if (bodyDefaults) return bodyDefaults.lineHeight;
    }
    
    // For fontWeight, resolve from DS heading defaults
    if (key === 'fontWeight' && (resolved.value == null || resolved.value === '')) {
      if (headingSizeInfo) return headingSizeInfo.fontWeight;
    }

    return normalizeForControl(key, resolved.value ?? fallback);
  };
  
  // Check if font is coming from design token (no explicit override)
  const isUsingDesignTokenFont = useMemo(() => {
    // If fontFamily is linked to DS via _dsTokenRefs and not explicitly locked by user,
    // treat as DS-controlled regardless of class/prop values (they're just import artifacts)
    const dsTokenRefs = (componentProps as any)?._dsTokenRefs;
    const isDSLinkedFont = !!dsTokenRefs?.fontFamily;
    const isLockedFont = (componentProps as any)?.__lockedProps?.fontFamily === true;
    if (isDSLinkedFont && !isLockedFont && !!designTokenFont) return true;

    // Legacy check: no own value + no inherited = using token default
    const ownFont = getOwnValue('fontFamily');
    const inheritedFont = parentInheritedStyles?.fontFamily;
    return !ownFont && !inheritedFont && !!designTokenFont;
  }, [rawTypography, componentProps, parentInheritedStyles, designTokenFont]);
  
  // Display values include parent inheritance; origin colors/tooltips are computed
  // from the component's OWN values (so inherited-from-parent shows yellow).
  const currentTypography = {
    // When DS token controls the font, always display the token value
    // (class/prop may still hold a stale import artifact like "Inter")
    fontFamily: isUsingDesignTokenFont && designTokenFont
      ? designTokenFont
      : getDisplayValue('fontFamily', 'Inter, sans-serif'),
    fontSize: getDisplayValue('fontSize', '16'),
    fontWeight: getDisplayValue('fontWeight', '400'),
    lineHeight: getDisplayValue('lineHeight', '1.5'),
    textAlign: getDisplayValue('textAlign', 'left'),
    fontStyle: getDisplayValue('fontStyle', 'normal'),
    textDecoration: getDisplayValue('textDecoration', 'none'),
    letterSpacing: getDisplayValue('letterSpacing', '0'),
    textTransform: getDisplayValue('textTransform', 'none'),
    color: getDisplayValue('color', '#000000'),
  };

  const fontFamilyOrigin = getPropertyOrigin('fontFamily', getOwnValue('fontFamily'));
  const fontSizeOrigin = getPropertyOrigin('fontSize', getOwnValue('fontSize'));
  const fontWeightOrigin = getPropertyOrigin('fontWeight', getOwnValue('fontWeight'));
  const lineHeightOrigin = getPropertyOrigin('lineHeight', getOwnValue('lineHeight'));
  const letterSpacingOrigin = getPropertyOrigin('letterSpacing', getOwnValue('letterSpacing'));
  const colorOrigin = getPropertyOrigin('color', getOwnValue('color'));

  const updateTypography = (updates: Partial<typeof currentTypography>) => {
    // Persist ONLY explicit overrides (own values) into the typography object.
    // Display values may be coming from parent inheritance.
    onChange({ ...rawTypography, ...updates });
  };

  const applyPreset = (presetId: string) => {
    const preset = typographyPresets.find(p => p.id === presetId);
    if (preset) {
      updateTypography({
        fontSize: preset.fontSize,
        fontWeight: preset.fontWeight,
        lineHeight: preset.lineHeight,
      });
      setSelectedPreset(presetId);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] font-medium text-muted-foreground">{label}</Label>
        {(typographyParentSummary.inherited || typographyParentSummary.overridden) && (
          <span
            className={cn(
              "text-[9px] px-1.5 py-0.5 rounded font-medium",
              typographyParentSummary.overridden
                ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                : "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300"
            )}
            title={
              typographyParentSummary.source?.parentClassName
                ? `From .${typographyParentSummary.source.parentClassName} (parent)`
                : undefined
            }
          >
            {typographyParentSummary.overridden ? 'Overrides parent' : 'Inherited parent styles'}
          </span>
        )}
      </div>

      {/* Typography Presets Dropdown */}
      <div>
        <Label className="text-[10px] text-muted-foreground mb-1 block">Presets</Label>
        <Select value={selectedPreset} onValueChange={applyPreset}>
          <SelectTrigger className="h-6 text-xs">
            <SelectValue placeholder="Choose a preset..." />
          </SelectTrigger>
          <SelectContent className="bg-background border z-50">
            {typographyPresets.map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Font Family */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-[10px] text-muted-foreground">Font Family</Label>
          {isUsingDesignTokenFont && typographyTokenName && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-500 font-medium">
              {typographyTokenName === 'font-heading' ? 'Heading' : 
               typographyTokenName === 'font-body' ? 'Body' : 'Mono'}
            </span>
          )}
        </div>
        <Select
          value={currentTypography.fontFamily}
          onValueChange={(fontFamily) => updateTypography({ fontFamily })}
        >
          <SelectTrigger 
            className="h-6 text-xs" 
            style={{ 
              color: isUsingDesignTokenFont ? '#a855f7' : fontFamilyOrigin.color,
              borderColor: isUsingDesignTokenFont ? '#a855f780' : undefined
            }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-60 bg-background border z-50">
            {/* Design System Fonts Section */}
            {designTokenFont && (
              <>
                <div className="px-2 py-1 text-[10px] font-medium text-purple-500 bg-purple-500/10">
                  Design System
                </div>
                <SelectItem value={designTokenFont}>
                  <span className="flex items-center gap-2" style={{ fontFamily: designTokenFont }}>
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    {designTokenFont.split(',')[0].replace(/["']/g, '')}
                    <span className="text-[10px] text-muted-foreground">
                      ({typographyTokenName === 'font-heading' ? 'Heading' : 
                        typographyTokenName === 'font-body' ? 'Body' : 'Mono'})
                    </span>
                  </span>
                </SelectItem>
                <div className="my-1 border-t border-border" />
              </>
            )}
            {googleFonts.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                <span style={{ fontFamily: font.value }}>{font.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Font Size & Weight - Side by side */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-[10px] text-muted-foreground">Size (px)</Label>
            {(isUsingDSHeadingSize || (bodyDefaults?.isTokenControlled && componentType === 'text')) && (
              <DSPropertyIndicator
                isLinked={true}
                tokenRef={headingLevel ? getHeadingSizeToken(headingLevel) : 'font-size-base'}
                label={headingLevel ? `H${headingLevel}` : 'Body'}
                resolvedValue={currentTypography.fontSize + 'px'}
                onDetach={() => {
                  // Detach: set explicit font size (breaks DS link)
                  updateTypography({ fontSize: currentTypography.fontSize });
                }}
                size="sm"
              />
            )}
          </div>
          <Input
            type="number"
            value={currentTypography.fontSize}
            onChange={(e) => updateTypography({ fontSize: e.target.value })}
            style={{ 
              color: (isUsingDSHeadingSize || (bodyDefaults?.isTokenControlled && componentType === 'text'))
                ? '#14b8a6' // teal to match DS indicator
                : fontSizeOrigin.color
            }}
            className="h-6 text-xs"
            min="8"
            max="200"
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground mb-1 block">Weight</Label>
          <Select
            value={currentTypography.fontWeight}
            onValueChange={(fontWeight) => updateTypography({ fontWeight })}
          >
            <SelectTrigger className="h-6 text-xs" style={{ color: fontWeightOrigin.color }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              {fontWeights.map((weight) => (
                <SelectItem key={weight.value} value={weight.value}>
                  {weight.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Text Alignment and Style - Side by side */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground mb-1 block">Alignment</Label>
          <div className="flex gap-1">
            {[
              { value: 'left', icon: AlignLeft },
              { value: 'center', icon: AlignCenter },
              { value: 'right', icon: AlignRight },
              { value: 'justify', icon: AlignJustify },
            ].map(({ value, icon: Icon }) => (
              <Button
                key={value}
                variant={currentTypography.textAlign === value ? 'default' : 'outline'}
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => updateTypography({ textAlign: value })}
              >
                <Icon className="h-3 w-3" />
              </Button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-[10px] text-muted-foreground mb-1 block">Style</Label>
          <div className="flex gap-1">
            <Button
              variant={currentTypography.fontWeight >= '600' ? 'default' : 'outline'}
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => updateTypography({ 
                fontWeight: currentTypography.fontWeight >= '600' ? '400' : '700' 
              })}
            >
              <Bold className="h-3 w-3" />
            </Button>
            <Button
              variant={currentTypography.fontStyle === 'italic' ? 'default' : 'outline'}
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => updateTypography({ 
                fontStyle: currentTypography.fontStyle === 'italic' ? 'normal' : 'italic' 
              })}
            >
              <Italic className="h-3 w-3" />
            </Button>
            <Button
              variant={currentTypography.textDecoration === 'underline' ? 'default' : 'outline'}
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => updateTypography({ 
                textDecoration: currentTypography.textDecoration === 'underline' ? 'none' : 'underline' 
              })}
            >
              <Underline className="h-3 w-3" />
            </Button>
            <Button
              variant={currentTypography.textTransform === 'uppercase' ? 'default' : 'outline'}
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => updateTypography({ 
                textTransform: currentTypography.textTransform === 'uppercase' ? 'none' : 'uppercase' 
              })}
            >
              <CaseUpper className="h-3 w-3" />
            </Button>
            <Button
              variant={currentTypography.textTransform === 'capitalize' ? 'default' : 'outline'}
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => updateTypography({ 
                textTransform: currentTypography.textTransform === 'capitalize' ? 'none' : 'capitalize' 
              })}
            >
              <CaseSensitive className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Text Color */}
      <div>
        <ColorAdvancedPicker
          label="Color"
          value={currentTypography.color}
          onChange={(color) => updateTypography({ color })}
          componentProps={componentProps}
          propertyName="color"
        />
      </div>

      {/* Advanced Settings */}
      <div className="space-y-3 pt-2 border-t">
        <Label className="text-[10px] font-medium text-muted-foreground">Advanced</Label>
        
        {/* Line Height and Letter Spacing - Side by side */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block" style={{ color: lineHeightOrigin.color }}>
              Line Height: {currentTypography.lineHeight}
            </Label>
            <Slider
              value={[parseFloat(currentTypography.lineHeight)]}
              onValueChange={(values) => updateTypography({ lineHeight: values[0].toString() })}
              min={0.8}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block" style={{ color: letterSpacingOrigin.color }}>
              Letter Spacing: {currentTypography.letterSpacing}px
            </Label>
            <Slider
              value={[parseFloat(currentTypography.letterSpacing)]}
              onValueChange={(values) => updateTypography({ letterSpacing: values[0].toString() })}
              min={-2}
              max={5}
              step={0.1}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}