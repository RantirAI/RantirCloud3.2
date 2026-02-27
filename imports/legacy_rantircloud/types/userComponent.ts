import { AppComponent } from './appBuilder';

// ============================================================================
// PROP SYSTEM - Typed, validated props with bindings
// ============================================================================

export type PropType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'color' 
  | 'image' 
  | 'icon'
  | 'slot'
  | 'select'
  | 'multiselect'
  | 'json'
  | 'action';  // For event handlers

export interface PropOption {
  label: string;
  value: string | number | boolean;
}

export interface PropValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;  // Regex pattern
  required?: boolean;
  custom?: string;   // Custom JS validation expression
}

export interface PropBinding {
  componentId: string;             // Which child component uses this prop
  property: string;                // Which property (text, backgroundColor, src, etc.)
  transform?: string;              // Optional JS expression for value transformation
  condition?: string;              // Conditional binding (only apply if condition met)
}

export interface ComponentProp {
  id: string;
  name: string;                    // e.g., "title", "buttonText", "backgroundColor"
  type: PropType;
  defaultValue?: any;
  required: boolean;
  description?: string;
  placeholder?: string;
  group?: string;                  // For organizing props in UI (e.g., "Content", "Style", "Behavior")
  options?: PropOption[];          // For select/multiselect types
  validation?: PropValidation;
  bindings: PropBinding[];         // Where this prop is used in the component tree
  responsiveOverrides?: {          // Different defaults per breakpoint
    tablet?: any;
    mobile?: any;
  };
}

// ============================================================================
// VARIANT SYSTEM - Multiple visual variants for one component
// ============================================================================

export interface ComponentVariant {
  id: string;
  name: string;                    // e.g., "primary", "secondary", "outlined", "ghost"
  description?: string;
  isDefault?: boolean;
  // Style overrides applied when this variant is active
  styleOverrides: Record<string, any>;
  // Prop default overrides for this variant
  propOverrides?: Record<string, any>;
  // Classes to apply for this variant
  classOverrides?: string[];
}

// ============================================================================
// SLOT SYSTEM - Named placeholders for user content
// ============================================================================

export interface ComponentSlot {
  id: string;
  name: string;                    // e.g., "header", "content", "footer", "icon"
  description?: string;
  allowedTypes?: string[];         // Restrict what component types can be placed here
  minChildren?: number;
  maxChildren?: number;
  defaultContent?: AppComponent[]; // Default children if slot is empty
  placeholder?: string;            // Placeholder text shown when empty
}

// ============================================================================
// STATE SYSTEM - Built-in component states with styling
// ============================================================================

export type ComponentStateType = 
  | 'default' 
  | 'hover' 
  | 'active' 
  | 'focus' 
  | 'disabled' 
  | 'loading'
  | 'error'
  | 'success';

export interface ComponentState {
  id: string;
  type: ComponentStateType;
  // Style modifications for this state
  styleModifiers: Record<string, any>;
  // Class additions/removals for this state
  classModifiers?: {
    add?: string[];
    remove?: string[];
  };
  // Transition settings
  transition?: {
    duration?: number;      // ms
    easing?: string;        // CSS easing function
    properties?: string[];  // Which properties to transition
  };
}

// ============================================================================
// CLASS INHERITANCE - Shared classes with instance override support
// ============================================================================

export type ClassInheritanceMode = 'shared' | 'detached' | 'override';

export interface ComponentClassReference {
  className: string;
  mode: ClassInheritanceMode;
  // If mode is 'override', these are the local style overrides
  localOverrides?: Record<string, any>;
  // Original class ID for tracking updates
  sourceClassId?: string;
}

// ============================================================================
// RESPONSIVE SYSTEM - Breakpoint-specific overrides
// ============================================================================

export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

export interface ResponsiveOverride {
  breakpoint: Breakpoint;
  propOverrides?: Record<string, any>;
  styleOverrides?: Record<string, any>;
  visibility?: 'visible' | 'hidden';
}

// ============================================================================
// EVENT SYSTEM - Actions triggered by component events
// ============================================================================

