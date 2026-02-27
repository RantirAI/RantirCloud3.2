/**
 * Color Token Section
 * Manages color palette tokens in the Design panel
 * Subscribes directly to designTokenStore for real-time canvas sync
 */

import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/compact/Input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDesignTokenStore, getTokenDisplayName } from '@/stores/designTokenStore';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface ColorSwatchProps {
  tokenName: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

function ColorSwatch({ tokenName, value, onChange, label }: ColorSwatchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const displayLabel = label || getTokenDisplayName(tokenName);
  
  const presetColors = [
    '#000000', '#ffffff', '#18181b', '#27272a', '#3f3f46', '#52525b',
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6',
    '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#6366f1', '#a855f7'
  ];
  
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground truncate flex-1">{displayLabel}</span>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button 
            className="flex items-center gap-1.5 bg-muted/50 hover:bg-muted border border-border rounded px-1.5 h-6 transition-colors"
          >
            <div 
              className="w-4 h-4 rounded border border-border/50"
              style={{ backgroundColor: value }}
            />
            <span className="text-[10px] font-mono">{value?.slice(0, 7)}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="end">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="color"
                value={value || '#000000'}
                onChange={(e) => onChange(e.target.value)}
                className="w-10 h-7 p-0.5 border rounded cursor-pointer"
              />
              <Input
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 h-7 text-xs font-mono"
                placeholder="#000000"
              />
            </div>
            <div className="grid grid-cols-6 gap-1">
              {presetColors.map((color) => (
                <button
                  key={color}
                  onClick={() => onChange(color)}
                  className={cn(
                    "w-6 h-6 rounded border border-border/50 hover:scale-110 transition-transform",
                    value === color && "ring-2 ring-primary ring-offset-1"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface ColorGroupProps {
  title: string;
  tokens: { name: string; value: string }[];
  onTokenChange: (tokenName: string, value: string) => void;
}

function ColorGroup({ title, tokens, onTokenChange }: ColorGroupProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  if (tokens.length === 0) return null;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-1.5 hover:bg-muted/50 rounded px-1 -mx-1">
        <span className="text-[10px] uppercase font-medium text-muted-foreground">{title}</span>
        <ChevronDown className={cn(
          "h-3 w-3 text-muted-foreground transition-transform",
          isOpen && "rotate-180"
        )} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1.5 pt-1">
        {tokens.map(token => (
          <ColorSwatch
            key={token.name}
            tokenName={token.name}
            value={token.value}
            onChange={(value) => onTokenChange(token.name, value)}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

interface ColorTokenSectionProps {
  themeMode?: 'light' | 'dark';
}

export function ColorTokenSection({ themeMode = 'dark' }: ColorTokenSectionProps) {
  const { activeTokens, updateToken, addToken, currentProjectId } = useDesignTokenStore();
  const [isAddingColor, setIsAddingColor] = useState(false);
  const [newColorName, setNewColorName] = useState('');
  const [newColorValue, setNewColorValue] = useState('#3b82f6');
  const [isSaving, setIsSaving] = useState(false);
  
  // Derive color tokens directly from activeTokens for real-time sync
  const colorTokens = useMemo(() => {
    return Array.from(activeTokens.values()).filter(t => t.category === 'color');
  }, [activeTokens]);
  
  // Group tokens by type
  const primaryTokens = useMemo(() => 
    colorTokens.filter(t => t.name.includes('primary')),
    [colorTokens]
  );
  
  const secondaryTokens = useMemo(() => 
    colorTokens.filter(t => t.name.includes('secondary')),
    [colorTokens]
  );
  
  const accentTokens = useMemo(() => 
    colorTokens.filter(t => t.name.includes('accent')),
    [colorTokens]
  );
  
  const baseTokens = useMemo(() => 
    colorTokens.filter(t => 
      ['background', 'foreground', 'muted', 'muted-foreground', 'border', 'surface'].includes(t.name)
    ),
    [colorTokens]
  );
  
  const destructiveTokens = useMemo(() => 
    colorTokens.filter(t => t.name.includes('destructive')),
    [colorTokens]
  );
  
  // Custom tokens (not in any predefined group)
  const customTokens = useMemo(() => 
    colorTokens.filter(t => 
      !t.name.includes('primary') &&
      !t.name.includes('secondary') &&
      !t.name.includes('accent') &&
      !t.name.includes('destructive') &&
      !['background', 'foreground', 'muted', 'muted-foreground', 'border', 'surface'].includes(t.name)
    ),
    [colorTokens]
  );
  
  const handleTokenChange = async (tokenName: string, value: string) => {
    await updateToken(tokenName, value);
  };
  
  const handleAddColor = async () => {
    if (!newColorName.trim() || !newColorValue || !currentProjectId) return;
    
    setIsSaving(true);
    try {
      const colorName = newColorName.trim().toLowerCase().replace(/\s+/g, '-');
      await addToken({
        name: colorName,
        value: newColorValue,
        category: 'color',
        isActive: true,
      });
      
      setNewColorName('');
      setNewColorValue('#3b82f6');
      setIsAddingColor(false);
      toast.success(`Color "${colorName}" added to theme`);
    } catch (error) {
      console.error('Failed to add color:', error);
      toast.error('Failed to add color');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Default colors if no tokens exist
  const defaultColors = {
    primary: [
      { name: 'primary', value: '#3b82f6' },
      { name: 'primary-foreground', value: '#ffffff' },
    ],
    secondary: [
      { name: 'secondary', value: '#27272a' },
      { name: 'secondary-foreground', value: '#fafafa' },
    ],
    base: [
      { name: 'background', value: '#09090b' },
      { name: 'foreground', value: '#fafafa' },
      { name: 'muted', value: '#27272a' },
      { name: 'border', value: '#27272a' },
    ],
  };
  
  const hasTokens = colorTokens.length > 0;
  
  const presetColors = [
    '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981'
  ];
  
  return (
    <div className="space-y-4">
      {/* Color preview */}
      <div className="flex gap-1">
        {(hasTokens ? colorTokens.slice(0, 8) : [...defaultColors.primary, ...defaultColors.base].slice(0, 8)).map((token, i) => (
          <div
            key={i}
            className="flex-1 h-6 rounded first:rounded-l-md last:rounded-r-md border border-border/30"
            style={{ backgroundColor: token.value }}
            title={token.name}
          />
        ))}
      </div>
      
      {/* Color groups */}
      <div className="space-y-3">
        <ColorGroup
          title="Primary"
          tokens={hasTokens ? primaryTokens : defaultColors.primary}
          onTokenChange={handleTokenChange}
        />
        <ColorGroup
          title="Secondary"
          tokens={hasTokens ? secondaryTokens : defaultColors.secondary}
          onTokenChange={handleTokenChange}
        />
        <ColorGroup
          title="Base"
          tokens={hasTokens ? baseTokens : defaultColors.base}
          onTokenChange={handleTokenChange}
        />
        {accentTokens.length > 0 && (
          <ColorGroup
            title="Accent"
            tokens={accentTokens}
            onTokenChange={handleTokenChange}
          />
        )}
        {destructiveTokens.length > 0 && (
          <ColorGroup
            title="Destructive"
            tokens={destructiveTokens}
            onTokenChange={handleTokenChange}
          />
        )}
        {customTokens.length > 0 && (
          <ColorGroup
            title="Custom"
            tokens={customTokens}
            onTokenChange={handleTokenChange}
          />
        )}
      </div>
      
      {/* Add custom color */}
      {isAddingColor ? (
        <div className="space-y-2 p-2 border border-border rounded-md bg-muted/30">
          <Input
            placeholder="Color name (e.g. brand-blue)"
            value={newColorName}
            onChange={(e) => setNewColorName(e.target.value)}
            className="h-7 text-xs"
          />
          <div className="flex gap-2">
            <Input
              type="color"
              value={newColorValue}
              onChange={(e) => setNewColorValue(e.target.value)}
              className="w-10 h-7 p-0.5 border rounded cursor-pointer"
            />
            <Input
              value={newColorValue}
              onChange={(e) => setNewColorValue(e.target.value)}
              className="flex-1 h-7 text-xs font-mono"
              placeholder="#000000"
            />
          </div>
          <div className="flex flex-wrap gap-1 justify-start">
            {presetColors.map((color) => (
              <button
                key={color}
                onClick={() => setNewColorValue(color)}
                className={cn(
                  "w-5 h-5 rounded border transition-all hover:scale-110 flex-shrink-0",
                  newColorValue === color ? "border-primary ring-1 ring-primary" : "border-border"
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={() => {
                setIsAddingColor(false);
                setNewColorName('');
                setNewColorValue('#3b82f6');
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={handleAddColor}
              disabled={!newColorName.trim() || isSaving}
            >
              {isSaving ? 'Saving...' : 'Add Color'}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs"
          onClick={() => setIsAddingColor(true)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Color
        </Button>
      )}
    </div>
  );
}