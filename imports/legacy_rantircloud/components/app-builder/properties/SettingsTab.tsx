import React, { useEffect, useMemo, useState } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useVariableStore } from '@/stores/variableStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Eye, ChevronDown, Plus, Check, X, Variable } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface CustomAttribute {
  key: string;
  value: string;
}

// Reactive component to display current variable value
function CurrentValueDisplay({
  scope,
  name,
  dataType,
  appVariables,
  pageVariables,
  appVariableDefinitions,
  pageVariableDefinitions,
}: {
  scope: 'app' | 'page';
  name: string;
  dataType: string;
  appVariables: Record<string, any>;
  pageVariables: Record<string, any>;
  appVariableDefinitions: any[];
  pageVariableDefinitions: any[];
}) {
  const runtimeValue = scope === 'app' ? appVariables[name] : pageVariables[name];
  const varDef = scope === 'app'
    ? appVariableDefinitions.find(v => v.name === name)
    : pageVariableDefinitions.find(v => v.name === name);
  const varValue = runtimeValue !== undefined ? runtimeValue : varDef?.initialValue;
  
  // Determine color based on value for boolean types
  const getValueColor = () => {
    if (dataType === 'boolean') {
      return varValue === true 
        ? 'text-green-600 bg-green-500/10 border border-green-500/30' 
        : 'text-red-600 bg-red-500/10 border border-red-500/30';
    }
    return 'text-foreground bg-background';
  };
  
  return (
    <div className="flex items-center gap-1.5 text-[9px] bg-muted/50 p-1.5 rounded">
      <span className="text-muted-foreground">Current:</span>
      <code className={cn("font-mono px-1.5 py-0.5 rounded text-[10px] font-semibold", getValueColor())}>
        {varValue !== undefined ? JSON.stringify(varValue) : 'undefined'}
      </code>
    </div>
  );
}

interface VisibilityCondition {
  variableBinding: string; // e.g., "{{page.isModalOpen}}"
  variableType: string; // boolean, number, string, array
  operator: string; // equals, notEquals, greaterThan, etc.
  value: any; // The value to compare against
}

interface SettingsTabProps {
  component: any;
}

// Get operators based on variable type
const getOperatorsForType = (dataType: string) => {
  switch (dataType) {
    case 'boolean':
      return [
        { value: 'equals', label: 'Is' },
      ];
    case 'number':
      return [
        { value: 'equals', label: '=' },
        { value: 'notEquals', label: '≠' },
        { value: 'greaterThan', label: '>' },
        { value: 'lessThan', label: '<' },
        { value: 'greaterThanOrEqual', label: '≥' },
        { value: 'lessThanOrEqual', label: '≤' },
      ];
    case 'string':
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'notEquals', label: 'Not Equals' },
        { value: 'contains', label: 'Contains' },
        { value: 'notContains', label: 'Not Contains' },
        { value: 'startsWith', label: 'Starts With' },
        { value: 'endsWith', label: 'Ends With' },
        { value: 'isEmpty', label: 'Is Empty' },
        { value: 'isNotEmpty', label: 'Is Not Empty' },
      ];
    case 'array':
      return [
        { value: 'isEmpty', label: 'Is Empty' },
        { value: 'isNotEmpty', label: 'Has Items' },
        { value: 'lengthEquals', label: 'Length =' },
        { value: 'lengthGreaterThan', label: 'Length >' },
        { value: 'lengthLessThan', label: 'Length <' },
        { value: 'contains', label: 'Contains' },
      ];
    case 'object':
      return [
        { value: 'isEmpty', label: 'Is Empty' },
        { value: 'isNotEmpty', label: 'Is Not Empty' },
        { value: 'hasKey', label: 'Has Key' },
      ];
    default:
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'notEquals', label: 'Not Equals' },
      ];
  }
};

// Check if operator needs a value input
const operatorNeedsValue = (operator: string) => {
  return !['isEmpty', 'isNotEmpty'].includes(operator);
};

// Get badge color for data type
const getDataTypeBadgeColor = (dataType: string) => {
  switch (dataType) {
    case 'boolean': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'number': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'string': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'array': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'object': return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
    default: return 'bg-muted text-muted-foreground';
  }
};

