/**
 * AIWallCanvasRenderer — wraps AI Wall design components in the exact same
 * rendering context the App Builder canvas uses.
 *
 * This ensures:
 * 1. Design System CSS custom properties are injected (colors, spacing, radius, typography tokens)
 * 2. Class-based styles from classStore are injected (canvasCSS)
 * 3. Google Fonts referenced by DS tokens are loaded
 * 4. Canvas theme is applied (light/dark)
 * 5. CanvasWrapper provides the same 2-layer rendering model as the builder
 *
 * Without this wrapper, AI Wall previews render with raw inline styles only,
 * missing all Design System token resolution — causing visual discrepancies
 * between AI Wall and the builder canvas / published preview.
 */

import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { ComponentRenderer } from '@/components/app-builder/ComponentRenderer';
import { CanvasThemeProvider } from '@/hooks/useCanvasTheme';
import { CanvasWrapper } from '@/components/app-builder/CanvasWrapper';
import { useDesignTokenFonts } from '@/hooks/useDesignTokenFonts';
import { useClassStore } from '@/stores/classStore';
import { useDesignSystemStore } from '@/stores/designSystemStore';
import { generateCanvasCSS } from '@/lib/canvasCSSGenerator';
import { syncAllComponentClasses } from '@/lib/classSync';
import { Breakpoint } from '@/lib/breakpoints';

interface AIWallCanvasRendererProps {
  /** The array of AI-generated component trees to render */
  components: any[];
  /** Additional className for the root container */
  className?: string;
  /** Additional inline styles for the root container */
  style?: React.CSSProperties;
  /** Children to render alongside/after the component list (e.g. empty states) */
  children?: React.ReactNode;
  /** Whether to use CanvasWrapper (full builder parity) — default true */
  useCanvasFrame?: boolean;
  /** Override the breakpoint (mobile/tablet/desktop). If not provided, auto-detects from container width. */
  breakpoint?: Breakpoint;
}

export function AIWallCanvasRenderer({
  components,
  className,
  style,
  children,
  useCanvasFrame = true,
  breakpoint: breakpointOverride,
}: AIWallCanvasRendererProps) {
  // Ensure DS fonts are loaded in the browser
  useDesignTokenFonts();

  // Sync component classes to classStore on mount/change so CSS is available for rendering
  const syncedRef = useRef<string>('');
  useEffect(() => {
    if (!components || components.length === 0) return;
    // Create a fingerprint to avoid re-syncing the same components
    const ids = components.map((c: any) => (c.data || c).id).join(',');
    if (ids === syncedRef.current) return;
    syncedRef.current = ids;
    
    const normalized = components.map((c: any) => c.data || c);
    syncAllComponentClasses(normalized).catch((err) =>
      console.warn('[AIWallCanvasRenderer] class sync error:', err)
    );
  }, [components]);

  // Auto-detect breakpoint from container width via ResizeObserver
  const containerRef = useRef<HTMLDivElement>(null);
  const [detectedBreakpoint, setDetectedBreakpoint] = useState<Breakpoint>('desktop');

  useEffect(() => {
    if (breakpointOverride || !containerRef.current) return;
    const el = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      if (width <= 767) setDetectedBreakpoint('mobile');
      else if (width <= 991) setDetectedBreakpoint('tablet');
      else setDetectedBreakpoint('desktop');
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [breakpointOverride]);

  const activeBreakpoint = breakpointOverride || detectedBreakpoint;

  // Design System CSS (token custom properties)
  const { generatedCSS: designSystemCSS } = useDesignSystemStore();

  // Class-based styles — use generateCanvasCSS with active breakpoint
  // This flattens responsive overrides (mobileStyles/tabletStyles) into the CSS
  // without relying on @media queries (which don't fire in scaled containers)
  const { classes } = useClassStore();
  const canvasCSS = useMemo(() => {
    if (!classes || classes.length === 0) return '';
    return generateCanvasCSS(classes, activeBreakpoint);
  }, [classes, activeBreakpoint]);

  // Combine both CSS layers — exactly like AppBuilderCanvas does
  const combinedCSS = useMemo(() => {
    return [designSystemCSS, canvasCSS].filter(Boolean).join('\n\n');
  }, [designSystemCSS, canvasCSS]);

  const content = components.length > 0
    ? components.map((step: any, index: number) => {
        const component = step.data || step;
        return (
          <ComponentRenderer
            key={component.id || `component-${index}`}
            component={component}
            isPreview={true}
          />
        );
      })
    : children;

  return (
    <CanvasThemeProvider>
      {/* Inject the same CSS the builder canvas injects */}
      {combinedCSS && <style dangerouslySetInnerHTML={{ __html: combinedCSS }} />}

      <div ref={containerRef}>
        {useCanvasFrame ? (
          <CanvasWrapper
            className={className}
            style={{ width: '100%', minHeight: '100%', ...style }}
            contentStyle={{ background: 'var(--background, #ffffff)' }}
          >
            {content}
          </CanvasWrapper>
        ) : (
          <div className={className} style={style}>
            {content}
          </div>
        )}
      </div>
    </CanvasThemeProvider>
  );
}
