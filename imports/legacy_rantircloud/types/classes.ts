export type PseudoState = 'none' | 'hover' | 'pressed' | 'focused' | 'focus-visible' | 'focus-within';

export type PropertySource = 'class' | 'manual' | 'inherited';
export type ClassType = 'primary' | 'secondary';

export interface PropertySourceInfo {
  source: PropertySource;
  classId?: string;
  className?: string;
}

export interface ComponentPropertySources {
  [propertyName: string]: PropertySourceInfo;
}

/**
 * Represents a class in the component's class stack
 */
export interface ClassStackItem {
  name: string;
  type: ClassType;
  editable: boolean;
}

export interface StyleClass {
  id: string;
  name: string;
  styles: Record<string, any>; // Base/desktop styles (none state)
  tabletStyles?: Record<string, any>; // Tablet breakpoint overrides (max-width: 991px)
  mobileStyles?: Record<string, any>; // Mobile breakpoint overrides (max-width: 767px)
  stateStyles: Record<PseudoState, Record<string, any>>; // Styles for each state
  tabletStateStyles?: Record<PseudoState, Record<string, any>>; // Tablet hover/focus states
  mobileStateStyles?: Record<PseudoState, Record<string, any>>; // Mobile hover/focus states
  appliedTo: string[]; // Component IDs that use this class
  inheritsFrom: string[]; // Parent class IDs
  createdAt: Date;
  updatedAt: Date;
  isAutoClass?: boolean; // Marks classes that were auto-created
  dependentClasses?: string[]; // Secondary classes that depend on this class
  isLocked?: boolean; // Whether class is locked due to dependencies
}

export interface ClassState {
  classes: StyleClass[];
  selectedClass: string | null;
  selectedState: PseudoState;
  isClassPanelOpen: boolean;
  editingClassName: string | null; // Class currently being edited in the selector
}

export interface ClassActions {
  loadClasses: (appProjectId: string) => Promise<void>;
  addClass: (name: string, styles: Record<string, any>, isAutoClass?: boolean) => Promise<StyleClass | undefined>;
  updateClass: (id: string, updates: Partial<StyleClass>) => Promise<void>;
  updateClassState: (id: string, state: PseudoState, styles: Record<string, any>) => Promise<void>;
  /** Update styles at a specific breakpoint (desktop, tablet, or mobile) */
  updateClassBreakpoint: (
    id: string, 
    breakpoint: 'desktop' | 'tablet' | 'mobile', 
    styles: Record<string, any>
  ) => Promise<void>;
  /** Update state styles at a specific breakpoint */
  updateClassBreakpointState: (
    id: string,
    breakpoint: 'desktop' | 'tablet' | 'mobile',
    state: PseudoState,
    styles: Record<string, any>
  ) => Promise<void>;
  /** Remove a specific property override from a breakpoint (reverts to parent breakpoint) */
  removeClassBreakpointProperty: (
    classId: string,
    breakpoint: 'tablet' | 'mobile',
    propertyKey: string | string[]
  ) => void;
  deleteClass: (id: string) => Promise<void>;
  duplicateClass: (id: string, newName: string) => void;
  applyClassToComponent: (classId: string, componentId: string, lockedPropsOverride?: Record<string, any>) => Promise<void>;
  removeClassFromComponent: (classId: string, componentId: string) => Promise<void>;
  selectClass: (classId: string | null) => void;
  setSelectedState: (state: PseudoState) => void;
  setClassPanelOpen: (open: boolean) => void;
  createClassFromComponent: (componentId: string, className: string) => Promise<void>;
  setActiveClass: (componentId: string, className: string) => Promise<void>;
  setEditingClassName: (className: string | null) => void;
  updateClassDependencies: (primaryClassName: string, dependentClassName: string, action: 'add' | 'remove') => void;
  cleanupDeletedComponentReferences: (componentId: string) => Promise<void>;
  reconcileOrphanedClasses: () => Promise<void>;
}

export type ClassStore = ClassState & ClassActions & {
  cleanupDuplicateClasses: (componentId: string) => void;
};