export function SettingsTab({ component }: SettingsTabProps) {
  const { updateComponent, selectedComponent, currentProject, currentPage } = useAppBuilderStore();
  const { 
    appVariableDefinitions, 
    pageVariableDefinitions,
    appVariables,
    pageVariables,
    loadAppVariables,
    loadPageVariables,
  } = useVariableStore();
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [visibilityOpen, setVisibilityOpen] = useState(true);
  const [customAttributesOpen, setCustomAttributesOpen] = useState(true);
  const [editingAttribute, setEditingAttribute] = useState<{ key: string; value: string } | null>(null);
  const [visibilityBindingOpen, setVisibilityBindingOpen] = useState(false);

  // Ensure variable definitions are loaded even if the Variables panel isn't open
  useEffect(() => {
    if (currentProject?.id) {
      loadAppVariables(currentProject.id);
      if (currentPage) {
        loadPageVariables(currentProject.id, currentPage);
      }
    }
  }, [currentProject?.id, currentPage, loadAppVariables, loadPageVariables]);

  // Combine all variables with their type info
  const allVariables = useMemo(() => {
    const pageVars = pageVariableDefinitions.map(v => ({
      ...v,
      scope: 'page' as const,
      binding: `{{page.${v.name}}}`
    }));
    const appVars = appVariableDefinitions.map(v => ({
      ...v,
      scope: 'app' as const,
      binding: `{{app.${v.name}}}`
    }));
    return { pageVars, appVars };
  }, [pageVariableDefinitions, appVariableDefinitions]);

  // Parse existing visibility condition
  const visibilityCondition: VisibilityCondition | null = useMemo(() => {
    const cond = component.props?.visibilityCondition;
    if (cond) return cond;
    
    // Legacy support for visibilityBinding (boolean only)
    const binding = component.props?.visibilityBinding;
    if (binding) {
      return {
        variableBinding: binding,
        variableType: 'boolean',
        operator: 'equals',
        value: true
      };
    }
    return null;
  }, [component.props?.visibilityCondition, component.props?.visibilityBinding]);

  // Get display info for the condition
  const getConditionDisplayInfo = () => {
    if (!visibilityCondition) return null;
    const match = visibilityCondition.variableBinding.match(/\{\{(app|page)\.(.+)\}\}/);
    if (!match) return null;
    
    const scope = match[1];
    const name = match[2];
    const varList = scope === 'page' ? allVariables.pageVars : allVariables.appVars;
    const variable = varList.find(v => v.name === name);
    
    return {
      scope,
      name,
      dataType: variable?.dataType || visibilityCondition.variableType || 'string',
      operator: visibilityCondition.operator,
      value: visibilityCondition.value
    };
  };

  const conditionInfo = getConditionDisplayInfo();

  // Get operators for current variable type
  const currentOperators = conditionInfo 
    ? getOperatorsForType(conditionInfo.dataType) 
    : [];

  const handleUpdate = (key: string, value: any) => {
    if (!selectedComponent) return;
    
    updateComponent(selectedComponent, {
      [key]: value
    });
  };

  const handlePropsUpdate = (key: string, value: any) => {
    if (!selectedComponent) return;
    
    updateComponent(selectedComponent, {
      props: {
        ...component.props,
        [key]: value
      }
    });
  };

  // Handle selecting a variable for visibility
  const handleSelectVariable = (variable: { 
    id: string; 
    name: string; 
    dataType: string; 
    binding: string;
    scope: 'page' | 'app';
  }) => {
    const defaultOperator = variable.dataType === 'boolean' ? 'equals' : 'equals';
    const defaultValue = variable.dataType === 'boolean' ? true : 
                        variable.dataType === 'number' ? 0 : '';
    
    const condition: VisibilityCondition = {
      variableBinding: variable.binding,
      variableType: variable.dataType,
      operator: defaultOperator,
      value: defaultValue
    };
    
    handlePropsUpdate('visibilityCondition', condition);
    // Also keep legacy binding for backwards compat
    handlePropsUpdate('visibilityBinding', variable.binding);
  };

  // Update just the operator
  const handleOperatorChange = (operator: string) => {
    if (!visibilityCondition) return;
    
    const needsValue = operatorNeedsValue(operator);
    const newCondition: VisibilityCondition = {
      ...visibilityCondition,
      operator,
      value: needsValue ? visibilityCondition.value : null
    };
    
    handlePropsUpdate('visibilityCondition', newCondition);
  };

  // Update just the value
  const handleValueChange = (value: any) => {
    if (!visibilityCondition) return;
    
    handlePropsUpdate('visibilityCondition', {
      ...visibilityCondition,
      value
    });
  };

  // Clear visibility condition
  const handleClearVisibility = () => {
    handlePropsUpdate('visibilityCondition', null);
    handlePropsUpdate('visibilityBinding', null);
    setVisibilityBindingOpen(false);
  };

  // Render value input based on type
  const renderValueInput = () => {
    if (!visibilityCondition || !conditionInfo) return null;
    if (!operatorNeedsValue(visibilityCondition.operator)) return null;

    const { dataType } = conditionInfo;

    if (dataType === 'boolean') {
      return (
        <Select
          value={String(visibilityCondition.value)}
          onValueChange={(v) => handleValueChange(v === 'true')}
        >
          <SelectTrigger className="h-6 text-[10px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true" className="text-[10px]">True</SelectItem>
            <SelectItem value="false" className="text-[10px]">False</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (dataType === 'number') {
      return (
        <Input
          type="number"
          value={visibilityCondition.value ?? ''}
          onChange={(e) => handleValueChange(Number(e.target.value))}
          placeholder="0"
          className="h-6 text-[10px]"
        />
      );
    }

    // String, array contains, object hasKey, etc.
    return (
      <Input
        type="text"
        value={visibilityCondition.value ?? ''}
        onChange={(e) => handleValueChange(e.target.value)}
        placeholder="Value..."
        className="h-6 text-[10px]"
      />
    );
  };

  // Format condition for display
  const formatConditionDisplay = () => {
    if (!conditionInfo) return null;
    
    const op = currentOperators.find(o => o.value === conditionInfo.operator);
    const opLabel = op?.label || conditionInfo.operator;
    
    if (!operatorNeedsValue(conditionInfo.operator)) {
      return `${conditionInfo.name} ${opLabel}`;
    }
    
    const valueDisplay = conditionInfo.dataType === 'boolean' 
      ? (conditionInfo.value ? 'True' : 'False')
      : JSON.stringify(conditionInfo.value);
    
    return `${conditionInfo.name} ${opLabel} ${valueDisplay}`;
  };

  const customAttributes: CustomAttribute[] = component.props?.customAttributes || [];

  const handleAddAttribute = () => {
    const newKey = `data-attr-${customAttributes.length + 1}`;
    setEditingAttribute({ key: newKey, value: '' });
  };

  const handleSaveAttribute = () => {
    if (!editingAttribute) return;
    
    const newAttributes = [...customAttributes, editingAttribute];
    handlePropsUpdate('customAttributes', newAttributes);
    setEditingAttribute(null);
  };

  const handleCancelAttribute = () => {
    setEditingAttribute(null);
  };

  const handleRemoveAttribute = (index: number) => {
    const newAttributes = customAttributes.filter((_, i) => i !== index);
    handlePropsUpdate('customAttributes', newAttributes);
  };

  return (
    <ScrollArea className="flex-1 max-h-[calc(100vh-12rem)]" scrollbarVariant="hover-show">
      <div className="p-1 space-y-0.5">
        {/* Component Settings */}
        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-1 hover:bg-muted/50 rounded-md transition-colors">
            <span className="text-xs font-medium flex items-center gap-1.5">
              <Settings className="h-3 w-3" />
              Component Settings
            </span>
            <ChevronDown className={cn("h-3 w-3 transition-transform", settingsOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-1 pb-1 space-y-1">
              <div className="space-y-0.5">
                <Label className="text-[10px]">Component ID</Label>
                <Input
                  value={component.id || ''}
                  onChange={(e) => handleUpdate('id', e.target.value)}
                  placeholder="component-id"
                  className="h-5 text-[10px]"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Custom Attributes */}
        <Collapsible open={customAttributesOpen} onOpenChange={setCustomAttributesOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-1 hover:bg-muted/50 rounded-md transition-colors">
            <span className="text-xs font-medium flex items-center gap-1.5">
              Custom Attributes
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddAttribute();
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </span>
            <ChevronDown className={cn("h-3 w-3 transition-transform", customAttributesOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-1 pb-1 space-y-1">
              {customAttributes.length === 0 && !editingAttribute && (
                <p className="text-[10px] text-muted-foreground">No custom attributes</p>
              )}
              
              {customAttributes.map((attr, index) => (
                <div key={index} className="flex items-center gap-1">
                  <Input
                    value={attr.key}
                    className="h-5 text-[10px] flex-1"
                    readOnly
                  />
                  <span className="text-[10px] text-muted-foreground">=</span>
                  <Input
                    value={attr.value}
                    className="h-5 text-[10px] flex-1"
                    readOnly
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0"
                    onClick={() => handleRemoveAttribute(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              
              {editingAttribute && (
                <div className="flex items-center gap-1">
                  <Input
                    value={editingAttribute.key}
                    onChange={(e) => setEditingAttribute({ ...editingAttribute, key: e.target.value })}
                    className="h-5 text-[10px] flex-1"
                    placeholder="data-attr"
                  />
                  <span className="text-[10px] text-muted-foreground">=</span>
                  <Input
                    value={editingAttribute.value}
                    onChange={(e) => setEditingAttribute({ ...editingAttribute, value: e.target.value })}
                    className="h-5 text-[10px] flex-1"
                    placeholder="value"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 text-green-600"
                    onClick={handleSaveAttribute}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0"
                    onClick={handleCancelAttribute}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Visibility & Behavior */}
        <Collapsible open={visibilityOpen} onOpenChange={setVisibilityOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-1 hover:bg-muted/50 rounded-md transition-colors">
            <span className="text-xs font-medium flex items-center gap-1.5">
              <Eye className="h-3 w-3" />
              Visibility & Behavior
            </span>
            <ChevronDown className={cn("h-3 w-3 transition-transform", visibilityOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-1 pb-1 space-y-2">
              {/* Hidden with Bind Button */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-[10px]">Hidden</Label>
                    <span className="text-[9px] text-muted-foreground">Hide from view</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Bind Button */}
                    <Popover open={visibilityBindingOpen} onOpenChange={setVisibilityBindingOpen}>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className={cn(
                            "h-5 w-5 p-0",
                            conditionInfo && "text-purple-500 bg-purple-500/10"
                          )}
                          title="Bind to variable"
                        >
                          <Variable className="h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-0" align="end">
                        <Tabs defaultValue="page" className="w-full">
                          <TabsList className="w-full grid grid-cols-2 h-7">
                            <TabsTrigger value="page" className="text-[10px] h-6">Page Variables</TabsTrigger>
                            <TabsTrigger value="app" className="text-[10px] h-6">App Variables</TabsTrigger>
                          </TabsList>
                          <TabsContent value="page" className="m-0">
                            <div className="p-1 max-h-40 overflow-y-auto">
                              {allVariables.pageVars.length === 0 ? (
                                <p className="text-[10px] text-muted-foreground p-2 text-center">
                                  No page variables defined
                                </p>
                              ) : (
                                allVariables.pageVars.map(v => (
                                  <Button
                                    key={v.id}
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start h-7 text-[10px] px-2"
                                    onClick={() => {
                                      handleSelectVariable(v);
                                      setVisibilityBindingOpen(false);
                                    }}
                                  >
                                    <Variable className="h-3 w-3 mr-1.5 text-purple-500" />
                                    <span className="flex-1 text-left truncate">{v.name}</span>
                                    <Badge variant="outline" className={cn("h-4 text-[8px] px-1 ml-1 border", getDataTypeBadgeColor(v.dataType))}>
                                      {v.dataType}
                                    </Badge>
                                  </Button>
                                ))
                              )}
                            </div>
                          </TabsContent>
                          <TabsContent value="app" className="m-0">
                            <div className="p-1 max-h-40 overflow-y-auto">
                              {allVariables.appVars.length === 0 ? (
                                <p className="text-[10px] text-muted-foreground p-2 text-center">
                                  No app variables defined
                                </p>
                              ) : (
                                allVariables.appVars.map(v => (
                                  <Button
                                    key={v.id}
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start h-7 text-[10px] px-2"
                                    onClick={() => {
                                      handleSelectVariable(v);
                                      setVisibilityBindingOpen(false);
                                    }}
                                  >
                                    <Variable className="h-3 w-3 mr-1.5 text-purple-500" />
                                    <span className="flex-1 text-left truncate">{v.name}</span>
                                    <Badge variant="outline" className={cn("h-4 text-[8px] px-1 ml-1 border", getDataTypeBadgeColor(v.dataType))}>
                                      {v.dataType}
                                    </Badge>
                                  </Button>
                                ))
                              )}
                            </div>
                          </TabsContent>
                        </Tabs>
                        {conditionInfo && (
                          <div className="border-t p-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full h-6 text-[10px] text-muted-foreground"
                              onClick={handleClearVisibility}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Clear Binding
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                    {/* Toggle - disabled if bound */}
                    <Switch
                      checked={component.props?.hidden || false}
                      onCheckedChange={(checked) => handlePropsUpdate('hidden', checked)}
                      className="scale-75"
                      disabled={!!conditionInfo}
                    />
                  </div>
                </div>

                {/* Condition Builder - Shows when variable is bound */}
                {conditionInfo && (
                  <div className="space-y-1.5 p-2 rounded-md bg-purple-500/5 border border-purple-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-purple-400 font-medium">Show when condition is met</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 text-muted-foreground hover:text-destructive"
                        onClick={handleClearVisibility}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {/* Variable Display */}
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <Variable className="h-3 w-3 text-purple-500" />
                      <Badge variant="outline" className={cn("h-4 text-[8px] px-1 border", getDataTypeBadgeColor(conditionInfo.dataType))}>
                        {conditionInfo.scope}
                      </Badge>
                      <span className="font-medium">{conditionInfo.name}</span>
                    </div>
                    
                    {/* Current Value Display - Using memoized value that updates reactively */}
                    <CurrentValueDisplay
                      scope={conditionInfo.scope as 'app' | 'page'}
                      name={conditionInfo.name}
                      dataType={conditionInfo.dataType}
                      appVariables={appVariables}
                      pageVariables={pageVariables}
                      appVariableDefinitions={appVariableDefinitions}
                      pageVariableDefinitions={pageVariableDefinitions}
                    />

                    {/* Operator and Value */}
                    <div className="flex items-center gap-1.5">
                      <Select
                        value={conditionInfo.operator}
                        onValueChange={handleOperatorChange}
                      >
                        <SelectTrigger className="h-6 text-[10px] flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currentOperators.map(op => (
                            <SelectItem key={op.value} value={op.value} className="text-[10px]">
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {operatorNeedsValue(conditionInfo.operator) && (
                        <div className="flex-1">
                          {renderValueInput()}
                        </div>
                      )}
                    </div>

                    {/* Preview */}
                    <div className="text-[9px] text-muted-foreground pt-1 border-t border-purple-500/10">
                      <code className="text-purple-400 font-mono bg-purple-500/10 px-1 rounded">
                        {formatConditionDisplay()}
                      </code>
                    </div>

                    {/* Show in Canvas Override */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-purple-500/10">
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3 text-muted-foreground" />
                        <Label className="text-[9px] text-muted-foreground">Show in canvas</Label>
                      </div>
                      <Switch
                        checked={component.props?.forceShowInCanvas || false}
                        onCheckedChange={(checked) => handlePropsUpdate('forceShowInCanvas', checked)}
                        className="scale-[0.6]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Disabled */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Label className="text-[10px]">Disabled</Label>
                  <span className="text-[9px] text-muted-foreground">Disable interaction</span>
                </div>
                <Switch
                  checked={component.props?.disabled || false}
                  onCheckedChange={(checked) => handlePropsUpdate('disabled', checked)}
                  className="scale-75"
                />
              </div>

              {/* Read Only */}
              {['input', 'textarea', 'select'].includes(component.type) && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-[10px]">Read Only</Label>
                    <span className="text-[9px] text-muted-foreground">Prevent editing</span>
                  </div>
                  <Switch
                    checked={component.props?.readOnly || false}
                    onCheckedChange={(checked) => handlePropsUpdate('readOnly', checked)}
                    className="scale-75"
                  />
                </div>
              )}

              {/* Custom CSS Classes */}
              <div className="space-y-0.5 pt-2 border-t border-border/50">
                <Label className="text-[10px]">Custom CSS Classes</Label>
                <Input
                  value={component.props?.customClasses || ''}
                  onChange={(e) => handlePropsUpdate('customClasses', e.target.value)}
                  placeholder="my-custom-class"
                  className="h-5 text-[10px]"
                />
              </div>

              {/* ARIA Label */}
              <div className="space-y-0.5">
                <Label className="text-[10px]">ARIA Label</Label>
                <Input
                  value={component.props?.ariaLabel || ''}
                  onChange={(e) => handlePropsUpdate('ariaLabel', e.target.value)}
                  placeholder="Accessibility label"
                  className="h-5 text-[10px]"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </ScrollArea>
  );
}