import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/compact/Button";
import { Input } from "@/components/ui/compact/Input";
import { WhirlpoolLoader } from "@/components/WhirlpoolLoader";
import "@/components/WhirlpoolLoader.css";
import { Database as DatabaseIcon } from "lucide-react";
import { ViewToggle } from "@/components/ViewToggle";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { workspaceService } from "@/services/workspaceService";
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
  Table2,
  LayoutGrid
} from "lucide-react";
import { databaseService, DatabaseProject } from "@/services/databaseService";
import { toast } from "@/components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ColorPicker } from "@/components/ColorPicker";
import { Card, CardContent } from "@/components/ui/card";

type SortDirection = "asc" | "desc";
type ViewMode = "list" | "grid";

export default function Databases() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [data, setData] = useState<DatabaseProject[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [isNewDatabaseOpen, setIsNewDatabaseOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newDatabaseName, setNewDatabaseName] = useState("");
  const [newDatabaseDescription, setNewDatabaseDescription] = useState("");
  const [newDatabaseColor, setNewDatabaseColor] = useState("#3B82F6");
  // undefined = not loaded yet, null = loaded but no workspace, string = workspace id
  const [workspaceId, setWorkspaceId] = useState<string | null | undefined>(undefined);

  // Load current workspace
  useEffect(() => {
    const loadWorkspace = async () => {
      const workspace = await workspaceService.getCurrentWorkspace();
      setWorkspaceId(workspace?.id ?? null);
    };
    if (user) {
      loadWorkspace();
    }
  }, [user]);

  useEffect(() => {
    const fetchDatabases = async () => {
      if (!user) return;
      // Wait for workspace to be loaded (undefined = still loading)
      if (workspaceId === undefined) return;
      
      try {
        setIsLoading(true);
        // When workspace is set, shows ALL workspace databases (for team members)
        const databases = await databaseService.getUserDatabases(user.id, workspaceId);
        setData(databases);
      } catch (error: any) {
        toast.error(error.message || "Failed to load databases");
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchDatabases();
    }
  }, [user, workspaceId]);

  // Sort and filter the data
  const databaseData = data
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
    return sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const handleCreateDatabase = async () => {
    if (!user || !newDatabaseName.trim()) return;

    try {
      const newDatabase = await databaseService.createDatabase({
        name: newDatabaseName,
        description: newDatabaseDescription || undefined,
        color: newDatabaseColor,
        user_id: user.id,
        workspace_id: workspaceId || undefined
      });

      setData([...data, newDatabase]);
      toast.success("Database created");
      setIsNewDatabaseOpen(false);
      setNewDatabaseName("");
      setNewDatabaseDescription("");
      setNewDatabaseColor("#3B82F6");
    } catch (error: any) {
      toast.error(error.message || "Failed to create database");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      await databaseService.deleteDatabase(deletingId);
      
      // Dispatch event to close the tab if open
      window.dispatchEvent(new CustomEvent('project-deleted', { detail: { projectId: deletingId } }));
      
      setData(data.filter(item => item.id !== deletingId));
      toast.success("Database deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete database");
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
      <div className="bg-zinc-100 dark:bg-zinc-900 min-h-screen flex items-center justify-center">
        <WhirlpoolLoader size="lg" icon={<DatabaseIcon className="h-7 w-7" />} message="Loading databases..." />
      </div>
    );
  }

  const GridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {databaseData.map((item) => (
        <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div 
                className="w-1.5 h-1.5 rounded-full" 
                style={{ backgroundColor: item.color || "#3B82F6" }}
              />
              <h3 className="font-medium text-sm">{item.name}</h3>
            </div>
            
            {/* Database preview - simplified table representation */}
            <div className="bg-muted rounded p-2 mb-3">
              <div className="text-xs text-muted-foreground mb-1">Database Tables</div>
              <div className="space-y-1">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-orange-200 rounded"></div>
                  <div className="w-16 h-2 bg-orange-100 rounded"></div>
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-200 rounded"></div>
                  <div className="w-12 h-2 bg-blue-100 rounded"></div>
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-green-200 rounded"></div>
                  <div className="w-20 h-2 bg-green-100 rounded"></div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : "-"}
              </span>
              <div className="flex gap-1">
                <a href={`/databases/${item.id}`}>
                  <button className="p-1 hover:bg-muted rounded">
                    <Eye className="h-3 w-3 text-muted-foreground" />
                  </button>
                </a>
                <button 
                  onClick={() => confirmDelete(item.id)}
                  className="p-1 hover:bg-muted rounded"
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const ListView = () => (
    <div className="dashboard-table">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium cursor-pointer" onClick={() => handleSort("name")}>
              <div className="flex items-center justify-between">
                Name
                <SortIcon column="name" />
              </div>
            </th>
            <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium cursor-pointer" onClick={() => handleSort("created_at")}>
              <div className="flex items-center justify-between">
                Created
                <SortIcon column="created_at" />
              </div>
            </th>
            <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {databaseData.length > 0 ? (
            databaseData.map((item) => (
              <tr key={item.id}>
                <td className="py-1.5 px-3 text-[13px]">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-1.5 h-1.5 rounded-full" 
                      style={{ backgroundColor: item.color || "#3B82F6" }}
                    />
                    <a href={`/databases/${item.id}`} className="hover:text-primary font-medium">
                      {item.name}
                    </a>
                  </div>
                </td>
                <td className="py-1.5 px-3 text-[13px] text-muted-foreground">
                  {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : "-"}
                </td>
                <td className="py-1.5 px-3 text-[13px]">
                  <div className="flex gap-1">
                    <a href={`/databases/${item.id}`}>
                      <button className="p-1 hover:bg-muted rounded">
                        <Eye className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </a>
                    <button 
                      onClick={() => confirmDelete(item.id)}
                      className="p-1 hover:bg-muted rounded"
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="h-24 text-center py-8">
                {isLoading ? (
                  <div className="text-muted-foreground">Loading...</div>
                ) : (
                  <div className="max-w-sm mx-auto">
                    <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-3">
                      <DatabaseIcon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-sm font-medium mb-2">No databases found</h3>
                    <p className="text-xs text-muted-foreground mb-4">Create your first database to get started</p>
                    <Button variant="outline" onClick={() => setIsNewDatabaseOpen(true)}>
                      <Plus className="h-3 w-3 mr-1" />
                      New Database
                    </Button>
                  </div>
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="bg-zinc-100 dark:bg-zinc-900 min-h-screen">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="pt-6 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-tiempos font-light text-foreground">Databases</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage your databases and data structures</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsNewDatabaseOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Database
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center">
          <div className="relative flex-1 max-w-sm">
            <Input
              placeholder="Search databases..."
              className="pl-3"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(val) => setViewMode(val as ViewMode)}>
              <TabsList className="h-8">
                <TabsTrigger value="list" className="flex items-center gap-1 text-sm px-3 py-1">
                  <Table2 className="h-3 w-3" /> Table
                </TabsTrigger>
                <TabsTrigger value="grid" className="flex items-center gap-1 text-sm px-3 py-1">
                  <LayoutGrid className="h-3 w-3" /> Grid
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Content */}
        <div className="dashboard-card p-4">
          {viewMode === 'list' ? <ListView /> : <GridView />}
        </div>
        
        {/* New Database Dialog */}
        <Dialog open={isNewDatabaseOpen} onOpenChange={setIsNewDatabaseOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Database</DialogTitle>
              <DialogDescription>
                Create a new database to organize your tables.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4" style={{ paddingLeft: '8px', paddingRight: '8px' }}>
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newDatabaseName}
                  onChange={(e) => setNewDatabaseName(e.target.value)}
                  placeholder="Database name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newDatabaseDescription}
                  onChange={(e) => setNewDatabaseDescription(e.target.value)}
                  placeholder="Database description (optional)"
                />
              </div>
              <ColorPicker
                value={newDatabaseColor}
                onChange={setNewDatabaseColor}
                label="Database Color"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewDatabaseOpen(false)}>Cancel</Button>
              <Button variant="outline" onClick={handleCreateDatabase} disabled={!newDatabaseName.trim()}>
                Create Database
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this database? This will not delete the tables inside, but they will no longer be associated with this database.
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
    </div>
  );
}
