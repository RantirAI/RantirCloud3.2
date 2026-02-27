import { StyleClassesConfig } from './styleClasses';

export interface AppProject {
  id: string;
  user_id: string;
  workspace_id?: string | null;
  name: string;
  description?: string;
  pages: AppPage[];
  global_styles: Record<string, any>;
  settings: AppSettings;
  style_classes?: StyleClassesConfig; // Embedded style classes - atomic save with project
  created_at: string;
  updated_at: string;
}

export interface PageParameter {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  required: boolean;
  defaultValue?: any;
  description?: string;
}

export interface AppPage {
  id: string;
  name: string;
  route: string;
  components: AppComponent[];
  layout: PageLayout;
  settings: PageSettings;
  parameters?: PageParameter[];
  bodyProperties?: Record<string, any>;
}

export interface AppComponent {
  id: string;
  type: ComponentType;
  props: Record<string, any>;
  style: ComponentStyle;
  children?: AppComponent[];
  actions?: ComponentAction[];
  conditions?: ComponentCondition[];
  dataSource?: DataBinding;
  security?: SecurityConfig;
  actionFlows?: Record<string, any>;
  
  // New class-reference system (optional for backward compatibility)
  classNames?: string[];           // Class references (replaces appliedClasses in props)
  styleOverrides?: Record<string, any>; // Only properties that override class defaults
  
  // User component instance reference (when type is 'user-component')
  userComponentRef?: {
    userComponentId: string;
    propValues: Record<string, any>;
    slots?: Record<string, AppComponent[]>;
  };
}

export interface DataBinding {
  type?: 'table' | 'api' | 'static';
  connectionId?: string;
  tableProjectId?: string;
  tableName: string;
  query?: string;
  filters?: DataFilter[];
  sorting?: DataSort[];
  pagination?: DataPagination;
  realTime?: boolean;
  schema?: any;
}

export interface DataFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'like' | 'contains';
  value: any;
}

export interface DataSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface DataPagination {
  page: number;
  pageSize: number;
  total?: number;
}

export interface SecurityConfig {
  requireAuth?: boolean;
  allowedRoles?: string[];
  permissions?: Permission[];
  rateLimiting?: RateLimitConfig;
}

export interface Permission {
  action: 'read' | 'write' | 'delete';
  resource: string;
}

export interface RateLimitConfig {
  requests: number;
  window: number;
}

export type ComponentType = 
  | 'div'
  | 'section'
  | 'container'
  | 'row' 
  | 'column'
  | 'grid'
  | 'text'
  | 'heading'
  | 'button'
  | 'icon'
  | 'input'
  | 'password-input'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'radio-group'
  | 'checkbox-group'
  | 'image'
  | 'card'
  | 'table'
  | 'datatable'
  | 'form'
  | 'form-wrapper'
  | 'form-wizard'
  | 'list'
  | 'data-display'
  | 'nav-horizontal'
  | 'nav-vertical'
  | 'navigation'
  | 'header'
  | 'footer'
  | 'sidebar'
  | 'modal'
  | 'tabs'
  | 'tab-item'
  | 'tab-trigger'
  | 'tab-content'
  | 'accordion'
  | 'accordion-item'
  | 'accordion-header'
  | 'accordion-content'
  | 'chart'
  | 'calendar'
  | 'datepicker'
  | 'fileupload'
  | 'avatar'
  | 'badge'
  | 'alert'
  | 'progress'
  | 'skeleton'
  | 'separator'
  | 'spacer'
  | 'switch'
  | 'slider'
  | 'label'
  | 'combobox'
  | 'input-otp'
  | 'video'
  | 'audio'
  | 'keyboard'
  | 'breadcrumb'
  | 'pagination'
  | 'command'
  | 'menubar'
  | 'navigation-menu'
  | 'toast'
  | 'alert-dialog'
  | 'sonner'
  | 'dialog'
  | 'sheet'
  | 'popover'
  | 'tooltip'
  | 'hover-card'
  | 'context-menu'
  | 'dropdown-menu'
  | 'drawer'
  | 'collapsible'
  | 'carousel'
  | 'carousel-slide'
  | 'carousel-slide-content'
  | 'toggle'
  | 'toggle-group'
  | 'scroll-area'
  | 'theme-toggle'
  | 'divider'
  | 'loading'
  | 'spinner'
  | 'blockquote'
  | 'code'
  | 'codeblock'
  | 'link'
  | 'aspect-ratio'
  | 'resizable'
  | 'login-form'
  | 'register-form'
  | 'user-profile'
  | 'auth-status'
  | 'dynamic-list'
  | 'pro-dynamic-list'
  | 'dynamic-grid'
  | 'user-component';

