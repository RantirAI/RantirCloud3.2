import React, { useEffect, useMemo, useState } from 'react';
import { Database, Variable, Eye, Zap, BarChart3, Trash2, Type, ChevronDown, ChevronRight, Plus, Check, X, Tag } from 'lucide-react';
import { DataBindingTab } from './DataBindingTab';
import { DataDisplayPropertiesTab } from '../DataDisplayPropertiesTab';
import { DynamicSectionConfigurator } from './DynamicSectionConfigurator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useVariableStore } from '@/stores/variableStore';
import { useAuth } from '@/hooks/useAuth';
import { AppVariable } from '@/services/dataProcessingService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VisualVariableBuilderTrigger } from '../variables/VisualVariableBuilderTrigger';
import { getCategorizedProperties, PropertyField } from '@/lib/componentPropertyConfig';
import { AdvancedPropertyFieldRenderer } from './AdvancedPropertyFieldRenderer';
import { ActiveItemsEditor } from './ActiveItemsEditor';
import { NavHorizontalItemsEditor } from './NavHorizontalProperties';
import { NavVerticalItemsEditor } from './NavVerticalProperties';
import { cn } from '@/lib/utils';

interface DataSettingsTabProps {
  component: any;
}

interface DataAttribute {
  key: string;
  value: string;
}

interface SectionHeaderProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  icon?: React.ReactNode;
}

function SectionHeader({ title, isOpen, onToggle, icon }: SectionHeaderProps) {
  return (
    <CollapsibleTrigger asChild>
      <div className="flex items-center justify-between w-full py-2 px-2 hover:bg-muted/50 cursor-pointer border-b border-border/50">
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
          {icon}
          <span className="font-medium text-xs text-muted-foreground">{title}</span>
        </div>
      </div>
    </CollapsibleTrigger>
  );
}

// Visibility condition interface
interface VisibilityCondition {
  variableBinding: string;
  variableType: string;
  operator: string;
  value: any;
}

// Get operators based on variable type
const getOperatorsForType = (dataType: string) => {
  switch (dataType) {
    case 'boolean':
      return [{ value: 'equals', label: 'Is' }];
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
        { value: 'isEmpty', label: 'Is Empty' },
        { value: 'isNotEmpty', label: 'Is Not Empty' },
      ];
    case 'array':
      return [
        { value: 'isEmpty', label: 'Is Empty' },
        { value: 'isNotEmpty', label: 'Has Items' },
        { value: 'lengthEquals', label: 'Length =' },
      ];
    default:
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'notEquals', label: 'Not Equals' },
      ];
  }
};

const operatorNeedsValue = (operator: string) => !['isEmpty', 'isNotEmpty'].includes(operator);

const getDataTypeBadgeColor = (dataType: string) => {
  switch (dataType) {
    case 'boolean': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'number': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'string': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'array': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    default: return 'bg-muted text-muted-foreground';
  }
};

