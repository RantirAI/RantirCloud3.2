import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface ComponentDragHandleProps {
  componentId: string;
  component: any;
  parentId?: string;
  index?: number;
  isSelected: boolean;
  className?: string;
}

export function ComponentDragHandle({ 
  componentId, 
  component, 
  parentId, 
  index, 
  isSelected,
  className 
}: ComponentDragHandleProps) {
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform, 
    isDragging 
  } = useDraggable({
    id: `component-${componentId}`,
    data: {
      type: component.type,
      data: {
        id: componentId,
        component: component,
        parentId: parentId,
        index: index,
        source: 'canvas'
      }
    }
  });

  const dragStyle = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : 'auto',
  } : {};

  // Get display name for component type — with semantic tag for heading/text
  const getDisplayName = (type: string) => {
    // For heading/text, show the actual semantic tag (H1, H2, Body, etc.)
    if (type === 'heading') {
      const level = component?.props?.level || 1;
      return `H${level}`;
    }
    if (type === 'text') {
      const tag = component?.props?.tag;
      if (tag && /^h[1-6]$/.test(tag)) return tag.toUpperCase();
      return 'P';
    }
    
    const typeMap: Record<string, string> = {
      'container': 'DIV',
      'button': 'BTN',
      'input': 'INPUT',
      'textarea': 'TEXTAREA',
      'image': 'IMG',
      'card': 'CARD',
      'row': 'ROW',
      'column': 'COL',
      'grid': 'GRID',
      'select': 'SELECT',
      'checkbox': 'CHECK',
      'radio': 'RADIO',
      'switch': 'SWITCH',
      'slider': 'RANGE',
      'alert': 'ALERT',
      'badge': 'BADGE',
      'progress': 'PROGRESS',
      'avatar': 'AVATAR',
      'separator': 'HR',
      'label': 'LABEL'
    };
    
    return typeMap[type] || type.toUpperCase();
  };

  // This component now only provides drag functionality - no visible label
  // The visual hover label is handled by ElementHoverHighlight
  // CRITICAL: The drag handle must be small and precise to avoid blocking other UI elements
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        // Position above the element, matching the label position
        // Only cover a small area where the drag icon and label appear
        'absolute -top-5 left-0',
        'w-20 h-5', // Small fixed width to match label area
        'opacity-0', // Invisible - the visual label is in ElementHighlight
        'cursor-grab',
        'z-10',
        isDragging && 'cursor-grabbing opacity-100 bg-primary/20',
        className
      )}
      style={dragStyle}
      title={`Drag to move ${component.type}`}
    />
  );
}