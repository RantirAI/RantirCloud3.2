import { useState, useRef, useEffect } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { X, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Semantic tag type for text elements
export type TextSemanticTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p';

// Typography defaults for each heading level (matches DS defaults)
const HEADING_TYPOGRAPHY_DEFAULTS: Record<number, { fontFamily: string; fontSize: string; fontWeight: string; lineHeight: string }> = {
  1: { fontFamily: 'Inter, sans-serif', fontSize: '64', fontWeight: '700', lineHeight: '1.1' },
  2: { fontFamily: 'Inter, sans-serif', fontSize: '48', fontWeight: '700', lineHeight: '1.15' },
  3: { fontFamily: 'Inter, sans-serif', fontSize: '40', fontWeight: '600', lineHeight: '1.2' },
  4: { fontFamily: 'Inter, sans-serif', fontSize: '32', fontWeight: '600', lineHeight: '1.25' },
  5: { fontFamily: 'Inter, sans-serif', fontSize: '24', fontWeight: '600', lineHeight: '1.3' },
  6: { fontFamily: 'Inter, sans-serif', fontSize: '18', fontWeight: '600', lineHeight: '1.4' },
};

// Body text typography defaults
const BODY_TYPOGRAPHY_DEFAULTS = {
  fontFamily: 'Inter, sans-serif',
  fontSize: '16',
  fontWeight: '400',
  lineHeight: '1.5',
};

interface HeadingSettingsPopupProps {
  componentId: string;
  initialPosition: { x: number; y: number };
  onClose: () => void;
}

export function HeadingSettingsPopup({ componentId, initialPosition, onClose }: HeadingSettingsPopupProps) {
  const { currentProject, currentPage, updateComponent } = useAppBuilderStore();
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const popupRef = useRef<HTMLDivElement>(null);

  // Get the component data
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
  
  const isHeading = component?.type === 'heading';
  const isText = component?.type === 'text';
  
  // Get the semantic tag - normalize from level prop or tag prop
  const getSemanticTag = (): TextSemanticTag => {
    if (isHeading) {
      const level = component?.props?.level || component?.props?.tag || 1;
      return `h${Math.min(Math.max(level, 1), 6)}` as TextSemanticTag;
    }
    return 'p';
  };
  
  const currentTag = getSemanticTag();
  const currentLevel = isHeading ? (component?.props?.level || 1) : null;
  const currentText = component?.props?.text || component?.props?.content || '';

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input')) return;
    setIsDragging(true);
    const rect = popupRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  /**
   * Change the semantic tag (H1-H6 or Body/P)
   * 
   * IMPORTANT: This ONLY changes the semantic HTML element.
   * It does NOT reset typography, spacing, layout, or any visual styles.
   * Visual style is controlled independently via design system tokens and CSS classes.
   * 
   * Updates:
   * 1. Component type (heading or text)
   * 2. Level prop for headings
   * 3. Tag prop for explicit semantic tag storage
   * 
   * Preserves ALL existing styles — typography, spacing, layout, classes, states, etc.
   */
  const handleTagChange = (newTag: TextSemanticTag) => {
    if (!component) return;
    
    // Preserve ALL existing props — only override tag/level/type
    const existingProps = { ...component.props };
    
    if (newTag === 'p') {
      // Convert to body text (text component with p tag)
      updateComponent(componentId, {
        type: 'text',
        props: {
          ...existingProps,
          tag: 'p',
          level: undefined,
        }
      });
    } else {
      // Convert to heading (h1-h6)
      const level = parseInt(newTag.replace('h', ''));
      
      updateComponent(componentId, {
        type: 'heading',
        props: {
          ...existingProps,
          level,
          tag: newTag,
        }
      });
    }
  };

  const handleTextChange = (text: string) => {
    updateComponent(componentId, {
      props: {
        ...component?.props,
        text,
        content: text
      }
    });
  };

  if (!component) return null;

  const displayTitle = isHeading 
    ? `Heading ${currentTag.toUpperCase()} Settings` 
    : 'Body Text Settings';

  // All tag options
  const tagOptions: { value: TextSemanticTag; label: string }[] = [
    { value: 'h1', label: 'H1' },
    { value: 'h2', label: 'H2' },
    { value: 'h3', label: 'H3' },
    { value: 'h4', label: 'H4' },
    { value: 'h5', label: 'H5' },
    { value: 'h6', label: 'H6' },
    { value: 'p', label: 'Body' },
  ];

  return (
    <div
      ref={popupRef}
      className="fixed z-[10000] bg-card border border-border rounded-lg shadow-xl"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '260px',
        pointerEvents: 'auto',
      }}
    >
      {/* Header - only this is draggable */}
      <div 
        className="flex items-center justify-between px-2.5 py-1.5 border-b border-border bg-muted/30 rounded-t-lg select-none"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleHeaderMouseDown}
      >
        <span className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
          <GripVertical className="h-3 w-3 text-muted-foreground" />
          {displayTitle}
        </span>
        <button
          onClick={onClose}
          className="p-0.5 rounded hover:bg-muted transition-colors"
          style={{ cursor: 'pointer' }}
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>

      {/* Content - normal cursor, interactive */}
      <div 
        className="p-2.5 space-y-2.5"
        style={{ cursor: 'auto', pointerEvents: 'auto' }}
      >
        {/* Semantic Tag Selector - unified for both heading and text */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Semantic Tag
          </span>
          <div className="flex gap-1 flex-wrap">
            {tagOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleTagChange(option.value)}
                className={cn(
                  "h-7 px-2 text-[11px] font-medium rounded transition-colors",
                  currentTag === option.value
                    ? "bg-foreground text-background"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-muted-foreground">
            Changing the tag updates the semantic HTML element ({currentTag}) in the exported code.
          </p>
        </div>

        {/* Text input */}
        <div className="space-y-1">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Text</span>
          <Input
            value={currentText}
            onChange={(e) => handleTextChange(e.target.value)}
            className="h-7 text-xs"
            placeholder="Enter text..."
          />
        </div>

        {/* Show All Settings link */}
        <button
          onClick={() => {
            // Dispatch event to open properties panel
            window.dispatchEvent(new CustomEvent('app-builder:switch-tab', { detail: 'styles' }));
            onClose();
          }}
          className="w-full flex items-center justify-between text-[11px] text-muted-foreground hover:text-foreground py-1 transition-colors"
        >
          <span>Show All Settings</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}

// Export utility for getting semantic tag from component
export function getComponentSemanticTag(component: any): TextSemanticTag {
  if (!component) return 'p';
  
  if (component.type === 'heading') {
    const level = component.props?.level || component.props?.tag || 1;
    const numLevel = typeof level === 'string' 
      ? parseInt(level.replace('h', '')) 
      : level;
    return `h${Math.min(Math.max(numLevel, 1), 6)}` as TextSemanticTag;
  }
  
  // Text component with explicit tag
  if (component.props?.tag && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'].includes(component.props.tag)) {
    return component.props.tag as TextSemanticTag;
  }
  
  return 'p';
}

// Export utility for getting display label
export function getTextElementDisplayLabel(component: any): string {
  const tag = getComponentSemanticTag(component);
  if (tag === 'p') return 'Body';
  return tag.toUpperCase(); // H1, H2, etc.
}
