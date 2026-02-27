import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Database, Table, Plus, Trash2, Settings, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAppBuilderStore } from '@/stores/appBuilderStore';

interface DatabaseField {
  name: string;
  type: string;
  displayName?: string;
}

interface DatabaseTable {
  id?: string;
  name: string;
  fields: DatabaseField[];
}

interface DatabaseProject {
  id: string;
  name: string;
  tables: DatabaseTable[];
}

interface DatabaseBindingFieldProps {
  label: string;
  value: any;
  onChange: (value: any) => void;
  description?: string;
}

export function DatabaseBindingField({ label, value, onChange, description }: DatabaseBindingFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [databases, setDatabases] = useState<DatabaseProject[]>([]);
  const [tableTables, setTableTables] = useState<DatabaseTable[]>([]);
  const [loading, setLoading] = useState(false);
  const { selectedDatabaseId, selectedDatabaseName } = useAppBuilderStore();
  
  // Load databases and table projects on component mount
  useEffect(() => {
    loadDatabases();
    loadTableProjects();
  }, []);

  const loadDatabases = async () => {
    try {
      const { data, error } = await supabase
        .from('databases')
        .select('id, name');
      
      if (error) {
        console.error('Error loading databases:', error);
        return;
      }

      const databasesWithTables = await Promise.all(
        (data || []).map(async (db) => {
          // For now, we'll use a placeholder since we don't have actual table schemas
          // In a real implementation, you'd fetch the actual table structure
          return {
            id: db.id,
            name: db.name,
            tables: [] // Will be populated with actual table schemas
          };
        })
      );

      setDatabases(databasesWithTables);
    } catch (error) {
      console.error('Error loading databases:', error);
    }
  };

  const loadTableProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('table_projects')
        .select('id, name, schema');
      
      if (error) {
        console.error('Error loading table projects:', error);
        return;
      }

      const tables: DatabaseTable[] = (data || []).map(project => {
        // Type guard to check if schema is an object with fields
        const schema = project.schema as any;
        const fields = schema && typeof schema === 'object' && schema.fields 
          ? schema.fields 
          : [];

        return {
          id: project.id, // Include project ID
          name: project.name,
          fields: fields.map((field: any) => ({
            name: field.name || '',
            type: field.type || 'text',
            displayName: field.name 
              ? field.name.charAt(0).toUpperCase() + field.name.slice(1).replace(/([A-Z])/g, ' $1')
              : 'Unknown Field'
          }))
        };
      });

      setTableTables(tables);
    } catch (error) {
      console.error('Error loading table projects:', error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'text':
        return 'bg-green-100 text-green-800';
      case 'number':
        return 'bg-blue-100 text-blue-800';
      case 'boolean':
        return 'bg-purple-100 text-purple-800';
      case 'timestamp':
        return 'bg-orange-100 text-orange-800';
      case 'uuid':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleTableSelect = (source: 'database' | 'table', tableName: string, databaseId?: string) => {
    let table;
    let tableProjectId;
    
    if (source === 'database') {
      const database = databases.find(db => db.id === databaseId);
      table = database?.tables.find(t => t.name === tableName);
    } else {
      table = tableTables.find(t => t.name === tableName);
      // Get the table project ID for data fetching
      tableProjectId = tableTables.find(t => t.name === tableName)?.id;
    }
    
    onChange({
      type: source,
      databaseId: source === 'database' ? databaseId : undefined,
      tableName,
      tableProjectId, // Include project ID for data fetching
      name: tableName,
      fields: table?.fields || []
    });
    setIsOpen(false);
  };

  const currentBinding = value || {};
  const isConnected = currentBinding.type === 'database' || currentBinding.type === 'table';

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{label}</Label>
      
      {isConnected ? (
        <div className="border rounded-lg p-3 bg-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">
                {currentBinding.type === 'database' 
                  ? databases.find(db => db.id === currentBinding.databaseId)?.name || 'Database'
                  : 'Table Project'
                }
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
              className="h-6 px-2"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2 mb-3">
            <Table className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{currentBinding.tableName}</span>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Available Fields:</Label>
            <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
              {currentBinding.fields?.map((field: DatabaseField) => (
                <div key={field.name} className="flex items-center justify-between p-2 rounded bg-muted/50 hover:bg-muted">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono">{field.name}</span>
                    <Badge className={cn("text-xs", getTypeColor(field.type))}>
                      {field.type}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{field.displayName}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 p-2 bg-blue-50 rounded border">
              <p className="text-xs text-blue-700 font-medium mb-1">
                ✓ Connected to {currentBinding.tableName}
              </p>
              <p className="text-xs text-blue-600">
                You can now bind data fields to component properties using the format: <code className="bg-white px-1 rounded">{"{{fieldName}}"}</code>
              </p>
            </div>
          </div>
        </div>
      ) : (
        !selectedDatabaseId ? (
          <div className="border rounded-lg p-4 bg-muted/20 text-center">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-orange-500" />
            <p className="text-sm font-medium text-muted-foreground mb-1">No Database Selected</p>
            <p className="text-xs text-muted-foreground mb-3">
              Please select a database first to see available tables
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // This could trigger opening the database selector
                // For now, just show a message
              }}
            >
              <Database className="h-3 w-3 mr-1" />
              Select Database
            </Button>
          </div>
        ) : (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-3"
              >
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span>Connect to Database Table</span>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <div className="p-4">
                <h4 className="font-medium text-sm mb-3">Select Database Table</h4>
                
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <ScrollArea className="h-64">
                    <div className="space-y-4">
                      {/* Table Projects */}
                      {tableTables.length > 0 && (
                        <div>
                          <h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                            <Table className="h-3 w-3" />
                            Your Tables
                          </h5>
                          <div className="space-y-1">
                            {tableTables.map((table) => (
                              <button
                                key={table.name}
                                onClick={() => handleTableSelect('table', table.name)}
                                className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <Table className="h-3 w-3" />
                                  <span className="text-sm">{table.name}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {table.fields.length} fields
                                  </Badge>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Selected Database Tables Only */}
                      {selectedDatabaseId && (() => {
                        const selectedDatabase = databases.find(db => db.id === selectedDatabaseId);
                        if (selectedDatabase && selectedDatabase.tables.length > 0) {
                          return (
                            <div>
                              <h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                <Database className="h-3 w-3" />
                                {selectedDatabase.name}
                              </h5>
                              <div className="space-y-1">
                                {selectedDatabase.tables.map((table) => (
                                  <button
                                    key={table.name}
                                    onClick={() => handleTableSelect('database', table.name, selectedDatabase.id)}
                                    className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Table className="h-3 w-3" />
                                      <span className="text-sm">{table.name}</span>
                                      <Badge variant="secondary" className="text-xs">
                                        {table.fields.length} fields
                                      </Badge>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {tableTables.length === 0 && (!selectedDatabaseId || databases.find(db => db.id === selectedDatabaseId)?.tables.length === 0) && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No tables available</p>
                          <p className="text-xs">
                            {selectedDatabaseName 
                              ? `No tables found in ${selectedDatabaseName}`
                              : "Create a table project first"
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )
      )}
      
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}