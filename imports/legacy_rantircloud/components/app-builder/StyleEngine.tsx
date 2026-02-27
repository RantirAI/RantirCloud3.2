import { ComponentStyle } from '@/types/appBuilder';

export class StyleEngine {
  /**
   * Converts component style object to Tailwind classes and inline styles
   */
  static generateStyles(style: ComponentStyle): { classes: string[]; inlineStyles: React.CSSProperties } {
    const classes: string[] = [];
    const inlineStyles: React.CSSProperties = {};

    // Layout styles
    if (style.layout) {
      const layoutClasses = this.getLayoutClasses(style.layout);
      classes.push(...layoutClasses);
    }

    // Spacing styles
    if (style.spacing) {
      const spacingClasses = this.getSpacingClasses(style.spacing);
      classes.push(...spacingClasses);
    }

    // Sizing styles
    if (style.sizing) {
      const sizingClasses = this.getSizingClasses(style.sizing);
      const sizingInlineStyles = this.getSizingInlineStyles(style.sizing);
      classes.push(...sizingClasses);
      Object.assign(inlineStyles, sizingInlineStyles);
    }

    // Typography styles
    if (style.typography) {
      const typographyClasses = this.getTypographyClasses(style.typography);
      const typographyInlineStyles = this.getTypographyInlineStyles(style.typography);
      classes.push(...typographyClasses);
      Object.assign(inlineStyles, typographyInlineStyles);
    }

    // Background styles
    if (style.background) {
      const backgroundClasses = this.getBackgroundClasses(style.background);
      const backgroundInlineStyles = this.getBackgroundInlineStyles(style.background);
      classes.push(...backgroundClasses);
      Object.assign(inlineStyles, backgroundInlineStyles);
    }

    // Border styles
    if (style.border) {
      const borderClasses = this.getBorderClasses(style.border);
      const borderInlineStyles = this.getBorderInlineStyles(style.border);
      classes.push(...borderClasses);
      Object.assign(inlineStyles, borderInlineStyles);
    }

    // Shadow styles
    if (style.shadow) {
      const shadowClasses = this.getShadowClasses(style.shadow);
      const shadowInlineStyles = this.getShadowInlineStyles(style.shadow);
      classes.push(...shadowClasses);
      Object.assign(inlineStyles, shadowInlineStyles);
    }

    // Animation styles
    if (style.animation) {
      const animationClasses = this.getAnimationClasses(style.animation);
      classes.push(...animationClasses);
    }

    return { classes, inlineStyles };
  }

  private static getLayoutClasses(layout: ComponentStyle['layout']): string[] {
    const classes: string[] = [];

    if (layout.display) {
      switch (layout.display) {
        case 'flex':
          classes.push('flex');
          break;
        case 'grid':
          classes.push('grid');
          break;
        case 'inline':
          classes.push('inline');
          break;
        case 'block':
          classes.push('block');
          break;
        case 'none':
          classes.push('hidden');
          break;
      }
    }

    if (layout.flexDirection) {
      classes.push(layout.flexDirection === 'column' ? 'flex-col' : 'flex-row');
    }

    if (layout.justifyContent) {
      const justifyMap = {
        start: 'justify-start',
        center: 'justify-center',
        end: 'justify-end',
        between: 'justify-between',
        around: 'justify-around',
        evenly: 'justify-evenly'
      };
      classes.push(justifyMap[layout.justifyContent]);
    }

    if (layout.alignItems) {
      const alignMap = {
        start: 'items-start',
        center: 'items-center',
        end: 'items-end',
        stretch: 'items-stretch'
      };
      classes.push(alignMap[layout.alignItems]);
    }

    if (layout.gap) {
      classes.push(`gap-${layout.gap}`);
    }

    if (layout.gridCols) {
      classes.push(`grid-cols-${layout.gridCols}`);
    }

    if (layout.gridRows) {
      classes.push(`grid-rows-${layout.gridRows}`);
    }

    return classes;
  }

  private static getSpacingClasses(spacing: ComponentStyle['spacing']): string[] {
    const classes: string[] = [];

    if (spacing.padding) {
      if (typeof spacing.padding === 'number') {
        classes.push(`p-${spacing.padding}`);
      } else {
        if (spacing.padding.top) classes.push(`pt-${spacing.padding.top}`);
        if (spacing.padding.right) classes.push(`pr-${spacing.padding.right}`);
        if (spacing.padding.bottom) classes.push(`pb-${spacing.padding.bottom}`);
        if (spacing.padding.left) classes.push(`pl-${spacing.padding.left}`);
      }
    }

    if (spacing.margin) {
      if (typeof spacing.margin === 'number') {
        classes.push(`m-${spacing.margin}`);
      } else {
        if (spacing.margin.top) classes.push(`mt-${spacing.margin.top}`);
        if (spacing.margin.right) classes.push(`mr-${spacing.margin.right}`);
        if (spacing.margin.bottom) classes.push(`mb-${spacing.margin.bottom}`);
        if (spacing.margin.left) classes.push(`ml-${spacing.margin.left}`);
      }
    }

    return classes;
  }

