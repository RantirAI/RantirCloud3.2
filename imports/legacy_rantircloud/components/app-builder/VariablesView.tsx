import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Database, 
  BarChart3, 
  Play, 
  Edit, 
  Trash2, 
  Eye, 
  Settings,
  Link2,
  Zap,
  Variable,
  GitBranch,
  Filter,
  Sparkles,
  GitMerge
} from 'lucide-react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { useAuth } from '@/hooks/useAuth';
import { AppVariable, DataProcessingService } from '@/services/dataProcessingService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DataQueryBuilder } from './variables/DataQueryBuilder';
import { ComputedVariableEditor } from './variables/ComputedVariableEditor';
import { VisualVariableBuilderTrigger } from './variables/VisualVariableBuilderTrigger';

export function VariablesView() {
  const { user } = useAuth();
  const { currentProject } = useAppBuilderStore();
  const [variables, setVariables] = useState<AppVariable[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingVariable, setEditingVariable] = useState<AppVariable | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableDatabases, setAvailableDatabases] = useState<any[]>([]);
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string | undefined>();
  const [selectedDatabaseName, setSelectedDatabaseName] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (currentProject?.id && user?.id) {
      loadVariables();
      loadDatabases();
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

  const loadDatabases = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('databases')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setAvailableDatabases(data || []);
    } catch (error) {
      console.error('Error loading databases:', error);
    }
  };

  const handleCreateVariable = () => {
    setEditingVariable(null);
    setIsCreating(true);
  };

  const handleEditVariable = (variable: AppVariable) => {
    setEditingVariable(variable);
    setIsCreating(true);
  };

  const handleSaveVariable = async (variableData: Omit<AppVariable, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (editingVariable) {
        // Update existing variable
        const { error } = await supabase
          .from('app_variables')
          .update({
            ...variableData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingVariable.id);

        if (error) throw error;
        toast.success('Variable updated successfully');
      } else {
        // Create new variable
        const { error } = await supabase
          .from('app_variables')
          .insert([variableData]);

        if (error) throw error;
        toast.success('Variable created successfully');
      }

      setIsCreating(false);
      setEditingVariable(null);
      loadVariables();
    } catch (error) {
      console.error('Error saving variable:', error);
      toast.error('Failed to save variable');
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
      case 'static': return <Variable className="h-4 w-4" />;
      case 'computed': return <Zap className="h-4 w-4" />;
      case 'aggregation': return <BarChart3 className="h-4 w-4" />;
      default: return <Variable className="h-4 w-4" />;
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

  const activeVariables = variables.filter(v => v.is_active);
  const computedVariables = variables.filter(v => v.variable_type === 'computed');
  const aggregationVariables = variables.filter(v => v.variable_type === 'aggregation');

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium">No Project Selected</h3>
          <p className="text-muted-foreground">Please select an app project to manage variables</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b px-4 py-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <Variable className="h-5 w-5" />
                Variables
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Create computed variables and data aggregations for your app
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleCreateVariable} className="gap-2">
                <Plus className="h-4 w-4" />
                New Variable
              </Button>
              {currentProject?.id && (
                <VisualVariableBuilderTrigger 
                  appProjectId={currentProject.id}
                  onVariableCreated={loadVariables}
                />
              )}
            </div>
          </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          {/* Tab Navigation */}
          <div className="px-4 pt-2">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="static">Static Values</TabsTrigger>
              <TabsTrigger value="computed">Computed</TabsTrigger>
              <TabsTrigger value="aggregations">Database Aggregations</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden px-4 pb-4">
            <TabsContent value="overview" className="h-full mt-4">
              <div className="h-full space-y-6">
                {/* Database Connection Card */}
                {availableDatabases.length > 0 && (
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-primary" />
                          <span className="text-sm">Database Connection</span>
                        </div>
                        <Select 
                          value={selectedDatabaseId || ''} 
                          onValueChange={(value) => {
                            const db = availableDatabases.find(d => d.id === value);
                            setSelectedDatabaseId(value || undefined);
                            setSelectedDatabaseName(db?.name || undefined);
                          }}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select database" />
                          </SelectTrigger>
                          <SelectContent className="z-[9999] bg-background border shadow-lg">
                            {availableDatabases.map((db) => (
                              <SelectItem key={db.id} value={db.id}>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: db.color }} />
                                  {db.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="relative overflow-hidden">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Variables</p>
                          <p className="text-3xl font-bold">{variables.length}</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-full flex items-center justify-center">
                          <Variable className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="relative overflow-hidden">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Active Variables</p>
                          <p className="text-3xl font-bold text-green-600">{activeVariables.length}</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-green-500/20 to-green-600/20 rounded-full flex items-center justify-center">
                          <Eye className="h-6 w-6 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="relative overflow-hidden">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Computed Variables</p>
                          <p className="text-3xl font-bold text-purple-600">{computedVariables.length}</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500/20 to-purple-600/20 rounded-full flex items-center justify-center">
                          <Zap className="h-6 w-6 text-purple-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="relative overflow-hidden">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Aggregations</p>
                          <p className="text-3xl font-bold text-orange-600">{aggregationVariables.length}</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-full flex items-center justify-center">
                          <BarChart3 className="h-6 w-6 text-orange-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Variables List */}
                <Card className="flex-1">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Variable className="h-5 w-5" />
                        Variables ({variables.length})
                      </span>
                      <div className="text-sm text-muted-foreground">
                        Connected to {selectedDatabaseName || 'No database'}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      {loading ? (
                        <div className="flex items-center justify-center h-32">
                          <div className="text-sm text-muted-foreground">Loading variables...</div>
                        </div>
                      ) : variables.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-center">
                          <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
                          <h3 className="text-sm font-medium text-muted-foreground mb-2">No variables yet</h3>
                          <p className="text-xs text-muted-foreground mb-4">
                            Create your first variable to start building dynamic, data-driven components for your app.
                          </p>
                          <Button onClick={handleCreateVariable} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Your First Variable
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {variables.map((variable) => (
                            <div 
                              key={variable.id} 
                              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                  {getVariableTypeIcon(variable.variable_type)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{variable.name}</h4>
                                    <Badge 
                                      variant="secondary" 
                                      className={getVariableTypeColor(variable.variable_type)}
                                    >
                                      {variable.variable_type}
                                    </Badge>
                                    {!variable.is_active && (
                                      <Badge variant="outline" className="text-xs">
                                        Inactive
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {variable.description || 'No description'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditVariable(variable)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteVariable(variable)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="static" className="h-full mt-4">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Static Variables</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    Static variables content will be implemented here
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="computed" className="h-full mt-4">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Computed Variables</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    Computed variables content will be implemented here
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="aggregations" className="h-full mt-4">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Database Aggregations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    Database aggregation builder will be implemented here with visual table connections
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Variable Editor Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating} modal={false}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-3 w-3 text-primary" />
              </div>
              {editingVariable ? 'Edit Variable' : 'Create New Variable'}
            </DialogTitle>
            <DialogDescription>
              {editingVariable 
                ? 'Modify your variable configuration and computation logic.'
                : 'Set up a new variable for your app with custom data processing capabilities.'
              }
            </DialogDescription>
          </DialogHeader>
          <ComputedVariableEditor
            appProjectId={currentProject.id}
            variable={editingVariable || undefined}
            userId={user?.id || ''}
            onSave={handleSaveVariable}
            onCancel={() => setIsCreating(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}