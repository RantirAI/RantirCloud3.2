import { supabase } from "@/integrations/supabase/client";
import { activityService } from "@/services/activityService";
import { workspaceService } from "@/services/workspaceService";

export async function createFlowProjectAndRedirect({
  userId,
  navigate,
}: {
  userId: string;
  navigate: (path: string) => void;
}) {
  // Prompt for new project name (could use a dialog, but just simple for now)
  const name = window.prompt("Enter new flow name:", "Untitled Flow");
  if (!name) return;

  // Get current workspace
  const workspace = await workspaceService.getCurrentWorkspace();

  const { data, error } = await supabase
    .from("flow_projects")
    .insert({
      user_id: userId,
      name,
      description: "",
      workspace_id: workspace?.id || null,
    })
    .select()
    .maybeSingle();

  if (error) {
    window.alert("Failed to create new flow: " + error.message);
    return;
  }

  // Log activity
  if (data) {
    await activityService.logActivity({
      type: 'flow_created',
      description: `Created flow: ${name}`,
      resourceType: 'flow',
      resourceId: data.id,
      resourceName: name
    });
  }

  // Redirect to the new Flow Builder page
  if (data && data.id) {
    navigate(`/flows/${data.id}`);
  }
}
