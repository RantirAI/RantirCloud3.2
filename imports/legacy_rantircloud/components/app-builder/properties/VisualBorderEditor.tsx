import React, { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/compact/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/compact/Select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Square, X, Minus } from 'lucide-react';
import { ThemeColorSwatches, TokenColorValue } from '@/components/app-builder/design-system/ThemeColorSwatches';
import { useStylePropertyOrigin } from '@/hooks/useStylePropertyOrigin';
import { useDesignTokenStore } from '@/stores/designTokenStore';
import { isTokenColorValue, resolveTokenColor } from '@/lib/tokenColorUtils';

interface BorderValues {
  width: string;
  style: 'none' | 'solid' | 'dashed' | 'dotted';
  color: string | TokenColorValue;  // Can be raw hex or token reference
  unit: 'px' | 'rem' | 'em';
  sides: {
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
  };
}

interface VisualBorderEditorProps {
  label: string;
  value: BorderValues;
  onChange: (value: BorderValues) => void;
  componentProps?: Record<string, any>;
  componentType?: string;
}
const borderStyles = [{
  value: 'none',
  label: 'None',
  icon: X
}, {
  value: 'solid',
  label: 'Solid',
  icon: Minus
}, {
  value: 'dashed',
  label: 'Dashed',
  icon: Minus
}, {
  value: 'dotted',
  label: 'Dotted',
  icon: Minus
}] as const;
export function VisualBorderEditor({
  label,
  value,
  onChange,
  componentProps,
  componentType
}: VisualBorderEditorProps) {
  const { getPropertyOrigin } = useStylePropertyOrigin(componentProps, componentType);
  // Subscribe to activeTokens to trigger re-render when design system colors change
  const { activeTokens } = useDesignTokenStore();
  
  const defaultBorder: BorderValues = {
    width: '0',
    style: 'none',
    color: '#000000',
    unit: 'px',
    sides: {
      top: false,
      right: false,
      bottom: false,
      left: false
    }
  };
  const currentValue: BorderValues = {
    ...defaultBorder,
    ...value,
    sides: {
      ...defaultBorder.sides,
      ...(value?.sides || {})
    }
  };
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false);

  // Get property origins for each border property
  const styleOrigin = useMemo(() => getPropertyOrigin('border.style', currentValue.style), [getPropertyOrigin, currentValue.style]);
  const widthOrigin = useMemo(() => getPropertyOrigin('border.width', currentValue.width), [getPropertyOrigin, currentValue.width]);
  const colorOrigin = useMemo(() => getPropertyOrigin('border.color', currentValue.color), [getPropertyOrigin, currentValue.color]);
  
  // Get the appropriate text color class based on origin
  const getLabelColor = (origin: { color: string; origin: string }) => {
    if (origin.origin === 'active') return 'text-[#1677ff]';
    if (origin.origin === 'inherited' || origin.origin === 'parent') return 'text-[#d9a800]';
    return 'text-muted-foreground';
  };
  const handleWidthChange = (newValue: string) => {
    const numericOnly = newValue.replace(/\D/g, '');
    const processedValue = numericOnly === '' ? '0' : numericOnly.replace(/^0+(?=\d)/, '');
    
    // If setting a non-zero width, auto-enable style and sides if not set
    const needsAutoEnable = processedValue !== '0' && !Object.values(currentValue.sides).some(Boolean);
    
    onChange({
      ...currentValue,
      width: processedValue,
      // Auto-enable solid style if currently none
      style: needsAutoEnable && currentValue.style === 'none' ? 'solid' : currentValue.style,
      // Auto-enable all sides if none are enabled
      sides: needsAutoEnable ? { top: true, right: true, bottom: true, left: true } : currentValue.sides
    });
  };
  
  const handleStyleChange = (newStyle: BorderValues['style']) => {
    // If changing to a visible style, auto-enable sides if none are enabled
    const needsAutoEnable = newStyle !== 'none' && !Object.values(currentValue.sides).some(Boolean);
    
    onChange({
      ...currentValue,
      style: newStyle,
      // Auto-enable all sides if switching to a visible style
      sides: needsAutoEnable ? { top: true, right: true, bottom: true, left: true } : currentValue.sides,
      // Auto-set a default width if still 0
      width: needsAutoEnable && (currentValue.width === '0' || !currentValue.width) ? '1' : currentValue.width
    });
  };
  
  const handleColorChange = (newColor: string | TokenColorValue) => {
    // If setting a color, auto-enable style and sides if not set
    const needsAutoEnable = !Object.values(currentValue.sides).some(Boolean);
    
    onChange({
      ...currentValue,
      color: newColor,
      // Auto-enable solid style if currently none
      style: needsAutoEnable && currentValue.style === 'none' ? 'solid' : currentValue.style,
      // Auto-enable all sides if none are enabled  
      sides: needsAutoEnable ? { top: true, right: true, bottom: true, left: true } : currentValue.sides,
      // Auto-set a default width if still 0
      width: needsAutoEnable && (currentValue.width === '0' || !currentValue.width) ? '1' : currentValue.width
    });
  };
  
  // Get the resolved color value for display (resolve token refs)
  const displayColor = useMemo(() => {
    return resolveTokenColor(currentValue.color, activeTokens);
  }, [currentValue.color, activeTokens]);
  const handleUnitChange = (newUnit: BorderValues['unit']) => {
    onChange({
      ...currentValue,
      unit: newUnit
    });
  };
  const handleSideToggle = (side: keyof BorderValues['sides']) => {
    onChange({
      ...currentValue,
      sides: {
        ...currentValue.sides,
        [side]: !currentValue.sides[side]
      }
    });
  };
  const toggleAllSides = () => {
    const allActive = Object.values(currentValue.sides).every(Boolean);
    onChange({
      ...currentValue,
      sides: {
        top: !allActive,
        right: !allActive,
        bottom: !allActive,
        left: !allActive
      }
    });
  };
  const allSidesActive = Object.values(currentValue.sides).every(Boolean);

  return <div className="space-y-3">
      
      <div className="flex gap-4">
        {/* 3x3 Grid Side Selector */}
        

        <div className="flex-1 space-y-2">
          {/* Style */}
          <div className="flex items-center justify-between">
            <span className={cn("text-xs uppercase", getLabelColor(styleOrigin))}>Style</span>
            <div className="flex gap-1">
              {borderStyles.map(style => {
              const isNone = style.value === 'none';
              const isDashed = style.value === 'dashed';
              const isDotted = style.value === 'dotted';
              return <button key={style.value} onClick={() => handleStyleChange(style.value)} className={cn("w-10 h-8 rounded border flex items-center justify-center transition-colors", currentValue.style === style.value ? "bg-muted border-border" : "bg-transparent border-border/30 hover:bg-muted/50")} title={style.label}>
                    {isNone ? <X className="h-4 w-4 text-muted-foreground" /> : isDashed ? <div className="w-5 border-t-2 border-dashed border-muted-foreground" /> : isDotted ? <div className="w-5 border-t-2 border-dotted border-muted-foreground" /> : <div className="w-5 border-t-2 border-muted-foreground" />}
                  </button>;
            })}
            </div>
          </div>

          {/* Width */}
          <div className="flex items-center justify-between">
            <span className={cn("text-xs uppercase", getLabelColor(widthOrigin))}>Width</span>
            <div className="flex items-center gap-0 bg-muted/50 rounded border border-border overflow-hidden h-8">
              <Input type="text" value={currentValue.width || '0'} onChange={e => handleWidthChange(e.target.value)} className="w-20 h-full text-center border-0 bg-transparent focus-visible:outline-0" />
              <span className="px-2 text-xs text-muted-foreground uppercase">{currentValue.unit}</span>
            </div>
          </div>

          {/* Color */}
          <div className="flex items-center justify-between">
            <span className={cn("text-xs uppercase", getLabelColor(colorOrigin))}>Color</span>
            <Popover open={colorPopoverOpen} onOpenChange={setColorPopoverOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 bg-muted/50 hover:bg-muted border border-border rounded px-2 transition-colors h-8">
                  <div className="w-5 h-5 rounded border border-border/50" style={{
                    backgroundColor: displayColor
                  }} />
                  <span className="text-xs font-mono truncate max-w-[80px]">
                    {isTokenColorValue(currentValue.color) ? `--${currentValue.color.tokenRef}` : (displayColor || '#000000')}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3 bg-popover border z-50 max-h-[350px] overflow-y-auto" align="end">
                <div className="space-y-3">
                  {/* Theme Color Swatches - show first for quick access */}
                  <ThemeColorSwatches
                    currentValue={currentValue.color}
                    onColorSelect={(color) => {
                      handleColorChange(color);
                      setColorPopoverOpen(false);
                    }}
                  />
                  
                  {/* Custom color inputs */}
                  <div className="pt-2 border-t border-border">
                    <span className="text-[10px] font-medium text-muted-foreground mb-2 block">CUSTOM COLOR</span>
                    <div className="flex gap-2">
                      <Input 
                        type="color" 
                        value={displayColor || '#000000'} 
                        onChange={e => handleColorChange(e.target.value)} 
                        className="w-10 h-7 p-0.5 border rounded cursor-pointer" 
                      />
                      <Input 
                        type="text" 
                        value={displayColor || ''} 
                        onChange={e => handleColorChange(e.target.value)} 
                        className="flex-1 h-7 text-xs font-mono" 
                        placeholder="#000000" 
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>;
}