import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/compact/Input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/compact/Select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Eye, EyeOff, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { FilterItem, FilterFunction, defaultFilter, getFilterUnit, getFilterDefaultValue, generateFilterCSS } from '@/types/effects';
import { v4 as uuid } from 'uuid';
import { PropertyIndicator } from '../PropertyIndicator';

interface FiltersEditorProps {
  label?: string;
  value: FilterItem[];
  onChange: (value: FilterItem[]) => void;
  classLevel?: number;
  status?: 'active' | 'inherited' | 'manual' | 'none';
  sourceInfo?: { className?: string; source?: string };
}

const filterFunctions: { value: FilterFunction; label: string }[] = [
  { value: 'blur', label: 'Blur' },
  { value: 'brightness', label: 'Brightness' },
  { value: 'contrast', label: 'Contrast' },
  { value: 'grayscale', label: 'Grayscale' },
  { value: 'hue-rotate', label: 'Hue Rotate' },
  { value: 'invert', label: 'Invert' },
  { value: 'opacity', label: 'Opacity' },
  { value: 'saturate', label: 'Saturate' },
  { value: 'sepia', label: 'Sepia' },
];

const getFilterRange = (fn: FilterFunction): { min: number; max: number } => {
  switch (fn) {
    case 'blur':
      return { min: 0, max: 100 };
    case 'brightness':
    case 'contrast':
    case 'saturate':
      return { min: 0, max: 300 };
    case 'grayscale':
    case 'sepia':
    case 'invert':
    case 'opacity':
      return { min: 0, max: 100 };
    case 'hue-rotate':
      return { min: 0, max: 360 };
    default:
      return { min: 0, max: 100 };
  }
};

export function FiltersEditor({ label = 'Filters', value = [], onChange, classLevel, status, sourceInfo }: FiltersEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const filters = Array.isArray(value) ? value : [];

  const addFilter = () => {
    const newFilter: FilterItem = {
      ...defaultFilter,
      id: uuid(),
    };
    onChange([...filters, newFilter]);
    setExpandedId(newFilter.id);
  };

  const updateFilter = (id: string, updates: Partial<FilterItem>) => {
    onChange(filters.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeFilter = (id: string) => {
    onChange(filters.filter(f => f.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const toggleEnabled = (id: string) => {
    const filter = filters.find(f => f.id === id);
    if (filter) {
      updateFilter(id, { enabled: !filter.enabled });
    }
  };

  const handleFunctionChange = (id: string, fn: FilterFunction) => {
    updateFilter(id, {
      function: fn,
      unit: getFilterUnit(fn),
      value: getFilterDefaultValue(fn)
    });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newFilters = [...filters];
    const draggedItem = newFilters[draggedIndex];
    newFilters.splice(draggedIndex, 1);
    newFilters.splice(index, 0, draggedItem);
    onChange(newFilters);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const getFilterSummary = (filter: FilterItem) => {
    const fnLabel = filterFunctions.find(f => f.value === filter.function)?.label || filter.function;
    return `${fnLabel}: ${filter.value}${filter.unit}`;
  };

  const cssPreview = generateFilterCSS(filters);

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
          {filters.length > 0 && (status === 'active' || status === 'manual') && (
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
            onClick={addFilter}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {filters.length === 0 ? (
        <div 
          className="border border-dashed border-border/50 rounded-md p-4 text-center cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={addFilter}
        >
          <p className="text-xs text-muted-foreground">No filters. Click to add one.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filters.map((filter, index) => {
            const range = getFilterRange(filter.function);
            
            return (
              <div
                key={filter.id}
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
                  open={expandedId === filter.id}
                  onOpenChange={(open) => setExpandedId(open ? filter.id : null)}
                >
                  <div className="flex items-center gap-1 p-2">
                    <div className="cursor-grab text-muted-foreground hover:text-foreground">
                      <GripVertical className="h-3 w-3" />
                    </div>
                    
                    <button
                      onClick={() => toggleEnabled(filter.id)}
                      className="p-1 hover:bg-muted rounded"
                    >
                      {filter.enabled ? (
                        <Eye className="h-3 w-3 text-foreground" />
                      ) : (
                        <EyeOff className="h-3 w-3 text-muted-foreground" />
                      )}
                    </button>

                    <CollapsibleTrigger asChild>
                      <button className="flex-1 flex items-center gap-2 text-left hover:bg-muted/50 rounded px-1 py-0.5">
                        {expandedId === filter.id ? (
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className={cn(
                          "text-xs truncate",
                          !filter.enabled && "text-muted-foreground line-through"
                        )}>
                          {getFilterSummary(filter)}
                        </span>
                      </button>
                    </CollapsibleTrigger>
                    
                    <button
                      onClick={() => removeFilter(filter.id)}
                      className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  <CollapsibleContent>
                    <div className="p-3 pt-0 space-y-3 border-t border-border/30">
                      {/* Function Select */}
                      <div>
                        <Label className="text-xs text-muted-foreground">Function</Label>
                        <Select
                          value={filter.function}
                          onValueChange={(v) => handleFunctionChange(filter.id, v as FilterFunction)}
                        >
                          <SelectTrigger className="mt-1 h-7">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {filterFunctions.map((fn) => (
                              <SelectItem key={fn.value} value={fn.value}>
                                {fn.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Value Input */}
                      <div>
                        <Label className="text-xs text-muted-foreground">Value</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="range"
                            min={range.min}
                            max={range.max}
                            value={filter.value}
                            onChange={(e) => updateFilter(filter.id, { value: Number(e.target.value) })}
                            className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="flex items-center gap-1 min-w-[60px]">
                            <Input
                              type="number"
                              value={filter.value}
                              min={range.min}
                              max={range.max}
                              onChange={(e) => updateFilter(filter.id, { value: Number(e.target.value) })}
                              className="h-7 text-xs w-14"
                            />
                            <span className="text-xs text-muted-foreground">{filter.unit}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            );
          })}
        </div>
      )}

      {/* CSS Preview */}
      {filters.length > 0 && (
        <div className="mt-2 p-2 bg-muted/30 rounded-md">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Preview</Label>
          <code className="block text-[10px] text-muted-foreground mt-1 break-all font-mono">
            filter: {cssPreview};
          </code>
        </div>
      )}
    </div>
  );
}
