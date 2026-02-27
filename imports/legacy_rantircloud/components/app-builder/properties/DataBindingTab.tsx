import React, { useState } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, Table, Columns, Search, Filter, ArrowUpDown, Plus, Trash2, Zap, BarChart3, Settings } from 'lucide-react';
import { DatabaseBindingField } from './DatabaseBindingField';
import { VariableBindingField } from './VariableBindingField';
import { getCategorizedProperties } from '@/lib/componentPropertyConfig';
import { AdvancedPropertyFieldRenderer } from './AdvancedPropertyFieldRenderer';
import { ChartSetupModal } from '../ChartSetupModal';

interface DataBindingTabProps {
  component: any;
}

interface TableColumn {
  id: string;
  header: string;
  field: string;
  width?: string;
  visible: boolean;
}

export function DataBindingTab({ component }: DataBindingTabProps) {
  const { selectedComponent, updateComponent } = useAppBuilderStore();
  const [showChartWizard, setShowChartWizard] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [columns, setColumns] = useState<TableColumn[]>(component.props?.tableColumns || []);

  // Initialize dataSource with default filters structure if missing
  if (!component.dataSource?.filters) {
    component.dataSource = {
      ...component.dataSource,
      filters: []
    };
  }

  const categorizedProperties = getCategorizedProperties(component.type);
  const dataProperties = categorizedProperties.data || [];

  const handlePropertyChange = (propertyName: string, value: any) => {
    updateComponent(selectedComponent!, {
      props: {
        ...component.props,
        [propertyName]: value
      }
    });
  };

  const handleDatabaseConnection = (tableData: any) => {
    setSelectedTable(tableData);
    updateComponent(selectedComponent!, {
      props: {
        ...component.props,
        dataSource: {
          type: 'database',
          table: tableData
        }
      }
    });
  };

  const handleAutoBindColumns = () => {
    if (!component.props?.dataSource?.table?.fields) return;

    const autoColumns: TableColumn[] = component.props.dataSource.table.fields.map((field: any) => ({
      id: `col-${field.name}`,
      header: field.name.charAt(0).toUpperCase() + field.name.slice(1).replace(/([A-Z])/g, ' $1'),
      field: field.name,
      width: 'auto',
      visible: true
    }));

    setColumns(autoColumns);
    updateComponent(selectedComponent!, {
      props: {
        ...component.props,
        tableColumns: autoColumns
      }
    });
  };

  const handleAddColumn = () => {
    const newColumn: TableColumn = {
      id: `col-${Date.now()}`,
      header: 'New Column',
      field: '',
      width: 'auto',
      visible: true
    };

    const updatedColumns = [...columns, newColumn];
    setColumns(updatedColumns);
    updateComponent(selectedComponent!, {
      props: {
        ...component.props,
        tableColumns: updatedColumns
      }
    });
  };

  const handleUpdateColumn = (columnId: string, updates: Partial<TableColumn>) => {
    const updatedColumns = columns.map(col =>
      col.id === columnId ? { ...col, ...updates } : col
    );
    setColumns(updatedColumns);
    updateComponent(selectedComponent!, {
      props: {
        ...component.props,
        tableColumns: updatedColumns
      }
    });
  };

  const handleRemoveColumn = (columnId: string) => {
    const updatedColumns = columns.filter(col => col.id !== columnId);
    setColumns(updatedColumns);
    updateComponent(selectedComponent!, {
      props: {
        ...component.props,
        tableColumns: updatedColumns
      }
    });
  };

  const renderDataSourceSection = () => {
    return (
      <div className="space-y-3">
        <DatabaseBindingField
          label="Database Table"
          value={component.props?.dataSource?.table}
          onChange={handleDatabaseConnection}
          description="Select a table to display data from"
        />
      </div>
    );
  };

  const renderTableColumnsConfiguration = () => {
    if (!['data-table', 'datatable'].includes(component.type)) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b">
          <div className="flex items-center gap-2">
            <Columns className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-sm">Table Columns</h3>
          </div>
          <div className="flex gap-1">
            {component.props?.dataSource?.table && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleAutoBindColumns}
                className="h-7 px-2 text-xs"
              >
                <Zap className="h-3 w-3 mr-1" />
                Auto-Bind
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleAddColumn}
              className="h-7 px-2 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {columns.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground border rounded-lg bg-muted/20">
            <Columns className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-xs">
              {component.props?.dataSource?.table 
                ? "Click 'Auto-Bind' to create columns"
                : "Connect a table first"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {columns.map((column) => (
              <div key={column.id} className="p-3 border rounded-lg bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <Input
                    value={column.header}
                    onChange={(e) => handleUpdateColumn(column.id, { header: e.target.value })}
                    placeholder="Column Header"
                    className="h-7 text-xs flex-1 mr-2"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveColumn(column.id)}
                    className="h-7 w-7 p-0 text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Select
                    value={column.field}
                    onValueChange={(value) => handleUpdateColumn(column.id, { field: value })}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      {component.props?.dataSource?.table?.fields?.map((field: any) => (
                        <SelectItem key={field.name} value={field.name}>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              {field.type}
                            </Badge>
                            {field.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={column.visible}
                      onChange={(e) => handleUpdateColumn(column.id, { visible: e.target.checked })}
                      className="w-3 h-3"
                    />
                    <Label className="text-xs">Visible</Label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderDataDisplayOptions = () => {
    if (!component.props?.dataSource?.table) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-sm">Display Options</h3>
        </div>
        
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-medium mb-1 block">Data Filters</Label>
            <VariableBindingField
              label=""
              value={component.props?.dataFilters || ''}
              onChange={(value) => handlePropertyChange('dataFilters', value)}
              placeholder="e.g., status = 'active'"
            />
          </div>

          <div>
            <Label className="text-xs font-medium mb-1 block">Sort Options</Label>
            <VariableBindingField
              label=""
              value={component.props?.sortBy || ''}
              onChange={(value) => handlePropertyChange('sortBy', value)}
              placeholder="e.g., created_at DESC"
            />
          </div>

          {['data-table', 'datatable'].includes(component.type) && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-medium mb-1 block">Items per Page</Label>
                <Input
                  type="number"
                  value={component.props?.itemsPerPage || '10'}
                  onChange={(e) => handlePropertyChange('itemsPerPage', e.target.value)}
                  min="1"
                  max="100"
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block">Enable Search</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="checkbox"
                    checked={component.props?.enableSearch || false}
                    onChange={(e) => handlePropertyChange('enableSearch', e.target.checked)}
                    className="w-3 h-3"
                  />
                  <Search className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Search</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderVariableBindings = () => {
    return (
      <div className="border rounded-lg bg-card">
        <div className="p-2 border-b">
          <div className="flex items-center gap-2">
            <Zap className="h-3 w-3 text-primary" />
            <h4 className="text-[12px] font-medium">Variable Bindings</h4>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Bind component properties to dynamic variables</p>
        </div>
        <div className="p-2 space-y-3">
          {dataProperties.length > 0 ? (
            dataProperties.map((property) => (
              <AdvancedPropertyFieldRenderer
                key={property.name}
                field={property}
                value={component.props?.[property.name]}
                onChange={(value) => handlePropertyChange(property.name, value)}
                component={{
                  ...component,
                  props: {
                    ...component.props,
                    _parentConnection: component.props?.dataSource?.table ? {
                      tableName: component.props.dataSource.table.tableName || component.props.dataSource.table.name,
                      fields: component.props.dataSource.table.fields || [],
                      schema: component.props.dataSource.table.fields || [],
                    } : null
                  }
                }}
              />
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Zap className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No data binding properties available</p>
              <p className="text-xs">Connect a table above to enable field binding</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full max-h-[calc(100vh-16rem)] overflow-y-auto">
      <div className="p-2 space-y-3">
        {/* Data Source Section */}
        <div className="border rounded-lg bg-card">
          <div className="p-2 border-b">
            <div className="flex items-center gap-2">
              <Database className="h-3 w-3 text-primary" />
              <h4 className="text-[12px] font-medium">Data Source</h4>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Connect and configure data sources</p>
          </div>
          <div className="p-2">
            {renderDataSourceSection()}
          </div>
        </div>

        {/* Table Columns Configuration */}
        {renderTableColumnsConfiguration()}

        {/* Data Display Options */}
        {renderDataDisplayOptions()}

        {/* Chart Setup Wizard */}
        {component.type === 'chart' && (
          <div className="p-3 border-b">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-3 w-3 text-primary" />
                </div>
                <span className="font-medium text-xs">Chart Setup</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">Use the guided setup for better chart configuration</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowChartWizard(true);
              }}
              className="w-full h-7 text-xs"
            >
              <Settings className="h-3 w-3 mr-1" />
              Open Chart Wizard
            </Button>
          </div>
        )}

        {/* Variable Bindings section - always show for charts */}
        {(component.type === 'chart' || !['data-table', 'datatable'].includes(component.type)) && renderVariableBindings()}
      </div>

      {/* Chart Setup Modal */}
      {showChartWizard && (
        <ChartSetupModal
          component={component}
          isOpen={showChartWizard}
          onClose={() => setShowChartWizard(false)}
        />
      )}
    </div>
  );
}