import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface Guide {
  id: string;
  type: 'horizontal' | 'vertical';
  position: number;
  visible: boolean;
}

interface CanvasRulersProps {
  zoom: number;
  canvasOffset: { x: number; y: number };
  guides: Guide[];
  onAddGuide: (type: 'horizontal' | 'vertical', position: number) => void;
  onRemoveGuide: (guideId: string) => void;
  className?: string;
}

export function CanvasRulers({
  zoom,
  canvasOffset,
  guides,
  onAddGuide,
  onRemoveGuide,
  className
}: CanvasRulersProps) {
  const horizontalRulerRef = useRef<HTMLDivElement>(null);
  const verticalRulerRef = useRef<HTMLDivElement>(null);
  const [isDraggingGuide, setIsDraggingGuide] = useState<string | null>(null);

  const rulerSize = 24;
  const majorTickInterval = 100;
  const minorTickInterval = 20;

  const handleRulerClick = (e: React.MouseEvent, type: 'horizontal' | 'vertical') => {
    const rect = e.currentTarget.getBoundingClientRect();
    const position = type === 'horizontal' 
      ? e.clientY - rect.top 
      : e.clientX - rect.left;
    
    const adjustedPosition = (position - (type === 'horizontal' ? canvasOffset.y : canvasOffset.x)) / (zoom / 100);
    onAddGuide(type, adjustedPosition);
  };

  const handleGuideDoubleClick = (guideId: string) => {
    onRemoveGuide(guideId);
  };

  const renderTicks = (type: 'horizontal' | 'vertical', length: number) => {
    const ticks = [];
    const tickCount = Math.ceil(length / minorTickInterval);

    for (let i = 0; i <= tickCount; i++) {
      const position = i * minorTickInterval;
      const isMajor = position % majorTickInterval === 0;
      
      ticks.push(
        <div
          key={i}
          className={cn(
            "absolute border-gray-400",
            type === 'horizontal' 
              ? `top-0 border-l w-0 ${isMajor ? 'h-6' : 'h-3'}` 
              : `left-0 border-t h-0 ${isMajor ? 'w-6' : 'w-3'}`
          )}
          style={{
            [type === 'horizontal' ? 'left' : 'top']: `${position}px`
          }}
        />
      );

      // Add labels for major ticks
      if (isMajor && position > 0) {
        ticks.push(
          <div
            key={`label-${i}`}
            className={cn(
              "absolute text-xs text-gray-600 pointer-events-none",
              type === 'horizontal' 
                ? "top-1 transform -rotate-90 origin-left" 
                : "left-1 top-0"
            )}
            style={{
              [type === 'horizontal' ? 'left' : 'top']: `${position + 2}px`
            }}
          >
            {position}
          </div>
        );
      }
    }

    return ticks;
  };

  const renderGuides = () => {
    return guides.map(guide => (
      <div
        key={guide.id}
        className={cn(
          "absolute z-30 cursor-pointer",
          guide.type === 'horizontal' 
            ? "left-0 right-0 h-px bg-blue-500 border-t border-blue-600" 
            : "top-0 bottom-0 w-px bg-blue-500 border-l border-blue-600",
          !guide.visible && "opacity-0"
        )}
        style={{
          [guide.type === 'horizontal' ? 'top' : 'left']: `${guide.position * (zoom / 100) + (guide.type === 'horizontal' ? canvasOffset.y : canvasOffset.x)}px`
        }}
        onDoubleClick={() => handleGuideDoubleClick(guide.id)}
      >
        {/* Guide handle */}
        <div
          className={cn(
            "absolute bg-blue-500 hover:bg-blue-600 cursor-grab",
            guide.type === 'horizontal' 
              ? "left-0 w-6 h-2 -top-1" 
              : "top-0 h-6 w-2 -left-1"
          )}
        />
      </div>
    ));
  };

  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      {/* Horizontal Ruler */}
      <div
        ref={horizontalRulerRef}
        className="absolute top-0 left-6 right-0 bg-muted border-b border-border pointer-events-auto cursor-crosshair"
        style={{ height: rulerSize }}
        onClick={(e) => handleRulerClick(e, 'vertical')}
      >
        <div className="relative h-full overflow-hidden">
          {renderTicks('vertical', 2000)}
        </div>
      </div>

      {/* Vertical Ruler */}
      <div
        ref={verticalRulerRef}
        className="absolute left-0 top-6 bottom-0 bg-muted border-r border-border pointer-events-auto cursor-crosshair"
        style={{ width: rulerSize }}
        onClick={(e) => handleRulerClick(e, 'horizontal')}
      >
        <div className="relative w-full overflow-hidden">
          {renderTicks('horizontal', 2000)}
        </div>
      </div>

      {/* Corner */}
      <div 
        className="absolute top-0 left-0 bg-accent border-r border-b border-border"
        style={{ width: rulerSize, height: rulerSize }}
      />

      {/* Guides */}
      <div className="absolute inset-0">
        {renderGuides()}
      </div>
    </div>
  );
}