  private static getSizingClasses(sizing: ComponentStyle['sizing']): string[] {
    const classes: string[] = [];

    // Handle common width/height values that have Tailwind classes
    if (sizing.width) {
      const width = sizing.width.toString();
      if (width === '100%' || width === 'full') classes.push('w-full');
      else if (width === '50%') classes.push('w-1/2');
      else if (width === '33.333333%') classes.push('w-1/3');
      else if (width === '25%') classes.push('w-1/4');
      else if (width === 'auto') classes.push('w-auto');
      else if (width === 'fit-content') classes.push('w-fit');
    }

    if (sizing.height) {
      const height = sizing.height.toString();
      if (height === '100%' || height === 'full') classes.push('h-full');
      else if (height === '50%') classes.push('h-1/2');
      else if (height === 'auto') classes.push('h-auto');
      else if (height === 'fit-content') classes.push('h-fit');
    }

    return classes;
  }

  private static getSizingInlineStyles(sizing: ComponentStyle['sizing']): React.CSSProperties {
    const styles: React.CSSProperties = {};

    if (sizing.width && !this.isCommonTailwindValue(sizing.width)) {
      styles.width = this.normalizeUnit(sizing.width);
    }

    if (sizing.height && !this.isCommonTailwindValue(sizing.height)) {
      styles.height = this.normalizeUnit(sizing.height);
    }

    if (sizing.maxWidth) {
      styles.maxWidth = this.normalizeUnit(sizing.maxWidth);
    }

    if (sizing.maxHeight) {
      styles.maxHeight = this.normalizeUnit(sizing.maxHeight);
    }

    if (sizing.minWidth) {
      styles.minWidth = this.normalizeUnit(sizing.minWidth);
    }

    if (sizing.minHeight) {
      styles.minHeight = this.normalizeUnit(sizing.minHeight);
    }

    return styles;
  }

  private static getTypographyClasses(typography: ComponentStyle['typography']): string[] {
    const classes: string[] = [];

    if (typography.fontSize) {
      const sizeMap = {
        '12px': 'text-xs',
        '14px': 'text-sm',
        '16px': 'text-base',
        '18px': 'text-lg',
        '20px': 'text-xl',
        '24px': 'text-2xl',
        '30px': 'text-3xl',
        '36px': 'text-4xl',
        '48px': 'text-5xl',
        '60px': 'text-6xl',
        '72px': 'text-7xl',
        '96px': 'text-8xl',
        '128px': 'text-9xl'
      };
      if (sizeMap[typography.fontSize]) {
        classes.push(sizeMap[typography.fontSize]);
      }
    }

    if (typography.fontWeight) {
      const weightMap = {
        '100': 'font-thin',
        '200': 'font-extralight',
        '300': 'font-light',
        '400': 'font-normal',
        '500': 'font-medium',
        '600': 'font-semibold',
        '700': 'font-bold',
        '800': 'font-extrabold',
        '900': 'font-black',
        'thin': 'font-thin',
        'light': 'font-light',
        'normal': 'font-normal',
        'medium': 'font-medium',
        'semibold': 'font-semibold',
        'bold': 'font-bold',
        'extrabold': 'font-extrabold',
        'black': 'font-black'
      };
      if (weightMap[typography.fontWeight]) {
        classes.push(weightMap[typography.fontWeight]);
      }
    }

    if (typography.textAlign) {
      const alignMap = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
        justify: 'text-justify'
      };
      classes.push(alignMap[typography.textAlign]);
    }

