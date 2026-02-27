
import React, { useState, useEffect } from 'react';
import { databaseService } from "@/services/databaseService";
import { useAuth } from '@/hooks/useAuth';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { toast } from '@/components/ui/sonner';

interface DatabaseSelectorFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function DatabaseSelectorField({ value, onChange }: DatabaseSelectorFieldProps) {
  const [databases, setDatabases] = useState<Array<{id: string, name: string}>>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function loadDatabases() {
      if (!user?.id) {
        console.log("Cannot load databases: No authenticated user found");
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        console.log("Loading databases for user:", user.id);
        const userDatabases = await databaseService.getUserDatabases(user.id);
        console.log("Loaded databases:", userDatabases);
        setDatabases(userDatabases);
        
        // Update window cache
        if (typeof window !== 'undefined') {
          if (!window.flowDatabases) {
            window.flowDatabases = {};
          }
          window.flowDatabases[user.id] = userDatabases;
          window.fetchingDatabases = false;
        }

        // If no databases found, show a message
        if (userDatabases.length === 0) {
          toast.info("No databases found", {
            description: "You need to create a database first"
          });
        }
      } catch (error) {
        console.error("Error loading databases:", error);
        toast.error("Failed to load databases", {
          description: "Please try again or check your connection"
        });
      } finally {
        setLoading(false);
      }
    }
    
    loadDatabases();
  }, [user]);

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={loading ? "animate-pulse" : ""}>
          <SelectValue placeholder={loading ? "Loading databases..." : "Select a database"} />
        </SelectTrigger>
        <SelectContent>
          {databases.map(database => (
            <SelectItem key={database.id} value={database.id}>
              {database.name}
            </SelectItem>
          ))}
          {databases.length === 0 && !loading && (
            <SelectItem value="no-databases" disabled>
              No databases available
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {loading ? 'Loading your databases...' : 
          databases.length === 0 ? 'No databases available. Create a database first.' : 
          'The database to use'}
      </p>
    </div>
  );
}
