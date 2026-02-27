/**
 * Unified Converter Exports
 * Central export for all clipboard format converters
 */

export * from './webflowConverter';
export * from './figmaConverter';
export * from './framerConverter';
export * from './htmlConverter';
export * from './reactZipConverter';
export { convertReactFileToComponents } from './reactZipConverter';

import { AppComponent } from '@/types/appBuilder';
import { StyleClass } from '@/types/classes';
import { ParsedClipboardData, WebflowData, FigmaData, FramerData, HTMLData } from '@/lib/clipboardParser';
import { convertWebflowToComponents, WebflowConversionResult, getWebflowConversionStats } from './webflowConverter';
import { convertFigmaToComponents, FigmaConversionResult, getFigmaConversionStats } from './figmaConverter';
import { convertFramerToComponents, FramerConversionResult, getFramerConversionStats } from './framerConverter';
import { convertHTMLToComponents, getHTMLConversionStats } from './htmlConverter';
import { v4 as uuid } from 'uuid';

export interface UnifiedConversionResult {
  success: boolean;
  source: string;
  components: AppComponent[];
  styleClasses: StyleClass[];
  bodyStyles: Record<string, any>;
  cssVariables?: Record<string, string>;
  assets: any[];
  warnings: string[];
  stats: {
    totalComponents: number;
    totalStyles: number;
    totalAssets: number;
    warningCount: number;
  };
  error?: string;
}

/**
 * Convert parsed clipboard data to Webtir components
 * Unified entry point that routes to appropriate converter
 */
export function convertClipboardToComponents(parsedData: ParsedClipboardData): UnifiedConversionResult {
  if (!parsedData.isValid || !parsedData.parsed) {
    return {
      success: false,
      source: parsedData.source,
      components: [],
      styleClasses: [],
      bodyStyles: {},
      assets: [],
      warnings: [],
      stats: { totalComponents: 0, totalStyles: 0, totalAssets: 0, warningCount: 0 },
      error: parsedData.error || 'Invalid clipboard data'
    };
  }

  try {
    switch (parsedData.source) {
      case 'webflow': {
        const result = convertWebflowToComponents(parsedData.parsed as WebflowData);
        const stats = getWebflowConversionStats(result);
        return {
          success: true,
          source: 'webflow',
          components: result.components,
          styleClasses: result.styleClasses,
          bodyStyles: result.bodyStyles || {},
          assets: result.assets,
          warnings: result.warnings,
          stats
        };
      }

      case 'figma': {
        const result = convertFigmaToComponents(parsedData.parsed as FigmaData);
        const stats = getFigmaConversionStats(result);
        return {
          success: true,
          source: 'figma',
          components: result.components,
          styleClasses: result.styleClasses,
          bodyStyles: result.bodyStyles || {},
          assets: result.assets,
          warnings: result.warnings,
          stats
        };
      }

      case 'framer': {
        const result = convertFramerToComponents(parsedData.parsed as FramerData);
        const stats = getFramerConversionStats(result);
        return {
          success: true,
          source: 'framer',
          components: result.components,
          styleClasses: result.styleClasses,
          bodyStyles: result.bodyStyles || {},
          assets: result.assets,
          warnings: result.warnings,
          stats
        };
      }

      case 'html': {
        // Full HTML conversion with CSS class extraction
        const htmlData = parsedData.parsed as HTMLData;
        const result = convertHTMLToComponents(htmlData.html);
        const stats = getHTMLConversionStats(result);
        return {
          success: true,
          source: 'html',
          components: result.components,
          styleClasses: result.styleClasses,
          bodyStyles: result.bodyStyles || {},
          cssVariables: result.cssVariables || {},
          assets: result.assets,
          warnings: result.warnings,
          stats
        };
      }

      default:
        return {
          success: false,
          source: parsedData.source,
          components: [],
          styleClasses: [],
          bodyStyles: {},
          assets: [],
          warnings: [],
          stats: { totalComponents: 0, totalStyles: 0, totalAssets: 0, warningCount: 0 },
          error: `Unsupported source format: ${parsedData.source}`
        };
    }
  } catch (error) {
    return {
      success: false,
      source: parsedData.source,
      components: [],
      styleClasses: [],
      bodyStyles: {},
      assets: [],
      warnings: [],
      stats: { totalComponents: 0, totalStyles: 0, totalAssets: 0, warningCount: 0 },
      error: error instanceof Error ? error.message : 'Conversion failed'
    };
  }
}

/**
 * Get human-readable description of conversion result
 */
export function getConversionSummary(result: UnifiedConversionResult): string {
  if (!result.success) {
    return result.error || 'Conversion failed';
  }

  const parts: string[] = [];
  
  if (result.stats.totalComponents > 0) {
    parts.push(`${result.stats.totalComponents} component${result.stats.totalComponents > 1 ? 's' : ''}`);
  }
  
  if (result.stats.totalStyles > 0) {
    parts.push(`${result.stats.totalStyles} style${result.stats.totalStyles > 1 ? 's' : ''}`);
  }
  
  if (result.stats.totalAssets > 0) {
    parts.push(`${result.stats.totalAssets} asset${result.stats.totalAssets > 1 ? 's' : ''}`);
  }
  
  if (result.stats.warningCount > 0) {
    parts.push(`${result.stats.warningCount} warning${result.stats.warningCount > 1 ? 's' : ''}`);
  }

  return parts.length > 0 ? parts.join(', ') : 'Empty conversion';
}
