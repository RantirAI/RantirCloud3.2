import { useState, useEffect } from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Database, Plus, Check } from 'lucide-react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';
import { databaseService, DatabaseProject } from '@/services/databaseService';
import { useAuth } from '@/hooks/useAuth';

export function DatabaseSelector() {
  const [databases, setDatabases] = useState<DatabaseProject[]>([]);
  const [loading, setLoading] = useState(false);
  const { selectedDatabaseId, selectedDatabaseName, setSelectedDatabase, currentProject } = useAppBuilderStore();
  const { user } = useAuth();

  useEffect(() => {
    loadDatabases();
  }, [user, currentProject?.workspace_id]);

  const loadDatabases = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userDatabases = await databaseService.getUserDatabases(user.id, currentProject?.workspace_id);
      setDatabases(userDatabases);
    } catch (error) {
      console.error('Failed to load databases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDatabase = (database: DatabaseProject) => {
    if (selectedDatabaseId === database.id) {
      setSelectedDatabase(undefined, undefined);
    } else {
      setSelectedDatabase(database.id, database.name);
    }
  };

  const selectedDatabase = databases.find(db => db.id === selectedDatabaseId);
  const isConnected = !!selectedDatabase;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors h-7 ${
            isConnected 
              ? 'border border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-400' 
              : 'border border-dashed border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
          }`}
        >
          <Database className="h-3 w-3 flex-shrink-0" />
          {isConnected ? (
            <span className="max-w-[36px] truncate text-[10px] font-medium">
              {selectedDatabase!.name.slice(0, 6)}
            </span>
          ) : (
            <Plus className="h-3 w-3" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
        <DropdownMenuLabel>Connect Database</DropdownMenuLabel>
        
        {loading ? (
          <DropdownMenuItem disabled>
            <span className="text-muted-foreground">Loading databases...</span>
          </DropdownMenuItem>
        ) : databases.length === 0 ? (
          <DropdownMenuItem disabled>
            <span className="text-muted-foreground">No databases found</span>
          </DropdownMenuItem>
        ) : (
          databases.map((database) => (
            <DropdownMenuItem 
              key={database.id} 
              onClick={() => handleSelectDatabase(database)}
              className="flex items-center gap-2"
            >
              {selectedDatabaseId === database.id && (
                <Check className="h-3 w-3 text-amber-500 flex-shrink-0" />
              )}
              <div 
                className="w-2 h-2 rounded-full flex-shrink-0" 
                style={{ backgroundColor: database.color || '#F59E0B' }}
              />
              <span className="truncate">{database.name.slice(0, 24)}</span>
            </DropdownMenuItem>
          ))
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => window.open('/databases', '_blank')}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Database
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
