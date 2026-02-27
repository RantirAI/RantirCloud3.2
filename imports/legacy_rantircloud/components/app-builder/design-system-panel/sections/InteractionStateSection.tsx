/**
 * Interaction State Section
 * Manages hover, active, focus, and disabled state configurations
 */

import React, { useState, useEffect, useRef } from 'react';
import { MousePointer, Focus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useDesignSystemStore } from '@/stores/designSystemStore';
import { cn } from '@/lib/utils';

export function InteractionStateSection() {
  const { config, updateInteractionConfig } = useDesignSystemStore();
  const [localDuration, setLocalDuration] = useState(150);
  const isDragging = useRef(false);

  const transitionDuration = config?.interactions?.transitionDuration || '150ms';
  const durationValue = parseInt(transitionDuration) || 150;

  useEffect(() => {
    if (!isDragging.current) {
      setLocalDuration(durationValue);
    }
  }, [durationValue]);
  
  if (!config) return null;

  const { transitionEasing, states } = config.interactions;

  const updateState = (stateName: keyof typeof states, property: string, value: string) => {
    updateInteractionConfig({
      states: {
        ...states,
        [stateName]: {
          ...states[stateName],
          [property]: value,
        },
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Transition Settings */}
      <div className="space-y-3">
        <Label className="text-xs font-medium">Transition Settings</Label>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Duration</span>
            <div className="flex items-center gap-2">
              <Slider
                value={[localDuration]}
                onValueChange={([value]) => {
                  isDragging.current = true;
                  setLocalDuration(value);
                }}
                onValueCommit={([value]) => {
                  isDragging.current = false;
                  updateInteractionConfig({ transitionDuration: `${value}ms` });
                }}
                min={0}
                max={500}
                step={25}
                className="w-24"
              />
              <span className="text-xs font-mono w-12 text-right">{localDuration}ms</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Easing</span>
            <Input
              value={transitionEasing}
              onChange={e => updateInteractionConfig({ transitionEasing: e.target.value })}
              className="w-32 h-6 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Hover State */}
      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-center gap-2">
          <MousePointer className="h-3.5 w-3.5 text-muted-foreground" />
          <Label className="text-xs font-medium">Hover State</Label>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">Opacity</Label>
            <Input
              value={states.hover.opacity || ''}
              onChange={e => updateState('hover', 'opacity', e.target.value)}
              className="h-6 text-xs"
              placeholder="1"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Transform</Label>
            <Input
              value={states.hover.transform || ''}
              onChange={e => updateState('hover', 'transform', e.target.value)}
              className="h-6 text-xs"
              placeholder="none"
            />
          </div>
        </div>
        
        {/* Hover Preview */}
        <div className="flex justify-center p-2">
          <button
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-xs font-medium transition-all"
            style={{
              transitionDuration,
              transitionTimingFunction: transitionEasing,
            }}
            onMouseEnter={e => {
              if (states.hover.opacity) e.currentTarget.style.opacity = states.hover.opacity;
              if (states.hover.transform) e.currentTarget.style.transform = states.hover.transform;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'none';
            }}
          >
            Hover me
          </button>
        </div>
      </div>

      {/* Active State */}
      <div className="space-y-2 pt-2 border-t">
        <Label className="text-xs font-medium">Active State</Label>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">Opacity</Label>
            <Input
              value={states.active.opacity || ''}
              onChange={e => updateState('active', 'opacity', e.target.value)}
              className="h-6 text-xs"
              placeholder="1"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Transform</Label>
            <Input
              value={states.active.transform || ''}
              onChange={e => updateState('active', 'transform', e.target.value)}
              className="h-6 text-xs"
              placeholder="none"
            />
          </div>
        </div>
      </div>

      {/* Focus State */}
      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-center gap-2">
          <Focus className="h-3.5 w-3.5 text-muted-foreground" />
          <Label className="text-xs font-medium">Focus State</Label>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">Ring Color</Label>
            <Input
              value={states.focus.ringColor || ''}
              onChange={e => updateState('focus', 'ringColor', e.target.value)}
              className="h-6 text-xs"
              placeholder="hsl(var(--ring))"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Ring Width</Label>
            <Input
              value={states.focus.ringWidth || ''}
              onChange={e => updateState('focus', 'ringWidth', e.target.value)}
              className="h-6 text-xs"
              placeholder="2px"
            />
          </div>
        </div>
      </div>

      {/* Disabled State */}
      <div className="space-y-2 pt-2 border-t">
        <Label className="text-xs font-medium">Disabled State</Label>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">Opacity</Label>
            <Input
              value={states.disabled.opacity}
              onChange={e => updateState('disabled', 'opacity', e.target.value)}
              className="h-6 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Cursor</Label>
            <Input
              value={states.disabled.cursor}
              onChange={e => updateState('disabled', 'cursor', e.target.value)}
              className="h-6 text-xs"
            />
          </div>
        </div>
        
        {/* Disabled Preview */}
        <div className="flex justify-center p-2">
          <button
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-xs font-medium pointer-events-none"
            style={{
              opacity: states.disabled.opacity,
              cursor: states.disabled.cursor,
            }}
          >
            Disabled
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="text-[10px] text-muted-foreground p-2 bg-muted/30 rounded">
        Interaction states are class-scoped and apply only to elements with the <code className="px-1 bg-muted rounded">.interactive</code> class.
      </div>
    </div>
  );
}
