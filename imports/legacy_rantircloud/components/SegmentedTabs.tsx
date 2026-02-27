import { cn } from "@/lib/utils";
import { Table2, LayoutGrid, Kanban, PanelTop } from "lucide-react";

interface SegmentedTabsProps {
  value: string;
  onValueChange: (value: string) => void;
  options?: Array<{
    value: string;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
  }>;
  className?: string;
}

const defaultOptions = [
  { value: 'spreadsheet', label: 'Spreadsheet', icon: Table2 },
  { value: 'gallery', label: 'Cards', icon: LayoutGrid },
  { value: 'kanban', label: 'Kanban', icon: Kanban },
  { value: 'form', label: 'Form', icon: PanelTop },
];

export function SegmentedTabs({ 
  value, 
  onValueChange, 
  options = defaultOptions,
  className 
}: SegmentedTabsProps) {
  return (
    <div 
      className={cn("seg-tabs", className)}
      role="tablist"
      aria-label="View options"
    >
      {options.map((option) => {
        const Icon = option.icon;
        const isSelected = value === option.value;
        
        return (
          <button
            key={option.value}
            className="seg-tab"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onValueChange(option.value)}
          >
            {Icon && (
              <Icon className="h-3.5 w-3.5 mr-1.5" />
            )}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}