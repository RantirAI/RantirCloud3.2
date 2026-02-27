import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/compact/Input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Eye, EyeOff, ChevronDown, ChevronRight, GripVertical, Copy } from 'lucide-react';
import { BoxShadowItem, defaultBoxShadow, generateBoxShadowCSS } from '@/types/effects';
import { v4 as uuid } from 'uuid';
import { PropertyIndicator } from '../PropertyIndicator';

interface BoxShadowsEditorProps {
  label?: string;
  value: BoxShadowItem[];
  onChange: (value: BoxShadowItem[]) => void;
  classLevel?: number;
  status?: 'active' | 'inherited' | 'manual' | 'none';
  sourceInfo?: { className?: string; source?: string };
}

export function BoxShadowsEditor({ label = 'Box Shadows', value = [], onChange, classLevel, status, sourceInfo }: BoxShadowsEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const shadows = Array.isArray(value) ? value : [];

  const addShadow = () => {
    const newShadow: BoxShadowItem = {
      ...defaultBoxShadow,
      id: uuid(),
    };
    onChange([...shadows, newShadow]);
    setExpandedId(newShadow.id);
  };

  const updateShadow = (id: string, updates: Partial<BoxShadowItem>) => {
    onChange(shadows.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeShadow = (id: string) => {
    onChange(shadows.filter(s => s.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const duplicateShadow = (shadow: BoxShadowItem) => {
    const newShadow = { ...shadow, id: uuid() };
    const index = shadows.findIndex(s => s.id === shadow.id);
    const newShadows = [...shadows];
    newShadows.splice(index + 1, 0, newShadow);
    onChange(newShadows);
  };

  const toggleEnabled = (id: string) => {
    const shadow = shadows.find(s => s.id === id);
    if (shadow) {
      updateShadow(id, { enabled: !shadow.enabled });
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newShadows = [...shadows];
    const draggedItem = newShadows[draggedIndex];
    newShadows.splice(draggedIndex, 1);
    newShadows.splice(index, 0, draggedItem);
    onChange(newShadows);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const getShadowSummary = (shadow: BoxShadowItem) => {
    const type = shadow.type === 'inner' ? 'Inner' : 'Outer';
    return `${type}: ${shadow.x}px ${shadow.y}px ${shadow.blur}px`;
  };

  const cssPreview = generateBoxShadowCSS(shadows);

  const getLabelColor = () => {
    switch (status) {
      case 'active':
      case 'manual':
        return 'text-[#2979FF]';
      case 'inherited':
        return 'text-[#F39C12]';
      default:
        return 'text-muted-foreground';
    }
  };

  const handleReset = () => {
    onChange([]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PropertyIndicator classLevel={classLevel} status={status} sourceInfo={sourceInfo} />
          <Label className={cn("text-xs font-medium", getLabelColor())}>{label}</Label>
        </div>
        <div className="flex items-center gap-1">
          {shadows.length > 0 && (status === 'active' || status === 'manual') && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleReset}
            >
              Reset
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={addShadow}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {shadows.length === 0 ? (
        <div 
          className="border border-dashed border-border/50 rounded-md p-4 text-center cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={addShadow}
        >
          <p className="text-xs text-muted-foreground">No shadows. Click to add one.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {shadows.map((shadow, index) => (
            <div
              key={shadow.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                "border border-border/50 rounded-md bg-card transition-all",
                draggedIndex === index && "opacity-50"
              )}
            >
              <Collapsible
                open={expandedId === shadow.id}
                onOpenChange={(open) => setExpandedId(open ? shadow.id : null)}
              >
                <div className="flex items-center gap-1 p-2">
                  <div className="cursor-grab text-muted-foreground hover:text-foreground">
                    <GripVertical className="h-3 w-3" />
                  </div>
                  
                  <button
                    onClick={() => toggleEnabled(shadow.id)}
                    className="p-1 hover:bg-muted rounded"
                  >
                    {shadow.enabled ? (
                      <Eye className="h-3 w-3 text-foreground" />
                    ) : (
                      <EyeOff className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>

                  <CollapsibleTrigger asChild>
                    <button className="flex-1 flex items-center gap-2 text-left hover:bg-muted/50 rounded px-1 py-0.5">
                      {expandedId === shadow.id ? (
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      )}
                      <div
                        className="w-4 h-4 rounded border border-border/50"
                        style={{ backgroundColor: shadow.color }}
                      />
                      <span className={cn(
                        "text-xs truncate",
                        !shadow.enabled && "text-muted-foreground line-through"
                      )}>
                        {getShadowSummary(shadow)}
                      </span>
                    </button>
                  </CollapsibleTrigger>

                  <button
                    onClick={() => duplicateShadow(shadow)}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  
                  <button
                    onClick={() => removeShadow(shadow.id)}
                    className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                <CollapsibleContent>
                  <div className="p-3 pt-0 space-y-3 border-t border-border/30">
                    {/* Type Toggle */}
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Type</Label>
                      <div className="flex bg-muted rounded-md p-0.5">
                        <button
                          className={cn(
                            "px-3 py-1 text-xs rounded transition-colors",
                            shadow.type === 'outer' ? "bg-background shadow-sm" : "text-muted-foreground"
                          )}
                          onClick={() => updateShadow(shadow.id, { type: 'outer' })}
                        >
                          Outside
                        </button>
                        <button
                          className={cn(
                            "px-3 py-1 text-xs rounded transition-colors",
                            shadow.type === 'inner' ? "bg-background shadow-sm" : "text-muted-foreground"
                          )}
                          onClick={() => updateShadow(shadow.id, { type: 'inner' })}
                        >
                          Inside
                        </button>
                      </div>
                    </div>

                    {/* Position */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">X Offset</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <Input
                            type="number"
                            value={shadow.x}
                            onChange={(e) => updateShadow(shadow.id, { x: Number(e.target.value) })}
                            className="h-7 text-xs"
                          />
                          <span className="text-xs text-muted-foreground">px</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Y Offset</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <Input
                            type="number"
                            value={shadow.y}
                            onChange={(e) => updateShadow(shadow.id, { y: Number(e.target.value) })}
                            className="h-7 text-xs"
                          />
                          <span className="text-xs text-muted-foreground">px</span>
                        </div>
                      </div>
                    </div>

                    {/* Blur & Spread */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Blur</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <Input
                            type="number"
                            value={shadow.blur}
                            min={0}
                            onChange={(e) => updateShadow(shadow.id, { blur: Math.max(0, Number(e.target.value)) })}
                            className="h-7 text-xs"
                          />
                          <span className="text-xs text-muted-foreground">px</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Spread</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <Input
                            type="number"
                            value={shadow.spread}
                            onChange={(e) => updateShadow(shadow.id, { spread: Number(e.target.value) })}
                            className="h-7 text-xs"
                          />
                          <span className="text-xs text-muted-foreground">px</span>
                        </div>
                      </div>
                    </div>

                    {/* Color */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Color</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="w-full flex items-center gap-2 mt-1 px-2 py-1.5 border border-border rounded-md hover:bg-muted/50 transition-colors">
                            <div
                              className="w-5 h-5 rounded border border-border/50"
                              style={{ backgroundColor: shadow.color }}
                            />
                            <span className="text-xs flex-1 text-left truncate">{shadow.color}</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3" align="start">
                          <div className="space-y-2">
                            <input
                              type="color"
                              value={shadow.color.startsWith('#') ? shadow.color : '#000000'}
                              onChange={(e) => updateShadow(shadow.id, { color: e.target.value })}
                              className="w-full h-8 rounded cursor-pointer"
                            />
                            <Input
                              value={shadow.color}
                              onChange={(e) => updateShadow(shadow.id, { color: e.target.value })}
                              placeholder="rgba(0,0,0,0.1)"
                              className="h-7 text-xs"
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          ))}
        </div>
      )}

      {/* CSS Preview */}
      {shadows.length > 0 && (
        <div className="mt-2 p-2 bg-muted/30 rounded-md">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Preview</Label>
          <code className="block text-[10px] text-muted-foreground mt-1 break-all font-mono">
            box-shadow: {cssPreview};
          </code>
        </div>
      )}
    </div>
  );
}
