/**
 * Effects Token Section
 * Manages border radius and shadow tokens in the Design panel
 * Subscribes directly to designTokenStore for real-time canvas sync
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useDesignTokenStore } from '@/stores/designTokenStore';
import { cn } from '@/lib/utils';

interface RadiusControlProps {
  label: string;
  tokenName: string;
  value: number;
  onChange: (value: number) => void;
}

function RadiusControl({ label, tokenName, value, onChange }: RadiusControlProps) {
  const [localValue, setLocalValue] = useState(value);
  const isDragging = useRef(false);

  // Sync local state when store value changes (and not dragging)
  useEffect(() => {
    if (!isDragging.current) {
      setLocalValue(value);
    }
  }, [value]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
        <span className="text-xs font-mono text-foreground">{localValue}px</span>
      </div>
      <div className="flex items-center gap-2">
        <Slider
          value={[localValue]}
          onValueChange={(values) => {
            isDragging.current = true;
            setLocalValue(values[0]);
          }}
          onValueCommit={(values) => {
            isDragging.current = false;
            onChange(values[0]);
          }}
          min={0}
          max={24}
          step={1}
          className="flex-1"
        />
        <div 
          className="w-8 h-8 border-2 border-muted-foreground/30 bg-muted/50 flex-shrink-0"
          style={{ borderRadius: `${localValue}px` }}
        />
      </div>
    </div>
  );
}

const SHADOW_PRESETS = [
  { name: 'None', value: 'none' },
  { name: 'SM', value: '0 1px 2px 0 rgb(0 0 0 / 0.05)' },
  { name: 'MD', value: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
  { name: 'LG', value: '0 10px 15px -3px rgb(0 0 0 / 0.1)' },
  { name: 'XL', value: '0 20px 25px -5px rgb(0 0 0 / 0.1)' },
  { name: '2XL', value: '0 25px 50px -12px rgb(0 0 0 / 0.25)' },
];

interface ShadowPresetPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ShadowPresetPicker({ label, value, onChange }: ShadowPresetPickerProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
      <div className="grid grid-cols-3 gap-1.5">
        {SHADOW_PRESETS.map(preset => (
          <button
            key={preset.name}
            onClick={() => onChange(preset.value)}
            className={cn(
              "h-10 rounded border bg-background transition-all",
              value === preset.value 
                ? "border-primary ring-1 ring-primary" 
                : "border-border hover:border-muted-foreground/50"
            )}
            style={{ boxShadow: preset.value !== 'none' ? preset.value : undefined }}
          >
            <span className="text-[9px] text-muted-foreground">{preset.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function EffectsTokenSection() {
  const { activeTokens, updateToken } = useDesignTokenStore();
  
  // Derive values directly from activeTokens for real-time sync
  const buttonRadius = useMemo(() => {
    const token = activeTokens.get('button-radius');
    return token ? parseInt(token.value) || 6 : 6;
  }, [activeTokens]);
  
  const cardRadius = useMemo(() => {
    const token = activeTokens.get('card-radius');
    return token ? parseInt(token.value) || 8 : 8;
  }, [activeTokens]);
  
  const cardShadow = useMemo(() => {
    const token = activeTokens.get('shadow-md');
    return token?.value || '0 4px 6px -1px rgb(0 0 0 / 0.1)';
  }, [activeTokens]);
  
  const handleRadiusChange = async (tokenName: string, value: number) => {
    await updateToken(tokenName, `${value}px`);
  };
  
  const handleShadowChange = async (value: string) => {
    await updateToken('shadow-md', value);
  };
  
  return (
    <div className="space-y-4">
      {/* Border Radius Section */}
      <div className="space-y-3">
        <span className="text-[10px] uppercase font-medium text-muted-foreground">Border Radius</span>
        
        <RadiusControl
          label="Button Radius"
          tokenName="button-radius"
          value={buttonRadius}
          onChange={(v) => handleRadiusChange('button-radius', v)}
        />
        
        <RadiusControl
          label="Card Radius"
          tokenName="card-radius"
          value={cardRadius}
          onChange={(v) => handleRadiusChange('card-radius', v)}
        />
      </div>
      
      {/* Divider */}
      <div className="border-t border-border" />
      
      {/* Shadow Section */}
      <div className="space-y-3">
        <span className="text-[10px] uppercase font-medium text-muted-foreground">Shadows</span>
        
        <ShadowPresetPicker
          label="Default Card Shadow"
          value={cardShadow}
          onChange={handleShadowChange}
        />
      </div>
      
      {/* Preview with theme colors */}
      <div className="space-y-2 pt-2 border-t border-border">
        <span className="text-[10px] uppercase text-muted-foreground">Preview</span>
        <div className="flex gap-2 p-3 bg-muted/30 rounded">
          <button
            className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium"
            style={{ borderRadius: `${buttonRadius}px` }}
          >
            Button
          </button>
          <div
            className="flex-1 p-2 bg-card border border-border"
            style={{ 
              borderRadius: `${cardRadius}px`,
              boxShadow: cardShadow !== 'none' ? cardShadow : undefined 
            }}
          >
            <span className="text-xs text-card-foreground">Card</span>
          </div>
        </div>
      </div>
    </div>
  );
}
