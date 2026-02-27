import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { MultiPageCanvas } from './MultiPageCanvas';
import { getIsAIBuilding } from '@/lib/aiBuildState';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useUserComponentStore } from '@/stores/userComponentStore';
import { useClassStore } from '@/stores/classStore';
import { useDesignSystemStore } from '@/stores/designSystemStore';
import { useDesignTokenFonts } from '@/hooks/useDesignTokenFonts';
import { ComponentRenderer } from './ComponentRenderer';
import { EmptyCanvas } from './EmptyCanvas';
import { EnhancedDropZone } from './EnhancedDropZone';
import { CodePreview } from './CodePreview';
import { ElementHighlight } from './ElementHighlight';
import { ElementHoverHighlight } from './ElementHoverHighlight';
import { FlexOverlay } from './FlexOverlay';
import { CanvasThemeProvider } from '@/hooks/useCanvasTheme';
import { CanvasWrapper } from './CanvasWrapper';
import { CommentModeOverlay } from './comments/CommentModeOverlay';
import { AIBuildingOverlay } from './AIBuildingOverlay';
import { cn } from '@/lib/utils';
import { generateCanvasCSS } from '@/lib/canvasCSSGenerator';
import { resolvePageBodyCSS } from '@/lib/pageBodyStyles';
import { Breakpoint } from '@/lib/breakpoints';
import { extractInheritableStyles, InheritedPropertySource } from '@/lib/parentStyleInheritance';

