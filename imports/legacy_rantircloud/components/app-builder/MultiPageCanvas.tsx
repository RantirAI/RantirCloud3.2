import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useClassStore } from '@/stores/classStore';
import { useDesignSystemStore } from '@/stores/designSystemStore';
import { ComponentRenderer } from './ComponentRenderer';
import { CanvasThemeProvider } from '@/hooks/useCanvasTheme';
import { CanvasWrapper } from './CanvasWrapper';
import { generateCanvasCSS } from '@/lib/canvasCSSGenerator';
import { resolvePageBodyCSS } from '@/lib/pageBodyStyles';
import { cn } from '@/lib/utils';
import { Layers, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breakpoint } from '@/lib/breakpoints';

export function MultiPageCanvas() {
  const {
    currentProject,
    currentPage,
    setCurrentPage,
    setEditorMode,
    selectComponent,
  } = useAppBuilderStore();

  const { classes } = useClassStore();
  const { generatedCSS: designSystemCSS } = useDesignSystemStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.2);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // Generate CSS for previews
  const canvasCSS = useMemo(() => {
    if (!classes || classes.length === 0) return '';
    return generateCanvasCSS(classes, 'desktop' as Breakpoint);
  }, [classes]);

  const combinedCSS = useMemo(() => {
    return [designSystemCSS, canvasCSS].filter(Boolean).join('\n\n');
  }, [designSystemCSS, canvasCSS]);

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.02 : 0.02;
      setZoom(prev => Math.min(0.5, Math.max(0.08, prev + delta)));
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (container) container.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // Panning with space+drag or middle mouse
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.button === 1 || (e.button === 0 && e.altKey)) && containerRef.current) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({
        x: e.clientX,
        y: e.clientY,
        scrollLeft: containerRef.current.scrollLeft,
        scrollTop: containerRef.current.scrollTop,
      });
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && containerRef.current) {
      containerRef.current.scrollLeft = panStart.scrollLeft - (e.clientX - panStart.x);
      containerRef.current.scrollTop = panStart.scrollTop - (e.clientY - panStart.y);
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handlePageClick = (pageId: string) => {
    selectComponent(undefined);
    setCurrentPage(pageId);
    setEditorMode('single');
  };

  if (!currentProject) return null;

  const pages = currentProject.pages;

  return (
    <CanvasThemeProvider>
      {combinedCSS && <style dangerouslySetInnerHTML={{ __html: combinedCSS }} />}

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-1 bg-background/90 backdrop-blur-sm border border-border rounded-lg p-1 shadow-sm">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoom(z => Math.max(0.08, z - 0.04))}>
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs font-medium tabular-nums min-w-[40px] text-center text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoom(z => Math.min(0.5, z + 0.04))}>
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <div className="h-4 w-px bg-border" />
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoom(0.2)}>
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div
        ref={containerRef}
        className={cn(
          "h-full w-full overflow-auto relative",
          isPanning && "cursor-grabbing select-none"
        )}
        style={{
          backgroundColor: 'hsl(var(--muted) / 0.5)',
          backgroundImage: 'radial-gradient(circle, hsl(var(--muted-foreground) / 0.3) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="p-12"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            width: `${100 / zoom}%`,
          }}
        >
          <div className="flex flex-wrap gap-12">
            {pages.map((page) => {
              const isActive = page.id === currentPage;
              const bodyStyles = resolvePageBodyCSS(page.bodyProperties, classes);

              return (
                <div
                  key={page.id}
                  className="flex flex-col items-center group cursor-pointer"
                  onClick={() => handlePageClick(page.id)}
                >
                  {/* Page name on top */}
                  <div className={cn(
                    "mb-4 text-center transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    <h3 className="font-semibold text-base">{page.name}</h3>
                    <p className="text-xs opacity-70">{page.route}</p>
                  </div>
                  {/* Page preview frame */}
                  <div
                    className={cn(
                      "relative bg-background shadow-xl rounded-lg overflow-hidden transition-all duration-200",
                      "border-2",
                      isActive
                        ? "border-primary ring-4 ring-primary/20"
                        : "border-border/50 hover:border-primary/50 hover:ring-2 hover:ring-primary/10"
                    )}
                    style={{
                      width: '1440px',
                      minHeight: '900px',
                    }}
                  >
                    {/* Read-only page render */}
                    <div
                      className="pointer-events-none select-none"
                      style={bodyStyles as React.CSSProperties}
                    >
                      {page.components && page.components.length > 0 ? (
                        page.components.map((component) => (
                          <ComponentRenderer
                            key={component.id}
                            component={component}
                            isPreview={true}
                          />
                        ))
                      ) : (
                        <div className="flex items-center justify-center h-[900px] text-muted-foreground/30">
                          <Layers className="h-24 w-24" />
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      </div>
    </CanvasThemeProvider>
  );
}