    return classes;
  }

  private static getTypographyInlineStyles(typography: ComponentStyle['typography']): React.CSSProperties {
    const styles: React.CSSProperties = {};

    if (typography.color) {
      styles.color = typography.color;
    }

    if (typography.fontSize && !this.isCommonFontSize(typography.fontSize)) {
      styles.fontSize = typography.fontSize;
    }

    if (typography.fontWeight && !this.isCommonFontWeight(typography.fontWeight)) {
      styles.fontWeight = typography.fontWeight;
    }

    if (typography.lineHeight) {
      styles.lineHeight = typography.lineHeight;
    }

    return styles;
  }

  private static getBackgroundClasses(background: ComponentStyle['background']): string[] {
    const classes: string[] = [];

    // Extract string color value if present
    const colorValue = background.color 
      ? (typeof background.color === 'string' ? background.color : background.color?.value)
      : undefined;

    if (colorValue) {
      // Map user-selected colors to theme-aware semantic tokens
      const themeAwareColorMap: Record<string, string> = {
        'transparent': 'bg-transparent',
        'white': 'bg-card', // Theme-aware white -> card background
        'black': 'bg-foreground', // Theme-aware black -> foreground
        'gray-50': 'bg-muted/50', // Light gray -> muted with opacity
        'gray-100': 'bg-muted', // Light gray -> muted background
        'gray-200': 'bg-accent', // Medium light gray -> accent background
        'gray-300': 'bg-border', // Medium gray -> border color
        'gray-400': 'bg-muted-foreground/50', // Medium dark gray -> muted text with opacity
        'gray-500': 'bg-muted-foreground', // Dark gray -> muted text
        'gray-600': 'bg-foreground/70', // Darker gray -> foreground with opacity
        'gray-700': 'bg-foreground/80', // Very dark gray -> foreground with opacity
        'gray-800': 'bg-foreground/90', // Almost black -> foreground with opacity
        'gray-900': 'bg-foreground', // Black -> foreground
        'red-500': 'bg-destructive',
        'blue-500': 'bg-primary',
        'green-500': 'bg-emerald-500', // Keep vivid colors as-is
        'yellow-500': 'bg-yellow-500',
        'purple-500': 'bg-purple-500',
        'pink-500': 'bg-pink-500',
        'indigo-500': 'bg-indigo-500'
      };
      
      if (themeAwareColorMap[colorValue]) {
        classes.push(themeAwareColorMap[colorValue]);
      }
    }

    return classes;
  }

  private static getBackgroundInlineStyles(background: ComponentStyle['background']): React.CSSProperties {
    const styles: React.CSSProperties = {};

    // Get layer order - default: image on top, then gradient, then color (bottom)
    const layerOrder = background.layerOrder || ['image', 'gradient', 'fill'];
    
    // Build background layers array - CSS renders first item on top
    const backgroundLayers: string[] = [];
    
    for (const layerType of layerOrder) {
      if (layerType === 'image' && background.image) {
        backgroundLayers.push(`url(${background.image})`);
      } else if (layerType === 'gradient' && background.gradient) {
        backgroundLayers.push(background.gradient);
      }
    }

    // If we have multiple layers, use the background property with comma-separated values
    if (backgroundLayers.length > 0) {
      styles.background = backgroundLayers.join(', ');
      
      // Background size and position for images
      if (background.image) {
        styles.backgroundSize = background.size || 'cover';
        styles.backgroundPosition = background.position || 'center';
        styles.backgroundRepeat = background.repeat || 'no-repeat';
      }
    }
    
    // Color is always the bottom layer - use backgroundColor
    // Find the fill layer to get opacity if it exists
    const fillLayerIndex = layerOrder.indexOf('fill');
    if (fillLayerIndex !== -1 && background.color && !this.isCommonTailwindColor(typeof background.color === 'string' ? background.color : background.color?.value || '')) {
      // Handle color with opacity
      const colorVal = background.color;
      if (colorVal && typeof colorVal === 'object' && colorVal.value) {
        const colorValue = colorVal.value;
        const opacity = colorVal.opacity ?? 100;
        if (opacity < 100) {
          // Convert to rgba if opacity is less than 100
          styles.backgroundColor = this.hexToRgba(colorValue, opacity / 100);
        } else {
          styles.backgroundColor = colorValue;
        }
      } else if (typeof colorVal === 'string') {
        styles.backgroundColor = colorVal;
      }
    }

    return styles;
  }

  private static hexToRgba(hex: string, alpha: number): string {
    // Handle both short and long hex formats
    let r = 0, g = 0, b = 0;
    
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    } else {
      return hex; // Return as-is if not a valid hex
    }
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private static getBorderClasses(border: ComponentStyle['border']): string[] {
    const classes: string[] = [];

    if (border.width) {
      const widthMap = {
        0: 'border-0',
        1: 'border',
        2: 'border-2',
        4: 'border-4',
        8: 'border-8'
      };
      if (widthMap[border.width]) {
        classes.push(widthMap[border.width]);
      }
    }

    if (border.style) {
      const styleMap = {
        solid: 'border-solid',
        dashed: 'border-dashed',
        dotted: 'border-dotted'
      };
      classes.push(styleMap[border.style]);
    }

    if (border.radius) {
      const radiusMap = {
        0: 'rounded-none',
        2: 'rounded-sm',
        4: 'rounded',
        6: 'rounded-md',
        8: 'rounded-lg',
        12: 'rounded-xl',
        16: 'rounded-2xl',
        24: 'rounded-3xl',
        9999: 'rounded-full'
      };
      if (radiusMap[border.radius]) {
        classes.push(radiusMap[border.radius]);
      }
    }

    return classes;
  }

  private static getBorderInlineStyles(border: ComponentStyle['border']): React.CSSProperties {
    const styles: React.CSSProperties = {};

    if (border.color) {
      const colorVal = border.color;
      // Handle TokenRefValue: { tokenRef: string, value: string }
      if (colorVal && typeof colorVal === 'object' && 'tokenRef' in (colorVal as object)) {
        styles.borderColor = (colorVal as { tokenRef: string; value: string }).value || '';
      } else if (typeof colorVal === 'string') {
        styles.borderColor = colorVal;
      }
    }

    if (border.width && !this.isCommonBorderWidth(border.width)) {
      styles.borderWidth = `${border.width}px`;
    }

    if (border.radius && !this.isCommonBorderRadius(border.radius)) {
      styles.borderRadius = `${border.radius}px`;
    }

    return styles;
  }

  private static getShadowClasses(shadow: ComponentStyle['shadow']): string[] {
    const classes: string[] = [];

    // Common shadow patterns
    if (shadow.blur && shadow.spread === 0 && shadow.x === 0 && shadow.y === 0) {
      const shadowMap = {
        4: 'shadow-sm',
        8: 'shadow',
        12: 'shadow-md',
        16: 'shadow-lg',
        24: 'shadow-xl',
        32: 'shadow-2xl'
      };
      if (shadowMap[shadow.blur]) {
        classes.push(shadowMap[shadow.blur]);
      }
    }

    return classes;
  }

  private static getShadowInlineStyles(shadow: ComponentStyle['shadow']): React.CSSProperties {
    const styles: React.CSSProperties = {};

    if (shadow.x || shadow.y || shadow.blur || shadow.spread || shadow.color) {
      const x = shadow.x || 0;
      const y = shadow.y || 0;
      const blur = shadow.blur || 0;
      const spread = shadow.spread || 0;
      const color = shadow.color || 'rgba(0, 0, 0, 0.1)';
      
      styles.boxShadow = `${x}px ${y}px ${blur}px ${spread}px ${color}`;
    }

    return styles;
  }

  private static getAnimationClasses(animation: ComponentStyle['animation']): string[] {
    const classes: string[] = [];

    if (animation.type) {
      const animationMap = {
        fade: 'animate-fade-in',
        slide: 'animate-slide-in-right',
        scale: 'animate-scale-in',
        bounce: 'animate-bounce'
      };
      if (animationMap[animation.type]) {
        classes.push(animationMap[animation.type]);
      }
    }

    return classes;
  }

  // Helper methods
  private static normalizeUnit(value: string | number): string {
    if (typeof value === 'number') {
      return `${value}px`;
    }
    return value;
  }

  private static isCommonTailwindValue(value: string | number): boolean {
    const common = ['100%', 'full', '50%', '33.333333%', '25%', 'auto', 'fit-content'];
    return common.includes(value.toString());
  }

  private static isCommonFontSize(fontSize: string): boolean {
    const common = ['12px', '14px', '16px', '18px', '20px', '24px', '30px', '36px', '48px', '60px', '72px', '96px', '128px'];
    return common.includes(fontSize);
  }

  private static isCommonFontWeight(fontWeight: string): boolean {
    const common = ['100', '200', '300', '400', '500', '600', '700', '800', '900', 'thin', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold', 'black'];
    return common.includes(fontWeight);
  }

  private static isCommonTailwindColor(color: string): boolean {
    // Include theme-aware colors that should use classes instead of inline styles
    const common = ['transparent', 'white', 'black', 'gray-50', 'gray-100', 'gray-200', 'gray-300', 'gray-400', 'gray-500', 'gray-600', 'gray-700', 'gray-800', 'gray-900', 'red-500', 'blue-500', 'green-500', 'yellow-500', 'purple-500', 'pink-500', 'indigo-500'];
    return common.includes(color);
  }

  private static isCommonBorderWidth(width: number): boolean {
    const common = [0, 1, 2, 4, 8];
    return common.includes(width);
  }

  private static isCommonBorderRadius(radius: number): boolean {
    const common = [0, 2, 4, 6, 8, 12, 16, 24, 9999];
    return common.includes(radius);
  }
}