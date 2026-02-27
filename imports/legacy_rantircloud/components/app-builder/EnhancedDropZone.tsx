import { useState, useRef, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Plus, ArrowDown, ArrowUp, ArrowLeft, ArrowRight } from 'lucide-react';

interface DropZoneProps {
  id: string;
  accepts: string[];
  parentId?: string;
  index?: number;
  position?: 'before' | 'after' | 'inside';
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  onDragOver?: (position: 'top' | 'bottom' | 'left' | 'right' | 'center' | null) => void;
}

export function EnhancedDropZone({
  id,
  accepts,
  parentId,
  index = 0,
  position = 'inside',
  orientation = 'vertical',
  className,
  style,
  children,
  onDragOver
}: DropZoneProps) {
  const [dragOverZone, setDragOverZone] = useState<'top' | 'bottom' | 'left' | 'right' | 'center' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { setNodeRef, isOver, active } = useDroppable({
    id,
    data: {
      accepts,
      parentId,
      index,
      position,
      dropZone: dragOverZone
    }
  });

  // Check if the current drag item is compatible with this drop zone
  const isValidDrop = () => {
    if (!active) return true; // Default to valid if no active drag
    
    // Get the dragged type from various possible locations in the data structure
    const dragData = active.data.current;
    const draggedType = 
      dragData?.data?.type ||             // From component palette: { data: { type: 'button' } }
      dragData?.data?.component?.type ||  // From prebuilt/canvas drag: { data: { component: { type: 'button' } } }
      dragData?.type;                     // Fallback
    
    if (!draggedType) return true; // Allow if we can't determine type
    
    return accepts.includes(draggedType);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isOver || !containerRef.current || !active) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Determine zones based on mouse position
    const threshold = 40; // pixels from edge
    let zone: typeof dragOverZone = null;

    if (accepts.includes('container') || accepts.includes('row') || accepts.includes('column')) {
      // For containers, show all zones
      if (y < threshold) zone = 'top';
      else if (y > rect.height - threshold) zone = 'bottom';
      else if (x < threshold) zone = 'left';
      else if (x > rect.width - threshold) zone = 'right';
      else zone = 'center';
    } else if (orientation === 'horizontal') {
      // For horizontal layouts, prioritize left/right
      if (x < centerX) zone = 'left';
      else zone = 'right';
    } else {
      // For vertical layouts, prioritize top/bottom
      if (y < centerY) zone = 'top';
      else zone = 'bottom';
    }

    if (zone !== dragOverZone) {
      setDragOverZone(zone);
      onDragOver?.(zone);
    }
  }, [isOver, dragOverZone, accepts, orientation, onDragOver, active]);

  const handleMouseLeave = useCallback(() => {
    if (dragOverZone) {
      setDragOverZone(null);
      onDragOver?.(null);
    }
  }, [onDragOver, dragOverZone]);

  const setRefs = useCallback((element: HTMLDivElement | null) => {
    containerRef.current = element;
    setNodeRef(element);
  }, [setNodeRef]);

  const getDropIndicator = () => {
    if (!isOver || !dragOverZone || !active) return null;

    // Get the dragged item name from various possible locations
    const dragData = active.data.current;
    const draggedItem = 
      dragData?.data?.name ||           // From component palette: { data: { name: 'Button' } }
      dragData?.data?.type ||           // From component palette: { data: { type: 'button' } }  
      dragData?.data?.component?.type || // From canvas drag
      dragData?.type ||                 // Direct type
      'component';
    
    const isValid = isValidDrop();
    
    // Enhanced color scheme with better visibility
    const baseColor = isValid ? 'rgb(59, 130, 246)' : 'rgb(239, 68, 68)'; // blue-500 : red-500
    const lightColor = isValid ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)';
    const borderColor = isValid ? 'border-blue-500' : 'border-red-500';
    const bgColor = isValid ? 'bg-blue-500' : 'bg-red-500';
    const shadowColor = isValid ? 'shadow-blue-500/25' : 'shadow-red-500/25';

    switch (dragOverZone) {
      case 'top':
        return (
          <div className="absolute top-0 left-0 right-0 -translate-y-2 z-[60]">
            <div className={cn('h-1 rounded-full shadow-lg animate-pulse', bgColor, shadowColor)} />
            <div className={cn(
              'absolute left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full text-xs font-medium text-white shadow-lg border-2 border-white animate-bounce',
              bgColor
            )}>
              {isValid ? `Drop ${draggedItem} above` : `Cannot drop ${draggedItem} here`}
            </div>
          </div>
        );
      
      case 'bottom':
        return (
          <div className="absolute bottom-0 left-0 right-0 translate-y-2 z-[60]">
            <div className={cn('h-1 rounded-full shadow-lg animate-pulse', bgColor, shadowColor)} />
            <div className={cn(
              'absolute left-1/2 -translate-x-1/2 translate-y-1/2 px-3 py-1.5 rounded-full text-xs font-medium text-white shadow-lg border-2 border-white animate-bounce',
              bgColor
            )}>
              {isValid ? `Drop ${draggedItem} below` : `Cannot drop ${draggedItem} here`}
            </div>
          </div>
        );
      
      case 'left':
        return (
          <div className="absolute top-0 bottom-0 left-0 -translate-x-2 z-[60]">
            <div className={cn('w-1 h-full rounded-full shadow-lg animate-pulse', bgColor, shadowColor)} />
            <div className={cn(
              'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-medium text-white shadow-lg border-2 border-white animate-bounce',
              bgColor
            )}>
              {isValid ? `Drop ${draggedItem} left` : `Cannot drop ${draggedItem} here`}
            </div>
          </div>
        );
      
      case 'right':
        return (
          <div className="absolute top-0 bottom-0 right-0 translate-x-2 z-[60]">
            <div className={cn('w-1 h-full rounded-full shadow-lg animate-pulse', bgColor, shadowColor)} />
            <div className={cn(
              'absolute top-1/2 -translate-y-1/2 translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-medium text-white shadow-lg border-2 border-white animate-bounce',
              bgColor
            )}>
              {isValid ? `Drop ${draggedItem} right` : `Cannot drop ${draggedItem} here`}
            </div>
          </div>
        );
      
      case 'center':
        return (
          <div className="absolute inset-0 z-[50] pointer-events-none">
            <div 
              className={cn('absolute inset-0 border-4 border-dashed rounded-lg animate-pulse shadow-xl', borderColor)}
              style={{ backgroundColor: lightColor }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={cn(
                'px-4 py-2 rounded-full text-sm font-medium text-white shadow-xl animate-bounce border-2 border-white',
                bgColor
              )}>
                {isValid ? `Drop ${draggedItem} inside` : `Cannot drop ${draggedItem} here`}
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div
      ref={setRefs}
      style={style}
      className={cn(
        'relative transition-all duration-200',
        isOver && 'z-10',
        // Add background highlighting based on validity using semantic tokens
        isOver && isValidDrop() && 'bg-primary/5',
        isOver && !isValidDrop() && 'bg-destructive/5',
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {getDropIndicator()}
    </div>
  );
}