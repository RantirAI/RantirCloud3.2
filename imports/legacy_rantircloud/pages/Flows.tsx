
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/compact/Button";
import { Input } from "@/components/ui/compact/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { NewFlowDialog } from "@/components/NewFlowDialog";
import { LayoutList, Folder, Table2, LayoutGrid, Eye, Plus, Trash2, Copy, Search } from "lucide-react";
import { FlowProjectsTable } from "@/components/FlowProjectsTable";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { flowService } from "@/services/flowService";
import { EditableFlowName } from "@/components/EditableFlowName";
import { workspaceService } from "@/services/workspaceService";

type ViewType = "table" | "grid";

export default function Flows() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentView, setCurrentView] = useState<ViewType>("table");
  const [search, setSearch] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  // undefined = not loaded yet, null = loaded but no workspace, string = workspace id
  const [workspaceId, setWorkspaceId] = useState<string | null | undefined>(undefined);

  // Load current workspace
  useEffect(() => {
    const loadWorkspace = async () => {
      const workspace = await workspaceService.getCurrentWorkspace();
      setWorkspaceId(workspace?.id ?? null);
    };
    loadWorkspace();
  }, []);

  // Fetch flow projects - when workspace is set, show ALL workspace projects (for team members)
  const { data: flowProjects, isLoading: flowsLoading } = useQuery({
    queryKey: ["flow-projects", user?.id, workspaceId],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from("flow_projects")
        .select("*");
      
      if (workspaceId) {
        // Workspace context: show ALL flows in this workspace (for team members)
        query = query.eq("workspace_id", workspaceId);
      } else {
        // Personal context: show only user's own flows
        query = query.eq("user_id", user.id);
      }
      
      const { data, error } = await query.order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    // Only run query after workspace has been checked (undefined = still loading)
    enabled: !!user && workspaceId !== undefined,
  });

  // Function to refetch flow projects
  const refetchFlowProjects = () => {
    queryClient.invalidateQueries({ queryKey: ["flow-projects", user?.id, workspaceId] });
  };

  // Function to update project in cache
  const updateProjectInCache = (id: string, updates: Partial<any>) => {
    queryClient.setQueryData(["flow-projects", user?.id, workspaceId], (oldData: any[]) => {
      if (!oldData) return oldData;
      return oldData.map(project => 
        project.id === id ? { ...project, ...updates } : project
      );
    });
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const { error } = await supabase
        .from("flow_projects")
        .delete()
        .eq("id", deletingId);

      if (error) throw error;

      // Dispatch event to close the tab if open
      window.dispatchEvent(new CustomEvent('project-deleted', { detail: { projectId: deletingId } }));

      refetchFlowProjects();
      toast.success("Flow project deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete flow project");
    } finally {
      setDeleteConfirmOpen(false);
      setDeletingId(null);
    }
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const handleDuplicate = async (id: string) => {
    try {
      setDuplicatingId(id);
      const duplicatedProject = await flowService.duplicateFlowProject(id);
      refetchFlowProjects();
      toast.success(`Flow "${duplicatedProject.name}" created successfully`);
    } catch (error: any) {
      toast.error(error.message || "Failed to duplicate flow project");
    } finally {
      setDuplicatingId(null);
    }
  };

  // Filter flow projects based on search
  const filteredProjects = flowProjects?.filter((project: any) =>
    project.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const GridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
      {filteredProjects.map((project: any) => (
        <Link key={project.id} to={`/flows/${project.id}`} tabIndex={-1}>
          <Card className="hover:shadow-lg transition-shadow group cursor-pointer border-border p-3">
            <div className="flex items-center gap-2 mb-2">
              <Folder className="h-4 w-4 text-blue-500" />
              <EditableFlowName
                initialName={project.name}
                flowId={project.id}
                onUpdate={(newName) => updateProjectInCache(project.id, { name: newName })}
                className="text-sm group-hover:text-primary"
              />
            </div>
            
            {/* Flow preview - simplified workflow representation */}
            <div className="bg-muted rounded p-2 mb-2">
              <div className="text-xs text-muted-foreground mb-1">Flow Design</div>
              <div className="space-y-1">
                <div className="h-2 bg-blue-200 rounded w-full"></div>
                <div className="flex gap-1">
                  <div className="h-2 bg-blue-100 rounded w-1/3"></div>
                  <div className="h-2 bg-blue-100 rounded w-2/3"></div>
                </div>
                <div className="h-2 bg-blue-100 rounded w-1/2"></div>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Updated {new Date(project.updated_at).toLocaleDateString()}
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="bg-zinc-100 dark:bg-zinc-900 min-h-screen">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-tiempos font-light text-foreground">Flow Projects</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your automation workflows and AI agents</p>
          </div>
          <NewFlowDialog asChild onCreated={refetchFlowProjects}>
            <Button variant="outline" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Flow
            </Button>
          </NewFlowDialog>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center">
          <div className="relative flex-1 max-w-sm">
            <Input
              placeholder="Search flows..."
              className="pl-3"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={currentView} onValueChange={(val) => setCurrentView(val as ViewType)}>
              <TabsList className="h-8">
                <TabsTrigger value="table" className="flex items-center gap-1 text-sm px-3 py-1">
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
        <div className="bg-card border rounded-lg">
          {flowsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground text-sm">Loading...</div>
            </div>
          ) : (flowProjects && flowProjects.length > 0) ? (
            currentView === "table" ? (
              <FlowProjectsTable 
                projects={filteredProjects}
                refetchProjects={refetchFlowProjects}
                onProjectUpdate={updateProjectInCache}
                onConfirmDelete={confirmDelete}
              />
            ) : (
              <GridView />
            )
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <div className="max-w-sm mx-auto">
                <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-3">
                  <LayoutList className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-sm font-medium mb-2">No flow projects found</h3>
                <p className="text-xs text-muted-foreground mb-4">Create your first automation workflow to get started</p>
                <NewFlowDialog onCreated={refetchFlowProjects} />
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this flow project? This action cannot be undone and will permanently delete all flow data.
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
