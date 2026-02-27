import { ReactNode, forwardRef } from 'react';
import { useCanvasTheme } from '@/hooks/useCanvasTheme';
import { cn } from '@/lib/utils';

interface CanvasWrapperProps {
  children: ReactNode;
  className?: string;
  /** Styles for the outer "canvas frame" - handles clipping, sizing, shadow */
  style?: React.CSSProperties;
  /** Styles for the inner "canvas body" - handles user-editable body styles */
  contentStyle?: React.CSSProperties;
  [key: string]: any;
}

/**
 * CanvasWrapper provides a 2-layer canvas model:
 * 1. Outer "Frame" - the only clipping boundary (overflow-hidden), handles canvas size/shadow
 * 2. Inner "Body" - the editable page body, no clipping, allows content to flow naturally
 * 
 * This ensures content is only clipped at the frame, not by invisible inner wrappers.
 */
export const CanvasWrapper = forwardRef<HTMLDivElement, CanvasWrapperProps>(
  ({ children, className, style, contentStyle, ...props }, ref) => {
    const { resolvedTheme } = useCanvasTheme();

    return (
      <div 
        ref={ref}
        className={cn(
          'canvas-theme-wrapper box-border',
          resolvedTheme === 'dark' && 'dark',
          className
        )}
        data-canvas-theme={resolvedTheme}
        style={{
          boxSizing: 'border-box',
          ...style,
        }}
        {...props}
      >
        {/* Inner body wrapper - applies user body styles, NO overflow clipping */}
        <div
          data-canvas-content
          style={{
            boxSizing: 'border-box',
            position: 'relative',
            ...contentStyle,
            // Force body to always fill the canvas frame completely
            width: '100%',
            height: '100%',
            minHeight: 'inherit',
          }}
        >
          {children}
        </div>
      </div>
    );
  }
);

CanvasWrapper.displayName = 'CanvasWrapper';