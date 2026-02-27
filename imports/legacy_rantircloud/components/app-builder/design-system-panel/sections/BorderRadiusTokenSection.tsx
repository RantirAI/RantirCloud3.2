/**
 * Border Radius Token Section
 * Manages border radius scale tokens
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useDesignSystemStore } from '@/stores/designSystemStore';
import { cn } from '@/lib/utils';

/**
 * Individual radius slider row with local state during drag
 * to prevent lag from store updates on every frame.
 */
function RadiusSliderRow({ token, onCommit }: { 
  token: { id: string; name: string; pixels: number; value: string }; 
  onCommit: (id: string, pixels: number) => void;
}) {
  const displayPixels = token.pixels === 9999 ? 50 : Math.min(token.pixels, 50);
  const [localValue, setLocalValue] = useState(displayPixels);
  const isDragging = useRef(false);

  useEffect(() => {
    if (!isDragging.current) {
      setLocalValue(displayPixels);
    }
  }, [displayPixels]);

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-12 font-mono text-muted-foreground">{token.name}</span>
      <Slider
        value={[localValue]}
        onValueChange={([value]) => {
          isDragging.current = true;
          setLocalValue(value);
        }}
        onValueCommit={([value]) => {
          isDragging.current = false;
          onCommit(token.id, value === 50 ? 9999 : value);
        }}
        max={50}
        min={0}
        step={1}
        className="flex-1"
      />
      <Input
        type="number"
        value={token.pixels === 9999 ? 'full' : token.pixels}
        onChange={e => {
          const val = e.target.value;
          onCommit(token.id, val === 'full' || parseInt(val) > 100 ? 9999 : parseInt(val) || 0);
        }}
        className="w-14 h-6 text-xs px-1.5"
      />
    </div>
  );
}

export function BorderRadiusTokenSection() {
  const { config, updateBorderRadiusToken, addBorderRadiusToken, removeBorderRadiusToken } = useDesignSystemStore();
  
  if (!config) return null;

  const radiusScale = config.borderRadius.scale;

  const handlePixelChange = (id: string, pixels: number) => {
    updateBorderRadiusToken(id, { pixels, value: `${pixels}px` });
  };

  const handleAddToken = () => {
    const nextPixels = 32;
    
    addBorderRadiusToken({
      name: `custom-${Date.now()}`,
      cssVar: `--radius-custom-${Date.now()}`,
      value: `${nextPixels}px`,
      pixels: nextPixels,
      category: 'pronounced',
      isActive: true,
    });
  };

  return (
    <div className="space-y-4">
      {/* Radius Scale */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Radius Scale</Label>
        <div className="grid grid-cols-4 gap-2">
          {radiusScale.map(token => (
            <div
              key={token.id}
              className="group relative flex flex-col items-center p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
              title={`${token.name}: ${token.value}`}
            >
              <div
                className="w-10 h-10 border-2 border-primary/40 bg-primary/10 mb-1"
                style={{ borderRadius: token.value }}
              />
              <span className="text-[10px] font-mono text-muted-foreground">{token.name}</span>
              <span className="text-[9px] text-muted-foreground/60">{token.pixels === 9999 ? 'full' : `${token.pixels}px`}</span>
              
              {/* Quick edit on hover */}
              <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 bg-background border shadow-sm"
                  onClick={e => {
                    e.stopPropagation();
                    removeBorderRadiusToken(token.id);
                  }}
                >
                  <Trash2 className="h-2.5 w-2.5 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editable List */}
      <div className="space-y-1.5 pt-2 border-t">
        <Label className="text-xs font-medium text-muted-foreground">Edit Values</Label>
        {radiusScale.map(token => (
          <RadiusSliderRow
            key={token.id}
            token={token}
            onCommit={handlePixelChange}
          />
        ))}
      </div>

      {/* Component Defaults */}
      <div className="space-y-2 pt-2 border-t">
        <Label className="text-xs font-medium">Component Defaults</Label>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.entries(config.borderRadius.componentDefaults).map(([component, tokenName]) => (
            <div key={component} className="flex items-center justify-between">
              <span className="text-muted-foreground capitalize">{component}</span>
              <Badge variant="outline" className="text-[10px]">{tokenName}</Badge>
            </div>
          ))}
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleAddToken}
        className="w-full h-7 text-xs"
      >
        <Plus className="h-3 w-3 mr-1" />
        Add Radius Token
      </Button>
    </div>
  );
}
