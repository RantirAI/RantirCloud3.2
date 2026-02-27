/**
 * Breakpoint Token Section
 * Manages responsive breakpoint configuration
 */

import React from 'react';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useDesignSystemStore } from '@/stores/designSystemStore';
import { cn } from '@/lib/utils';

const BREAKPOINT_ICONS = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
};

export function BreakpointTokenSection() {
  const { config, updateBreakpointToken } = useDesignSystemStore();
  
  if (!config) return null;

  const breakpoints = config.breakpoints.breakpoints;

  return (
    <div className="space-y-4">
      {/* Breakpoint List */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Responsive Breakpoints</Label>
        <div className="space-y-2">
          {breakpoints.map(bp => {
            const Icon = BREAKPOINT_ICONS[bp.name] || Monitor;
            
            return (
              <div
                key={bp.id}
                className={cn(
                  'p-3 rounded-lg border bg-background transition-colors',
                  !bp.isActive && 'opacity-50'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{bp.label}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {bp.name}
                    </Badge>
                  </div>
                  <Switch
                    checked={bp.isActive}
                    onCheckedChange={checked => updateBreakpointToken(bp.id, { isActive: checked })}
                    className="scale-75"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Min Width</Label>
                    <Input
                      type="number"
                      value={bp.minWidth}
                      onChange={e => updateBreakpointToken(bp.id, { minWidth: parseInt(e.target.value) || 0 })}
                      className="h-6 text-xs"
                      disabled={bp.name === 'mobile'}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Max Width</Label>
                    <Input
                      type="number"
                      value={bp.maxWidth ?? ''}
                      onChange={e => updateBreakpointToken(bp.id, { maxWidth: e.target.value ? parseInt(e.target.value) : null })}
                      className="h-6 text-xs"
                      placeholder="∞"
                      disabled={bp.name === 'desktop'}
                    />
                  </div>
                </div>

                <div className="mt-2 text-[10px] font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                  {bp.cssMediaQuery}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Canvas Widths */}
      <div className="space-y-2 pt-2 border-t">
        <Label className="text-xs font-medium">Canvas Preview Widths</Label>
        <div className="space-y-1.5">
          {breakpoints.map(bp => {
            const Icon = BREAKPOINT_ICONS[bp.name] || Monitor;
            
            return (
              <div key={bp.id} className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="w-16 text-xs text-muted-foreground">{bp.label}</span>
                <Input
                  type="number"
                  value={bp.canvasWidth}
                  onChange={e => updateBreakpointToken(bp.id, { canvasWidth: parseInt(e.target.value) || 320 })}
                  className="h-6 text-xs flex-1"
                  min={320}
                  max={2560}
                />
                <span className="text-[10px] text-muted-foreground">px</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info */}
      <div className="text-[10px] text-muted-foreground p-2 bg-muted/30 rounded">
        <strong>Desktop-first:</strong> Base styles apply to all sizes. 
        Tablet and mobile breakpoints override desktop using max-width media queries.
      </div>
    </div>
  );
}
