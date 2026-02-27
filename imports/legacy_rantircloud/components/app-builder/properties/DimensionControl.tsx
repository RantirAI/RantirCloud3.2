import React, { useMemo } from 'react';
import { Input } from '@/components/ui/compact/Input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/compact/Select';
import { cn } from '@/lib/utils';
import { useStylePropertyOrigin } from '@/hooks/useStylePropertyOrigin';
import { useDesignTokenStore } from '@/stores/designTokenStore';
import { TokenIndicatorPill } from '@/components/app-builder/design-system/TokenIndicatorPill';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Smartphone, Tablet } from 'lucide-react';
import { Breakpoint } from '@/lib/breakpoints';

interface DimensionValue {
  value: string;
  unit: 'auto' | 'px' | '%' | 'rem' | 'em' | 'vh' | 'vw';
}

interface DimensionControlProps {
  label: string;
  value: DimensionValue | string | number | undefined;
  onChange: (value: DimensionValue) => void;
  allowAuto?: boolean;
  componentProps?: Record<string, any>;
  propertyName?: string;
  currentBreakpoint?: Breakpoint;
  hasBreakpointOverride?: boolean;
}

// Helper to normalize various dimension formats to structured object
function normalizeDimensionValue(value: DimensionValue | string | number | undefined): DimensionValue {
  if (!value) return { value: '', unit: 'auto' };
  
  // Already in correct format
  if (typeof value === 'object' && value !== null && 'value' in value && 'unit' in value) {
    return value as DimensionValue;
  }
  
  const str = String(value).trim();
  
  // Handle special keywords
  if (str === 'auto' || str === 'none' || str === '') {
    return { value: '', unit: 'auto' };
  }
  
  if (str === 'fit-content' || str === 'min-content' || str === 'max-content') {
    return { value: str, unit: 'auto' };
  }
  
  // Parse numeric values with units (e.g., "100px", "50%", "2rem")
  const match = str.match(/^(-?[\d.]+)(px|%|rem|em|vh|vw)?$/);
  if (match) {
    return { 
      value: match[1], 
      unit: (match[2] || 'px') as DimensionValue['unit'] 
    };
  }
  
  // Pure number
  if (!isNaN(Number(str))) {
    return { value: str, unit: 'px' };
  }
  
  // Fallback: extract any numbers
  const numMatch = str.match(/-?[\d.]+/);
  return { value: numMatch ? numMatch[0] : '', unit: 'px' };
}

export function DimensionControl({ label, value, onChange, allowAuto = true, componentProps, propertyName, currentBreakpoint, hasBreakpointOverride }: DimensionControlProps) {
  const { getPropertyOrigin } = useStylePropertyOrigin(componentProps);
  const { getTokenIndicator } = useDesignTokenStore();
  
  // Normalize value to handle both string and object formats
  const normalizedValue = useMemo(() => normalizeDimensionValue(value), [value]);
  
  const units = allowAuto 
    ? ['auto', 'px', '%', 'rem', 'em', 'vh', 'vw']
    : ['px', '%', 'rem', 'em', 'vh', 'vw'];

  const handleValueChange = (newValue: string) => {
    onChange({ ...normalizedValue, value: newValue });
  };

  const handleUnitChange = (newUnit: DimensionValue['unit']) => {
    onChange({ ...normalizedValue, unit: newUnit });
  };

  const isAuto = normalizedValue.unit === 'auto';
  
  // Get property origin for coloring
  const propertyPath = propertyName || label.toLowerCase().replace(/\s+/g, '');
  const fullValue = isAuto ? 'auto' : `${normalizedValue.value}${normalizedValue.unit}`;
  const originInfo = getPropertyOrigin(propertyPath, fullValue);
  
  // Check if controlled by a design token (e.g., border-radius tokens)
  const tokenInfo = getTokenIndicator(propertyPath, fullValue);
  
  // Determine label color - blue for breakpoint override
  const labelColor = hasBreakpointOverride && currentBreakpoint !== 'desktop' 
    ? '#1677ff' 
    : (tokenInfo.isTokenControlled ? '#a855f7' : originInfo.color);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Label className="text-xs text-muted-foreground" style={{ color: labelColor }}>{label}</Label>
        {hasBreakpointOverride && currentBreakpoint !== 'desktop' && (
          <Tooltip>
            <TooltipTrigger asChild>
              {currentBreakpoint === 'tablet' ? (
                <Tablet className="h-3 w-3 text-blue-500" />
              ) : (
                <Smartphone className="h-3 w-3 text-blue-500" />
              )}
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Overridden at {currentBreakpoint}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="flex gap-1">
        <div className="flex-1">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Input
                    value={isAuto ? 'auto' : normalizedValue.value}
                    onChange={(e) => handleValueChange(e.target.value)}
                    placeholder="0"
                    disabled={isAuto}
                    style={{ color: tokenInfo.isTokenControlled ? '#a855f7' : originInfo.color }}
                    className={cn(
                      "h-6 text-center pr-14",
                      isAuto && "bg-muted",
                      tokenInfo.isTokenControlled && "border-purple-500/50"
                    )}
                  />
                  {tokenInfo.isTokenControlled && tokenInfo.tokenName && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2">
                      <TokenIndicatorPill tokenName={tokenInfo.tokenName} size="sm" />
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {tokenInfo.isTokenControlled 
                    ? `Token: ${tokenInfo.tokenName}` 
                    : originInfo.tooltip
                  }
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {!tokenInfo.isTokenControlled && (
          <Select value={normalizedValue.unit} onValueChange={handleUnitChange}>
            <SelectTrigger className="h-6 w-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              {units.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}