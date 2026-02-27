import React, { useState } from 'react';
import { Input } from '@/components/ui/compact/Input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/compact/Select';
import { cn } from '@/lib/utils';

interface BorderRadiusValues {
  topLeft: string;
  topRight: string;
  bottomRight: string;
  bottomLeft: string;
  unit: 'px' | 'rem' | 'em' | '%';
}

interface BorderRadiusVisualEditorProps {
  label: string;
  value: BorderRadiusValues;
  onChange: (value: BorderRadiusValues) => void;
}

export function BorderRadiusVisualEditor({ label, value, onChange }: BorderRadiusVisualEditorProps) {
  const defaultRadius: BorderRadiusValues = { topLeft: '0', topRight: '0', bottomRight: '0', bottomLeft: '0', unit: 'px' };
  
  const currentValue: BorderRadiusValues = value || defaultRadius;
  
  const areAllValuesSame = (vals: BorderRadiusValues) => 
    vals && vals.topLeft === vals.topRight && vals.topRight === vals.bottomRight && vals.bottomRight === vals.bottomLeft;
  
  const [linked, setLinked] = useState(areAllValuesSame(currentValue));

  const handleValueChange = (corner: keyof Omit<BorderRadiusValues, 'unit'>, newValue: string) => {
    let newRadius: BorderRadiusValues;
    if (linked) {
      newRadius = {
        ...currentValue,
        topLeft: newValue,
        topRight: newValue,
        bottomRight: newValue,
        bottomLeft: newValue,
      };
    } else {
      newRadius = {
        ...currentValue,
        [corner]: newValue,
      };
    }

    onChange(newRadius);
  };

  const handleUnitChange = (unit: BorderRadiusValues['unit']) => {
    onChange({ ...currentValue, unit });
  };

  const toggleLink = () => {
    const newLinkedState = !linked;
    setLinked(newLinkedState);
    
    if (newLinkedState && currentValue) {
      const newRadius = {
        ...currentValue,
        topRight: currentValue.topLeft,
        bottomRight: currentValue.topLeft,
        bottomLeft: currentValue.topLeft,
      };
      
      onChange(newRadius);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{label}</Label>
        <div className="flex items-center gap-2">
          <Select value={currentValue.unit} onValueChange={handleUnitChange}>
            <SelectTrigger className="h-6 w-14 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="px">px</SelectItem>
              <SelectItem value="rem">rem</SelectItem>
              <SelectItem value="em">em</SelectItem>
              <SelectItem value="%">%</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={toggleLink}
            className={cn(
              "w-6 h-6 rounded border flex items-center justify-center text-xs transition-colors",
              linked ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"
            )}
            title={linked ? "Unlink corners" : "Link all corners"}
          >
            {linked ? "🔗" : "🔓"}
          </button>
        </div>
      </div>
      
      <div className="space-y-2">
        {/* Top Row */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground font-medium w-6">TL</span>
              <Input
                value={currentValue.topLeft}
                onChange={(e) => handleValueChange('topLeft', e.target.value)}
                className="flex-1 h-7 text-xs text-center"
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground font-medium w-6">TR</span>
              <Input
                value={currentValue.topRight}
                onChange={(e) => handleValueChange('topRight', e.target.value)}
                className="flex-1 h-7 text-xs text-center"
                placeholder="0"
              />
            </div>
          </div>
        </div>
        
        {/* Preview */}
        <div className="bg-muted/30 border border-border rounded p-3 flex items-center justify-center min-h-[60px]">
          <div 
            className="w-full h-full min-h-[40px] bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-xs font-medium text-muted-foreground transition-all duration-200"
            style={{
              borderRadius: `${currentValue.topLeft || 0}${currentValue.unit} ${currentValue.topRight || 0}${currentValue.unit} ${currentValue.bottomRight || 0}${currentValue.unit} ${currentValue.bottomLeft || 0}${currentValue.unit}`
            }}
          >
            Preview
          </div>
        </div>
        
        {/* Bottom Row */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground font-medium w-6">BL</span>
              <Input
                value={currentValue.bottomLeft}
                onChange={(e) => handleValueChange('bottomLeft', e.target.value)}
                className="flex-1 h-7 text-xs text-center"
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground font-medium w-6">BR</span>
              <Input
                value={currentValue.bottomRight}
                onChange={(e) => handleValueChange('bottomRight', e.target.value)}
                className="flex-1 h-7 text-xs text-center"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}