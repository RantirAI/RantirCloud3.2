/**
 * Theme Color Swatches
 * Displays design system color tokens as compact grid
 * Read-only presets that update when theme changes
 */

import React, { useMemo } from 'react';
import { useDesignTokenStore } from '@/stores/designTokenStore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type { TokenColorValue } from '@/lib/tokenColorUtils';
export { isTokenColorValue } from '@/lib/tokenColorUtils';
import type { TokenColorValue } from '@/lib/tokenColorUtils';

interface ThemeColorSwatchesProps {
  currentValue?: string | TokenColorValue;
  onColorSelect: (color: string | TokenColorValue) => void;
  className?: string;
  /** If true, returns TokenColorValue instead of raw string for token-linked colors */
  returnTokenRef?: boolean;
}

interface ColorGroup {
  title: string;
  tokens: { name: string; value: string; displayName: string }[];
}

export function ThemeColorSwatches({ currentValue, onColorSelect, className, returnTokenRef = true }: ThemeColorSwatchesProps) {
  const { getColorTokens, activeTokens } = useDesignTokenStore();
  
  // Group color tokens by category
  const colorGroups = useMemo((): ColorGroup[] => {
    const colorTokens = getColorTokens();
    if (colorTokens.length === 0) return [];
    
    const formatDisplayName = (name: string) => {
      return name
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };
    
    const groups: ColorGroup[] = [];
    
    // Primary colors
    const primaryTokens = colorTokens.filter(t => t.name.includes('primary'));
    if (primaryTokens.length > 0) {
      groups.push({
        title: 'PRIMARY',
        tokens: primaryTokens.map(t => ({ 
          name: t.name, 
          value: t.value, 
          displayName: formatDisplayName(t.name.replace('primary-', '').replace('primary', 'Primary'))
        }))
      });
    }
    
    // Secondary colors
    const secondaryTokens = colorTokens.filter(t => t.name.includes('secondary'));
    if (secondaryTokens.length > 0) {
      groups.push({
        title: 'SECONDARY',
        tokens: secondaryTokens.map(t => ({ 
          name: t.name, 
          value: t.value, 
          displayName: formatDisplayName(t.name.replace('secondary-', '').replace('secondary', 'Secondary'))
        }))
      });
    }
    
    // Base colors (background, surface, muted, foreground, border)
    const baseNames = ['background', 'foreground', 'surface', 'muted', 'border', 'card'];
    const baseTokens = colorTokens.filter(t => 
      baseNames.some(b => t.name === b || t.name.startsWith(b + '-'))
    );
    if (baseTokens.length > 0) {
      groups.push({
        title: 'BASE',
        tokens: baseTokens.map(t => ({ 
          name: t.name, 
          value: t.value, 
          displayName: formatDisplayName(t.name)
        }))
      });
    }
    
    // Accent colors
    const accentTokens = colorTokens.filter(t => t.name.includes('accent'));
    if (accentTokens.length > 0) {
      groups.push({
        title: 'ACCENT',
        tokens: accentTokens.map(t => ({ 
          name: t.name, 
          value: t.value, 
          displayName: formatDisplayName(t.name.replace('accent-', '').replace('accent', 'Accent'))
        }))
      });
    }
    
    // Destructive colors
    const destructiveTokens = colorTokens.filter(t => t.name.includes('destructive'));
    if (destructiveTokens.length > 0) {
      groups.push({
        title: 'DESTRUCTIVE',
        tokens: destructiveTokens.map(t => ({ 
          name: t.name, 
          value: t.value, 
          displayName: formatDisplayName(t.name.replace('destructive-', '').replace('destructive', 'Destructive'))
        }))
      });
    }
    
    // Custom colors (any that don't fit into the above categories)
    const categorizedNames = [
      ...primaryTokens.map(t => t.name),
      ...secondaryTokens.map(t => t.name),
      ...baseTokens.map(t => t.name),
      ...accentTokens.map(t => t.name),
      ...destructiveTokens.map(t => t.name),
    ];
    const customTokens = colorTokens.filter(t => !categorizedNames.includes(t.name));
    if (customTokens.length > 0) {
      groups.push({
        title: 'CUSTOM',
        tokens: customTokens.map(t => ({ 
          name: t.name, 
          value: t.value, 
          displayName: formatDisplayName(t.name)
        }))
      });
    }
    
    return groups;
  }, [getColorTokens, activeTokens]);
  
  // Check if current value matches a token (by tokenRef or by color value)
  const normalizeColor = (color: string): string => {
    if (!color) return '';
    return color.trim().toLowerCase();
  };
  
  const isActive = (tokenName: string, tokenValue: string) => {
    if (!currentValue) return false;
    
    // If currentValue is a TokenColorValue, check by tokenRef
    if (typeof currentValue === 'object' && 'tokenRef' in currentValue) {
      return currentValue.tokenRef === tokenName;
    }
    
    // Otherwise compare by hex value
    return normalizeColor(currentValue) === normalizeColor(tokenValue);
  };
  
  const handleColorSelect = (tokenName: string, tokenValue: string) => {
    if (returnTokenRef) {
      // Return token reference for real-time updates
      onColorSelect({ tokenRef: tokenName, value: tokenValue });
    } else {
      // Return raw hex value (legacy behavior)
      onColorSelect(tokenValue);
    }
  };
  
  if (colorGroups.length === 0) {
    return null;
  }
  
  // Flatten all tokens for compact display
  const allTokens = colorGroups.flatMap(group => group.tokens);
  
  if (allTokens.length === 0) {
    return null;
  }
  
  return (
    <div className={cn("space-y-1", className)}>
      <span className="text-[10px] font-medium text-muted-foreground mb-1 block">Theme Colors</span>
      <div className="flex flex-wrap gap-1 justify-start">
        {allTokens.map((token) => (
          <TooltipProvider key={token.name} delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleColorSelect(token.name, token.value)}
                  className={cn(
                    "w-5 h-5 rounded border-2 transition-all hover:scale-110 flex-shrink-0",
                    isActive(token.name, token.value)
                      ? "border-primary ring-1 ring-primary"
                      : "border-border"
                  )}
                  style={{ backgroundColor: token.value }}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <span className="font-mono">--{token.name}</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
}

/**
 * Compact version of theme color swatches - shows just color buttons in a row
 */
export function ThemeColorSwatchesCompact({ currentValue, onColorSelect, className, returnTokenRef = true }: ThemeColorSwatchesProps) {
  const { getColorTokens, activeTokens } = useDesignTokenStore();
  
  const colorTokens = useMemo(() => {
    return getColorTokens();
  }, [getColorTokens, activeTokens]);
  
  const normalizeColor = (color: string): string => {
    if (!color) return '';
    return color.trim().toLowerCase();
  };
  
  const isActive = (tokenName: string, tokenValue: string) => {
    if (!currentValue) return false;
    
    // If currentValue is a TokenColorValue, check by tokenRef
    if (typeof currentValue === 'object' && 'tokenRef' in currentValue) {
      return currentValue.tokenRef === tokenName;
    }
    
    // Otherwise compare by hex value
    return normalizeColor(currentValue) === normalizeColor(tokenValue);
  };
  
  const handleColorSelect = (tokenName: string, tokenValue: string) => {
    if (returnTokenRef) {
      onColorSelect({ tokenRef: tokenName, value: tokenValue });
    } else {
      onColorSelect(tokenValue);
    }
  };
  
  if (colorTokens.length === 0) {
    return null;
  }
  
  // Get primary theme colors (max 8)
  const displayTokens = colorTokens.slice(0, 8);
  
  return (
    <div className={cn("space-y-1", className)}>
      <span className="text-[10px] font-medium text-muted-foreground">Theme Colors</span>
      <div className="flex flex-wrap gap-1 justify-start">
        {displayTokens.map((token) => (
          <TooltipProvider key={token.name} delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleColorSelect(token.name, token.value)}
                  className={cn(
                    "w-5 h-5 rounded border-2 transition-all hover:scale-110 flex-shrink-0",
                    isActive(token.name, token.value)
                      ? "border-primary ring-1 ring-primary"
                      : "border-border"
                  )}
                  style={{ backgroundColor: token.value }}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <span className="font-mono">--{token.name}</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
}
