/**
 * Typography Token Section
 * Manages typography tokens (fonts, sizes) in the Design panel
 * Subscribes directly to designTokenStore for real-time canvas sync
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/compact/Select';
import { Slider } from '@/components/ui/slider';
import { useDesignTokenStore } from '@/stores/designTokenStore';

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Instrument Sans', label: 'Instrument Sans' },
  { value: 'Tiempos', label: 'Tiempos' },
  { value: 'system-ui', label: 'System UI' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Merriweather', label: 'Merriweather' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'SF Pro', label: 'SF Pro' },
  { value: 'Inconsolata', label: 'Inconsolata' },
  { value: 'JetBrains Mono', label: 'JetBrains Mono' },
];

interface FontSelectProps {
  label: string;
  tokenName: string;
  value: string;
  onChange: (value: string) => void;
}

function FontSelect({ label, tokenName, value, onChange }: FontSelectProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
      <Select value={value || 'Inter'} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          {FONT_OPTIONS.map(font => (
            <SelectItem key={font.value} value={font.value} className="text-xs">
              <span style={{ fontFamily: font.value }}>{font.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface FontSizeScaleProps {
  baseFontSize: number;
  onChange: (size: number) => void;
}

function FontSizeScale({ baseFontSize, onChange }: FontSizeScaleProps) {
  const [localSize, setLocalSize] = useState(baseFontSize);
  const isDragging = useRef(false);

  // Sync local state when store value changes (and not dragging)
  useEffect(() => {
    if (!isDragging.current) {
      setLocalSize(baseFontSize);
    }
  }, [baseFontSize]);

  // Calculate scale sizes based on local value for instant preview
  const scale = {
    xs: Math.round(localSize * 0.75),
    sm: Math.round(localSize * 0.875),
    base: localSize,
    lg: Math.round(localSize * 1.125),
    xl: Math.round(localSize * 1.25),
    '2xl': Math.round(localSize * 1.5),
    '3xl': Math.round(localSize * 1.875),
    '4xl': Math.round(localSize * 2.25),
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] uppercase text-muted-foreground">Base Size</Label>
        <span className="text-xs font-mono">{localSize}px</span>
      </div>
      <Slider
        value={[localSize]}
        onValueChange={(values) => {
          isDragging.current = true;
          setLocalSize(values[0]);
        }}
        onValueCommit={(values) => {
          isDragging.current = false;
          onChange(values[0]);
        }}
        min={12}
        max={20}
        step={1}
        className="w-full"
      />
      
      {/* Scale preview */}
      <div className="space-y-1 pt-2">
        <span className="text-[10px] uppercase text-muted-foreground">Scale Preview</span>
        <div className="space-y-0.5 text-foreground">
          {Object.entries(scale).map(([name, size]) => (
            <div 
              key={name} 
              className="flex items-baseline justify-between"
            >
              <span className="text-[10px] text-muted-foreground w-8">{name}</span>
              <span style={{ fontSize: `${Math.min(size, 18)}px` }} className="truncate">
                {size}px
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TypographyTokenSection() {
  const { activeTokens, updateToken } = useDesignTokenStore();
  
  // Derive values directly from activeTokens for real-time sync
  const headingFont = useMemo(() => {
    const token = activeTokens.get('font-heading');
    return token?.value || 'Tiempos';
  }, [activeTokens]);
  
  const bodyFont = useMemo(() => {
    const token = activeTokens.get('font-body');
    return token?.value || 'Instrument Sans';
  }, [activeTokens]);
  
  const monoFont = useMemo(() => {
    const token = activeTokens.get('font-mono');
    return token?.value || 'Inconsolata';
  }, [activeTokens]);
  
  const baseFontSize = useMemo(() => {
    const token = activeTokens.get('font-size-base');
    return token ? parseInt(token.value) || 16 : 16;
  }, [activeTokens]);
  
  const handleFontChange = async (tokenName: string, value: string) => {
    await updateToken(tokenName, value);
  };
  
  const handleFontSizeChange = async (value: number) => {
    await updateToken('font-size-base', `${value}px`);
  };
  
  return (
    <div className="space-y-4">
      {/* Font Family Settings */}
      <div className="space-y-3">
        <FontSelect
          label="Heading Font"
          tokenName="font-heading"
          value={headingFont}
          onChange={(value) => handleFontChange('font-heading', value)}
        />
        
        <FontSelect
          label="Body Font"
          tokenName="font-body"
          value={bodyFont}
          onChange={(value) => handleFontChange('font-body', value)}
        />
        
        <FontSelect
          label="Mono Font"
          tokenName="font-mono"
          value={monoFont}
          onChange={(value) => handleFontChange('font-mono', value)}
        />
      </div>
      
      {/* Divider */}
      <div className="border-t border-border" />
      
      {/* Font Size Scale */}
      <FontSizeScale
        baseFontSize={baseFontSize}
        onChange={handleFontSizeChange}
      />
      
      {/* Font preview */}
      <div className="space-y-2 pt-2 border-t border-border">
        <span className="text-[10px] uppercase text-muted-foreground">Preview</span>
        <div className="space-y-1.5 p-2 bg-muted/30 rounded">
          <p style={{ fontFamily: headingFont }} className="text-base font-semibold">
            Heading Text
          </p>
          <p style={{ fontFamily: bodyFont }} className="text-sm">
            Body text example with the selected font.
          </p>
          <p style={{ fontFamily: monoFont }} className="text-xs font-mono">
            const code = "mono";
          </p>
        </div>
      </div>
    </div>
  );
}