export function DataSettingsTab({ component }: DataSettingsTabProps) {
  const { user } = useAuth();
  const { currentProject, currentPage, updateComponent, selectedComponent } = useAppBuilderStore();
  const { 
    appVariableDefinitions, 
    pageVariableDefinitions,
    loadAppVariables,
    loadPageVariables,
  } = useVariableStore();
  const [variables, setVariables] = useState<AppVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibilityBindingOpen, setVisibilityBindingOpen] = useState(false);

  // Ensure variable definitions are loaded so visibility-binding picker always has options
  useEffect(() => {
    if (currentProject?.id) {
      loadAppVariables(currentProject.id);
      if (currentPage) {
        loadPageVariables(currentProject.id, currentPage);
      }
    }
  }, [currentProject?.id, currentPage, loadAppVariables, loadPageVariables]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    content: true,
    behavior: component.type === 'tabs' || component.type === 'accordion',
    data: true,
    dynamicSection: true,
    settings: false,
    customAttributes: true,
  });
  const [isAddingAttribute, setIsAddingAttribute] = useState(false);
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');

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
    const binding = component.props?.visibilityBinding;
    if (binding) {
      return { variableBinding: binding, variableType: 'boolean', operator: 'equals', value: true };
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
  const currentOperators = conditionInfo ? getOperatorsForType(conditionInfo.dataType) : [];

  // Determine if this component supports data binding
  const dataBindingComponents = [
    'datatable', 'table', 'dynamic-list', 'pro-dynamic-list', 'dynamic-grid', 
    'chart', 'list', 'select', 'combobox', 'data-display'
  ];
  const supportsDataBinding = dataBindingComponents.includes(component.type);

  // Determine if this component can be made dynamic (repeater)
  const dynamicSectionComponents = ['section', 'container', 'div', 'card'];
  const supportsDynamicSection = dynamicSectionComponents.includes(component.type);

  // Get content properties for this component type
  const categorizedProperties = getCategorizedProperties(component.type);
  const isTabsOrAccordion = component.type === 'tabs' || component.type === 'accordion';
  const contentProperties = [
    ...categorizedProperties.content.filter(
      (prop) =>
        ![
          "backgroundColor",
          "backgroundGradient",
          "backgroundImage",
          "border",
          "borderRadius",
        ].includes(prop.name) &&
        // Filter out items-editor for tabs/accordion - handled by ActiveItemsEditor
        !(isTabsOrAccordion && prop.type === 'items-editor'),
    ),
    ...categorizedProperties.styling.filter((prop) =>
      ["objectFit", "lazy", "color", "fontSize", "textAlign", "fontWeight", "textDecoration"].includes(
        prop.name,
      ),
    ),
  ].filter(prop => prop.category !== "data" && prop.category !== "interactions");

  const hasContentProperties = contentProperties.length > 0;

  // Behavior properties (e.g. default active tab/accordion item, animation)
  // Filter out active-item-selector for tabs/accordion - those are handled by ActiveItemsEditor
  const behaviorProperties = categorizedProperties.behavior.filter(prop => 
    !isTabsOrAccordion || (prop.type !== 'active-item-selector')
  );
  const hasBehaviorProperties = behaviorProperties.length > 0;

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  useEffect(() => {
    if (currentProject?.id && user?.id) {
      loadVariables();
    }
  }, [currentProject?.id, user?.id]);

  const loadVariables = async () => {
    if (!currentProject?.id || !user?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('app_variables')
        .select('*')
        .eq('app_project_id', currentProject.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVariables(data?.map(v => ({
        ...v,
        variable_type: v.variable_type as 'static' | 'computed' | 'aggregation'
      })) || []);
    } catch (error) {
      console.error('Error loading variables:', error);
      toast.error('Failed to load variables');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVariable = async (variable: AppVariable) => {
    if (!confirm('Are you sure you want to delete this variable?')) return;

    try {
      const { error } = await supabase
        .from('app_variables')
        .delete()
        .eq('id', variable.id);

      if (error) throw error;
      toast.success('Variable deleted successfully');
      loadVariables();
    } catch (error) {
      console.error('Error deleting variable:', error);
      toast.error('Failed to delete variable');
    }
  };

  const handleUpdate = (key: string, value: any) => {
    if (!selectedComponent) return;
    updateComponent(selectedComponent, { [key]: value });
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

  const getVariableTypeIcon = (type: string) => {
    switch (type) {
      case 'static': return <Variable className="h-3 w-3" />;
      case 'computed': return <Zap className="h-3 w-3" />;
      case 'aggregation': return <BarChart3 className="h-3 w-3" />;
      default: return <Variable className="h-3 w-3" />;
    }
  };

  const getVariableTypeColor = (type: string) => {
    switch (type) {
      case 'static': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'computed': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'aggregation': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Custom Attributes logic
  const getDataAttributes = (): DataAttribute[] => {
    const attrs = component.props?.dataAttributes;
    if (!attrs) return [];
    
    try {
      if (typeof attrs === 'string') {
        const parsed = JSON.parse(attrs);
        return Object.entries(parsed).map(([key, value]) => ({
          key,
          value: String(value)
        }));
      } else if (typeof attrs === 'object') {
        return Object.entries(attrs).map(([key, value]) => ({
          key,
          value: String(value)
        }));
      }
    } catch {
      return [];
    }
    return [];
  };

  const dataAttributes = getDataAttributes();

  const updateDataAttributes = (attrs: DataAttribute[]) => {
    const obj: Record<string, string> = {};
    attrs.forEach(attr => {
      if (attr.key) obj[attr.key] = attr.value;
    });
    handlePropsUpdate('dataAttributes', JSON.stringify(obj));
  };

  const handleAddAttribute = () => {
    if (!newAttrKey.trim()) return;
    
    const newAttrs = [...dataAttributes, { key: newAttrKey.trim(), value: newAttrValue }];
    updateDataAttributes(newAttrs);
    setNewAttrKey('');
    setNewAttrValue('');
    setIsAddingAttribute(false);
  };

  const handleRemoveAttribute = (index: number) => {
    const newAttrs = dataAttributes.filter((_, i) => i !== index);
    updateDataAttributes(newAttrs);
  };

  const handleUpdateAttribute = (index: number, field: 'key' | 'value', value: string) => {
    const newAttrs = [...dataAttributes];
    newAttrs[index] = { ...newAttrs[index], [field]: value };
    updateDataAttributes(newAttrs);
  };

  return (
    <div>
      <div className="p-3 space-y-3">
        {/* Navigation Items Editor for horizontal/vertical nav */}
        {component.type === 'nav-horizontal' && (
          <NavHorizontalItemsEditor
            component={component}
            onUpdate={(updates) => selectedComponent && updateComponent(selectedComponent, updates)}
          />
        )}
        {component.type === 'nav-vertical' && (
          <NavVerticalItemsEditor
            component={component}
            onUpdate={(updates) => selectedComponent && updateComponent(selectedComponent, updates)}
          />
        )}

        {/* Variables Button - Full Width Secondary */}
        {currentProject?.id && (
          <VisualVariableBuilderTrigger 
            appProjectId={currentProject.id}
            onVariableCreated={loadVariables}
            fullWidth
          />
        )}

        {/* Variables List */}
        {variables.length > 0 && (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {variables.map((variable) => (
              <div 
                key={variable.id} 
                className="flex items-start justify-between p-2 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <div className="w-5 h-5 rounded bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    {getVariableTypeIcon(variable.variable_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      <h4 className="text-xs font-medium truncate">{variable.name}</h4>
                      <Badge 
                        variant="secondary" 
                        className={`text-[10px] px-1 py-0 h-4 ${getVariableTypeColor(variable.variable_type)}`}
                      >
                        {variable.variable_type}
                      </Badge>
                    </div>
                    <code className="text-[10px] bg-muted px-1 rounded inline-block">
                      {'{{'}{variable.name}{'}}'} 
                    </code>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteVariable(variable)}
                  className="h-5 w-5 p-0 flex-shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Content Section - always visible, no collapsible, no duplicate label */}
        {hasContentProperties && (
        <div className="flex flex-col gap-1.5">
            {contentProperties.map((property) => {
               // Icon-related fields and icon-picker should be full width and stacked
               const isFullWidth = [
                "spacing",
                "interactions",
                "variable-binding",
                "database-binding",
                "border-radius",
                "items-editor",
                "code-editor",
                "icon-picker",
              ].includes(property.type) || 
              // Stack icon-related select fields vertically
              (property.name === 'iconVariant');
              
              return (
                <div key={property.name} className="w-full">
                  <AdvancedPropertyFieldRenderer
                    field={property}
                    value={component.props?.[property.name]}
                    onChange={(value) => handlePropsUpdate(property.name, value)}
                    component={component}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Active Items Editor for Tabs/Accordion - combined item management + active selection */}
        {isTabsOrAccordion && (
          <ActiveItemsEditor
            items={(() => {
              const rawItems = component.props?.items || [];
              if (Array.isArray(rawItems)) return rawItems;
              if (typeof rawItems === 'string') {
                try { return JSON.parse(rawItems); } catch { return []; }
              }
              return [];
            })()}
            onChange={(newItems) => handlePropsUpdate('items', JSON.stringify(newItems))}
            activeValue={component.props?.defaultValue || ''}
            onActiveChange={(value) => handlePropsUpdate('defaultValue', value)}
            itemType={component.type as 'tabs' | 'accordion'}
            fields={component.type === 'accordion' 
              ? [
                  { name: 'title', label: 'Title', type: 'text' as const, placeholder: 'Section title' },
                  { name: 'content', label: 'Content', type: 'textarea' as const, placeholder: 'Section content' }
                ]
              : [
                  { name: 'label', label: 'Label', type: 'text' as const, placeholder: 'Tab label' },
                  { name: 'content', label: 'Content', type: 'textarea' as const, placeholder: 'Tab content' }
                ]
            }
            componentId={component.id}
          />
        )}

        {/* Behavior Section - animation settings for tabs/accordion, or all behavior for other components */}
        {hasBehaviorProperties && (
          <Collapsible open={openSections.behavior} onOpenChange={() => toggleSection('behavior')}>
            <SectionHeader
              title={isTabsOrAccordion ? "Animation" : "Behavior"}
              isOpen={openSections.behavior}
              onToggle={() => toggleSection('behavior')}
              icon={<Zap className="h-3 w-3 text-muted-foreground" />}
            />
            <CollapsibleContent>
              <div className="p-1.5 bg-card">
                <div className="grid grid-cols-2 gap-1.5">
                  {behaviorProperties.map((property) => {
                    const isFullWidth = [
                      'spacing',
                      'interactions',
                      'variable-binding',
                      'database-binding',
                      'border-radius',
                      'items-editor',
                    ].includes(property.type);

                    return (
                      <div key={property.name} className={isFullWidth ? 'col-span-2' : 'col-span-1'}>
                        <AdvancedPropertyFieldRenderer
                          field={property}
                          value={component.props?.[property.name]}
                          onChange={(value) => handlePropsUpdate(property.name, value)}
                          component={component}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}


        {/* Dynamic Section Configurator - for container types */}
        {supportsDynamicSection && (
          <DynamicSectionConfigurator component={component} />
        )}

        {supportsDataBinding && (
          <Collapsible open={openSections.data} onOpenChange={() => toggleSection('data')}>
            <SectionHeader
              title="Database Binding"
              isOpen={openSections.data}
              onToggle={() => toggleSection('data')}
              icon={<Database className="h-3 w-3 text-muted-foreground" />}
            />
            <CollapsibleContent>
              <div className="bg-card">
                {component.type === 'data-display' ? (
                  <DataDisplayPropertiesTab component={component} />
                ) : (
                  <DataBindingTab component={component} />
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Separator */}
        <div className="border-t border-border" />

        {/* Settings Section - Component ID only */}
        <div className="space-y-1.5">
          <Label className="text-xs">Component ID</Label>
          <Input
            value={component.id || ''}
            onChange={(e) => handleUpdate('id', e.target.value)}
            placeholder="component-id"
            className="h-7 text-xs"
          />
        </div>

        {/* Custom Attributes Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold flex items-center gap-2">
              Custom Attributes
            </Label>
            <button
              onClick={() => {
                setIsAddingAttribute(true);
                setNewAttrKey(`data-attr-${dataAttributes.length + 1}`);
                setNewAttrValue('');
              }}
              className="p-0.5 rounded hover:bg-muted transition-colors"
            >
              <Plus className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
          
          <div className="space-y-1.5">
            {/* New attribute input row */}
            {isAddingAttribute && (
              <div className="flex items-center gap-1.5">
                <Input
                  value={newAttrKey}
                  onChange={(e) => setNewAttrKey(e.target.value)}
                  placeholder="data-attr-1"
                  className="h-7 text-xs flex-1 font-mono"
                  autoFocus
                />
                <span className="text-xs text-muted-foreground">=</span>
                <Input
                  value={newAttrValue}
                  onChange={(e) => setNewAttrValue(e.target.value)}
                  placeholder="value"
                  className="h-7 text-xs flex-1"
                />
                <button
                  onClick={handleAddAttribute}
                  className="p-1 rounded hover:bg-muted transition-colors"
                >
                  <Check className="h-3.5 w-3.5 text-green-600" />
                </button>
                <button
                  onClick={() => {
                    setIsAddingAttribute(false);
                    setNewAttrKey('');
                    setNewAttrValue('');
                  }}
                  className="p-1 rounded hover:bg-muted transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            )}

            {/* Existing attributes list */}
            {dataAttributes.length > 0 ? (
              <div className="space-y-1">
                {dataAttributes.map((attr, index) => (
                  <div key={index} className="flex items-center gap-1.5 group">
                    <Input
                      value={attr.key}
                      onChange={(e) => handleUpdateAttribute(index, 'key', e.target.value)}
                      className="h-7 text-xs flex-1 font-mono"
                    />
                    <span className="text-xs text-muted-foreground">=</span>
                    <Input
                      value={attr.value}
                      onChange={(e) => handleUpdateAttribute(index, 'value', e.target.value)}
                      className="h-7 text-xs flex-1"
                      placeholder='""'
                    />
                    <button
                      onClick={() => handleRemoveAttribute(index)}
                      className="p-1 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            ) : !isAddingAttribute && (
              <p className="text-xs text-muted-foreground">
                No custom attributes
              </p>
            )}
          </div>
        </div>

        {/* Visibility Settings */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold flex items-center gap-2">
            <Eye className="h-3 w-3" />
            Visibility & Behavior
          </Label>
          
          <div className="space-y-3 border rounded-lg p-3">
            {/* Hidden with Bind Button */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs">Hidden</Label>
                  <p className="text-[10px] text-muted-foreground">Hide from view</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Bind Button */}
                  <Popover open={visibilityBindingOpen} onOpenChange={setVisibilityBindingOpen}>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className={cn(
                          "h-6 w-6 p-0",
                          conditionInfo && "text-purple-500 bg-purple-500/10"
                        )}
                        title="Bind to variable"
                      >
                        <Variable className="h-3.5 w-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="end">
                      <Tabs defaultValue="page" className="w-full">
                        <TabsList className="w-full grid grid-cols-2 h-8">
                          <TabsTrigger value="page" className="text-xs h-7">Page</TabsTrigger>
                          <TabsTrigger value="app" className="text-xs h-7">App</TabsTrigger>
                        </TabsList>
                        <TabsContent value="page" className="m-0">
                          <div className="p-1 max-h-48 overflow-y-auto">
                            {allVariables.pageVars.length === 0 ? (
                              <p className="text-xs text-muted-foreground p-3 text-center">
                                No page variables
                              </p>
                            ) : (
                              allVariables.pageVars.map(v => (
                                <Button
                                  key={v.id}
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start h-8 text-xs px-2"
                                  onClick={() => {
                                    const condition: VisibilityCondition = {
                                      variableBinding: v.binding,
                                      variableType: v.dataType,
                                      operator: 'equals',
                                      value: v.dataType === 'boolean' ? true : v.dataType === 'number' ? 0 : ''
                                    };
                                    handlePropsUpdate('visibilityCondition', condition);
                                    handlePropsUpdate('visibilityBinding', v.binding);
                                    setVisibilityBindingOpen(false);
                                  }}
                                >
                                  <Variable className="h-3 w-3 mr-2 text-purple-500" />
                                  <span className="flex-1 text-left truncate">{v.name}</span>
                                  <Badge variant="outline" className={cn("h-5 text-[9px] px-1.5 border", getDataTypeBadgeColor(v.dataType))}>
                                    {v.dataType}
                                  </Badge>
                                </Button>
                              ))
                            )}
                          </div>
                        </TabsContent>
                        <TabsContent value="app" className="m-0">
                          <div className="p-1 max-h-48 overflow-y-auto">
                            {allVariables.appVars.length === 0 ? (
                              <p className="text-xs text-muted-foreground p-3 text-center">
                                No app variables
                              </p>
                            ) : (
                              allVariables.appVars.map(v => (
                                <Button
                                  key={v.id}
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start h-8 text-xs px-2"
                                  onClick={() => {
                                    const condition: VisibilityCondition = {
                                      variableBinding: v.binding,
                                      variableType: v.dataType,
                                      operator: 'equals',
                                      value: v.dataType === 'boolean' ? true : v.dataType === 'number' ? 0 : ''
                                    };
                                    handlePropsUpdate('visibilityCondition', condition);
                                    handlePropsUpdate('visibilityBinding', v.binding);
                                    setVisibilityBindingOpen(false);
                                  }}
                                >
                                  <Variable className="h-3 w-3 mr-2 text-purple-500" />
                                  <span className="flex-1 text-left truncate">{v.name}</span>
                                  <Badge variant="outline" className={cn("h-5 text-[9px] px-1.5 border", getDataTypeBadgeColor(v.dataType))}>
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
                            className="w-full h-7 text-xs text-muted-foreground"
                            onClick={() => {
                              handlePropsUpdate('visibilityCondition', null);
                              handlePropsUpdate('visibilityBinding', null);
                              setVisibilityBindingOpen(false);
                            }}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Clear Binding
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  <Switch
                    checked={component.props?.hidden || false}
                    onCheckedChange={(checked) => handlePropsUpdate('hidden', checked)}
                    disabled={!!conditionInfo}
                  />
                </div>
              </div>

              {/* Condition Builder */}
              {conditionInfo && (
                <div className="space-y-2 p-2.5 rounded-md bg-purple-500/5 border border-purple-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-purple-400 font-medium">Show when condition is met</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        handlePropsUpdate('visibilityCondition', null);
                        handlePropsUpdate('visibilityBinding', null);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-xs">
                    <Variable className="h-3 w-3 text-purple-500" />
                    <Badge variant="outline" className={cn("h-5 text-[9px] px-1.5 border", getDataTypeBadgeColor(conditionInfo.dataType))}>
                      {conditionInfo.scope}
                    </Badge>
                    <span className="font-medium">{conditionInfo.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={conditionInfo.operator}
                      onValueChange={(operator) => {
                        handlePropsUpdate('visibilityCondition', {
                          ...visibilityCondition,
                          operator,
                          value: operatorNeedsValue(operator) ? visibilityCondition?.value : null
                        });
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currentOperators.map(op => (
                          <SelectItem key={op.value} value={op.value} className="text-xs">
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {operatorNeedsValue(conditionInfo.operator) && (
                      <div className="flex-1">
                        {conditionInfo.dataType === 'boolean' ? (
                          <Select
                            value={String(visibilityCondition?.value)}
                            onValueChange={(v) => handlePropsUpdate('visibilityCondition', { ...visibilityCondition, value: v === 'true' })}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true" className="text-xs">True</SelectItem>
                              <SelectItem value="false" className="text-xs">False</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : conditionInfo.dataType === 'number' ? (
                          <Input
                            type="number"
                            value={visibilityCondition?.value ?? ''}
                            onChange={(e) => handlePropsUpdate('visibilityCondition', { ...visibilityCondition, value: Number(e.target.value) })}
                            className="h-7 text-xs"
                            placeholder="0"
                          />
                        ) : (
                          <Input
                            type="text"
                            value={visibilityCondition?.value ?? ''}
                            onChange={(e) => handlePropsUpdate('visibilityCondition', { ...visibilityCondition, value: e.target.value })}
                            className="h-7 text-xs"
                            placeholder="Value..."
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Show in Canvas Override */}
                  <div className="flex items-center justify-between pt-2 border-t border-purple-500/10">
                    <div className="flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      <Label className="text-[10px] text-muted-foreground">Show in canvas</Label>
                    </div>
                    <Switch
                      checked={component.props?.forceShowInCanvas || false}
                      onCheckedChange={(checked) => handlePropsUpdate('forceShowInCanvas', checked)}
                      className="scale-75"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs">Disabled</Label>
                <p className="text-[10px] text-muted-foreground">Disable interaction</p>
              </div>
              <Switch
                checked={component.props?.disabled || false}
                onCheckedChange={(checked) => handlePropsUpdate('disabled', checked)}
              />
            </div>

            {['input', 'textarea', 'select'].includes(component.type) && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs">Read Only</Label>
                  <p className="text-[10px] text-muted-foreground">Prevent editing</p>
                </div>
                <Switch
                  checked={component.props?.readOnly || false}
                  onCheckedChange={(checked) => handlePropsUpdate('readOnly', checked)}
                />
              </div>
            )}

            {/* CSS Classes */}
            <div className="space-y-1.5 pt-2 border-t border-border/50">
              <Label className="text-xs">Custom CSS Classes</Label>
              <Input
                value={component.props?.customClasses || ''}
                onChange={(e) => handlePropsUpdate('customClasses', e.target.value)}
                placeholder="my-custom-class"
                className="h-7 text-xs"
              />
            </div>

            {/* ARIA Label */}
            <div className="space-y-1.5">
              <Label className="text-xs">ARIA Label</Label>
              <Input
                value={component.props?.ariaLabel || ''}
                onChange={(e) => handlePropsUpdate('ariaLabel', e.target.value)}
                placeholder="Accessibility label"
                className="h-7 text-xs"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}