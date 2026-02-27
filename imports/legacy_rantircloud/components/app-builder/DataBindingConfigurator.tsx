import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Database, 
  Table, 
  Filter, 
  ArrowUpDown, 
  Eye,
  Plus,
  Trash2,
  Play,
  Save,
  X,
  RefreshCw
} from 'lucide-react';
import { AppComponent } from '@/types/appBuilder';
import { useAuth } from '@/hooks/useAuth';
import { databaseConnectionService, DatabaseConnection, DataFilter, DataSort, DataPagination } from '@/services/databaseConnectionService';

interface DataBindingConfiguratorProps {
  component: AppComponent;
  onSave: (component: AppComponent) => void;
  onClose: () => void;
}

export function DataBindingConfigurator({ component, onSave, onClose }: DataBindingConfiguratorProps) {
  const { user } = useAuth();
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>(component.dataSource?.connectionId || '');
  const [selectedTable, setSelectedTable] = useState<string>(component.dataSource?.tableName || '');
  const [filters, setFilters] = useState<DataFilter[]>(component.dataSource?.filters || []);
  const [sorting, setSorting] = useState<DataSort[]>(component.dataSource?.sorting || []);
  const [pagination, setPagination] = useState<DataPagination>(component.dataSource?.pagination || { page: 1, pageSize: 10 });
  const [realTime, setRealTime] = useState<boolean>(component.dataSource?.realTime || false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConnections();
  }, [user]);

  useEffect(() => {
    if (selectedConnection && selectedTable) {
      loadPreview();
    }
  }, [selectedConnection, selectedTable, filters, sorting, pagination]);

  const loadConnections = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userConnections = await databaseConnectionService.getUserDatabaseConnections(user.id);
      setConnections(userConnections);
    } catch (error) {
      console.error('Failed to load connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPreview = async () => {
    if (!selectedConnection || !selectedTable) return;
    
    try {
      setLoadingPreview(true);
      setPreviewError(null);
      
      const result = await databaseConnectionService.getConnectionData(selectedConnection, selectedTable, {
        filters,
        sorting,
        pagination: { ...pagination, pageSize: 5 } // Limit preview to 5 records
      });
      
      setPreviewData(result.data);
    } catch (error) {
      console.error('Failed to load preview:', error);
      setPreviewError(error.message);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleAddFilter = () => {
    setFilters([...filters, { field: '', operator: 'eq', value: '' }]);
  };

  const handleRemoveFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const handleFilterChange = (index: number, field: keyof DataFilter, value: any) => {
    setFilters(filters.map((filter, i) => 
      i === index ? { ...filter, [field]: value } : filter
    ));
  };

  const handleAddSort = () => {
    setSorting([...sorting, { field: '', direction: 'asc' }]);
  };

  const handleRemoveSort = (index: number) => {
    setSorting(sorting.filter((_, i) => i !== index));
  };

  const handleSortChange = (index: number, field: keyof DataSort, value: any) => {
    setSorting(sorting.map((sort, i) => 
      i === index ? { ...sort, [field]: value } : sort
    ));
  };

  const handleSave = () => {
    const updatedComponent: AppComponent = {
      ...component,
      dataSource: {
        connectionId: selectedConnection,
        tableName: selectedTable,
        filters,
        sorting,
        pagination,
        realTime
      }
    };
    
    onSave(updatedComponent);
    onClose();
  };

  const selectedConnectionData = connections.find(conn => conn.id === selectedConnection);
  const selectedTableData = selectedConnectionData?.tables.find(table => table.id === selectedTable);
  const availableFields = selectedTableData?.schema.fields || [];

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Data Binding Configuration</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Data Binding Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Configure how your component connects to your database
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Connection Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Database Connection</Label>
                <Select value={selectedConnection} onValueChange={setSelectedConnection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a database connection" />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map(connection => (
                      <SelectItem key={connection.id} value={connection.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: connection.color || '#3B82F6' }}
                          />
                          {connection.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedConnection && (
                <div className="space-y-2">
                  <Label>Table</Label>
                  <Select value={selectedTable} onValueChange={setSelectedTable}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a table" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedConnectionData?.tables.map(table => (
                        <SelectItem key={table.id} value={table.id}>
                          <div className="flex items-center gap-2">
                            <Table className="h-4 w-4" />
                            {table.name}
                            <Badge variant="outline" className="text-xs">
                              {table.recordCount} records
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="real-time"
                  checked={realTime}
                  onCheckedChange={setRealTime}
                />
                <Label htmlFor="real-time">Real-time updates</Label>
              </div>
            </CardContent>
          </Card>

          {selectedTable && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Filters</CardTitle>
                    <Button variant="outline" size="sm" onClick={handleAddFilter}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Filter
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {filters.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No filters applied</p>
                  ) : (
                    <div className="space-y-3">
                      {filters.map((filter, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Select 
                            value={filter.field} 
                            onValueChange={(value) => handleFilterChange(index, 'field', value)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Field" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableFields.map(field => (
                                <SelectItem key={field.id} value={field.name}>
                                  {field.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Select 
                            value={filter.operator} 
                            onValueChange={(value) => handleFilterChange(index, 'operator', value)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="eq">Equals</SelectItem>
                              <SelectItem value="ne">Not Equals</SelectItem>
                              <SelectItem value="gt">Greater Than</SelectItem>
                              <SelectItem value="lt">Less Than</SelectItem>
                              <SelectItem value="contains">Contains</SelectItem>
                              <SelectItem value="in">In</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Input
                            placeholder="Value"
                            value={filter.value}
                            onChange={(e) => handleFilterChange(index, 'value', e.target.value)}
                            className="flex-1"
                          />
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFilter(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Sorting</CardTitle>
                    <Button variant="outline" size="sm" onClick={handleAddSort}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Sort
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {sorting.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No sorting applied</p>
                  ) : (
                    <div className="space-y-3">
                      {sorting.map((sort, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Select 
                            value={sort.field} 
                            onValueChange={(value) => handleSortChange(index, 'field', value)}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Field" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableFields.map(field => (
                                <SelectItem key={field.id} value={field.name}>
                                  {field.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Select 
                            value={sort.direction} 
                            onValueChange={(value) => handleSortChange(index, 'direction', value)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="asc">Ascending</SelectItem>
                              <SelectItem value="desc">Descending</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveSort(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pagination</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Page Size</Label>
                      <Input
                        type="number"
                        value={pagination.pageSize}
                        onChange={(e) => setPagination({...pagination, pageSize: parseInt(e.target.value) || 10})}
                        min="1"
                        max="100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Current Page</Label>
                      <Input
                        type="number"
                        value={pagination.page}
                        onChange={(e) => setPagination({...pagination, page: parseInt(e.target.value) || 1})}
                        min="1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Preview</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadPreview}
                  disabled={loadingPreview || !selectedTable}
                >
                  {loadingPreview ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  Preview
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {previewError ? (
                <Alert className="border-red-500">
                  <AlertDescription className="text-red-600">
                    {previewError}
                  </AlertDescription>
                </Alert>
              ) : loadingPreview ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : previewData.length > 0 ? (
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {previewData.map((record, index) => (
                      <div key={index} className="p-2 bg-muted/50 rounded text-xs">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(record, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  {selectedTable ? 'No data found' : 'Select a table to preview data'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!selectedConnection || !selectedTable}>
          <Save className="h-4 w-4 mr-2" />
          Save Configuration
        </Button>
      </div>
    </div>
  );
}