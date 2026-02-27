/**
 * Spacing Token Section
 * Manages spacing scale tokens (8px grid system)
 */

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useDesignSystemStore } from '@/stores/designSystemStore';
import { cn } from '@/lib/utils';

export function SpacingTokenSection() {
  const { config, updateSpacingToken, addSpacingToken, removeSpacingToken, updateSectionGap, updateGridGap } = useDesignSystemStore();
  
  if (!config) return null;

  const spacingScale = config.spacing.scale;
  const baseUnit = config.spacing.baseUnit;

  const handlePixelChange = (id: string, pixels: number) => {
    const value = `${pixels / 16}rem`;
    updateSpacingToken(id, { pixels, value });
  };

  const handleAddToken = () => {
    const nextName = `${spacingScale.length + 1}xl`;
    const nextPixels = (spacingScale.length + 1) * baseUnit * 2;
    
    addSpacingToken({
      name: nextName,
      cssVar: `--spacing-${nextName}`,
      value: `${nextPixels / 16}rem`,
      pixels: nextPixels,
      category: 'large',
      isActive: true,
    });
  };

  return (
    <div className="space-y-4">
      {/* Base Unit Info */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Base unit:</span>
        <Badge variant="outline">{baseUnit}px</Badge>
      </div>

      {/* Spacing Scale */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Spacing Scale</Label>
        <div className="space-y-1.5">
          {spacingScale.map(token => (
            <div
              key={token.id}
              className="group flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
            >
              <div className="w-12 text-xs font-mono text-muted-foreground">
                {token.name}
              </div>
              
              <div className="flex-1 flex items-center gap-2">
                <div
                  className="h-3 bg-primary/30 rounded transition-all"
                  style={{ width: `${Math.min(token.pixels, 120)}px` }}
                />
                <Input
                  type="number"
                  value={token.pixels}
                  onChange={e => handlePixelChange(token.id, parseInt(e.target.value) || 0)}
                  className="w-14 h-6 text-xs px-1.5"
                  min={0}
                  max={256}
                  step={baseUnit}
                />
                <span className="text-xs text-muted-foreground w-14">{token.value}</span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeSpacingToken(token.id)}
              >
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddToken}
          className="w-full h-7 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Spacing Token
        </Button>
      </div>

      {/* Layout Defaults */}
      <div className="space-y-3 pt-2 border-t">
        <Label className="text-xs font-medium">Layout Defaults</Label>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Section Gap</span>
            <Input
              value={config.spacing.sectionGap}
              onChange={e => updateSectionGap(e.target.value)}
              className="w-20 h-6 text-xs px-2"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Grid Gap</span>
            <Input
              value={config.spacing.gridGap}
              onChange={e => updateGridGap(e.target.value)}
              className="w-20 h-6 text-xs px-2"
            />
          </div>
        </div>
      </div>

      {/* Container Padding */}
      <div className="space-y-3 pt-2 border-t">
        <Label className="text-xs font-medium">Container Padding</Label>
        
        <div className="space-y-2">
          {(['desktop', 'tablet', 'mobile'] as const).map(bp => (
            <div key={bp} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground capitalize">{bp}</span>
              <Input
                value={config.spacing.containerPadding[bp]}
                onChange={e => useDesignSystemStore.getState().updateContainerPadding(bp, e.target.value)}
                className="w-20 h-6 text-xs px-2"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
