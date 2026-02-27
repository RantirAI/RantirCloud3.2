import { useState, useEffect, useMemo } from 'react';
import { Loader2, Repeat, ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { AppComponent } from '@/types/appBuilder';
import { ComponentRenderer } from './ComponentRenderer';
import { tableService } from '@/services/tableService';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { EnhancedDropZone } from './EnhancedDropZone';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUserComponentStore } from '@/stores/userComponentStore';

interface DynamicSectionProps {
  component: AppComponent;
  isPreview: boolean;
  parentId?: string;
  index?: number;
  commonProps: any;
  containerStyles: React.CSSProperties;
  innerLayoutStyles: React.CSSProperties;
  getAcceptedTypes: (type: string) => string[];
  renderDragHandle: () => React.ReactNode;
  getEffectsStyles: (props: any) => React.CSSProperties;
  getNewBorderStyles: (props: any) => React.CSSProperties;
}

export function DynamicSection({
  component,
  isPreview,
  parentId,
  index,
  commonProps,
  containerStyles,
  innerLayoutStyles,
  getAcceptedTypes,
  renderDragHandle,
  getEffectsStyles,
  getNewBorderStyles,
}: DynamicSectionProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [schemaFields, setSchemaFields] = useState<any[]>([]);

  const { databaseConnection, isDynamic, pagination, emptyState } = component.props || {};
  const { components: userComponents } = useUserComponentStore();
  
  // Priority: tableId/tableProjectId (UUID) > tableName
  const tableProjectId = databaseConnection?.tableId || databaseConnection?.tableProjectId;
  const tableName = databaseConnection?.tableName;

  // Resolve schema from either the connection (preferred) or the cached schema populated after fetch.
  const rawSchema =
    databaseConnection?.schema ??
    (component.props as any)?._cachedSchema?.schema ??
    (component.props as any)?._cachedSchema?.fields;

  // Ensure schema is always an array - it might be an object with fields property
  const resolvedFromProps = Array.isArray(rawSchema)
    ? rawSchema
    : (Array.isArray((rawSchema as any)?.fields) ? (rawSchema as any).fields : []);

  // Prefer schema extracted from the fetched table (kept in state), fallback to whatever is on props.
  const schema = schemaFields.length > 0 ? schemaFields : resolvedFromProps;

  const itemsPerPage = pagination?.enabled ? (pagination?.itemsPerPage || 10) : 0;

  // Fetch data from database - prioritize tableProjectId (UUID) for reliable lookup
  useEffect(() => {
    if (!isDynamic || (!tableProjectId && !tableName)) {
      setData([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        let records: any[] = [];
        let nextSchemaFields: any[] = [];

        // Priority 1: Fetch by table project ID (most reliable)
        if (tableProjectId) {
          const tableProject = await tableService.getTableProject(tableProjectId);
          records = Array.isArray(tableProject.records) ? tableProject.records : [];
          nextSchemaFields = Array.isArray(tableProject.schema?.fields) 
            ? tableProject.schema.fields 
            : [];
          
          // Cache schema for the editor binding UI
          if (!component.props._cachedSchema) {
            component.props._cachedSchema = {
              tableName: tableProject.name,
              schema: tableProject.schema,
              fields: nextSchemaFields,
            };
          }
        } 
        // Fallback: Fetch by table name
        else if (tableName) {
          const { data: tableProject, error: tableError } = await supabase
            .from('table_projects')
            .select('id, records, schema, name')
            .eq('name', tableName)
            .limit(1)
            .maybeSingle();

          if (tableError) throw tableError;
          
          if (!tableProject) {
            setError('Table not found');
            setLoading(false);
            return;
          }

          // Use tableService to get properly converted records (field IDs -> names)
          const fullProject = await tableService.getTableProject(tableProject.id);
          records = Array.isArray(fullProject.records) ? fullProject.records : [];
          nextSchemaFields = Array.isArray(fullProject.schema?.fields) 
            ? fullProject.schema.fields 
            : [];

          // Cache schema for the editor binding UI
          if (!component.props._cachedSchema) {
            component.props._cachedSchema = {
              tableName: fullProject.name,
              schema: fullProject.schema,
              fields: nextSchemaFields,
            };
          }
        }

        setData(records);
        setSchemaFields(nextSchemaFields);
      } catch (err: any) {
        console.error('DynamicSection fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isDynamic, tableProjectId, tableName]);

  // Reset page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length, itemsPerPage]);

  // Determine what to render
  const hasChildren = Array.isArray(component.children) && component.children.length > 0;
  
  // Calculate paginated data
  const displayData = useMemo(() => {
    if (!isDynamic || data.length === 0) return [];
    
    // In preview with pagination
    if (isPreview && itemsPerPage > 0) {
      const start = (currentPage - 1) * itemsPerPage;
      return data.slice(start, start + itemsPerPage);
    }
    
    // In preview without pagination - show all
    if (isPreview) return data;
    
    // In design mode - show all items
    return data;
  }, [isDynamic, data, isPreview, itemsPerPage, currentPage]);

  const totalPages = itemsPerPage > 0 ? Math.ceil(data.length / itemsPerPage) : 1;

  // Create simulated data for design mode ONLY (never in preview)
  const simulatedData = useMemo(() => {
    // Never use simulated data in preview mode
    if (isPreview) return [];
    if (!isDynamic || !hasChildren || loading || data.length > 0) return [];
    
    const fieldNames = schema.map((f: any) => f.name || f.id || 'field');
    return Array.from({ length: 3 }, (_, i) => {
      const record: Record<string, any> = { id: i + 1, _placeholder: true };
      fieldNames.slice(0, 6).forEach((name: string) => {
        record[name] = `${name} ${i + 1}`;
      });
      return record;
    });
  }, [isDynamic, hasChildren, loading, data.length, schema, isPreview]);

  // In preview mode, only show real data; in design mode, fallback to simulated
  const effectiveData = isPreview ? displayData : (displayData.length > 0 ? displayData : simulatedData);

  // Use section or div based on component type
  const ContainerElement = component.type === 'section' ? 'section' : 'div';

  // Outer container styles - everything except flex/grid layout
  const outerStyles = { ...commonProps.style };
  delete outerStyles.display;
  delete outerStyles.flexDirection;
  delete outerStyles.justifyContent;
  delete outerStyles.alignItems;
  delete outerStyles.gap;
  delete outerStyles.gridTemplateColumns;
  delete outerStyles.gridTemplateRows;
  delete outerStyles.gridAutoFlow;

  // Helper to render children with data context
  const renderChildrenWithContext = (record: any, recordIndex: number) => {
    if (!hasChildren) return null;

    // Normalize record so bindings can use either field IDs or field names.
    // (Our stored records often use field UUIDs as keys, while bindings use names like {{name}}.)
    const normalizedRecord: Record<string, any> = { ...record };
    for (const f of schema as any[]) {
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

    return component.children!.map((child: AppComponent, childIndex: number) => {
      // Clone child component with data binding context
      const childWithDataContext: AppComponent = {
        ...child,
        props: {
          ...child.props,
          _dataContext: contextData,
          _recordIndex: recordIndex,
          _parentConnection: {
            tableName: tableName || 'Connected Table',
            schema,
            fields: schema,
            _cachedSchema: component.props._cachedSchema,
          },
        },
      };

      return (
        <ComponentRenderer
          key={`${child.id}-${recordIndex}`}
          component={childWithDataContext}
          isPreview={isPreview}
          parentId={component.id}
          index={childIndex}
        />
      );
    });
  };

  // Render custom empty state based on configuration
  const renderEmptyState = () => {
    const config = emptyState || { type: 'default' };
    const message = config.customMessage || 'No records found in this table.';

    // Component-based empty state
    if (config.type === 'component' && config.componentId) {
      const userComponent = userComponents.find(c => c.id === config.componentId);
      if (userComponent && userComponent.definition) {
        return (
          <div className="w-full">
            <ComponentRenderer
              component={userComponent.definition}
              isPreview={isPreview}
              parentId={component.id}
              index={0}
            />
            {config.customMessage && (
              <p className="text-sm text-muted-foreground mt-2">{config.customMessage}</p>
            )}
          </div>
        );
      }
    }

    // Asset-based empty state
    if (config.type === 'asset' && config.assetUrl) {
      return (
        <div className="flex flex-col items-center gap-3">
          <img
            src={config.assetUrl}
            alt={config.assetAlt || 'No data'}
            className="max-w-[200px] max-h-[200px] object-contain"
          />
          <span className="text-sm text-muted-foreground">{message}</span>
        </div>
      );
    }

    // Default empty state
    return (
      <div className="flex flex-col items-center gap-2">
        <ImageOff className="h-8 w-8 text-muted-foreground/50" />
        <span className="text-sm text-muted-foreground">{message}</span>
      </div>
    );
  };

  return (
    <ContainerElement
      {...commonProps}
      style={{
        ...outerStyles,
        ...containerStyles,
        ...getEffectsStyles(component.props),
        ...getNewBorderStyles(component.props),
      }}
      data-component-id={component.id}
      data-dynamic-section={isDynamic ? 'true' : undefined}
    >
      {/* Drag handle for non-preview mode */}
      {!isPreview && renderDragHandle()}

      {/* Dynamic badge indicator */}
      {!isPreview && isDynamic && (
        <div className="absolute top-0 right-0 z-10">
          <Badge 
            variant="secondary" 
            className="rounded-bl-md rounded-tr-none text-[10px] h-5 gap-1 bg-primary/10 text-primary border-0"
          >
            <Repeat className="h-3 w-3" />
            {tableName} ({data.length})
          </Badge>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Loading data...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-sm text-red-500 p-4 text-center">
          Error: {error}
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Design mode - Preview empty state when toggle is enabled (overrides everything) */}
          {isDynamic && !isPreview && emptyState?.previewInCanvas ? (
            <div className="flex flex-col items-center justify-center py-8 text-center w-full relative">
              <Badge variant="outline" className="absolute top-2 right-2 text-[10px] bg-primary/10 text-primary border-primary/20">
                Empty State Preview
              </Badge>
              {renderEmptyState()}
            </div>
          ) : isDynamic && effectiveData.length > 0 ? (
            // Render repeated content for each record
            <div className="w-full flex flex-col">
              <div style={innerLayoutStyles} className="w-full">
                {effectiveData.map((record, recordIndex) => (
                  <div 
                    key={record.id || recordIndex} 
                    className={cn(
                      "dynamic-section-item w-full relative",
                      !isPreview && recordIndex > 0 && "opacity-60 pointer-events-none"
                    )}
                    data-record-index={recordIndex}
                  >
                    {renderChildrenWithContext(record, recordIndex)}
                  </div>
                ))}
              </div>
              
              {/* Pagination controls in preview */}
              {isPreview && itemsPerPage > 0 && totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 py-3 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-7 px-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-7 px-2"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : isDynamic && isPreview && data.length === 0 ? (
            // Preview mode with no records - show custom empty state
            <div className="flex flex-col items-center justify-center py-8 text-center w-full">
              {renderEmptyState()}
            </div>
          ) : (
            // Regular section rendering (not dynamic or design mode with no data)
            <EnhancedDropZone
              id={`drop-${component.id}`}
              accepts={getAcceptedTypes(component.type)}
              parentId={component.id}
              index={component.children?.length || 0}
              style={innerLayoutStyles}
              className={cn(
                !isPreview && !component.children?.length
                  ? 'min-h-[100px]'
                  : 'min-h-[60px]'
              )}
            >
              {Array.isArray(component.children) ? component.children.map((child: AppComponent, idx: number) => (
                <ComponentRenderer
                  key={child.id}
                  component={child}
                  isPreview={isPreview}
                  parentId={component.id}
                  index={idx}
                />
              )) : null}
            </EnhancedDropZone>
          )}
        </>
      )}
    </ContainerElement>
  );
}