export type ComponentEventType = 
  | 'onClick'
  | 'onHover'
  | 'onFocus'
  | 'onBlur'
  | 'onSubmit'
  | 'onChange'
  | 'onLoad'
  | 'onIntersect';  // When element enters viewport

export interface ComponentEvent {
  id: string;
  event: ComponentEventType;
  actions: ComponentAction[];
}

export interface ComponentAction {
  id: string;
  type: 'navigate' | 'setState' | 'callApi' | 'showModal' | 'hideModal' | 'custom';
  config: Record<string, any>;
}

// ============================================================================
// MAIN COMPONENT DEFINITION
// ============================================================================

export interface UserComponent {
  id: string;
  name: string;
  description?: string;
  category?: string;               // "Cards", "Headers", "Forms", etc.
  tags?: string[];                 // For search/filtering
  
  // Core structure
  definition: AppComponent;        // The component tree (root element)
  
  // Props system
  props: ComponentProp[];          // Exposed parameters
  
  // Variants system
  variants?: ComponentVariant[];
  defaultVariant?: string;         // Variant ID
  
  // Slots system
  slots?: ComponentSlot[];
  
  // States system
  states?: ComponentState[];
  
  // Class inheritance
  inheritedClasses?: ComponentClassReference[];
  
  // Responsive overrides
  responsiveOverrides?: ResponsiveOverride[];
  
  // Events
  events?: ComponentEvent[];
  
  // Metadata
  thumbnail?: string;              // Preview image (base64 or URL)
  version?: number;                // For tracking updates
  isLocked?: boolean;              // Prevent editing
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// COMPONENT INSTANCE - Placed on canvas
// ============================================================================

export interface UserComponentInstance {
  userComponentId: string;         // Reference to the UserComponent
  
  // Prop overrides
  propValues: Record<string, any>;
  
  // Active variant
  activeVariant?: string;
  
  // Slot content
  slots?: Record<string, AppComponent[]>;
  
  // Class inheritance mode per class
  classInheritance?: Record<string, ClassInheritanceMode>;
  
  // Local class overrides (when mode is 'override')
  localClassOverrides?: Record<string, Record<string, any>>;
  
  // Instance-specific responsive overrides
  responsiveOverrides?: ResponsiveOverride[];
  
