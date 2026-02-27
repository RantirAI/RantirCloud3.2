
import React, { useState, useEffect } from 'react';
import { tableService } from "@/services/tableService";
import { useAuth } from '@/hooks/useAuth';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";

interface TableSelectorFieldProps {
  value: string;
  onChange: (value: string) => void;
  databaseId?: string;
}

export function TableSelectorField({ value, onChange, databaseId }: TableSelectorFieldProps) {
  const [tables, setTables] = useState<Array<{id: string, name: string}>>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function loadTables() {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        console.log("Loading tables for database:", databaseId);
        
        // If no database is selected, don't fetch tables
        if (!databaseId) {
          console.log("No database selected, not fetching tables");
          setTables([]);
          setLoading(false);
          return;
        }
        
        const userTables = await tableService.getUserTableProjects(user.id, databaseId);
        console.log("Loaded tables for selector:", userTables);
        setTables(userTables);
        
        // Update window cache
        if (typeof window !== 'undefined') {
          if (!window.flowDataTables) {
            window.flowDataTables = {};
          }
          window.flowDataTables[databaseId] = userTables;
        }
      } catch (error) {
        console.error("Error loading tables for selector:", error);
      } finally {
        setLoading(false);
      }
    }
    
    loadTables();
  }, [user, databaseId]);

  return (
    <div className="space-y-2">
      <Select 
        value={value} 
        onValueChange={onChange} 
        disabled={!databaseId || loading}
      >
        <SelectTrigger className={loading ? "animate-pulse" : ""}>
          <SelectValue 
            placeholder={
              !databaseId ? "Select a database first" : 
              loading ? "Loading tables..." : 
              "Select a table"
            } 
          />
        </SelectTrigger>
        <SelectContent>
          {tables.map(table => (
            <SelectItem key={table.id} value={table.id}>
              {table.name}
            </SelectItem>
          ))}
          {tables.length === 0 && !loading && databaseId && (
            <SelectItem value="no-tables" disabled>
              No tables available in this database
            </SelectItem>
          )}
          {!databaseId && (
            <SelectItem value="no-database" disabled>
              Select a database first
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {!databaseId ? 'Select a database first to see available tables' :
         loading ? 'Loading tables from selected database...' : 
         tables.length === 0 ? 'No tables available in this database. Create a table first.' : 
         'The table to operate on'}
      </p>
    </div>
  );
}