export function AppBuilderCanvas() {
  // Ensure typography fonts selected in the Design System are actually loaded.
  useDesignTokenFonts();

  const { 
    currentProject, 
    currentPage, 
    mode, 
    selectComponent, 
    showGrid, 
    zoom,
    setZoom,
    viewport,
    customCanvasWidth,
    setCustomCanvasWidth,
    selectedComponent,
    selectedComponents,
    hoveredComponent,
    addComponent,
    isCommentMode,
    editorMode,
  } = useAppBuilderStore();
  
  const { isEditingMode, editingDefinition, updateEditingDefinition } = useUserComponentStore();
  const { classes } = useClassStore();
  const { generatedCSS: designSystemCSS } = useDesignSystemStore();
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const [isResizingCanvas, setIsResizingCanvas] = useState(false);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  
  // Generate CSS from all classes for canvas injection
  // Uses breakpoint-simulated CSS (no @media queries) so the canvas
  // correctly displays styles for the selected viewport, regardless of
  // the actual iframe/window width
  const canvasCSS = useMemo(() => {
    if (!classes || classes.length === 0) return '';
    return generateCanvasCSS(classes, viewport as Breakpoint);
  }, [classes, viewport]);
  
  // Combine design system CSS with canvas CSS
  const combinedCSS = useMemo(() => {
    return [designSystemCSS, canvasCSS].filter(Boolean).join('\n\n');
  }, [designSystemCSS, canvasCSS]);
  
  // Handle mouse wheel zoom (Ctrl/Cmd + scroll)
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.min(2, Math.max(0.1, zoom + delta));
      setZoom(newZoom);
    }
  }, [zoom, setZoom]);
  
  // Handle space + drag for panning
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't intercept space when user is typing in an input, textarea, or contenteditable
    const target = e.target as HTMLElement;
    const isTypingContext = 
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.isContentEditable ||
      target.closest('[contenteditable="true"]');
    
    if (isTypingContext) {
      return; // Let the space character be typed normally
    }
    
    if (e.code === 'Space' && !isPanning && scrollContainerRef.current) {
      e.preventDefault();
      document.body.style.cursor = 'grab';
    }
  }, [isPanning]);
  
  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      document.body.style.cursor = '';
      setIsPanning(false);
    }
  }, []);
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Check if space is held for panning
    if (e.button === 0 && scrollContainerRef.current) {
      const isSpaceHeld = document.body.style.cursor === 'grab';
      if (isSpaceHeld) {
        e.preventDefault();
        setIsPanning(true);
        document.body.style.cursor = 'grabbing';
        setPanStart({
          x: e.clientX,
          y: e.clientY,
          scrollLeft: scrollContainerRef.current.scrollLeft,
          scrollTop: scrollContainerRef.current.scrollTop
        });
      }
    }
  }, []);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && scrollContainerRef.current) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      scrollContainerRef.current.scrollLeft = panStart.scrollLeft - dx;
      scrollContainerRef.current.scrollTop = panStart.scrollTop - dy;
    }
  }, [isPanning, panStart]);
  
  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      document.body.style.cursor = document.body.style.cursor === 'grabbing' ? 'grab' : '';
    }
  }, [isPanning]);
  
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleWheel, handleKeyDown, handleKeyUp]);
  
  const pageData = currentProject?.pages.find(p => p.id === currentPage);
  const currentPageData = pageData;
  
  // Determine which components to render based on editing mode
  // When editing a component, we render the editing definition (the root container) 
  // and the ComponentRenderer will handle rendering its children
  const baseComponents = isEditingMode && editingDefinition 
    ? [editingDefinition]  // Render the editing definition as the root
    : (pageData?.components || []);

  // Inject global headers from other pages (reference-based, not duplicated)
  const componentsToRender = useMemo(() => {
    if (isEditingMode || !currentProject || !currentPage || !pageData) return baseComponents;
    
    const globalHeaders = currentProject.settings?.globalHeaders || [];
    if (globalHeaders.length === 0) return baseComponents;

    const excludedHeaders = pageData.settings?.excludedGlobalHeaders || [];
    const injected: typeof baseComponents = [];

    for (const header of globalHeaders) {
      // Skip if this IS the source page (component already exists)
      if (header.sourcePageId === currentPage) continue;
      // Skip if excluded on this page
      if (excludedHeaders.includes(header.id)) continue;
      // Find source component from source page
      const sourcePage = currentProject.pages.find(p => p.id === header.sourcePageId);
      if (!sourcePage) continue;
      
      const findComponent = (comps: any[]): any => {
        for (const c of comps) {
          if (c.id === header.id) return c;
          if (c.children) { const f = findComponent(c.children); if (f) return f; }
        }
        return null;
      };
      const sourceComp = findComponent(sourcePage.components || []);
      if (!sourceComp) continue;

      // Clone with a flag indicating it's a global header instance
      injected.push({
        ...sourceComp,
        props: {
          ...sourceComp.props,
          _isGlobalHeaderInstance: true,
          _globalHeaderSourcePage: header.sourcePageId,
          _globalHeaderSourcePageName: sourcePage.name,
        }
      });
    }

    // Prepend horizontal headers, append vertical sidebars
    const horizontalHeaders = injected.filter(c => c.type === 'nav-horizontal');
    const verticalHeaders = injected.filter(c => c.type === 'nav-vertical' || c.type === 'sidebar');
    return [...horizontalHeaders, ...baseComponents, ...verticalHeaders];
  }, [baseComponents, currentProject, currentPage, pageData, isEditingMode]);

  const hasComponents = isEditingMode ? !!editingDefinition : componentsToRender.length > 0;
  const { isEmptyCanvasDismissed } = useAppBuilderStore();
  
  // Poll AI building state to show loading overlay.
  // Two-phase approach: turn overlay ON immediately when building starts,
  // but delay turning it OFF by 400ms so React has time to render components
  // before the overlay disappears (prevents blank-canvas flash).
  const [isAIBuilding, setIsAIBuilding] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const building = getIsAIBuilding();
      setIsAIBuilding(building);
      if (building) setShowOverlay(true); // show immediately
    }, 300); // faster poll: 300ms vs 500ms
    return () => clearInterval(interval);
  }, []);

  // Only hide overlay once building is done AND after a grace period
  useEffect(() => {
    if (!isAIBuilding && showOverlay) {
      const timeout = setTimeout(() => setShowOverlay(false), 400);
      return () => clearTimeout(timeout);
    }
  }, [isAIBuilding, showOverlay]);
  
  // Show empty canvas only when no components AND not dismissed for this specific page
  const isPageDismissed = currentPage ? isEmptyCanvasDismissed(currentPage) : false;
  const showEmptyCanvas = !hasComponents && !isPageDismissed && !isAIBuilding;

  const bodyStyles = useMemo(
    () => resolvePageBodyCSS(pageData?.bodyProperties, classes),
    [pageData?.bodyProperties, classes]
  );

  // Extract inheritable styles from the page body to pass to root components
  // This enables page body typography/color to cascade to all child elements
  const bodyInheritedStyles = useMemo(() => {
    const bodyProps = pageData?.bodyProperties || {};
    const bodyClasses = bodyProps.appliedClasses || ['body'];
    
    return extractInheritableStyles(
      bodyProps,
      bodyClasses,
      classes,
      'page-body'
    );
  }, [pageData?.bodyProperties, classes]);

  // Add inherited style context to components
  const withBodyInheritance = (component: any) => {
    if (!component || !component.props) {
      return {
        ...component,
        props: {
          ...component?.props,
          _inheritedStyles: bodyInheritedStyles.styles,
          _inheritedStyleSources: bodyInheritedStyles.sources,
        }
      };
    }
    return {
      ...component,
      props: {
        ...component.props,
        _inheritedStyles: component.props._inheritedStyles ?? bodyInheritedStyles.styles,
        _inheritedStyleSources: component.props._inheritedStyleSources ?? bodyInheritedStyles.sources,
      }
    };
  };

  const getViewportWidth = () => {
    // If custom width is set, use it
    if (customCanvasWidth !== null) {
      return `${customCanvasWidth}px`;
    }
    // Otherwise use viewport defaults
    switch (viewport) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      case 'desktop': return '1140px';
      default: return '1140px';
    }
  };

  const getViewportWidthNumber = () => {
    if (customCanvasWidth !== null) {
      return customCanvasWidth;
    }
    switch (viewport) {
      case 'mobile': return 375;
      case 'tablet': return 768;
      case 'desktop': return 1140;
      default: return 1140;
    }
  };

  // Canvas resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingCanvas(true);
    setResizeStartX(e.clientX);
    setResizeStartWidth(getViewportWidthNumber());
  }, [customCanvasWidth, viewport]);

  useEffect(() => {
    if (!isResizingCanvas) return;

    const handleResizeMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStartX;
      // Multiply by 2 because we're resizing from the right edge but the canvas is centered
      const newWidth = Math.max(320, Math.min(1920, resizeStartWidth + deltaX * 2));
      setCustomCanvasWidth(newWidth);
    };

    const handleResizeEnd = () => {
      setIsResizingCanvas(false);
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizingCanvas, resizeStartX, resizeStartWidth, setCustomCanvasWidth]);

  const getContainerStyles = () => {
    const baseStyles = {
      position: 'relative' as const,
      width: viewport === 'desktop' ? '100%' : getViewportWidth(),
      maxWidth: viewport === 'desktop' ? '100%' : getViewportWidth(),
      margin: '0 auto',
      // Must respect the parent (Layout/AppBuilder) height; using 100vh causes large overflow
      // when this canvas is rendered inside the app shell.
      minHeight: '100%'
    };

    if (showGrid) {
      return {
        ...baseStyles,
        backgroundImage: `
          linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px'
      };
    }

    return baseStyles;
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Only deselect if clicking on the canvas itself (not a child element)
    if (e.target === e.currentTarget) {
      selectComponent(undefined);
    }
  };

  // Handle native drag over for asset drops
  const handleDragOver = useCallback((e: React.DragEvent) => {
    // Check if this is an asset drag
    if (e.dataTransfer.types.includes('application/x-asset')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  // Handle native drop for assets (images/videos from AssetsPanel)
  const handleAssetDrop = useCallback((e: React.DragEvent) => {
    const assetData = e.dataTransfer.getData('application/x-asset');
    if (!assetData) return;

    e.preventDefault();
    
    try {
      const asset = JSON.parse(assetData);
      
      if (asset.type === 'image') {
        // Create an image component with the asset URL
        const imageComponent = {
          type: 'image' as const,
          props: {
            src: asset.url,
            alt: asset.altText || asset.name,
          },
          style: {
            width: '100%',
            maxWidth: '400px',
          }
        };
        addComponent(imageComponent as any, null, undefined);
      } else if (asset.type === 'video') {
        // Create a video component with the asset URL
        const videoComponent = {
          type: 'video' as const,
          props: {
            src: asset.url,
            controls: true,
          },
          style: {
            width: '100%',
            maxWidth: '600px',
          }
        };
        addComponent(videoComponent as any, null, undefined);
      }
    } catch (error) {
      console.error('Failed to parse asset data:', error);
    }
  }, [addComponent]);


  // Multi-page overview mode - render read-only grid
  if (editorMode === 'multi' && mode === 'design') {
    return <MultiPageCanvas />;
  }

  if (mode === 'preview') {
    return (
      <CanvasThemeProvider>
        {/* Inject design system CSS and generated class CSS */}
        {combinedCSS && <style dangerouslySetInnerHTML={{ __html: combinedCSS }} />}
        <CanvasWrapper className="h-full w-full overflow-auto scrollbar-hide">
          <div className="w-full min-h-full flex" style={bodyStyles} data-app-content>
            {hasComponents ? (
              (() => {
                // Separate sidebars from other components
                const sidebarComponents = componentsToRender.filter(c => c.type === 'sidebar');
                const otherComponents = componentsToRender.filter(c => c.type !== 'sidebar');
                
                return (
                  <>
                    {/* Render sidebars first - they'll be sticky and take up their natural width */}
                    {sidebarComponents.map((component) => (
                      <div key={component.id} className="sticky top-0 h-full overflow-y-auto scrollbar-hide">
                        <ComponentRenderer
                          component={withBodyInheritance(component)}
                          isPreview={true}
                        />
                      </div>
                    ))}
                    
                    {/* Render other components in the remaining space */}
                    <div className="flex-1 min-w-0">
                      {otherComponents.map((component) => (
                        <ComponentRenderer
                          key={component.id}
                          component={withBodyInheritance(component)}
                          isPreview={true}
                        />
                      ))}
                      {otherComponents.length === 0 && sidebarComponents.length > 0 && (
                        <div className="p-8 text-center text-muted-foreground">
                          Add components here - they'll appear next to the sidebar
                        </div>
                      )}
                    </div>
                  </>
                );
              })()
            ) : isAIBuilding ? (
              <EmptyCanvas />
            ) : showEmptyCanvas ? (
              <EmptyCanvas />
            ) : null}
          </div>
        </CanvasWrapper>
      </CanvasThemeProvider>
    );
  }

  if (mode === 'code') {
    return <CodePreview />;
  }

  // Calculate scrollable dimensions based on zoom
  const getScrollableDimensions = () => {
    const baseWidth = viewport === 'desktop' ? 1140 : viewport === 'tablet' ? 768 : 375;
    const scaledWidth = baseWidth * zoom;
    const scaledHeight = Math.max(window.innerHeight * zoom, window.innerHeight);
    return { width: scaledWidth, height: scaledHeight };
  };

  return (
    <CanvasThemeProvider>
      {/* Inject design system CSS and generated class CSS */}
      {combinedCSS && <style dangerouslySetInnerHTML={{ __html: combinedCSS }} />}
      <div 
        ref={scrollContainerRef}
        className={cn(
          "h-full w-full bg-zinc-100 dark:bg-zinc-900 canvas-scroll-container",
          isPanning && "select-none",
          isEditingMode && "ring-2 ring-primary/30 ring-inset"
        )}
        style={{
          overflow: 'auto',
          overflowX: 'auto',
          overflowY: 'auto',
          backgroundImage: showGrid ? `
            radial-gradient(circle, hsl(var(--muted-foreground) / 0.3) 1px, transparent 1px)
          ` : undefined,
          backgroundSize: showGrid ? '20px 20px' : undefined,
          backgroundPosition: showGrid ? '0 0' : undefined
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDragOver={handleDragOver}
        onDrop={handleAssetDrop}
      >
        <div 
          className="transition-all duration-200 flex justify-center p-4 sm:p-8 relative mx-auto"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            minHeight: `${Math.max(100, 100 / zoom)}vh`,
            width: 'fit-content',
          }}
          onClick={handleCanvasClick}
        >
          {/* Canvas container with resize handles */}
          <div className="relative">
            {/* AI Building progress banner — compact top-strip so sections are visible as they appear */}
            {showOverlay && <AIBuildingOverlay />}

            {/* Body container with fixed width to prevent percentage inheritance issues */}
            <CanvasWrapper 
              ref={canvasContainerRef}
              className={cn(
                "shadow-lg rounded-lg overflow-hidden relative z-10",
                "bg-background box-border",
                isEditingMode && 'border-2 border-primary/50',
                isResizingCanvas && 'select-none'
              )}
              style={{ 
                width: getViewportWidth(),
                maxWidth: getViewportWidth(),
                minHeight: '100%',
                // Safe inset for design mode - ensures elements never touch canvas edge
                '--canvas-safe-inset': '1px',
              } as React.CSSProperties}
              // Page Body styles (background/padding/flex/etc)
              // NOTE: CanvasWrapper forces width/height to fill frame; bodyStyles focuses on layout + visuals.
              contentStyle={bodyStyles as React.CSSProperties}
              data-canvas-container
              data-component-id="body"
            >
              <EnhancedDropZone
                id="canvas-root"
                accepts={['div', 'section', 'container', 'row', 'column', 'grid', 'spacer', 'separator', 'aspect-ratio', 'resizable', 'text', 'heading', 'blockquote', 'code', 'codeblock', 'link', 'button', 'input', 'textarea', 'select', 'checkbox', 'radio', 'switch', 'slider', 'form', 'label', 'combobox', 'input-otp', 'image', 'avatar', 'icon', 'fileupload', 'video', 'audio', 'table', 'datatable', 'list', 'card', 'chart', 'badge', 'keyboard', 'skeleton', 'navigation', 'header', 'footer', 'sidebar', 'tabs', 'breadcrumb', 'pagination', 'command', 'menubar', 'navigation-menu', 'alert', 'modal', 'drawer', 'dialog', 'sheet', 'popover', 'tooltip', 'hover-card', 'context-menu', 'dropdown-menu', 'accordion', 'collapsible', 'resizable', 'scroll-area', 'toggle', 'toggle-group', 'progress', 'calendar', 'date-picker', 'time-picker', 'carousel', 'rating', 'color-picker', 'map', 'timer', 'stopwatch', 'security-badge', 'social-button', 'weather', 'analytics', 'notification', 'feedback', 'live-chat', 'search', 'filter', 'download', 'refresh', 'settings', 'preferences', 'notifications', 'profile', 'globe', 'eye', 'template', 'login-form', 'register-form', 'user-profile', 'auth-status', 'dynamic-list', 'pro-dynamic-list', 'dynamic-grid', 'data-display', 'theme-toggle', 'form-wrapper', 'form-wizard', 'password-input', 'radio-group', 'checkbox-group', 'nav-horizontal', 'nav-vertical']}
                parentId={isEditingMode && editingDefinition ? editingDefinition.id : null}
                index={isEditingMode && editingDefinition ? (editingDefinition.children?.length || 0) : componentsToRender.length}
                className="w-full box-border"
                style={{ minHeight: 'calc(100vh - 8rem)' }}
              >
                {hasComponents ? (
                  <div className="w-full min-h-full box-border">
                    {componentsToRender.map((component) => (
                      <ComponentRenderer
                        key={component.id}
                        component={withBodyInheritance(component)}
                        isPreview={false}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="w-full" style={{ minHeight: 'calc(100vh - 8rem)' }} />
                )}
              </EnhancedDropZone>
               
              {/* EmptyCanvas overlay - positioned outside drop zone so it doesn't block drops */}
              {showEmptyCanvas && <EmptyCanvas />}

              
              {/* Element Highlights - positioned inside a container matching the content area */}
              {mode === 'design' && (
                <div 
                  className="absolute inset-0 pointer-events-none z-[9998]"
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                  data-highlight-container
                >
                  {/* Hover highlight - show for hovered component (unless selected) */}
                  {hoveredComponent && hoveredComponent !== selectedComponent && !selectedComponents.includes(hoveredComponent) && (
                    <ElementHoverHighlight
                      componentId={hoveredComponent}
                    />
                  )}
                  
                   {/* Selected component highlight */}
                   {selectedComponent && (
                     <ElementHighlight
                       componentId={selectedComponent}
                       isSelected={true}
                       isHovered={false}
                     />
                   )}
                   
                   {/* Flex layout overlay - show for selected flex containers */}
                   {selectedComponent && (
                     <FlexOverlay componentId={selectedComponent} />
                   )}
                  {selectedComponents.map(componentId => 
                    componentId !== selectedComponent ? (
                      <ElementHighlight
                        key={componentId}
                        componentId={componentId}
                        isSelected={true}
                        isHovered={false}
                      />
                    ) : null
                  )}
                </div>
              )}
              
              {/* Comment Mode Overlay - positioned above highlights */}
              {mode === 'design' && currentProject && currentPage && (
                <CommentModeOverlay
                  appProjectId={currentProject.id}
                  pageId={currentPage}
                  workspaceId={currentProject.workspace_id}
                  isActive={isCommentMode}
                  canvasRef={canvasContainerRef}
                />
              )}
            </CanvasWrapper>

            {/* Right Resize Handle */}
            {mode === 'design' && (
              <div
                className="absolute top-0 -right-4 w-8 h-full cursor-ew-resize flex items-center justify-center z-20 group"
                onMouseDown={handleResizeStart}
              >
                <div className={cn(
                  "w-1.5 h-16 rounded-full transition-colors",
                  "bg-border hover:bg-primary",
                  isResizingCanvas && "bg-primary"
                )} />
              </div>
            )}
          </div>

          {/* Width indicator when resizing */}
          {isResizingCanvas && (
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium z-30">
              {getViewportWidthNumber()}px
            </div>
          )}
        </div>
      </div>
    </CanvasThemeProvider>
  );
}
