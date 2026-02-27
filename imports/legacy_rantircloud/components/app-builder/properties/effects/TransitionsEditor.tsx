import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/compact/Input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/compact/Select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Eye, EyeOff, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { TransitionItem, EasingFunction, defaultTransition, generateTransitionCSS } from '@/types/effects';
import { v4 as uuid } from 'uuid';
import { PropertyIndicator } from '../PropertyIndicator';

interface TransitionsEditorProps {
  label?: string;
  value: TransitionItem[];
  onChange: (value: TransitionItem[]) => void;
  classLevel?: number;
  status?: 'active' | 'inherited' | 'manual' | 'none';
  sourceInfo?: { className?: string; source?: string };
}

const commonProperties = [
  { value: 'all', label: 'All' },
  { value: 'opacity', label: 'Opacity' },
  { value: 'transform', label: 'Transform' },
  { value: 'background-color', label: 'Background Color' },
  { value: 'color', label: 'Color' },
  { value: 'border', label: 'Border' },
  { value: 'border-color', label: 'Border Color' },
  { value: 'box-shadow', label: 'Box Shadow' },
  { value: 'filter', label: 'Filter' },
  { value: 'width', label: 'Width' },
  { value: 'height', label: 'Height' },
  { value: 'padding', label: 'Padding' },
  { value: 'margin', label: 'Margin' },
];

const easingOptions: { value: EasingFunction; label: string }[] = [
  { value: 'ease', label: 'Ease' },
  { value: 'linear', label: 'Linear' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In Out' },
  { value: 'cubic-bezier(0.4, 0, 0.2, 1)', label: 'Smooth' },
  { value: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', label: 'Bounce' },
  { value: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', label: 'Soft' },
];

export function TransitionsEditor({ label = 'Transitions', value = [], onChange, classLevel, status, sourceInfo }: TransitionsEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const transitions = Array.isArray(value) ? value : [];

  const addTransition = () => {
    const newTransition: TransitionItem = {
      ...defaultTransition,
      id: uuid(),
    };
    onChange([...transitions, newTransition]);
    setExpandedId(newTransition.id);
  };

  const updateTransition = (id: string, updates: Partial<TransitionItem>) => {
    onChange(transitions.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const removeTransition = (id: string) => {
    onChange(transitions.filter(t => t.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const toggleEnabled = (id: string) => {
    const transition = transitions.find(t => t.id === id);
    if (transition) {
      updateTransition(id, { enabled: !transition.enabled });
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newTransitions = [...transitions];
    const draggedItem = newTransitions[draggedIndex];
    newTransitions.splice(draggedIndex, 1);
    newTransitions.splice(index, 0, draggedItem);
    onChange(newTransitions);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const getTransitionSummary = (t: TransitionItem) => {
    const propLabel = commonProperties.find(p => p.value === t.property)?.label || t.property;
    const easingLabel = easingOptions.find(e => e.value === t.easing)?.label || t.easing;
    return `${propLabel} ${t.duration}ms ${easingLabel}`;
  };

  const cssPreview = generateTransitionCSS(transitions);

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
          {transitions.length > 0 && (status === 'active' || status === 'manual') && (
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
            onClick={addTransition}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {transitions.length === 0 ? (
        <div 
          className="border border-dashed border-border/50 rounded-md p-4 text-center cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={addTransition}
        >
          <p className="text-xs text-muted-foreground">No transitions. Click to add one.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {transitions.map((transition, index) => (
            <div
              key={transition.id}
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
                open={expandedId === transition.id}
                onOpenChange={(open) => setExpandedId(open ? transition.id : null)}
              >
                <div className="flex items-center gap-1 p-2">
                  <div className="cursor-grab text-muted-foreground hover:text-foreground">
                    <GripVertical className="h-3 w-3" />
                  </div>
                  
                  <button
                    onClick={() => toggleEnabled(transition.id)}
                    className="p-1 hover:bg-muted rounded"
                  >
                    {transition.enabled ? (
                      <Eye className="h-3 w-3 text-foreground" />
                    ) : (
                      <EyeOff className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>

                  <CollapsibleTrigger asChild>
                    <button className="flex-1 flex items-center gap-2 text-left hover:bg-muted/50 rounded px-1 py-0.5">
                      {expandedId === transition.id ? (
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span className={cn(
                        "text-xs truncate",
                        !transition.enabled && "text-muted-foreground line-through"
                      )}>
                        {getTransitionSummary(transition)}
                      </span>
                    </button>
                  </CollapsibleTrigger>
                  
                  <button
                    onClick={() => removeTransition(transition.id)}
                    className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                <CollapsibleContent>
                  <div className="p-3 pt-0 space-y-3 border-t border-border/30">
                    {/* Property Select */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Property</Label>
                      <Select
                        value={transition.property}
                        onValueChange={(v) => updateTransition(transition.id, { property: v })}
                      >
                        <SelectTrigger className="mt-1 h-7">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {commonProperties.map((prop) => (
                            <SelectItem key={prop.value} value={prop.value}>
                              {prop.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Duration & Delay */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Duration</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <Input
                            type="number"
                            value={transition.duration}
                            min={0}
                            step={50}
                            onChange={(e) => updateTransition(transition.id, { duration: Number(e.target.value) })}
                            className="h-7 text-xs"
                          />
                          <span className="text-xs text-muted-foreground">ms</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Delay</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <Input
                            type="number"
                            value={transition.delay}
                            min={0}
                            step={50}
                            onChange={(e) => updateTransition(transition.id, { delay: Number(e.target.value) })}
                            className="h-7 text-xs"
                          />
                          <span className="text-xs text-muted-foreground">ms</span>
                        </div>
                      </div>
                    </div>

                    {/* Easing */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Easing</Label>
                      <Select
                        value={transition.easing}
                        onValueChange={(v) => updateTransition(transition.id, { easing: v })}
                      >
                        <SelectTrigger className="mt-1 h-7">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {easingOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          ))}
        </div>
      )}

      {/* CSS Preview */}
      {transitions.length > 0 && (
        <div className="mt-2 p-2 bg-muted/30 rounded-md">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Preview</Label>
          <code className="block text-[10px] text-muted-foreground mt-1 break-all font-mono">
            transition: {cssPreview};
          </code>
        </div>
      )}
    </div>
  );
}
