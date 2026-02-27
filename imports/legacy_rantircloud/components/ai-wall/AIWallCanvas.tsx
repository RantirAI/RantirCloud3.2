import { useState, useId } from 'react';
import { Sparkles, ArrowLeft, Monitor, Tablet, Smartphone, Download, FolderInput, Lock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useAIWallStore, AIWallVariant, extractStyleFromVariant } from '@/stores/aiWallStore';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { AIWallVariantCard } from './AIWallVariantCard';
import { AIWallExportDialog } from './AIWallExportDialog';
import { AIWallCanvasRenderer } from './AIWallCanvasRenderer';
import { AIWallAnimatedStyles } from './AIWallAnimatedStyles';
import { Breakpoint } from '@/lib/breakpoints';
import { toast } from 'sonner';
import { syncAllComponentClasses } from '@/lib/classSync';
import { cn } from '@/lib/utils';
import aiWallInsideSvg from '@/assets/app-builder/ai-wall-inside.svg';

// Uniform card height for consistent grid
const CARD_HEIGHT = 'h-[420px]';

const VIEWPORT_OPTIONS: { value: Breakpoint; label: string; icon: any; width?: number }[] = [
  { value: 'desktop', label: 'Desktop', icon: Monitor },
  { value: 'tablet', label: 'Tablet', icon: Tablet, width: 768 },
  { value: 'mobile', label: 'Mobile', icon: Smartphone, width: 375 },
];

