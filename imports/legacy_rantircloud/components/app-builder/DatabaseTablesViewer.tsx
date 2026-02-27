import { useState, useEffect } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Database, Table, RefreshCw, Plus, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { tableService } from '@/services/tableService';

export function DatabaseTablesViewer() {
  const { currentProject } = useAppBuilderStore();
  const { user } = useAuth();
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
      setTables(data);
    } catch (error) {
      console.error('Failed to load tables:', error);
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTables = tables.filter(table => 
    table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateTable = () => {
    // Navigate to table creation page
    window.open(`/databases/${selectedDatabaseId}`, '_blank');
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
            {selectedDatabase}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateTable}
              className="h-8 px-3 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              New Table
            </Button>
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Separator />

          <ScrollArea className="h-80">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-sm text-muted-foreground">Loading tables...</div>
              </div>
            ) : filteredTables.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <Table className="h-8 w-8 text-muted-foreground mb-2" />
                <div className="text-sm text-muted-foreground">
                  {searchTerm ? 'No tables match your search' : 'No tables found'}
                </div>
                {!searchTerm && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCreateTable}
                    className="mt-2"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Create your first table
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTables.map((table) => (
                  <div
                    key={table.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer group"
                    onClick={() => window.open(`/tables/${table.id}`, '_blank')}
                  >
                    <div className="flex items-center gap-3">
                      <Table className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">{table.name}</div>
                        {table.description && (
                          <div className="text-xs text-muted-foreground">
                            {table.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {Array.isArray(table.records) ? table.records.length : JSON.parse(table.records || '[]').length} records
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {table.schema ? Object.keys(table.schema.fields || {}).length : 0} fields
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}