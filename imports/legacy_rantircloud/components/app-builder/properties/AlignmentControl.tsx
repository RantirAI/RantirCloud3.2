import React from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlignmentControlProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type: 'horizontal' | 'vertical';
}

export function AlignmentControl({ label, value, onChange, type }: AlignmentControlProps) {
  const horizontalOptions = [
    { value: 'left', icon: AlignLeft, label: 'Left' },
    { value: 'center', icon: AlignCenter, label: 'Center' },
    { value: 'right', icon: AlignRight, label: 'Right' },
    { value: 'justify', icon: AlignJustify, label: 'Justify' },
  ];

  const verticalOptions = [
    { value: 'top', icon: AlignStartVertical, label: 'Top' },
    { value: 'middle', icon: AlignCenterVertical, label: 'Middle' },
    { value: 'bottom', icon: AlignEndVertical, label: 'Bottom' },
  ];

  const options = type === 'horizontal' ? horizontalOptions : verticalOptions;

  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="flex gap-1 bg-muted/50 p-0.5 rounded-md">
        {options.map((option) => (
          <Button
            key={option.value}
            variant="ghost"
            size="sm"
            className={cn(
              "flex-1 h-6 p-0",
              value === option.value && "bg-background shadow-sm"
            )}
            onClick={() => onChange(option.value)}
            title={option.label}
          >
            <option.icon className="h-3 w-3" />
          </Button>
        ))}
      </div>
    </div>
  );
}