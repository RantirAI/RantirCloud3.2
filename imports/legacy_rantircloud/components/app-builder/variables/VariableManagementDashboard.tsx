import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, Search, MoreVertical, Edit, Trash2, Play, Clock, TrendingUp, Database, Code, Hash, Activity, Zap, BarChart3, DatabaseIcon, Sparkles } from 'lucide-react';
import { AppVariable, DataProcessingService } from '@/services/dataProcessingService';
import { ComputedVariableEditor } from './ComputedVariableEditor';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { databaseService } from '@/services/databaseService';
import { useAuth } from '@/hooks/useAuth';

interface VariableManagementDashboardProps {
  appProjectId: string;
}

export function VariableManagementDashboard({ appProjectId }: VariableManagementDashboardProps) {
  const [variables, setVariables] = useState<AppVariable[]>([]);
  const [filteredVariables, setFilteredVariables] = useState<AppVariable[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVariable, setSelectedVariable] = useState<AppVariable | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [availableDatabases, setAvailableDatabases] = useState<any[]>([]);
  const { selectedDatabaseId, selectedDatabaseName, setSelectedDatabase } = useAppBuilderStore();
  const { user } = useAuth();

  useEffect(() => {
    loadVariables();
    loadDatabases();
  }, [appProjectId]);

  const loadDatabases = async () => {
    if (!user?.id) return;
    try {
      const databases = await databaseService.getUserDatabases(user.id);
      setAvailableDatabases(databases || []);
    } catch (error) {
      console.error('Error loading databases:', error);
    }
  };

  useEffect(() => {
    const filtered = variables.filter(variable =>
      variable.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      variable.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredVariables(filtered);
  }, [variables, searchTerm]);

  const loadVariables = async () => {
    try {
      const data = await DataProcessingService.getAppVariables(appProjectId);
      setVariables(data);
    } catch (error) {
      console.error('Error loading variables:', error);
      toast.error('Failed to load variables');
    }
  };

  const handleCreateVariable = () => {
    setSelectedVariable(null);
    setIsEditorOpen(true);
  };

  const handleEditVariable = (variable: AppVariable) => {
    setSelectedVariable(variable);
    setIsEditorOpen(true);
  };

  const handleSaveVariable = async (variableData: Omit<AppVariable, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    try {
      if (selectedVariable) {
        await DataProcessingService.updateVariable(selectedVariable.id, variableData);
        toast.success('Variable updated successfully');
      } else {
        await DataProcessingService.createVariable(variableData);
        toast.success('Variable created successfully');
      }
      
      setIsEditorOpen(false);
      setSelectedVariable(null);
      loadVariables();
    } catch (error) {
      console.error('Error saving variable:', error);
      toast.error('Failed to save variable');
    }
  };

  const handleDeleteVariable = async (variable: AppVariable) => {
    if (!confirm(`Are you sure you want to delete "${variable.name}"?`)) return;

    try {
      await DataProcessingService.deleteVariable(variable.id);
      toast.success('Variable deleted successfully');
      loadVariables();
    } catch (error) {
      console.error('Error deleting variable:', error);
      toast.error('Failed to delete variable');
    }
  };

  const handleComputeVariable = async (variable: AppVariable) => {
    setIsLoading(true);
    try {
      await DataProcessingService.computeVariable(variable);
      toast.success('Variable computed successfully');
      loadVariables();
    } catch (error) {
      console.error('Error computing variable:', error);
      toast.error('Failed to compute variable');
    } finally {
      setIsLoading(false);
    }
  };

  const getVariableIcon = (type: string) => {
    switch (type) {
      case 'static':
        return <Hash className="h-4 w-4" />;
      case 'computed':
        return <Code className="h-4 w-4" />;
      case 'aggregation':
        return <Database className="h-4 w-4" />;
      default:
        return <Hash className="h-4 w-4" />;
    }
  };

  const getVariableTypeColor = (type: string) => {
    switch (type) {
      case 'static':
        return 'bg-blue-100 text-blue-800';
      case 'computed':
        return 'bg-green-100 text-green-800';
      case 'aggregation':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return 'No value';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const computedVariablesCount = variables.filter(v => v.variable_type === 'computed').length;
  const aggregationVariablesCount = variables.filter(v => v.variable_type === 'aggregation').length;

  return (
    <div className="space-y-3">
      {/* Database Connection */}
      <div className="space-y-3">
        {availableDatabases.length > 0 && (
          <div className="border border-dashed border-muted-foreground/25 rounded-lg p-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <DatabaseIcon className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="text-sm font-medium">Database Connection</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Connect to your app's database to create data-driven variables
              </p>
              <Select 
                value={selectedDatabaseId || ''} 
                onValueChange={(value) => {
                  const db = availableDatabases.find(d => d.id === value);
                  setSelectedDatabase(value || undefined, db?.name || undefined);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select database" />
                </SelectTrigger>
                <SelectContent>
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
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Input
          placeholder="Search variables by name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8 text-xs"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="relative overflow-hidden">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold">{variables.length}</p>
                <p className="text-xs font-medium text-muted-foreground">Total Variables</p>
              </div>
              <div className="w-6 h-6 bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-full flex items-center justify-center">
                <BarChart3 className="h-3 w-3 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-green-600">
                  {variables.filter(v => v.is_active).length}
                </p>
                <p className="text-xs font-medium text-muted-foreground">Active Variables</p>
              </div>
              <div className="w-6 h-6 bg-gradient-to-r from-green-500/20 to-green-600/20 rounded-full flex items-center justify-center">
                <Activity className="h-3 w-3 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-purple-600">{computedVariablesCount}</p>
                <p className="text-xs font-medium text-muted-foreground">Computed</p>
              </div>
              <div className="w-6 h-6 bg-gradient-to-r from-purple-500/20 to-purple-600/20 rounded-full flex items-center justify-center">
                <Zap className="h-3 w-3 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-orange-600">{aggregationVariablesCount}</p>
                <p className="text-xs font-medium text-muted-foreground">Aggregations</p>
              </div>
              <div className="w-6 h-6 bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-full flex items-center justify-center">
                <Database className="h-3 w-3 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variables List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Variables ({filteredVariables.length})</h4>
          {selectedDatabaseName && (
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-muted text-xs">
              <DatabaseIcon className="h-3 w-3" />
              Connected to {selectedDatabaseName}
            </div>
          )}
        </div>

        {filteredVariables.length > 0 ? (
          <div className="space-y-1">
            {filteredVariables.map((variable, index) => (
              <div 
                key={variable.id} 
                className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-2 flex-1">
                  <div className="mt-0.5">
                    {getVariableIcon(variable.variable_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium">{variable.name}</div>
                    {variable.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {variable.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="secondary"
                    className={`text-xs ${getVariableTypeColor(variable.variable_type)}`}
                  >
                    {variable.variable_type}
                  </Badge>
                  
                  {variable.last_computed_at ? (
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(variable.last_computed_at), { 
                          addSuffix: true 
                        })}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                      <span className="text-xs text-muted-foreground">Never</span>
                    </div>
                  )}
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-background border z-50">
                      <DropdownMenuItem onClick={() => handleEditVariable(variable)}>
                        <Edit className="h-3 w-3 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleComputeVariable(variable)}
                        disabled={isLoading}
                      >
                        <Play className="h-3 w-3 mr-2" />
                        Compute Now
                      </DropdownMenuItem>
                      <Separator />
                      <DropdownMenuItem 
                        onClick={() => handleDeleteVariable(variable)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Database className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium mb-2">No variables found</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {searchTerm ? 'Try adjusting your search terms.' : 'Create your first variable to get started.'}
            </p>
            {!searchTerm && (
              <Button onClick={handleCreateVariable} size="sm">
                <Plus className="h-3 w-3 mr-1" />
                Create Variable
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Variable Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-3 w-3 text-primary" />
              </div>
              {selectedVariable ? 'Edit Variable' : 'Create New Variable'}
            </DialogTitle>
            <DialogDescription>
              {selectedVariable 
                ? 'Modify your variable configuration and computation logic.'
                : 'Set up a new variable for your app with custom data processing capabilities.'
              }
            </DialogDescription>
          </DialogHeader>
          <ComputedVariableEditor
            appProjectId={appProjectId}
            variable={selectedVariable || undefined}
            userId={user?.id || ''}
            onSave={handleSaveVariable}
            onCancel={() => setIsEditorOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}