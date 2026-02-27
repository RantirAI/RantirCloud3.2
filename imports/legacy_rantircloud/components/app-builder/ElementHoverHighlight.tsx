import { useState, useEffect } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';

interface ElementHoverHighlightProps {
  componentId: string;
}

export function ElementHoverHighlight({ componentId }: ElementHoverHighlightProps) {
  const [elementBounds, setElementBounds] = useState<DOMRect | null>(null);
  const { currentProject, currentPage, zoom, selectedComponent, selectedComponents } = useAppBuilderStore();
  
  // Don't show hover highlight if component is selected
  const isSelected = selectedComponent === componentId || selectedComponents.includes(componentId);
  
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
  const headingLevel = component?.props?.level;

  useEffect(() => {
    if (isSelected) {
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

      // Get the content wrapper inside CanvasWrapper
      const contentWrapper = canvasContainer.querySelector('[data-canvas-content]');
      const contentRect = contentWrapper ? contentWrapper.getBoundingClientRect() : canvasContainer.getBoundingClientRect();
      
      // Calculate position relative to the content wrapper, accounting for zoom
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

    updateElementBounds();
    
    // Update on scroll or resize
    const scrollContainer = document.querySelector('.canvas-scroll-container');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updateElementBounds);
    }
    window.addEventListener('resize', updateElementBounds);
    
    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', updateElementBounds);
      }
      window.removeEventListener('resize', updateElementBounds);
    };
  }, [componentId, zoom, isSelected]);

  // Get display label for element type
  const getDisplayLabel = () => {
    if (elementType === 'heading' && headingLevel) {
      return `H${headingLevel}`;
    }
    
    const typeMap: Record<string, string> = {
      'container': 'Div',
      'text': 'Text',
      'heading': 'Heading',
      'button': 'Button',
      'input': 'Input',
      'textarea': 'Textarea',
      'image': 'Image',
      'card': 'Card',
      'row': 'Row',
      'column': 'Column',
      'grid': 'Grid',
      'section': 'Section',
      'select': 'Select',
      'checkbox': 'Checkbox',
      'radio': 'Radio',
      'switch': 'Switch',
      'slider': 'Slider',
      'alert': 'Alert',
      'badge': 'Badge',
      'progress': 'Progress',
      'avatar': 'Avatar',
      'separator': 'Separator',
      'label': 'Label',
      'form': 'Form',
      'link': 'Link',
      'video': 'Video',
      'audio': 'Audio',
      'code': 'Code',
      'icon': 'Icon',
    };
    
    return typeMap[elementType] || elementType.charAt(0).toUpperCase() + elementType.slice(1);
  };

  if (!elementBounds || isSelected) {
    return null;
  }

  return (
    <>
      {/* Hover label - text only, no background, top-left */}
      <div
        className="absolute z-[9998] text-[#3B82F6] text-[11px] font-medium pointer-events-none"
        style={{
          left: `${elementBounds.left}px`,
          top: `${elementBounds.top - 18}px`,
        }}
      >
        {getDisplayLabel()}
      </div>
      
      {/* Light blue transparent border */}
      <div
        className="absolute pointer-events-none z-[9998]"
        style={{
          left: `${elementBounds.left}px`,
          top: `${elementBounds.top}px`,
          width: `${elementBounds.width}px`,
          height: `${elementBounds.height}px`,
          border: '1px solid rgba(59, 130, 246, 0.5)',
          backgroundColor: 'rgba(59, 130, 246, 0.03)',
        }}
      />
    </>
  );
}
