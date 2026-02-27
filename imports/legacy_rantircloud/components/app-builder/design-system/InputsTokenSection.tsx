/**
 * Inputs Token Section
 * Manages input field tokens (size, padding, gap, radius) in the Design panel
 * Subscribes directly to designTokenStore for real-time canvas sync
 */

import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useDesignTokenStore } from '@/stores/designTokenStore';
import { cn } from '@/lib/utils';

const SIZE_PRESETS = [
  { name: 'Slim', height: 28, padding: 8, gap: 8 },
  { name: 'Default', height: 34, padding: 12, gap: 12 },
  { name: 'Comfortable', height: 40, padding: 16, gap: 16 },
];

interface SliderControlProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}

function SliderControl({ label, value, onChange, min = 0, max = 24, unit = 'px' }: SliderControlProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
        <span className="text-xs font-mono text-foreground">{value}{unit}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(values) => onChange(values[0])}
        min={min}
        max={max}
        step={1}
        className="w-full"
      />
    </div>
  );
}

export function InputsTokenSection() {
  const { activeTokens, updateToken } = useDesignTokenStore();
  
  // Derive values directly from activeTokens for real-time sync
  const inputHeight = useMemo(() => {
    const token = activeTokens.get('input-height');
    return token ? parseInt(token.value) || 34 : 34;
  }, [activeTokens]);
  
  const inputPadding = useMemo(() => {
    const token = activeTokens.get('input-padding');
    return token ? parseInt(token.value) || 12 : 12;
  }, [activeTokens]);
  
  const inputRadius = useMemo(() => {
    const token = activeTokens.get('input-radius');
    return token ? parseInt(token.value) || 6 : 6;
  }, [activeTokens]);
  
  const formGap = useMemo(() => {
    const token = activeTokens.get('form-gap');
    return token ? parseInt(token.value) || 12 : 12;
  }, [activeTokens]);
  
  const modalPadding = useMemo(() => {
    const token = activeTokens.get('modal-padding');
    return token ? parseInt(token.value) || 16 : 16;
  }, [activeTokens]);
  
  // Determine active size preset
  const getActivePreset = () => {
    const preset = SIZE_PRESETS.find(
      p => p.height === inputHeight && p.padding === inputPadding && p.gap === formGap
    );
    return preset?.name || 'Custom';
  };

  const handlePresetChange = async (presetName: string) => {
    const preset = SIZE_PRESETS.find(p => p.name === presetName);
    if (!preset) return;
    
    // Update all tokens at once
    await Promise.all([
      updateToken('input-height', `${preset.height}px`),
      updateToken('input-padding', `${preset.padding}px`),
      updateToken('form-gap', `${preset.gap}px`),
    ]);
  };

  const handleTokenUpdate = async (tokenName: string, value: number) => {
    await updateToken(tokenName, `${value}px`);
  };

  return (
    <div className="space-y-4">
      {/* Size Preset Selector */}
      <div className="space-y-2">
        <span className="text-[10px] uppercase font-medium text-muted-foreground">Input Size</span>
        <div className="grid grid-cols-3 gap-1.5">
          {SIZE_PRESETS.map(preset => (
            <button
              key={preset.name}
              onClick={() => handlePresetChange(preset.name)}
              className={cn(
                "p-2 rounded border transition-all text-center",
                getActivePreset() === preset.name
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-muted-foreground/50"
              )}
            >
              <span className="text-[10px] font-medium">{preset.name}</span>
              <span className="text-[9px] text-muted-foreground block">{preset.height}px</span>
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Input Controls */}
      <div className="space-y-3">
        <span className="text-[10px] uppercase font-medium text-muted-foreground">Input Properties</span>
        
        <SliderControl
          label="Input Height"
          value={inputHeight}
          onChange={(v) => handleTokenUpdate('input-height', v)}
          min={24}
          max={48}
        />
        
        <SliderControl
          label="Input Padding"
          value={inputPadding}
          onChange={(v) => handleTokenUpdate('input-padding', v)}
          min={4}
          max={24}
        />
        
        <SliderControl
          label="Input Radius"
          value={inputRadius}
          onChange={(v) => handleTokenUpdate('input-radius', v)}
          min={0}
          max={16}
        />
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Form Layout */}
      <div className="space-y-3">
        <span className="text-[10px] uppercase font-medium text-muted-foreground">Form & Modal Layout</span>
        
        <SliderControl
          label="Form Gap"
          value={formGap}
          onChange={(v) => handleTokenUpdate('form-gap', v)}
          min={4}
          max={24}
        />
        
        <SliderControl
          label="Modal Padding"
          value={modalPadding}
          onChange={(v) => handleTokenUpdate('modal-padding', v)}
          min={8}
          max={32}
        />
      </div>

      {/* Preview with theme colors */}
      <div className="space-y-2 pt-2 border-t border-border">
        <span className="text-[10px] uppercase text-muted-foreground">Preview</span>
        <div 
          className="bg-card rounded border border-border"
          style={{ padding: `${modalPadding}px` }}
        >
          <div 
            className="flex flex-col"
            style={{ gap: `${formGap}px` }}
          >
            <div
              className="w-full bg-background border border-border text-xs text-muted-foreground flex items-center"
              style={{ 
                height: `${inputHeight}px`, 
                padding: `0 ${inputPadding}px`,
                borderRadius: `${inputRadius}px`
              }}
            >
              Input field
            </div>
            <div
              className="w-full bg-background border border-border text-xs text-muted-foreground flex items-center"
              style={{ 
                height: `${inputHeight}px`, 
                padding: `0 ${inputPadding}px`,
                borderRadius: `${inputRadius}px`
              }}
            >
              Another input
            </div>
            <button
              className="w-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center"
              style={{ 
                height: `${inputHeight}px`, 
                borderRadius: `${inputRadius}px`
              }}
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
