import { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { AIWallVariant } from '@/stores/aiWallStore';
import { Check, Sparkles, MoreVertical, Eye, Download, Trash2, BookmarkPlus, Palette, FolderInput } from 'lucide-react';
import { AIWallCanvasRenderer } from './AIWallCanvasRenderer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const RENDER_WIDTH = 1440;

interface AIWallVariantCardProps {
  variant: AIWallVariant;
  isSelected: boolean;
  onSelect: () => void;
  onPreview?: () => void;
  onExport?: () => void;
  onLoadIntoProject?: () => void;
  onSaveStyle?: () => void;
  onDelete?: () => void;
  height?: string;
}

export function AIWallVariantCard({
  variant,
  isSelected,
  onSelect,
  onPreview,
  onExport,
  onLoadIntoProject,
  onSaveStyle,
  onDelete,
  height = 'auto',
}: AIWallVariantCardProps) {
  const hasComponents = variant.components.length > 0;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  // Dynamically compute scale based on container width
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      if (width > 0) {
        setScale(width / RENDER_WIDTH);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={cn(
        'relative w-full rounded-xl overflow-hidden transition-all duration-300 cursor-pointer',
        'bg-gradient-to-br from-muted/50 to-muted border group',
        isSelected
          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background border-primary shadow-2xl scale-[1.02] z-10'
          : 'border-border hover:border-primary/40 hover:shadow-lg'
      )}
      style={{ height }}
      onClick={onSelect}
    >
      {/* Live Preview Content — rendered at fixed width, scaled to fit */}
      <div ref={containerRef} className="absolute inset-0 overflow-hidden">
        {hasComponents ? (
          <div
            className="pointer-events-none"
            style={{
              width: `${RENDER_WIDTH}px`,
              transformOrigin: 'top left',
              transform: `scale(${scale})`,
              overflow: 'hidden',
            }}
          >
            <AIWallCanvasRenderer components={variant.components} />
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Sparkles className="w-6 h-6 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No components</p>
          </div>
        )}
      </div>

      {/* Context Menu */}
      <div className="absolute top-2 right-2 z-20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {hasComponents && onPreview && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview();
                }}
              >
                <Eye className="w-3.5 h-3.5 mr-2" />
                Preview
              </DropdownMenuItem>
            )}
            {hasComponents && onExport && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onExport();
                }}
              >
                <Download className="w-3.5 h-3.5 mr-2" />
                Export Design
              </DropdownMenuItem>
            )}
            {hasComponents && onLoadIntoProject && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onLoadIntoProject();
                }}
              >
                <FolderInput className="w-3.5 h-3.5 mr-2" />
                Load into Project
              </DropdownMenuItem>
            )}
            {hasComponents && onSaveStyle && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveStyle();
                }}
              >
                <Palette className="w-3.5 h-3.5 mr-2" />
                Save Style
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                console.log('Save to library:', variant.id);
              }}
            >
              <BookmarkPlus className="w-3.5 h-3.5 mr-2" />
              Save to Library
            </DropdownMenuItem>
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg z-20">
          <Check className="w-4 h-4 text-primary-foreground" />
        </div>
      )}

      {/* Label bar */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-background/90 via-background/60 to-transparent z-10 pointer-events-none">
        <h4 className="text-xs font-medium text-foreground truncate">{variant.name}</h4>
        <p className="text-[10px] text-muted-foreground truncate">
          {variant.description || variant.layoutType}
        </p>
      </div>
    </div>
  );
}
