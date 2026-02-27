
import { useState, useEffect } from 'react';
import { tableService } from "@/services/tableService";
import { useAuth } from '@/hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';

interface TableSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function TableSelector({ value, onChange }: TableSelectorProps) {
  const [tables, setTables] = useState<Array<{id: string, name: string, description?: string}>>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  useEffect(() => {
    async function loadTables() {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const userTables = await tableService.getUserTableProjects(user.id);
        setTables(userTables);
      } catch (error) {
        console.error('Error loading tables:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadTables();
  }, [user]);
  
  return (
    <div className="space-y-2">
      <Label>Table</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={loading ? "animate-pulse" : ""}>
          <SelectValue placeholder={loading ? "Loading tables..." : "Select a table"} />
        </SelectTrigger>
        <SelectContent>
          {tables.map(table => (
            <SelectItem key={table.id} value={table.id}>
              {table.name}
            </SelectItem>
          ))}
          {tables.length === 0 && !loading && (
            <SelectItem value="no-tables" disabled>
              No tables available
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {loading ? 'Loading your tables...' : tables.length === 0 ? 'No tables available. Create a table first.' : 'Select a table to interact with'}
      </p>
    </div>
  );
}
