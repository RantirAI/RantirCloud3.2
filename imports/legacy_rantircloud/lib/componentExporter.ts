/**
 * Component Exporter - Converts components to clean, lean format for display/export
 * 
 * Instead of showing all inline style props, shows the clean class-reference format:
 * - classNames: references to style classes
 * - styleOverrides: only properties that differ from class defaults
 * - contentProps: text, src, href, etc.
 */

import { AppComponent } from '@/types/appBuilder';
import { StyleClass } from '@/types/classes';
import { 
  CONTENT_PROPERTIES, 
  STYLE_PROPERTIES,
  calculateStyleOverrides,
  extractContentProps 
} from './styleResolver';

export interface LeanComponent {
  id: string;
  type: string;
  classNames: string[];
  styleOverrides?: Record<string, any>;
  content?: Record<string, any>;
  children?: LeanComponent[];
  // Only include if present
  actions?: any[];
  dataSource?: any;
}

/**
 * Convert a component tree to lean format for display
 */
export function convertToLeanFormat(
  components: AppComponent[],
  allClasses: StyleClass[]
): LeanComponent[] {
  return components.map(component => convertComponentToLean(component, allClasses));
}

/**
 * Convert a single component to lean format
 */
function convertComponentToLean(
  component: AppComponent,
  allClasses: StyleClass[]
): LeanComponent {
  const props = component.props || {};
  
  // Get class names (support both new and legacy format)
  const classNames: string[] = component.classNames || props.appliedClasses || [];
  
  // Extract content properties (non-style props that define behavior/content)
  const content = extractDisplayableContent(props);
  
  // Calculate true style overrides (properties that differ from class defaults)
  const styleOverrides = calculateStyleOverrides(props, classNames, allClasses);
  
  // Build lean component
  const leanComponent: LeanComponent = {
    id: component.id,
    type: component.type,
    classNames,
  };
  
  // Only include styleOverrides if there are any
  if (Object.keys(styleOverrides).length > 0) {
    leanComponent.styleOverrides = styleOverrides;
  }
  
  // Only include content if there's meaningful content
  if (Object.keys(content).length > 0) {
    leanComponent.content = content;
  }
  
  // Include children recursively
  if (component.children && component.children.length > 0) {
    leanComponent.children = component.children.map(child => 
      convertComponentToLean(child, allClasses)
    );
  }
  
  // Include actions if present
  if (component.actions && component.actions.length > 0) {
    leanComponent.actions = component.actions;
  }
  
  // Include dataSource if present
  if (component.dataSource) {
    leanComponent.dataSource = component.dataSource;
  }
  
  return leanComponent;
}

/**
 * Extract only user-meaningful content properties (not internal metadata)
 */
function extractDisplayableContent(props: Record<string, any>): Record<string, any> {
  const DISPLAYABLE_CONTENT = new Set([
    'content', 'text', 'src', 'href', 'alt', 'placeholder', 'value',
    'name', 'label', 'title', 'description', 'icon', 'iconName',
    'options', 'items', 'disabled', 'required', 'checked',
    'target', 'download'
  ]);
  
  const content: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(props)) {
    if (DISPLAYABLE_CONTENT.has(key) && value !== undefined && value !== null && value !== '') {
      content[key] = value;
    }
  }
  
  return content;
}

/**
 * Calculate storage savings from using lean format
 */
export function calculateStorageSavings(
  components: AppComponent[],
  allClasses: StyleClass[]
): { originalSize: number; leanSize: number; savingsPercent: number } {
  const originalJson = JSON.stringify(components);
  const leanComponents = convertToLeanFormat(components, allClasses);
  const leanJson = JSON.stringify(leanComponents);
  
  const originalSize = new Blob([originalJson]).size;
  const leanSize = new Blob([leanJson]).size;
  const savingsPercent = Math.round((1 - leanSize / originalSize) * 100);
  
  return { originalSize, leanSize, savingsPercent };
}
