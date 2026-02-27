import { useId, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AIWallVariant } from '@/stores/aiWallStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Lock, Download, FolderInput, Monitor, Tablet, Smartphone } from 'lucide-react';
import { AIWallAnimatedStyles } from './AIWallAnimatedStyles';
import { AIWallCanvasRenderer } from './AIWallCanvasRenderer';
import { Breakpoint } from '@/lib/breakpoints';
import { cn } from '@/lib/utils';

interface AIWallPreviewModalProps {
  variant: AIWallVariant | null;
  open: boolean;
  onClose: () => void;
  onExport?: (variant: AIWallVariant) => void;
  onLoadIntoProject?: (variant: AIWallVariant) => void;
}

const VIEWPORT_OPTIONS: { value: Breakpoint; label: string; icon: any; width?: number }[] = [
  { value: 'desktop', label: 'Desktop', icon: Monitor },
  { value: 'tablet', label: 'Tablet', icon: Tablet, width: 768 },
  { value: 'mobile', label: 'Mobile', icon: Smartphone, width: 375 },
];

export function AIWallPreviewModal({ variant, open, onClose, onExport, onLoadIntoProject }: AIWallPreviewModalProps) {
  const scopeId = useId().replace(/:/g, '_');
  const safeId = `aiwall-preview-${scopeId}`;
  const [viewport, setViewport] = useState<Breakpoint>('desktop');

  if (!variant) return null;

  const activeOption = VIEWPORT_OPTIONS.find(v => v.value === viewport)!;
  const containerWidth = activeOption.width;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 overflow-hidden rounded-xl [&>button]:hidden">
        {/* Browser Chrome Bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-muted/60 backdrop-blur-sm">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onClose}
              className="w-3 h-3 rounded-full bg-[hsl(0,70%,55%)] hover:bg-[hsl(0,70%,45%)] transition-colors"
              aria-label="Close"
            />
            <div className="w-3 h-3 rounded-full bg-[hsl(45,80%,55%)]" />
            <div className="w-3 h-3 rounded-full bg-[hsl(130,50%,50%)]" />
          </div>

          {/* Viewport toggle */}
          <div className="flex items-center gap-0.5 bg-background/60 border border-border/40 rounded-lg p-0.5">
            {VIEWPORT_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => setViewport(opt.value)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors',
                    viewport === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* URL bar */}
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/60 border border-border/40 max-w-lg mx-auto">
            <Lock className="w-3 h-3 text-muted-foreground/70" />
            <span className="text-xs text-muted-foreground truncate select-none">
              preview.rantir.cloud/{variant.name?.toLowerCase().replace(/\s+/g, '-') || 'design'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => onLoadIntoProject?.(variant)}
            >
              <FolderInput className="w-3.5 h-3.5" />
              Load into Project
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => onExport?.(variant)}
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
          </div>
        </div>

        {/* Content — rendered with full builder canvas parity */}
        <ScrollArea className="flex-1 h-[calc(90vh-44px)]">
          <div
            className={cn(
              'min-h-full transition-all duration-300',
              containerWidth && 'mx-auto'
            )}
            style={containerWidth ? { maxWidth: `${containerWidth}px` } : undefined}
          >
            <div id={safeId}>
              <AIWallAnimatedStyles scopeId={safeId} />
              <AIWallCanvasRenderer
                components={variant.components}
                useCanvasFrame={true}
                style={{ minHeight: 'calc(90vh - 44px)' }}
                breakpoint={viewport}
              >
                <div className="flex items-center justify-center h-64">
                  <p className="text-muted-foreground">No components to preview</p>
                </div>
              </AIWallCanvasRenderer>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
