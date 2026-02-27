
import React, { useState, useEffect } from "react";
import { Check, ChevronDown, Database, Plus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { tableService } from "@/services/tableService";
import { databaseService } from "@/services/databaseService";
import { toast } from "@/components/ui/sonner";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TableSelector({ currentTableId, currentTableName }: { currentTableId: string, currentTableName: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tables, setTables] = useState<Array<{ id: string; name: string; database_id?: string | null }>>([]);
  const [databases, setDatabases] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [isNewTableDialogOpen, setIsNewTableDialogOpen] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string>("");

  useEffect(() => {
    if (user) {
      Promise.all([
        loadTables(),
        loadDatabases()
      ]);
    }
  }, [user]);

  const loadTables = async () => {
    try {
      setLoading(true);
      const data = await tableService.getUserTableProjects(user?.id || "");
      setTables(data.map((table: any) => ({ 
        id: table.id, 
        name: table.name,
        database_id: table.database_id
      })));
    } catch (error) {
      console.error("Failed to load tables", error);
      toast.error("Failed to load tables");
    } finally {
      setLoading(false);
    }
  };

  const loadDatabases = async () => {
    try {
      const data = await databaseService.getUserDatabases(user?.id || "");
      setDatabases(data.map((db: any) => ({ id: db.id, name: db.name })));
    } catch (error) {
      console.error("Failed to load databases", error);
    }
  };

  const handleCreateTable = async () => {
    if (!newTableName.trim() || !user) return;
    
    try {
      const newTable = await tableService.createTableProject({
        name: newTableName,
        description: `Related to ${currentTableName}`,
        user_id: user.id,
        schema: {
          id: crypto.randomUUID(),
          name: newTableName,
          fields: []
        },
        records: [],
        database_id: selectedDatabaseId || undefined
      });

      setNewTableName("");
      setIsNewTableDialogOpen(false);
      toast.success("New table created successfully!");
      navigate(`/tables/${newTable.id}`);
    } catch (error) {
      console.error("Failed to create table", error);
      toast.error("Failed to create new table");
    }
  };

  // Find the database for the current table
  const currentTable = tables.find(table => table.id === currentTableId);
  const currentDatabase = databases.find(db => db.id === currentTable?.database_id);
  const databaseInfo = currentDatabase ? ` (${currentDatabase.name})` : "";

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-1 font-medium px-2 h-8">
            <Database className="h-4 w-4 mr-1" />
            {currentTableName}
            {databaseInfo && <span className="text-xs text-muted-foreground ml-1">{databaseInfo}</span>}
            <ChevronDown className="h-3 w-3 ml-1 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          <DropdownMenuLabel>Available Tables</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {loading ? (
            <div className="px-2 py-1 text-sm text-center text-muted-foreground">Loading...</div>
          ) : tables.length > 0 ? (
            tables.map((table) => {
              const tableDatabase = databases.find(db => db.id === table.database_id);
              return (
                <DropdownMenuItem 
                  key={table.id}
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => navigate(`/tables/${table.id}`)}
                >
                  <div className="flex flex-col">
                    <span>{table.name}</span>
                    {tableDatabase && (
                      <span className="text-xs text-muted-foreground">{tableDatabase.name}</span>
                    )}
                  </div>
                  {table.id === currentTableId && <Check className="h-4 w-4 ml-2" />}
                </DropdownMenuItem>
              );
            })
          ) : (
            <div className="px-2 py-1 text-sm text-center text-muted-foreground">No tables found</div>
          )}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="flex items-center gap-1 cursor-pointer"
            onClick={() => setIsNewTableDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span>Create New Table</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isNewTableDialogOpen} onOpenChange={setIsNewTableDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Table</DialogTitle>
            <DialogDescription>
              Enter a name for your new data table.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Table Name</Label>
              <Input
                id="name"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="e.g. Products, Customers, Orders"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="database">Database (Optional)</Label>
              <Select value={selectedDatabaseId} onValueChange={setSelectedDatabaseId}>
                <SelectTrigger id="database">
                  <SelectValue placeholder="Select a database" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {databases.map(database => (
                    <SelectItem key={database.id} value={database.id}>
                      {database.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsNewTableDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateTable}
              disabled={!newTableName.trim()}
            >
              Create Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
