import { cn } from '@/lib/utils';

interface DropIndicatorProps {
  isVisible: boolean;
  position: 'top' | 'bottom' | 'left' | 'right' | 'between';
  isValid: boolean;
  draggedItemName?: string;
  className?: string;
}

export function DropIndicator({ 
  isVisible, 
  position, 
  isValid, 
  draggedItemName = 'component',
  className 
}: DropIndicatorProps) {
  if (!isVisible) return null;

  const baseClasses = 'absolute z-50 pointer-events-none transition-all duration-200';
  const validColor = 'bg-blue-500';
  const invalidColor = 'bg-red-500';
  const lineColor = isValid ? validColor : invalidColor;

  const getPositionStyles = () => {
    switch (position) {
      case 'top':
        return {
          className: cn(baseClasses, 'top-0 left-0 right-0 -translate-y-1', className),
          children: (
            <>
              <div className={cn('h-0.5 w-full', lineColor)} />
              <div className={cn(
                'absolute left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded text-xs font-medium text-white',
                lineColor
              )}>
                {isValid ? `Drop ${draggedItemName} above` : 'Cannot drop here'}
              </div>
            </>
          )
        };
      
      case 'bottom':
        return {
          className: cn(baseClasses, 'bottom-0 left-0 right-0 translate-y-1', className),
          children: (
            <>
              <div className={cn('h-0.5 w-full', lineColor)} />
              <div className={cn(
                'absolute left-1/2 -translate-x-1/2 translate-y-1/2 px-2 py-1 rounded text-xs font-medium text-white',
                lineColor
              )}>
                {isValid ? `Drop ${draggedItemName} below` : 'Cannot drop here'}
              </div>
            </>
          )
        };
      
      case 'left':
        return {
          className: cn(baseClasses, 'top-0 bottom-0 left-0 -translate-x-1', className),
          children: (
            <>
              <div className={cn('w-0.5 h-full', lineColor)} />
              <div className={cn(
                'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 px-2 py-1 rounded text-xs font-medium text-white',
                lineColor
              )}>
                {isValid ? `Drop ${draggedItemName} left` : 'Cannot drop here'}
              </div>
            </>
          )
        };
      
      case 'right':
        return {
          className: cn(baseClasses, 'top-0 bottom-0 right-0 translate-x-1', className),
          children: (
            <>
              <div className={cn('w-0.5 h-full', lineColor)} />
              <div className={cn(
                'absolute top-1/2 -translate-y-1/2 translate-x-1/2 px-2 py-1 rounded text-xs font-medium text-white',
                lineColor
              )}>
                {isValid ? `Drop ${draggedItemName} right` : 'Cannot drop here'}
              </div>
            </>
          )
        };

      case 'between':
        return {
          className: cn(baseClasses, 'inset-x-0 top-1/2 -translate-y-1/2', className),
          children: (
            <>
              <div className={cn('h-0.5 w-full', lineColor, 'animate-pulse')} />
              <div className={cn(
                'absolute left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded text-xs font-medium text-white',
                lineColor
              )}>
                {isValid ? `Insert ${draggedItemName} here` : 'Cannot drop here'}
              </div>
            </>
          )
        };
      
      default:
        return { className: '', children: null };
    }
  };

  const { className: positionClassName, children } = getPositionStyles();

  return (
    <div className={positionClassName}>
      {children}
    </div>
  );
}