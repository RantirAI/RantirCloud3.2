import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Code, Play, Save, AlertCircle, CheckCircle, Settings, Variable } from 'lucide-react';
import { AppVariable, DataProcessingService } from '@/services/dataProcessingService';
import { DataQueryBuilder } from './DataQueryBuilder';
import Editor from '@monaco-editor/react';

interface ComputedVariableEditorProps {
  appProjectId: string;
  variable?: AppVariable;
  onSave: (variable: Omit<AppVariable, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
  userId: string;
}

export function ComputedVariableEditor({ appProjectId, variable, onSave, onCancel, userId }: ComputedVariableEditorProps) {
  const [formData, setFormData] = useState({
    name: variable?.name || '',
    description: variable?.description || '',
    variable_type: variable?.variable_type || 'static' as const,
    computation_logic: variable?.computation_logic || '',
    query_config: variable?.query_config || {
      filters: [],
      aggregations: [],
      groupBy: [],
      orderBy: []
    },
    cache_duration: variable?.cache_duration || 3600,
    computed_value: variable?.computed_value || ''
  });

  const [availableVariables, setAvailableVariables] = useState<AppVariable[]>([]);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAvailableVariables();
  }, [appProjectId]);

  const loadAvailableVariables = async () => {
    try {
      const variables = await DataProcessingService.getAppVariables(appProjectId);
      setAvailableVariables(variables.filter(v => v.id !== variable?.id));
    } catch (error) {
      console.error('Error loading variables:', error);
    }
  };

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleQueryConfigChange = (config: any) => {
    handleFormChange('query_config', config);
  };

  const testComputation = async () => {
    setIsLoading(true);
    setTestError(null);
    setTestResult(null);

    try {
      const testVariable: AppVariable = {
        id: 'test',
        app_project_id: appProjectId,
        user_id: userId,
        name: formData.name || 'test',
        description: formData.description,
        variable_type: formData.variable_type,
        data_source: {},
        query_config: formData.query_config,
        computation_logic: formData.computation_logic,
        cache_duration: formData.cache_duration,
        computed_value: formData.computed_value,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const result = await DataProcessingService.computeVariable(testVariable);
      setTestResult(result);
    } catch (error) {
      setTestError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    const variableData = {
      app_project_id: appProjectId,
      user_id: userId,
      name: formData.name,
      description: formData.description,
      variable_type: formData.variable_type,
      data_source: {},
      query_config: formData.query_config,
      computation_logic: formData.computation_logic || (formData.variable_type === 'static' ? formData.computed_value : ''),
      cache_duration: formData.cache_duration,
      computed_value: formData.variable_type === 'static' ? formData.computed_value : null,
      is_active: true
    };

    onSave(variableData);
  };

  const getVariableTypeDescription = () => {
    switch (formData.variable_type) {
      case 'static':
        return 'A fixed value that you set manually';
      case 'computed':
        return 'A value calculated using JavaScript expressions and other variables';
      case 'aggregation':
        return 'A value calculated from database queries (sum, average, count, etc.)';
      default:
        return '';
    }
  };

  const getCommonFunctions = () => [
    { name: 'Math.round()', description: 'Round to nearest integer' },
    { name: 'Math.floor()', description: 'Round down' },
    { name: 'Math.ceil()', description: 'Round up' },
    { name: 'Math.max()', description: 'Maximum value' },
    { name: 'Math.min()', description: 'Minimum value' },
    { name: 'parseFloat()', description: 'Convert to number' },
    { name: 'Date.now()', description: 'Current timestamp' },
    { name: 'new Date()', description: 'Create date object' }
  ];

  return (
    <div className="space-y-3 p-4">
      {/* Basic Information */}
      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-sm">Variable Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-3">
          <div>
            <Label htmlFor="name">Variable Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              placeholder="e.g., totalSales, averageRating"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
              placeholder="Describe what this variable represents"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="type">Variable Type</Label>
            <Select 
              value={formData.variable_type} 
              onValueChange={(value: 'static' | 'computed' | 'aggregation') => handleFormChange('variable_type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select variable type" />
              </SelectTrigger>
              <SelectContent className="z-[9999] bg-background border shadow-lg">
                <SelectItem value="static">Static Value</SelectItem>
                <SelectItem value="computed">Computed Expression</SelectItem>
                <SelectItem value="aggregation">Database Aggregation</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {getVariableTypeDescription()}
            </p>
          </div>

          <div>
            <Label htmlFor="cache">Cache Duration (seconds)</Label>
            <Input
              id="cache"
              type="number"
              value={formData.cache_duration}
              onChange={(e) => handleFormChange('cache_duration', parseInt(e.target.value) || 3600)}
              min="0"
              placeholder="3600"
            />
            <p className="text-xs text-muted-foreground mt-1">
              How long to cache the computed value (0 = always recompute)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Variable Configuration */}
      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Code className="h-3 w-3" />
            Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <Tabs value={formData.variable_type} className="space-y-3">
            <TabsContent value="static">
              <div>
                <Label htmlFor="staticValue">Static Value</Label>
                <Input
                  id="staticValue"
                  value={formData.computed_value || ''}
                  onChange={(e) => handleFormChange('computed_value', e.target.value)}
                  placeholder="Enter the fixed value"
                />
              </div>
            </TabsContent>

            <TabsContent value="computed" className="space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div>
                  <Label>Computation Logic</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <Editor
                      height="200px"
                      language="javascript"
                      value={formData.computation_logic}
                      onChange={(value) => handleFormChange('computation_logic', value || '')}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 12,
                        lineNumbers: 'off',
                        folding: false,
                        wordWrap: 'on'
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Write JavaScript expressions using available variables and functions
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="flex items-center gap-2">
                      <Variable className="h-3 w-3" />
                      Available Variables
                    </Label>
                    <ScrollArea className="h-[100px] border rounded p-2">
                      {availableVariables.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No variables available</p>
                      ) : (
                        <div className="space-y-1">
                          {availableVariables.map(v => (
                            <Badge key={v.id} variant="secondary" className="text-xs">
                              {v.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      <Settings className="h-3 w-3" />
                      Common Functions
                    </Label>
                    <ScrollArea className="h-[100px] border rounded p-2">
                      <div className="space-y-1">
                        {getCommonFunctions().map(func => (
                          <div key={func.name} className="text-xs">
                            <code className="text-primary">{func.name}</code>
                            <span className="text-muted-foreground ml-2">{func.description}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="aggregation">
              <DataQueryBuilder
                appProjectId={appProjectId}
                queryConfig={formData.query_config}
                onQueryChange={handleQueryConfigChange}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Test Section */}
      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Play className="h-3 w-3" />
              Test Variable
            </span>
            <Button 
              onClick={testComputation} 
              disabled={!formData.name || isLoading}
              size="sm"
            >
              {isLoading ? 'Testing...' : 'Test'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          {testError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{testError}</AlertDescription>
            </Alert>
          )}

          {testResult !== null && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <span className="font-medium">Result: </span>
                <code className="bg-muted px-1 rounded">
                  {JSON.stringify(testResult, null, 2)}
                </code>
              </AlertDescription>
            </Alert>
          )}

          {!testError && testResult === null && (
            <p className="text-sm text-muted-foreground">
              Click "Test" to preview the computed value
            </p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!formData.name}>
          <Save className="h-3 w-3 mr-1" />
          Save Variable
        </Button>
      </div>
    </div>
  );
}