export interface ComponentStyle {
  layout?: {
    display?: 'block' | 'inline' | 'flex' | 'grid' | 'none';
    flexDirection?: 'row' | 'column';
    justifyContent?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
    alignItems?: 'start' | 'center' | 'end' | 'stretch';
    gap?: number;
    gridCols?: number;
    gridRows?: number;
  };
  spacing?: {
    padding?: number | { top?: number; right?: number; bottom?: number; left?: number };
    margin?: number | { top?: number; right?: number; bottom?: number; left?: number };
  };
  sizing?: {
    width?: string | number;
    height?: string | number;
    maxWidth?: string | number;
    maxHeight?: string | number;
    minWidth?: string | number;
    minHeight?: string | number;
  };
  typography?: {
    fontSize?: string;
    fontWeight?: string;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    color?: string;
    lineHeight?: string;
  };
  background?: {
    color?: string | { type: 'solid' | 'gradient'; value: string; opacity?: number } | null;
    image?: string;
    gradient?: string;
    layerOrder?: string[];
    size?: string;
    position?: string;
    repeat?: string;
  };
  border?: {
    width?: number;
    style?: 'solid' | 'dashed' | 'dotted';
    color?: string;
    radius?: number;
  };
  shadow?: {
    blur?: number;
    spread?: number;
    color?: string;
    x?: number;
    y?: number;
  };
  animation?: {
    type?: 'fade' | 'slide' | 'scale' | 'bounce';
    duration?: number;
    delay?: number;
  };
}

export interface ComponentAction {
  id: string;
  trigger: ActionTrigger;
  type: ActionType;
  config: ActionConfig;
}

export type ActionTrigger = 'click' | 'hover' | 'focus' | 'submit' | 'change' | 'load';

export type ActionType = 
  | 'navigate'
  | 'navigateToPage'
  | 'openModal'
  | 'closeModal'
  | 'showAlert'
  | 'apiCall'
  | 'databaseQuery'
  | 'authenticate'
  | 'register'
  | 'logout'
  | 'authCheck'
  | 'copyToClipboard'
  | 'downloadFile'
  | 'executeCode'
  | 'toggleVisibility'
  | 'updateComponent'
  | 'refreshData'
  | 'flow';

export interface ActionConfig {
  [key: string]: any;
  // For navigate actions
  url?: string;
  target?: '_self' | '_blank';
  // For navigateToPage actions
  pageId?: string;
  parameters?: Record<string, any>;
}

export interface ComponentCondition {
  id: string;
  type: 'show' | 'hide' | 'enable' | 'disable';
  condition: string; // JavaScript expression
  value?: any;
}

export interface PageLayout {
  type: 'free' | 'grid' | 'sections';
  config: Record<string, any>;
}

export interface PageSettings {
  title: string;
  description?: string;
  keywords?: string[];
  requireAuth?: boolean;
  redirectOnUnauth?: string;
  allowedRoles?: string[];
  seo?: {
    title?: string;
    description?: string;
    image?: string;
  };
  // Enhanced page settings
  isHomePage?: boolean;
  isUtilityPage?: boolean;
  isDynamicPage?: boolean;
  statusCode?: number;
  redirectPath?: string;
  excludeFromSearch?: boolean;
  language?: string;
  customHeadCode?: string;
  customBodyCode?: string;
  passwordProtected?: boolean;
  passwordHash?: string;
  excludedGlobalHeaders?: string[];
}

export interface GlobalHeaderConfig {
  id: string;           // Component ID of the nav element
  sourcePageId: string; // The page where the original component lives
  type: 'nav-horizontal' | 'nav-vertical';
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  primaryColor: string;
  fontFamily: string;
  favicon?: string;
  customCode?: {
    head?: string;
    body?: string;
  };
  authentication?: {
    enabled: boolean;
    provider: 'supabase' | 'custom';
    loginPage?: string;
    redirectAfterLogin?: string;
  };
  globalHeaders?: GlobalHeaderConfig[];
  database?: {
    connections: DatabaseConnection[];
    selectedId?: string;
    selectedName?: string;
  };
  api?: {
    baseUrl?: string;
    headers?: Record<string, string>;
  };
  // Centralized Design System configuration
  designSystem?: any; // DesignSystemConfig from @/types/designSystem
}

export interface DatabaseConnection {
  id: string;
  name: string;
  type: 'supabase' | 'postgres' | 'mysql' | 'api';
  config: Record<string, any>;
  tables: DatabaseTable[];
}

export interface DatabaseTable {
  name: string;
  columns: DatabaseColumn[];
  relationships: DatabaseRelationship[];
}

export interface DatabaseColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
}

export interface DatabaseRelationship {
  type: 'oneToOne' | 'oneToMany' | 'manyToMany';
  table: string;
  foreignKey: string;
  localKey: string;
}

export interface DragItem {
  id: string;
  type: ComponentType;
  data?: any;
}

export interface DropZone {
  id: string;
  accepts: ComponentType[];
  parentId?: string;
  index?: number;
}

export interface AppBuilderState {
  currentProject?: AppProject;
  currentPage?: string;
  selectedComponent?: string;
  draggedItem?: DragItem;
  hoveredZone?: string;
  mode: 'design' | 'preview' | 'code' | 'variables';
  showGrid: boolean;
  zoom: number;
}