export function AIWallCanvas() {
  const {
    isGenerating,
    currentGeneration,
    previewingVariant,
    setPreviewingVariant,
  } = useAIWallStore();

  const [exportVariant, setExportVariant] = useState<AIWallVariant | null>(null);
  const [viewport, setViewport] = useState<Breakpoint>('desktop');
  const scopeId = useId().replace(/:/g, '_');
  const safeId = `aiwall-inline-preview-${scopeId}`;

  // Combine all generation variants into one view
  const allGenerations = useAIWallStore((s) => s.generations);
  const allVariants = currentGeneration
    ? [...(allGenerations.filter(g => g.id !== currentGeneration.id).flatMap(g => g.variants)), ...currentGeneration.variants]
    : allGenerations.flatMap(g => g.variants);
  const variants = allVariants;
  const currentVariants = currentGeneration?.variants || [];
  const totalExpected = 4;
  const progressPercent = (currentVariants.length / totalExpected) * 100;

  const handleLoadIntoProject = async (variant: AIWallVariant) => {
    const { currentProject, currentPage, addComponentsBatch } = useAppBuilderStore.getState();
    if (!currentProject || !currentPage) {
      toast.error('No project is currently open. Open a project first.');
      return;
    }

    const components = variant.components.map((c: any) => c.data || c);
    if (components.length === 0) {
      toast.error('This design has no components to load.');
      return;
    }

    await syncAllComponentClasses(components);
    addComponentsBatch(components, false);
    toast.success(`Loaded "${variant.name}" (${components.length} section${components.length !== 1 ? 's' : ''}) into your project!`);
  };

  // ── Empty state ──
  if (!currentGeneration && !isGenerating && !previewingVariant) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30" style={{
        backgroundImage: 'radial-gradient(circle, hsl(var(--muted-foreground) / 0.3) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}>
        <div className="text-center max-w-md px-8">
          <img src={aiWallInsideSvg} alt="AI Wall" className="w-64 h-auto mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Start with Scrolling through Endless Concepts
          </h2>
          <p className="text-sm text-muted-foreground">
            Describe what you want to create and AI Wall will generate 4 multi-section design variants
            with unique styles, layouts, and visual identities.
          </p>
        </div>
      </div>
    );
  }

  // ── Loading state — first batch not yet arrived ──
  if (isGenerating && variants.length === 0 && !previewingVariant) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30" style={{
        backgroundImage: 'radial-gradient(circle, hsl(var(--muted-foreground) / 0.3) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-lg font-medium text-foreground mb-2">Generating designs...</h2>
          <p className="text-sm text-muted-foreground mb-4">Designs will appear as they're ready</p>
          <div className="w-48 mx-auto">
            <Progress value={5} className="h-1" />
          </div>
        </div>
      </div>
    );
  }

  // ── Inline Preview Mode ──
  if (previewingVariant) {
    const activeOption = VIEWPORT_OPTIONS.find(v => v.value === viewport)!;
    const containerWidth = activeOption.width;

    return (
      <div className="flex-1 flex flex-col bg-muted/30 overflow-hidden">
        {/* Browser Chrome Bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-muted/60 backdrop-blur-sm shrink-0">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setPreviewingVariant(null)}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Wall
          </Button>

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
              preview.rantir.cloud/{previewingVariant.name?.toLowerCase().replace(/\s+/g, '-') || 'design'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => handleLoadIntoProject(previewingVariant)}
            >
              <FolderInput className="w-3.5 h-3.5" />
              Load into Project
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => setExportVariant(previewingVariant)}
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
          </div>
        </div>

        {/* Rendered design */}
        <ScrollArea className="flex-1">
          <div
            className={cn('min-h-full transition-all duration-300', containerWidth && 'mx-auto')}
            style={containerWidth ? { maxWidth: `${containerWidth}px` } : undefined}
          >
            <div id={safeId}>
              <AIWallAnimatedStyles scopeId={safeId} />
              <AIWallCanvasRenderer
                components={previewingVariant.components}
                useCanvasFrame={true}
                style={{ minHeight: '100vh' }}
                breakpoint={viewport}
              >
                <div className="flex items-center justify-center h-64">
                  <p className="text-muted-foreground">No components to preview</p>
                </div>
              </AIWallCanvasRenderer>
            </div>
          </div>

          {/* Generating indicator inside preview */}
          {isGenerating && (
            <div className="py-6 text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Generating more sections...
              </p>
            </div>
          )}
        </ScrollArea>

        <AIWallExportDialog variant={exportVariant} open={!!exportVariant} onClose={() => setExportVariant(null)} />
      </div>
    );
  }

  // ── Masonry Grid View ──
  return (
    <div className="flex-1 bg-muted/30 relative overflow-auto" style={{
      backgroundImage: 'radial-gradient(circle, hsl(var(--muted-foreground) / 0.3) 1px, transparent 1px)',
      backgroundSize: '20px 20px',
    }}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-medium text-foreground">Generated Designs</h3>
            <span className="text-xs text-muted-foreground">
              {isGenerating
                ? `${currentVariants.length}/${totalExpected} generating...`
                : `${variants.length} designs total`}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate max-w-lg">
            {currentGeneration?.prompt}
          </p>
          {isGenerating && (
            <div className="mt-3">
              <Progress value={progressPercent} className="h-1" />
            </div>
          )}
        </div>

        {/* Uniform Grid */}
        <div className="grid grid-cols-2 gap-5">
          {variants.map((variant, index) => (
            <div
              key={variant.id}
              className={`${CARD_HEIGHT} animate-fade-in`}
              style={{ animationDelay: `${(index % 2) * 120}ms`, animationFillMode: 'both' }}
            >
              <AIWallVariantCard
                variant={variant}
                isSelected={false}
                onSelect={() => setPreviewingVariant(variant)}
                onPreview={() => setPreviewingVariant(variant)}
                onExport={() => setExportVariant(variant)}
                onLoadIntoProject={() => handleLoadIntoProject(variant)}
                onSaveStyle={() => {
                  const style = extractStyleFromVariant(variant);
                  useAIWallStore.getState().setSavedStyle(style);
                  toast.success(`Style saved from "${variant.name}"`);
                }}
                onDelete={() => {
                  const { deleteVariant, generations } = useAIWallStore.getState();
                  for (const gen of generations) {
                    const idx = gen.variants.findIndex(v => v.id === variant.id);
                    if (idx !== -1) {
                      deleteVariant(gen.id, idx);
                      break;
                    }
                  }
                }}
                height="100%"
              />
            </div>
          ))}
        </div>

        {/* Generating indicator */}
        {isGenerating && variants.length > 0 && (
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
              <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Generating more designs...
            </p>
          </div>
        )}
      </div>

      <AIWallExportDialog variant={exportVariant} open={!!exportVariant} onClose={() => setExportVariant(null)} />
    </div>
  );
}
