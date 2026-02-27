import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { tableService, TableProject, TableField } from "@/services/tableService";
import { toast } from "@/components/ui/sonner";
import { Link2, Link as Links } from "lucide-react";
interface TableRelationshipDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentTableId: string;
  currentTableSchema: any;
  onRelationshipCreated: () => void;
}
export function TableRelationshipDialog({
  isOpen,
  onClose,
  currentTableId,
  currentTableSchema,
  onRelationshipCreated
}: TableRelationshipDialogProps) {
  const {
    user
  } = useAuth();
  const [tables, setTables] = useState<TableProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [targetTable, setTargetTable] = useState<TableProject | null>(null);
  const [relationshipType, setRelationshipType] = useState<"one-to-one" | "one-to-many" | "many-to-many">("one-to-many");
  const [relationshipName, setRelationshipName] = useState<string>("");
  useEffect(() => {
    if (isOpen && user) {
      loadTables();
    }
  }, [isOpen, user]);
  useEffect(() => {
    if (selectedTable) {
      loadTargetTable(selectedTable);
    }
  }, [selectedTable]);
  const loadTables = async () => {
    try {
      setLoading(true);
      const data = await tableService.getUserTableProjects(user?.id || "");
      const filteredTables = data.filter((table: any) => table.id !== currentTableId).map((table: any) => ({
        id: table.id,
        name: table.name,
        description: table.description,
        user_id: table.user_id,
        schema: typeof table.schema === 'string' ? JSON.parse(table.schema) : table.schema,
        records: typeof table.records === 'string' ? JSON.parse(table.records) : table.records,
        updated_at: table.updated_at
      }));
      setTables(filteredTables);
    } catch (error) {
      console.error("Failed to load tables", error);
      toast.error("Failed to load tables for relationship");
    } finally {
      setLoading(false);
    }
  };
  const loadTargetTable = async (tableId: string) => {
    try {
      const tableData = await tableService.getTableProject(tableId);
      setTargetTable(tableData);
      setRelationshipName(tableData.name.toLowerCase().replace(/\s+/g, '_'));
    } catch (error) {
      console.error("Failed to load target table", error);
      toast.error("Failed to load target table details");
    }
  };
  const handleCreateRelationship = async () => {
    if (!targetTable || !relationshipName) return;
    try {
      const fieldType = relationshipType === "many-to-many" ? "multireference" : "reference";
      const newField: TableField = {
        id: crypto.randomUUID(),
        name: `${targetTable.name} Reference`,
        type: fieldType,
        options: {
          targetTableId: targetTable.id,
          targetTableName: targetTable.name,
          relationshipType: relationshipType
        }
      };
      const updatedSchema = {
        ...currentTableSchema,
        fields: [...currentTableSchema.fields, newField]
      };
      await tableService.updateTableProject(currentTableId, {
        schema: updatedSchema
      });
      toast.success(`Relationship with ${targetTable.name} created successfully!`);
      onRelationshipCreated();
      onClose();
    } catch (error: any) {
      console.error("Failed to create relationship", error);
      toast.error("Failed to create table relationship");
    }
  };
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Table Relationship</DialogTitle>
          <DialogDescription>
            Link this table to another data table to create relationships between your data.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4 px-[16px]">
          <div className="grid gap-2">
            <Label htmlFor="target-table">Target Table</Label>
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger id="target-table">
                <SelectValue placeholder="Select a table" />
              </SelectTrigger>
              <SelectContent>
                {tables.map(table => <SelectItem key={table.id} value={table.id}>
                    {table.name}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          
          {selectedTable && targetTable && <>
              <div className="grid gap-2">
                <Label htmlFor="relationship-type">Relationship Type</Label>
                <Select value={relationshipType} onValueChange={value => setRelationshipType(value as "one-to-one" | "one-to-many" | "many-to-many")}>
                  <SelectTrigger id="relationship-type">
                    <SelectValue placeholder="Select relationship type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one-to-one">One-to-One</SelectItem>
                    <SelectItem value="one-to-many">One-to-Many</SelectItem>
                    <SelectItem value="many-to-many">Many-to-Many</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label>Relationship Preview</Label>
                <div className="p-3 border rounded-md bg-muted/30 text-sm">
                  <div className="flex items-center justify-center gap-2">
                    <div className="px-3 py-1 border rounded bg-background text-center">
                      {currentTableSchema.name}
                    </div>
                    <div className="flex flex-col items-center">
                      {relationshipType === "many-to-many" ? <Links className="h-4 w-4 rotate-45" /> : <Link2 className="h-4 w-4 rotate-45" />}
                      <span className="text-xs text-muted-foreground">
                        {relationshipType === "one-to-one" ? "1:1" : relationshipType === "one-to-many" ? "1:n" : "n:n"}
                      </span>
                    </div>
                    <div className="px-3 py-1 border rounded bg-background text-center">
                      {targetTable.name}
                    </div>
                  </div>
                </div>
              </div>
            </>}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreateRelationship} disabled={!selectedTable || !targetTable}>
            Create Relationship
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>;
}