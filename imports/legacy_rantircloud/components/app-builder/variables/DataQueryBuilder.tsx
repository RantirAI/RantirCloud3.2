import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Play, Database, Filter, BarChart3, AlertCircle } from 'lucide-react';
import { QueryConfig, QueryFilter, DataProcessingService } from '@/services/dataProcessingService';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { databaseConnectionService } from '@/services/databaseConnectionService';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DataQueryBuilderProps {
  appProjectId: string;
  queryConfig: QueryConfig;
  onQueryChange: (config: QueryConfig) => void;
  onPreview?: (data: any) => void;
}

export function DataQueryBuilder({ appProjectId, queryConfig, onQueryChange, onPreview }: DataQueryBuilderProps) {
  const [availableTables, setAvailableTables] = useState<Array<{ id: string; name: string; fields: any[] }>>([]);
  const [selectedTableFields, setSelectedTableFields] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { selectedDatabaseId, selectedDatabaseName } = useAppBuilderStore();

  useEffect(() => {
    if (selectedDatabaseId) {
      loadDatabaseTables();
    }
  }, [selectedDatabaseId]);

  useEffect(() => {
    if (queryConfig.table_name && availableTables.length > 0) {
      const table = availableTables.find(t => t.name === queryConfig.table_name);
      if (table) {
        setSelectedTableFields(table.fields || []);
      }
    }
  }, [queryConfig.table_name, availableTables]);

  const loadDatabaseTables = async () => {
    if (!selectedDatabaseId) {
      setError('Please select a database first');
      return;
    }

    try {
      setError(null);
      // For now, use mock data until database connection service is fully implemented
      const mockTables = [
        { 
          id: '1', 
          name: 'orders', 
          fields: [
            { name: 'id', type: 'number' },
            { name: 'total_amount', type: 'number' },
            { name: 'customer_id', type: 'number' },
            { name: 'created_at', type: 'date' },
            { name: 'status', type: 'text' }
          ]
        },
        { 
          id: '2', 
          name: 'customers', 
          fields: [
            { name: 'id', type: 'number' },
            { name: 'name', type: 'text' },
            { name: 'email', type: 'text' },
            { name: 'created_at', type: 'date' }
          ]
        }
      ];
      setAvailableTables(mockTables);
    } catch (error) {
      console.error('Error loading database tables:', error);
      setError('Failed to load database tables. Make sure the database is properly connected.');
    }
  };

  const handleTableSelect = (tableName: string) => {
    const updatedConfig = {
      ...queryConfig,
      table_name: tableName,
      connection_id: selectedDatabaseId || ''
    };
    onQueryChange(updatedConfig);
  };

  const addAggregation = () => {
    const newAggregation = {
      field: '',
      function: 'COUNT',
      alias: ''
    };
    
    const updatedConfig = {
      ...queryConfig,
      aggregations: [...queryConfig.aggregations, newAggregation]
    };
    onQueryChange(updatedConfig);
  };

  const updateAggregation = (index: number, field: string, value: any) => {
    const updatedAggregations = [...queryConfig.aggregations];
    updatedAggregations[index] = { ...updatedAggregations[index], [field]: value };
    
    const updatedConfig = {
      ...queryConfig,
      aggregations: updatedAggregations
    };
    onQueryChange(updatedConfig);
  };

  const removeAggregation = (index: number) => {
    const updatedConfig = {
      ...queryConfig,
      aggregations: queryConfig.aggregations.filter((_, i) => i !== index)
    };
    onQueryChange(updatedConfig);
  };

  const addFilter = () => {
    const newFilter: QueryFilter = {
      field: '',
      operator: 'equals',
      value: ''
    };
    
    const updatedConfig = {
      ...queryConfig,
      filters: [...queryConfig.filters, newFilter]
    };
    onQueryChange(updatedConfig);
  };

  const updateFilter = (index: number, field: string, value: any) => {
    const updatedFilters = [...queryConfig.filters];
    updatedFilters[index] = { ...updatedFilters[index], [field]: value };
    
    const updatedConfig = {
      ...queryConfig,
      filters: updatedFilters
    };
    onQueryChange(updatedConfig);
  };

  const removeFilter = (index: number) => {
    const updatedConfig = {
      ...queryConfig,
      filters: queryConfig.filters.filter((_, i) => i !== index)
    };
    onQueryChange(updatedConfig);
  };

  const previewQuery = async () => {
    setIsLoading(true);
    try {
      // This would execute the query and show preview results
      const result = await DataProcessingService.executeQuery(queryConfig);
      setPreviewData(result);
      onPreview?.(result);
    } catch (error) {
      console.error('Error previewing query:', error);
      setError(error.message || 'Failed to preview query');
    } finally {
      setIsLoading(false);
    }
  };

  const getAggregationFunctions = () => [
    { value: 'COUNT', label: 'Count Records' },
    { value: 'SUM', label: 'Sum' },
    { value: 'AVG', label: 'Average' },
    { value: 'MIN', label: 'Minimum' },
    { value: 'MAX', label: 'Maximum' },
    { value: 'COUNT_DISTINCT', label: 'Count Unique' }
  ];

  const getOperators = () => [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'contains', label: 'Contains' },
    { value: 'starts_with', label: 'Starts With' },
    { value: 'in', label: 'In List' },
    { value: 'between', label: 'Between' }
  ];

  if (!selectedDatabaseId || !selectedDatabaseName) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please select a database connection first in the main Variables dashboard.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Database Connection Info */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4 text-primary" />
            <span>Connected to: <strong>{selectedDatabaseName}</strong></span>
          </div>
        </CardContent>
      </Card>

      {/* Table Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Source
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Table</Label>
            <Select value={queryConfig.table_name || ''} onValueChange={handleTableSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a table..." />
              </SelectTrigger>
              <SelectContent className="z-[1000] bg-background border shadow-lg">
                {availableTables.map((table) => (
                  <SelectItem key={table.id} value={table.name} className="z-[1000]">
                    {table.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Aggregations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Aggregations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {queryConfig.aggregations.map((agg, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <Label>Aggregation {index + 1}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAggregation(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Function</Label>
                  <Select
                    value={agg.function}
                    onValueChange={(value) => updateAggregation(index, 'function', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                     <SelectContent className="z-[1000] bg-background border shadow-lg">
                      {getAggregationFunctions().map((func) => (
                        <SelectItem key={func.value} value={func.value}>
                          {func.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Field</Label>
                  <Select
                    value={agg.field}
                    onValueChange={(value) => updateAggregation(index, 'field', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select field..." />
                    </SelectTrigger>
                     <SelectContent className="z-[1000] bg-background border shadow-lg">
                      {selectedTableFields.map((field) => (
                        <SelectItem key={field.name} value={field.name}>
                          {field.name} ({field.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Alias</Label>
                  <Input
                    value={agg.alias || ''}
                    onChange={(e) => updateAggregation(index, 'alias', e.target.value)}
                    placeholder="e.g., total_sales"
                  />
                </div>
              </div>
            </div>
          ))}
          
          <Button onClick={addAggregation} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Aggregation
          </Button>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {queryConfig.filters.map((filter, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <Label>Filter {index + 1}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFilter(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Field</Label>
                  <Select
                    value={filter.field}
                    onValueChange={(value) => updateFilter(index, 'field', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select field..." />
                    </SelectTrigger>
                     <SelectContent className="z-[1000] bg-background border shadow-lg">
                      {selectedTableFields.map((field) => (
                        <SelectItem key={field.name} value={field.name}>
                          {field.name} ({field.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Operator</Label>
                  <Select
                    value={filter.operator}
                    onValueChange={(value) => updateFilter(index, 'operator', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[1000] bg-background border shadow-lg">
                      {getOperators().map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Value</Label>
                  <Input
                    value={filter.value}
                    onChange={(e) => updateFilter(index, 'value', e.target.value)}
                    placeholder="Enter value..."
                  />
                </div>
              </div>
            </div>
          ))}
          
          <Button onClick={addFilter} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Filter
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Preview Results
            </span>
            <Button onClick={previewQuery} disabled={!queryConfig.table_name || isLoading}>
              {isLoading ? 'Loading...' : 'Run Preview'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {previewData ? (
            <div className="space-y-2">
              <Label>Query Result:</Label>
              <div className="p-4 bg-muted rounded border">
                <pre className="text-sm overflow-x-auto">
                  {JSON.stringify(previewData, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Configure your query and click "Run Preview" to see results
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}