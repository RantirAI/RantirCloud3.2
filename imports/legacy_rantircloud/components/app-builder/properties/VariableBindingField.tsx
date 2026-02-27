import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/compact/Input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Variable, Database, Settings, Zap, Layers, ChevronRight } from 'lucide-react';
import { useVariableResolver } from '@/hooks/useVariableResolver';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { DataProcessingService } from '@/services/dataProcessingService';
import { Textarea } from '@/components/ui/compact/Textarea';
import { CombineTextBuilder } from '../CombineTextBuilder';

type BindingMode = 'select' | 'fields' | 'combine';

interface VariableBindingFieldProps {
  label: string;
  value: any;
  onChange: (value: any) => void;
  placeholder?: string;
  type?: 'text' | 'number' | 'color' | 'url';
  allowExpression?: boolean;
  parentConnection?: any; // Added to receive parent connection data
  component?: any; // Added to access component context
  richText?: boolean; // Add option to use rich text editor for content
}

export function VariableBindingField({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  type = 'text',
  allowExpression = false,
  parentConnection,
  component,
  richText = false
}: VariableBindingFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [bindingMode, setBindingMode] = useState<BindingMode>('select');
  const [showCombineBuilder, setShowCombineBuilder] = useState(false);
  const [appVariables, setAppVariables] = useState<any[]>([]);
  const { resolveVariable, isVariableBinding, getVariableDisplayName, flowVariables } = useVariableResolver();
  const { currentProject, currentPage, selectedComponent } = useAppBuilderStore();
  
  const isVariable = isVariableBinding(value);
  const resolvedValue = isVariable ? resolveVariable(value) : value;

  // Load app variables when component mounts
  React.useEffect(() => {
    if (currentProject?.id) {
      DataProcessingService.getAppVariables(currentProject.id)
        .then(setAppVariables)
        .catch(console.error);
    }
  }, [currentProject?.id]);

  // Memoized: Get available data fields from parent dynamic list/grid components  
  const availableDataFields = useMemo(() => {
    // Helper function to make a connection object from component props
    const makeConnection = (comp: any) => {
      const dataSource = comp.props?.dataSource;
      const databaseConnection = comp.props?.databaseConnection;
      const cachedSchema = comp.props?._cachedSchema;
      
      let tableName = 'Connected Table';
      let fields: any[] = [];
      
      if (dataSource?.table) {
        tableName = dataSource.table.tableName || dataSource.table.name || tableName;
        fields = dataSource.table.fields || dataSource.table.schema || [];
      } else if (databaseConnection) {
        tableName = databaseConnection.tableName || databaseConnection.name || tableName;
        fields = databaseConnection.schema || databaseConnection.fields || [];
      } else if (cachedSchema) {
        tableName = cachedSchema.tableName || cachedSchema.name || tableName;
        fields = cachedSchema.schema || cachedSchema.fields || [];
      }

      return { tableName, schema: fields, fields, _cachedSchema: cachedSchema, dataSource };
    };

    // Compute parent connection
    const computeParentConnection = () => {
      try {
        if (!currentProject || !currentPage || !selectedComponent) return null;
        const page = currentProject.pages?.find((p: any) => p.id === currentPage);
        if (!page) return null;

        // Walk down the tree and propagate connection up when found
        const walk = (comp: any): { found: boolean; connection: any | null } => {
          if (!comp) return { found: false, connection: null };
          if (comp.id === selectedComponent) return { found: true, connection: null };
          if (!Array.isArray(comp.children)) return { found: false, connection: null };
          
          for (const child of comp.children) {
            const res = walk(child);
            if (res.found) {
              // If child already has a connection from deeper in the tree, propagate it up
              if (res.connection) {
                return res;
              }
              
              // Check if THIS component is a dynamic parent
              const isDynamicComponent = ['dynamic-list', 'pro-dynamic-list', 'dynamic-grid', 'list', 'grid', 'section'].includes(comp.type);
              const isDynamicSection = comp.props?.isDynamic === true;
              const hasDataConnection = comp.props?.dataSource?.table || comp.props?.databaseConnection || comp.props?._cachedSchema;
              
              // For dynamic-list/grid types, just need hasDataConnection
              // For section, need isDynamic flag AND connection
              const shouldMakeConnection = (isDynamicComponent && comp.type !== 'section' && hasDataConnection) ||
                                           (isDynamicSection && hasDataConnection);
              
              if (shouldMakeConnection) {
                return { found: true, connection: makeConnection(comp) };
              }
              
              // Continue propagating up without connection - parent might be dynamic
              return { found: true, connection: null };
            }
          }
          return { found: false, connection: null };
        };

        for (const root of (page.components || [])) {
          const res = walk(root);
          if (res.found && res.connection) return res.connection;
        }
        return null;
      } catch (error) {
        console.error('Error computing parent connection:', error);
        return null;
      }
    };

    const effectiveParentConnection =
      parentConnection ||
      computeParentConnection() ||
      component?.props?.dataSource ||
      component?._parentConnection ||
      component?.props?._parentConnection ||
      (typeof window !== 'undefined' && (window as any).__currentDataContext
        ? {
            tableName: (window as any).__currentDataContext.tableName,
            schema: (window as any).__currentDataContext.fields,
          }
        : null);

    const fields: { name: string; type: string; source: string; description: string }[] = [];

    if (!effectiveParentConnection) return fields;

    const tableName =
      (effectiveParentConnection as any).tableName ||
      (effectiveParentConnection as any).table ||
      (effectiveParentConnection as any).name ||
      'Connected Table';

    const tableSchema =
      (effectiveParentConnection as any).schema ||
      (effectiveParentConnection as any).fields ||
      (effectiveParentConnection as any).table_schema ||
      (effectiveParentConnection as any)._cachedSchema?.schema ||
      (effectiveParentConnection as any)._cachedSchema?.fields ||
      (effectiveParentConnection as any)._cachedSchema ||
      [];

    let processedSchema: any[] = [];
    if (Array.isArray(tableSchema)) {
      processedSchema = tableSchema;
    } else if (tableSchema && typeof tableSchema === 'object') {
      if ((tableSchema as any).fields && Array.isArray((tableSchema as any).fields)) {
        processedSchema = (tableSchema as any).fields;
      } else if ((tableSchema as any).schema && Array.isArray((tableSchema as any).schema)) {
        processedSchema = (tableSchema as any).schema;
      }
    }

    if (Array.isArray(processedSchema) && processedSchema.length > 0) {
      processedSchema.forEach((field: any) => {
        const fieldName = field.name || field.field_name || field.column_name;
        const fieldType = field.type || field.field_type || field.data_type || 'string';

        if (fieldName && fieldName !== 'id') {
          fields.push({
            name: fieldName,
            type: fieldType,
            source: 'Table',
            description: `${fieldName} from ${tableName}`,
          });
        }
      });
    }

    return fields;
  }, [currentProject, currentPage, selectedComponent, parentConnection, component]);

  const isInDynamicContext = availableDataFields.length > 0;

  const environmentVariables = [
    { name: 'API_KEY', type: 'string', source: 'Environment', description: 'API Key' },
    { name: 'BASE_URL', type: 'string', source: 'Environment', description: 'Base URL' },
  ];

  const handleVariableSelect = (variableName: string) => {
    onChange(`{{${variableName}}}`);
    setIsOpen(false);
    setBindingMode('select');
  };

  const handleCombineApply = (binding: string) => {
    onChange(binding);
    setShowCombineBuilder(false);
    setIsOpen(false);
    setBindingMode('select');
  };

  const handlePopoverClose = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setBindingMode('select');
    }
  };

  // Convert available fields to the format expected by CombineTextBuilder - memoized
  const combineBuilderFields = useMemo(() => 
    availableDataFields.map((field, index) => ({
      id: `field_${index}`,
      name: field.name,
      type: field.type,
      description: field.description,
    })),
    [availableDataFields]
  );

  const getVariableIcon = (source: string) => {
    switch (source) {
      case 'Database':
        return <Database className="h-3 w-3" />;
      case 'Environment':
        return <Settings className="h-3 w-3" />;
      case 'Flow':
        return <Zap className="h-3 w-3" />;
      default:
        return <Variable className="h-3 w-3" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string':
        return 'bg-green-100 text-green-800';
      case 'number':
        return 'bg-blue-100 text-blue-800';
      case 'boolean':
        return 'bg-purple-100 text-purple-800';
      case 'object':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Determine if we should use multiline textarea for content fields
  const shouldUseTextarea = richText || (label.toLowerCase().includes('content') && type === 'text');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        
        {/* Binding button next to label */}
        <Popover open={isOpen} onOpenChange={handlePopoverClose}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 gap-1.5",
                isVariable && "text-primary"
              )}
            >
              <Variable className="h-3.5 w-3.5" />
              {isVariable && <span className="text-xs">Bound</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="p-4">
              {/* Mode Selection */}
              {bindingMode === 'select' && (
                <>
                  <h4 className="font-medium text-sm mb-3">Bind to Variable</h4>
                  <div className="space-y-2">
                    {/* Bind Field Option */}
                    <button
                      onClick={() => setBindingMode('fields')}
                      className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors border flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Database className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <span className="font-medium text-sm block">Bind Field</span>
                          <span className="text-xs text-muted-foreground">Select a single data field</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </button>

                    {/* Combine Text Option */}
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        setShowCombineBuilder(true);
                      }}
                      className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors border flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <Layers className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <span className="font-medium text-sm block">Combine Text</span>
                          <span className="text-xs text-muted-foreground">Mix fields, text & formatting</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </button>
                  </div>
                </>
              )}

              {/* Fields List Mode */}
              {bindingMode === 'fields' && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setBindingMode('select')}
                      className="h-6 px-2"
                    >
                      ← Back
                    </Button>
                    <h4 className="font-medium text-sm">Select Field</h4>
                  </div>
                  
                  <ScrollArea className="h-64">
                    <div className="space-y-4">
                      {/* Show computed app variables */}
                      {appVariables.length > 0 && (
                        <div>
                          <h5 className="text-xs font-medium text-purple-600 mb-2 flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            App Variables
                          </h5>
                          <div className="space-y-1">
                            {appVariables.map((variable) => (
                              <button
                                key={variable.id}
                                onClick={() => handleVariableSelect(`app.${variable.name}`)}
                                className="w-full text-left p-2 rounded-md hover:bg-purple-50 transition-colors border border-purple-100"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Zap className="h-3 w-3" />
                                    <span className="text-sm font-medium text-purple-700">{variable.name}</span>
                                  </div>
                                  <Badge className="text-xs bg-purple-100 text-purple-800">
                                    {variable.variable_type}
                                  </Badge>
                                </div>
                                {variable.description && (
                                  <p className="text-xs text-purple-600 mt-1">{variable.description}</p>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Show table fields when available */}
                      {isInDynamicContext ? (
                        <div>
                          <h5 className="text-xs font-medium text-blue-600 mb-2 flex items-center gap-1">
                            <Database className="h-3 w-3" />
                            List Item Fields
                          </h5>
                          <div className="space-y-1">
                            {availableDataFields.map((variable) => (
                              <button
                                key={variable.name}
                                onClick={() => handleVariableSelect(variable.name)}
                                className="w-full text-left p-2 rounded-md hover:bg-blue-50 transition-colors border border-blue-100"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {getVariableIcon(variable.source)}
                                    <span className="text-sm font-medium text-blue-700">{variable.name}</span>
                                  </div>
                                  <Badge className={cn("text-xs", getTypeColor(variable.type))}>
                                    {variable.type}
                                  </Badge>
                                </div>
                                {variable.description && (
                                  <p className="text-xs text-blue-600 mt-1">{variable.description}</p>
                                )}
                              </button>
                            ))}
                          </div>
                          <div className="mt-2 p-2 bg-blue-50 rounded border text-xs text-blue-700">
                            💡 These fields come from your Dynamic List/Grid context
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No data binding available</p>
                          <p className="text-xs">
                            Add this component to a Dynamic List or Dynamic Grid with a connected database to bind data fields
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Full-width input below the label row */}
      <div className="w-full relative">
        {shouldUseTextarea && !isVariable ? (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="w-full resize-y"
          />
        ) : (
          <>
            <Input
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              type={isVariable ? 'text' : type}
              className={cn(
                "w-full",
                isVariable && "border-primary bg-primary/5 pr-8"
              )}
            />
            
            {isVariable && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <Variable className="h-4 w-4 text-primary" />
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Show resolved value preview */}
      {isVariable && resolvedValue !== undefined && (
        <div className="text-xs text-muted-foreground bg-muted p-2 rounded border">
          <span className="font-medium">Preview:</span> {String(resolvedValue)}
        </div>
      )}

      {/* Combine Text Builder Dialog */}
      <CombineTextBuilder
        open={showCombineBuilder}
        onOpenChange={setShowCombineBuilder}
        onApply={handleCombineApply}
        fields={combineBuilderFields}
        currentBinding={typeof value === 'string' ? value : ''}
        tableName="Connected Table"
      />
    </div>
  );
}