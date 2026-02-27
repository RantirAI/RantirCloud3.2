import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

interface DropZoneIndicatorProps {
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  isActive: boolean;
  isHighlighted: boolean;
  label?: string;
  className?: string;
}

export function DropZoneIndicator({ 
  position, 
  isActive, 
  isHighlighted, 
  label,
  className 
}: DropZoneIndicatorProps) {
  const getPositionStyles = () => {
    switch (position) {
      case 'top':
        return 'top-0 left-0 right-0 h-2 -translate-y-1';
      case 'bottom':
        return 'bottom-0 left-0 right-0 h-2 translate-y-1';
      case 'left':
        return 'top-0 bottom-0 left-0 w-2 -translate-x-1';
      case 'right':
        return 'top-0 bottom-0 right-0 w-2 translate-x-1';
      case 'center':
        return 'inset-0';
      default:
        return '';
    }
  };

  const getIndicatorStyles = () => {
    const base = 'absolute transition-all duration-200 pointer-events-none';
    const activeStyles = isActive 
      ? 'opacity-100 scale-100' 
      : 'opacity-0 scale-95';
    const highlightStyles = isHighlighted 
      ? 'bg-primary/20 border-primary ring-2 ring-primary/50' 
      : 'bg-primary/10 border-primary/50';
    
    return cn(base, activeStyles, highlightStyles, getPositionStyles());
  };

  const getLineStyles = () => {
    if (position === 'center') return '';
    
    const isVertical = position === 'left' || position === 'right';
    return cn(
      'absolute bg-primary rounded-full transition-all duration-200',
      isVertical ? 'w-1 h-8 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : 'h-1 w-8 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
      isActive ? 'opacity-100' : 'opacity-0'
    );
  };

  return (
    <div className={cn(getIndicatorStyles(), className)}>
      {position === 'center' && isActive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg">
            <Plus className="h-4 w-4" />
            {label || 'Drop here'}
          </div>
        </div>
      )}
      
      {position !== 'center' && (
        <div className={getLineStyles()} />
      )}
    </div>
  );
}