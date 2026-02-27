import { supabase } from '@/integrations/supabase/client';

export interface Workspace {
  id: string;
  user_id: string;
  name: string;
  icon_url?: string;
  description?: string;
  is_default: boolean;
  is_enterprise?: boolean;
  created_at: string;
  updated_at: string;
}

export const workspaceService = {
  async getCurrentWorkspace(): Promise<Workspace | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    try {
      // Try to get user's current workspace from settings
      const { data: settings } = await supabase
        .from('user_settings')
        .select('current_workspace_id')
        .eq('id', user.id)
        .maybeSingle();

      let workspaceId = settings?.current_workspace_id as string | null;

      if (workspaceId) {
        const { data: ws } = await supabase
          .from('workspaces')
          .select('*')
          .eq('id', workspaceId)
          .maybeSingle();
        if (ws) return ws as Workspace;
      }

      // Fallback: get the user's default or first workspace
      const { data: fallback } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (fallback) return fallback as Workspace;

      // If no workspaces exist, return null (don't create one automatically)
      return null;
    } catch (error) {
      console.error('Error fetching workspace:', error);
      return null;
    }
  },

  async checkIsEnterprise(workspaceId?: string): Promise<boolean> {
    const workspace = await this.getCurrentWorkspace();
    if (!workspace) return false;
    
    const { data, error } = await supabase
      .from('workspaces')
      .select('is_enterprise')
      .eq('id', workspaceId || workspace.id)
      .single();
    
    if (error) {
      console.error('Error checking enterprise status:', error);
      return false;
    }
    
    return data?.is_enterprise || false;
  },

  async getAllWorkspaces(): Promise<Workspace[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get workspaces owned by user
    const { data: ownedWorkspaces } = await supabase
      .from('workspaces')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at');

    // Get workspaces user is invited to (via workspace_members)
    const { data: memberWorkspaces } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id);

    const invitedWorkspaceIds = memberWorkspaces
      ?.map(m => m.workspace_id)
      .filter(id => id && !ownedWorkspaces?.some(w => w.id === id)) || [];

    let invitedWorkspaces: Workspace[] = [];
    if (invitedWorkspaceIds.length > 0) {
      const { data } = await supabase
        .from('workspaces')
        .select('*')
        .in('id', invitedWorkspaceIds);
      invitedWorkspaces = (data || []) as Workspace[];
    }

    return [...(ownedWorkspaces || []), ...invitedWorkspaces];
  },

  async getInvitedWorkspaces(): Promise<Workspace[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get workspaces user is invited to (via workspace_members) but doesn't own
    const { data: memberWorkspaces } = await supabase
      .from('workspace_members')
      .select('workspace_id, workspaces(*)')
      .eq('user_id', user.id);

    if (!memberWorkspaces) return [];

    // Get workspaces owned by user to exclude them
    const { data: ownedWorkspaces } = await supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', user.id);

    const ownedIds = new Set(ownedWorkspaces?.map(w => w.id) || []);

    return memberWorkspaces
      .filter(m => m.workspace_id && !ownedIds.has(m.workspace_id) && m.workspaces)
      .map(m => m.workspaces as unknown as Workspace);
  },

  async updateWorkspace(id: string, updates: Partial<Workspace>): Promise<Workspace | null> {
    const { data } = await supabase
      .from('workspaces')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return data;
  },

  async createWorkspace(workspace: Omit<Workspace, 'id' | 'created_at' | 'updated_at'>): Promise<Workspace | null> {
    const { data } = await supabase
      .from('workspaces')
      .insert(workspace)
      .select()
      .single();

    return data;
  },

  async setCurrentWorkspace(workspaceId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('user_settings')
      .update({ current_workspace_id: workspaceId })
      .eq('id', user.id);
  },

  async uploadWorkspaceIcon(workspaceId: string, file: File): Promise<string | null> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${workspaceId}.${fileExt}`;
    const filePath = `workspace-icons/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('tableapp-images')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Error uploading workspace icon:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('tableapp-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
};