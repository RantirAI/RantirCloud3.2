import { AIWallPreset } from '@/lib/aiWallPresets';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface AIWallPresetCardProps {
  preset: AIWallPreset;
  isSelected: boolean;
  onSelect: (preset: AIWallPreset) => void;
}

export function AIWallPresetCard({ preset, isSelected, onSelect }: AIWallPresetCardProps) {
  return (
    <button
      onClick={() => onSelect(preset)}
      className={cn(
        "relative group flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150 w-full border",
        isSelected 
          ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" 
          : "bg-card border-border/50 hover:bg-muted/50 hover:border-border"
      )}
    >
      {/* Color dots */}
      <div className="flex gap-1 flex-shrink-0 mt-0.5">
        <div 
          className="w-3.5 h-3.5 rounded-full border border-border/50"
          style={{ backgroundColor: preset.colors.primary }}
        />
        <div 
          className="w-3.5 h-3.5 rounded-full border border-border/50"
          style={{ backgroundColor: preset.colors.secondary }}
        />
        <div 
          className="w-3.5 h-3.5 rounded-full border border-border/50"
          style={{ backgroundColor: preset.colors.accent }}
        />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-foreground block">{preset.name}</span>
        <span className="text-[11px] text-muted-foreground leading-tight block mt-0.5">{preset.description}</span>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <Check className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
      )}
    </button>
  );
}
