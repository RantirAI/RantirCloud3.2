
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WhirlpoolLoader } from "@/components/WhirlpoolLoader";
import "@/components/WhirlpoolLoader.css";
import { Table2 as TableIcon } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Plus, 
  Search,
  ArrowUp,
  ArrowDown,
  Trash2,
  Eye,
} from "lucide-react";
import { TableSchemaEditor } from "@/components/TableSchemaEditor";
import { tableService } from "@/services/tableService";
import { workspaceService } from "@/services/workspaceService";
import { toast } from "@/components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type SortDirection = "asc" | "desc";

export default function Tables() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [isSchemaEditorOpen, setIsSchemaEditorOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Load current workspace
  useEffect(() => {
    const loadWorkspace = async () => {
      const workspace = await workspaceService.getCurrentWorkspace();
      setWorkspaceId(workspace?.id || null);
    };
    loadWorkspace();
  }, []);

  useEffect(() => {
    const fetchTableProjects = async () => {
      if (!user) return;
      try {
        setIsLoading(true);
        // When workspace is set, shows ALL workspace tables (for team members)
        const tableProjects = await tableService.getUserTableProjects(user.id, undefined, workspaceId);
        setData(tableProjects);
      } catch (error: any) {
        toast.error(error.message || "Failed to load table projects");
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchTableProjects();
    }
  }, [user, workspaceId]);

  // Sort and filter the data
  const tableData = data
    .filter(
      (item) =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortDirection === "asc") {
        return a[sortBy] < b[sortBy] ? -1 : 1;
      } else {
        return a[sortBy] > b[sortBy] ? -1 : 1;
      }
    });

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return null;
    return sortDirection === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const handleCreateTable = async (schema: { name: string; fields: any[] }) => {
    if (!user) return;

    try {
      const newProject = await tableService.createTableProject({
        name: schema.name,
        description: "",
        user_id: user.id,
        schema: {
          id: crypto.randomUUID(),
          name: schema.name,
          fields: schema.fields
        },
        records: []
      });

      setData([...data, newProject]);
      toast.success("Table project created");
      setIsSchemaEditorOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create table project");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      await tableService.deleteTableProject(deletingId);
      setData(data.filter(item => item.id !== deletingId));
      toast.success("Table project deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete table project");
    } finally {
      setDeleteConfirmOpen(false);
      setDeletingId(null);
    }
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <WhirlpoolLoader size="lg" icon={<TableIcon className="h-7 w-7" />} message="Loading tables..." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-bold">Data Tables</h1>
        <Button onClick={() => setIsSchemaEditorOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Table
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Input
            placeholder="Search tables..."
            className="pl-3"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="ui-compact dashboard-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                onClick={() => handleSort("name")}
                className="cursor-pointer hover:bg-muted"
              >
                <div className="flex items-center">
                  Name
                  <SortIcon column="name" />
                </div>
              </TableHead>
              <TableHead 
                onClick={() => handleSort("description")}
                className="cursor-pointer hover:bg-muted"
              >
                <div className="flex items-center">
                  Description
                  <SortIcon column="description" />
                </div>
              </TableHead>
              <TableHead 
                onClick={() => handleSort("updated_at")}
                className="cursor-pointer hover:bg-muted"
              >
                <div className="flex items-center">
                  Last Updated
                  <SortIcon column="updated_at" />
                </div>
              </TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.length > 0 ? (
              tableData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.description || "-"}</TableCell>
                  <TableCell>{new Date(item.updated_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate(`/tables/${item.id}`)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        View
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => confirmDelete(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  {isLoading ? "Loading..." : "No tables found. Create your first table to get started."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Schema Editor Dialog */}
      {isSchemaEditorOpen && (
        <TableSchemaEditor
          isOpen={isSchemaEditorOpen}
          onClose={() => setIsSchemaEditorOpen(false)}
          onSave={handleCreateTable}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this table project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
