import { useState, useEffect } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Database, Table, Link, Unlink, Settings, Filter } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { tableService } from '@/services/tableService';
import { DataFieldMapper, FieldMapping } from './DataFieldMapper';
import { DataFilterBuilder, FilterGroup } from './DataFilterBuilder';

interface DataConnectionConfiguratorProps {
  component: any;
  onDataSourceChange: (dataSource: any) => void;
}

export function DataConnectionConfigurator({ component, onDataSourceChange }: DataConnectionConfiguratorProps) {
  const { selectedDatabaseId, selectedDatabaseName, updateComponent } = useAppBuilderStore();
  const { user } = useAuth();
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const currentDataSource = component.dataSource;

  // Check if component supports data connections
  const supportsDataConnection = [
    'table', 'datatable', 'form', 'list', 'card', 'select'
  ].includes(component.type);

  useEffect(() => {
    if (selectedDatabaseId && supportsDataConnection) {
      loadTables();
    }
  }, [selectedDatabaseId, supportsDataConnection]);

  const loadTables = async () => {
    if (!user || !selectedDatabaseId) {
      console.log('Cannot load tables: missing user or selectedDatabaseId', { user: !!user, selectedDatabaseId });
      return;
    }
    
    setLoading(true);
    try {
      console.log('Loading tables for database:', selectedDatabaseId);
      const data = await tableService.getTablesByDatabase(selectedDatabaseId);
      console.log('Tables loaded:', data);
      setTables(data || []);
    } catch (error) {
      console.error('Failed to load tables:', error);
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectTable = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    const dataSource = {
      type: 'table' as const,
      tableProjectId: table.id,
      tableName: table.name,
      schema: table.schema,
      realTime: true,
      pagination: {
        page: 1,
        pageSize: 10
      },
      filters: [],
      sorting: []
    };

    onDataSourceChange(dataSource);
  };

  const handleDisconnectTable = () => {
    onDataSourceChange(null);
  };

  const handleRealTimeToggle = (enabled: boolean) => {
    onDataSourceChange({
      ...currentDataSource,
      realTime: enabled
    });
  };

  const handlePageSizeChange = (pageSize: number) => {
    onDataSourceChange({
      ...currentDataSource,
      pagination: {
        ...currentDataSource?.pagination,
        pageSize
      }
    });
  };

  if (!supportsDataConnection) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Database className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            This component type doesn't support data connections
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!selectedDatabaseName) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Database className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-4">
            No database selected. Select a database from the header to connect this component to data.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!currentDataSource ? (
            <div>
              <Label className="text-sm font-medium">Select Table</Label>
              {loading ? (
                <div className="mt-2 flex items-center justify-center p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Loading tables...</div>
                </div>
              ) : tables.length === 0 ? (
                <div className="mt-2 flex items-center justify-center p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">No tables found in this database</div>
                </div>
              ) : (
                <Select onValueChange={handleConnectTable}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Choose a table..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tables.map((table) => (
                      <SelectItem key={table.id} value={table.id}>
                        <div className="flex items-center gap-2">
                          <Table className="h-4 w-4" />
                          <span>{table.name}</span>
                          <Badge variant="outline" className="ml-2">
                            {Array.isArray(table.records) ? table.records.length : JSON.parse(table.records || '[]').length} records
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <Link className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Connected to {currentDataSource.tableName}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnectTable}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                >
                  <Unlink className="h-4 w-4" />
                </Button>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Real-time Updates</Label>
                  <Switch
                    checked={currentDataSource.realTime}
                    onCheckedChange={handleRealTimeToggle}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Page Size</Label>
                  <Select 
                    value={currentDataSource.pagination?.pageSize?.toString()} 
                    onValueChange={(value) => handlePageSizeChange(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 records</SelectItem>
                      <SelectItem value="10">10 records</SelectItem>
                      <SelectItem value="25">25 records</SelectItem>
                      <SelectItem value="50">50 records</SelectItem>
                      <SelectItem value="100">100 records</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {currentDataSource && (
        <div className="space-y-4">
          <DataFieldMapper
            component={component}
            schema={tables.find(t => t.id === currentDataSource.tableProjectId)?.schema}
            currentMappings={currentDataSource.fieldMappings || []}
            onMappingsChange={(mappings) => {
              onDataSourceChange({
                ...currentDataSource,
                fieldMappings: mappings
              });
            }}
          />

          <DataFilterBuilder
            schema={tables.find(t => t.id === currentDataSource.tableProjectId)?.schema}
            currentFilters={currentDataSource.filterGroups || []}
            onFiltersChange={(filterGroups) => {
              onDataSourceChange({
                ...currentDataSource,
                filterGroups
              });
            }}
          />
        </div>
      )}
    </div>
  );
}