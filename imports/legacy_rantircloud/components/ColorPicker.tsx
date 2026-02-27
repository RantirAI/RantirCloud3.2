
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeColorSwatches, ThemeColorSwatchesCompact } from "@/components/app-builder/design-system/ThemeColorSwatches";
import { useDesignTokenStore } from "@/stores/designTokenStore";

const predefinedColors = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  showThemeColors?: boolean;
}

export function ColorPicker({ value, onChange, label = "Color", showThemeColors = true }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState(value);
  const { getColorTokens } = useDesignTokenStore();
  
  const hasThemeColors = getColorTokens().length > 0;

  const handleColorSelect = (color: string) => {
    onChange(color);
    setCustomColor(color);
    setIsOpen(false);
  };

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
    onChange(color);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <div className="relative">
        <div className="flex items-center h-9 rounded-md border bg-background px-2">
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <button
                className="w-4 h-4 rounded-full border border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: value }}
              />
            </PopoverTrigger>
            <PopoverContent className="w-56 rounded-lg p-3">
              {/* Theme Colors */}
              {showThemeColors && hasThemeColors && (
                <ThemeColorSwatches
                  currentValue={value}
                  onColorSelect={handleColorSelect}
                  returnTokenRef={false}
                />
              )}
              
              {/* Preset Colors (fallback when no theme) */}
              {(!hasThemeColors || !showThemeColors) && (
                <div className="grid grid-cols-5 gap-2">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      className="w-6 h-6 rounded border-2 hover:scale-110 transition-transform"
                      style={{
                        backgroundColor: color,
                        borderColor: value === color ? '#000' : '#e5e7eb'
                      }}
                      onClick={() => handleColorSelect(color)}
                    />
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>
          <div className="mx-2 h-5 w-px bg-border" />
          <Input
            value={value}
            onChange={(e) => handleCustomColorChange(e.target.value)}
            placeholder="#000000"
            className="flex-1 !border-0 !outline-0 bg-transparent h-8 py-0 px-0 text-xs focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
          />
        </div>
      </div>
    </div>
  );
}
