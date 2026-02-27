import React, { useState, useEffect } from 'react';
import { Database, Variable, ChevronDown, Plus, Trash2, Zap, BarChart3, Tag, X, Check } from 'lucide-react';
import { DataBindingTab } from './DataBindingTab';
import { DataDisplayPropertiesTab } from '../DataDisplayPropertiesTab';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useAuth } from '@/hooks/useAuth';
import { AppVariable } from '@/services/dataProcessingService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VisualVariableBuilderTrigger } from '../variables/VisualVariableBuilderTrigger';
import { cn } from '@/lib/utils';

interface DataTabProps {
  component: any;
}

interface DataAttribute {
  key: string;
  value: string;
}

export function DataTab({ component }: DataTabProps) {
  const { user } = useAuth();
  const { currentProject, updateComponent, selectedComponent } = useAppBuilderStore();
  const [variables, setVariables] = useState<AppVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [variablesOpen, setVariablesOpen] = useState(true);
  const [attributesOpen, setAttributesOpen] = useState(true);
  const [isAddingAttribute, setIsAddingAttribute] = useState(false);
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');

  // Determine if this component supports data binding
  const dataBindingComponents = [
    'datatable', 'table', 'dynamic-list', 'pro-dynamic-list', 'dynamic-grid', 
    'chart', 'list', 'select', 'combobox', 'data-display'
  ];
  const supportsDataBinding = dataBindingComponents.includes(component.type);

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
  const handlePropsUpdate = (key: string, value: any) => {
    if (!selectedComponent) return;
    
    updateComponent(selectedComponent, {
      props: {
        ...component.props,
        [key]: value
      }
    });
  };

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
    <ScrollArea className="flex-1 max-h-[calc(100vh-12rem)]" scrollbarVariant="hover-show">
      <div className="p-1.5 space-y-0.5">
        {/* Content/Data Binding Section - Always visible, no collapsible */}
        {supportsDataBinding && (
          <div className="px-1">
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground">Content</span>
              {component.type === 'data-display' ? (
                <DataDisplayPropertiesTab component={component} />
              ) : (
                <DataBindingTab component={component} />
              )}
            </div>
          </div>
        )}

        {/* Data Variables Section */}
        <Collapsible open={variablesOpen} onOpenChange={setVariablesOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-1.5 hover:bg-muted/50 rounded-md transition-colors">
            <span className="text-xs font-medium flex items-center gap-2">
              <Variable className="h-3 w-3" />
              Data Variables
            </span>
            <div className="flex items-center gap-1">
              {currentProject?.id && (
                <div onClick={(e) => e.stopPropagation()}>
                  <VisualVariableBuilderTrigger 
                    appProjectId={currentProject.id}
                    onVariableCreated={loadVariables}
                  />
                </div>
              )}
              <ChevronDown className={cn("h-3 w-3 transition-transform", variablesOpen && "rotate-180")} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-1.5 pb-1.5">
              <p className="text-[10px] text-muted-foreground mb-1.5">
                Use variables with {'{{'} syntax
              </p>
              
              {loading ? (
                <div className="flex items-center justify-center h-12">
                  <div className="text-[10px] text-muted-foreground">Loading...</div>
                </div>
              ) : variables.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-10 text-center">
                  <p className="text-[10px] text-muted-foreground">
                    No variables yet
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {variables.map((variable) => (
                    <div 
                      key={variable.id} 
                      className="flex items-start justify-between p-1 border rounded hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-1 flex-1 min-w-0">
                        <div className="w-4 h-4 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          {getVariableTypeIcon(variable.variable_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <h4 className="text-[10px] font-medium truncate">{variable.name}</h4>
                            <Badge 
                              variant="secondary" 
                              className={`text-[8px] px-1 py-0 h-3 ${getVariableTypeColor(variable.variable_type)}`}
                            >
                              {variable.variable_type}
                            </Badge>
                          </div>
                          <code className="text-[9px] bg-muted px-0.5 rounded">
                            {'{{'}{variable.name}{'}}'} 
                          </code>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteVariable(variable)}
                        className="h-4 w-4 p-0 flex-shrink-0"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Custom Attributes Section */}
        <Collapsible open={attributesOpen} onOpenChange={setAttributesOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-1.5 hover:bg-muted/50 rounded-md transition-colors">
            <span className="text-xs font-medium flex items-center gap-2">
              <Tag className="h-3 w-3" />
              Custom Attributes
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAddingAttribute(true);
                  setAttributesOpen(true);
                }}
                className="p-0.5 rounded hover:bg-muted transition-colors"
              >
                <Plus className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
              <ChevronDown className={cn("h-3 w-3 transition-transform", attributesOpen && "rotate-180")} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-1.5 pb-1.5">
              {/* New attribute input row */}
              {isAddingAttribute && (
                <div className="flex items-center gap-1 mb-1.5">
                  <Input
                    value={newAttrKey}
                    onChange={(e) => setNewAttrKey(e.target.value)}
                    placeholder="data-attr-1"
                    className="h-5 text-[10px] flex-1 font-mono"
                    autoFocus
                  />
                  <span className="text-[10px] text-muted-foreground">=</span>
                  <Input
                    value={newAttrValue}
                    onChange={(e) => setNewAttrValue(e.target.value)}
                    placeholder="value"
                    className="h-5 text-[10px] flex-1"
                  />
                  <button
                    onClick={handleAddAttribute}
                    className="p-0.5 rounded hover:bg-muted transition-colors"
                  >
                    <Check className="h-3 w-3 text-green-600" />
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingAttribute(false);
                      setNewAttrKey('');
                      setNewAttrValue('');
                    }}
                    className="p-0.5 rounded hover:bg-muted transition-colors"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              )}

              {/* Existing attributes list */}
              {dataAttributes.length > 0 ? (
                <div className="space-y-0.5">
                  {dataAttributes.map((attr, index) => (
                    <div key={index} className="flex items-center gap-1 group">
                      <Input
                        value={attr.key}
                        onChange={(e) => handleUpdateAttribute(index, 'key', e.target.value)}
                        className="h-5 text-[10px] flex-1 font-mono"
                      />
                      <span className="text-[10px] text-muted-foreground">=</span>
                      <Input
                        value={attr.value}
                        onChange={(e) => handleUpdateAttribute(index, 'value', e.target.value)}
                        className="h-5 text-[10px] flex-1"
                        placeholder='""'
                      />
                      <button
                        onClick={() => handleRemoveAttribute(index)}
                        className="p-0.5 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : !isAddingAttribute && (
                <p className="text-[10px] text-muted-foreground">
                  No custom attributes
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </ScrollArea>
  );
}
