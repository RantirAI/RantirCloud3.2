import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Database, Table, Plus, Trash2, GripVertical, Filter, ArrowUpDown,
  Calculator, Layers, Code, Eye, Play, RefreshCw, ChevronRight,
  ChevronDown, X, Search, Wand2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ChartQuery,
  ChartField,
  AggregationConfig,
  AggregationType,
  FilterCondition,
  FilterGroup,
  FilterOperator,
  GroupConfig,
  SortConfig,
  TableReference,
  QueryResult,
} from '@/types/chartQuery';
import { parseChartQuery, generateQueryString } from '@/lib/chartQueryParser';
import { executeChartQuery } from '@/lib/chartQueryExecutor';
import { supabase } from '@/integrations/supabase/client';

// ============================================
// TYPES
// ============================================

interface VisualQueryBuilderProps {
  initialQuery?: ChartQuery;
  onQueryChange?: (query: ChartQuery) => void;
  onDataChange?: (data: Record<string, any>[]) => void;
  compact?: boolean;
}

interface AvailableTable {
  id: string;
  name: string;
  databaseId?: string;
  databaseName?: string;
  fields: ChartField[];
  recordCount?: number;
}

// ============================================
// COMPONENT
// ============================================

export function VisualQueryBuilder({
  initialQuery,
  onQueryChange,
  onDataChange,
  compact = false,
}: VisualQueryBuilderProps) {
  const [mode, setMode] = useState<'visual' | 'code'>('visual');
  const [query, setQuery] = useState<ChartQuery>(initialQuery || createEmptyQuery());
  const [queryCode, setQueryCode] = useState('');
  const [availableTables, setAvailableTables] = useState<AvailableTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<AvailableTable | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, any>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load available tables
  useEffect(() => {
    loadAvailableTables();
  }, []);

  // Update query code when query changes
  useEffect(() => {
    if (mode === 'visual') {
      setQueryCode(generateQueryString(query));
    }
  }, [query, mode]);

  // Notify parent of changes
  useEffect(() => {
    onQueryChange?.(query);
  }, [query, onQueryChange]);

  const loadAvailableTables = async () => {
    try {
      const { data: tables, error } = await supabase
        .from('table_projects')
        .select('id, name, schema, database_id, records');

      if (error) throw error;

      const { data: databases } = await supabase
        .from('databases')
        .select('id, name');

      const dbMap = new Map((databases || []).map(d => [d.id, d.name]));

      const formattedTables: AvailableTable[] = (tables || []).map(t => {
        const schema = t.schema as any;
        const records = t.records as any[];
        return {
          id: t.id,
          name: t.name,
          databaseId: t.database_id || undefined,
          databaseName: t.database_id ? dbMap.get(t.database_id) : undefined,
          recordCount: Array.isArray(records) ? records.length : 0,
          fields: (schema?.fields || []).map((f: any) => ({
            id: f.id || f.name,
            name: f.name,
            type: mapFieldType(f.type),
          })),
        };
      });

      setAvailableTables(formattedTables);
    } catch (err) {
      console.error('Error loading tables:', err);
    }
  };

  const handleTableSelect = (tableId: string) => {
    const table = availableTables.find(t => t.id === tableId);
    if (!table) return;

    setSelectedTable(table);
    setQuery(prev => ({
      ...prev,
      source: {
        tableProjectId: table.id,
        tableName: table.name,
        databaseId: table.databaseId,
      },
      select: table.fields.slice(0, 5), // Select first 5 fields by default
    }));
  };

  const handleAddField = (field: ChartField) => {
    if (query.select.some(f => f.name === field.name)) return;
    setQuery(prev => ({
      ...prev,
      select: [...prev.select, field],
    }));
  };

  const handleRemoveField = (fieldName: string) => {
    setQuery(prev => ({
      ...prev,
      select: prev.select.filter(f => f.name !== fieldName),
    }));
  };

  const handleAddAggregation = (field: string, operation: AggregationType) => {
    const newAgg: AggregationConfig = {
      id: `agg-${Date.now()}`,
      field,
      operation,
      alias: `${operation}_${field}`,
    };
    setQuery(prev => ({
      ...prev,
      aggregations: [...(prev.aggregations || []), newAgg],
    }));
  };

  const handleRemoveAggregation = (id: string) => {
    setQuery(prev => ({
      ...prev,
      aggregations: prev.aggregations?.filter(a => a.id !== id),
    }));
  };

  const handleAddFilter = () => {
    const defaultField = selectedTable?.fields[0]?.name || '';
    const newCondition: FilterCondition = {
      id: `filter-${Date.now()}`,
      field: defaultField,
      operator: 'equals',
      value: '',
    };

    setQuery(prev => ({
      ...prev,
      where: prev.where
        ? {
            ...prev.where,
            conditions: [...prev.where.conditions, newCondition],
          }
        : {
            id: 'root-filter',
            logic: 'and',
            conditions: [newCondition],
          },
    }));
  };

  const handleUpdateFilter = (id: string, updates: Partial<FilterCondition>) => {
    setQuery(prev => {
      if (!prev.where) return prev;
      return {
        ...prev,
        where: {
          ...prev.where,
          conditions: prev.where.conditions.map(c =>
            'id' in c && c.id === id ? { ...c, ...updates } : c
          ) as (FilterCondition | FilterGroup)[],
        },
      };
    });
  };

  const handleRemoveFilter = (id: string) => {
    setQuery(prev => {
      if (!prev.where) return prev;
      const newConditions = prev.where.conditions.filter(c => !('id' in c) || c.id !== id);
      return {
        ...prev,
        where: newConditions.length > 0
          ? { ...prev.where, conditions: newConditions }
          : undefined,
      };
    });
  };

  const handleAddGroupBy = (field: string) => {
    setQuery(prev => ({
      ...prev,
      groupBy: [...(prev.groupBy || []), { field }],
    }));
  };

  const handleRemoveGroupBy = (field: string) => {
    setQuery(prev => ({
      ...prev,
      groupBy: prev.groupBy?.filter(g => g.field !== field),
    }));
  };

  const handleAddSort = (field: string) => {
    setQuery(prev => ({
      ...prev,
      orderBy: [...(prev.orderBy || []), { field, direction: 'asc' }],
    }));
  };

  const handleUpdateSort = (field: string, direction: 'asc' | 'desc') => {
    setQuery(prev => ({
      ...prev,
      orderBy: prev.orderBy?.map(s => s.field === field ? { ...s, direction } : s),
    }));
  };

  const handleRemoveSort = (field: string) => {
    setQuery(prev => ({
      ...prev,
      orderBy: prev.orderBy?.filter(s => s.field !== field),
    }));
  };

  const handleCodeChange = (code: string) => {
    setQueryCode(code);
    const result = parseChartQuery(code);
    if (result.success && result.query) {
      setQuery(result.query);
      setError(null);
    } else {
      setError(result.error?.message || 'Invalid query');
    }
  };

  const handleExecuteQuery = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await executeChartQuery(query);
      if (result.error) {
        setError(result.error);
      } else {
        setPreviewData(result.data);
        onDataChange?.(result.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col h-full", compact && "gap-2")}>
      {/* Mode Toggle */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'visual' | 'code')}>
            <TabsList className="h-8">
              <TabsTrigger value="visual" className="text-xs h-7 px-3">
                <Layers className="h-3.5 w-3.5 mr-1.5" />
                Visual
              </TabsTrigger>
              <TabsTrigger value="code" className="text-xs h-7 px-3">
                <Code className="h-3.5 w-3.5 mr-1.5" />
                Code
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="h-7 text-xs"
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            {showPreview ? 'Hide' : 'Show'} Preview
          </Button>
          <Button
            size="sm"
            onClick={handleExecuteQuery}
            disabled={isLoading || !query.source.tableName}
            className="h-7 text-xs"
          >
            {isLoading ? (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 mr-1.5" />
            )}
            Run Query
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Query Builder Panel */}
        <div className={cn("flex-1 flex flex-col border-r", showPreview && "max-w-[60%]")}>
          {mode === 'visual' ? (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Table Selection */}
                <TableSelector
                  tables={availableTables}
                  selectedTable={selectedTable}
                  onSelect={handleTableSelect}
                />

                {selectedTable && (
                  <>
                    {/* Field Selection */}
                    <FieldSelector
                      availableFields={selectedTable.fields}
                      selectedFields={query.select}
                      onAdd={handleAddField}
                      onRemove={handleRemoveField}
                    />

                    {/* Aggregations */}
                    <AggregationBuilder
                      availableFields={selectedTable.fields}
                      aggregations={query.aggregations || []}
                      onAdd={handleAddAggregation}
                      onRemove={handleRemoveAggregation}
                    />

                    {/* Filters */}
                    <FilterBuilder
                      availableFields={selectedTable.fields}
                      filters={query.where}
                      onAdd={handleAddFilter}
                      onUpdate={handleUpdateFilter}
                      onRemove={handleRemoveFilter}
                    />

                    {/* Group By */}
                    <GroupByBuilder
                      availableFields={selectedTable.fields}
                      groupBy={query.groupBy || []}
                      onAdd={handleAddGroupBy}
                      onRemove={handleRemoveGroupBy}
                    />

                    {/* Sorting */}
                    <SortBuilder
                      availableFields={selectedTable.fields}
                      sorts={query.orderBy || []}
                      onAdd={handleAddSort}
                      onUpdate={handleUpdateSort}
                      onRemove={handleRemoveSort}
                    />

                    {/* Limit */}
                    <LimitBuilder
                      limit={query.limit}
                      offset={query.offset}
                      onChange={(limit, offset) => setQuery(prev => ({ ...prev, limit, offset }))}
                    />
                  </>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 p-4">
              <QueryCodeEditor
                value={queryCode}
                onChange={handleCodeChange}
                error={error}
              />
            </div>
          )}
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="flex-1 flex flex-col max-w-[40%]">
            <DataPreview
              data={previewData}
              isLoading={isLoading}
              error={error}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function TableSelector({
  tables,
  selectedTable,
  onSelect,
}: {
  tables: AvailableTable[];
  selectedTable: AvailableTable | null;
  onSelect: (tableId: string) => void;
}) {
  const [search, setSearch] = useState('');

  const filteredTables = tables.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="h-4 w-4" />
          Data Source
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tables..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>

          <ScrollArea className="h-40">
            <div className="space-y-1">
              {filteredTables.map((table) => (
                <button
                  key={table.id}
                  className={cn(
                    "w-full flex items-center justify-between p-2 rounded-md text-left text-sm transition-colors",
                    selectedTable?.id === table.id
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => onSelect(table.id)}
                >
                  <div className="flex items-center gap-2">
                    <Table className="h-4 w-4 text-muted-foreground" />
                    <span>{table.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {table.recordCount || 0} rows
                  </Badge>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

function FieldSelector({
  availableFields,
  selectedFields,
  onAdd,
  onRemove,
}: {
  availableFields: ChartField[];
  selectedFields: ChartField[];
  onAdd: (field: ChartField) => void;
  onRemove: (fieldName: string) => void;
}) {
  const selectedNames = new Set(selectedFields.map(f => f.name));

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Select Fields
          </span>
          <Badge variant="secondary" className="text-xs">
            {selectedFields.length} selected
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex flex-wrap gap-2">
          {availableFields.map((field) => {
            const isSelected = selectedNames.has(field.name);
            return (
              <Badge
                key={field.name}
                variant={isSelected ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-colors",
                  isSelected && "pr-1"
                )}
                onClick={() => isSelected ? onRemove(field.name) : onAdd(field)}
              >
                {field.name}
                <span className="text-xs opacity-60 ml-1">({field.type})</span>
                {isSelected && (
                  <X className="h-3 w-3 ml-1 hover:text-destructive" />
                )}
              </Badge>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function AggregationBuilder({
  availableFields,
  aggregations,
  onAdd,
  onRemove,
}: {
  availableFields: ChartField[];
  aggregations: AggregationConfig[];
  onAdd: (field: string, operation: AggregationType) => void;
  onRemove: (id: string) => void;
}) {
  const [selectedField, setSelectedField] = useState('');
  const [selectedOp, setSelectedOp] = useState<AggregationType>('sum');

  const numericFields = availableFields.filter(f => f.type === 'number');
  const aggregationOps: { value: AggregationType; label: string }[] = [
    { value: 'sum', label: 'Sum' },
    { value: 'avg', label: 'Average' },
    { value: 'count', label: 'Count' },
    { value: 'min', label: 'Minimum' },
    { value: 'max', label: 'Maximum' },
    { value: 'median', label: 'Median' },
  ];

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Aggregations
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {/* Existing Aggregations */}
        {aggregations.map((agg) => (
          <div key={agg.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
            <Badge variant="secondary" className="text-xs">
              {agg.operation.toUpperCase()}
            </Badge>
            <span className="text-sm flex-1">{agg.field}</span>
            <span className="text-xs text-muted-foreground">as {agg.alias}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onRemove(agg.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}

        {/* Add New Aggregation */}
        <div className="flex gap-2">
          <Select value={selectedOp} onValueChange={(v) => setSelectedOp(v as AggregationType)}>
            <SelectTrigger className="w-28 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {aggregationOps.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedField} onValueChange={setSelectedField}>
            <SelectTrigger className="flex-1 h-8">
              <SelectValue placeholder="Select field..." />
            </SelectTrigger>
            <SelectContent>
              {(selectedOp === 'count' ? availableFields : numericFields).map((field) => (
                <SelectItem key={field.name} value={field.name}>
                  {field.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            className="h-8"
            disabled={!selectedField}
            onClick={() => {
              onAdd(selectedField, selectedOp);
              setSelectedField('');
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterBuilder({
  availableFields,
  filters,
  onAdd,
  onUpdate,
  onRemove,
}: {
  availableFields: ChartField[];
  filters?: FilterGroup;
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<FilterCondition>) => void;
  onRemove: (id: string) => void;
}) {
  const operators: { value: FilterOperator; label: string }[] = [
    { value: 'equals', label: '=' },
    { value: 'notEquals', label: '≠' },
    { value: 'greaterThan', label: '>' },
    { value: 'lessThan', label: '<' },
    { value: 'greaterThanOrEqual', label: '≥' },
    { value: 'lessThanOrEqual', label: '≤' },
    { value: 'contains', label: 'contains' },
    { value: 'isNull', label: 'is null' },
    { value: 'isNotNull', label: 'is not null' },
  ];

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </span>
          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={onAdd}>
            <Plus className="h-3 w-3 mr-1" />
            Add Filter
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        {filters?.conditions.map((condition, index) => {
          if (!('field' in condition)) return null;
          const cond = condition as FilterCondition;
          return (
            <div key={cond.id} className="flex items-center gap-2">
              {index > 0 && (
                <Badge variant="outline" className="text-xs">
                  {filters.logic.toUpperCase()}
                </Badge>
              )}
              <Select
                value={cond.field}
                onValueChange={(v) => onUpdate(cond.id, { field: v })}
              >
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableFields.map((f) => (
                    <SelectItem key={f.name} value={f.name}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={cond.operator}
                onValueChange={(v) => onUpdate(cond.id, { operator: v as FilterOperator })}
              >
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {!['isNull', 'isNotNull'].includes(cond.operator) && (
                <Input
                  value={cond.value || ''}
                  onChange={(e) => onUpdate(cond.id, { value: e.target.value })}
                  className="flex-1 h-8"
                  placeholder="Value..."
                />
              )}

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onRemove(cond.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          );
        })}

        {(!filters || filters.conditions.length === 0) && (
          <p className="text-xs text-muted-foreground text-center py-2">
            No filters applied
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function GroupByBuilder({
  availableFields,
  groupBy,
  onAdd,
  onRemove,
}: {
  availableFields: ChartField[];
  groupBy: GroupConfig[];
  onAdd: (field: string) => void;
  onRemove: (field: string) => void;
}) {
  const usedFields = new Set(groupBy.map(g => g.field));
  const unusedFields = availableFields.filter(f => !usedFields.has(f.name));

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Group By
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        <div className="flex flex-wrap gap-2">
          {groupBy.map((g) => (
            <Badge key={g.field} variant="secondary" className="pr-1">
              {g.field}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ml-1"
                onClick={() => onRemove(g.field)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>

        {unusedFields.length > 0 && (
          <Select onValueChange={onAdd}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Add group by field..." />
            </SelectTrigger>
            <SelectContent>
              {unusedFields.map((f) => (
                <SelectItem key={f.name} value={f.name}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardContent>
    </Card>
  );
}

function SortBuilder({
  availableFields,
  sorts,
  onAdd,
  onUpdate,
  onRemove,
}: {
  availableFields: ChartField[];
  sorts: SortConfig[];
  onAdd: (field: string) => void;
  onUpdate: (field: string, direction: 'asc' | 'desc') => void;
  onRemove: (field: string) => void;
}) {
  const usedFields = new Set(sorts.map(s => s.field));
  const unusedFields = availableFields.filter(f => !usedFields.has(f.name));

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4" />
          Sort By
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        {sorts.map((sort) => (
          <div key={sort.field} className="flex items-center gap-2">
            <span className="text-sm flex-1">{sort.field}</span>
            <Select
              value={sort.direction}
              onValueChange={(v) => onUpdate(sort.field, v as 'asc' | 'desc')}
            >
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onRemove(sort.field)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}

        {unusedFields.length > 0 && (
          <Select onValueChange={onAdd}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Add sort field..." />
            </SelectTrigger>
            <SelectContent>
              {unusedFields.map((f) => (
                <SelectItem key={f.name} value={f.name}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardContent>
    </Card>
  );
}

function LimitBuilder({
  limit,
  offset,
  onChange,
}: {
  limit?: number;
  offset?: number;
  onChange: (limit?: number, offset?: number) => void;
}) {
  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          Limit Results
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex gap-4">
          <div className="flex-1">
            <Label className="text-xs">Limit</Label>
            <Input
              type="number"
              value={limit || ''}
              onChange={(e) => onChange(
                e.target.value ? parseInt(e.target.value) : undefined,
                offset
              )}
              placeholder="No limit"
              className="h-8"
            />
          </div>
          <div className="flex-1">
            <Label className="text-xs">Offset</Label>
            <Input
              type="number"
              value={offset || ''}
              onChange={(e) => onChange(
                limit,
                e.target.value ? parseInt(e.target.value) : undefined
              )}
              placeholder="0"
              className="h-8"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QueryCodeEditor({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
}) {
  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">SQL-like Query</Label>
        {error && (
          <Badge variant="destructive" className="text-xs">
            {error}
          </Badge>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "flex-1 p-3 font-mono text-sm bg-muted/50 border rounded-lg resize-none",
          "focus:outline-none focus:ring-2 focus:ring-ring",
          error && "border-destructive"
        )}
        placeholder={`SELECT field1, SUM(field2) as total
FROM table_name
WHERE field1 = 'value'
GROUP BY field1
ORDER BY total DESC
LIMIT 10`}
      />
    </div>
  );
}

function DataPreview({
  data,
  isLoading,
  error,
}: {
  data: Record<string, any>[];
  isLoading: boolean;
  error: string | null;
}) {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-destructive">
          <p className="text-sm font-medium">Error</p>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-muted-foreground">
          <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No data to preview</p>
          <p className="text-xs">Select a table and run the query</p>
        </div>
      </div>
    );
  }

  const columns = Object.keys(data[0] || {});

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-4 py-2 border-b">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Preview</span>
          <Badge variant="secondary" className="text-xs">
            {data.length} rows
          </Badge>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                {columns.map((col) => (
                  <th key={col} className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 100).map((row, i) => (
                <tr key={i} className="border-b border-muted/50">
                  {columns.map((col) => (
                    <td key={col} className="px-2 py-1.5 truncate max-w-[150px]">
                      {formatCellValue(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================
// HELPERS
// ============================================

function createEmptyQuery(): ChartQuery {
  return {
    id: `query-${Date.now()}`,
    source: { tableProjectId: '', tableName: '' },
    select: [],
  };
}

function mapFieldType(type: string): ChartField['type'] {
  switch (type) {
    case 'number':
    case 'integer':
    case 'float':
    case 'decimal':
      return 'number';
    case 'date':
    case 'datetime':
    case 'timestamp':
      return 'date';
    case 'boolean':
    case 'bool':
      return 'boolean';
    case 'array':
    case 'multiselect':
      return 'array';
    case 'object':
    case 'json':
      return 'object';
    default:
      return 'string';
  }
}

function formatCellValue(value: any): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? '✓' : '✗';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
