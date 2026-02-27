import { useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { cn } from '@/lib/utils';
import { GripVertical, ArrowUp, ArrowDown, Settings } from 'lucide-react';
import { HeadingSettingsPopup, getTextElementDisplayLabel, getComponentSemanticTag } from './HeadingSettingsPopup';
import { CodeSettingsPopup } from './CodeSettingsPopup';

interface ElementHighlightProps {
  componentId: string;
  isSelected: boolean;
  isHovered: boolean;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onOpenProperties?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function ElementHighlight({
  componentId,
  isSelected,
  onMoveUp,
  onMoveDown
}: ElementHighlightProps) {
  const [elementBounds, setElementBounds] = useState<DOMRect | null>(null);
  const [showHeadingSettings, setShowHeadingSettings] = useState(false);
  const [showCodeSettings, setShowCodeSettings] = useState(false);
  const { currentProject, currentPage, moveComponentUp, moveComponentDown, zoom } = useAppBuilderStore();
  
  // Get the component data to find the element type
  const pageData = currentProject?.pages.find(p => p.id === currentPage);
  const findComponentById = (components: any[], id: string): any => {
    for (const comp of components) {
      if (comp.id === id) return comp;
      if (comp.children) {
        const found = findComponentById(comp.children, id);
        if (found) return found;
      }
    }
    return null;
  };
  const component = pageData ? findComponentById(pageData.components || [], componentId) : null;
  const elementType = component?.type || 'element';
  
  // Check if this is a heading or text component (both are text elements with semantic tags)
  const isTextOrHeading = elementType === 'heading' || elementType === 'text';
  const isCodeElement = elementType === 'code';
  
  // Get the semantic tag for display (H1-H6 or Body)
  const semanticTag = getComponentSemanticTag(component);

  // Find parent ID and index for drag functionality
  const findParentInfo = (components: any[], targetId: string, parentId?: string): { parentId?: string; index: number } | null => {
    for (let i = 0; i < components.length; i++) {
      const comp = components[i];
      if (comp.id === targetId) {
        return { parentId, index: i };
      }
      if (comp.children) {
        const found = findParentInfo(comp.children, targetId, comp.id);
        if (found) return found;
      }
    }
    return null;
  };
  const parentInfo = pageData ? findParentInfo(pageData.components || [], componentId) : null;

  // Setup draggable for the label/grip area
  const { 
    attributes: dragAttributes, 
    listeners: dragListeners, 
    setNodeRef: setDragRef, 
    transform: dragTransform, 
    isDragging 
  } = useDraggable({
    id: `component-${componentId}`,
    data: {
      type: component?.type || 'element',
      data: {
        id: componentId,
        component: component,
        parentId: parentInfo?.parentId,
        index: parentInfo?.index,
        source: 'canvas'
      }
    }
  });

  // Serialize component props to detect style changes
  const componentPropsString = JSON.stringify(component?.props || {});
  const componentStyleString = JSON.stringify(component?.style || {});

  useEffect(() => {
    if (!isSelected) {
      setElementBounds(null);
      return;
    }

    const updateElementBounds = () => {
      const element = document.querySelector(`[data-component-id="${componentId}"]`);
      if (!element) {
        setElementBounds(null);
        return;
      }

      const rect = element.getBoundingClientRect();
      const canvasContainer = document.querySelector('[data-canvas-container]');
      
      if (!canvasContainer) {
        setElementBounds(null);
        return;
      }

      const canvasRect = canvasContainer.getBoundingClientRect();
      
      // Get the content wrapper inside CanvasWrapper (the one with contentStyle applied)
      const contentWrapper = canvasContainer.querySelector('[data-canvas-content]');
      const contentRect = contentWrapper ? contentWrapper.getBoundingClientRect() : canvasRect;
      
      // Calculate position relative to the content wrapper, accounting for zoom
      // This ensures the highlight aligns with the actual rendered element
      const relativeRect = {
        left: (rect.left - contentRect.left) / zoom,
        top: (rect.top - contentRect.top) / zoom,
        width: rect.width / zoom,
        height: rect.height / zoom,
        right: 0,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON: () => ({})
      } as DOMRect;
      
      setElementBounds(relativeRect);
    };

    // Initial update with a small delay to ensure DOM is ready
    const initialTimeout = setTimeout(updateElementBounds, 0);

    const element = document.querySelector(`[data-component-id="${componentId}"]`);
    if (!element) return;

    // Create MutationObserver to watch for style and attribute changes on the element AND its ancestors
    const observer = new MutationObserver(() => {
      updateElementBounds();
    });

    // Observe the element for changes
    observer.observe(element, {
      attributes: true,
      attributeFilter: ['style', 'class'],
      childList: true,
      subtree: true
    });

    // Also observe parent elements for layout changes (margin/padding on parents affect child position)
    let parent = element.parentElement;
    while (parent && !parent.hasAttribute('data-canvas-container')) {
      observer.observe(parent, {
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
      parent = parent.parentElement;
    }

    // Create ResizeObserver to watch for size changes
    const resizeObserver = new ResizeObserver(() => {
      updateElementBounds();
    });
    resizeObserver.observe(element);

    // Update on scroll or window resize
    const scrollContainer = document.querySelector('.canvas-scroll-container');
    const canvas = document.querySelector('[data-canvas-container]');
    
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updateElementBounds);
    }
    if (canvas) {
      canvas.addEventListener('scroll', updateElementBounds);
    }
    window.addEventListener('resize', updateElementBounds);

    // Use requestAnimationFrame for continuous smooth updates
    let animationFrame: number;
    const continuousUpdate = () => {
      updateElementBounds();
      animationFrame = requestAnimationFrame(continuousUpdate);
    };
    animationFrame = requestAnimationFrame(continuousUpdate);
    
    return () => {
      clearTimeout(initialTimeout);
      observer.disconnect();
      resizeObserver.disconnect();
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', updateElementBounds);
      }
      if (canvas) {
        canvas.removeEventListener('scroll', updateElementBounds);
      }
      window.removeEventListener('resize', updateElementBounds);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [componentId, isSelected, zoom, componentPropsString, componentStyleString]);

  // Close popup when component is deselected
  useEffect(() => {
    if (!isSelected) {
      setShowHeadingSettings(false);
      setShowCodeSettings(false);
    }
  }, [isSelected]);

  if (!elementBounds || !isSelected) {
    return null;
  }

  // Get width and height display values
  const getDisplayDimension = (value: any) => {
    if (typeof value === 'number') return `${value}px`;
    if (typeof value === 'string') {
      if (value.includes('%')) return value;
      if (value === 'auto') return 'auto';
      if (value.includes('px')) return value;
      return value;
    }
    return 'auto';
  };

  const widthDisplay = getDisplayDimension(component?.style?.width || component?.props?.style?.width || Math.round(elementBounds.width));
  const heightDisplay = getDisplayDimension(component?.style?.height || component?.props?.style?.height || Math.round(elementBounds.height));

  const handleMoveUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMoveUp) {
      onMoveUp();
    } else {
      moveComponentUp(componentId);
    }
  };

  const handleMoveDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMoveDown) {
      onMoveDown();
    } else {
      moveComponentDown(componentId);
    }
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCodeElement) {
      setShowCodeSettings(prev => !prev);
    } else if (isTextOrHeading) {
      setShowHeadingSettings(prev => !prev);
    }
  };

  // Get display label for element type - use semantic tag for text elements
  const getDisplayLabel = () => {
    if (isTextOrHeading) {
      // Use the semantic tag display (H1, H2, ..., H6, Body)
      const tagLabel = getTextElementDisplayLabel(component);
      return tagLabel === 'Body' ? 'Body' : `Heading ${tagLabel}`;
    }
    return elementType.charAt(0).toUpperCase() + elementType.slice(1).toLowerCase();
  };

  return (
    <>
      {/* Element type label with drag icon, settings, and move buttons */}
      <div
        className="absolute z-[9999] bg-[#3B82F6] text-white text-[10px] px-1.5 py-0.5 rounded-sm font-medium flex items-center gap-1 pointer-events-auto"
        style={{
          left: `${elementBounds.left}px`,
          top: `${elementBounds.top - 20}px`,
          ...(dragTransform ? {
            transform: `translate3d(${dragTransform.x}px, ${dragTransform.y}px, 0)`,
            zIndex: 10000,
          } : {}),
        }}
      >
        {/* Draggable grip and label area - ONLY this part activates drag */}
        <div 
          ref={setDragRef}
          {...dragAttributes}
          {...dragListeners}
          className={cn(
            "flex items-center gap-0.5 cursor-grab",
            isDragging && "cursor-grabbing"
          )}
        >
          <GripVertical className="h-2.5 w-2.5" />
          <span>{getDisplayLabel()}</span>
        </div>
        
        {/* Settings icon for heading/text/code - visible only for text elements */}
        {(isTextOrHeading || isCodeElement) && (
          <button
            className="h-4 w-4 p-0 flex items-center justify-center rounded bg-white/20 hover:bg-white/40 transition-colors pointer-events-auto"
            onClick={handleSettingsClick}
            title="Text settings (change semantic tag)"
          >
            <Settings className="h-2.5 w-2.5" />
          </button>
        )}
        
        <div className="flex items-center gap-0.5 pointer-events-auto">
          <button
            className="h-4 w-4 p-0 flex items-center justify-center rounded bg-black/20 hover:bg-black/40 transition-colors"
            onClick={handleMoveUp}
          >
            <ArrowUp className="h-2.5 w-2.5" />
          </button>
          <button
            className="h-4 w-4 p-0 flex items-center justify-center rounded bg-black/20 hover:bg-black/40 transition-colors"
            onClick={handleMoveDown}
          >
            <ArrowDown className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      {/* Heading Settings Popup - positioned BELOW the element */}
      {showHeadingSettings && isTextOrHeading && elementBounds && (
        <HeadingSettingsPopup
          componentId={componentId}
          initialPosition={{
            x: elementBounds.left,
            y: elementBounds.top + elementBounds.height + 8
          }}
          onClose={() => setShowHeadingSettings(false)}
        />
      )}

      {/* Code Settings Popup - positioned BELOW the element */}
      {showCodeSettings && isCodeElement && elementBounds && (
        <CodeSettingsPopup
          componentId={componentId}
          initialPosition={{
            x: elementBounds.left,
            y: elementBounds.top + elementBounds.height + 8
          }}
          onClose={() => setShowCodeSettings(false)}
          onOpenDataSettings={() => {
            // Dispatch custom event to switch to Data & Settings tab
            window.dispatchEvent(new CustomEvent('app-builder:switch-tab', { detail: 'data-settings' }));
          }}
        />
      )}

      {/* Dimension label - below container */}
      <div
        className="absolute pointer-events-none z-[9999] bg-[#3B82F6] text-white text-[10px] px-1.5 py-0.5 rounded-sm font-medium"
        style={{
          left: `${elementBounds.left + elementBounds.width / 2}px`,
          top: `${elementBounds.top + elementBounds.height + 4}px`,
          transform: 'translateX(-50%)',
        }}
      >
        {widthDisplay} × {heightDisplay}
      </div>
      
      {/* Element border */}
      <div
        className="absolute pointer-events-none z-[9999] border border-solid border-[#3B82F6]"
        style={{
          left: `${elementBounds.left}px`,
          top: `${elementBounds.top}px`,
          width: `${elementBounds.width}px`,
          height: `${elementBounds.height}px`,
          position: 'absolute'
        }}
      />
    </>
  );
}