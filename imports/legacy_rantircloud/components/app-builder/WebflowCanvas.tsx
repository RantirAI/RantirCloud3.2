import { useState, useRef, useEffect, useMemo } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useClassStore } from '@/stores/classStore';
import { ComponentRenderer } from './ComponentRenderer';
import { EmptyCanvas } from './EmptyCanvas';
import { EnhancedDropZone } from './EnhancedDropZone';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, Tablet, Smartphone, MousePointer, Move, RotateCcw, ZoomIn, ZoomOut, Eye, EyeOff, Grid3X3, Layers } from 'lucide-react';
import { convertToLeanFormat, calculateStorageSavings } from '@/lib/componentExporter';

const MULTI_PAGE_ZOOM_THRESHOLD = 0.5; // 50% as decimal

interface CanvasGuide {
  id: string;
  type: 'horizontal' | 'vertical';
  position: number;
  visible: boolean;
}

export function WebflowCanvas() {
  const { 
    currentProject, 
    currentPage, 
    setCurrentPage,
    mode, 
    selectComponent, 
    selectedComponent, 
    showGrid, 
    zoom, 
    setZoom 
  } = useAppBuilderStore();
  
  const isMultiPageView = zoom < MULTI_PAGE_ZOOM_THRESHOLD;

  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isWireframe, setIsWireframe] = useState(false);
  const [guides, setGuides] = useState<CanvasGuide[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [showSelectionBounds, setShowSelectionBounds] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);

  const viewportSizes = {
    desktop: { width: '100%', maxWidth: '100%' },
    tablet: { width: '768px', maxWidth: '768px' },
    mobile: { width: '375px', maxWidth: '375px' }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      selectComponent(undefined);
    }
  };

  const handleZoomIn = () => {
    setZoom(Math.min(zoom + 0.25, 2)); // Max 200%
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom - 0.25, 0.1)); // Min 10% for multi-page view
  };

  const handleResetZoom = () => {
    setZoom(1); // 100%
    setCanvasOffset({ x: 0, y: 0 });
  };

  const handlePageSelect = (pageId: string) => {
    setCurrentPage(pageId);
    setZoom(1); // 100%
    setCanvasOffset({ x: 0, y: 0 });
  };

  const handleShowAllPages = () => {
    setZoom(0.25); // 25%
    setCanvasOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.metaKey)) { // Middle mouse or Cmd+click
      setIsDragging(true);
      setDragStart({ x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setCanvasOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const toggleGuide = (type: 'horizontal' | 'vertical', position: number) => {
    const guideId = `${type}-${position}`;
    const existingGuide = guides.find(g => g.id === guideId);
    
    if (existingGuide) {
      setGuides(guides.filter(g => g.id !== guideId));
    } else {
      setGuides([...guides, { id: guideId, type, position, visible: true }]);
    }
  };

  // Get current components
  const pageData = currentProject?.pages.find(p => p.id === currentPage);
  const currentComponents = pageData?.components || [];

  if (!currentProject || !currentPage) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">No project selected</div>
          <div className="text-sm">Create or select a project to start building</div>
        </div>
      </div>
    );
  }

  const hasComponents = currentComponents.length > 0;

  if (mode === 'preview') {
    return (
      <div className="h-full bg-background overflow-auto">
        <div className="min-h-full w-full flex justify-center p-6">
          <div className="w-full max-w-4xl">
            {hasComponents ? (
              <div className="space-y-4">
                {currentComponents.map((component) => (
                  <ComponentRenderer
                    key={component.id}
                    component={component}
                    isPreview={true}
                  />
                ))}
              </div>
            ) : (
              <EmptyCanvas />
            )}
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'code') {
    return <CodeView components={currentComponents} />;
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Canvas Toolbar */}
      <div className="flex items-center justify-between p-2 sm:p-3 bg-white border-b border-gray-200 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          {/* Viewport Controls */}
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={viewport === 'desktop' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewport('desktop')}
              className="h-7 px-1 sm:px-2"
            >
              <Monitor className="h-3 w-3" />
              <span className="hidden sm:inline ml-1 text-xs">Desktop</span>
            </Button>
            <Button
              variant={viewport === 'tablet' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewport('tablet')}
              className="h-7 px-1 sm:px-2"
            >
              <Tablet className="h-3 w-3" />
              <span className="hidden sm:inline ml-1 text-xs">Tablet</span>
            </Button>
            <Button
              variant={viewport === 'mobile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewport('mobile')}
              className="h-7 px-1 sm:px-2"
            >
              <Smartphone className="h-3 w-3" />
              <span className="hidden sm:inline ml-1 text-xs">Mobile</span>
            </Button>
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={isWireframe ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setIsWireframe(!isWireframe)}
              className="h-7 px-2"
              title="Wireframe mode"
            >
              <Eye className="h-3 w-3" />
            </Button>
            <Button
              variant={showSelectionBounds ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setShowSelectionBounds(!showSelectionBounds)}
              className="h-7 px-2"
              title="Show selection bounds"
            >
              <MousePointer className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Fullscreen Preview Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => useAppBuilderStore.getState().setFullscreenPreview(true)}
            className="h-7 px-2"
            title="Fullscreen Preview"
          >
            <Eye className="h-3 w-3" />
            <span className="hidden sm:inline ml-1 text-xs">Preview</span>
          </Button>

          {/* Multi-Page View Toggle */}
          <Button
            variant={isMultiPageView ? 'default' : 'ghost'}
            size="sm"
            onClick={handleShowAllPages}
            className="h-7 px-2"
            title="View all pages"
          >
            <Grid3X3 className="h-3 w-3" />
            <span className="hidden sm:inline ml-1 text-xs">All Pages</span>
          </Button>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              className="h-7 px-1.5 sm:px-2 border-0 shadow-none outline-none ring-0"
              disabled={zoom <= 0.1}
            >
              <ZoomOut className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetZoom}
              className="h-7 px-2 sm:px-3 font-mono text-xs border-0 shadow-none outline-none ring-0"
            >
              {Math.round(zoom * 100)}%
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              className="h-7 px-1.5 sm:px-2 border-0 shadow-none outline-none ring-0"
              disabled={zoom >= 2}
            >
              <ZoomIn className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div 
        ref={canvasRef}
        className="flex-1 overflow-auto scrollbar-hide relative bg-gray-100"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {/* Grid Background */}
        {showGrid && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
              transform: `scale(${zoom}) translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
              transformOrigin: 'top left'
            }}
          />
        )}

        {/* Guides */}
        {guides.map(guide => (
          <div
            key={guide.id}
            className="absolute pointer-events-none z-20"
            style={{
              [guide.type === 'horizontal' ? 'top' : 'left']: `${guide.position}px`,
              [guide.type === 'horizontal' ? 'left' : 'top']: 0,
              [guide.type === 'horizontal' ? 'right' : 'bottom']: 0,
              [guide.type === 'horizontal' ? 'height' : 'width']: '1px',
              backgroundColor: '#007bff',
              opacity: guide.visible ? 1 : 0
            }}
          />
        ))}

        {/* Canvas Content */}
        {isMultiPageView ? (
          // Multi-Page View - Show all pages in a grid
          <div 
            className="relative p-8"
            style={{
              transform: `scale(${zoom}) translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
              transformOrigin: 'top left',
            }}
          >
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {currentProject.pages.map((page) => {
                const pageComponents = page.components || [];
                const isCurrentPage = page.id === currentPage;
                
                return (
                  <div
                    key={page.id}
                    className={cn(
                      "relative cursor-pointer group transition-all duration-200",
                      "hover:ring-2 hover:ring-primary hover:ring-offset-2",
                      isCurrentPage && "ring-2 ring-primary ring-offset-2"
                    )}
                    onClick={() => handlePageSelect(page.id)}
                  >
                    {/* Page Preview Card */}
                    <div 
                      className={cn(
                        "bg-white shadow-lg rounded-lg overflow-hidden",
                        "w-[320px] h-[240px] relative"
                      )}
                    >
                      {/* Page Content Preview (scaled down) */}
                      <div 
                        className="absolute inset-0 overflow-hidden pointer-events-none"
                        style={{ transform: 'scale(0.25)', transformOrigin: 'top left' }}
                      >
                        <div className="w-[1280px] min-h-[960px] bg-white">
                          {pageComponents.length > 0 ? (
                            <div className="space-y-4 p-4">
                              {pageComponents.map((component) => (
                                <ComponentRenderer
                                  key={component.id}
                                  component={component}
                                  isPreview={true}
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                              <Layers className="h-12 w-12 opacity-20" />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Hover Overlay */}
                      <div className={cn(
                        "absolute inset-0 bg-primary/10 opacity-0 transition-opacity",
                        "group-hover:opacity-100 flex items-center justify-center"
                      )}>
                        <span className="text-primary font-medium text-sm bg-white px-3 py-1.5 rounded-full shadow">
                          Edit Page
                        </span>
                      </div>
                    </div>
                    
                    {/* Page Info */}
                    <div className="mt-3 text-center">
                      <h3 className="font-medium text-sm truncate">{page.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{page.route}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // Single Page View - Normal editing mode
          <div 
            className="relative flex justify-center p-4 w-full"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              minWidth: zoom < 1 ? `${100 / zoom}%` : '100%',
              marginLeft: canvasOffset.x,
              marginTop: canvasOffset.y,
            }}
          >
            <div 
              className={cn(
                "bg-white shadow-lg min-h-screen relative",
                isWireframe && "bg-gray-50",
                viewport === 'desktop' && "w-full max-w-none",
                viewport === 'tablet' && "w-[768px]",
                viewport === 'mobile' && "w-[375px]"
              )}
              style={{
                width: viewport === 'desktop' ? '100%' : viewportSizes[viewport].width,
                maxWidth: viewport === 'desktop' ? 'none' : viewportSizes[viewport].maxWidth
              }}
              onClick={handleCanvasClick}
            >
              {/* Component Selection Overlay */}
              {selectedComponent && showSelectionBounds && (
                <div className="absolute inset-0 pointer-events-none z-30">
                  <div className="absolute border-2 border-blue-500 bg-blue-500/10 rounded">
                    <div className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded-t">
                      Selected Component
                    </div>
                  </div>
                </div>
              )}

              <EnhancedDropZone
                id="canvas-root"
                accepts={[
                  'section', 'container', 'row', 'column', 'grid', 'text', 'heading', 'button', 
                  'input', 'textarea', 'select', 'checkbox', 'radio', 'image', 'card', 
                  'table', 'form', 'list', 'navigation', 'header', 'footer', 'sidebar', 
                  'modal', 'tabs', 'accordion', 'chart', 'calendar', 'datepicker', 
                  'fileupload', 'avatar', 'badge', 'alert', 'progress', 'skeleton', 
                  'separator', 'spacer', 'template'
                ]}
                parentId={null}
                index={currentComponents.length}
                className="h-full min-h-screen"
              >
                {hasComponents ? (
                  <div className={cn(
                    "space-y-4 p-4",
                    isWireframe && "webflow-wireframe"
                  )}>
                    {currentComponents.map((component) => (
                      <ComponentRenderer
                        key={component.id}
                        component={component}
                        isPreview={false}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyCanvas />
                )}
              </EnhancedDropZone>
            </div>
          </div>
        )}
      </div>

      {/* Ruler Overlay (for desktop viewport, hidden in multi-page view) */}
      {viewport === 'desktop' && !isMultiPageView && (
        <>
          {/* Horizontal Ruler */}
          <div className="absolute top-12 left-0 right-0 h-6 bg-gray-200 border-b flex items-end text-xs text-gray-600 overflow-hidden">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-8 h-full relative border-r border-gray-300"
                onClick={() => toggleGuide('vertical', i * 32)}
              >
                {i % 5 === 0 && (
                  <span className="absolute bottom-0 left-1 text-xs">{i * 32}</span>
                )}
              </div>
            ))}
          </div>

          {/* Vertical Ruler */}
          <div className="absolute top-12 left-0 w-6 bottom-0 bg-gray-200 border-r flex flex-col text-xs text-gray-600 overflow-hidden">
            {Array.from({ length: 100 }).map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 h-8 w-full relative border-b border-gray-300"
                onClick={() => toggleGuide('horizontal', i * 32)}
              >
                {i % 5 === 0 && (
                  <span 
                    className="absolute top-1 left-1 text-xs transform -rotate-90 origin-left"
                    style={{ transformOrigin: '0 0' }}
                  >
                    {i * 32}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Code View component with lean format toggle
function CodeView({ components }: { components: any[] }) {
  const [viewMode, setViewMode] = useState<'lean' | 'full'>('lean');
  const { classes } = useClassStore();

  const leanComponents = useMemo(() => 
    convertToLeanFormat(components, classes), 
    [components, classes]
  );

  const savings = useMemo(() => 
    calculateStorageSavings(components, classes),
    [components, classes]
  );

  const displayData = viewMode === 'lean' ? leanComponents : components;

  return (
    <div className="h-full bg-muted/20 p-4">
      <div className="bg-card border border-border rounded-lg h-full flex flex-col">
        <div className="p-4 border-b border-border flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="font-semibold">Generated Code</h3>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'lean' | 'full')}>
              <TabsList className="h-8">
                <TabsTrigger value="lean" className="text-xs px-3 h-6">
                  Lean Format
                </TabsTrigger>
                <TabsTrigger value="full" className="text-xs px-3 h-6">
                  Full JSON
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {viewMode === 'lean' && savings.savingsPercent > 0 && (
            <div className="text-xs text-muted-foreground">
              <span className="text-green-600 font-medium">{savings.savingsPercent}% smaller</span>
              <span className="mx-1">•</span>
              {(savings.leanSize / 1024).toFixed(1)}KB vs {(savings.originalSize / 1024).toFixed(1)}KB
            </div>
          )}
        </div>
        <div className="p-4 font-mono text-sm overflow-auto flex-1">
          <pre className="whitespace-pre-wrap text-xs">
            {JSON.stringify(displayData, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}