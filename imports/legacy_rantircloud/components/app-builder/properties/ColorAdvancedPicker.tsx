import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/compact/Input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Variable } from 'lucide-react';
import { VariableBindingField } from './VariableBindingField';
import { useStylePropertyOrigin } from '@/hooks/useStylePropertyOrigin';
import { useDesignTokenStore } from '@/stores/designTokenStore';
import { TokenIndicatorPill } from '@/components/app-builder/design-system/TokenIndicatorPill';
import { ThemeColorSwatches, TokenColorValue } from '@/components/app-builder/design-system/ThemeColorSwatches';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { isTokenColorValue, resolveTokenColor } from '@/lib/tokenColorUtils';

interface ColorValue {
  type: 'solid' | 'gradient';
  value: string | TokenColorValue;  // Can be raw hex or token reference
  opacity?: number;
}

interface ColorAdvancedPickerProps {
  label: string;
  value: string | ColorValue;
  onChange: (value: ColorValue) => void;
  componentProps?: Record<string, any>;
  propertyName?: string;
}

export function ColorAdvancedPicker({ label, value, onChange, componentProps, propertyName }: ColorAdvancedPickerProps) {
  const { getPropertyOrigin } = useStylePropertyOrigin(componentProps);
  // Subscribe to activeTokens to trigger re-render when design system colors change
  const { getTokenIndicator, getColorTokens, activeTokens } = useDesignTokenStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showVariableBinding, setShowVariableBinding] = useState(false);
  
  // Parse current value
  const currentValue: ColorValue = useMemo(() => {
    if (typeof value === 'string') {
      return { type: 'solid' as const, value: value || '#000000', opacity: 100 };
    }
    return value || { type: 'solid' as const, value: '#000000', opacity: 100 };
  }, [value]);
  
  // Get the resolved display color (resolves token refs to current values)
  const displayColor = useMemo(() => {
    if (typeof currentValue.value === 'string') {
      return currentValue.value;
    }
    return resolveTokenColor(currentValue.value, activeTokens);
  }, [currentValue.value, activeTokens]);
  
  // Get property origin for coloring
  const propertyPath = propertyName || label.toLowerCase().replace(/\s+/g, '');
  const originInfo = getPropertyOrigin(propertyPath, displayColor);
  
  // Check if controlled by a design token (by tokenRef or value match)
  const tokenInfo = useMemo(() => {
    // If value has tokenRef, it's definitely token-controlled
    if (isTokenColorValue(currentValue.value)) {
      return {
        isTokenControlled: true,
        tokenName: currentValue.value.tokenRef,
        tokenValue: resolveTokenColor(currentValue.value, activeTokens)
      };
    }
    // Fall back to value matching
    return getTokenIndicator(propertyPath, displayColor);
  }, [currentValue.value, getTokenIndicator, propertyPath, displayColor, activeTokens]);

  // Check if theme has colors (recalculated when activeTokens changes)
  const colorTokens = useMemo(() => getColorTokens(), [getColorTokens, activeTokens]);
  const hasThemeColors = colorTokens.length > 0;
  
  const handleColorChange = (newColor: string | TokenColorValue) => {
    onChange({
      ...currentValue,
      value: newColor
    });
  };

  const handleOpacityChange = (opacity: number) => {
    onChange({
      ...currentValue,
      opacity
    });
  };

  const handleTypeChange = (type: 'solid' | 'gradient') => {
    onChange({
      ...currentValue,
      type,
      value: type === 'gradient' 
        ? 'linear-gradient(90deg, #000000 0%, #ffffff 100%)'
        : '#000000'
    });
  };

  // Preset colors - always show these alongside theme colors
  const presetColors = [
    '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981'
  ];

  if (showVariableBinding) {
    return (
      <div className="space-y-2">
        <VariableBindingField
          label={label}
          value={displayColor}
          onChange={(val) => {
            onChange({ ...currentValue, value: val });
            setShowVariableBinding(false);
          }}
          type="color"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowVariableBinding(false)}
          className="text-xs"
        >
          Back to color picker
        </Button>
      </div>
    );
  }

  // Check if this is an inherited value from parent
  const isParentInherited = originInfo.origin === 'parent';
  const isClassInherited = originInfo.origin === 'inherited';
  const isLocalOverride = originInfo.origin === 'active';

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        {/* Parent inheritance indicator dot */}
        {(isParentInherited || isClassInherited) && (
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" title={originInfo.tooltip} />
        )}
        {isLocalOverride && originInfo.className && (
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title={originInfo.tooltip} />
        )}
        <span className="text-xs uppercase text-muted-foreground">{label}</span>
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowVariableBinding(true)}
          className="h-6 w-6 p-0"
        >
          <Variable className="h-3 w-3" />
        </Button>
        
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                  <button className={cn(
                    "flex items-center gap-2 bg-muted/50 hover:bg-muted border border-border rounded px-2 transition-colors h-8",
                    tokenInfo.isTokenControlled && "border-primary/50",
                    isParentInherited && "border-yellow-500/50",
                    isLocalOverride && originInfo.className && "border-blue-500/50"
                  )}>
                    <div 
                      className="w-5 h-5 rounded border border-border/50"
                      style={{ 
                        backgroundColor: currentValue.type === 'solid' ? displayColor : undefined,
                        background: currentValue.type === 'gradient' ? displayColor : undefined,
                        opacity: (currentValue.opacity || 100) / 100
                      }}
                    />
                    {tokenInfo.isTokenControlled && tokenInfo.tokenName ? (
                      <TokenIndicatorPill tokenName={tokenInfo.tokenName} size="sm" />
                    ) : (
                      <span className="text-sm" style={{ color: originInfo.color }}>{displayColor?.slice(0, 7) || 'black'}</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4 max-h-[450px] overflow-y-auto" align="end">
                  <Tabs value={currentValue.type} onValueChange={handleTypeChange}>
                    <TabsList className="w-fit">
                      <TabsTrigger value="solid">Solid</TabsTrigger>
                      <TabsTrigger value="gradient">Gradient</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="solid" className="space-y-3">
                      {/* Theme Colors Section */}
                      {hasThemeColors && (
                        <ThemeColorSwatches
                          currentValue={currentValue.value}
                          onColorSelect={handleColorChange}
                        />
                      )}
                      
                      {/* Preset Colors - always show */}
                      <div className="pt-2 border-t border-border/50">
                        <span className="text-[10px] font-medium text-muted-foreground mb-1 block">Presets</span>
                        <div className="flex flex-wrap gap-1 justify-start">
                          {presetColors.map((color) => (
                            <button
                              key={color}
                              onClick={() => handleColorChange(color)}
                              className={cn(
                                "w-5 h-5 rounded border transition-all hover:scale-110 flex-shrink-0",
                                displayColor === color ? "border-primary ring-1 ring-primary" : "border-border"
                              )}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                      
                      {/* Opacity Slider */}
                      <div className="space-y-1 pt-2 border-t border-border/50">
                        <Label className="text-xs">Opacity: {currentValue.opacity || 100}%</Label>
                        <Slider
                          value={[currentValue.opacity || 100]}
                          onValueChange={(values) => handleOpacityChange(values[0])}
                          min={0}
                          max={100}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="gradient" className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Gradient</Label>
                        <Input
                          value={displayColor}
                          onChange={(e) => handleColorChange(e.target.value)}
                          placeholder="linear-gradient(90deg, #000000 0%, #ffffff 100%)"
                          className="h-6 text-xs"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs">Preset Gradients</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                            'linear-gradient(90deg, #f093fb 0%, #f5576c 100%)',
                            'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)',
                            'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)'
                          ].map((gradient, index) => (
                            <button
                              key={index}
                              onClick={() => handleColorChange(gradient)}
                              className="h-6 rounded border"
                              style={{ background: gradient }}
                            />
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </PopoverContent>
              </Popover>
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
    </div>
  );
}