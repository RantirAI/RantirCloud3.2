import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect, useState, useCallback } from 'react';
import { Plus, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InsertNodeMenu } from './InsertNodeMenu';
import { cn } from '@/lib/utils';
import { $getSelection, $isRangeSelection } from 'lexical';

/**
 * Plugin that shows hover controls (drag handle + add button) next to lines
 * Similar to Notion/Lexical behavior
 */
export function InsertPlugin() {
  const [editor] = useLexicalComposerContext();
  const [showControls, setShowControls] = useState(false);
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [controlsPosition, setControlsPosition] = useState<{ top: number; left: number } | null>(null);
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);

  const updateControlsPosition = useCallback((element: HTMLElement) => {
    const editorElement = editor.getRootElement();
    if (!editorElement) return;

    const rect = element.getBoundingClientRect();
    const editorRect = editorElement.getBoundingClientRect();
    
    setControlsPosition({
      top: rect.top - editorRect.top,
      left: -48, // Position to the left of the content
    });
    setShowControls(true);
  }, [editor]);

  useEffect(() => {
    const editorElement = editor.getRootElement();
    if (!editorElement) return;

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Find the closest block element
      const blockElement = target.closest('p, h1, h2, h3, h4, h5, h6, li, div[data-lexical-decorator]');
      
      if (blockElement && blockElement instanceof HTMLElement) {
        if (blockElement !== hoveredElement) {
          setHoveredElement(blockElement);
          updateControlsPosition(blockElement);
        }
      }
    };

    const handleMouseLeave = () => {
      setTimeout(() => {
        const controlsContainer = document.querySelector('.insert-controls-container');
        if (!controlsContainer?.matches(':hover')) {
          setShowControls(false);
          setShowInsertMenu(false);
          setHoveredElement(null);
        }
      }, 100);
    };

    editorElement.addEventListener('mousemove', handleMouseMove);
    editorElement.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      editorElement.removeEventListener('mousemove', handleMouseMove);
      editorElement.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [editor, updateControlsPosition, hoveredElement]);

  if (!showControls || !controlsPosition) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          'absolute z-20 flex items-center gap-0.5 transition-opacity insert-controls-container',
          showControls ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          top: controlsPosition.top,
          left: controlsPosition.left,
        }}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => {
          setTimeout(() => {
            if (!showInsertMenu) {
              setShowControls(false);
              setHoveredElement(null);
            }
          }, 100);
        }}
      >
        {/* Drag Handle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-50 hover:opacity-100 cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </Button>

        {/* Add Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-50 hover:opacity-100"
          onClick={() => setShowInsertMenu(!showInsertMenu)}
          title="Add element"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Insert Menu */}
      {showInsertMenu && controlsPosition && (
        <div
          className="absolute z-30"
          style={{
            top: controlsPosition.top + 32,
            left: controlsPosition.left,
          }}
        >
          <InsertNodeMenu
            open={showInsertMenu}
            onOpenChange={(open) => {
              setShowInsertMenu(open);
              if (!open) {
                setShowControls(false);
                setHoveredElement(null);
              }
            }}
            onInsert={() => {
              setShowInsertMenu(false);
              setShowControls(false);
            }}
          />
        </div>
      )}
    </>
  );
}
