
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger, DialogContentInner } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { workspaceService } from "@/services/workspaceService";

export function NewFlowDialog({ asChild = false, onCreated, children }: { asChild?: boolean, onCreated?: () => void, children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadWorkspace = async () => {
      const workspace = await workspaceService.getCurrentWorkspace();
      setWorkspaceId(workspace?.id || null);
    };
    loadWorkspace();
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) {
      toast.error("Please log in to create a new flow.");
      setOpen(false);
      return;
    }
    if (!name.trim()) {
      toast.error("Please enter a flow name.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("flow_projects")
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: "",
        workspace_id: workspaceId,
      })
      .select()
      .maybeSingle();

    setLoading(false);

    if (error) {
      toast.error("Failed to create new flow: " + error.message);
      return;
    }

    setOpen(false);
    setName("");
    if (onCreated) onCreated();
    if (data && data.id) {
      navigate(`/flows/${data.id}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild={asChild}>
        {asChild ? children : (
          <div className="flex items-center text-foreground font-medium cursor-pointer">
            <Plus className="h-3.5 w-3.5 mr-1 text-[#888888] stroke-[1.2px]" />
            <span className="text-[10px] font-semibold">New Flow</span>
          </div>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Flow</DialogTitle>
          <DialogDescription>
            Enter a name for your flow project.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4" style={{ paddingLeft: '8px', paddingRight: '8px' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Flow project name"
              disabled={loading}
              required
              maxLength={64}
            />
          </form>
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="outline" type="submit" disabled={loading} onClick={handleSubmit}>
            {loading ? "Creating..." : "Create Flow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