  // Instance-specific state overrides
  stateOverrides?: Record<ComponentStateType, Record<string, any>>;
}

// ============================================================================
// DATA STRUCTURES
// ============================================================================

export interface UserComponentsData {
  version: number;
  components: UserComponent[];
  categories: string[];
  // Global component settings
  settings?: {
    defaultVariantBehavior?: 'inherit' | 'override';
    defaultClassMode?: ClassInheritanceMode;
    enableStateTransitions?: boolean;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function createDefaultUserComponentsData(): UserComponentsData {
  return {
    version: 2,  // Updated version for new schema
    components: [],
    categories: [],
    settings: {
      defaultVariantBehavior: 'inherit',
      defaultClassMode: 'shared',
      enableStateTransitions: true
    }
  };
}

export function parseUserComponentsData(data: any): UserComponentsData {
  if (!data) {
    return createDefaultUserComponentsData();
  }
  
  // Handle migration from v1 to v2
  if (!data.version || data.version === 1) {
    return {
      version: 2,
      components: Array.isArray(data.components) ? data.components.map(migrateComponentV1toV2) : [],
      categories: Array.isArray(data.categories) ? data.categories : [],
      settings: {
        defaultVariantBehavior: 'inherit',
        defaultClassMode: 'shared',
        enableStateTransitions: true
      }
    };
  }
  
  return {
    version: data.version,
    components: Array.isArray(data.components) ? data.components : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
    settings: data.settings || {
      defaultVariantBehavior: 'inherit',
      defaultClassMode: 'shared',
      enableStateTransitions: true
    }
  };
}

/**
 * Migrate v1 component to v2 format
 */
function migrateComponentV1toV2(component: any): UserComponent {
  return {
    ...component,
    // Ensure new fields exist with defaults
    variants: component.variants || [],
    slots: component.slots || [],
    states: component.states || createDefaultStates(),
    inheritedClasses: component.inheritedClasses || extractClassReferences(component.definition),
    responsiveOverrides: component.responsiveOverrides || [],
    events: component.events || [],
    version: 1,
    tags: component.tags || []
  };
}

/**
 * Create default component states
 */
function createDefaultStates(): ComponentState[] {
  return [
    {
      id: 'state-hover',
      type: 'hover',
      styleModifiers: {},
      transition: { duration: 200, easing: 'ease-out' }
    },
    {
      id: 'state-active',
      type: 'active',
      styleModifiers: {},
      transition: { duration: 100, easing: 'ease-out' }
    },
    {
      id: 'state-disabled',
      type: 'disabled',
      styleModifiers: { opacity: 0.5 },
      classModifiers: { add: ['pointer-events-none'] }
    },
    {
      id: 'state-loading',
      type: 'loading',
      styleModifiers: {},
      classModifiers: { add: ['animate-pulse'] }
    }
  ];
}

/**
 * Extract class references from component definition
 */
function extractClassReferences(definition: AppComponent): ComponentClassReference[] {
  const classes: ComponentClassReference[] = [];
  
  const extractFromNode = (node: AppComponent) => {
    const appliedClasses = node.props?.appliedClasses || [];
    for (const className of appliedClasses) {
      if (!classes.find(c => c.className === className)) {
        classes.push({
          className,
          mode: 'shared'  // Default to shared
        });
      }
    }
    
    if (node.children) {
      for (const child of node.children) {
        extractFromNode(child);
      }
    }
  };
  
  extractFromNode(definition);
  return classes;
}

/**
 * Deep clone a component tree and generate new IDs
 */
export function cloneComponentWithNewIds(component: AppComponent): AppComponent {
  const newId = crypto.randomUUID();
  
  const cloned: AppComponent = {
    ...component,
    id: newId,
    children: component.children?.map(child => cloneComponentWithNewIds(child))
  };
  
  return cloned;
}

/**
 * Find all bindable properties in a component tree
 */
export function findBindableProperties(component: AppComponent, path: string = ''): Array<{
  componentId: string;
  componentName: string;
  componentLabel?: string;
  property: string;
  propertyType: PropType;
  currentValue: any;
  path: string;
}> {
  const results: Array<{
    componentId: string;
    componentName: string;
    componentLabel?: string;
    property: string;
    propertyType: PropType;
    currentValue: any;
    path: string;
  }> = [];
  
  const currentPath = path ? `${path} > ${component.type}` : component.type;
  const label = component.props?.label || component.props?.content?.substring?.(0, 20);
  
  // Define bindable properties with their types
  const bindablePropsMap: Record<string, PropType> = {
    content: 'string',
    text: 'string',
    src: 'image',
    href: 'string',
    alt: 'string',
    placeholder: 'string',
    label: 'string',
    title: 'string',
    description: 'string',
    disabled: 'boolean',
    hidden: 'boolean',
    icon: 'icon',
    onClick: 'action'
  };
  
  // Check top-level props
  for (const [prop, type] of Object.entries(bindablePropsMap)) {
    const value = component[prop as keyof AppComponent] ?? component.props?.[prop];
    if (value !== undefined) {
      results.push({
        componentId: component.id,
        componentName: component.type,
        componentLabel: label,
        property: prop,
        propertyType: type,
        currentValue: value,
        path: currentPath
      });
    }
  }
  
  // Check style properties that might be bindable
  const styleBindables: Array<{ path: string; type: PropType }> = [
    { path: 'backgroundColor', type: 'color' },
    { path: 'color', type: 'color' },
    { path: 'borderColor', type: 'color' },
    { path: 'backgroundImage', type: 'image' }
  ];
  
  for (const { path: stylePath, type } of styleBindables) {
    const value = component.props?.[stylePath] || component.style?.[stylePath];
    if (value !== undefined) {
      results.push({
        componentId: component.id,
        componentName: component.type,
        componentLabel: label,
        property: stylePath,
        propertyType: type,
        currentValue: value,
        path: currentPath
      });
    }
  }
  
  // Recurse into children
  if (component.children) {
    for (const child of component.children) {
      results.push(...findBindableProperties(child, currentPath));
    }
  }
  
  return results;
}

/**
 * Create a default component prop
 */
export function createDefaultProp(name: string, type: PropType = 'string'): ComponentProp {
  return {
    id: crypto.randomUUID(),
    name,
    type,
    required: false,
    defaultValue: type === 'boolean' ? false : type === 'number' ? 0 : '',
    bindings: []
  };
}

/**
 * Create a default variant
 */
export function createDefaultVariant(name: string): ComponentVariant {
  return {
    id: crypto.randomUUID(),
    name,
    styleOverrides: {},
    propOverrides: {}
  };
}

/**
 * Create a default slot
 */
export function createDefaultSlot(name: string): ComponentSlot {
  return {
    id: crypto.randomUUID(),
    name,
    placeholder: `Drop content for ${name} slot`
  };
}

/**
 * Resolve component instance with all overrides applied
 */
export function resolveComponentInstance(
  component: UserComponent,
  instance: UserComponentInstance,
  activeState?: ComponentStateType
): AppComponent {
  // Start with cloned definition
  let resolved = JSON.parse(JSON.stringify(component.definition)) as AppComponent;
  
  // Apply variant if specified
  if (instance.activeVariant && component.variants) {
    const variant = component.variants.find(v => v.id === instance.activeVariant);
    if (variant) {
      resolved = applyStyleOverrides(resolved, variant.styleOverrides);
    }
  }
  
  // Apply prop values
  for (const prop of component.props) {
    const value = instance.propValues[prop.name] ?? prop.defaultValue;
    if (value === undefined) continue;
    
    for (const binding of prop.bindings) {
      // Check condition if present
      if (binding.condition) {
        try {
          const conditionMet = new Function('props', `return ${binding.condition}`)(instance.propValues);
          if (!conditionMet) continue;
        } catch (e) {
          console.warn('[resolveComponentInstance] Failed to evaluate condition:', binding.condition);
        }
      }
      
      // Apply transform if present
      let finalValue = value;
      if (binding.transform) {
        try {
          finalValue = new Function('value', 'props', `return ${binding.transform}`)(value, instance.propValues);
        } catch (e) {
          console.warn('[resolveComponentInstance] Failed to apply transform:', binding.transform);
        }
      }
      
      applyValueToNode(resolved, binding.componentId, binding.property, finalValue);
    }
  }
  
  // Apply state modifiers
  if (activeState && activeState !== 'default' && component.states) {
    const state = component.states.find(s => s.type === activeState);
    if (state) {
      resolved = applyStyleOverrides(resolved, state.styleModifiers);
    }
  }
  
  // Apply slots
  if (instance.slots && component.slots) {
    for (const slot of component.slots) {
      const slotContent = instance.slots[slot.name];
      if (slotContent) {
        injectSlotContent(resolved, slot.name, slotContent);
      }
    }
  }
  
  return resolved;
}

function applyStyleOverrides(node: AppComponent, overrides: Record<string, any>): AppComponent {
  return {
    ...node,
    props: { ...node.props, ...overrides },
    children: node.children?.map(child => applyStyleOverrides(child, {}))
  };
}

function applyValueToNode(root: AppComponent, targetId: string, property: string, value: any): boolean {
  if (root.id === targetId) {
    if (property.includes('.')) {
      const parts = property.split('.');
      let obj: any = root;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!obj[parts[i]]) obj[parts[i]] = {};
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = value;
    } else if (property.startsWith('props.')) {
      const propName = property.substring(6);
      if (!root.props) root.props = {};
      root.props[propName] = value;
    } else {
      (root as any)[property] = value;
    }
    return true;
  }
  
  if (root.children) {
    for (const child of root.children) {
      if (applyValueToNode(child, targetId, property, value)) return true;
    }
  }
  
  return false;
}

function injectSlotContent(root: AppComponent, slotName: string, content: AppComponent[]): void {
  // Find slot placeholder and replace with content
  const findAndReplace = (node: AppComponent): boolean => {
    if (node.props?.slotName === slotName) {
      node.children = content;
      return true;
    }
    
    if (node.children) {
      for (const child of node.children) {
        if (findAndReplace(child)) return true;
      }
    }
    
    return false;
  };
  
  findAndReplace(root);
}
