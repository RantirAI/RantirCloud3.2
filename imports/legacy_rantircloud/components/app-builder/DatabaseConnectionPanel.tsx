import { useState, useEffect } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { DatabaseConnection, DatabaseTable } from '@/types/appBuilder';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  Plus, 
  Settings, 
  Trash2, 
  Table,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DatabaseConnectionDialog } from './DatabaseConnectionDialog';
import { useAuth } from '@/hooks/useAuth';
import { appBuilderService } from '@/services/appBuilderService';
import { SchemaTypeIcon } from '@/components/SchemaTypeIcon';

interface DatabaseConnectionCardProps {
  connection: DatabaseConnection;
  onEdit: (connection: DatabaseConnection) => void;
  onDelete: (id: string) => void;
  onRefresh: (id: string) => void;
}

function DatabaseConnectionCard({ connection, onEdit, onDelete, onRefresh }: DatabaseConnectionCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh(connection.id);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4" />
            {connection.name}
            <Badge variant="secondary" className="text-xs">
              {connection.type}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {connection.tables.length} tables
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onEdit(connection)}
            >
              <Settings className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              onClick={() => onDelete(connection.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {connection.tables.length > 0 ? (
          <div className="space-y-2">
            {connection.tables.map((table) => (
              <div
                key={table.name}
                className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'datatable',
                    data: {
                      type: 'table',
                      connectionId: connection.id,
                      tableName: table.name,
                      columns: table.columns
                    }
                  }));
                }}
              >
                <Table className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{table.name}</span>
                <Badge variant="outline" className="text-xs ml-auto">
                  {table.columns.length} columns
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No tables available. Refresh to load schema.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function DatabaseConnectionPanel() {
  const { user } = useAuth();
  const { currentProject, updateProject } = useAppBuilderStore();
  const [showDialog, setShowDialog] = useState(false);
  const [editingConnection, setEditingConnection] = useState<DatabaseConnection | undefined>();
  const [databases, setDatabases] = useState<any[]>([]);
  const [tableProjects, setTableProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const connections = currentProject?.settings?.database?.connections || [];

  const handleDragStart = (e: React.DragEvent, project: any) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'datatable',
      data: {
        type: 'table',
        tableProjectId: project.id,
        tableName: project.name,
        schema: project.schema
      }
    }));
  };

  useEffect(() => {
    if (user) {
      loadDatabases();
    }
  }, [user]);

  const loadDatabases = async () => {
    try {
      const data = await appBuilderService.getDatabaseTables(user!.id);
      setDatabases(data);
      setTableProjects(data); // Same data for now
    } catch (error) {
      console.error('Failed to load databases:', error);
    } finally {
      setLoading(false);
    }
  };

  // No need for external connections - just use internal databases

  const handleRefreshConnection = async (id: string) => {
    // In a real implementation, this would refresh the schema
    console.log('Refreshing connection:', id);
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
        Loading databases...
      </div>
    );
  }

  // Get selected database from project settings
  const selectedDatabaseId = currentProject?.settings?.database?.selectedId;
  const selectedDatabase = databases.find(db => db.id === selectedDatabaseId);

  return (
    <>
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">
              {selectedDatabase ? `${selectedDatabase.name} Tables` : 'Select Database'}
            </h3>
          </div>

          {!selectedDatabase ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Database className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  No database selected. Select a database from the header to view its tables.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: selectedDatabase.color || '#3B82F6' }}
                />
                <div>
                  <div className="font-medium text-sm">{selectedDatabase.name}</div>
                  {selectedDatabase.description && (
                    <div className="text-xs text-muted-foreground">{selectedDatabase.description}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!selectedDatabase ? null : (
            <div className="space-y-3">
              {/* Show only selected database tables */}
              {(() => {
                const database = selectedDatabase;
                return (
                   <Card key={database.id}>
                     <CardHeader className="pb-3">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <SchemaTypeIcon type="table" className="h-4 w-4" />
                           <CardTitle className="text-sm">Tables</CardTitle>
                         </div>
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => handleRefreshConnection(database.id)}
                           className="h-8 w-8 p-0"
                         >
                           <RefreshCw className="h-4 w-4" />
                         </Button>
                       </div>
                     </CardHeader>
                     <CardContent>
                       <div className="space-y-2">
                         {tableProjects
                           .filter(project => project.database_id === database.id)
                           .map((project) => (
                             <div
                               key={project.id}
                               className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent cursor-pointer"
                               draggable
                               onDragStart={(e) => handleDragStart(e, project)}
                             >
                               <div className="flex items-center gap-2">
                                 <SchemaTypeIcon type="table" className="h-4 w-4" />
                                 <span className="text-sm font-medium">{project.name}</span>
                               </div>
                               <div className="text-xs text-muted-foreground">
                                 {project.records ? JSON.parse(project.records).length : 0} records
                               </div>
                             </div>
                           ))}
                         {tableProjects.filter(project => project.database_id === database.id).length === 0 && (
                           <div className="text-center text-sm text-muted-foreground py-4">
                             No tables found in this database
                           </div>
                         )}
                       </div>
                     </CardContent>
                 </Card>
               );
             })()}
           </div>
         )}
        </div>
      </ScrollArea>
    </>
  );
}
