import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useClassStore } from '@/stores/classStore';
import { ComponentRenderer } from './ComponentRenderer';
import { EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tableService } from '@/services/tableService';
import type { AppComponent } from '@/types/appBuilder';
import { resolvePageBodyCSS } from '@/lib/pageBodyStyles';

export function FullscreenPreview() {
  const {
    currentProject,
    currentPage,
    isFullscreenPreview,
    setFullscreenPreview
  } = useAppBuilderStore();

  const { classes } = useClassStore();

  const [isPrefetching, setIsPrefetching] = useState(false);
  const [prefetchError, setPrefetchError] = useState<string | null>(null);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const pageData = currentProject?.pages.find(p => p.id === currentPage);
  const bodyProps = pageData?.bodyProperties || {};

  // Generate preview body styles from page body properties
  const getPreviewBodyStyles = (): React.CSSProperties => {
    return resolvePageBodyCSS(bodyProps, classes);
  };
  const currentComponents = pageData?.components || [];

  const dynamicTableIds = useMemo(() => {
    const ids: string[] = [];

    const walk = (components: AppComponent[]) => {
      for (const c of components) {
        const props: any = c?.props || {};
        const conn = props.databaseConnection;
        const isDynamic = props.isDynamic === true;

        // Collect from dynamic sections
        if (isDynamic && conn) {
          const tableId = conn.tableId || conn.tableProjectId;
          if (tableId) ids.push(String(tableId));
        }

        // Also collect from DynamicGrid (may not have isDynamic flag)
        const cType = c.type as string;
        if (cType === 'dynamicGrid' && conn) {
          const tableId = conn.tableId || conn.tableProjectId;
          if (tableId) ids.push(String(tableId));
        }

        // Also collect from DataDisplay components
        if (cType === 'dataDisplay') {
          const dataSource = props.dataSource || conn;
          const tableId = dataSource?.tableProjectId || dataSource?.tableId;
          if (tableId) ids.push(String(tableId));
        }

        if (Array.isArray(c.children) && c.children.length > 0) {
          walk(c.children);
        }
      }
    };

    walk(currentComponents);
    return Array.from(new Set(ids));
  }, [currentComponents]);

  // Handle animation states for enter/exit
  useEffect(() => {
    if (isFullscreenPreview) {
      // Mount immediately, then trigger animation
      setIsVisible(true);
      // Small delay to ensure DOM is ready for animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimatingIn(true);
        });
      });
    } else {
      // Animate out first
      setIsAnimatingIn(false);
      // Wait for animation to complete before unmounting
      const timeout = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [isFullscreenPreview]);

  // Lock body scroll when fullscreen preview is active
  useEffect(() => {
    if (isFullscreenPreview) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreenPreview]);

  // Data-first: prefetch all dynamic table data before rendering the preview tree.
  useEffect(() => {
    if (!isFullscreenPreview) return;

    let cancelled = false;

    const run = async () => {
      if (dynamicTableIds.length === 0) {
        setPrefetchError(null);
        setIsPrefetching(false);
        return;
      }

      setIsPrefetching(true);
      setPrefetchError(null);

      try {
        await tableService.prefetchTableProjects(dynamicTableIds);
        if (!cancelled) setIsPrefetching(false);
      } catch (e: any) {
        if (!cancelled) {
          setPrefetchError(e?.message || 'Failed to load preview data');
          setIsPrefetching(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isFullscreenPreview, dynamicTableIds]);

  // Don't render if not visible
  if (!isVisible) return null;

  const handleExit = () => {
    setFullscreenPreview(false);
    // Ensure we exit preview mode in the editor UI as well
    useAppBuilderStore.getState().setMode('design');
  };

  // Use portal to render at document body level, outside all other UI
  // Full screen preview - takes over entire viewport with animation
  return createPortal(
    <div 
      className={cn(
        "fixed inset-0",
        "z-[2147483646]",
        "isolate",
        // Animation classes
        "transition-all duration-300 ease-out",
        isAnimatingIn 
          ? "opacity-100" 
          : "opacity-0"
      )}
      style={{
        ...getPreviewBodyStyles(),
        // Ensure fully opaque background
        opacity: isAnimatingIn ? 1 : 0,
      }}
    >
      {/* Exit button - small eye-off icon positioned top-left with animation */}
      <button
        onClick={handleExit}
        className={cn(
          "fixed top-4 left-4 z-[2147483647]",
          "w-10 h-10 rounded-full",
          "bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm",
          "border border-zinc-200 dark:border-zinc-700",
          "flex items-center justify-center",
          "shadow-lg hover:shadow-xl",
          "transition-all duration-300 ease-out",
          "hover:scale-105 active:scale-95",
          // Slide in from left with delay
          isAnimatingIn 
            ? "translate-x-0 opacity-100" 
            : "-translate-x-4 opacity-0"
        )}
        style={{
          transitionDelay: isAnimatingIn ? '150ms' : '0ms'
        }}
        title="Exit Preview"
      >
        <EyeOff className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
      </button>

      {/* Data prefetch overlay (preview loads data first) */}
      {(isPrefetching || prefetchError) && (
        <div 
          className={cn(
            "absolute inset-0 z-[2147483645] flex items-center justify-center",
            "transition-opacity duration-200"
          )}
          style={{ backgroundColor: getPreviewBodyStyles().backgroundColor || '#ffffff' }}
        >
          <div className="flex flex-col items-center gap-2 text-center px-6">
            {isPrefetching ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                <p className="text-sm text-zinc-500">Loading data…</p>
              </>
            ) : (
              <>
                <p className="text-sm text-zinc-500">{prefetchError}</p>
                <button
                  className={cn(
                    "mt-2 text-sm underline underline-offset-4",
                    "text-zinc-600 hover:text-zinc-900"
                  )}
                  onClick={() => {
                    setPrefetchError(null);
                    setIsPrefetching(true);
                    tableService.prefetchTableProjects(dynamicTableIds)
                      .then(() => setIsPrefetching(false))
                      .catch((e: any) => {
                        setPrefetchError(e?.message || 'Failed to load preview data');
                        setIsPrefetching(false);
                      });
                  }}
                >
                  Retry
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Preview content - full viewport, animates in */}
      <div 
        className={cn(
          "w-full h-full overflow-auto",
          "transition-all duration-300 ease-out",
          isAnimatingIn 
            ? "opacity-100 translate-y-0" 
            : "opacity-0 translate-y-4"
        )}
        style={{
          transitionDelay: isAnimatingIn ? '100ms' : '0ms'
        }}
      >
        {!isPrefetching && !prefetchError ? (
          currentComponents.length > 0 ? (
            <div className="w-full min-h-full">
              {currentComponents.map((component) => (
                <ComponentRenderer
                  key={component.id}
                  component={component}
                  isPreview={true}
                />
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-zinc-500">
                <p className="text-lg font-medium">No content to preview</p>
                <p className="text-sm mt-1">Add components to see them here</p>
              </div>
            </div>
          )
        ) : null}
      </div>
    </div>,
    document.body
  );
}
