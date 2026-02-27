import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Variable, 
  Globe,
  FileText,
  Box,
  Edit2, 
  Trash2, 
  MoreVertical,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Zap,
  Hash,
  ToggleLeft,
  Braces,
  List,
  Calendar
} from 'lucide-react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useVariableStore } from '@/stores/variableStore';
import { useAuth } from '@/hooks/useAuth';
import { VariableDataType, VariableScope } from '@/types/variables';
import { toast } from 'sonner';
import { VariableFormPanel } from './VariableFormPanel';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface VariablesPanelProps {
  className?: string;
}

type PanelView = 'list' | 'form';

export function VariablesPanel({ className }: VariablesPanelProps) {
  const { user } = useAuth();
  const { currentProject, currentPage } = useAppBuilderStore();
  const { 
    appVariableDefinitions, 
    pageVariableDefinitions,
    appVariables,
    pageVariables,
    loadAppVariables, 
    loadPageVariables,
    deleteVariable,
    setVariable,
    isLoading 
  } = useVariableStore();
  
  const [activeTab, setActiveTab] = useState<'app' | 'page'>('app');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState<PanelView>('list');
  const [editingVariable, setEditingVariable] = useState<any>(null);
  const [expandedVariables, setExpandedVariables] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (currentProject?.id) {
      loadAppVariables(currentProject.id);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    if (currentProject?.id && currentPage) {
      loadPageVariables(currentProject.id, currentPage);
    }
  }, [currentProject?.id, currentPage]);

  const handleRefresh = () => {
    if (currentProject?.id) {
      loadAppVariables(currentProject.id);
      if (currentPage) {
        loadPageVariables(currentProject.id, currentPage);
      }
    }
  };

  const handleAddVariable = () => {
    setEditingVariable(null);
    setCurrentView('form');
  };

  const handleEditVariable = (variable: any, scope: VariableScope) => {
    setEditingVariable({ ...variable, scope });
    setCurrentView('form');
  };

  const handleFormSuccess = () => {
    setCurrentView('list');
    setEditingVariable(null);
    handleRefresh();
  };

  const handleFormCancel = () => {
    setCurrentView('list');
    setEditingVariable(null);
  };

  const handleDeleteVariable = async (id: string, scope: VariableScope) => {
    if (!confirm('Are you sure you want to delete this variable?')) return;
    
    try {
      await deleteVariable(id, scope);
      toast.success('Variable deleted successfully');
    } catch (error) {
      console.error('Error deleting variable:', error);
      toast.error('Failed to delete variable');
    }
  };

  const handleCopyBinding = (name: string, scope: VariableScope) => {
    const binding = `{{${scope}.${name}}}`;
    navigator.clipboard.writeText(binding);
    toast.success(`Copied: ${binding}`);
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedVariables);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedVariables(newExpanded);
  };

  const getTypeIcon = (dataType: VariableDataType) => {
    switch (dataType) {
      case 'string': return <Variable className="h-3.5 w-3.5" />;
      case 'number': return <Hash className="h-3.5 w-3.5" />;
      case 'boolean': return <ToggleLeft className="h-3.5 w-3.5" />;
      case 'object': return <Braces className="h-3.5 w-3.5" />;
      case 'array': return <List className="h-3.5 w-3.5" />;
      case 'date': return <Calendar className="h-3.5 w-3.5" />;
      default: return <Variable className="h-3.5 w-3.5" />;
    }
  };

  const getTypeColor = (dataType: VariableDataType) => {
    switch (dataType) {
      case 'string': return 'text-blue-500 bg-blue-500/10';
      case 'number': return 'text-green-500 bg-green-500/10';
      case 'boolean': return 'text-purple-500 bg-purple-500/10';
      case 'object': return 'text-orange-500 bg-orange-500/10';
      case 'array': return 'text-pink-500 bg-pink-500/10';
      case 'date': return 'text-cyan-500 bg-cyan-500/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const formatValue = (value: any, dataType: VariableDataType): string => {
    if (value === undefined || value === null) return 'undefined';
    
    switch (dataType) {
      case 'object':
      case 'array':
        try {
          return JSON.stringify(value, null, 2);
        } catch {
          return String(value);
        }
      case 'boolean':
        return value ? 'true' : 'false';
      default:
        return String(value);
    }
  };

  if (!currentProject) {
    return (
      <div className={cn("h-full flex items-center justify-center p-4", className)}>
        <div className="text-center text-muted-foreground">
          <Variable className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select a project to manage variables</p>
        </div>
      </div>
    );
  }

  // Show form view
  if (currentView === 'form') {
    return (
      <VariableFormPanel
        editingVariable={editingVariable}
        defaultScope={activeTab}
        projectId={currentProject.id}
        pageId={currentPage}
        userId={user?.id || ''}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  const currentVariables = activeTab === 'app' ? appVariableDefinitions : pageVariableDefinitions;
  const currentRuntimeValues = activeTab === 'app' ? appVariables : pageVariables;
  
  const filteredVariables = currentVariables.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show list view
  return (
    <div className={cn("h-full flex flex-col bg-background", className)}>
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'app' | 'page')} className="flex-1 flex flex-col">
        <div className="px-2 pt-2">
          <TabsList className="w-full grid grid-cols-2 h-8">
            <TabsTrigger value="app" className="text-xs gap-1.5 h-7">
              <Globe className="h-3 w-3" />
              App
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                {appVariableDefinitions.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="page" className="text-xs gap-1.5 h-7">
              <FileText className="h-3 w-3" />
              Page
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                {pageVariableDefinitions.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Search */}
        <div className="px-2 py-2 flex gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="Search variables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 shrink-0"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* Variables List */}
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1 pb-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : filteredVariables.length === 0 ? (
              <div className="text-center py-8">
                <Variable className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground mb-3">
                  {searchQuery ? 'No variables match your search' : `No ${activeTab} variables yet`}
                </p>
                {!searchQuery && (
                  <Button size="sm" variant="outline" onClick={handleAddVariable} className="text-xs h-7">
                    <Plus className="h-3 w-3 mr-1" />
                    Add {activeTab === 'app' ? 'App' : 'Page'} Variable
                  </Button>
                )}
              </div>
            ) : (
              filteredVariables.map((variable) => {
                const runtimeValue = currentRuntimeValues[variable.name];
                const isExpanded = expandedVariables.has(variable.id);
                
                return (
                  <Card 
                    key={variable.id} 
                    className={cn(
                      "border transition-all",
                      isExpanded && "ring-1 ring-primary/20"
                    )}
                  >
                    <CardContent className="p-2">
                      {/* Variable Header */}
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-6 h-6 rounded flex items-center justify-center shrink-0",
                          getTypeColor(variable.dataType)
                        )}>
                          {getTypeIcon(variable.dataType)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-xs truncate">{variable.name}</span>
                            {variable.isComputed && (
                              <Zap className="h-3 w-3 text-yellow-500 shrink-0" />
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {variable.dataType}
                            {variable.description && ` • ${variable.description}`}
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => handleCopyBinding(variable.name, activeTab)}>
                              <Copy className="h-3.5 w-3.5 mr-2" />
                              Copy Binding
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditVariable(variable, activeTab)}>
                              <Edit2 className="h-3.5 w-3.5 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteVariable(variable.id, activeTab)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 shrink-0"
                          onClick={() => toggleExpanded(variable.id)}
                        >
                          {isExpanded ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                      </div>

                      {/* Expanded Value View */}
                      {isExpanded && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-[10px] text-muted-foreground">Current Value</Label>
                            <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                              {`{{${activeTab}.${variable.name}}}`}
                            </code>
                          </div>
                          <div className="bg-muted rounded p-2 max-h-24 overflow-auto">
                            <pre className="text-[10px] font-mono whitespace-pre-wrap break-all">
                              {formatValue(runtimeValue, variable.dataType)}
                            </pre>
                          </div>
                          
                          {/* Quick Edit for simple types */}
                          {(variable.dataType === 'string' || variable.dataType === 'number') && !variable.isComputed && (
                            <div className="mt-2">
                              <Input
                                type={variable.dataType === 'number' ? 'number' : 'text'}
                                value={runtimeValue ?? ''}
                                onChange={(e) => {
                                  const value = variable.dataType === 'number' 
                                    ? parseFloat(e.target.value) || 0
                                    : e.target.value;
                                  setVariable(activeTab, variable.name, value);
                                }}
                                className="h-7 text-xs"
                                placeholder="Enter value..."
                              />
                            </div>
                          )}
                          
                          {variable.dataType === 'boolean' && !variable.isComputed && (
                            <div className="mt-2 flex gap-2">
                              <Button
                                size="sm"
                                variant={runtimeValue === true ? 'default' : 'outline'}
                                className="flex-1 h-7 text-xs"
                                onClick={() => setVariable(activeTab, variable.name, true)}
                              >
                                True
                              </Button>
                              <Button
                                size="sm"
                                variant={runtimeValue === false ? 'default' : 'outline'}
                                className="flex-1 h-7 text-xs"
                                onClick={() => setVariable(activeTab, variable.name, false)}
                              >
                                False
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>
      </Tabs>

      {/* Add Variable Button */}
      <div className="border-t p-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full h-8 text-xs gap-1.5"
          onClick={handleAddVariable}
        >
          <Plus className="h-3.5 w-3.5" />
          Add {activeTab === 'app' ? 'App' : 'Page'} Variable
        </Button>
      </div>
    </div>
  );
}
