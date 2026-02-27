import { StyleClass, PseudoState } from './classes';

/**
 * JSON structure for embedded style_classes in app_projects
 */
export interface StyleClassesConfig {
  version: number;
  classes: EmbeddedStyleClass[];
  styleHashRegistry: Record<string, string>; // hash -> className
  namingConfig: NamingConfig;
}

export interface EmbeddedStyleClass {
  id: string;
  name: string;
  styles: Record<string, any>;
  tabletStyles?: Record<string, any>;
  mobileStyles?: Record<string, any>;
  stateStyles: Record<PseudoState, Record<string, any>>;
  tabletStateStyles?: Record<PseudoState, Record<string, any>>;
  mobileStateStyles?: Record<PseudoState, Record<string, any>>;
  appliedTo: string[];
  inheritsFrom: string[];
  isAutoClass: boolean;
  dependentClasses: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NamingConfig {
  counters: Record<string, number>; // componentType -> counter (e.g., { section: 5, container: 3 })
}

/**
 * Convert embedded class format to StyleClass format used by the store
 */
export function embeddedToStyleClass(embedded: EmbeddedStyleClass): StyleClass {
  return {
    id: embedded.id,
    name: embedded.name,
    styles: embedded.styles,
    tabletStyles: embedded.tabletStyles,
    mobileStyles: embedded.mobileStyles,
    stateStyles: embedded.stateStyles,
    tabletStateStyles: embedded.tabletStateStyles,
    mobileStateStyles: embedded.mobileStateStyles,
    appliedTo: embedded.appliedTo,
    inheritsFrom: embedded.inheritsFrom,
    isAutoClass: embedded.isAutoClass,
    dependentClasses: embedded.dependentClasses,
    createdAt: new Date(embedded.createdAt),
    updatedAt: new Date(embedded.updatedAt),
  };
}

/**
 * Convert StyleClass to embedded format for storage
 */
export function styleClassToEmbedded(styleClass: StyleClass): EmbeddedStyleClass {
  return {
    id: styleClass.id,
    name: styleClass.name,
    styles: styleClass.styles,
    tabletStyles: styleClass.tabletStyles,
    mobileStyles: styleClass.mobileStyles,
    stateStyles: styleClass.stateStyles || {
      none: {},
      hover: {},
      pressed: {},
      focused: {},
      'focus-visible': {},
      'focus-within': {}
    },
    tabletStateStyles: styleClass.tabletStateStyles,
    mobileStateStyles: styleClass.mobileStateStyles,
    appliedTo: styleClass.appliedTo,
    inheritsFrom: styleClass.inheritsFrom || [],
    isAutoClass: styleClass.isAutoClass || false,
    dependentClasses: styleClass.dependentClasses || [],
    createdAt: styleClass.createdAt instanceof Date 
      ? styleClass.createdAt.toISOString() 
      : styleClass.createdAt,
    updatedAt: styleClass.updatedAt instanceof Date 
      ? styleClass.updatedAt.toISOString() 
      : styleClass.updatedAt,
  };
}

/**
 * Create default empty style classes config
 */
export function createDefaultStyleClassesConfig(): StyleClassesConfig {
  return {
    version: 1,
    classes: [],
    styleHashRegistry: {},
    namingConfig: { counters: {} }
  };
}

/**
 * Parse style_classes from database JSON
 */
export function parseStyleClassesConfig(data: any): StyleClassesConfig {
  if (!data) {
    return createDefaultStyleClassesConfig();
  }
  
  return {
    version: data.version || 1,
    classes: Array.isArray(data.classes) ? data.classes : [],
    styleHashRegistry: data.styleHashRegistry || {},
    namingConfig: data.namingConfig || { counters: {} }
  };
}
