import React, { useState, useEffect } from 'react';
import { Database, Loader2, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';
import { EmptyStateConfigurator } from './EmptyStateConfigurator';

interface DatabaseInfo {
  id: string;
  name: string;
  color: string | null;
}

interface TableInfo {
  id: string;
  name: string;
  recordCount: number;
  schema: any[];
}

interface DynamicSectionConfiguratorProps {
  component: any;
}

export function DynamicSectionConfigurator({ component }: DynamicSectionConfiguratorProps) {
  const { user } = useAuth();
  const { id: projectId } = useParams<{ id: string }>();
  const { updateComponent, selectedComponent } = useAppBuilderStore();
  
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<string>('');

  const isDynamic = component.props?.isDynamic === true;
  const databaseConnection = component.props?.databaseConnection;
  const connectedTableName = databaseConnection?.tableName;
  const pagination = component.props?.pagination || { enabled: false, itemsPerPage: 10 };
  const emptyState = component.props?.emptyState || { type: 'default' };

  useEffect(() => {
    if (user?.id && isDynamic) {
      loadDatabases();
    }
  }, [user?.id, isDynamic]);

  useEffect(() => {
    if (databaseConnection?.databaseId) {
      setSelectedDatabase(databaseConnection.databaseId);
      loadTables(databaseConnection.databaseId);
    }
    if (databaseConnection?.tableId) {
      setSelectedTable(databaseConnection.tableId);
    }
  }, [databaseConnection]);

  const loadDatabases = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('databases')
        .select('id, name, color')
        .eq('user_id', user.id)
        .order('name');
      if (error) throw error;
      setDatabases(data || []);
    } catch (error) {
      console.error('Error loading databases:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTables = async (databaseId: string) => {
    if (!databaseId) return;
    setLoadingTables(true);
    try {
      const { data, error } = await supabase
        .from('table_projects')
        .select('id, name, records, schema')
        .eq('database_id', databaseId)
        .order('name');
      if (error) throw error;
      setTables((data || []).map(table => ({
        id: table.id,
        name: table.name,
        recordCount: Array.isArray(table.records) ? table.records.length : 0,
        schema: Array.isArray(table.schema) ? table.schema : []
      })));
    } catch (error) {
      console.error('Error loading tables:', error);
    } finally {
      setLoadingTables(false);
    }
  };

  const handleToggleDynamic = (enabled: boolean) => {
    if (!selectedComponent) return;
    
    if (enabled) {
      updateComponent(selectedComponent, {
        props: { ...component.props, isDynamic: true }
      });
      loadDatabases();
    } else {
      const { isDynamic: _, databaseConnection: __, _cachedSchema: ___, pagination: ____, ...restProps } = component.props;
      updateComponent(selectedComponent, {
        props: { ...restProps, isDynamic: false }
      });
      setSelectedDatabase('');
      setSelectedTable('');
      setTables([]);
    }
  };

  const handleDatabaseChange = (databaseId: string) => {
    setSelectedDatabase(databaseId);
    setSelectedTable('');
    loadTables(databaseId);
  };

  const handleTableChange = async (tableId: string) => {
    setSelectedTable(tableId);
    const table = tables.find(t => t.id === tableId);
    if (!table || !selectedComponent) return;
    const database = databases.find(d => d.id === selectedDatabase);

    updateComponent(selectedComponent, {
      props: {
        ...component.props,
        isDynamic: true,
        databaseConnection: {
          databaseId: selectedDatabase,
          databaseName: database?.name,
          tableId: table.id,
          tableName: table.name,
          schema: table.schema,
          fields: table.schema
        },
        _cachedSchema: {
          tableName: table.name,
          schema: table.schema,
          fields: table.schema
        }
      }
    });
    toast.success(`Connected to "${table.name}"`);
  };

  const handleDisconnect = () => {
    if (!selectedComponent) return;
    const { databaseConnection: _, _cachedSchema: __, pagination: ___, ...restProps } = component.props;
    updateComponent(selectedComponent, {
      props: { ...restProps, isDynamic: false }
    });
    setSelectedDatabase('');
    setSelectedTable('');
    setTables([]);
  };

  const handleTogglePagination = (enabled: boolean) => {
    if (!selectedComponent) return;
    updateComponent(selectedComponent, {
      props: {
        ...component.props,
        pagination: { ...pagination, enabled }
      }
    });
  };

  const handleItemsPerPageChange = (value: string) => {
    if (!selectedComponent) return;
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) return;
    updateComponent(selectedComponent, {
      props: {
        ...component.props,
        pagination: { ...pagination, itemsPerPage: num }
      }
    });
  };

  const handleEmptyStateChange = (newEmptyState: typeof emptyState) => {
    if (!selectedComponent) return;
    updateComponent(selectedComponent, {
      props: {
        ...component.props,
        emptyState: newEmptyState
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Toggle row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-3.5 w-3.5 text-muted-foreground" />
          <Label className="text-xs text-muted-foreground">Repeat from Data</Label>
        </div>
        <Switch
          checked={isDynamic}
          onCheckedChange={handleToggleDynamic}
          className="scale-90"
        />
      </div>

      {/* Connected state - inline badge */}
      {isDynamic && connectedTableName && (
        <div className="flex items-center justify-between px-2 py-1.5 bg-primary/10 rounded text-xs">
          <span className="text-primary font-medium">{connectedTableName}</span>
          <button
            onClick={handleDisconnect}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Selection UI */}
      {isDynamic && !connectedTableName && (
        <div className="space-y-2">
          <Select value={selectedDatabase} onValueChange={handleDatabaseChange} disabled={loading}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder={loading ? "Loading..." : "Database"} />
            </SelectTrigger>
            <SelectContent>
              {databases.map(db => (
                <SelectItem key={db.id} value={db.id} className="text-xs">
                  {db.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedDatabase && (
            <Select value={selectedTable} onValueChange={handleTableChange} disabled={loadingTables}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder={loadingTables ? "Loading..." : "Table"} />
              </SelectTrigger>
              <SelectContent>
                {tables.map(table => (
                  <SelectItem key={table.id} value={table.id} className="text-xs">
                    {table.name} ({table.recordCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {(loading || loadingTables) && (
            <div className="flex items-center justify-center py-1">
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      {/* Pagination settings - only show when connected */}
      {isDynamic && connectedTableName && (
        <div className="space-y-2 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Pagination</Label>
            <Switch
              checked={pagination.enabled}
              onCheckedChange={handleTogglePagination}
              className="scale-90"
            />
          </div>
          
          {pagination.enabled && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Items per page</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={pagination.itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(e.target.value)}
                className="h-6 text-xs w-16"
              />
            </div>
          )}
        </div>
      )}

      {/* Empty State settings - only show when connected */}
      {isDynamic && connectedTableName && projectId && (
        <div className="pt-2 border-t border-border/50">
          <EmptyStateConfigurator
            config={emptyState}
            onChange={handleEmptyStateChange}
            projectId={projectId}
          />
        </div>
      )}
    </div>
  );
}
