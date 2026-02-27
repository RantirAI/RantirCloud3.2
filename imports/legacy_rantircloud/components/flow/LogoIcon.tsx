import React, { useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { useCanvasTheme } from '@/hooks/useCanvasTheme';

interface LogoIconProps {
  icon: string | LucideIcon;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export function LogoIcon({ 
  icon, 
  alt, 
  size = 'sm', 
  color = '#0ea5e9', 
  className = '' 
}: LogoIconProps) {
  const [hasError, setHasError] = useState(false);
  const { resolvedTheme } = useCanvasTheme();

  const sizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5'
  };

  const handleImageError = () => {
    setHasError(true);
  };

  // If it's a string icon and hasn't errored, render image with object-contain
  if (typeof icon === 'string' && !hasError) {
    const srcStr = icon as string;

    // Base64 SVGs with currentColor need inline rendering to inherit CSS color
    if (srcStr.startsWith('data:image/svg+xml;base64,')) {
      try {
        const svgContent = atob(srcStr.replace('data:image/svg+xml;base64,', ''));
        if (svgContent.includes('currentColor')) {
          return (
            <span
              className={`${sizeClasses[size]} inline-flex items-center justify-center text-foreground ${className}`}
              style={{ color: 'currentcolor' }}
              dangerouslySetInnerHTML={{ __html: svgContent.replace(/<svg/, '<svg width="100%" height="100%"') }}
            />
          );
        }
      } catch { /* fall through to img */ }
    }

    // Typeform logo needs inversion on dark mode since it's a dark icon on transparent bg
    if (/typeform/i.test(srcStr)) {
      return (
        <img 
          src={srcStr} 
          alt={alt} 
          className={`${sizeClasses[size]} object-contain ${resolvedTheme === 'dark' ? 'invert' : ''} ${className}`}
          onError={handleImageError}
        />
      );
    }
    
    return (
      <img 
        src={icon} 
        alt={alt} 
        className={`${sizeClasses[size]} object-contain ${className}`}
        onError={handleImageError}
      />
    );
  }

  // If it's a string icon but has errored, show fallback with first letter
  if (typeof icon === 'string' && hasError) {
    return (
      <div 
        className={`${sizeClasses[size]} rounded-md bg-muted flex items-center justify-center text-xs font-semibold ${className}`}
        style={{ color }}
      >
        {alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  // If it's a Lucide icon component (function), render it
  // Guard against objects that have {meta, type} structure but aren't callable
  if (typeof icon === 'function') {
    const IconComponent = icon as LucideIcon;
    return (
      <IconComponent 
        className={`${sizeClasses[size]} ${className}`} 
        style={{ color: color === '#000000' ? 'currentColor' : color }} 
      />
    );
  }

  // Fallback for non-string, non-function icons (e.g., malformed icon objects)
  return (
    <div 
      className={`${sizeClasses[size]} rounded-md bg-muted flex items-center justify-center text-xs font-semibold ${className}`}
      style={{ color }}
    >
      {alt.charAt(0).toUpperCase()}
    </div>
  );
}