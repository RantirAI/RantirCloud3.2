import React, { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/compact/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/compact/Select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Maximize2, Square } from 'lucide-react';
import { useStylePropertyOrigin } from '@/hooks/useStylePropertyOrigin';
import { useDesignTokenStore } from '@/stores/designTokenStore';
import { getBorderRadiusTokenForComponent } from '@/lib/designTokenResolver';

interface BorderRadiusValues {
  topLeft: string;
  topRight: string;
  bottomRight: string;
  bottomLeft: string;
  unit: 'px' | 'rem' | 'em' | '%';
}

interface VisualBorderRadiusEditorProps {
  label: string;
  value: BorderRadiusValues;
  onChange: (value: BorderRadiusValues) => void;
  componentProps?: Record<string, any>;
  componentType?: string;
}

export function VisualBorderRadiusEditor({ label, value, onChange, componentProps, componentType }: VisualBorderRadiusEditorProps) {
  const { getPropertyOrigin } = useStylePropertyOrigin(componentProps, componentType);
  const { activeTokens } = useDesignTokenStore();
  
  const defaultRadius: BorderRadiusValues = { topLeft: '0', topRight: '0', bottomRight: '0', bottomLeft: '0', unit: 'px' };
  const currentValue: BorderRadiusValues = value || defaultRadius;
  
  const [popoverOpen, setPopoverOpen] = useState<string | null>(null);
  
  // Check if a design token provides a default radius for this component type
  const tokenDefault = useMemo(() => {
    if (!componentType) return null;
    const tokenName = getBorderRadiusTokenForComponent(componentType);
    if (!tokenName) return null;
    const token = activeTokens.get(tokenName);
    if (!token?.value) return null;
    // Parse the px value
    const px = parseInt(token.value) || 0;
    return { tokenName, value: String(px) };
  }, [componentType, activeTokens]);
  
  // Determine if the current value is all zeros (no explicit override)
  const isAllZeros = currentValue.topLeft === '0' && currentValue.topRight === '0' && 
                     currentValue.bottomRight === '0' && currentValue.bottomLeft === '0';
  
  // If there's a token default and no explicit override, show the token value
  const isTokenControlled = !!(tokenDefault && isAllZeros);
  
  const areAllValuesSame = (vals: BorderRadiusValues) => 
    vals && vals.topLeft === vals.topRight && vals.topRight === vals.bottomRight && vals.bottomRight === vals.bottomLeft;
  
  const [linked, setLinked] = useState(areAllValuesSame(currentValue));

  // Get property origin for border radius
  const radiusOrigin = useMemo(() => getPropertyOrigin('borderRadius', currentValue), [getPropertyOrigin, currentValue]);
  
  // Get the appropriate colors based on origin
  const getLabelColor = () => {
    if (isTokenControlled) return 'text-[#9333ea]'; // Purple for token-controlled
    if (radiusOrigin.origin === 'active') return 'text-[#1677ff]';
    if (radiusOrigin.origin === 'inherited' || radiusOrigin.origin === 'parent') return 'text-[#d9a800]';
    return 'text-muted-foreground';
  };
  
  const getIconColor = () => {
    if (isTokenControlled) return 'text-[#9333ea]';
    if (radiusOrigin.origin === 'active') return 'text-[#1677ff]';
    if (radiusOrigin.origin === 'inherited' || radiusOrigin.origin === 'parent') return 'text-[#d9a800]';
    return 'text-primary';
  };
  
  // Display value: show token default when token-controlled
  const getDisplayValue = (corner: keyof Omit<BorderRadiusValues, 'unit'>) => {
    if (isTokenControlled && tokenDefault) return tokenDefault.value;
    return currentValue[corner] || '0';
  };

  const handleValueChange = (corner: keyof Omit<BorderRadiusValues, 'unit'>, newValue: string) => {
    const numericOnly = newValue.replace(/\D/g, '');
    const processedValue = numericOnly === '' ? '0' : numericOnly.replace(/^0+(?=\d)/, '');
    
    let newRadius: BorderRadiusValues;
    if (linked) {
      newRadius = {
        ...currentValue,
        topLeft: processedValue,
        topRight: processedValue,
        bottomRight: processedValue,
        bottomLeft: processedValue,
      };
    } else {
      newRadius = {
        ...currentValue,
        [corner]: processedValue,
      };
    }

    onChange(newRadius);
  };

  const handleUnitChange = (unit: BorderRadiusValues['unit']) => {
    onChange({ ...currentValue, unit });
  };

  const toggleLink = () => {
    const newLinkedState = !linked;
    setLinked(newLinkedState);
    
    if (newLinkedState && currentValue) {
      const newRadius = {
        ...currentValue,
        topRight: currentValue.topLeft,
        bottomRight: currentValue.topLeft,
        bottomLeft: currentValue.topLeft,
      };
      
      onChange(newRadius);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label className={cn("text-sm font-normal", getLabelColor())}>Radius</Label>
          {isTokenControlled && tokenDefault && (
            <span className="text-[9px] text-[#9333ea] bg-[#9333ea]/10 px-1.5 py-0.5 rounded-full font-medium">
              {tokenDefault.tokenName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLinked(false)}
            className={cn(
              "w-6 h-6 rounded border flex items-center justify-center transition-colors",
              !linked ? "bg-muted border-border" : "bg-transparent border-border/30 hover:bg-muted/50"
            )}
            title="Independent corners"
          >
            <Square className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={toggleLink}
            className={cn(
              "w-6 h-6 rounded border flex items-center justify-center transition-colors",
              linked ? "bg-muted border-border" : "bg-transparent border-border/30 hover:bg-muted/50"
            )}
            title="Link all corners"
          >
            <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <div className="w-px h-6 bg-border" />
          <div className="flex items-center gap-1 bg-muted/30 rounded px-2 py-1 min-w-[60px]">
            <span className={cn("text-sm tabular-nums", isTokenControlled ? "text-[#9333ea]" : "text-muted-foreground")}>
              {linked ? getDisplayValue('topLeft') : '-'}
            </span>
            <span className="text-xs text-muted-foreground uppercase">
              {currentValue.unit}
            </span>
          </div>
        </div>
      </div>
      
      <div className="bg-muted/30 rounded border border-border p-3">
        <div className="grid grid-cols-2 gap-2">
          {/* Top Left */}
          <div>
            <Popover open={popoverOpen === 'topLeft'} onOpenChange={(open) => setPopoverOpen(open ? 'topLeft' : null)}>
              <PopoverTrigger asChild>
                <button className="w-full bg-muted/50 hover:bg-muted border border-border rounded px-2 py-1.5 flex items-center justify-between transition-colors">
                  <Maximize2 className={cn("h-3 w-3 rotate-180", getIconColor())} />
                  <div className="flex items-center gap-1">
                    <span className={cn("text-sm tabular-nums", isTokenControlled && "text-[#9333ea]")}>{getDisplayValue('topLeft')}</span>
                    <span className="text-xs text-muted-foreground uppercase">{currentValue.unit}</span>
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2 bg-popover border z-50" align="center">
                <div className="space-y-1.5">
                  <Label className="text-xs">Top Left</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={currentValue.topLeft || '0'}
                      onChange={(e) => handleValueChange('topLeft', e.target.value)}
                      className="w-14 h-6 text-center text-xs"
                      autoFocus
                    />
                    <Select value={currentValue.unit} onValueChange={handleUnitChange}>
                      <SelectTrigger className="w-14 h-6 bg-background border z-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border z-50">
                        <SelectItem value="px">PX</SelectItem>
                        <SelectItem value="rem">REM</SelectItem>
                        <SelectItem value="em">EM</SelectItem>
                        <SelectItem value="%">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Top Right */}
          <div>
            <Popover open={popoverOpen === 'topRight'} onOpenChange={(open) => setPopoverOpen(open ? 'topRight' : null)}>
              <PopoverTrigger asChild>
                <button className="w-full bg-muted/50 hover:bg-muted border border-border rounded px-2 py-1.5 flex items-center justify-between transition-colors">
                  <Maximize2 className={cn("h-3 w-3 -rotate-90", getIconColor())} />
                  <div className="flex items-center gap-1">
                    <span className={cn("text-sm tabular-nums", isTokenControlled && "text-[#9333ea]")}>{getDisplayValue('topRight')}</span>
                    <span className="text-xs text-muted-foreground uppercase">{currentValue.unit}</span>
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2 bg-popover border z-50" align="center">
                <div className="space-y-1.5">
                  <Label className="text-xs">Top Right</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={currentValue.topRight || '0'}
                      onChange={(e) => handleValueChange('topRight', e.target.value)}
                      className="w-14 h-6 text-center text-xs"
                      autoFocus
                    />
                    <Select value={currentValue.unit} onValueChange={handleUnitChange}>
                      <SelectTrigger className="w-14 h-6 bg-background border z-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border z-50">
                        <SelectItem value="px">PX</SelectItem>
                        <SelectItem value="rem">REM</SelectItem>
                        <SelectItem value="em">EM</SelectItem>
                        <SelectItem value="%">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Bottom Left */}
          <div>
            <Popover open={popoverOpen === 'bottomLeft'} onOpenChange={(open) => setPopoverOpen(open ? 'bottomLeft' : null)}>
              <PopoverTrigger asChild>
                <button className="w-full bg-muted/50 hover:bg-muted border border-border rounded px-2 py-1.5 flex items-center justify-between transition-colors">
                  <Maximize2 className={cn("h-3 w-3 rotate-90", getIconColor())} />
                  <div className="flex items-center gap-1">
                    <span className={cn("text-sm tabular-nums", isTokenControlled && "text-[#9333ea]")}>{getDisplayValue('bottomLeft')}</span>
                    <span className="text-xs text-muted-foreground uppercase">{currentValue.unit}</span>
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2 bg-popover border z-50" align="center">
                <div className="space-y-1.5">
                  <Label className="text-xs">Bottom Left</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={currentValue.bottomLeft || '0'}
                      onChange={(e) => handleValueChange('bottomLeft', e.target.value)}
                      className="w-14 h-6 text-center text-xs"
                      autoFocus
                    />
                    <Select value={currentValue.unit} onValueChange={handleUnitChange}>
                      <SelectTrigger className="w-14 h-6 bg-background border z-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border z-50">
                        <SelectItem value="px">PX</SelectItem>
                        <SelectItem value="rem">REM</SelectItem>
                        <SelectItem value="em">EM</SelectItem>
                        <SelectItem value="%">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Bottom Right */}
          <div>
            <Popover open={popoverOpen === 'bottomRight'} onOpenChange={(open) => setPopoverOpen(open ? 'bottomRight' : null)}>
              <PopoverTrigger asChild>
                <button className="w-full bg-muted/50 hover:bg-muted border border-border rounded px-2 py-1.5 flex items-center justify-between transition-colors">
                  <Maximize2 className={cn("h-3 w-3", getIconColor())} />
                  <div className="flex items-center gap-1">
                    <span className={cn("text-sm tabular-nums", isTokenControlled && "text-[#9333ea]")}>{getDisplayValue('bottomRight')}</span>
                    <span className="text-xs text-muted-foreground uppercase">{currentValue.unit}</span>
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2 bg-popover border z-50" align="center">
                <div className="space-y-1.5">
                  <Label className="text-xs">Bottom Right</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={currentValue.bottomRight || '0'}
                      onChange={(e) => handleValueChange('bottomRight', e.target.value)}
                      className="w-14 h-6 text-center text-xs"
                      autoFocus
                    />
                    <Select value={currentValue.unit} onValueChange={handleUnitChange}>
                      <SelectTrigger className="w-14 h-6 bg-background border z-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border z-50">
                        <SelectItem value="px">PX</SelectItem>
                        <SelectItem value="rem">REM</SelectItem>
                        <SelectItem value="em">EM</SelectItem>
                        <SelectItem value="%">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
}
