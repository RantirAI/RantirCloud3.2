import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Monitor, Tablet, Smartphone, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResponsiveControlsProps {
  viewport: 'desktop' | 'tablet' | 'mobile';
  onViewportChange: (viewport: 'desktop' | 'tablet' | 'mobile') => void;
  className?: string;
}

export function ResponsiveControls({ 
  viewport, 
  onViewportChange, 
  className 
}: ResponsiveControlsProps) {
  const [isPortrait, setIsPortrait] = useState(true);

  const viewportSizes = {
    desktop: { width: '100%', label: 'Desktop' },
    tablet: { 
      width: isPortrait ? '768px' : '1024px', 
      label: `Tablet ${isPortrait ? 'Portrait' : 'Landscape'}` 
    },
    mobile: { 
      width: isPortrait ? '375px' : '667px', 
      label: `Mobile ${isPortrait ? 'Portrait' : 'Landscape'}` 
    }
  };

  const handleViewportChange = (newViewport: 'desktop' | 'tablet' | 'mobile') => {
    onViewportChange(newViewport);
  };

  const toggleOrientation = () => {
    setIsPortrait(!isPortrait);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-1 border rounded-lg p-1 bg-background">
        <Button
          variant={viewport === 'desktop' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleViewportChange('desktop')}
          className="h-8 px-3"
        >
          <Monitor className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Desktop</span>
        </Button>
        <Button
          variant={viewport === 'tablet' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleViewportChange('tablet')}
          className="h-8 px-3"
        >
          <Tablet className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Tablet</span>
        </Button>
        <Button
          variant={viewport === 'mobile' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleViewportChange('mobile')}
          className="h-8 px-3"
        >
          <Smartphone className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Mobile</span>
        </Button>
      </div>

      {/* Orientation Toggle for Tablet/Mobile */}
      {(viewport === 'tablet' || viewport === 'mobile') && (
        <Button
          variant="outline"
          size="sm"
          onClick={toggleOrientation}
          className="h-8 px-3"
          title={`Switch to ${isPortrait ? 'Landscape' : 'Portrait'}`}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      )}

      {/* Current Viewport Info */}
      <div className="text-sm text-muted-foreground hidden md:block">
        {viewportSizes[viewport].label} • {viewportSizes[viewport].width}
      </div>
    </div>
  );
}