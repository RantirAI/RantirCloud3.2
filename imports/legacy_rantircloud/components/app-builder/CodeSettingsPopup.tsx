import { useEffect, useRef, useState } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { X } from 'lucide-react';
import Editor from '@monaco-editor/react';

interface CodeSettingsPopupProps {
  componentId: string;
  initialPosition: { x: number; y: number };
  onClose: () => void;
}

interface CodeSettingsPopupProps {
  componentId: string;
  initialPosition: { x: number; y: number };
  onClose: () => void;
  onOpenDataSettings?: () => void;
}

export function CodeSettingsPopup({ componentId, initialPosition, onClose, onOpenDataSettings }: CodeSettingsPopupProps) {
  const { currentProject, currentPage, updateComponent } = useAppBuilderStore();
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const popupRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

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
  
  const currentCode = component?.props?.content || component?.props?.code || '';
  const currentLanguage = component?.props?.language || 'html';
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    const rect = popupRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleShowAllSettings = () => {
    onClose();
    onOpenDataSettings?.();
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

  const handleCodeChange = (code: string) => {
    updateComponent(componentId, {
      props: {
        ...component?.props,
        content: code,
        code: code
      }
    });
  };

  if (!component) return null;

  return (
    <div
      ref={popupRef}
      className="fixed z-[10000] bg-card border border-border rounded-lg shadow-xl"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '320px',
        pointerEvents: 'auto',
      }}
    >
      {/* Header - only this is draggable */}
      <div 
        ref={headerRef}
        className="flex items-center justify-between px-2.5 py-1.5 border-b border-border bg-muted/30 rounded-t-lg select-none"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleHeaderMouseDown}
      >
        <span className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
          Code Settings
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
        {/* Code editor */}
        <div className="space-y-1">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Code</span>
          <div 
            className="border border-border rounded-md overflow-hidden"
            style={{ pointerEvents: 'auto' }}
          >
            <Editor
              height="150px"
              language={currentLanguage}
              theme={isDark ? 'vs-dark' : 'vs'}
              value={currentCode}
              onChange={(v) => handleCodeChange(v || '')}
              options={{
                minimap: { enabled: false },
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                roundedSelection: false,
                automaticLayout: true,
                fontSize: 12,
                tabSize: 2,
                wordWrap: 'on',
              }}
            />
          </div>
        </div>

        {/* Show All Settings link */}
        <button
          onClick={handleShowAllSettings}
          className="w-full flex items-center justify-between text-[11px] text-muted-foreground hover:text-foreground py-1 transition-colors"
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        >
          <span>Show All Settings</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
