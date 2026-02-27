import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Trash2, Variable, Search, Database, FileText, Check } from 'lucide-react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useAppBuilderVariableResolver } from '@/hooks/useAppBuilderVariableResolver';
import { useVariableStore } from '@/stores/variableStore';
import { cn } from '@/lib/utils';

const formatRuntimeValue = (value: any) => {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

// SetVariable Config Component with tabbed variable picker
interface VariableOption {
  label: string;
  value: string;
  description?: string;
  dataType?: string;
}

interface SetVariableConfigProps {
  config: any;
  appVars: VariableOption[];
  pageVars: VariableOption[];
  onConfigChange: (key: string, value: any) => void;
  renderInputWithBinding: (label: string, value: string, onChange: (v: string) => void, placeholder?: string) => React.ReactNode;
}

// Get available operations based on variable data type
const getOperationsForType = (dataType?: string): { value: string; label: string }[] => {
  switch (dataType) {
    case 'boolean':
      return [
        { value: 'set', label: 'Set Value' },
        { value: 'toggle', label: 'Toggle' },
      ];
    case 'number':
      return [
        { value: 'set', label: 'Set Value' },
        { value: 'increment', label: 'Increment (+)' },
        { value: 'decrement', label: 'Decrement (-)' },
      ];
    case 'array':
      return [
        { value: 'set', label: 'Set Value' },
        { value: 'append', label: 'Append to Array' },
        { value: 'remove', label: 'Remove from Array (by index)' },
      ];
    case 'string':
    case 'object':
    case 'date':
    default:
      return [
        { value: 'set', label: 'Set Value' },
      ];
  }
};

// Get data type badge color
const getDataTypeBadgeColor = (dataType?: string): string => {
  switch (dataType) {
    case 'boolean': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    case 'number': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'array': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    case 'string': return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'object': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    case 'date': return 'bg-pink-500/10 text-pink-600 border-pink-500/20';
    default: return 'bg-muted text-muted-foreground';
  }
};

function SetVariableConfig({ config, appVars, pageVars, onConfigChange, renderInputWithBinding }: SetVariableConfigProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const { appVariables, pageVariables, appVariableDefinitions, pageVariableDefinitions } = useVariableStore();

  const currentScope = config.scope || 'app';
  const currentVarName = config.variableName || '';

  // Find the selected variable to get its data type
  const selectedVariable = currentScope === 'app'
    ? appVars.find(v => v.label === currentVarName)
    : pageVars.find(v => v.label === currentVarName);

  const selectedDataType = selectedVariable?.dataType;
  const availableOperations = getOperationsForType(selectedDataType);

  const currentValue = React.useMemo(() => {
    if (!currentVarName) return undefined;

    const runtime = currentScope === 'app'
      ? appVariables[currentVarName]
      : pageVariables[currentVarName];

    if (runtime !== undefined) return runtime;

    const def = currentScope === 'app'
      ? appVariableDefinitions.find(d => d.name === currentVarName)
      : pageVariableDefinitions.find(d => d.name === currentVarName);

    return def?.initialValue;
  }, [
    currentScope,
    currentVarName,
    appVariables,
    pageVariables,
    appVariableDefinitions,
    pageVariableDefinitions,
  ]);

  // Reset operation if current operation is not valid for the new variable type
  React.useEffect(() => {
    if (selectedDataType && config.operation) {
      const validOps = availableOperations.map(op => op.value);
      if (!validOps.includes(config.operation)) {
        onConfigChange('operation', 'set');
      }
    }
  }, [selectedDataType, config.operation]);
  // Filter variables by search
  const filterVars = (vars: VariableOption[]) => {
    if (!searchQuery) return vars;
    return vars.filter(v => {
      const varName = v.value.replace(/\{\{(app|page)\./, '').replace(/\}\}$/, '');
      return varName.toLowerCase().includes(searchQuery.toLowerCase());
    });
  };
  
  const filteredAppVars = filterVars(appVars);
  const filteredPageVars = filterVars(pageVars);
  
  const handleSelectVariable = (scope: string, varName: string, dataType?: string) => {
    onConfigChange('scope', scope);
    onConfigChange('variableName', varName);
    // Reset operation to 'set' when variable changes to ensure valid operation
    const newOps = getOperationsForType(dataType);
    if (!newOps.find(op => op.value === config.operation)) {
      onConfigChange('operation', 'set');
    }
    setIsPickerOpen(false);
    setSearchQuery('');
  };
  
  const renderVariableList = (vars: VariableOption[], scope: string) => {
    if (vars.length === 0) {
      return (
        <div className="p-4 text-center text-muted-foreground text-sm">
          No {scope} variables found.
          <br />
          <span className="text-xs">Create variables in the Variables panel.</span>
        </div>
      );
    }
    
    return (
      <div className="space-y-1 p-1">
        {vars.map((v, idx) => {
          const varName = v.value.replace(/\{\{(app|page)\./, '').replace(/\}\}$/, '');
          const isSelected = currentScope === scope && currentVarName === varName;
          
          return (
            <div
              key={idx}
              onClick={() => handleSelectVariable(scope, varName, v.dataType)}
              className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                isSelected 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted'
              }`}
            >
              <Variable className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium truncate flex-1">{varName}</span>
              <Badge 
                variant="outline" 
                className={`text-[10px] px-1.5 py-0 ${isSelected ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30' : getDataTypeBadgeColor(v.dataType)}`}
              >
                {v.dataType || 'any'}
              </Badge>
              {isSelected && <Check className="h-4 w-4 flex-shrink-0" />}
            </div>
          );
        })}
      </div>
    );
  };
  
  return (
    <div className="space-y-4">
      {/* Variable Picker */}
      <div>
        <Label>Variable</Label>
        <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-between font-normal"
            >
              {currentVarName ? (
                <span className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {currentScope}
                  </Badge>
                  <span className="truncate">{currentVarName}</span>
                  {selectedDataType && (
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] px-1.5 py-0 ${getDataTypeBadgeColor(selectedDataType)}`}
                    >
                      {selectedDataType}
                    </Badge>
                  )}
                </span>
              ) : (
                <span className="text-muted-foreground">Select a variable...</span>
              )}
              <Variable className="h-4 w-4 ml-2 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0 bg-popover border shadow-lg z-[100]" align="start" sideOffset={4}>
            {/* Search */}
            <div className="p-2 border-b bg-popover">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search variables..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>
            
            {/* Tabs for App / Page */}
            <Tabs defaultValue={currentScope} className="w-full">
              <TabsList className="w-full grid grid-cols-2 h-10 rounded-none border-b bg-muted/50">
                <TabsTrigger value="app" className="gap-1.5 data-[state=active]:bg-background rounded-none">
                  <Database className="h-3.5 w-3.5" />
                  App ({filteredAppVars.length})
                </TabsTrigger>
                <TabsTrigger value="page" className="gap-1.5 data-[state=active]:bg-background rounded-none">
                  <FileText className="h-3.5 w-3.5" />
                  Page ({filteredPageVars.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="app" className="m-0 bg-popover">
                <ScrollArea className="h-[200px]">
                  {renderVariableList(filteredAppVars, 'app')}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="page" className="m-0 bg-popover">
                <ScrollArea className="h-[200px]">
                  {renderVariableList(filteredPageVars, 'page')}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </PopoverContent>
        </Popover>

        {currentVarName && (
          <div className="mt-2 rounded border bg-muted/20 p-2">
            <div className="text-[10px] text-muted-foreground">Current value</div>
            <div className={cn(
              "mt-1 rounded px-2 py-1 font-mono text-[11px] font-semibold",
              selectedDataType === 'boolean'
                ? currentValue === true
                  ? "bg-green-500/10 text-green-600 border border-green-500/30"
                  : "bg-red-500/10 text-red-600 border border-red-500/30"
                : "bg-background text-foreground"
            )}>
              {formatRuntimeValue(currentValue)}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-2">
          App variables persist across pages, Page variables are page-specific
        </p>
      </div>
      
      {/* Operation Type - Dynamic based on variable data type */}
      <div>
        <Label>Operation</Label>
        <Select 
          value={config.operation || 'set'} 
          onValueChange={(v) => onConfigChange('operation', v)}
          disabled={!currentVarName}
        >
          <SelectTrigger>
            <SelectValue placeholder={!currentVarName ? "Select a variable first" : "Select operation"} />
          </SelectTrigger>
          <SelectContent className="bg-popover border shadow-lg z-[100]">
            {availableOperations.map(op => (
              <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedDataType && (
          <p className="text-xs text-muted-foreground mt-1">
            Available operations for <span className="font-medium">{selectedDataType}</span> type
          </p>
        )}
      </div>
      
      {/* Value Input (conditional based on operation) */}
      {config.operation !== 'toggle' && (
        <div>
          <Label>
            {config.operation === 'increment' || config.operation === 'decrement' 
              ? 'Amount' 
              : config.operation === 'remove' 
                ? 'Index' 
                : 'Value'}
          </Label>
          {renderInputWithBinding(
            '',
            config.value || '',
            (value) => onConfigChange('value', value),
            config.operation === 'increment' || config.operation === 'decrement'
              ? '1'
              : config.operation === 'remove'
                ? '0'
                : 'Value or {{variable}}'
          )}
        </div>
      )}
    </div>
  );
}


interface ActionNodeSettingsPanelProps {
  nodeId: string;
  nodeData: any;
  flowId?: string;
  currentNodes?: any[];
  currentEdges?: any[];
  onUpdateConfig: (nodeId: string, config: any) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}

export function ActionNodeSettingsPanel({ 
  nodeId, 
  nodeData, 
  flowId,
  currentNodes,
  currentEdges,
  onUpdateConfig, 
  onDelete, 
  onClose 
}: ActionNodeSettingsPanelProps) {
  const { currentProject } = useAppBuilderStore();
  const { getAvailableVariables, getAppVariables, getPageVariables, isVariableBinding, getVariableDisplayName } = useAppBuilderVariableResolver();
  const pages = currentProject?.pages || [];
  const { type, config = {} } = nodeData;

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    onUpdateConfig(nodeId, newConfig);
  };

  const handleNestedConfigChange = (parentKey: string, childKey: string, value: any) => {
    const newConfig = {
      ...config,
      [parentKey]: {
        ...config[parentKey],
        [childKey]: value
      }
    };
    onUpdateConfig(nodeId, newConfig);
  };

  // Helper to render input field with variable binding
  const renderInputWithBinding = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    placeholder?: string,
    type = 'text'
  ) => {
    const variables = getAvailableVariables(nodeId, flowId, currentNodes, currentEdges);
    const isBound = isVariableBinding(value);
    
    return (
      <div>
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
          <Input
            type={type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1"
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10">
                <Variable className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <h4 className="font-medium">Select Variable</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {variables.map((variable, index) => (
                    <div key={index} className="p-2 rounded hover:bg-muted cursor-pointer border" onClick={() => onChange(variable.value)}>
                      <div className="font-medium text-sm">{variable.label}</div>
                      {variable.description && (
                        <div className="text-xs text-muted-foreground">{variable.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {isBound && (
          <div className="mt-1">
            <Badge variant="secondary" className="text-xs">
              {getVariableDisplayName(value)}
            </Badge>
          </div>
        )}
      </div>
    );
  };

  // Helper to render textarea with variable binding
  const renderTextareaWithBinding = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    placeholder?: string,
    rows = 3
  ) => {
    const variables = getAvailableVariables(nodeId, flowId, currentNodes, currentEdges);
    const isBound = isVariableBinding(value);
    
    return (
      <div>
        <Label>{label}</Label>
        <div className="space-y-2">
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
          />
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Variable className="h-4 w-4 mr-2" />
                  Insert Variable
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <h4 className="font-medium">Select Variable</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {variables.map((variable, index) => (
                      <div key={index} className="p-2 rounded hover:bg-muted cursor-pointer border" onClick={() => onChange(value + variable.value)}>
                        <div className="font-medium text-sm">{variable.label}</div>
                        {variable.description && (
                          <div className="text-xs text-muted-foreground">{variable.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {isBound && (
              <Badge variant="secondary" className="text-xs">
                Variables detected
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderConfigFields = () => {
    switch (type) {
      case 'navigate':
        return (
          <div className="space-y-4">
            {renderInputWithBinding(
              'URL',
              config.url || '',
              (value) => handleConfigChange('url', value),
              'https://example.com'
            )}
            <div>
              <Label htmlFor="target">Target</Label>
              <Select value={config.target || '_self'} onValueChange={(value) => handleConfigChange('target', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_self">Same Window</SelectItem>
                  <SelectItem value="_blank">New Window</SelectItem>
                  <SelectItem value="_parent">Parent Frame</SelectItem>
                  <SelectItem value="_top">Top Frame</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'navigateToPage':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="pageId">Page</Label>
              <Select value={config.pageId || ''} onValueChange={(value) => handleConfigChange('pageId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a page" />
                </SelectTrigger>
                <SelectContent>
                  {pages.map((page) => (
                    <SelectItem key={page.id} value={page.id}>
                      {page.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="parameters">URL Parameters (JSON)</Label>
              <Textarea
                id="parameters"
                value={JSON.stringify(config.parameters || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const params = JSON.parse(e.target.value);
                    handleConfigChange('parameters', params);
                  } catch (err) {
                    // Invalid JSON, don't update
                  }
                }}
                placeholder='{"param1": "value1", "param2": "value2"}'
                rows={4}
              />
            </div>
          </div>
        );

      case 'showAlert':
        return (
          <div className="space-y-4">
            {renderTextareaWithBinding(
              'Message',
              config.message || '',
              (value) => handleConfigChange('message', value),
              'Enter alert message',
              3
            )}
            <div>
              <Label htmlFor="type">Alert Type</Label>
              <Select value={config.type || 'info'} onValueChange={(value) => handleConfigChange('type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="persistent"
                checked={config.persistent || false}
                onCheckedChange={(checked) => handleConfigChange('persistent', checked)}
              />
              <Label htmlFor="persistent">Persistent (requires user action to dismiss)</Label>
            </div>
          </div>
        );

      case 'apiCall':
        return (
          <div className="space-y-4">
            {renderInputWithBinding(
              'API URL',
              config.url || '',
              (value) => handleConfigChange('url', value),
              'https://api.example.com/endpoint'
            )}
            <div>
              <Label htmlFor="method">HTTP Method</Label>
              <Select value={config.method || 'GET'} onValueChange={(value) => handleConfigChange('method', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="headers">Headers (JSON)</Label>
              <Textarea
                id="headers"
                value={JSON.stringify(config.headers || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const headers = JSON.parse(e.target.value);
                    handleConfigChange('headers', headers);
                  } catch (err) {
                    // Invalid JSON
                  }
                }}
                placeholder='{"Content-Type": "application/json", "Authorization": "Bearer token"}'
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="body">Request Body (JSON)</Label>
              <Textarea
                id="body"
                value={JSON.stringify(config.body || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const body = JSON.parse(e.target.value);
                    handleConfigChange('body', body);
                  } catch (err) {
                    // Invalid JSON
                  }
                }}
                placeholder='{"key": "value"}'
                rows={6}
              />
            </div>
          </div>
        );

      case 'condition':
        return (
          <div className="space-y-4">
            {renderInputWithBinding(
              'Left Value',
              config.leftValue || '',
              (value) => handleConfigChange('leftValue', value),
              'variable_name or {{param.value}}'
            )}
            <div>
              <Label htmlFor="operator">Operator</Label>
              <Select value={config.operator || 'equals'} onValueChange={(value) => handleConfigChange('operator', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">Equals (==)</SelectItem>
                  <SelectItem value="notEquals">Not Equals (!=)</SelectItem>
                  <SelectItem value="greaterThan">Greater Than (&gt;)</SelectItem>
                  <SelectItem value="lessThan">Less Than (&lt;)</SelectItem>
                  <SelectItem value="greaterOrEqual">Greater or Equal (&gt;=)</SelectItem>
                  <SelectItem value="lessOrEqual">Less or Equal (&lt;=)</SelectItem>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="startsWith">Starts With</SelectItem>
                  <SelectItem value="endsWith">Ends With</SelectItem>
                  <SelectItem value="isEmpty">Is Empty</SelectItem>
                  <SelectItem value="isNotEmpty">Is Not Empty</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {renderInputWithBinding(
              'Right Value',
              config.rightValue || '',
              (value) => handleConfigChange('rightValue', value),
              'Comparison value'
            )}
          </div>
        );

      case 'delay':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="duration">Duration (milliseconds)</Label>
              <Input
                id="duration"
                type="number"
                value={config.duration || 1000}
                onChange={(e) => handleConfigChange('duration', parseInt(e.target.value))}
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Select value={config.unit || 'ms'} onValueChange={(value) => handleConfigChange('unit', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ms">Milliseconds</SelectItem>
                  <SelectItem value="s">Seconds</SelectItem>
                  <SelectItem value="m">Minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="blocking"
                checked={config.blocking || false}
                onCheckedChange={(checked) => handleConfigChange('blocking', checked)}
              />
              <Label htmlFor="blocking">Blocking (pause entire flow)</Label>
            </div>
          </div>
        );

      case 'setVariable': {
        // Get variables directly from the specialized functions
        const appVars = getAppVariables();
        const pageVars = getPageVariables();
        
        return <SetVariableConfig 
          config={config}
          appVars={appVars}
          pageVars={pageVars}
          onConfigChange={handleConfigChange}
          renderInputWithBinding={renderInputWithBinding}
        />;
      }

      case 'executeCode':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="code">JavaScript Code</Label>
              <Textarea
                id="code"
                value={config.code || ''}
                onChange={(e) => handleConfigChange('code', e.target.value)}
                placeholder="// Your JavaScript code here"
                rows={10}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="async"
                checked={config.async || false}
                onCheckedChange={(checked) => handleConfigChange('async', checked)}
              />
              <Label htmlFor="async">Async execution</Label>
            </div>
          </div>
        );

      case 'sendEmail':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                value={config.to || ''}
                onChange={(e) => handleConfigChange('to', e.target.value)}
                placeholder="recipient@example.com"
              />
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={config.subject || ''}
                onChange={(e) => handleConfigChange('subject', e.target.value)}
                placeholder="Email subject"
              />
            </div>
            <div>
              <Label htmlFor="body">Body</Label>
              <Textarea
                id="body"
                value={config.body || ''}
                onChange={(e) => handleConfigChange('body', e.target.value)}
                placeholder="Email body content"
                rows={6}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="html"
                checked={config.html || false}
                onCheckedChange={(checked) => handleConfigChange('html', checked)}
              />
              <Label htmlFor="html">HTML content</Label>
            </div>
          </div>
        );

      case 'openModal':
      case 'closeModal':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="modalId">Modal ID</Label>
              <Input
                id="modalId"
                value={config.modalId || ''}
                onChange={(e) => handleConfigChange('modalId', e.target.value)}
                placeholder="modal-123"
              />
            </div>
            <div>
              <Label htmlFor="modalTitle">Modal Title</Label>
              <Input
                id="modalTitle"
                value={config.modalTitle || ''}
                onChange={(e) => handleConfigChange('modalTitle', e.target.value)}
                placeholder="Modal Title"
              />
            </div>
          </div>
        );

      case 'showComponent':
      case 'hideComponent':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="componentId">Component ID</Label>
              <Input
                id="componentId"
                value={config.componentId || ''}
                onChange={(e) => handleConfigChange('componentId', e.target.value)}
                placeholder="component-123"
              />
            </div>
            <div>
              <Label htmlFor="animationType">Animation</Label>
              <Select value={config.animationType || 'fade'} onValueChange={(value) => handleConfigChange('animationType', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fade">Fade</SelectItem>
                  <SelectItem value="slide">Slide</SelectItem>
                  <SelectItem value="scale">Scale</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'calculate':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="expression">Expression</Label>
              <Input
                id="expression"
                value={config.expression || ''}
                onChange={(e) => handleConfigChange('expression', e.target.value)}
                placeholder="{{value1}} + {{value2}}"
              />
            </div>
            <div>
              <Label htmlFor="resultVariable">Result Variable</Label>
              <Input
                id="resultVariable"
                value={config.resultVariable || ''}
                onChange={(e) => handleConfigChange('resultVariable', e.target.value)}
                placeholder="calculationResult"
              />
            </div>
          </div>
        );

      case 'filterData':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="dataSource">Data Source</Label>
              <Input
                id="dataSource"
                value={config.dataSource || ''}
                onChange={(e) => handleConfigChange('dataSource', e.target.value)}
                placeholder="{{dataArray}}"
              />
            </div>
            <div>
              <Label htmlFor="filterExpression">Filter Expression</Label>
              <Input
                id="filterExpression"
                value={config.filterExpression || ''}
                onChange={(e) => handleConfigChange('filterExpression', e.target.value)}
                placeholder="item => item.status === 'active'"
              />
            </div>
          </div>
        );

      case 'copyToClipboard':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="text">Text to Copy</Label>
              <Textarea
                id="text"
                value={config.text || ''}
                onChange={(e) => handleConfigChange('text', e.target.value)}
                placeholder="Text to copy to clipboard"
                rows={3}
              />
            </div>
          </div>
        );

      case 'createRecord':
      case 'updateRecord':
      case 'deleteRecord':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="table">Table</Label>
              <Input
                id="table"
                value={config.table || ''}
                onChange={(e) => handleConfigChange('table', e.target.value)}
                placeholder="table_name"
              />
            </div>
            <div>
              <Label htmlFor="data">Data (JSON)</Label>
              <Textarea
                id="data"
                value={JSON.stringify(config.data || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const data = JSON.parse(e.target.value);
                    handleConfigChange('data', data);
                  } catch (err) {
                    // Invalid JSON
                  }
                }}
                placeholder='{"column1": "value1", "column2": "value2"}'
                rows={6}
              />
            </div>
            {type === 'updateRecord' && (
              <div>
                <Label htmlFor="where">Where Clause (JSON)</Label>
                <Textarea
                  id="where"
                  value={JSON.stringify(config.where || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const where = JSON.parse(e.target.value);
                      handleConfigChange('where', where);
                    } catch (err) {
                      // Invalid JSON
                    }
                  }}
                  placeholder='{"id": 123}'
                  rows={3}
                />
              </div>
            )}
          </div>
        );

      case 'webhook':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="webhookUrl">Webhook URL</Label>
              <Input
                id="webhookUrl"
                value={config.webhookUrl || ''}
                onChange={(e) => handleConfigChange('webhookUrl', e.target.value)}
                placeholder="https://hooks.example.com/webhook"
              />
            </div>
            <div>
              <Label htmlFor="method">HTTP Method</Label>
              <Select value={config.method || 'POST'} onValueChange={(value) => handleConfigChange('method', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="payload">Payload (JSON)</Label>
              <Textarea
                id="payload"
                value={JSON.stringify(config.payload || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const payload = JSON.parse(e.target.value);
                    handleConfigChange('payload', payload);
                  } catch (err) {
                    // Invalid JSON
                  }
                }}
                placeholder='{"data": "value"}'
                rows={6}
              />
            </div>
          </div>
        );

      case 'openUrl':
      case 'redirect':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={config.url || ''}
                onChange={(e) => handleConfigChange('url', e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <Label htmlFor="target">Target</Label>
              <Select value={config.target || '_self'} onValueChange={(value) => handleConfigChange('target', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_self">Same Window</SelectItem>
                  <SelectItem value="_blank">New Window</SelectItem>
                  <SelectItem value="_parent">Parent Frame</SelectItem>
                  <SelectItem value="_top">Top Frame</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'formSubmit':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="formId">Form ID</Label>
              <Input
                id="formId"
                value={config.formId || ''}
                onChange={(e) => handleConfigChange('formId', e.target.value)}
                placeholder="form-123"
              />
            </div>
            <div>
              <Label htmlFor="submitUrl">Submit URL</Label>
              <Input
                id="submitUrl"
                value={config.submitUrl || ''}
                onChange={(e) => handleConfigChange('submitUrl', e.target.value)}
                placeholder="https://api.example.com/submit"
              />
            </div>
          </div>
        );

      case 'uploadFile':
      case 'downloadFile':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="fileUrl">File URL</Label>
              <Input
                id="fileUrl"
                value={config.fileUrl || ''}
                onChange={(e) => handleConfigChange('fileUrl', e.target.value)}
                placeholder="https://example.com/file.pdf"
              />
            </div>
            <div>
              <Label htmlFor="fileName">File Name</Label>
              <Input
                id="fileName"
                value={config.fileName || ''}
                onChange={(e) => handleConfigChange('fileName', e.target.value)}
                placeholder="document.pdf"
              />
            </div>
          </div>
        );

      case 'authenticate':
      case 'authorize':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="method">Auth Method</Label>
              <Select value={config.method || 'jwt'} onValueChange={(value) => handleConfigChange('method', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jwt">JWT Token</SelectItem>
                  <SelectItem value="session">Session</SelectItem>
                  <SelectItem value="oauth">OAuth</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="credentials">Credentials</Label>
              <Textarea
                id="credentials"
                value={config.credentials || ''}
                onChange={(e) => handleConfigChange('credentials', e.target.value)}
                placeholder="Authentication credentials"
                rows={3}
              />
            </div>
          </div>
        );

      case 'scheduleAction':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="scheduleType">Schedule Type</Label>
              <Select value={config.scheduleType || 'once'} onValueChange={(value) => handleConfigChange('scheduleType', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Once</SelectItem>
                  <SelectItem value="recurring">Recurring</SelectItem>
                  <SelectItem value="cron">Cron Expression</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="schedule">Schedule</Label>
              <Input
                id="schedule"
                value={config.schedule || ''}
                onChange={(e) => handleConfigChange('schedule', e.target.value)}
                placeholder="2024-12-31T23:59:59Z or */5 * * * *"
              />
            </div>
          </div>
        );

      case 'triggerEvent':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="eventName">Event Name</Label>
              <Input
                id="eventName"
                value={config.eventName || ''}
                onChange={(e) => handleConfigChange('eventName', e.target.value)}
                placeholder="customEvent"
              />
            </div>
            <div>
              <Label htmlFor="eventData">Event Data (JSON)</Label>
              <Textarea
                id="eventData"
                value={JSON.stringify(config.eventData || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const eventData = JSON.parse(e.target.value);
                    handleConfigChange('eventData', eventData);
                  } catch (err) {
                    // Invalid JSON
                  }
                }}
                placeholder='{"key": "value"}'
                rows={4}
              />
            </div>
          </div>
        );

      case 'database':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="query">SQL Query</Label>
              <Textarea
                id="query"
                value={config.query || ''}
                onChange={(e) => handleConfigChange('query', e.target.value)}
                placeholder="SELECT * FROM table WHERE condition"
                rows={6}
                className="font-mono text-sm"
              />
            </div>
            <div>
              <Label htmlFor="parameters">Parameters (JSON)</Label>
              <Textarea
                id="parameters"
                value={JSON.stringify(config.parameters || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parameters = JSON.parse(e.target.value);
                    handleConfigChange('parameters', parameters);
                  } catch (err) {
                    // Invalid JSON
                  }
                }}
                placeholder='{"param1": "value1"}'
                rows={3}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8 text-muted-foreground">
            <p>No configuration options available for this action type.</p>
          </div>
        );
    }
  };

  return (
    <div className="w-96 bg-card border-l border-border h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground text-base">Configuration</h3>
            <p className="text-sm text-muted-foreground mt-1">{type}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(nodeId)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {renderConfigFields()}
      </div>
    </div>
  );
}