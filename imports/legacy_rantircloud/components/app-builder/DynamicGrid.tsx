import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppComponent } from '@/types/appBuilder';
import { ComponentRenderer } from './ComponentRenderer';
import { tableService } from '@/services/tableService';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { EnhancedDropZone } from './EnhancedDropZone';

interface DynamicGridProps {
  component: AppComponent;
  isPreview: boolean;
}

export function DynamicGrid({ component, isPreview }: DynamicGridProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const {
    databaseConnection,
    columns = 3,
    itemsPerPage = 12,
    paginationType = 'numbered',
    gap = 'md',
    showSearch = false,
    showSort = false,
    emptyMessage = 'No items found.',
    responsiveColumns
  } = component.props;

  // Priority: tableId/tableProjectId (UUID) > tableName
  const tableProjectId = databaseConnection?.tableId || databaseConnection?.tableProjectId;
  const tableName = databaseConnection?.tableName;

  let responsiveConfig = { sm: 1, md: 2, lg: 3, xl: 4 };
  if (responsiveColumns) {
    try {
      responsiveConfig = JSON.parse(responsiveColumns);
    } catch (e) {
      console.warn('Invalid responsive columns config, using defaults');
    }
  }

  const gapClasses = {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8'
  };

  // Build responsive grid classes
  const gridClasses = cn(
    'grid',
    gapClasses[gap],
    `grid-cols-${responsiveConfig.sm}`,
    `md:grid-cols-${responsiveConfig.md}`,
    `lg:grid-cols-${responsiveConfig.lg}`,
    `xl:grid-cols-${responsiveConfig.xl}`
  );

  // Fetch data from database - prioritize tableProjectId (UUID) for reliable lookup
  useEffect(() => {
    if (!tableProjectId && !tableName) {
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        let records: any[] = [];
        let schemaFields: any[] = [];

        // Priority 1: Fetch by table project ID (most reliable)
        if (tableProjectId) {
          const tableProject = await tableService.getTableProject(tableProjectId);
          records = Array.isArray(tableProject.records) ? tableProject.records : [];
          schemaFields = Array.isArray(tableProject.schema?.fields) 
            ? tableProject.schema.fields 
            : [];
          
          // Cache schema for the editor binding UI
          component.props._cachedSchema = {
            tableName: tableProject.name,
            schema: tableProject.schema,
            fields: schemaFields,
          };
        } 
        // Fallback: Fetch by table name
        else if (tableName) {
          const { data: tableProjectRow, error: tableError } = await supabase
            .from('table_projects')
            .select('id')
            .eq('name', tableName)
            .limit(1)
            .maybeSingle();

          if (tableError) throw tableError;
          
          if (!tableProjectRow) {
            setError('Table not found');
            setLoading(false);
            return;
          }

          // Use tableService to get properly converted records (field IDs -> names)
          const tableProject = await tableService.getTableProject(tableProjectRow.id);
          records = Array.isArray(tableProject.records) ? tableProject.records : [];
          schemaFields = Array.isArray(tableProject.schema?.fields) 
            ? tableProject.schema.fields 
            : [];

          // Cache schema for the editor binding UI
          component.props._cachedSchema = {
            tableName: tableProject.name,
            schema: tableProject.schema,
            fields: schemaFields,
          };
        }

        // Apply search filter
        if (searchQuery && records.length > 0) {
          const searchableFields = Object.keys(records[0] || {}).filter(key => 
            typeof records[0][key] === 'string' || typeof records[0][key] === 'number'
          );
          
          records = records.filter((record: any) =>
            searchableFields.some(field =>
              String(record[field]).toLowerCase().includes(searchQuery.toLowerCase())
            )
          );
        }

        // Apply sorting
        if (sortField && records.length > 0) {
          records.sort((a: any, b: any) => {
            const aVal = a[sortField];
            const bVal = b[sortField];
            
            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
          });
        }

        setData(records);
      } catch (err: any) {
        console.error('DynamicGrid fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tableProjectId, tableName, searchQuery, sortField, sortOrder]);

  // Pagination logic
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  // In preview mode, only use real data; in design mode, fallback to simulated records if no real data
  const effectiveData = isPreview ? data : (data.length > 0 ? data : []);
  const currentData = effectiveData.slice(startIndex, endIndex);

  const handleLoadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Get available fields for sorting
  const availableFields = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0] || {}).filter(key => 
      typeof data[0][key] === 'string' || typeof data[0][key] === 'number'
    );
  }, [data]);

  const hasConnection = !!(tableProjectId || tableName);
  const hasTemplate = Array.isArray(component.children) && component.children.length > 0;
  
  // Simulated records for design mode ONLY (never in preview)
  const simulatedRecords = useMemo(() => {
    // Never use simulated data in preview mode
    if (isPreview) return [] as any[];
    if (!hasConnection || !hasTemplate || loading || data.length > 0) return [] as any[];
    
    const fields = (component.props?._cachedSchema?.fields || component.props?._cachedSchema?.schema || []) as any[];
    const fieldNames = Array.isArray(fields)
      ? fields.map((f: any) => (typeof f === 'string' ? f : (f.name || f.id || 'field')))
      : [];
    const count = Math.min(8, Math.max(4, itemsPerPage));
    return Array.from({ length: count }, (_, i) => {
      const base: any = { id: i + 1, index: i, _placeholder: true };
      fieldNames.slice(0, 6).forEach((name: string) => { base[name] = `${name} ${i + 1}`; });
      return base;
    });
  }, [hasConnection, hasTemplate, loading, data.length, component.props?._cachedSchema, itemsPerPage, isPreview]);

  if (!hasConnection) {
    return (
      <EnhancedDropZone
        id={`dynamic-grid-${component.id}`}
        accepts={['text', 'heading', 'button', 'image', 'card', 'container', 'row', 'column']}
        parentId={component.id}
        index={component.children?.length || 0}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center min-h-[200px]"
      >
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-gray-500 mb-4">Connect to a database table to display dynamic content</p>
          <p className="text-sm text-gray-400">Drop components here to create your grid item template</p>
          {component.children && component.children.length > 0 && (
            <div className="mt-4 w-full">
              <h4 className="text-sm font-medium mb-2">Template Preview:</h4>
              <div className="border rounded p-2 bg-gray-50">
                {component.children.map((child, childIndex) => (
                  <ComponentRenderer
                    key={child.id}
                    component={child}
                    isPreview={isPreview}
                    parentId={component.id}
                    index={childIndex}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </EnhancedDropZone>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Sort Controls */}
      {(showSearch || showSort) && (
        <div className="flex gap-4 items-center">
          {showSearch && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
          
          {showSort && availableFields.length > 0 && (
            <div className="flex gap-2">
              <Select value={sortField} onValueChange={setSortField}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No sorting</SelectItem>
                  {availableFields.map(field => (
                    <SelectItem key={field} value={field}>
                      {field}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {sortField && (
                <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Asc</SelectItem>
                    <SelectItem value="desc">Desc</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading...</span>
        </div>
      ) : error ? (
        <div className="text-red-500 text-center py-8">
          Error: {error}
        </div>
      ) : currentData.length === 0 && simulatedRecords.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className={gridClasses}>
          {/* Use real data if available, otherwise simulated records for design mode */}
          {(currentData.length > 0 ? currentData : simulatedRecords).map((record, index) => (
            <GridItem
              key={record.id || index}
              record={record}
              index={index}
              component={component}
              isPreview={isPreview}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && data.length > itemsPerPage && (
        <div className="flex justify-center mt-6">
          {paginationType === 'numbered' && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              ))}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {paginationType === 'loadMore' && currentPage * itemsPerPage < data.length && (
            <Button onClick={handleLoadMore} variant="outline">
              Load More
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function GridItem({ record, index, component, isPreview }: {
  record: any;
  index: number;
  component: AppComponent;
  isPreview: boolean;
}) {
  // If there are child components, render them with the record data as context
  if (component.children && component.children.length > 0) {
    const locked = !isPreview && index > 0;
    return (
      <div 
        className={cn("grid-item relative", locked && "")}
        data-record-index={index} 
        data-record-data={JSON.stringify(record)}
        data-component-type="dynamic-grid"
        data-component-id={component.id}
      >
        {/* Content */}
        <div className={cn(locked && "pointer-events-none")}>        
          {component.children.map((child, childIndex) => {
            // Normalize record so bindings can use either field IDs or field names.
            const raw = component.props?._cachedSchema?.fields
              ?? component.props?._cachedSchema?.schema
              ?? component.props?.databaseConnection?.schema;
            const schemaArray = Array.isArray(raw)
              ? raw
              : (Array.isArray((raw as any)?.fields) ? (raw as any).fields : []);

            const normalizedRecord: Record<string, any> = { ...record };
            for (const f of schemaArray as any[]) {
              const fieldId = f?.id;
              const fieldName = f?.name;
              if (!fieldName) continue;
              if (normalizedRecord[fieldName] === undefined && fieldId && record?.[fieldId] !== undefined) {
                normalizedRecord[fieldName] = record[fieldId];
              }
            }

            // In DESIGN mode, create placeholder data that shows variable names like {{name}}
            // In PREVIEW mode, use actual data values
            const contextData = isPreview 
              ? normalizedRecord 
              : Object.fromEntries(
                  Object.keys(normalizedRecord).map(key => [key, `{{${key}}}`])
                );

            // Clone child component with data binding context
            const childWithDataContext = {
              ...child,
              props: {
                ...child.props,
                _dataContext: contextData,
                _recordIndex: index,
                _parentConnection: {
                  tableName: component.props?.databaseConnection?.tableName || 'Connected Table',
                  schema: schemaArray,
                  fields: schemaArray,
                  _cachedSchema: component.props?._cachedSchema,
                },
              },
            };
            
            return (
              <ComponentRenderer
                key={child.id}
                component={childWithDataContext}
                isPreview={isPreview}
                parentId={component.id}
                index={childIndex}
              />
            );
          })}
        </div>
        {locked && (
          <div className="absolute inset-0 rounded-md border border-dashed border-border/60 bg-background/60 flex items-center justify-center">
            <span className="text-xs text-muted-foreground">Repeated item (locked)</span>
          </div>
        )}
      </div>
    );
  }

  // Default item template if no children - allow dropping components in design mode
  if (!isPreview) {
    return (
      <EnhancedDropZone
        id={`grid-item-${component.id}-${index}`}
        accepts={['text', 'heading', 'button', 'image', 'card', 'container', 'row', 'column']}
        parentId={component.id}
        index={component.children?.length || 0}
        className="p-4 border rounded-lg border-dashed border-gray-300 min-h-[100px]"
      >
        <div className="text-center">
          <p className="text-sm text-gray-500">Drop components here to create your grid item template</p>
          <p className="text-xs text-gray-400 mt-1">This will be repeated for each data record</p>
        </div>
      </EnhancedDropZone>
    );
  }

  // Default fallback for preview mode
  return (
    <div className="p-4 border rounded-lg">
      <pre className="text-sm text-muted-foreground">
        {JSON.stringify(record, null, 2)}
      </pre>
    </div>
  );
}