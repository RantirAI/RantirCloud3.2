import { useState, useEffect } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Database, Table, RefreshCw, Link, Unlink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { tableService } from '@/services/tableService';

interface DatabaseTable {
  id: string;
  name: string;
  schema: any;
  records: any[];
  description?: string;
}

export function DataConnectionPanel() {
  const { currentProject, updateComponent, selectedComponent } = useAppBuilderStore();
  const { user } = useAuth();
  const [tables, setTables] = useState<DatabaseTable[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedDatabaseId = currentProject?.settings?.database?.selectedId;
  const selectedDatabase = currentProject?.settings?.database?.selectedName;

  useEffect(() => {
    if (selectedDatabaseId) {
      loadTables();
    }
  }, [selectedDatabaseId]);

  const loadTables = async () => {
    if (!user || !selectedDatabaseId) return;
    
    setLoading(true);
    try {
      const data = await tableService.getTablesByDatabase(selectedDatabaseId);
      // Transform the data to match the expected interface
      const transformedTables = data.map(table => ({
        id: table.id,
        name: table.name,
        schema: table.schema,
        records: Array.isArray(table.records) ? table.records : JSON.parse(String(table.records || '[]')),
        description: table.description || undefined
      }));
      setTables(transformedTables);
    } catch (error) {
      console.error('Failed to load tables:', error);
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectTable = (table: DatabaseTable) => {
    if (!selectedComponent) return;

    updateComponent(selectedComponent, {
      dataSource: {
        type: 'table',
        tableProjectId: table.id,
        tableName: table.name,
        schema: table.schema,
        realTime: true,
        pagination: {
          page: 1,
          pageSize: 10
        }
      }
    });
  };

  const handleDisconnectTable = () => {
    if (!selectedComponent) return;

    updateComponent(selectedComponent, {
      dataSource: null
    });
  };

  if (!selectedDatabase) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Database className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-4">
            No database selected. Select a database from the header to view its tables.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4" />
            {selectedDatabase} Tables
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadTables}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-sm text-muted-foreground">Loading tables...</div>
            </div>
          ) : tables.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-sm text-muted-foreground">No tables found</div>
            </div>
          ) : (
            <div className="space-y-2">
              {tables.map((table) => (
                <div
                  key={table.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <Table className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-sm">{table.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {table.records?.length || 0} records
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {Object.keys(table.schema?.fields || {}).length} fields
                    </Badge>
                    {selectedComponent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleConnectTable(table)}
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                      >
                        <Link className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}