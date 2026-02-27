import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, Copy, Pencil } from "lucide-react";
import { toast } from "sonner";
import { flowService } from "@/services/flowService";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FlowProject {
  id: string;
  name: string;
  description?: string | null;
  updated_at: string;
}

interface FlowProjectsTableProps {
  projects: FlowProject[];
  refetchProjects: () => void;
  onProjectUpdate?: (id: string, updatedProject: Partial<FlowProject>) => void;
  onConfirmDelete: (id: string) => void;
}

export function FlowProjectsTable({ projects, refetchProjects, onProjectUpdate, onConfirmDelete }: FlowProjectsTableProps) {
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<FlowProject | null>(null);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!projects?.length) {
    return <div className="text-muted-foreground">No flow projects found.</div>;
  }

  const handleDuplicate = async (id: string) => {
    try {
      setDuplicatingId(id);
      const duplicatedProject = await flowService.duplicateFlowProject(id);
      refetchProjects();
      toast.success(`Flow "${duplicatedProject.name}" created successfully`);
    } catch (error: any) {
      toast.error(error.message || "Failed to duplicate flow project");
    } finally {
      setDuplicatingId(null);
    }
  };

  const openEditModal = (project: FlowProject) => {
    setEditingProject(project);
    setEditName(project.name);
  };

  const handleSaveName = async () => {
    if (!editingProject || !editName.trim()) return;
    
    if (editName.trim() === editingProject.name) {
      setEditingProject(null);
      return;
    }

    try {
      setIsSaving(true);
      await flowService.updateFlowProject(editingProject.id, { name: editName.trim() });
      onProjectUpdate?.(editingProject.id, { name: editName.trim() });
      toast.success("Flow name updated");
      setEditingProject(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to update flow name");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveName();
    }
  };
  
  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((proj) => (
            <TableRow key={proj.id}>
              <TableCell>
                <Link 
                  to={`/flows/${proj.id}`}
                  className="font-semibold text-foreground hover:text-primary transition-colors"
                >
                  {proj.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(proj.updated_at).toLocaleDateString('en-GB')}
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link to={`/flows/${proj.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => openEditModal(proj)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Rename</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDuplicate(proj.id)}
                        disabled={duplicatingId === proj.id}
                        className="h-8 w-8"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Duplicate</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onConfirmDelete(proj.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delete</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Rename Flow Modal */}
      <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Flow</DialogTitle>
            <DialogDescription>
              Enter a new name for this flow project.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="flow-name">Flow Name</Label>
            <Input
              id="flow-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter flow name"
              className="mt-2"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProject(null)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveName} disabled={isSaving || !editName.trim()}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
