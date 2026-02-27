// Chart Query System Types
// A powerful query language for chart data transformations

// ============================================
// FIELD TYPES
// ============================================

export type FieldType = 'string' | 'number' | 'date' | 'boolean' | 'object' | 'array';

export interface ChartField {
  id: string;
  name: string;
  type: FieldType;
  alias?: string;
  format?: string; // For dates: 'YYYY-MM-DD', for numbers: 'currency', 'percentage'
}

// ============================================
// AGGREGATION TYPES
// ============================================

export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'median' | 'distinct' | 'first' | 'last';

export interface AggregationConfig {
  id: string;
  field: string;
  operation: AggregationType;
  alias?: string;
}

// ============================================
// FILTER TYPES
// ============================================

export type FilterOperator = 
  | 'equals' | 'notEquals'
  | 'contains' | 'notContains' | 'startsWith' | 'endsWith'
  | 'greaterThan' | 'lessThan' | 'greaterThanOrEqual' | 'lessThanOrEqual'
  | 'between' | 'notBetween'
  | 'in' | 'notIn'
  | 'isNull' | 'isNotNull'
  | 'isEmpty' | 'isNotEmpty';

export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  valueEnd?: any; // For 'between' operator
}

export type FilterLogic = 'and' | 'or';

export interface FilterGroup {
  id: string;
  logic: FilterLogic;
  conditions: (FilterCondition | FilterGroup)[];
}

// ============================================
// SORT TYPES
// ============================================

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: string;
  direction: SortDirection;
  nullsFirst?: boolean;
}

// ============================================
// GROUPING TYPES
// ============================================

export type DateGrouping = 'year' | 'quarter' | 'month' | 'week' | 'day' | 'hour';

export interface GroupConfig {
  field: string;
  dateGrouping?: DateGrouping;
}

// ============================================
// JOIN TYPES
// ============================================

export type JoinType = 'inner' | 'left' | 'right' | 'full';

export interface JoinConfig {
  id: string;
  table: TableReference;
  joinType: JoinType;
  leftField: string;
  rightField: string;
}

// ============================================
// TABLE REFERENCE
// ============================================

export interface TableReference {
  databaseId?: string;
  tableProjectId: string;
  tableName: string;
  alias?: string;
}

// ============================================
// COMPUTED FIELD TYPES
// ============================================

export type ComputedOperator = 'add' | 'subtract' | 'multiply' | 'divide' | 'modulo' | 'concat';

export interface ComputedField {
  id: string;
  name: string;
  expression: string; // Simple expression like "field1 + field2" or "field1 * 100"
  resultType: FieldType;
}

// ============================================
// CHART QUERY DEFINITION
// ============================================

export interface ChartQuery {
  id: string;
  name?: string;
  description?: string;
  
  // Data Sources
  source: TableReference;
  joins?: JoinConfig[];
  
  // Field Selection
  select: ChartField[];
  computedFields?: ComputedField[];
  
  // Aggregations
  aggregations?: AggregationConfig[];
  groupBy?: GroupConfig[];
  having?: FilterGroup; // Filter on aggregated values
  
  // Filtering & Sorting
  where?: FilterGroup;
  orderBy?: SortConfig[];
  
  // Pagination (for large datasets)
  limit?: number;
  offset?: number;
  
  // Caching
  cacheSeconds?: number;
}

// ============================================
// QUERY EXECUTION RESULT
// ============================================

export interface QueryResult {
  data: Record<string, any>[];
  fields: ChartField[];
  totalCount: number;
  executionTime: number;
  fromCache?: boolean;
  error?: string;
}

// ============================================
// VISUAL QUERY BUILDER STATE
// ============================================

export interface VisualQueryBuilderState {
  mode: 'visual' | 'code';
  query: ChartQuery;
  selectedTable: TableReference | null;
  availableTables: TableReference[];
  availableFields: ChartField[];
  previewData: Record<string, any>[];
  isLoading: boolean;
  error: string | null;
  isDirty: boolean;
}

// ============================================
// QUERY LANGUAGE (DSL)
// ============================================

// Simple query language syntax:
// SELECT field1, SUM(field2) as total
// FROM table_name
// WHERE field1 = 'value' AND field2 > 100
// GROUP BY field1
// ORDER BY total DESC
// LIMIT 10

export interface ParsedQueryToken {
  type: 'keyword' | 'identifier' | 'operator' | 'value' | 'function' | 'punctuation';
  value: string;
  position: number;
}

export interface QueryParseResult {
  success: boolean;
  query?: ChartQuery;
  tokens?: ParsedQueryToken[];
  error?: {
    message: string;
    position: number;
    line: number;
    column: number;
  };
}

// ============================================
// CHART DATA SOURCE CONFIG
// ============================================

export type ChartDataSourceType = 'table' | 'query' | 'manual' | 'api';

export interface ChartDataSource {
  type: ChartDataSourceType;
  
  // For table type
  table?: TableReference;
  
  // For query type
  query?: ChartQuery;
  queryCode?: string; // Raw query string
  
  // For manual type
  manualData?: Record<string, any>[];
  
  // For API type
  apiEndpoint?: string;
  apiMethod?: 'GET' | 'POST';
  apiHeaders?: Record<string, string>;
  apiBody?: string;
  apiDataPath?: string; // JSON path to extract data
  
  // Refresh settings
  autoRefresh?: boolean;
  refreshInterval?: number; // seconds
}

// ============================================
// CHART CONFIGURATION
// ============================================

export interface ChartAxisConfig {
  field: string;
  label?: string;
  format?: string;
  min?: number;
  max?: number;
  tickCount?: number;
}

export interface ChartSeriesConfig {
  id: string;
  type?: 'bar' | 'line' | 'area'; // For composed charts
  field: string;
  label?: string;
  color?: string;
  opacity?: number;
  showValues?: boolean;
  stacked?: boolean;
}

export interface ChartConfiguration {
  // Basic
  type: ChartType;
  title?: string;
  subtitle?: string;
  
  // Data
  dataSource: ChartDataSource;
  
  // Axes
  xAxis: ChartAxisConfig;
  yAxis: ChartAxisConfig;
  yAxis2?: ChartAxisConfig; // Secondary Y axis
  
  // Series (for multi-series charts)
  series: ChartSeriesConfig[];
  
  // Appearance
  colorScheme?: string;
  customColors?: string[];
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  showGrid?: boolean;
  showTooltip?: boolean;
  animation?: boolean;
  
  // Dimensions
  height?: number;
  aspectRatio?: number;
  
  // Interactivity
  enableZoom?: boolean;
  enableBrush?: boolean;
  onClickAction?: 'navigate' | 'filter' | 'custom';
  clickActionConfig?: Record<string, any>;
}

export type ChartType = 
  | 'bar' 
  | 'stacked-bar' 
  | 'horizontal-bar'
  | 'line' 
  | 'area' 
  | 'stacked-area'
  | 'pie' 
  | 'donut' 
  | 'scatter' 
  | 'radar' 
  | 'funnel' 
  | 'treemap'
  | 'composed'
  | 'gauge'
  | 'heatmap';
